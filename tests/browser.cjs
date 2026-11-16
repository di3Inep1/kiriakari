/* Real Chromium playthrough, using native DevTools instead of third-party packages.
 * Node >=22; Windows Chrome/Edge. Run: node tests/browser.cjs
 * The game itself only needs Node >=18 (or a browser opening index.html).
 */
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createServer } = require('../server.cjs');
const ROOT = path.resolve(__dirname, '..');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let chrome, ws, server;
const errors = [], results = [];
async function main() {
  server = createServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  console.log('Starting browser QA at ' + base);
  const executable = process.env.CHROME_PATH || ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'].find(p => fs.existsSync(p));
  if (!executable || typeof WebSocket === 'undefined') throw new Error('Browser QA requires Chrome/Edge and Node >=22.');
  const profile = path.join(__dirname, `.browser-profile-${Date.now()}`);
  chrome = spawn(executable, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-background-networking', '--disable-component-update', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  const endpoint = await new Promise((resolve, reject) => {
    let output = ''; const timeout = setTimeout(() => reject(new Error('Chrome did not start: ' + output.slice(-500))), 20000);
    chrome.stderr.on('data', chunk => { output += chunk; const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (match) { clearTimeout(timeout); resolve(match[1]); } });
    chrome.once('error', reject);
  });
  const port = new URL(endpoint).port;
  console.log('Chromium ready on port ' + port);
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let seq = 0; const pending = new Map();
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) { const request = pending.get(message.id); if (request) { pending.delete(message.id); message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result); } }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') errors.push(message.params.entry.text);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; const timeout = setTimeout(() => { pending.delete(id); reject(new Error('DevTools timed out: ' + method)); }, 15000); pending.set(id, { resolve: result => { clearTimeout(timeout); resolve(result); }, reject: err => { clearTimeout(timeout); reject(err); } }); ws.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const waitFor = async (expression, timeout = 16000) => {
    const end = Date.now() + timeout;
    do { if (await evaluate(expression)) return; await pause(70); } while (Date.now() < end);
    throw new Error('Timed out: ' + expression);
  };
  const click = async selector => {
    await waitFor(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});return !!e && e.getClientRects().length && !e.disabled})()`);
    // Programmatic click is a real UI activation; movement and all game rules still run.
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  };
  const screenshot = async (name,clip) => {
    await evaluate('document.fonts.ready');
    await waitFor('KiriRenderer.assetsReady()');
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, ...(clip?{clip}: {}) });
    fs.writeFileSync(path.join(ROOT, name), Buffer.from(shot.data, 'base64'));
  };
  const saved = () => evaluate(`JSON.parse(localStorage.getItem('kiriakari.save.v1'))`);
  const drain = async (choice = 0) => {
    for (let i = 0; i < 60; i++) {
      if (await evaluate("document.getElementById('dialogue').hidden")) return;
      const count = await evaluate("document.querySelectorAll('#dialogue-choices button').length");
      if (count) await click(`#dialogue-choices button:nth-child(${choice + 1})`);
      else { await evaluate("document.getElementById('dialogue-next').click()"); await pause(25); }
    }
    throw new Error('Dialogue did not end');
  };
  const object = async (id, dialogue = true, choice = 0) => {
    await click(`#object-${id}`);
    if (dialogue) { await waitFor("!document.getElementById('dialogue').hidden"); await drain(choice); }
    else await waitFor("!document.getElementById('modal').hidden");
  };
  const map = async zone => {
    await click('#map-button'); await click(`[data-zone="${zone}"]`);
    await waitFor(`document.getElementById('zone-name').textContent === ${JSON.stringify({ station: '雾灯车站', town: '灯见街', shrine: '月见神社', archive: '旧校书库', tower: '十三刻钟楼', river: '渡灯桥' }[zone])}`);
    await pause(100); await drain();
  };
  const echo = async () => { if (!(await saved()).flags.lantern) throw new Error('No lantern'); if ((await saved()).phase !== 'echo') await click('#phase-button'); };
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 960, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: base });
  await waitFor("!!window.KiriCore && !!window.KiriData && document.getElementById('new-game')");
  console.log('Title loaded');
  await evaluate("Promise.all([...document.images].map(i=>i.decode().catch(()=>{})))"); await pause(700);
  await screenshot('preview-title.png');
  console.log('Title screenshot captured');
  assert.equal(await evaluate("document.getElementById('continue-game').disabled"), true);
  await click('#help-title'); await click('#setting-text'); await click('#modal-close');
  await click('#new-game'); await drain(); await object('ren', true, 1);
  assert.equal(!!(await saved()).flags.promisedRen, false);
  await object('ren');
  assert.equal((await saved()).flags.lantern, true); assert.equal((await saved()).flags.promisedRen, true);
  await click('#map-button'); assert.equal(await evaluate("document.querySelector('[data-zone=town]').disabled"), true); await click('#modal-close');
  results.push('Prologue, lantern, gated map and recovering an initially declined promise');
  console.log('Prologue passed');
  await echo(); await object('timetable');
  assert.equal(await evaluate("getComputedStyle(document.querySelector('#object-photo .object-marker')).animationName"),'interaction-glint');
  assert.equal(await evaluate("getComputedStyle(document.querySelector('#object-photo .object-marker')).width"),'7px');
  for(const point of [[4,12],[4,14]]) {
    await evaluate(`(()=>{const w=document.getElementById('world'),r=w.getBoundingClientRect(),p=KiriRenderer.project({x:${point[0]},y:${point[1]}});w.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:r.left+p.x,clientY:r.top+p.y}));})()`);
    await waitFor(`document.getElementById('player').dataset.tileX==='${point[0]}'&&document.getElementById('player').dataset.tileY==='${point[1]}'`);
  }
  await waitFor("Number(getComputedStyle(document.querySelector('#object-photo .object-marker')).opacity) > .75");
  const photoClip=await evaluate("(()=>{const r=document.getElementById('world').getBoundingClientRect(),p=KiriRenderer.project({x:4,y:13});return {x:Math.max(r.left+6,r.left+p.x-260),y:Math.max(r.top+6,r.top+p.y-145),width:600,height:350,scale:1}})()");
  await screenshot('preview-photo-detail.png',photoClip);
  await object('photo');
  assert.equal(await evaluate("document.getElementById('object-photo').dataset.tileX"),'4');
  assert.equal(await evaluate("document.querySelector('[data-prop=photo-bench]') !== null"),true);
  assert.equal(await evaluate("getComputedStyle(document.querySelector('#object-photo .object-marker')).animationName"),'none');
  const mortar=await evaluate(`(()=>{
    const canvas=document.getElementById('tile-map'),pen=canvas.getContext('2d'),v=KiriRenderer.view,dpr=canvas.width/v.width;
    return [8,9,10,11,12].map(x=>Array.from(pen.getImageData(Math.round((x*v.tile-v.x*v.tile)*dpr),Math.round((12*v.tile+5-v.y*v.tile)*dpr),1,1).data));
  })()`);
  for(const pixel of mortar) for(let channel=0;channel<4;channel++) assert.ok(Math.abs(pixel[channel]-mortar[0][channel])<=1,'Mortar continues through map-cell boundaries');
  await pause(4300); await screenshot('preview-station.png');
  await object('station-lock', false);
  await click('#puzzle-check'); assert.match(await evaluate("document.getElementById('puzzle-status').textContent"), /没有打开/);
  for (const [index, count] of [[1, 7], [2, 1], [3, 6]]) for (let i = 0; i < count; i++) await click(`[data-digit="${index}"][data-delta="1"]`);
  await click('#puzzle-check'); await drain(); assert.deepEqual((await saved()).solved, ['station']);
  results.push('Station clue and memory, wrong answer recovery, date lock');
  console.log('Station passed');
  await click('#object-to-town'); await waitFor("document.getElementById('zone-name').textContent === '灯见街'"); await pause(100);
  await object('nagi', true, 1); assert.equal(!!(await saved()).flags.helpedNagi, false); await object('nagi');
  await object('notice'); await pause(4300); await screenshot('preview-town.png'); await object('crane');
  assert.equal((await saved()).flags.helpedNagi, true);
  await map('shrine'); await object('mural'); await object('lanterns', false);
  for (const symbol of ['moon', 'mountain', 'river', 'boat']) await click(`[data-lantern="${symbol}"]`);
  await click('#puzzle-check'); await drain(); assert.equal((await saved()).solved.length, 2);
  await pause(4300); await screenshot('preview-shrine.png');
  results.push('Physical scene exit, recovering a declined town request, paper crane and shrine puzzle');
  console.log('Shrine passed');
  await map('archive'); await object('ledger'); await object('tape'); await object('records', false);
  await click('[data-record="0"]'); await click('[data-record="2"]');
  await click('[data-record="1"]'); await click('[data-record="3"]');
  await click('#puzzle-check'); await drain(); assert.equal((await saved()).flags.truth, true);
  await pause(4300); await screenshot('preview-archive.png');
  results.push('Archive memory, chronology exchange puzzle, story revelation');
  console.log('Archive passed');
  await map('tower'); await object('marks'); await object('tower-shiori');
  await object('gears', false); await click('[data-gear="0"]'); await click('[data-gear="2"]'); await click('[data-gear="2"]');
  await click('#puzzle-check'); await drain(); assert.equal((await saved()).solved.length, 4);
  await pause(4200); await screenshot('preview-game.png');
  results.push('Clock tower confession and linked-gear puzzle');
  console.log('Tower passed');
  // Reload proves that the game resumes from an actual serialized browser save.
  await send('Page.reload'); await waitFor("!document.getElementById('continue-game').disabled"); await click('#continue-game');
  assert.equal((await saved()).zone, 'tower'); assert.equal((await saved()).flags.heardShiori, true);
  await map('river'); await object('river-shiori');
  assert.equal(await evaluate("document.querySelector('[data-ending=dawn]').disabled"), true);
  assert.match(await evaluate("document.querySelector('.finale-missing').textContent"), /河畔的姓名/);
  await click('#modal-close'); await echo(); await object('names');
  assert.equal((await saved()).memories.length, 4);
  await pause(4300); await screenshot('preview-river.png');
  results.push('Reload persistence, locked true-ending explanation, final optional memory');
  await object('river-shiori'); assert.equal(await evaluate("document.querySelector('[data-ending=dawn]').disabled"), false);
  await click('[data-ending="dawn"]'); await waitFor("!document.getElementById('ending-screen').hidden");
  assert.equal(await evaluate("document.getElementById('ending-name').textContent"), '与你重逢的黎明');
  await pause(2400); await screenshot('preview-ending.png');
  for (const id of ['departure', 'keeper', 'nameless']) {
    await click('#ending-rewind'); await object('river-shiori'); await click(`[data-ending="${id}"]`);
    await waitFor("!document.getElementById('ending-screen').hidden"); assert.equal((await saved()).ending, id);
  }
  assert.equal((await evaluate("JSON.parse(localStorage.getItem('kiriakari.endings.v1'))")).length, 4);
  results.push('All four endings reached through UI; rewind retains story progress and gallery');
  await click('#ending-rewind'); await click('#settings-button'); await click('#save-manual');
  await click('#setting-sound'); assert.equal(await evaluate('KiriSound.enabled'), true);
  await click('#setting-sound'); assert.equal(await evaluate('KiriSound.enabled'), false);
  await click('#modal-close');
  await map('town'); await click('#settings-button'); await click('#load-manual'); await click('#confirm-load');
  assert.equal((await saved()).zone, 'river');
  await click('#journal-button'); await click('[data-tab="memories"]');
  assert.equal(await evaluate("document.querySelectorAll('.journal-entry:not(.locked)').length"), 4); await click('#modal-close');
  results.push('Manual save and actual load, music toggle and complete journal');
  // Exercise keyboard movement and phase toggle rather than injecting position.
  await evaluate("document.getElementById('world').focus()"); const before = (await saved()).player.x;
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'd', code: 'KeyD' }); await pause(500);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'd', code: 'KeyD' });
  assert.ok(Number.isInteger((await saved()).player.x));
  assert.notEqual((await saved()).player.x, before);
  assert.equal(await evaluate("KiriMaps.walkable(document.getElementById('world').dataset.zone,+document.getElementById('player').dataset.tileX,+document.getElementById('player').dataset.tileY)"), true);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowUp', code: 'ArrowUp' }); await pause(850);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowUp', code: 'ArrowUp' }); await pause(180);
  assert.equal((await saved()).player.y, 9);
  const phase = (await saved()).phase;
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'q', code: 'KeyQ' }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'q', code: 'KeyQ' });
  assert.notEqual((await saved()).phase, phase);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await pause(4300); await screenshot('preview-mobile.png');
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
  assert.equal(await evaluate("getComputedStyle(document.getElementById('touch-controls')).display"), 'flex');
  await click('#map-button'); assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true); await click('#modal-close');
  await click('#home-button'); await click('#gallery-title'); assert.equal(await evaluate("document.querySelectorAll('.gallery-item:not(.locked)').length"), 4);
  results.push('Grid keyboard movement, blocked bridge railing, Q, mobile camera with no overflow, ending gallery');
  assert.deepEqual(errors, []);
  // Verify all referenced art exists and the character sheet really has an alpha channel.
  for (const name of ['title', 'world-atlas', 'portraits', 'sprites', 'tileset', 'terrain-variety', 'foliage-variety', 'mounted-props', 'world-props', 'stone-grain']) { const response = await fetch(`${base}/assets/${name}.png`); assert.equal(response.status, 200); }
  const sprite = fs.readFileSync(path.join(ROOT, 'assets/sprites.png')); assert.equal(sprite[25], 6);
  const foliage = fs.readFileSync(path.join(ROOT,'assets/foliage-variety.png')); assert.equal(foliage[25],6);
  assert.equal(await evaluate("KiriMaps.maps.town.scenery.length > 50 && KiriMaps.maps.shrine.scenery.length > 40"),true);
  const report = { passed: true, results, errors, screenshots: ['preview-title.png', 'preview-photo-detail.png', 'preview-station.png', 'preview-town.png', 'preview-shrine.png', 'preview-archive.png', 'preview-game.png', 'preview-river.png', 'preview-ending.png', 'preview-mobile.png'] };
  fs.writeFileSync(path.join(__dirname, 'browser-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await send('Browser.close').catch(() => {});
}
main().catch(err => { console.error(err); process.exitCode = 1; }).finally(async () => {
  if (ws?.readyState === WebSocket.OPEN) ws.close();
  if (chrome && chrome.exitCode === null) chrome.kill();
  if (server) server.closeAllConnections?.();
  if (server) server.close();
});
