/* Shared deterministic game rules. Runs in a browser and in the Node test suite. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KiriCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = 2;
  const Maps = typeof module === 'object' && module.exports ? require('./maps.js') : globalThis.KiriMaps;
  const ZONES = ['station', 'town', 'shrine', 'archive', 'tower', 'river'];
  const PUZZLES = ['station', 'shrine', 'archive', 'tower'];
  const MEMORIES = ['photo', 'crane', 'tape', 'names'];
  const CLUES = ['date', 'lanternOrder', 'chronology', 'clockMarks'];
  const FLAGS = ['lantern', 'promisedRen', 'helpedNagi', 'heardShiori', 'truth'];
  const ENDINGS = ['departure', 'keeper', 'nameless', 'dawn'];
  const same = (a, b) => Array.isArray(a) && a.length === b.length && a.every((x, i) => x === b[i]);
  function newGame() {
    return { version: VERSION, layoutVersion:Maps.LAYOUT_VERSION,zone: 'station', phase: 'present', player: { x: Maps.maps.station.spawn[0], y: Maps.maps.station.spawn[1], facing: 0 }, flags: {}, clues: [], memories: [], solved: [], seen: [], elapsed: 0, started: Date.now(), ending: null };
  }
  function canVisit(state, zone) {
    if (zone === 'station') return true;
    if (zone === 'town' || zone === 'shrine') return state.solved.includes('station');
    if (zone === 'archive') return state.solved.includes('shrine');
    if (zone === 'tower') return state.solved.includes('archive');
    if (zone === 'river') return state.solved.includes('tower');
    return false;
  }
  function addUnique(list, id) { if (!list.includes(id)) { list.push(id); return true; } return false; }
  function addClue(state, id) { return CLUES.includes(id) && addUnique(state.clues, id); }
  function collectMemory(state, id) { return MEMORIES.includes(id) && addUnique(state.memories, id); }
  function setFlag(state, id) { if (FLAGS.includes(id)) state.flags[id] = true; }
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
    if (!state.flags.lantern) return ['序章 · 一封迟来的信', '和站台上的青年交谈，寻找姐姐留下的线索。'];
    if (!state.solved.includes('station')) return ['第一章 · 没有日期的车票', '按 Q 看见回忆，调查时刻表，解开检票闸门。'];
    if (!state.solved.includes('shrine')) return ['第二章 · 灯火记得归路', '走进雾灯町，与制灯人交谈，前往月见神社。'];
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
    if (state.solved.length) state.flags.lantern = true;
    state.flags.truth = state.solved.includes('archive');
    state.clues = select(raw.clues, CLUES);
    state.memories = select(raw.memories, MEMORIES);
    state.seen = Array.isArray(raw.seen) ? [...new Set(raw.seen.filter(x => typeof x === 'string' && /^[a-z][a-z0-9-]{0,45}$/i.test(x)))].slice(0, 100) : [];
    state.zone = canVisit(state, raw.zone) ? raw.zone : 'station';
    state.phase = raw.phase === 'echo' && state.flags.lantern ? 'echo' : 'present';
    const spawn=Maps.maps[state.zone].spawn;state.player={x:spawn[0],y:spawn[1],facing:0};
    const sameLayout=raw.layoutVersion===Maps.LAYOUT_VERSION||!['station','town'].includes(state.zone);
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
  return { VERSION, ZONES, PUZZLES, MEMORIES, CLUES, ENDINGS, newGame, canVisit, addClue, collectMemory, setFlag, turnGear, checkPuzzle, puzzleAvailable, solvePuzzle, missingForDawn, canEnd, finish, objective, restore };
});
