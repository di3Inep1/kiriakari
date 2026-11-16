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
  assert.deepEqual(C.restore(positioned).player, { x: M.maps.station.spawn[0], y:M.maps.station.spawn[1], facing: 0 });
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
    const plan = M.approach(id, { x: zone.spawn[0], y: zone.spawn[1] }, object,C.PUZZLES);
    assert.ok(plan, `${id}/${object.id} is reachable`);
    let previous = { x: zone.spawn[0], y: zone.spawn[1] };
    for (const point of plan.path) { assert.equal(M.walkable(id, point.x, point.y,C.PUZZLES), true); assert.equal(Math.abs(point.x - previous.x) + Math.abs(point.y - previous.y), 1); previous = point; }
  }
});
test('named portable items are attached to matching furniture, not dropped on the floor',()=>{
  const fs=require('node:fs'),vm=require('node:vm'),sandbox={KiriMaps:M};
  vm.runInNewContext(fs.readFileSync(require.resolve('../data.js'),'utf8'),sandbox);
  const supported=[];
  for(const [zoneId,zone] of Object.entries(sandbox.KiriData.zones)) for(const object of zone.objects) if(object.support) {
    const prop=M.maps[zoneId].props.find(p=>p.id===object.support);
    assert.ok(prop,`${zoneId}/${object.id} has furniture`);assert.equal(prop.x,object.x);assert.equal(prop.y,object.y);supported.push(object.id);
  }
  assert.deepEqual(supported.sort(),['crane','ledger','photo','station-lock','tape']);
  assert.equal(M.maps.station.tiles.includes(55),false);
  assert.equal(M.maps.archive.tiles.includes(50),false);assert.equal(M.maps.archive.tiles.includes(51),false);
  for(const tile of [40,41,43,45,46,48,49,53]) for(const map of Object.values(M.maps)) assert.equal(map.tiles.includes(tile),false);
});
test('station exit is physically gated and opens only after the station puzzle',()=>{
  const map=M.maps.station,from={x:map.spawn[0],y:map.spawn[1]},exit=map.anchors['to-town'];
  assert.equal(M.findPath('station',from,{x:exit[0],y:exit[1]}).length,0);
  const path=M.findPath('station',from,{x:exit[0],y:exit[1]},['station']);
  assert.ok(path.length>0);assert.ok(path.some(p=>p.x===23&&p.y===13));
  assert.equal(M.walkable('station',23,13),false);assert.equal(M.walkable('station',23,13,['station']),true);
  assert.equal(M.walkable('station',22,13,['station']),false);
  assert.ok(M.approach('station',from,{x:23,y:13}));
});
test('paper crane is structurally attached to the house eave above the front wall',()=>{
  const prop=M.maps.town.props.find(p=>p.id==='eave-crane'),pose=M.attachmentPose('town',prop);
  assert.ok(pose);assert.equal(prop.atlas,'crane');assert.equal(pose.building.id,'town-east-house');
  assert.equal(prop.x,pose.building.x+3);assert.equal(prop.y,pose.building.frontY-1);
  assert.ok(pose.threadY>=pose.building.eaveY&&pose.threadY<pose.building.eaveY+.1);
  assert.ok(pose.bottomY>pose.threadY&&pose.bottomY<pose.building.frontY);
  assert.equal(M.walkable('town',prop.x,prop.y),false);assert.equal(M.walkable('town',prop.x,prop.y+1),true);
});
test('old layout saves retain story progress and relocate to the new safe entry',()=>{
  const old=C.newGame();delete old.layoutVersion;old.player={x:28,y:16,facing:2};old.flags.lantern=true;old.clues=['date'];old.memories=['photo'];
  const restored=C.restore(JSON.parse(JSON.stringify(old)));
  assert.equal(restored.layoutVersion,M.LAYOUT_VERSION);assert.equal(restored.flags.lantern,true);
  assert.deepEqual(restored.clues,['date']);assert.deepEqual(restored.memories,['photo']);
  assert.deepEqual(restored.player,{x:M.maps.station.spawn[0],y:M.maps.station.spawn[1],facing:0});
  const town=C.newGame();delete town.layoutVersion;town.solved=['station'];town.zone='town';town.player={x:27,y:11,facing:0};
  assert.deepEqual(C.restore(town).player,{x:5,y:14,facing:0});
});
