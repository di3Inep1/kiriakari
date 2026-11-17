(function () {
  'use strict';
  const C = window.KiriCore, D = window.KiriData, S = window.KiriSound, M = window.KiriMaps, R = window.KiriRenderer, Move = window.KiriMovement;
  const $ = id => document.getElementById(id);
  const KEYS = { auto: 'kiriakari.save.v1', manual: 'kiriakari.manual.v1', checkpoint: 'kiriakari.bridge.v1', collection: 'kiriakari.endings.v1', settings: 'kiriakari.settings.v1' };
  let state = null, screen = 'title', modalKind = null, modalReturnFocus = null, dialogueReturnFocus = null;
  let target = null, pendingObject = null, pendingFacing=0, nearest = null, lastFrame = performance.now(), saveTick = 0, lastWalk = false;
  let route = [], movementSavePending = false, walkSheetReady = false;
  const motion=Move.create(),walkSheet=new Image();
  let lanternPoint={x:0,y:0};
  walkSheet.onload=()=>{walkSheetReady=true;$('player').classList.add('has-walk-sheet');$('player').style.setProperty('--walk-ratio',(walkSheet.naturalWidth/3)/(walkSheet.naturalHeight/4));};
  walkSheet.src='assets/mio-walk-v2.png';
  let dialogueLines = [], dialogueIndex = 0, dialogueEnd = null, typeTimer = null, typing = false, currentText = '';
  let toastTimer = null, splashTimer = null, transitionTimer = null, transitioning = false, puzzle = null, storageWarning = false;
  const keys = new Set();
  const settings = Object.assign({ sound: false, instantText: false, particles: true }, read(KEYS.settings) || {});
  const motionPreference=window.matchMedia('(prefers-reduced-motion: reduce)');
  const touchLayout=window.matchMedia('(max-width: 700px), (pointer: coarse)');
  function controlText(text){
    if(!touchLayout.matches)return text;
    return text.replace(/按 Q[ \t]*/g,'轻触「引灯」').replace(/按 M[ \t]*/g,'轻触顶部「地图」').replace(/按 B[ \t]*/g,'轻触顶部「背包」')
      .replace('使用 WASD 或方向键移动，面向物件后按 E 调查。','使用屏幕方向键移动，面向物件后轻触「调查」。')
      .replace('任意时刻也可按 E 显示全文','也可轻触对话中的「显示全文」');
  }
  function syncPhaseControls(){
    if(!state)return;
    const echo=state.phase==='echo',lit=!!state.flags.lantern;
    for(const id of ['phase-button','touch-phase']){$(id).disabled=!lit;$(id).setAttribute('aria-pressed',String(echo));}
    $('phase-name').textContent=echo?'回忆':'现世';
    $('phase-sub').textContent=lit?(touchLayout.matches?(echo?'轻触返回现世':'轻触照见回忆'):(echo?'旧日之事正在浮现':'在灯火中看见过去')):state.flags.lampFound?'引灯未点亮':'先寻找引灯';
    $('phase-button').title=touchLayout.matches?'轻触切换现世 / 回忆':'切换现世 / 回忆（Q）';
    $('touch-phase-label').textContent=lit?(echo?'返回现世':'照见回忆'):'未点亮';
    $('touch-phase').setAttribute('aria-label',lit?(echo?'收起引灯，返回现世':'使用引灯，照见回忆'):'引灯尚未点亮');
    $('world').setAttribute('aria-label',touchLayout.matches?'游戏场景。使用屏幕方向键移动，轻触调查；点亮后轻触引灯切换回忆，也可以轻触场景。':'游戏场景。使用方向键或 WASD 移动，E 调查，Q 切换回忆，也可以点击场景。');
  }
  touchLayout.addEventListener('change',()=>{syncPhaseControls();if(state&&screen==='play'){renderHUD();updateNearest();}});
  let reducedMotion=motionPreference.matches;
  motionPreference.addEventListener('change',event=>{reducedMotion=event.matches;});
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
    const el = document.createElement('div'); el.className = 'toast'; el.textContent = controlText(message);
    $('toast-region').appendChild(el);
    toastTimer = setTimeout(() => $('toast-region').replaceChildren(), 3900);
  }
  function setScreen(next) {
    clearTimeout(toastTimer); $('toast-region').replaceChildren();
    screen = next; keys.clear(); target = null; pendingObject = null; nearest = null; route = []; Move.reset(motion);movementSavePending=false;
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
        { text: '使用 WASD 或方向键移动，面向物件后按 E 调查。也可以直接点击人物或物件，澪会走过去。\n可以先向莲问路，也可以先走进西侧站房，寻找姐姐留下的引灯。' }
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
    syncPhaseControls();
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
      const collected=state.memories.includes(obj.action)||KiriExploration.isComplete(state,obj);
      el.classList.toggle('collected', collected);
      el.classList.toggle('read', state.clues.includes(obj.action));
      const marker = solved ? '✓' : (obj.character !== undefined ? '···' : obj.mark === 'memory' ? '✧' : obj.mark === 'exit' ? '↗' : obj.mark === 'puzzle' ? '◇' : '·');
      el.innerHTML = `${obj.character !== undefined ? `<div class="actor"><div class="actor-shadow"></div><div class="sprite" style="background-position:${obj.character * 100 / 3}% 0%"></div></div>` : ''}<span class="object-marker"${collected?' hidden':''}><span>${marker}</span></span><span class="object-label">${obj.name}</span>${obj.label ? `<span class="object-detail">${obj.label}</span>` : ''}`;
      el.addEventListener('click', e => { e.stopPropagation(); approach(obj); }); container.appendChild(el);
    });
    nearest = null; updatePlayer(false); updateNearest();
  }
  function visibleObjects() { return D.zones[state.zone].objects.filter(obj => C.inPhase(state,obj.phase)).map(obj=>({...obj,name:KiriExploration.objectName(state,obj)})); }
  function updatePlayer(walking, visual = state?Move.visual(motion,state.player):null) {
    if (!state) return;
    const player = $('player'), point = R.project(visual); player.style.left = point.x + 'px'; player.style.top = point.y + 'px';
    player.dataset.tileX = state.player.x; player.dataset.tileY = state.player.y;
    $('world').dataset.zone = state.zone;
    player.style.zIndex = String(R.depth(visual.y));
    const lamp=KiriLighting.pose(state.player.facing,walking,performance.now(),reducedMotion),lampNode=player.querySelector('.player-lantern'),size=R.view.tile;
    lampNode.style.left=`calc(50% + ${lamp.x*size}px)`;lampNode.style.top=`calc(100% + ${lamp.y*size}px)`;
    lampNode.style.setProperty('--lamp-angle',lamp.angle+'deg');lampNode.dataset.behind=String(lamp.behind);
    lanternPoint={x:point.x+lamp.x*size,y:point.y+lamp.y*size};
    const frame=walking?motion.frame:1;
    player.querySelector('.sprite').style.backgroundPosition = `${walkSheetReady?frame*50:0}% ${state.player.facing * 100 / 3}%`;
    player.dataset.walkFrame=String(frame);player.dataset.facing=String(state.player.facing);
    player.dataset.visualX=visual.x.toFixed(6);player.dataset.visualY=visual.y.toFixed(6);
    if (walking !== lastWalk) player.classList.toggle('walking', walking);
    lastWalk = walking;
    visibleObjects().forEach(obj => {
      const el = $(`object-${obj.id}`), position = R.project(M.focusPoint(state.zone,obj));
      if (el) {
        const prop=obj.support&&M.maps[state.zone].props.find(p=>p.id===obj.support),pose=prop&&M.attachmentPose(state.zone,prop);
        el.style.left=position.x+'px';el.style.top=position.y+'px';el.style.zIndex=String(prop&&(prop.grid||prop.surfaceOn)?R.depth(M.propGroundY(state.zone,prop),3):pose?R.depth(pose.building.frontY-.92,3):R.depth(obj.y,obj.character!==undefined?0:3));
      }
    });
    if (target) showClickTarget(target);
  }
  function renderHUD() {
    const objective = C.objective(state); $('chapter-label').textContent = objective[0]; $('objective-text').textContent = controlText(objective[1]);
    $('memory-count').textContent = state.memories.length;
    $('memory-dots').innerHTML = C.MEMORIES.map(id => `<i class="${state.memories.includes(id) ? 'filled' : ''}"></i>`).join('');
    document.querySelector('.clock-label').innerHTML = state.solved.includes('tower') ? '<i></i> 00:00 <small>等待最后一声钟响</small>' : '<i></i> 23:59 <small>时间停止流动</small>';
  }
  function updateNearest() {
    if (!state) return;
    const objects = visibleObjects();
    nearest = motion.step?null:objects.find(obj=>M.canInvestigate(state.zone,state.player,obj))||null;
    const front=M.frontCell(state.player);$('world').dataset.frontCell=front.x+','+front.y;
    objects.forEach(obj => $(`object-${obj.id}`)?.classList.toggle('near', obj === nearest));
    const key=touchLayout.matches?'调查':'E';
    $('nearby-hint').innerHTML = nearest ? `<kbd>${key}</kbd> ${nearest.character !== undefined ? '交谈 · ' : ''}${nearest.name}` : `<kbd>${key}</kbd> 靠近光点调查`;
  }
  function approach(obj) {
    if (screen !== 'play' || modalKind || !$('dialogue').hidden || transitioning) return;
    const plan = M.approach(state.zone, motion.step?.to||state.player, obj,state.solved);
    if (!plan) return toast('这边被挡住了。试着从另一侧靠近。');
    if(!motion.step&&!plan.path.length){state.player.facing=plan.facing;updatePlayer(false);updateNearest();return interact(obj);}
    clearTarget(false); route = plan.path; target = plan.point; pendingObject = obj;pendingFacing=plan.facing;showClickTarget(target);
    $('world').focus({ preventScroll: true });
  }
  function showClickTarget(point) { const p = R.project(point); $('click-target').hidden = false; $('click-target').style.left = p.x + 'px'; $('click-target').style.top = p.y + 'px'; }
  function clearTarget(stopStep=true) { target = null; pendingObject = null; route = []; if(stopStep)Move.reset(motion); $('click-target').hidden = true; }
  function changeZone(id) {
    if (!C.canVisit(state, id)) {
      const reasons = { town: '检票闸门还没有打开。先调查车站的机关。', shrine: '先打开车站的检票闸门。', archive: '书库的门印着四盏灯。先解开月见神社的灯阵。', tower: '通向钟楼的楼梯被封住了。记录柜里也许有钥匙。', river: '通向渡灯桥的雾太浓。让钟楼重新转动，雾才会散去。' };
      return toast(reasons[id] || '这条路暂时无法通行。');
    }
    keys.clear(); clearTarget(); closeModal(false); transitioning = true;
    $('transition').classList.add('active'); clearTimeout(transitionTimer);
    const previousZone=state.zone;
    transitionTimer = setTimeout(() => {
      state.zone = id; const zone = D.zones[id],arrival=D.zones[previousZone].parent===id?D.zones[previousZone].returnAt:zone.spawn; state.player = { x: arrival[0], y: arrival[1], facing: 0 };
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
    if (!state.flags.lantern) return toast(state.flags.lampFound?'引灯还未点亮。寻找火种，或者向莲求助。':'先进入站房，在西侧矮柜找到引灯。');
    clearTarget(false); state.phase = state.phase === 'echo' ? 'present' : 'echo';
    S.phase(state.phase === 'echo'); renderWorld();pulseWorld('phase-shift');save();
    if (!state.seen.includes('echo-tutorial')) {
      state.seen.push('echo-tutorial');
      toast('回忆中会出现褪去的文字与旧日的物件。细小光点能找回一段回忆。');
    }
  }
  function interact(obj,automaticExit=false) {
    if (!obj || screen !== 'play' || modalKind || !$('dialogue').hidden || transitioning) return;
    if(motion.step||(!automaticExit&&!M.canInvestigate(state.zone,state.player,obj)))return;
    if(!visibleObjects().some(o=>o.id===obj.id))return;
    keys.clear(); clearTarget(); S.click();
    const action = obj.action;
    if (action.startsWith('go-')) return changeZone(action.slice(3));
    if (action.startsWith('puzzle-')) return openPuzzle(action.slice(7));
    if (KiriExploration.run(action,state,{talk,changed}))return;
    if (D.clues[action]) return inspectClue(action);
    if (D.memories[action]) return inspectMemory(action);
    if (action === 'shrine-shiori') return talk([{ who: 'shiori', text: '月是抬头时看见的，山是远处等你的。走过川，才有舟。\n澪，你小时候总把最后一句唱反。' }, { who: 'mio', text: '姐姐？等一下——你为什么和那年一模一样？' }, { text: '灯影晃动，她的回答散在了风里。也许钟楼里还留着更完整的回声。' }]);
    if (action === 'tower-shiori') return talkShiori();
    if (action === 'finale') return beginFinale();
  }
  function pulseWorld(effect){const world=$('world');world.classList.remove(effect);void world.offsetWidth;world.classList.add(effect);setTimeout(()=>world.classList.remove(effect),950);}
  function changed(message) { renderHUD(); renderWorld(); save(); if (message) {toast(message);if(/获得|接下|取走|已使用/.test(message))pulseWorld('item-received');} $('journal-dot').hidden = false; }
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
      C.collectMemory(state, id); if (fresh) S.chime(); changed(fresh ? `找回回忆 · ${memory.title}（${state.memories.length} / 4）` : null);if(fresh&&id==='photo')showCG('sisters');
    });
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
    currentText = controlText(line.text || '你想怎么回答？');
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
    $('modal-card').classList.toggle('cg-card',kind==='cg');
    $('modal-card').classList.toggle('wide', wide); $('modal-body').innerHTML = controlText(html); $('modal').hidden = false;
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
    const clueHtml = state.clues.includes(clueKey) ? D.clues[clueKey].text : controlText('线索尚未记下。暂时离开机关，按 Q 查看回忆，调查附近的文字。你的旅程不会因此中断。');
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
  const CG={
    ignition:{title:'第一簇火',image:'assets/cg-first-flame.png',caption:'这一次，是你亲手护住了灯火。'},
    sisters:{title:'长椅上的约定',image:'assets/cg-sisters-platform.png',caption:'如果迷了路，就在原地等我。'}
  };
  const BAG={
    guideLamp:{icon:0,name:'引灯',description:'姐姐留下的木框纸灯。点亮后能照见旧日，切换时空不会消耗燃料。',verb:'举起 / 收起'},
    lockerKey:{icon:1,name:'维修箱黄铜钥匙',description:'面向站台东端的维修箱，再试用这把钥匙。',verb:'试用钥匙'},
    dryMatches:{icon:2,name:'防潮火柴',description:'油纸里还有几根干燥的火柴。可用来点燃引灯。',verb:'点燃引灯'},
    redThread:{icon:3,name:'旧日的红线',description:'面向制灯铺的修灯台，与米糊一起使用，绑稳破损的灯骨。',verb:'用于修灯'},
    waterJar:{icon:4,name:'一罐清水',description:'面向制灯铺的糨糊台使用，少量调开干米糊。',verb:'调开米糊'},
    ricePaste:{icon:5,name:'调好的米糊',description:'面向制灯铺的修灯台使用，薄薄刷在旧纸边缘。还需要红线。',verb:'用于修灯'},
    oldParcel:{icon:6,name:'寄给制灯铺的旧包裹',description:'寄件人是姐姐。面向灯见街的凪婆婆时，可以亲手交给她。',verb:'交付包裹'},
    routeCard:{icon:7,name:'送灯路线图',description:'婆婆标记过的小镇路线。打开后可以查看已探索的旧地。',verb:'查看路线'}
  };
  function itemIcon(id){const icon=BAG[id].icon;return `<span class="item-icon" style="background-position:${icon%4*100/3}% ${Math.floor(icon/4)*50}%" aria-hidden="true"></span>`;}
  function openBag(selected){
    if(!state)return;
    if(typeof selected!=='string'||!state.items.includes(selected))selected=state.items[0];
    const meta=BAG[selected];
    let body=`<p class="bag-intro">随身道具 · ${state.items.length} 件<span>先选择物品，再尝试使用。</span></p><div class="bag-layout"><div class="bag-grid" role="group" aria-label="随身物品">${state.items.map(id=>`<button class="bag-slot ${id===selected?'selected':''}" data-item="${id}" aria-pressed="${id===selected}">${itemIcon(id)}<span>${BAG[id].name}</span></button>`).join('')||'<p class="bag-empty">背包里只有姐姐的来信。沿途找到的道具会收在这里。</p>'}</div><section class="bag-detail">${meta?`${itemIcon(selected)}<h3>${meta.name}${selected==='guideLamp'?state.flags.lantern?' · 已点亮':' · 熄灭':''}</h3><p>${meta.description}</p><button id="bag-use" class="button primary" data-use-item="${selected}">${selected==='guideLamp'&&!state.flags.lantern?'检查灯芯':meta.verb}</button>`:'<h3>一封迟到的信</h3><p>「澪，钟响十三次以前，别忘了回家的路。」</p>'}</section></div>`;
    body+=`<div class="bag-achievement ${state.flags.shelteredFlame?'unlocked':''}">${state.flags.shelteredFlame?'✧ 学会护火 · 在风中失败后，独自于室内点亮引灯。':'◇ 一段小小的发现，尚未记下。'}</div>`;
    openModal('澪的背包','THINGS CARRIED THROUGH THE FOG','bag',body,true);
    $('modal-body').querySelectorAll('[data-item]').forEach(button=>button.onclick=()=>{openBag(button.dataset.item);$('modal-body').querySelector('[data-item="'+button.dataset.item+'"]').focus({preventScroll:true});});
    if($('bag-use'))$('bag-use').onclick=()=>useBagItem(selected);
  }
  function useBagItem(id){
    const result=C.useItem(state,id);closeModal(false);
    if(result==='toggle-phase')return togglePhase();
    if(result==='open-map')return openMap();
    if(result==='wind'){
      changed();pulseWorld('wind-gust');
      return talk([{text:'火柴刚亮，站台上的风便把火苗吹歪。你赶紧收好油纸包，剩下的火柴仍然干燥。'},{who:'mio',text:'不是火柴的问题……得找个背风的地方。木屋里的整灯台，应该没有这样的穿堂风。'}]);
    }
    if(result==='done'){
      changed();
      if(id==='dryMatches')return talk([{text:'你靠近桌边，擦亮火柴。没有风来争抢，灯芯终于接住了那一小簇火。'},{who:'mio',text:'亮起来了……是我自己点亮的。\n（按 Q 切换回忆，试着调查时刻表。）'}],()=>{pulseWorld('item-received');if(state.flags.shelteredFlame)toast('隐藏成就 · 学会护火');showCG('ignition');});
      const messages={lockerKey:'黄铜钥匙转动锁芯。防潮火柴收进了背包。',waterJar:'清水将干米糊慢慢调开。你把调好的米糊收好。',redThread:'你绑稳灯骨，薄薄补好纸面。婆婆教的归舟歌已记进手记。',ricePaste:'你绑稳灯骨，薄薄补好纸面。婆婆教的归舟歌已记进手记。',oldParcel:'婆婆接过迟到的包裹，把标好的送灯路线图放进你的背包。'};
      return talk([{text:messages[id]||'道具已经使用。'}],()=>changed('道具已使用 · 背包已更新'));
    }
    const hints={unlit:'灯芯是干的。需要在背包中选择能引燃它的道具。','wrong-chest':'这把钥匙不是开门用的。面向站台东端的维修箱，再试试看。','wrong-paste-table':'清水需要倒进米糊碗里。面向制灯铺的糨糊台再使用。','wrong-workbench':'先把旧灯放稳。面向制灯铺的修灯台，再使用材料。','wrong-recipient':'包裹的收件人是凪婆婆。面向她时，再亲手交出去。','missing-request':'先问问凪婆婆这盏灯的来历和修补方法。','missing-thread':'灯骨还没有绑稳。需要在回忆里找到红线。','missing-paste':'旧纸不能直接用水粘。还需要调好的米糊。','already':'这件事已经完成，不必重复消耗道具。','missing-item':'这件道具已经不在背包里了。'};
    talk([{text:hints[result]||'现在还不能这样使用。试着换个位置，或调查附近的物件。'}]);
  }
  function showCG(id,replay=false){
    const cg=CG[id];if(!cg||(!replay&&state.seen.includes('cg-'+id)))return;
    if(!state.seen.includes('cg-'+id))state.seen.push('cg-'+id);save();
    openModal(cg.title,'A LIGHT KEPT IN MEMORY','cg',`<figure class="cg-scene"><img src="${cg.image}" alt="${cg.title}"><figcaption>${cg.caption}</figcaption></figure><div class="modal-actions"><button id="cg-continue" class="button primary">返回探索 ⟶</button></div>`,true);
    $('cg-continue').onclick=()=>closeModal();$('cg-continue').focus({preventScroll:true});
  }
  function openJournal(tab = 'journey') {
    if (!state) return;
    $('journal-dot').hidden = true;
    const tabs = [['journey', '旅途'], ['clues', '线索'], ['memories', '回忆'], ['bonds', '约定']];
    let body = `<div class="tabs">${tabs.map(([key, title]) => `<button data-tab="${key}" class="${tab === key ? 'active' : ''}">${title}</button>`).join('')}</div>`;
    if (tab === 'journey') {
      const objective = C.objective(state);
      body+=KiriExploration.tasks(state).map(([name,text])=>`<div class="journal-entry"><h3>${name}</h3><p>${text}</p></div>`).join('');
      body += `<p class="journal-intro">${objective[1]}</p><ul class="progress-list">${C.PUZZLES.map(id => `<li class="${state.solved.includes(id) ? 'done' : ''}"><span>${state.solved.includes(id) ? '✓' : '◇'}</span>${D.puzzleNames[id]}${state.solved.includes(id) ? ' · 已解开' : ''}</li>`).join('')}</ul><div class="journal-entry"><h3>随身之物</h3><p>姐姐的来信${KiriExploration.inventory(state).length?' · '+KiriExploration.inventory(state).join(' · '):''}${state.solved.includes('shrine') ? ' · 四灯印钥' : ''}${state.solved.includes('archive') ? ' · 钟楼钥匙 · 完整祭典记录' : ''}</p></div><div class="journal-entry"><h3>一封迟到的信</h3><p>「澪，钟响十三次以前，别忘了回家的路。」<br>信封上的寄信日期，是七年前的七月十六日。</p></div>`;
    } else if (tab === 'clues') {
      body += C.CLUES.map(id => { const clue = D.clues[id], found = state.clues.includes(id); return `<article class="journal-entry ${found ? '' : 'locked'}"><h3>${found ? clue.title : '尚未浮现的文字'}</h3><small>${clue.place}</small><p>${found ? clue.text : '在回忆中，调查这里留下的文字。'}</p></article>`; }).join('');
    } else if (tab === 'memories') {
      body += `<p class="journal-intro">不是只记住她做过什么，也要记住她为什么而活。<br>已找回 ${state.memories.length} / 4 段回忆。</p>`;
      body += C.MEMORIES.map(id => { const m = D.memories[id], found = state.memories.includes(id); return `<article class="journal-entry ${found ? '' : 'locked'}"><h3>${found ? m.title : '一段还未找回的回忆'}</h3><small>${m.place} · 回忆</small><p>${found ? m.text : '按 Q 照见旧日，寻找这里的细小光点。'}</p></article>`; }).join('');
    } else {
      body += '<p class="journal-intro">一盏灯，承不起所有人的夜晚。<br>有人愿意和你一起，把名字留到明天。</p>';
      const bonds = [['promisedRen', '莲的约定', '回到车站，回应他希望带给栞的那句话。'], ['helpedNagi', '凪婆婆的纸灯', '在灯见街帮婆婆修好灯，听她把往事说完。'], ['heardShiori', '栞真正的心愿', '在钟楼的回忆中，听完姐姐未说出口的话。']];
      body += bonds.map(([flag, name, text]) => `<article class="journal-entry ${state.flags[flag] ? '' : 'locked'}"><h3>${state.flags[flag] ? '✓ ' : '◇ '}${name}</h3><p>${state.flags[flag] ? '这份牵挂，已经被你接住了。' : text}</p></article>`).join('');
      if (state.solved.includes('tower')) { const missing = C.missingForDawn(state); body += `<div class="puzzle-clue"><span class="clue-label">最后一条路</span>${missing.length ? '你还可以：' + missing.join('；') + '。' : '所有回忆与约定已经齐备。你可以在渡灯桥叫出她的名字。'}</div>`; }
    }
    if(tab==='journey')body+='<button id="journal-bag" class="button quiet">打开背包，查看与使用道具</button>';
    if(tab==='memories')body+=`<div class="cg-gallery">${Object.entries(CG).filter(([id])=>state.seen.includes('cg-'+id)||(id==='ignition'?state.flags.lantern:state.memories.includes('photo'))).map(([id,cg])=>`<button data-cg="${id}"><img src="${cg.image}" alt=""><span>${cg.title} · 回看</span></button>`).join('')}</div>`;
    openModal('澪的手记', 'NOTES FROM THE OTHER SIDE', 'journal', body);
    if($('journal-bag'))$('journal-bag').onclick=openBag;
    $('modal-body').querySelectorAll('[data-cg]').forEach(button=>button.onclick=()=>showCG(button.dataset.cg,true));
    $('modal-body').querySelectorAll('[data-tab]').forEach(button => { button.onclick = () => { openJournal(button.dataset.tab); $('modal-body').querySelector(`[data-tab="${button.dataset.tab}"]`)?.focus({ preventScroll: true }); }; });
  }
  function openMap() {
    if (!state) return;
    openModal('雾灯町旧地图', 'SIX PLACES · ONE LONG NIGHT', 'map', `<div class="map-grid">${C.MAP_ZONES.map(id => {
      const zone = D.zones[id], available = C.canVisit(state, id), active = id === state.zone;
      return `<button class="map-place ${active ? 'active' : ''}" data-zone="${id}" ${!available || active ? 'disabled' : ''}><canvas class="map-art" data-minimap="${id}" aria-hidden="true"></canvas><span class="map-info">${zone.name}<small>${active ? '所在之处' : available ? '前往 ↗' : '雾未散去'}</small></span></button>`;
    }).join('')}</div><p class="map-description">已经打开的道路，可以在地图上直接前往。切换现世与回忆不消耗任何物品。<br>所有场景都可以重访；最后作出选择之前，仍能补全回忆与约定。</p>`, true);
    $('modal-body').querySelectorAll('[data-zone]').forEach(button => { button.onclick = () => changeZone(button.dataset.zone); });
    $('modal-body').querySelectorAll('[data-minimap]').forEach(canvas => R.thumbnail(canvas.dataset.minimap, canvas,state.solved,state));
  }
  function openSettings() {
    const hasManual = !!getSave(KEYS.manual);
    const html = `<div class="body-copy"><p>这是一段可以慢慢走完的旅程。所有谜题都提供三层提示，试错不会失去物品。</p></div><div class="setting-row"><div><b>环境音乐</b><small>原创合成钟声与缓慢的钢琴音色。</small></div><button id="setting-sound">${S.enabled ? '已开启' : '已关闭'}</button></div><div class="setting-row"><div><b>对话直接显示</b><small>关闭逐字浮现；任意时刻也可按 E 显示全文。</small></div><button id="setting-text">${settings.instantText ? '已开启' : '已关闭'}</button></div><div class="setting-row"><div><b>漂浮光点</b><small>减少场景中的环境动画。</small></div><button id="setting-particles">${settings.particles ? '已开启' : '已关闭'}</button></div>${touchLayout.matches ? '<div class="help-grid"><div><kbd>方向按钮</kbd> 移动</div><div><kbd>调查</kbd> 靠近后交互</div><div><kbd>引灯</kbd> 现世 / 回忆</div><div><kbd>背包</kbd> 使用道具</div><div><kbd>手记</kbd> 查看线索</div><div><kbd>地图</kbd> 前往旧地</div><div><kbd>×</kbd> 关闭窗口</div></div>' : '<div class="help-grid"><div><kbd>WASD / ↑↓←→</kbd> 移动</div><div><kbd>E / Enter</kbd> 调查、继续</div><div><kbd>Q</kbd> 现世 / 回忆</div><div><kbd>B</kbd> 背包道具</div><div><kbd>J</kbd> 澪的手记</div><div><kbd>M</kbd> 旧地图</div><div><kbd>Esc</kbd> 关闭窗口</div></div>'}<div class="body-copy"><p>点击地面可移动，点击人物或光点会自动走近并调查。手机可使用屏幕方向键。回忆中闪动的细小光点能找回故事片段。</p><p>进度会自动保存在当前浏览器。请用同一个地址和浏览器继续；清理网站数据会删除存档。</p></div>${state && screen === 'play' ? `<div class="modal-actions"><button class="subtle-button" id="load-manual" ${hasManual ? '' : 'disabled'}>读取手动存档</button><button id="save-manual" class="button primary">手动存档 ⟶</button></div>` : ''}`;
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
  $('touch-phase').onclick = togglePhase;
  $('bag-button').onclick=openBag;
  $('world').addEventListener('pointerdown', e => {
    if (e.target.closest('button') || modalKind || !$('dialogue').hidden || transitioning) return;
    const rect = $('world').getBoundingClientRect();
    const goal = R.unproject(e.clientX - rect.left, e.clientY - rect.top);
    const from=motion.step?.to||state.player;
    const path = M.walkable(state.zone, goal.x, goal.y,state.solved) ? M.findPath(state.zone, from, goal,state.solved) : M.approach(state.zone, from, goal,state.solved)?.path;
    clearTarget(false);
    if (path?.length) { route = path; target = path.at(-1); showClickTarget(target); }
    $('world').focus({ preventScroll: true });
  });
  document.querySelectorAll('[data-move]').forEach(button => {
    const code = { up: 'arrowup', down: 'arrowdown', left: 'arrowleft', right: 'arrowright' }[button.dataset.move];
    button.addEventListener('pointerdown', e => { if (modalKind || !$('dialogue').hidden) return; e.preventDefault(); clearTarget(false); keys.add(code); button.setPointerCapture(e.pointerId); });
    const release = () => { if(keys.delete(code))movementSavePending=true; };
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
      e.preventDefault(); if (!transitioning) { if (!keys.has(key)) clearTarget(false); keys.add(key); } return;
    }
    if (e.repeat) return;
    if (key === 'e' || (key === 'enter' && document.activeElement?.tagName !== 'BUTTON')) { e.preventDefault(); updateNearest(); interact(nearest); }
    else if (key === 'q') { e.preventDefault(); togglePhase(); }
    else if (key === 'j') { e.preventDefault(); openJournal(); }
    else if (key === 'b') { e.preventDefault(); openBag(); }
    else if (key === 'm') { e.preventDefault(); openMap(); }
    else if (key === 'escape') openSettings();
  });
  document.addEventListener('keyup', e => { if (keys.delete(e.key.toLowerCase()) && state) movementSavePending=true; });
  window.addEventListener('blur', () => { keys.clear(); clearTarget(); if (state) save(); });
  window.addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', () => { keys.clear(); clearTarget(); lastFrame = performance.now(); if (state) save(); });
  const ctx = $('atmosphere').getContext('2d');
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
    KiriLighting.paint(ctx,{width:canvasWidth,height:canvasHeight,tile:R.view.tile,view:R.view,point:R.project(Move.visual(motion,state.player)),lantern:lanternPoint,phase:state.phase,time,lit:!!state.flags.lantern,particles:settings.particles,reduced:reducedMotion});
  }
  function loop(now) {
    const dt = Math.min((now - lastFrame) / 1000, .05); lastFrame = now;
    if (screen === 'play' && state && !document.hidden) {
      if (!modalKind && $('dialogue').hidden && !transitioning) {
        Move.advance(motion,state.player,dt,()=>{
          if(modalKind||!$('dialogue').hidden||transitioning)return null;
          const direction=Move.direction(keys);
          if(direction){state.player.facing=direction.facing;const next={x:state.player.x+direction.dx,y:state.player.y+direction.dy};return M.walkable(state.zone,next.x,next.y,state.solved)?next:null;}
          if(route.length)return route.shift();
          if(target){const object=pendingObject,facing=pendingFacing;clearTarget();if(object){state.player.facing=facing;updatePlayer(false);interact(object);}save();}
          return null;
        },()=>{
          updateNearest();const exit=visibleObjects().find(o=>o.mark==='exit'&&o.x===state.player.x&&o.y===state.player.y);
          if(exit){interact(exit,true);return false;}return true;
        });
      }
      const visual=Move.visual(motion,state.player),walking=motion.walking&&!modalKind&&$('dialogue').hidden&&!transitioning;
      R.draw(state.zone, visual, now, state.phase,state.solved,state); updatePlayer(walking, visual);updateNearest();paintAtmosphere(now);
      if(movementSavePending&&!motion.walking){movementSavePending=false;save();}
      state.elapsed += dt; saveTick += dt; if (saveTick >= 12) { saveTick = 0; save(); }
    }
    requestAnimationFrame(loop);
  }
  refreshTitle(); syncSound(); requestAnimationFrame(loop);
})();
