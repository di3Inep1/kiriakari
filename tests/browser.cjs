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
  const assertFurnitureGrid=async()=>{
    const entries=await evaluate(`(()=>{const v=KiriRenderer.view,m=KiriMaps.maps[v.zone];return m.props.filter(p=>p.grid).map(p=>{const node=document.querySelector('[data-prop="'+p.id+'"]'),g=p.grid,r=node.getBoundingClientRect();return {id:p.id,w:r.width,h:r.height,nativeWidth:node.width,nativeHeight:node.height,rendering:getComputedStyle(node).imageRendering,left:parseFloat(node.style.left),top:parseFloat(node.style.top),expected:[g.w*v.tile,g.h*v.tile,Math.round((g.x-v.x)*v.tile),Math.round((g.top-v.y)*v.tile)]};});})()`);
    assert.ok(entries.length>0);for(const e of entries){assert.deepEqual([e.w,e.h,e.left,e.top],e.expected,'Visible sprite stays inside its defined tile rectangle: '+e.id);assert.deepEqual([e.nativeWidth,e.nativeHeight],[e.w,e.h],'Gameplay uses native pixels without CSS scaling: '+e.id);assert.equal(e.rendering,'pixelated');}
    const blits=await evaluate('window.__gridBlits');assert.ok(blits.length>0);for(const b of blits){assert.ok(b.native,'Gameplay must read a prepared pixel sheet');assert.deepEqual(b.source,b.destination,'Gameplay drawImage must copy pixels 1:1 without resizing');}
  };
  const travel=async(id,zone)=>{await click('#object-'+id);await waitFor(`document.getElementById('world').dataset.zone===${JSON.stringify(zone)}`);await pause(100);if(['station-office','town-workshop'].includes(zone))await assertFurnitureGrid();};
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`window.__gridBlits=[];const originalDrawImage=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(image,...args){if(this.canvas.classList.contains('grid-furniture'))window.__gridBlits.push({native:!!image.src?.includes('interior-native-'),source:[args[2],args[3]],destination:[args[6],args[7]]});return originalDrawImage.call(this,image,...args);};`});
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 960, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: base });
  await waitFor("!!window.KiriCore && !!window.KiriData && document.getElementById('new-game')");
  console.log('Title loaded');
  await evaluate("Promise.all([...document.images].map(i=>i.decode().catch(()=>{})))"); await pause(700);
  await screenshot('preview-title.png');
  console.log('Title screenshot captured');
  if(process.argv.includes('--interior-preview')){
    for(const [zone,file] of [['station-office','preview-station-office.png'],['town-workshop','preview-lantern-workshop.png']]){
      await send('Page.navigate',{url:base});await waitFor('!!window.KiriExploration');
      await evaluate(`(()=>{const s=KiriCore.newGame();s.zone=${JSON.stringify(zone)};s.player={x:9,y:8,facing:0};if(s.zone==='town-workshop'){KiriCore.setFlag(s,'lantern');KiriCore.solvePuzzle(s,'station',[0,7,1,6]);KiriCore.setFlag(s,'helpedNagi');}localStorage.setItem('kiriakari.save.v1',JSON.stringify(s));})()`);
      await send('Page.reload');await waitFor("!!window.KiriExploration && !!document.getElementById('continue-game')&&!document.getElementById('continue-game').disabled");await click('#continue-game');
      await waitFor(`document.getElementById('world').dataset.zone===${JSON.stringify(zone)}`);await pause(900);await assertFurnitureGrid();await screenshot(file);
      if(process.argv.includes('--footprints')){
        await evaluate(`(()=>{
          const v=KiriRenderer.view,m=KiriMaps.maps[v.zone],c=document.createElement('canvas');c.id='qa-grid';c.width=v.width;c.height=v.height;Object.assign(c.style,{position:'absolute',inset:'0',zIndex:'9500',pointerEvents:'none'});document.getElementById('world').appendChild(c);const p=c.getContext('2d');
          p.strokeStyle='rgba(206,237,233,.2)';p.lineWidth=1;for(let x=0;x<=m.w;x++){p.beginPath();p.moveTo((x-v.x)*v.tile,-v.y*v.tile);p.lineTo((x-v.x)*v.tile,(m.h-v.y)*v.tile);p.stroke();}for(let y=0;y<=m.h;y++){p.beginPath();p.moveTo(-v.x*v.tile,(y-v.y)*v.tile);p.lineTo((m.w-v.x)*v.tile,(y-v.y)*v.tile);p.stroke();}
          const a=m.areas.aisle;p.fillStyle='rgba(89,180,149,.17)';p.fillRect((a.x-v.x)*v.tile,(a.y-v.y)*v.tile,a.width*v.tile,a.height*v.tile);
          p.font='bold 12px sans-serif';for(const o of m.props){const g=o.grid;if(!g||!g.d)continue;const x=(g.x-v.x)*v.tile,y=(g.y-v.y)*v.tile;p.fillStyle='rgba(232,190,99,.13)';p.fillRect(x,y,g.w*v.tile,g.d*v.tile);p.strokeStyle='#e7c889';p.strokeRect(x+.5,y+.5,g.w*v.tile-1,g.d*v.tile-1);p.fillStyle='#142127';p.fillRect(x+2,y+2,34,17);p.fillStyle='#ffe1a7';p.fillText(g.w+'×'+g.d,x+5,y+15);}
        })()`);
        await screenshot(file.replace('.png','-grid.png'));await evaluate("document.getElementById('qa-grid').remove()");
      }
    }
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await waitFor('KiriRenderer.view.tile===32');await pause(300);await assertFurnitureGrid();await screenshot('preview-workshop-mobile.png');
    assert.deepEqual(errors,[]);console.log('Interior floors captured; native 48px desktop and 32px mobile frames verified; no browser errors');await send('Browser.close');return;
  }
  assert.equal(await evaluate("document.getElementById('continue-game').disabled"), true);
  await click('#help-title'); await click('#setting-text'); await click('#modal-close');
  await click('#new-game'); await drain();await object('toolbox');assert.equal(!!(await saved()).flags.lantern,false);
  await object('ren');assert.equal((await saved()).flags.renMet,true);
  await travel('station-door','station-office');await object('duty-log');await pause(2800);await screenshot('preview-station-office.png');
  await object('old-lantern');assert.equal((await saved()).flags.lampFound,true);assert.equal(!!(await saved()).flags.lantern,false);
  await send('Page.reload');await waitFor("!!window.KiriExploration && document.getElementById('continue-game')&&!document.getElementById('continue-game').disabled");await click('#continue-game');
  assert.equal((await saved()).zone,'station-office');assert.equal((await saved()).flags.lampFound,true);assert.equal(!!(await saved()).flags.lantern,false);assert.ok((await saved()).items.includes('guideLamp'));
  await object('lighting-table');assert.equal(!!(await saved()).flags.lantern,false);
  await object('parcel');await travel('office-exit','station');assert.equal(await evaluate("document.getElementById('player').dataset.tileX"),'6');
  await object('ren');assert.ok((await saved()).items.includes('lockerKey'));await object('toolbox');assert.ok((await saved()).items.includes('dryMatches'));
  await object('ren',true,1);assert.equal(!!(await saved()).flags.lantern,false);
  await travel('station-door','station-office');await object('lighting-table');assert.equal((await saved()).flags.lantern,true);assert.equal((await saved()).items.includes('dryMatches'),false);
  await travel('office-exit','station');await object('ren', true, 1);
  assert.equal(!!(await saved()).flags.promisedRen, false);
  await object('ren');
  assert.equal((await saved()).flags.lantern, true); assert.equal((await saved()).flags.promisedRen, true);
  await click('#map-button'); assert.equal(await evaluate("document.querySelector('[data-zone=town]').disabled"), true); await click('#modal-close');
  results.push('Station interior, unlit lamp, practical NPC key, locked maintenance chest, dry matches consumed at lighting desk, parcel and recoverable promise');
  console.log('Prologue passed');
  await waitFor("document.getElementById('player').classList.contains('has-walk-sheet')");
  await evaluate("(()=>{const w=document.getElementById('world'),r=w.getBoundingClientRect(),p=KiriRenderer.project({x:16,y:10});w.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:r.left+p.x,clientY:r.top+p.y}));})()");
  await waitFor("document.getElementById('player').dataset.tileX==='16'&&document.getElementById('player').dataset.tileY==='10'&&!document.getElementById('player').classList.contains('walking')");
  await evaluate(`(()=>{
    window.__movementTrace=[];window.__traceWalking=true;
    const sample=t=>{const p=document.getElementById('player');window.__movementTrace.push({t,x:+p.dataset.visualX,y:+p.dataset.visualY,frame:+p.dataset.walkFrame,walking:p.classList.contains('walking')});if(window.__traceWalking)requestAnimationFrame(sample);};requestAnimationFrame(sample);
  })()`);
  const movementStart=await evaluate('performance.now()');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'d',code:'KeyD'});await pause(55);
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'w',code:'KeyW'});await pause(220);
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'w',code:'KeyW'});await pause(210);
  const movementRelease=await evaluate('performance.now()');
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'d',code:'KeyD'});await pause(200);
  const trace=await evaluate('window.__traceWalking=false;window.__movementTrace');
  const movingFrames=trace.filter(p=>p.walking);
  assert.ok(movingFrames.length>8);assert.deepEqual([...new Set(movingFrames.map(p=>p.frame))].sort(),[0,1,2]);
  for(let i=1;i<trace.length;i++){assert.ok(trace[i].x>=trace[i-1].x-.00001,'Turning never rewinds horizontal motion');assert.ok(trace[i].y<=trace[i-1].y+.00001,'Turning never rewinds vertical motion');}
  const between=trace.filter(p=>p.t>movementStart+40&&p.t<movementRelease-25);
  assert.ok(between.every(p=>p.walking),'Continuous input has no tile-boundary idle frame');
  assert.equal(await evaluate("document.getElementById('player').dataset.walkFrame"),'1');
  assert.equal(await evaluate("document.getElementById('player').classList.contains('walking')"),false);
  results.push('Rapid mid-step turn has no rollback or boundary pause; both stride frames play and idle settles');
  console.log('Movement and walk frames passed');
  await waitFor('KiriLighting.assetsReady()');
  assert.match(await evaluate("getComputedStyle(document.querySelector('.player-lantern')).backgroundImage"),/guide-lantern/);
  const lampClip=await evaluate("(()=>{const r=document.getElementById('world').getBoundingClientRect(),p=KiriRenderer.project({x:+document.getElementById('player').dataset.visualX,y:+document.getElementById('player').dataset.visualY});return {x:Math.max(r.left+2,Math.min(innerWidth-640,r.left+p.x-320)),y:Math.max(r.top+2,r.top+p.y-220),width:640,height:360,scale:2}})()");
  await pause(700);await screenshot('preview-lantern-present.png');await screenshot('preview-lantern-detail.png',lampClip);
  await echo();await pause(1500);await screenshot('preview-memory.png');
  await click('#settings-button');await click('#setting-particles');await click('#modal-close');
  assert.equal(await evaluate("(()=>{const c=document.getElementById('atmosphere'),a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;return a.some((v,i)=>i%4===3&&v>0)})()"),true,'Switching particles off retains the light and memory atmosphere');
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await pause(200);
  const still=await evaluate("document.querySelector('.player-lantern').style.getPropertyValue('--lamp-angle')");await pause(140);
  assert.equal(still,'0deg');assert.equal(await evaluate("document.querySelector('.player-lantern').style.getPropertyValue('--lamp-angle')"),still);
  assert.equal(await evaluate("(()=>{const p=document.getElementById('player'),c=document.getElementById('atmosphere'),ui=document.querySelector('.phase-button');return +getComputedStyle(c).zIndex>+getComputedStyle(p).zIndex&&+getComputedStyle(c).zIndex<+getComputedStyle(ui).zIndex})()"),true);
  await send('Emulation.setEmulatedMedia',{features:[]});
  await click('#settings-button');await click('#setting-particles');await click('#modal-close');
  await click('#phase-button');
  results.push('Generated hand lantern, lit memory fog, static lighting without particles, live reduced-motion preference and correct effect layers');
  if(process.argv.includes('--lighting-only')){
    for(const [key,code,facing] of [['s','KeyS',0],['a','KeyA',1],['d','KeyD',2],['w','KeyW',3]]){
      await send('Input.dispatchKeyEvent',{type:'keyDown',key,code});await pause(80);
      assert.equal(await evaluate("+document.getElementById('player').dataset.facing"),facing);
      assert.equal(await evaluate("document.querySelector('.player-lantern').dataset.behind"),String(facing===3));
      await send('Input.dispatchKeyEvent',{type:'keyUp',key,code});await pause(230);
    }
    await echo();await pause(4300);await screenshot('preview-memory.png');
    assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,results,errors},null,2));await send('Browser.close');return;
  }
  if(process.argv.includes('--movement-only')){
    for(const [key,code,facing] of [['s','KeyS',0],['a','KeyA',1],['d','KeyD',2],['w','KeyW',3]]){
      await send('Input.dispatchKeyEvent',{type:'keyDown',key,code});await pause(180);
      assert.equal(await evaluate("+document.getElementById('player').dataset.facing"),facing);
      assert.match(await evaluate("getComputedStyle(document.querySelector('#player .sprite')).backgroundImage"),/mio-walk-v2/);
      await send('Input.dispatchKeyEvent',{type:'keyUp',key,code});await pause(180);
      assert.equal(await evaluate("document.getElementById('player').dataset.walkFrame"),'1');
    }
    await screenshot('preview-movement.png');
    console.log(JSON.stringify({passed:true,results,errors,walkSheet:'assets/mio-walk-v2.png',directions:4},null,2));
    assert.deepEqual(errors,[]);await send('Browser.close');return;
  }
  await echo(); await object('timetable');
  assert.equal(await evaluate("getComputedStyle(document.querySelector('#object-photo .object-marker')).animationName"),'interaction-glint');
  assert.equal(await evaluate("getComputedStyle(document.querySelector('#object-photo .object-marker')).width"),'7px');
  const photoPosition=await evaluate("KiriData.zones.station.objects.find(o=>o.id==='photo')");
  for(const point of [[photoPosition.x+2,photoPosition.y+1],[photoPosition.x,photoPosition.y+1]]) {
    await evaluate(`(()=>{const w=document.getElementById('world'),r=w.getBoundingClientRect(),p=KiriRenderer.project({x:${point[0]},y:${point[1]}});w.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:r.left+p.x,clientY:r.top+p.y}));})()`);
    await waitFor(`document.getElementById('player').dataset.tileX==='${point[0]}'&&document.getElementById('player').dataset.tileY==='${point[1]}'`);
  }
  await waitFor("Number(getComputedStyle(document.querySelector('#object-photo .object-marker')).opacity) > .75");
  const photoClip=await evaluate("(()=>{const r=document.getElementById('world').getBoundingClientRect(),p=KiriRenderer.project(KiriData.zones.station.objects.find(o=>o.id==='photo'));return {x:Math.max(r.left+6,r.left+p.x-260),y:Math.max(r.top+6,r.top+p.y-145),width:600,height:350,scale:1}})()");
  await screenshot('preview-photo-detail.png',photoClip);
  await object('photo');
  assert.equal(await evaluate("+document.getElementById('object-photo').dataset.tileX"),photoPosition.x);
  assert.equal(await evaluate("document.querySelector('[data-prop=photo-bench]') !== null"),true);
  assert.equal(await evaluate("getComputedStyle(document.querySelector('#object-photo .object-marker')).animationName"),'none');
  const mortar=await evaluate(`(()=>{
    const canvas=document.getElementById('tile-map'),pen=canvas.getContext('2d'),v=KiriRenderer.view,dpr=canvas.width/v.width;
    return [8,9,10,11,12].map(x=>Array.from(pen.getImageData(Math.round((x*v.tile-v.x*v.tile)*dpr),Math.round((12*v.tile+5-v.y*v.tile)*dpr),1,1).data));
  })()`);
  for(const pixel of mortar) for(let channel=0;channel<4;channel++) assert.ok(Math.abs(pixel[channel]-mortar[0][channel])<=1,'Mortar continues through map-cell boundaries');
  await pause(4300); await screenshot('preview-station.png');
  assert.equal(await evaluate(`(()=>{
    const z=e=>+getComputedStyle(e).zIndex,building=document.querySelector('[data-building="station-office"]'),buffer=document.querySelector('[data-prop="rail-buffer"]');
    return z(buffer)<z(building)&&z(document.getElementById('player'))>z(building)&&z(document.querySelector('.phase-button'))>z(building);
  })()`),true,'Rail buffer stays behind the projecting station roof; platform actors and HUD stay in front');
  await object('station-lock', false);
  await click('#puzzle-check'); assert.match(await evaluate("document.getElementById('puzzle-status').textContent"), /没有打开/);
  for (const [index, count] of [[1, 7], [2, 1], [3, 6]]) for (let i = 0; i < count; i++) await click(`[data-digit="${index}"][data-delta="1"]`);
  await click('#puzzle-check'); await drain(); assert.deepEqual((await saved()).solved, ['station']);
  assert.equal(await evaluate("KiriMaps.walkable('station',23,13,JSON.parse(localStorage.getItem('kiriakari.save.v1')).solved)"),true);
  results.push('Station clue and memory, wrong answer recovery, date lock');
  console.log('Station passed');
  await click('#object-to-town'); await waitFor("document.getElementById('zone-name').textContent === '灯见街'"); await pause(100);
  await object('nagi', true, 1); assert.equal(!!(await saved()).flags.helpedNagi, false); await object('nagi');
  assert.equal((await saved()).flags.parcelDelivered,true);assert.ok((await saved()).items.includes('routeCard'));
  await object('nagi');assert.equal(!!(await saved()).flags.helpedNagi,false);
  if((await saved()).phase==='echo')await click('#phase-button');await object('basket');assert.equal((await saved()).items.includes('redThread'),false);
  await echo();await object('basket');assert.ok((await saved()).items.includes('redThread'));await object('well');
  await travel('workshop-door','town-workshop');await object('workshop-record');await object('paste-table');assert.ok((await saved()).items.includes('ricePaste'));assert.equal((await saved()).items.includes('waterJar'),false);
  await object('workbench',true,1);assert.equal(!!(await saved()).flags.helpedNagi,false);assert.ok((await saved()).items.includes('redThread'));
  await object('workbench');assert.equal((await saved()).flags.helpedNagi,true);assert.equal((await saved()).items.includes('redThread'),false);assert.equal((await saved()).items.includes('ricePaste'),false);
  await pause(4300);await screenshot('preview-lantern-workshop.png');await travel('workshop-exit','town');
  results.push('Practical town help, parcel delivery, memory-only red thread, well water, mixing paste, real repair materials and returning through the workshop door');
  if(process.argv.includes('--opening-only')){assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,results,errors},null,2));await send('Browser.close');return;}
  await object('notice'); await pause(4300); await screenshot('preview-town.png');
  await evaluate("(()=>{const w=document.getElementById('world'),r=w.getBoundingClientRect(),p=KiriRenderer.project({x:27,y:9});w.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:r.left+p.x,clientY:r.top+p.y}));})()");
  await waitFor("document.getElementById('player').dataset.tileX==='27'&&document.getElementById('player').dataset.tileY==='9'");
  assert.equal(await evaluate("document.querySelector('.roof-thread').dataset.attachment"),'town-east-house');
  const craneClip=await evaluate("(()=>{const r=document.getElementById('world').getBoundingClientRect(),p=KiriRenderer.project({x:27,y:8});return {x:Math.min(innerWidth-640,Math.max(r.left+6,r.left+p.x-320)),y:Math.max(r.top+6,r.top+p.y-240),width:640,height:400,scale:1}})()");
  await screenshot('preview-crane-detail.png',craneClip);
  assert.equal(await evaluate(`(()=>{
    const z=e=>+getComputedStyle(e).zIndex,b=KiriMaps.maps.town.buildings.find(b=>b.id==='town-east-house'),building=document.querySelector('[data-building="town-east-house"]'),bird=document.querySelector('[data-prop="eave-crane"]');
    const plants=[...document.querySelectorAll('.scenery-sprite:not(.leaves)')];
    return z(bird)>z(building)&&plants.filter(p=>+p.dataset.groundY+.92<b.frontY).every(p=>z(p)<z(building))&&plants.filter(p=>+p.dataset.groundY+.92>b.frontY).every(p=>z(p)>z(building))&&KiriRenderer.depth(b.frontY-.92-.02)<z(building)&&KiriRenderer.depth(b.frontY-.92+.02)>z(building);
  })()`),true,'Flowers sort by their roots, attached crane follows the wall, and depth crosses smoothly at the wall baseline');
  results.push('Unified wall, eave, buffer, flower and actor occlusion; HUD above scene');await object('crane');
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
  await pause(180);
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
  for (const name of ['title', 'world-atlas', 'portraits', 'sprites', 'tileset', 'terrain-variety', 'foliage-variety', 'mounted-props', 'world-props', 'stone-grain', 'mio-walk', 'mio-walk-v2', 'hanging-crane', 'station-fixtures-v2']) { const response = await fetch(`${base}/assets/${name}.png`); assert.equal(response.status, 200); }
  const sprite = fs.readFileSync(path.join(ROOT, 'assets/sprites.png')); assert.equal(sprite[25], 6);
  const foliage = fs.readFileSync(path.join(ROOT,'assets/foliage-variety.png')); assert.equal(foliage[25],6);
  assert.equal(await evaluate("KiriMaps.maps.town.scenery.length > 50 && KiriMaps.maps.shrine.scenery.length > 40"),true);
  const report = { passed: true, results, errors, screenshots: ['preview-title.png', 'preview-photo-detail.png', 'preview-crane-detail.png', 'preview-station.png', 'preview-town.png', 'preview-shrine.png', 'preview-archive.png', 'preview-game.png', 'preview-river.png', 'preview-ending.png', 'preview-mobile.png'] };
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
