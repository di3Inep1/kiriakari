(function () {
  'use strict';
  const C = window.KiriCore, D = window.KiriData, S = window.KiriSound, M = window.KiriMaps, R = window.KiriRenderer;
  const $ = id => document.getElementById(id);
  const KEYS = { auto: 'kiriakari.save.v1', manual: 'kiriakari.manual.v1', checkpoint: 'kiriakari.bridge.v1', collection: 'kiriakari.endings.v1', settings: 'kiriakari.settings.v1' };
  let state = null, screen = 'title', modalKind = null, modalReturnFocus = null, dialogueReturnFocus = null;
  let target = null, pendingObject = null, nearest = null, lastFrame = performance.now(), saveTick = 0, lastWalk = false;
  let route = [], step = null;
  let dialogueLines = [], dialogueIndex = 0, dialogueEnd = null, typeTimer = null, typing = false, currentText = '';
  let toastTimer = null, splashTimer = null, transitionTimer = null, transitioning = false, puzzle = null, storageWarning = false;
  const keys = new Set();
  const settings = Object.assign({ sound: false, instantText: false, particles: true }, read(KEYS.settings) || {});
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) settings.instantText = true;
  let unlocked = read(KEYS.collection);
  unlocked = Array.isArray(unlocked) ? unlocked.filter(x => C.ENDINGS.includes(x)) : [];
  function read(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch { if (!storageWarning) { storageWarning = true; toast('浏览器无法保存进度。请允许本地存储后继续游玩。'); } return false; }
  }
  function getSave(key = KEYS.auto) { return C.restore(read(key)); }
  function save() {
    if (!state) return;
    if (write(KEYS.auto, state)) $('save-status').innerHTML = '<i></i> 旅途已记录';
    else $('save-status').textContent = '进度暂未保存';
    refreshTitle();
  }
  function refreshTitle() {
    const stored = getSave();
    $('continue-game').disabled = !stored;
    $('save-note').textContent = stored ? `上次停留：${D.zones[stored.zone].name} · 回忆 ${stored.memories.length} / 4` : '故事会自动记录，请放心前行。';
    $('gallery-count').textContent = `${unlocked.length} / 4`;
  }
  function toast(message) {
    clearTimeout(toastTimer);
    $('toast-region').replaceChildren();
    const el = document.createElement('div'); el.className = 'toast'; el.textContent = message;
    $('toast-region').appendChild(el);
    toastTimer = setTimeout(() => $('toast-region').replaceChildren(), 3900);
  }
  function setScreen(next) {
    clearTimeout(toastTimer); $('toast-region').replaceChildren();
    screen = next; keys.clear(); target = null; pendingObject = null; nearest = null; route = []; step = null;
    $('title-screen').hidden = next !== 'title'; $('game-screen').hidden = next !== 'play'; $('ending-screen').hidden = next !== 'ending';
    document.title = next === 'ending' && state?.ending ? `${D.endings[state.ending].name} · 雾灯町` : '雾灯町：第十三次钟声';
  }
  function startGame(loaded, prologue = false) {
    closeModal(false); stopDialogue(); state = loaded || C.newGame(); state.ending = null;
    clearTimeout(splashTimer); $('chapter-splash').hidden = true;
    setScreen('play'); renderWorld(); renderHUD(); resizeCanvas(); saveTick = 0; save();
    if (settings.sound && !S.enabled) S.setEnabled(true).then(syncSound);
    if (prologue) {
      talk([
        { who: 'mio', text: '七年前，姐姐在灯见祭的暴雨里失踪了。所有人都说，雾灯町已经和那场洪水一起消失。' },
        { who: 'mio', text: '昨天，我却收到她寄来的信。纸上只有一句话：\n「澪，钟响十三次以前，别忘了回家的路。」' },
        { text: '末班车把你放在一座寂静的站台。时钟指着 23:59，秒针却一动不动。远处，一个站务员正望着你。' },
        { text: '使用 WASD 或方向键移动，靠近光点后按 E 调查。也可以直接点击人物或物件，澪会走过去。\n先和站台上的青年谈谈吧。' }
      ], () => { showSplash(); $('world').focus({ preventScroll: true }); });
    } else $('world').focus({ preventScroll: true });
  }
  function newGame() {
    if (!getSave()) return startGame(null, true);
    openModal('重新踏入雾中', 'A NEW JOURNEY', 'newgame', '<div class="body-copy"><p>重新开始会替换当前的自动存档。已收录的结局和手动存档会保留。</p></div><div class="modal-actions"><button class="subtle-button" id="cancel-new">继续想一想</button><button class="button primary" id="confirm-new">开始新旅程 ⟶</button></div>');
    $('cancel-new').onclick = () => closeModal(); $('confirm-new').onclick = () => startGame(null, true);
  }
  function showSplash() {
    const zone = D.zones[state.zone];
    $('splash-en').textContent = zone.reading; $('splash-title').textContent = zone.name; $('splash-sub').textContent = zone.sub;
    $('chapter-splash').hidden = false; clearTimeout(splashTimer);
    splashTimer = setTimeout(() => { $('chapter-splash').hidden = true; }, reducedMotion ? 100 : 2700);
  }
  function renderWorld() {
    const zone = D.zones[state.zone], echo = state.phase === 'echo';
    $('world').classList.toggle('echo', echo);
    $('world-background').style.backgroundPosition = `${zone.atlas[0] * 100}% ${zone.atlas[1] * 50}%`;
    $('zone-name').textContent = zone.name; $('zone-reading').textContent = zone.reading; $('zone-sub').textContent = zone.sub;
    $('phase-button').disabled = !state.flags.lantern; $('phase-name').textContent = echo ? '回忆' : '现世';
    $('phase-sub').textContent = state.flags.lantern ? (echo ? '旧日之事正在浮现' : '在灯火中看见过去') : '先寻找一盏灯';
    $('phase-button').setAttribute('aria-pressed', String(echo));
    $('player').classList.toggle('lit', !!state.flags.lantern);
    const container = $('objects'); container.replaceChildren();
    visibleObjects().forEach(obj => {
      const el = document.createElement('button'); el.type = 'button';
      el.className = `object ${obj.character !== undefined ? 'character' : obj.mark || ''} ${obj.phase === 'echo' ? 'echo-actor' : ''} ${obj.support ? 'mounted' : ''}`;
      el.id = `object-${obj.id}`; el.dataset.tileX = obj.x; el.dataset.tileY = obj.y;
      el.setAttribute('aria-label', obj.name); el.dataset.object = obj.id;
      let solved = false;
      if (obj.action.startsWith('puzzle-')) solved = state.solved.includes(obj.action.slice(7));
      el.classList.toggle('solved', solved);
      el.classList.toggle('collected', state.memories.includes(obj.action));
      el.classList.toggle('read', state.clues.includes(obj.action));
      const marker = solved ? '✓' : (obj.character !== undefined ? '···' : obj.mark === 'memory' ? '✧' : obj.mark === 'exit' ? '↗' : obj.mark === 'puzzle' ? '◇' : '·');
      el.innerHTML = `${obj.character !== undefined ? `<div class="actor"><div class="actor-shadow"></div><div class="sprite" style="background-position:${obj.character * 100 / 3}% 0%"></div></div>` : ''}<span class="object-marker"><span>${marker}</span></span><span class="object-label">${obj.name}</span>${obj.label ? `<span class="object-detail">${obj.label}</span>` : ''}`;
      el.addEventListener('click', e => { e.stopPropagation(); approach(obj); }); container.appendChild(el);
    });
    nearest = null; updatePlayer(false); updateNearest();
  }
  function visibleObjects() { return D.zones[state.zone].objects.filter(obj => !obj.phase || obj.phase === state.phase); }
  function updatePlayer(walking, visual = state?.player) {
    if (!state) return;
    const player = $('player'), point = R.project(visual); player.style.left = point.x + 'px'; player.style.top = point.y + 'px';
    player.dataset.tileX = state.player.x; player.dataset.tileY = state.player.y;
    $('world').dataset.zone = state.zone;
    player.style.zIndex = String(Math.round(visual.y * 5) + 10);
    player.querySelector('.sprite').style.backgroundPosition = `0% ${state.player.facing * 100 / 3}%`;
    if (walking !== lastWalk) player.classList.toggle('walking', walking && !reducedMotion);
    lastWalk = walking;
    visibleObjects().forEach(obj => {
      const el = $(`object-${obj.id}`), position = R.project({x:obj.x+(obj.focusOffset?.x||0),y:obj.y+(obj.focusOffset?.y||0)});
      if (el) { el.style.left = position.x + 'px'; el.style.top = position.y + 'px'; el.style.zIndex = String(Math.round(obj.y * 5) + (obj.character !== undefined ? 10 : 16)); }
    });
    if (target) showClickTarget(target);
  }
  function renderHUD() {
    const objective = C.objective(state); $('chapter-label').textContent = objective[0]; $('objective-text').textContent = objective[1];
    $('memory-count').textContent = state.memories.length;
    $('memory-dots').innerHTML = C.MEMORIES.map(id => `<i class="${state.memories.includes(id) ? 'filled' : ''}"></i>`).join('');
    document.querySelector('.clock-label').innerHTML = state.solved.includes('tower') ? '<i></i> 00:00 <small>等待最后一声钟响</small>' : '<i></i> 23:59 <small>时间停止流动</small>';
  }
  function updateNearest() {
    if (!state) return;
    const objects = visibleObjects();
    const distance = obj => Math.abs(obj.x - state.player.x) + Math.abs(obj.y - state.player.y);
    nearest = objects.filter(obj => distance(obj) <= 1).sort((a, b) => distance(a) - distance(b))[0] || null;
    objects.forEach(obj => $(`object-${obj.id}`)?.classList.toggle('near', obj === nearest));
    $('nearby-hint').innerHTML = nearest ? `<kbd>E</kbd> ${nearest.character !== undefined ? '交谈 · ' : ''}${nearest.name}` : '<kbd>E</kbd> 靠近光点调查';
  }
  function approach(obj) {
    if (screen !== 'play' || modalKind || !$('dialogue').hidden || transitioning) return;
    if (Math.abs(obj.x - state.player.x) + Math.abs(obj.y - state.player.y) <= 1) return interact(obj);
    const plan = M.approach(state.zone, state.player, obj);
    if (!plan) return toast('这边被挡住了。试着从另一侧靠近。');
    clearTarget(); route = plan.path; target = plan.point; pendingObject = obj; showClickTarget(target);
    $('world').focus({ preventScroll: true });
  }
  function showClickTarget(point) { const p = R.project(point); $('click-target').hidden = false; $('click-target').style.left = p.x + 'px'; $('click-target').style.top = p.y + 'px'; }
  function clearTarget() { target = null; pendingObject = null; route = []; step = null; $('click-target').hidden = true; }
  function changeZone(id) {
    if (!C.canVisit(state, id)) {
      const reasons = { town: '检票闸门还没有打开。先调查车站的机关。', shrine: '先打开车站的检票闸门。', archive: '书库的门印着四盏灯。先解开月见神社的灯阵。', tower: '通向钟楼的楼梯被封住了。记录柜里也许有钥匙。', river: '通向渡灯桥的雾太浓。让钟楼重新转动，雾才会散去。' };
      return toast(reasons[id] || '这条路暂时无法通行。');
    }
    keys.clear(); clearTarget(); closeModal(false); transitioning = true;
    $('transition').classList.add('active'); clearTimeout(transitionTimer);
    transitionTimer = setTimeout(() => {
      state.zone = id; const zone = D.zones[id]; state.player = { x: zone.spawn[0], y: zone.spawn[1], facing: 0 };
      renderWorld(); renderHUD(); save(); $('transition').classList.remove('active'); transitioning = false; showSplash();
      $('world').focus({ preventScroll: true });
      if (id === 'river' && !state.seen.includes('river-intro')) {
        state.seen.push('river-intro');
        talk([{ who: 'mio', text: '雾散开了。桥的另一端，姐姐像七年前那样，提着一盏灯。\n我知道，这次她等的不是一句「救救我」。' }], save);
      }
    }, reducedMotion ? 10 : 330);
  }
  function togglePhase() {
    if (screen !== 'play' || modalKind || !$('dialogue').hidden || transitioning) return;
    if (!state.flags.lantern) return toast('先和站台上的莲交谈，取得引灯。');
    clearTarget(); state.phase = state.phase === 'echo' ? 'present' : 'echo';
    S.phase(state.phase === 'echo'); renderWorld(); save();
    if (!state.seen.includes('echo-tutorial')) {
      state.seen.push('echo-tutorial');
      toast('回忆中会出现褪去的文字与旧日的物件。蓝色光点能找回一段回忆。');
    }
  }
  function interact(obj) {
    if (!obj || screen !== 'play' || modalKind || !$('dialogue').hidden || transitioning) return;
    keys.clear(); clearTarget(); S.click();
    const faceX = obj.x - state.player.x, faceY = obj.y - state.player.y;
    if (faceX || faceY) state.player.facing = Math.abs(faceX) > Math.abs(faceY) ? (faceX < 0 ? 1 : 2) : (faceY < 0 ? 3 : 0);
    const action = obj.action;
    if (action.startsWith('go-')) return changeZone(action.slice(3));
    if (action.startsWith('puzzle-')) return openPuzzle(action.slice(7));
    if (D.clues[action]) return inspectClue(action);
    if (D.memories[action]) return inspectMemory(action);
    if (action === 'ren') return talkRen();
    if (action === 'nagi') return talkNagi();
    if (action === 'notice') return talk([{ text: '告示上写着：「七月十六日，灯见祭。请为每盏灯写下一个你不愿忘记的名字。」\n纸已经泛黄，角落却像刚刚被雨打湿。' }, { who: 'mio', text: '原来那天不是为了向神许愿。是为了让离开的人，还能找到回来的路。' }]);
    if (action === 'shrine-shiori') return talk([{ who: 'shiori', text: '月是抬头时看见的，山是远处等你的。走过川，才有舟。\n澪，你小时候总把最后一句唱反。' }, { who: 'mio', text: '姐姐？等一下——你为什么和那年一模一样？' }, { text: '灯影晃动，她的回答散在了风里。也许钟楼里还留着更完整的回声。' }]);
    if (action === 'tower-shiori') return talkShiori();
    if (action === 'finale') return beginFinale();
  }
  function changed(message) { renderHUD(); renderWorld(); save(); if (message) toast(message); $('journal-dot').hidden = false; }
  function inspectClue(id) {
    if (state.phase !== 'echo') {
      const texts = { date: '时刻表上只剩下模糊的墨迹。背面似乎曾写过祭典的日期。', lanternOrder: '绘马上的字被雨水洗去了。只有「归舟」两字隐约可见。', chronology: '手记有四处被人涂黑。隔着纸页，你听见很远的钟声。', clockMarks: '齿轮旁刻着几个难以辨认的数字。油污盖住了指针的方向。' };
      return talk([{ text: texts[id] }, { who: 'mio', text: '也许，可以用引灯照见它以前的样子。\n（对话结束后，按 Q 切换到回忆。）' }]);
    }
    const clue = D.clues[id], fresh = !state.clues.includes(id);
    talk([{ text: clue.text }], () => {
      C.addClue(state, id); changed(fresh ? `线索已记入手记 · ${clue.title}` : null);
    });
  }
  function inspectMemory(id) {
    const memory = D.memories[id], fresh = !state.memories.includes(id);
    talk([{ who: id === 'tape' ? 'shiori' : undefined, text: memory.text }], () => {
      C.collectMemory(state, id); if (fresh) S.chime(); changed(fresh ? `找回回忆 · ${memory.title}（${state.memories.length} / 4）` : null);
    });
  }
  function talkRen() {
    if (!state.flags.lantern) {
      talk([
        { who: 'ren', detail: '站务员', text: '你终于来了，澪。我叫莲。你姐姐说，拿着这封信的人，总有一天会回来。' },
        { who: 'mio', text: '她在哪里？这里明明已经……过去七年了。' },
        { who: 'ren', text: '这里的夜晚不会结束。有人把自己留在钟声里，才替我们留住了一条路。\n拿着这盏引灯。它能照见这座镇过去的模样。' },
        { who: 'ren', text: '如果你见到了她，能不能替我说一句：我们已经不害怕天亮了。', choices: [
          { text: '我答应你。也请你，别再一个人等了。', effect: () => C.setFlag(state, 'promisedRen'), reply: [{ who: 'ren', text: '……谢谢。原来等到一句回答，是这样的感觉。' }] },
          { text: '我现在只想先找到姐姐。', reply: [{ who: 'ren', text: '我明白。我会在这里。等你想听的时候，再来找我吧。' }] }
        ] },
        { text: '获得「引灯」。按 Q 可在现世与回忆之间切换。\n检票闸门的暗号，藏在那张褪色的时刻表里。' }
      ], () => { C.setFlag(state, 'lantern'); changed('获得引灯 · 按 Q 照见回忆'); });
    } else if (!state.flags.promisedRen) {
      talk([{ who: 'ren', text: '澪，找到她以后，别只问她能为我们做什么。也问问她，自己想去哪里。\n那句「我们不怕天亮了」，你愿意替我带给她吗？', choices: [
        { text: '我答应你。天亮后，我们一起回去。', effect: () => C.setFlag(state, 'promisedRen'), reply: [{ who: 'ren', text: '那么，这次我等的是归来的列车。' }] },
        { text: '等我再想一想。', reply: [{ who: 'ren', text: '没关系。等待，已经是我最熟悉的事了。' }] }
      ] }], () => changed(state.flags.promisedRen ? '约定已记下 · 莲不再独自等待' : null));
    } else talk([{ who: 'ren', text: state.solved.includes('tower') ? '我听见齿轮的声音了。澪，去吧。我会和婆婆一起，替你们点亮回来的路。' : '引灯不会消耗，也不会熄灭。迷路的时候，就去看看同一个地方从前的模样。\n我答应过你姐姐，会把你送到最后一站。' }]);
  }
  function talkNagi() {
    if (state.flags.helpedNagi) return talk([{ who: 'nagi', text: state.solved.includes('tower') ? '钟又走了。好孩子，婆婆记得路。等你叫出她的名字，我们就把灯一盏一盏地送过去。' : '灯阵上的月、山、川、舟，是一首归家的歌。绘马被雨洗白了，可引灯能让旧字回来。\n别只盯着机关，屋檐下也有孩子留下的东西。' }]);
    talk([
      { who: 'nagi', detail: '制灯人', text: '澪都长这么大了。栞总在我这里借灯，说妹妹怕黑。\n唉，这盏灯的骨架松了。婆婆的手，如今穿不过那根细线了。' },
      { who: 'mio', choices: [
        { text: '我来帮您。您慢慢说，我想听听姐姐的事。', effect: () => C.setFlag(state, 'helpedNagi'), reply: [
          { text: '你扶正灯骨，把红线穿过竹篾。婆婆握着你的手，像从一场漫长的梦里醒来。' },
          { who: 'nagi', text: '你姐姐那天不是去求奇迹。她借走了一盏灯，给每个人写了名字。她把活下去的机会，一个一个送出了镇。' },
          { who: 'nagi', text: '可灯里也有她。若是只把钟打碎，我们会连她的名字都忘掉。\n找到她真正留下的回忆，让每个人都分担一点，灯才不用靠一个人撑着。' }
        ] },
        { text: '请先告诉我，姐姐往哪里去了。', reply: [{ who: 'nagi', text: '去月见神社吧。那里的灯阵守着书库的印钥。\n等你不那么着急时，婆婆还想请你帮个小忙。' }] }
      ] },
      { who: 'nagi', text: '神社的绘马唱着一首归舟歌。记住它的先后，灯就会认得你。' }
    ], () => changed(state.flags.helpedNagi ? '替凪婆婆修好了纸灯 · 一段牵挂被接住了' : null));
  }
  function talkShiori() {
    talk([
      { who: 'shiori', detail: '守钟人', text: '澪。你真的长大了。\n这里不是一个需要你代替我守住的地方。它只是……我还没说完的一句话。' },
      { who: 'mio', text: '那天你打开了旧闸，是为了让撤离列车通过。可洪水来的时候，你没有来得及离开。' },
      { who: 'shiori', text: '我用灯见祭的钟，把大家最后的记忆留在了这里。只要有人还记得名字，回家的路就不会断。\n可我太想再见你一次，把这一晚留得太久了。' },
      { who: 'mio', text: '为什么没有告诉我，你也会害怕？' },
      { who: 'shiori', text: '因为我总觉得，姐姐应该什么都不怕。\n但我想要的，从来不是你替我守一辈子灯。我希望你记住，我也曾经很想活下去。' },
      { who: 'shiori', text: '如果你把散落的回忆带回来，叫出完整的我……也许，这场夜晚就不用只靠一个人结束。\n我会在渡灯桥等你。' }
    ], () => { C.setFlag(state, 'heardShiori'); changed('听完了栞的心愿 · 去渡灯桥前，可继续寻找回忆'); });
  }
  function talk(lines, onEnd) {
    stopDialogue(); keys.clear(); clearTarget(); updatePlayer(false);
    dialogueReturnFocus = document.activeElement;
    dialogueLines = lines; dialogueIndex = 0; dialogueEnd = onEnd || null;
    $('dialogue').hidden = false; renderLine(); $('dialogue-next').focus({ preventScroll: true });
  }
  function stopDialogue() {
    clearInterval(typeTimer); typeTimer = null; typing = false;
    $('dialogue').hidden = true; dialogueLines = []; dialogueIndex = 0; dialogueEnd = null;
  }
  function renderLine() {
    const line = dialogueLines[dialogueIndex];
    if (!line) {
      const done = dialogueEnd; stopDialogue();
      if (done) done();
      if (screen === 'play' && !modalKind && $('dialogue').hidden) $('world').focus({ preventScroll: true });
      return;
    }
    clearInterval(typeTimer); $('dialogue-choices').replaceChildren(); $('dialogue-next').hidden = false;
    const who = D.characters[line.who];
    $('speaker-name').textContent = who?.name || '雾中的旧事'; $('speaker-detail').textContent = line.detail || (who ? '灯见祭 · 前夜' : '');
    const portrait = $('dialogue-portrait'); portrait.classList.toggle('narrator', !who);
    if (who) portrait.style.backgroundPosition = `${(who.portrait % 2) * 100}% ${Math.floor(who.portrait / 2) * 100}%`;
    currentText = line.text || '你想怎么回答？';
    $('dialogue-text').textContent = '';
    if (settings.instantText) finishTyping();
    else {
      typing = true; $('dialogue-skip').hidden = false;
      const characters = Array.from(currentText); let position = 0;
      typeTimer = setInterval(() => {
        position = Math.min(position + 2, characters.length);
        $('dialogue-text').textContent = characters.slice(0, position).join('');
        if (position >= characters.length) finishTyping();
      }, 25);
    }
  }
  function finishTyping() {
    clearInterval(typeTimer); typeTimer = null; typing = false;
    $('dialogue-text').textContent = currentText; $('dialogue-skip').hidden = true;
    const line = dialogueLines[dialogueIndex]; if (!line) return;
    if (line.choices) {
      $('dialogue-next').hidden = true; $('dialogue-choices').replaceChildren();
      line.choices.forEach(choice => {
        const button = document.createElement('button'); button.textContent = choice.text;
        const arrow = document.createElement('span'); arrow.textContent = '⟶'; button.appendChild(arrow);
        button.onclick = () => {
          if (choice.effect) choice.effect();
          const rest = dialogueLines.slice(dialogueIndex + 1);
          dialogueLines = [...(choice.reply || []), ...rest]; dialogueIndex = 0; renderLine(); save();
          if (!$('dialogue-next').hidden) $('dialogue-next').focus({ preventScroll: true });
        };
        $('dialogue-choices').appendChild(button);
      });
      if ($('dialogue').contains(document.activeElement)) $('dialogue-choices').querySelector('button')?.focus({ preventScroll: true });
    }
  }
  function nextLine() {
    if ($('dialogue').hidden) return;
    if (typing) return finishTyping();
    if (dialogueLines[dialogueIndex]?.choices) return;
    dialogueIndex++; renderLine();
  }
  function openModal(title, eyebrow, kind, html, wide = false) {
    keys.clear(); clearTarget(); if (state) updatePlayer(false);
    if (!modalKind) modalReturnFocus = document.activeElement;
    modalKind = kind; $('modal-title').textContent = title; $('modal-eyebrow').textContent = eyebrow;
    $('modal-card').classList.toggle('wide', wide); $('modal-body').innerHTML = html; $('modal').hidden = false;
    $('modal-close').focus({ preventScroll: true });
  }
  function closeModal(restoreFocus = true) {
    if (!modalKind) return;
    modalKind = null; $('modal').hidden = true; keys.clear();
    if (restoreFocus && modalReturnFocus?.isConnected) modalReturnFocus.focus({ preventScroll: true });
    else if (restoreFocus && screen === 'play') $('world').focus({ preventScroll: true });
  }
  function openPuzzle(id) {
    if (state.solved.includes(id)) return toast('这处机关已经解开了。新的道路已在地图上点亮。');
    if (!C.puzzleAvailable(state, id)) return toast('先取得引灯，才能读懂这处机关。');
    puzzle = { id, values: id === 'station' ? [0, 0, 0, 0] : id === 'archive' ? ['gate', 'bell', 'letter', 'lantern'] : id === 'tower' ? [0, 0, 0] : [], selected: null, hints: 0, status: '' };
    openModal(D.puzzleNames[id], 'A MEMORY LOCK · ' + (C.PUZZLES.indexOf(id) + 1).toString().padStart(2, '0'), 'puzzle', ''); renderPuzzle();
  }
  function renderPuzzle(focusSelector) {
    const p = puzzle, id = p.id;
    let html = '', caption = '';
    if (id === 'station') {
      caption = '转动数字轮，找回我们约好的归期。';
      html = `<div class="digit-lock">${p.values.map((n, i) => `<div class="digit-column"><button data-digit="${i}" data-delta="1" aria-label="第${i + 1}位加一">⌃</button><span class="digit" aria-live="polite">${n}</span><button data-digit="${i}" data-delta="-1" aria-label="第${i + 1}位减一">⌄</button><small>${i < 2 ? '月' : '日'}</small></div>`).join('')}</div>`;
    } else if (id === 'shrine') {
      caption = '按歌谣的先后，依次点亮四盏归舟灯。';
      const labels = { moon: '月', mountain: '山', river: '川', boat: '舟' };
      html = `<div class="lantern-grid">${['boat', 'moon', 'river', 'mountain'].map(key => `<button class="lantern-tile ${p.values.includes(key) ? 'on' : ''}" data-lantern="${key}"><span class="symbol">${labels[key]}</span><small>${p.values.includes(key) ? '第' + (p.values.indexOf(key) + 1) + '盏' : '未点亮'}</small></button>`).join('')}</div><div class="sequence" aria-label="当前点灯顺序">${[0, 1, 2, 3].map(i => `<span>${labels[p.values[i]] || '·'}</span>`).join('')}</div>`;
    } else if (id === 'archive') {
      caption = '点击两张记录交换位置，还原那一夜的时间线。也可以拖动交换。';
      const records = { letter: ['信', '寄出信件', '车站的邮筒'], lantern: ['灯', '借走引灯', '制灯人的铺子'], gate: ['闸', '打开旧闸', '撤离的轨道'], bell: ['钟', '敲响古钟', '最后的约定'] };
      html = `<div class="timeline">${p.values.map((key, i) => `<button class="record ${p.selected === i ? 'selected' : ''}" data-record="${i}" draggable="true" aria-label="位置${i + 1}，${records[key][1]}，点击选中再点击另一项交换"><small>${records[key][2]}</small><span>${records[key][0]}</span><b>${records[key][1]}</b></button>`).join('')}</div><div class="timeline-slots"><span>最先</span><span>其后</span><span>再后</span><span>最后</span></div>`;
    } else {
      caption = '每次转动一个轮，也会带动下一个轮顺时针一刻。下轮连接上轮。';
      html = `<div class="gears">${p.values.map((v, i) => `<button class="gear-button" data-gear="${i}" aria-label="转动${['上', '中', '下'][i]}轮，目前${v === 0 ? 12 : v * 3}点"><span class="gear-clock"><small class="clock-twelve">12</small><i class="gear-hand" style="transform:rotate(${v * 90}deg)"></i></span><span>${['上', '中', '下'][i]}轮 · ${v === 0 ? 12 : v * 3} 点</span><small>同时带动${['中', '下', '上'][i]}轮 ↻</small></button>`).join('')}</div>`;
    }
    const clueKey = { station: 'date', shrine: 'lanternOrder', archive: 'chronology', tower: 'clockMarks' }[id];
    const clueHtml = state.clues.includes(clueKey) ? D.clues[clueKey].text : '线索尚未记下。暂时离开机关，按 Q 查看回忆，调查附近的文字。你的旅程不会因此中断。';
    $('modal-body').innerHTML = `<p class="puzzle-caption">${caption}</p>${html}<p id="puzzle-status" class="puzzle-status" role="status">${p.status || '机关静静地等待着。'}</p><div class="puzzle-clue"><span class="clue-label">手记中的线索</span>${clueHtml}</div>${p.hints ? `<div class="hint-box">${D.hints[id][p.hints - 1]}</div>` : ''}<div class="modal-actions"><div><button id="puzzle-reset" class="subtle-button">重置</button><span style="color:#557173;margin:0 12px">/</span><button id="puzzle-hint" class="subtle-button">${p.hints === 3 ? '已显示完整提示' : '一点提示 ' + (p.hints + 1) + ' / 3'}</button></div><button id="puzzle-check" class="button primary">${id === 'tower' ? '启动钟芯' : '确认'} ⟶</button></div>`;
    $('puzzle-reset').onclick = () => { p.values = id === 'station' ? [0, 0, 0, 0] : id === 'archive' ? ['gate', 'bell', 'letter', 'lantern'] : id === 'tower' ? [0, 0, 0] : []; p.status = '机关已回到最初。'; p.selected = null; renderPuzzle('#puzzle-reset'); };
    $('puzzle-hint').onclick = () => { p.hints = Math.min(3, p.hints + 1); renderPuzzle('#puzzle-hint'); };
    $('puzzle-check').onclick = submitPuzzle;
    $('modal-body').querySelectorAll('[data-digit]').forEach(button => { button.onclick = () => { const i = +button.dataset.digit; p.values[i] = (p.values[i] + +button.dataset.delta + 10) % 10; p.status = ''; S.click(); renderPuzzle(`[data-digit="${i}"][data-delta="${button.dataset.delta}"]`); }; });
    $('modal-body').querySelectorAll('[data-lantern]').forEach(button => { button.onclick = () => { const key = button.dataset.lantern; if (p.values.includes(key)) { p.status = '每盏灯只能点亮一次。可重置后重新选择。'; } else { p.values.push(key); p.status = p.values.length === 4 ? '灯已点齐，请确认顺序。' : '灯火亮了起来。'; S.click(); } renderPuzzle(`[data-lantern="${key}"]`); }; });
    $('modal-body').querySelectorAll('[data-record]').forEach(button => {
      const index = +button.dataset.record;
      button.onclick = () => { if (p.selected === null) p.selected = index; else { [p.values[index], p.values[p.selected]] = [p.values[p.selected], p.values[index]]; p.selected = null; } p.status = p.selected === null ? '记录已交换。' : '再选一张记录，与它交换位置。'; renderPuzzle(`[data-record="${index}"]`); };
      button.ondragstart = e => { e.dataTransfer.setData('text/plain', String(index)); e.dataTransfer.effectAllowed = 'move'; };
      button.ondragover = e => e.preventDefault();
      button.ondrop = e => { e.preventDefault(); const from = Number(e.dataTransfer.getData('text/plain')); if (Number.isInteger(from) && from >= 0 && from < 4) { [p.values[index], p.values[from]] = [p.values[from], p.values[index]]; p.selected = null; renderPuzzle(); } };
    });
    $('modal-body').querySelectorAll('[data-gear]').forEach(button => { button.onclick = () => { p.values = C.turnGear(p.values, +button.dataset.gear); S.click(); renderPuzzle(`[data-gear="${button.dataset.gear}"]`); }; });
    if (focusSelector) $('modal-body').querySelector(focusSelector)?.focus({ preventScroll: true });
  }
  function submitPuzzle() {
    const id = puzzle.id;
    if (!C.solvePuzzle(state, id, puzzle.values)) { puzzle.status = id === 'shrine' && puzzle.values.length < 4 ? '还有灯没有点亮。' : '机关轻轻一响，却没有打开。再看看手记里的线索吧。'; renderPuzzle('#puzzle-check'); return; }
    closeModal(false); S.chime(); changed();
    const rewards = {
      station: [{ text: '四位数字停在 0716。闸门「咔哒」一声打开，街上的灯像在回答你。\n灯见街与月见神社已经可以前往。按 M 打开地图，也可以走向场景出口。' }, { who: 'mio', text: '七月十六日。姐姐，你真的一直在等我。' }],
      shrine: [{ text: '月、山、川、舟。最后一盏灯亮起时，石座里升起了一枚铜色印钥。\n获得「四灯印钥」。旧校书库的门打开了。' }, { who: 'mio', text: '这不是许愿的地方。每一盏灯，都在记住一条回家的路。' }],
      archive: [{ text: '记录依次拼合。柜子的暗格里，留下了最后一页：\n「七月十六日，洪水逼近。栞寄信、借灯、开闸送列车离镇，随后留在钟楼。引灯保住了撤离之人的记忆，也把守钟人困在前夜。」' }, { who: 'mio', text: '姐姐不是消失了。她把我们的归途，换成了自己的七年。\n可她也一定留下过，想要回来的一瞬间。' }, { text: '获得「钟楼钥匙」与「完整祭典记录」。通往钟楼的楼梯已打开。\n书库的回忆中，似乎还有一段未听完的录音。' }],
      tower: [{ text: '九点、三点、六点。三个轮第一次同时咬合。\n时钟开始走动，第十二声钟响越过镇子。通往渡灯桥的浓雾散去了。' }, { who: 'mio', text: '最后一声钟，要由我来决定。\n天亮以前，我还有时间，记住她想让我记住的一切。' }]
    };
    talk(rewards[id], () => { renderHUD(); save(); toast('道路已点亮 · 按 M 查看地图'); });
  }
  function openJournal(tab = 'journey') {
    if (!state) return;
    $('journal-dot').hidden = true;
    const tabs = [['journey', '旅途'], ['clues', '线索'], ['memories', '回忆'], ['bonds', '约定']];
    let body = `<div class="tabs">${tabs.map(([key, title]) => `<button data-tab="${key}" class="${tab === key ? 'active' : ''}">${title}</button>`).join('')}</div>`;
    if (tab === 'journey') {
      const objective = C.objective(state);
      body += `<p class="journal-intro">${objective[1]}</p><ul class="progress-list">${C.PUZZLES.map(id => `<li class="${state.solved.includes(id) ? 'done' : ''}"><span>${state.solved.includes(id) ? '✓' : '◇'}</span>${D.puzzleNames[id]}${state.solved.includes(id) ? ' · 已解开' : ''}</li>`).join('')}</ul><div class="journal-entry"><h3>随身之物</h3><p>姐姐的来信${state.flags.lantern ? ' · 引灯（可随时切换现世与回忆）' : ''}${state.solved.includes('shrine') ? ' · 四灯印钥' : ''}${state.solved.includes('archive') ? ' · 钟楼钥匙 · 完整祭典记录' : ''}</p></div><div class="journal-entry"><h3>一封迟到的信</h3><p>「澪，钟响十三次以前，别忘了回家的路。」<br>信封上的寄信日期，是七年前的七月十六日。</p></div>`;
    } else if (tab === 'clues') {
      body += C.CLUES.map(id => { const clue = D.clues[id], found = state.clues.includes(id); return `<article class="journal-entry ${found ? '' : 'locked'}"><h3>${found ? clue.title : '尚未浮现的文字'}</h3><small>${clue.place}</small><p>${found ? clue.text : '在回忆中，调查这里留下的文字。'}</p></article>`; }).join('');
    } else if (tab === 'memories') {
      body += `<p class="journal-intro">不是只记住她做过什么，也要记住她为什么而活。<br>已找回 ${state.memories.length} / 4 段回忆。</p>`;
      body += C.MEMORIES.map(id => { const m = D.memories[id], found = state.memories.includes(id); return `<article class="journal-entry ${found ? '' : 'locked'}"><h3>${found ? m.title : '一段还未找回的回忆'}</h3><small>${m.place} · 回忆</small><p>${found ? m.text : '按 Q 照见旧日，寻找这里的蓝色光点。'}</p></article>`; }).join('');
    } else {
      body += '<p class="journal-intro">一盏灯，承不起所有人的夜晚。<br>有人愿意和你一起，把名字留到明天。</p>';
      const bonds = [['promisedRen', '莲的约定', '回到车站，回应他希望带给栞的那句话。'], ['helpedNagi', '凪婆婆的纸灯', '在灯见街帮婆婆修好灯，听她把往事说完。'], ['heardShiori', '栞真正的心愿', '在钟楼的回忆中，听完姐姐未说出口的话。']];
      body += bonds.map(([flag, name, text]) => `<article class="journal-entry ${state.flags[flag] ? '' : 'locked'}"><h3>${state.flags[flag] ? '✓ ' : '◇ '}${name}</h3><p>${state.flags[flag] ? '这份牵挂，已经被你接住了。' : text}</p></article>`).join('');
      if (state.solved.includes('tower')) { const missing = C.missingForDawn(state); body += `<div class="puzzle-clue"><span class="clue-label">最后一条路</span>${missing.length ? '你还可以：' + missing.join('；') + '。' : '所有回忆与约定已经齐备。你可以在渡灯桥叫出她的名字。'}</div>`; }
    }
    openModal('澪的手记', 'NOTES FROM THE OTHER SIDE', 'journal', body);
    $('modal-body').querySelectorAll('[data-tab]').forEach(button => { button.onclick = () => { openJournal(button.dataset.tab); $('modal-body').querySelector(`[data-tab="${button.dataset.tab}"]`)?.focus({ preventScroll: true }); }; });
  }
  function openMap() {
    if (!state) return;
    openModal('雾灯町旧地图', 'SIX PLACES · ONE LONG NIGHT', 'map', `<div class="map-grid">${C.ZONES.map(id => {
      const zone = D.zones[id], available = C.canVisit(state, id), active = id === state.zone;
      return `<button class="map-place ${active ? 'active' : ''}" data-zone="${id}" ${!available || active ? 'disabled' : ''}><canvas class="map-art" data-minimap="${id}" aria-hidden="true"></canvas><span class="map-info">${zone.name}<small>${active ? '所在之处' : available ? '前往 ↗' : '雾未散去'}</small></span></button>`;
    }).join('')}</div><p class="map-description">已经打开的道路，可以在地图上直接前往。切换现世与回忆不消耗任何物品。<br>所有场景都可以重访；最后作出选择之前，仍能补全回忆与约定。</p>`, true);
    $('modal-body').querySelectorAll('[data-zone]').forEach(button => { button.onclick = () => changeZone(button.dataset.zone); });
    $('modal-body').querySelectorAll('[data-minimap]').forEach(canvas => R.thumbnail(canvas.dataset.minimap, canvas));
  }
  function openSettings() {
    const hasManual = !!getSave(KEYS.manual);
    const html = `<div class="body-copy"><p>这是一段可以慢慢走完的旅程。所有谜题都提供三层提示，试错不会失去物品。</p></div><div class="setting-row"><div><b>环境音乐</b><small>原创合成钟声与缓慢的钢琴音色。</small></div><button id="setting-sound">${S.enabled ? '已开启' : '已关闭'}</button></div><div class="setting-row"><div><b>对话直接显示</b><small>关闭逐字浮现；任意时刻也可按 E 显示全文。</small></div><button id="setting-text">${settings.instantText ? '已开启' : '已关闭'}</button></div><div class="setting-row"><div><b>漂浮光点</b><small>减少场景中的环境动画。</small></div><button id="setting-particles">${settings.particles ? '已开启' : '已关闭'}</button></div><div class="help-grid"><div><kbd>WASD / ↑↓←→</kbd> 移动</div><div><kbd>E / Enter</kbd> 调查、继续</div><div><kbd>Q</kbd> 现世 / 回忆</div><div><kbd>J</kbd> 澪的手记</div><div><kbd>M</kbd> 旧地图</div><div><kbd>Esc</kbd> 关闭窗口</div></div><div class="body-copy"><p>点击地面可移动，点击人物或光点会自动走近并调查。手机可使用屏幕方向键。回忆中的蓝色光点能找回故事片段。</p><p>进度会自动保存在当前浏览器。请用同一个地址和浏览器继续；清理网站数据会删除存档。</p></div>${state && screen === 'play' ? `<div class="modal-actions"><button class="subtle-button" id="load-manual" ${hasManual ? '' : 'disabled'}>读取手动存档</button><button id="save-manual" class="button primary">手动存档 ⟶</button></div>` : ''}`;
    openModal('旅途设置', 'MAKE YOURSELF AT HOME', 'settings', html);
    $('setting-sound').onclick = async () => { await toggleSound(); if (modalKind === 'settings') $('setting-sound').textContent = S.enabled ? '已开启' : '已关闭'; };
    $('setting-text').onclick = () => { settings.instantText = !settings.instantText; write(KEYS.settings, settings); $('setting-text').textContent = settings.instantText ? '已开启' : '已关闭'; };
    $('setting-particles').onclick = () => { settings.particles = !settings.particles; write(KEYS.settings, settings); $('setting-particles').textContent = settings.particles ? '已开启' : '已关闭'; };
    if ($('save-manual')) $('save-manual').onclick = () => { if (write(KEYS.manual, state)) { toast('手动存档已保存。'); $('load-manual').disabled = false; } };
    if ($('load-manual')) $('load-manual').onclick = () => {
      const manual = getSave(KEYS.manual); if (!manual) return toast('没有可用的手动存档。');
      openModal('回到存档的时刻', 'LOAD MANUAL SAVE', 'load-confirm', `<div class="body-copy"><p>手动存档停留在${D.zones[manual.zone].name}，已找回 ${manual.memories.length} 段回忆。读取后会替换当前的自动存档。</p></div><div class="modal-actions"><button id="cancel-load" class="subtle-button">暂不读取</button><button id="confirm-load" class="button primary">读取存档 ⟶</button></div>`);
      $('cancel-load').onclick = openSettings;
      $('confirm-load').onclick = () => { const ending = manual.ending; startGame(manual); if (ending) showEnding(ending, false); toast('已回到手动存档。'); };
    };
  }
  async function toggleSound() {
    const requested = !S.enabled; await S.setEnabled(requested);
    settings.sound = S.enabled; write(KEYS.settings, settings); syncSound();
    if (requested && !S.enabled) toast('当前浏览器暂时无法开启声音，仍可正常游玩。');
  }
  function syncSound() { $('sound-button').innerHTML = `♫ <span>${S.enabled ? '声音开启' : '声音关闭'}</span>`; $('sound-button').setAttribute('aria-pressed', String(S.enabled)); $('sound-button').setAttribute('aria-label', S.enabled ? '关闭环境音乐' : '开启环境音乐'); }
  function beginFinale() {
    if (!state.solved.includes('tower')) return toast('钟楼还没有重新转动。');
    talk([{ who: 'shiori', text: '第十三声钟响起的时候，这个夜晚就要结束了。\n澪，你想把明天，留成什么样子？' }, { who: 'mio', text: '这次，我可以自己选择。\n（选择前仍可返回探索；每次结局后也可以回到此刻。）' }], openFinalChoices);
  }
  function openFinalChoices() {
    const missing = C.missingForDawn(state);
    const choices = [
      ['departure', '带着信，登上始发列车', '接受仍有未解的事，把自己的生活带向明天。'],
      ['keeper', '接过引灯，留下来守住今夜', '替姐姐留在钟声里，让这座镇的灯继续亮着。'],
      ['nameless', '打碎钟芯，结束被困住的时间', '让明天到来，也接受关于这里的记忆会一同消失。'],
      ['dawn', '叫出她的名字，让所有灯一起渡河', '带着完整的回忆与每个人的约定，陪栞走完最后一程。']
    ];
    openModal('天亮以前的选择', 'THE LAST LANTERN', 'finale', `<div class="body-copy"><p>没有人会替你作出决定。你可以先关上这一页，去看一看还没有看完的旧事。</p></div>${choices.map(([id, title, text]) => `<button class="finale-choice ${id === 'dawn' ? 'dawn' : ''}" data-ending="${id}" ${id === 'dawn' && missing.length ? 'disabled' : ''}><b>${title}</b><p>${text}${id === 'dawn' && missing.length ? '（回忆与约定尚未齐备）' : ''}</p></button>`).join('')}${missing.length ? `<div class="finale-missing">最后一条路还在等你：${missing.join('；')}。<br>按 J 查看手记中的「回忆」与「约定」，所有遗漏都可以补回。</div>` : '<div class="finale-missing">回忆与约定已经齐备。最后一条路，向你敞开了。</div>'}`);
    $('modal-body').querySelectorAll('[data-ending]').forEach(button => { button.onclick = () => showEnding(button.dataset.ending); });
  }
  function showEnding(id, record = true) {
    if (!C.canEnd(state, id)) return;
    if (record) { state.ending = null; write(KEYS.checkpoint, state); }
    C.finish(state, id);
    if (!unlocked.includes(id)) { unlocked.push(id); write(KEYS.collection, unlocked); }
    closeModal(false); stopDialogue(); setScreen('ending');
    const ending = D.endings[id]; $('ending-screen').classList.toggle('dawn', id === 'dawn');
    $('ending-number').textContent = `ENDING ${ending.number} · ${id === 'dawn' ? '真结局' : '旅途的一个终点'}`;
    $('ending-name').textContent = ending.name; $('ending-en').textContent = ending.en; $('ending-lead').textContent = ending.lead;
    $('ending-story').replaceChildren(); ending.paragraphs.forEach(text => { const p = document.createElement('p'); p.textContent = text; $('ending-story').appendChild(p); });
    $('ending-after').textContent = ending.after; S.chime(); save(); window.scrollTo(0, 0); $('ending-rewind').focus({ preventScroll: true });
  }
  function rewind() {
    const checkpoint = getSave(KEYS.checkpoint);
    const old = checkpoint || (state ? C.restore(state) : null);
    if (!old) return goHome();
    old.ending = null; old.zone = 'river'; old.player = { x: 23, y: 11, facing: 2 };
    startGame(old); toast('回到了最后的选择之前。仍可探索所有旧地。');
  }
  function openGallery() {
    openModal('结局之书', 'FOUR WAYS TO REMEMBER', 'gallery', `<p class="journal-intro">每个选择，都是一条不同的归途。<br>已收录 ${unlocked.length} / 4 个结局。</p><div class="gallery-grid">${C.ENDINGS.map(id => { const e = D.endings[id], found = unlocked.includes(id); return `<article class="gallery-item ${found ? '' : 'locked'}"><small>ENDING ${e.number}</small><h3>${found ? e.name : '未写下的结局'}</h3><p>${found ? e.after : id === 'dawn' ? '把每段回忆与每份约定带到桥的彼岸。' : '在终章，作出属于你的选择。'}</p></article>`; }).join('')}</div><p class="map-description">结局收录独立保留。完成任一结局后，可回到选择前补全故事，无需重新通关。</p>`);
  }
  function goHome() {
    if (state) save(); closeModal(false); stopDialogue(); clearTimeout(splashTimer); $('chapter-splash').hidden = true;
    setScreen('title'); refreshTitle(); window.scrollTo(0, 0); $('continue-game').focus({ preventScroll: true });
  }
  // Input is shared by keyboard, mouse and touch. UI controls never leak into movement.
  $('new-game').onclick = newGame;
  $('continue-game').onclick = () => { const stored = getSave(); if (!stored) return; const ending = stored.ending; startGame(stored); if (ending) showEnding(ending, false); };
  $('help-title').onclick = openSettings; $('gallery-title').onclick = openGallery;
  $('home-button').onclick = goHome; $('map-button').onclick = openMap; $('journal-button').onclick = () => openJournal();
  $('memory-button').onclick = () => openJournal('memories'); $('settings-button').onclick = openSettings;
  $('phase-button').onclick = togglePhase; $('sound-button').onclick = toggleSound;
  $('dialogue-next').onclick = nextLine; $('dialogue-skip').onclick = finishTyping;
  $('modal-close').onclick = () => closeModal(); $('modal').onclick = e => { if (e.target === $('modal')) closeModal(); };
  $('ending-rewind').onclick = rewind; $('ending-home').onclick = goHome;
  $('touch-interact').onclick = () => { updateNearest(); interact(nearest); };
  $('world').addEventListener('pointerdown', e => {
    if (e.target.closest('button') || modalKind || !$('dialogue').hidden || transitioning) return;
    const rect = $('world').getBoundingClientRect();
    const goal = R.unproject(e.clientX - rect.left, e.clientY - rect.top);
    const path = M.walkable(state.zone, goal.x, goal.y) ? M.findPath(state.zone, state.player, goal) : M.approach(state.zone, state.player, goal)?.path;
    clearTarget();
    if (path?.length) { route = path; target = path.at(-1); showClickTarget(target); }
    $('world').focus({ preventScroll: true });
  });
  document.querySelectorAll('[data-move]').forEach(button => {
    const code = { up: 'arrowup', down: 'arrowdown', left: 'arrowleft', right: 'arrowright' }[button.dataset.move];
    button.addEventListener('pointerdown', e => { if (modalKind || !$('dialogue').hidden) return; e.preventDefault(); clearTarget(); keys.add(code); button.setPointerCapture(e.pointerId); });
    const release = () => { keys.delete(code); if (state) save(); };
    button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release); button.addEventListener('lostpointercapture', release);
  });
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    const key = e.key.toLowerCase();
    if (key === 'tab' && (modalKind || !$('dialogue').hidden)) {
      const container = modalKind ? $('modal-card') : $('dialogue');
      const items = Array.from(container.querySelectorAll('button:not(:disabled),[tabindex="0"]')).filter(el => !el.hidden && el.getClientRects().length > 0);
      const first = items[0], last = items.at(-1);
      if (items.length && e.shiftKey && (document.activeElement === first || !container.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
      else if (items.length && !e.shiftKey && (document.activeElement === last || !container.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
      return;
    }
    if (modalKind) { if (key === 'escape') { e.preventDefault(); closeModal(); } return; }
    if (!$('dialogue').hidden) {
      if (['e', 'enter', ' '].includes(key)) {
        // Native buttons retain Enter/Space activation for dialogue choices.
        if (document.activeElement?.closest('#dialogue-choices') && !typing && key !== 'e') return;
        e.preventDefault(); if (!e.repeat) nextLine();
      }
      return;
    }
    if (screen !== 'play') return;
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'].includes(key)) {
      if (document.activeElement?.tagName === 'BUTTON') { $('world').focus({ preventScroll: true }); }
      e.preventDefault(); if (!transitioning) { if (!keys.has(key)) clearTarget(); keys.add(key); } return;
    }
    if (e.repeat) return;
    if (key === 'e' || (key === 'enter' && document.activeElement?.tagName !== 'BUTTON')) { e.preventDefault(); updateNearest(); interact(nearest); }
    else if (key === 'q') { e.preventDefault(); togglePhase(); }
    else if (key === 'j') { e.preventDefault(); openJournal(); }
    else if (key === 'm') { e.preventDefault(); openMap(); }
    else if (key === 'escape') openSettings();
  });
  document.addEventListener('keyup', e => { if (keys.delete(e.key.toLowerCase()) && state) save(); });
  window.addEventListener('blur', () => { keys.clear(); clearTarget(); if (state) save(); });
  window.addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', () => { keys.clear(); clearTarget(); lastFrame = performance.now(); if (state) save(); });
  const ctx = $('atmosphere').getContext('2d');
  const motes = Array.from({ length: 22 }, (_, i) => ({ x: ((i * 137.51) % 100) / 100, y: ((i * 53.29) % 100) / 100, speed: .13 + i % 4 * .08, size: i % 3 ? 1 : 2 }));
  let canvasWidth = 1, canvasHeight = 1;
  function resizeCanvas() {
    const rect = $('world').getBoundingClientRect(); if (!rect.width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2); canvasWidth = rect.width; canvasHeight = rect.height;
    $('atmosphere').width = Math.round(rect.width * dpr); $('atmosphere').height = Math.round(rect.height * dpr);
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    R.resize();
  }
  window.addEventListener('resize', resizeCanvas);
  function paintAtmosphere(time) {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    if (!settings.particles || reducedMotion) return;
    const echo = state?.phase === 'echo';
    motes.forEach((m, i) => {
      const x = ((m.x + time * .000004 * m.speed) % 1) * canvasWidth;
      const y = (m.y + Math.sin(time * .00025 + i) * .04) * canvasHeight;
      ctx.fillStyle = echo ? `rgba(190,218,240,${.18 + Math.sin(time * .001 + i) * .12})` : `rgba(243,216,156,${.13 + Math.sin(time * .001 + i) * .1})`;
      ctx.fillRect(x, y, m.size, m.size);
    });
  }
  function loop(now) {
    const dt = Math.min((now - lastFrame) / 1000, .05); lastFrame = now;
    if (screen === 'play' && state && !document.hidden) {
      if (!modalKind && $('dialogue').hidden && !transitioning) {
        let dx = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
        let dy = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0);
        if (!step) {
          let next = null;
          if (dx || dy) {
            if (dx && dy) dy = 0;
            state.player.facing = dx ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0);
            const point = { x: state.player.x + dx, y: state.player.y + dy };
            if (M.walkable(state.zone, point.x, point.y)) next = point;
          } else if (route.length) next = route.shift();
          else if (target) { const object = pendingObject; clearTarget(); if (object) interact(object); save(); }
          if (next) {
            const x = next.x - state.player.x, y = next.y - state.player.y;
            state.player.facing = x ? (x < 0 ? 1 : 2) : (y < 0 ? 3 : 0);
            step = { from: { x: state.player.x, y: state.player.y }, to: next, progress: 0 };
          }
        }
        if (step) {
          step.progress = Math.min(1, step.progress + dt / .13);
          if (step.progress >= 1) {
            state.player.x = step.to.x; state.player.y = step.to.y; step = null; updateNearest();
            const exit = visibleObjects().find(o => o.mark === 'exit' && o.x === state.player.x && o.y === state.player.y);
            if (exit) interact(exit);
          }
        }
      }
      const visual = step ? { x: step.from.x + (step.to.x - step.from.x) * step.progress, y: step.from.y + (step.to.y - step.from.y) * step.progress } : state.player;
      R.draw(state.zone, visual, now, state.phase); updatePlayer(!!step, visual); paintAtmosphere(now);
      state.elapsed += dt; saveTick += dt; if (saveTick >= 12) { saveTick = 0; save(); }
    }
    requestAnimationFrame(loop);
  }
  refreshTitle(); syncSound(); requestAnimationFrame(loop);
})();
