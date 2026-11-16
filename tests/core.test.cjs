const { test } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../core.js');
const M = require('../maps.js');
const solutions = { station: [0, 7, 1, 6], shrine: ['moon', 'mountain', 'river', 'boat'], archive: ['letter', 'lantern', 'gate', 'bell'], tower: [3, 1, 2] };
function complete() { const s = C.newGame(); C.setFlag(s, 'lantern'); for (const id of C.PUZZLES) assert.equal(C.solvePuzzle(s, id, solutions[id]), true); return s; }
test('new game begins at the station and cannot bypass story gates', () => {
  const s = C.newGame(); assert.equal(C.canVisit(s, 'station'), true);
  C.ZONES.slice(1).forEach(id => assert.equal(C.canVisit(s, id), false));
  assert.equal(C.solvePuzzle(s, 'station', solutions.station), false);
  assert.equal(C.solvePuzzle(s, 'tower', solutions.tower), false);
  C.setFlag(s, 'lantern'); assert.equal(C.solvePuzzle(s, 'archive', solutions.archive), false);
  assert.equal(C.solvePuzzle(s, 'station', [7, 1, 6]), false);
  assert.equal(C.solvePuzzle(s, 'station', solutions.station), true);
  assert.equal(C.canVisit(s, 'town'), true); assert.equal(C.canVisit(s, 'shrine'), true); assert.equal(C.canVisit(s, 'archive'), false);
});
test('every chapter opens the next location and all paths remain revisitable', () => {
  const s = complete(); assert.equal(s.flags.truth, true); C.ZONES.forEach(id => assert.equal(C.canVisit(s, id), true));
  C.PUZZLES.forEach(id => C.solvePuzzle(s, id, solutions[id])); assert.equal(s.solved.length, 4);
});
test('linked gear puzzle is actually solvable from its initial state', () => {
  let values = [0, 0, 0]; values = C.turnGear(values, 0); values = C.turnGear(values, 2); values = C.turnGear(values, 2);
  assert.deepEqual(values, solutions.tower); assert.equal(C.checkPuzzle('tower', values), true);
  const initial = [0, 0, 0]; C.turnGear(initial, 0); assert.deepEqual(initial, [0, 0, 0]);
});
test('wrong puzzle answers neither consume anything nor advance the chapter', () => {
  const s = C.newGame(); C.setFlag(s, 'lantern'); const before = JSON.stringify(s);
  assert.equal(C.solvePuzzle(s, 'station', [0, 7, 1, 5]), false); assert.equal(JSON.stringify(s), before);
  assert.equal(C.checkPuzzle('unknown', []), false);
});
test('true ending requires all four memories and all three recoverable bonds', () => {
  const s = complete(); ['departure', 'keeper', 'nameless'].forEach(id => assert.equal(C.canEnd(s, id), true));
  assert.equal(C.canEnd(s, 'dawn'), false); assert.equal(C.missingForDawn(s).length, 7);
  C.MEMORIES.forEach(id => C.collectMemory(s, id)); C.setFlag(s, 'promisedRen'); C.setFlag(s, 'helpedNagi');
  assert.equal(C.canEnd(s, 'dawn'), false); C.setFlag(s, 'heardShiori'); assert.equal(C.canEnd(s, 'dawn'), true);
  assert.equal(C.finish(s, 'dawn'), true); assert.equal(s.ending, 'dawn'); assert.deepEqual(C.missingForDawn(s), []);
});
test('no ending can be triggered before the clock tower is solved', () => {
  const s = C.newGame(); C.ENDINGS.forEach(id => { assert.equal(C.canEnd(s, id), false); assert.equal(C.finish(s, id), false); });
});
test('memory and clue collection are idempotent and reject foreign IDs', () => {
  const s = C.newGame(); assert.equal(C.collectMemory(s, 'photo'), true); assert.equal(C.collectMemory(s, 'photo'), false);
  assert.equal(C.collectMemory(s, 'bogus'), false); assert.equal(C.addClue(s, 'date'), true); assert.equal(C.addClue(s, 'date'), false);
  assert.equal(C.addClue(s, '<script>'), false); assert.deepEqual(s.memories, ['photo']);
});
test('JSON save round trip retains all four endings and the complete state', () => {
  for (const ending of C.ENDINGS) {
    const s = complete(); C.MEMORIES.forEach(id => C.collectMemory(s, id));
    ['promisedRen', 'helpedNagi', 'heardShiori'].forEach(id => C.setFlag(s, id));
    C.CLUES.forEach(id => C.addClue(s, id)); s.phase = 'echo'; s.zone = 'river'; s.player = { x: 23, y: 11, facing: 0 }; C.finish(s, ending);
    assert.deepEqual(C.restore(JSON.parse(JSON.stringify(s))), s);
  }
});
test('malformed saves cannot strand the player, inject markup, or bypass prerequisites', () => {
  assert.equal(C.restore(null), null); assert.equal(C.restore({}), null); const raw = C.newGame();
  raw.zone = 'tower'; raw.solved = ['tower']; raw.clues = ['<script>']; raw.seen = ['safe-id', '<script>alert(1)</script>']; raw.player = { x: Infinity, y: -999, facing: NaN };
  const restored = C.restore(raw); assert.equal(restored.zone, 'station'); assert.deepEqual(restored.solved, []); assert.deepEqual(restored.clues, []); assert.deepEqual(restored.seen, ['safe-id']);
  const positioned = C.newGame(); positioned.player = { x: -100, y: 1000, facing: -50 };
  assert.deepEqual(C.restore(positioned).player, { x: 16, y: 15, facing: 0 });
});
test('tile collision blocks walls and river water, not the bridge', () => {
  for (const zone of C.ZONES) { const m = M.maps[zone]; assert.equal(M.walkable(zone, ...m.spawn), true); assert.equal(M.walkable(zone, -1, 5), false); }
  assert.equal(M.walkable('river', 15, 15), false); assert.equal(M.walkable('river', 15, 11), true);
  assert.equal(M.walkable('archive', 9, 7), false); assert.equal(M.walkable('station', 3, 6), false);
});
test('every object, character and exit has a reachable adjacent tile', () => {
  const fs = require('node:fs'), vm = require('node:vm');
  const sandbox = { KiriMaps: M }; vm.runInNewContext(fs.readFileSync(require.resolve('../data.js'), 'utf8'), sandbox);
  for (const [id, zone] of Object.entries(sandbox.KiriData.zones)) for (const object of zone.objects) {
    const plan = M.approach(id, { x: zone.spawn[0], y: zone.spawn[1] }, object);
    assert.ok(plan, `${id}/${object.id} is reachable`);
    let previous = { x: zone.spawn[0], y: zone.spawn[1] };
    for (const point of plan.path) { assert.equal(M.walkable(id, point.x, point.y), true); assert.equal(Math.abs(point.x - previous.x) + Math.abs(point.y - previous.y), 1); previous = point; }
  }
});
