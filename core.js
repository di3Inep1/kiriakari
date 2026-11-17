/* Shared deterministic game rules. Runs in a browser and in the Node test suite. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KiriCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = 2;
  const Maps = typeof module === 'object' && module.exports ? require('./maps.js') : globalThis.KiriMaps;
  const MAP_ZONES = ['station', 'town', 'shrine', 'archive', 'tower', 'river'];
  const ZONES = [...MAP_ZONES,'station-office','town-workshop'];
  const PUZZLES = ['station', 'shrine', 'archive', 'tower'];
  const MEMORIES = ['photo', 'crane', 'tape', 'names'];
  const CLUES = ['date', 'lanternOrder', 'chronology', 'clockMarks','dutyLog','repairRecipe','rescueRoute','festivalNotice'];
  const FLAGS = ['lantern', 'promisedRen', 'helpedNagi', 'heardShiori', 'truth','renMet','lampFound','matchesFound','nagiMet','repairRequested','threadTaken','parcelTaken','parcelDelivered','windTried','shelteredFlame'];
  const ITEMS=['guideLamp','lockerKey','dryMatches','redThread','waterJar','ricePaste','oldParcel','routeCard'];
  const ENDINGS = ['departure', 'keeper', 'nameless', 'dawn'];
  const same = (a, b) => Array.isArray(a) && a.length === b.length && a.every((x, i) => x === b[i]);
  function inPhase(state,phase){return !phase||phase===state.phase&&(phase!=='echo'||!!state.flags?.lantern);}
  function newGame() {
    return { version: VERSION, explorationVersion:1,items:[],layoutVersion:Maps.LAYOUT_VERSION,zone: 'station', phase: 'present', player: { x: Maps.maps.station.spawn[0], y: Maps.maps.station.spawn[1], facing: 0 }, flags: {}, clues: [], memories: [], solved: [], seen: [], elapsed: 0, started: Date.now(), ending: null };
  }
  function canVisit(state, zone) {
    if (zone === 'station'||zone==='station-office') return true;
    if(zone==='town-workshop')return state.solved.includes('station');
    if (zone === 'town' || zone === 'shrine') return state.solved.includes('station');
    if (zone === 'archive') return state.solved.includes('shrine');
    if (zone === 'tower') return state.solved.includes('archive');
    if (zone === 'river') return state.solved.includes('tower');
    return false;
  }
  function addUnique(list, id) { if (!list.includes(id)) { list.push(id); return true; } return false; }
  function addClue(state, id) { return CLUES.includes(id) && addUnique(state.clues, id); }
  function collectMemory(state, id) { return MEMORIES.includes(id) && addUnique(state.memories, id); }
  function hasItem(state,id){return state.items.includes(id);}
  function giveItem(state,id){return ITEMS.includes(id)&&addUnique(state.items,id);}
  function consume(state,id){state.items=state.items.filter(item=>item!==id);}
  function setFlag(state, id) {
    if (FLAGS.includes(id)) state.flags[id] = true;
    if(id==='lantern'){state.flags.lampFound=true;giveItem(state,'guideLamp');}
    if(id==='helpedNagi')state.flags.nagiMet=true;
  }
  // All exploration rewards and consumption are checked here, including repeated visits.
  function explore(state,action){
    const places={'take-lamp':['station-office'],'borrow-key':['station'],'open-toolbox':['station'],'light-lantern':ZONES,'take-parcel':['station-office'],'take-thread':['town'],'draw-water':['town'],'mix-paste':['town-workshop'],'meet-nagi':['town'],'repair-lamp':['town','town-workshop'],'deliver-parcel':['town']};
    if(!places[action]||!places[action].includes(state.zone)||!canVisit(state,state.zone))return 'unavailable';
    if(action==='take-lamp'){if(state.flags.lampFound)return 'already';state.flags.lampFound=true;giveItem(state,'guideLamp');}
    if(action==='borrow-key'){if(!state.flags.lampFound)return 'missing-lamp';if(!giveItem(state,'lockerKey'))return 'already';}
    if(action==='open-toolbox'){if(state.flags.matchesFound||state.flags.lantern)return 'already';if(!hasItem(state,'lockerKey'))return 'missing-key';state.flags.matchesFound=true;giveItem(state,'dryMatches');}
    if(action==='light-lantern'){if(state.flags.lantern)return 'already';if(!state.flags.lampFound)return 'missing-lamp';if(!hasItem(state,'dryMatches'))return 'missing-matches';if(!['station-office','town-workshop','archive'].includes(state.zone)){state.flags.windTried=true;return 'wind';}consume(state,'dryMatches');setFlag(state,'lantern');if(state.flags.windTried)state.flags.shelteredFlame=true;}
    if(action==='take-parcel'){if(state.flags.parcelTaken)return 'already';state.flags.parcelTaken=true;giveItem(state,'oldParcel');}
    if(action==='take-thread'){if(state.flags.threadTaken||state.flags.helpedNagi)return 'already';if(!state.flags.lantern||state.phase!=='echo')return 'wrong-phase';state.flags.threadTaken=true;giveItem(state,'redThread');}
    if(action==='draw-water'){if(hasItem(state,'waterJar')||hasItem(state,'ricePaste')||state.flags.helpedNagi)return 'already';giveItem(state,'waterJar');}
    if(action==='mix-paste'){if(hasItem(state,'ricePaste')||state.flags.helpedNagi)return 'already';if(!hasItem(state,'waterJar'))return 'missing-water';consume(state,'waterJar');giveItem(state,'ricePaste');}
    if(action==='meet-nagi'){if(state.flags.nagiMet)return 'already';state.flags.nagiMet=state.flags.repairRequested=true;}
    if(action==='repair-lamp'){if(state.flags.helpedNagi)return 'already';if(!state.flags.nagiMet)return 'missing-request';if(!hasItem(state,'redThread'))return 'missing-thread';if(!hasItem(state,'ricePaste'))return 'missing-paste';consume(state,'redThread');consume(state,'ricePaste');setFlag(state,'helpedNagi');addClue(state,'lanternOrder');}
    if(action==='deliver-parcel'){if(state.flags.parcelDelivered)return 'already';if(!state.flags.nagiMet||!hasItem(state,'oldParcel'))return 'missing-parcel';consume(state,'oldParcel');state.flags.parcelDelivered=true;giveItem(state,'routeCard');addClue(state,'rescueRoute');}
    return 'done';
  }
  function useItem(state,id){
    if(!ITEMS.includes(id)||!hasItem(state,id))return 'missing-item';
    const facing=id=>Maps.canInvestigate(state.zone,state.player,{support:id});
    if(id==='guideLamp')return state.flags.lantern?'toggle-phase':'unlit';
    if(id==='dryMatches')return explore(state,'light-lantern');
    if(id==='lockerKey')return state.zone==='station'&&facing('maintenance-chest')?explore(state,'open-toolbox'):'wrong-chest';
    if(id==='waterJar')return state.zone==='town-workshop'&&facing('paste-bench')?explore(state,'mix-paste'):'wrong-paste-table';
    if(id==='redThread'||id==='ricePaste')return state.zone==='town-workshop'&&facing('repair-bench')?explore(state,'repair-lamp'):'wrong-workbench';
    if(id==='oldParcel'){const [x,y]=Maps.maps.town.anchors.nagi;return state.zone==='town'&&Maps.canInvestigate('town',state.player,{x,y})?explore(state,'deliver-parcel'):'wrong-recipient';}
    if(id==='routeCard')return 'open-map';
    return 'unavailable';
  }
  function turnGear(values, index) {
    const next = [...values];
    next[index] = (next[index] + 1) % 4;
    next[(index + 1) % 3] = (next[(index + 1) % 3] + 1) % 4;
    return next;
  }
  function checkPuzzle(id, answer) {
    if (id === 'station') return same(answer, [0, 7, 1, 6]);
    if (id === 'shrine') return same(answer, ['moon', 'mountain', 'river', 'boat']);
    if (id === 'archive') return same(answer, ['letter', 'lantern', 'gate', 'bell']);
    if (id === 'tower') return same(answer, [3, 1, 2]);
    return false;
  }
  function puzzleAvailable(state, id) {
    return !!state.flags.lantern && (id === 'station' || (id === 'shrine' && canVisit(state, 'shrine')) || (id === 'archive' && canVisit(state, 'archive')) || (id === 'tower' && canVisit(state, 'tower')));
  }
  function solvePuzzle(state, id, answer) {
    if (!PUZZLES.includes(id) || !puzzleAvailable(state, id) || !checkPuzzle(id, answer)) return false;
    addUnique(state.solved, id);
    if (id === 'archive') state.flags.truth = true;
    return true;
  }
  function missingForDawn(state) {
    const result = [];
    if (!state.solved.includes('tower')) result.push('让钟楼重新转动');
    const memoryNames = { photo: '车站的合照', crane: '街角的纸鹤', tape: '书库的录音', names: '河畔的姓名' };
    MEMORIES.forEach(id => { if (!state.memories.includes(id)) result.push('找回' + memoryNames[id]); });
    if (!state.flags.promisedRen) result.push('回应莲的约定');
    if (!state.flags.helpedNagi) result.push('替凪婆婆修好纸灯');
    if (!state.flags.heardShiori) result.push('在钟楼的回忆里听完栞的话');
    return result;
  }
  function canEnd(state, ending) {
    return state.solved.includes('tower') && ENDINGS.includes(ending) && (ending !== 'dawn' || missingForDawn(state).length === 0);
  }
  function finish(state, ending) { if (!canEnd(state, ending)) return false; state.ending = ending; return true; }
  function objective(state) {
    if (!state.flags.lantern){
      if(!state.flags.lampFound)return ['序章 · 熄灭的引灯',state.zone==='station-office'?'调查房内西侧矮柜，取走引灯；值班簿记着火种的去向。':'进入车站西侧的站房，调查储物柜；莲知道这里的旧事。'];
      if(hasItem(state,'dryMatches'))return ['序章 · 火种',state.flags.windTried?'站台风太大。找个背风的室内，再打开背包使用防潮火柴。':'防潮火柴已经收进背包。试着用它点亮引灯。'];
      if(hasItem(state,'lockerKey'))return ['序章 · 火种','用黄铜钥匙打开站台东端的工具箱，找防潮火柴。'];
      return ['序章 · 熄灭的引灯','引灯已经找到，却没有火种。向站台上的莲打听工具箱钥匙。'];
    }
    if (!state.solved.includes('station')) return ['第一章 · 没有日期的车票', '按 Q 看见回忆，调查时刻表，解开检票闸门。'];
    if (!state.solved.includes('shrine')){
      if(!state.flags.nagiMet)return ['第二章 · 灯火记得归路','去主街找凪婆婆，了解制灯铺与神社的路；也可探索街边庭院。'];
      if(state.flags.repairRequested&&!state.flags.helpedNagi)return ['第二章 · 断线的纸灯',!hasItem(state,'redThread')?'在东侧民居的针线篮寻找红线。现世看不见时，试试引灯。':!hasItem(state,'ricePaste')?(hasItem(state,'waterJar')?'把清水带进西侧制灯铺，在糨糊台调开米糊。':'到主街南边的石井取清水，再去制灯铺调糨糊。'):'带着红线和米糊找婆婆，或在制灯铺修灯。也可先去月见神社。'];
      return ['第二章 · 灯火记得归路','婆婆教会了归舟歌。沿主街往北，到月见神社点亮四方灯阵。'];
    }
    if (!state.solved.includes('archive')) return ['第三章 · 被划去的那一页', '前往旧校书库，重排祭典之夜的四份记录。'];
    if (!state.solved.includes('tower')) return ['第四章 · 第十三次钟声', '登上钟楼，读懂回忆里的刻痕，让时间重新流动。'];
    return ['终章 · 在天亮以前', '前往渡灯桥作出选择。离开前，还可以寻找遗漏的回忆。'];
  }
  function restore(raw) {
    if (!raw || typeof raw !== 'object' || raw.version !== VERSION || !ZONES.includes(raw.zone) || !Array.isArray(raw.solved)) return null;
    const state = newGame();
    const select = (value, allowed) => Array.isArray(value) ? [...new Set(value.filter(x => allowed.includes(x)))] : [];
    state.solved = select(raw.solved, PUZZLES);
    // A damaged save may never skip a prerequisite or strand the player.
    state.solved = PUZZLES.slice(0, PUZZLES.findIndex((id) => !state.solved.includes(id)) === -1 ? 4 : PUZZLES.findIndex((id) => !state.solved.includes(id)));
    FLAGS.forEach(id => { if (raw.flags?.[id] === true) state.flags[id] = true; });
    state.items=select(raw.items,ITEMS);
    if (state.solved.length) state.flags.lantern = true;
    if(state.flags.lantern){state.flags.lampFound=true;giveItem(state,'guideLamp');consume(state,'dryMatches');}
    if(state.flags.helpedNagi){state.flags.nagiMet=true;consume(state,'redThread');consume(state,'ricePaste');}
    if(state.flags.parcelDelivered)consume(state,'oldParcel');
    if(state.flags.lampFound)giveItem(state,'guideLamp');
    if(state.flags.matchesFound&&!state.flags.lantern)giveItem(state,'dryMatches');
    if(state.flags.threadTaken&&!state.flags.helpedNagi)giveItem(state,'redThread');
    if(state.flags.parcelTaken&&!state.flags.parcelDelivered)giveItem(state,'oldParcel');
    state.flags.truth = state.solved.includes('archive');
    state.clues = select(raw.clues, CLUES);
    state.memories = select(raw.memories, MEMORIES);
    state.seen = Array.isArray(raw.seen) ? [...new Set(raw.seen.filter(x => typeof x === 'string' && /^[a-z][a-z0-9-]{0,45}$/i.test(x)))].slice(0, 100) : [];
    state.zone = canVisit(state, raw.zone) ? raw.zone : 'station';
    state.phase = raw.phase === 'echo' && state.flags.lantern ? 'echo' : 'present';
    const spawn=Maps.maps[state.zone].spawn;state.player={x:spawn[0],y:spawn[1],facing:0};
    const sameLayout=raw.layoutVersion===Maps.LAYOUT_VERSION||!['station','town','station-office','town-workshop'].includes(state.zone);
    if (raw.player && state.zone === raw.zone && sameLayout) {
      const clamp = (n, low, high, fallback) => Number.isFinite(n) ? Math.max(low, Math.min(high, n)) : fallback;
      const map = Maps.maps[state.zone];
      const point = Maps.nearestFloor(state.zone, { x: Math.round(clamp(raw.player.x, 0, map.w - 1, map.spawn[0])), y: Math.round(clamp(raw.player.y, 0, map.h - 1, map.spawn[1])) },state.solved);
      state.player = { ...point, facing: clamp(Math.floor(raw.player.facing), 0, 3, 0) };
    }
    state.elapsed = Number.isFinite(raw.elapsed) ? Math.max(0, Math.min(raw.elapsed, 31536000)) : 0;
    state.started = Number.isFinite(raw.started) ? raw.started : Date.now();
    if (canEnd(state, raw.ending)) state.ending = raw.ending;
    return state;
  }
  return { VERSION, ZONES, MAP_ZONES, PUZZLES, MEMORIES, CLUES, ITEMS, ENDINGS, newGame, canVisit, hasItem,giveItem,explore,useItem,inPhase,addClue, collectMemory, setFlag, turnGear, checkPuzzle, puzzleAvailable, solvePuzzle, missingForDawn, canEnd, finish, objective, restore };
});
