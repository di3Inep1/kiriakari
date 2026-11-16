const { test } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../core.js');
const M = require('../maps.js');
const solutions = { station: [0, 7, 1, 6], shrine: ['moon', 'mountain', 'river', 'boat'], archive: ['letter', 'lantern', 'gate', 'bell'], tower: [3, 1, 2] };
function complete() { const s = C.newGame(); C.setFlag(s, 'lantern'); for (const id of C.PUZZLES) assert.equal(C.solvePuzzle(s, id, solutions[id]), true); return s; }
test('new game begins at the station and cannot bypass story gates', () => {
  const s = C.newGame(); assert.equal(C.canVisit(s, 'station'), true);
  assert.equal(C.canVisit(s,'station-office'),true);C.ZONES.filter(id=>!['station','station-office'].includes(id)).forEach(id => assert.equal(C.canVisit(s, id), false));
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
  for(const id of ['crane','ledger','photo','station-lock','tape','old-lantern','toolbox','basket','workbench'])assert.ok(supported.includes(id));
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
  assert.equal(prop.x,pose.building.door.x-1);assert.equal(prop.y,pose.building.frontY-1);
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

test('an unlit lamp needs a borrowed key and dry matches; lighting consumes the matches once',()=>{
  const s=C.newGame();
  assert.equal(C.explore(s,'open-toolbox'),'missing-key');assert.equal(C.explore(s,'light-lantern'),'missing-lamp');
  assert.equal(C.explore(s,'borrow-key'),'missing-lamp');
  s.zone='station-office';assert.equal(C.explore(s,'take-lamp'),'done');assert.equal(C.explore(s,'take-lamp'),'already');
  assert.equal(C.explore(s,'light-lantern'),'missing-matches');assert.equal(!!s.flags.lantern,false);assert.equal(C.solvePuzzle(s,'station',solutions.station),false);
  s.zone='station';assert.equal(C.explore(s,'borrow-key'),'done');assert.equal(C.explore(s,'borrow-key'),'already');assert.equal(C.explore(s,'open-toolbox'),'done');
  assert.ok(C.hasItem(s,'dryMatches'));assert.equal(C.explore(s,'light-lantern'),'done');assert.equal(C.hasItem(s,'dryMatches'),false);assert.equal(s.flags.lantern,true);
  const after=JSON.stringify(s);assert.equal(C.explore(s,'light-lantern'),'already');assert.equal(C.explore(s,'open-toolbox'),'already');assert.equal(JSON.stringify(s),after);
});
test('town repairs require a real request, thread from memory, water and prepared paste',()=>{
  const s=C.newGame();C.setFlag(s,'lantern');C.solvePuzzle(s,'station',solutions.station);s.zone='town';
  assert.equal(C.explore(s,'repair-lamp'),'missing-request');assert.equal(C.explore(s,'meet-nagi'),'done');assert.equal(C.explore(s,'repair-lamp'),'missing-thread');
  assert.equal(C.explore(s,'take-thread'),'wrong-phase');assert.equal(C.hasItem(s,'redThread'),false);s.phase='echo';assert.equal(C.explore(s,'take-thread'),'done');
  assert.equal(C.explore(s,'repair-lamp'),'missing-paste');s.zone='town-workshop';assert.equal(C.explore(s,'mix-paste'),'missing-water');
  s.zone='town';assert.equal(C.explore(s,'draw-water'),'done');s.zone='town-workshop';assert.equal(C.explore(s,'mix-paste'),'done');assert.equal(C.hasItem(s,'waterJar'),false);
  assert.equal(C.explore(s,'repair-lamp'),'done');assert.equal(s.flags.helpedNagi,true);assert.ok(s.clues.includes('lanternOrder'));assert.equal(C.hasItem(s,'redThread'),false);assert.equal(C.hasItem(s,'ricePaste'),false);
  const after=JSON.stringify(s);assert.equal(C.explore(s,'repair-lamp'),'already');assert.equal(C.explore(s,'mix-paste'),'already');s.zone='town';assert.equal(C.explore(s,'take-thread'),'already');assert.equal(C.explore(s,'draw-water'),'already');s.zone='town-workshop';assert.equal(JSON.stringify(s),after);
});
test('a station parcel can be carried to Nagi and exchanged only once for a useful route',()=>{
  const s=C.newGame();s.zone='station-office';assert.equal(C.explore(s,'take-parcel'),'done');assert.equal(C.explore(s,'take-parcel'),'already');
  C.setFlag(s,'lantern');C.solvePuzzle(s,'station',solutions.station);s.zone='town';assert.equal(C.explore(s,'deliver-parcel'),'missing-parcel');assert.ok(C.hasItem(s,'oldParcel'));
  C.explore(s,'meet-nagi');assert.equal(C.explore(s,'deliver-parcel'),'done');assert.equal(C.hasItem(s,'oldParcel'),false);assert.ok(C.hasItem(s,'routeCard'));assert.ok(s.clues.includes('rescueRoute'));
  const after=JSON.stringify(s);assert.equal(C.explore(s,'deliver-parcel'),'already');assert.equal(JSON.stringify(s),after);
});
test('quest progress survives a save during exploration and legacy lit lamps stay lit',()=>{
  const s=C.newGame();s.zone='station-office';C.explore(s,'take-lamp');s.zone='station';C.explore(s,'borrow-key');C.explore(s,'open-toolbox');
  assert.deepEqual(C.restore(JSON.parse(JSON.stringify(s))),{...s,flags:{...s.flags,truth:false}});
  const old=complete();delete old.items;delete old.explorationVersion;old.flags.helpedNagi=true;const restored=C.restore(old);
  assert.equal(restored.flags.lantern,true);assert.ok(restored.items.includes('guideLamp'));assert.equal(restored.flags.helpedNagi,true);assert.equal(restored.flags.nagiMet,true);assert.deepEqual(restored.solved,old.solved);
});
test('out-of-place exploration cannot create or spend quest materials',()=>{
  const s=C.newGame(),before=JSON.stringify(s);for(const action of ['take-lamp','mix-paste','take-thread','draw-water','take-parcel','invent-item'])assert.equal(C.explore(s,action),'unavailable');assert.equal(JSON.stringify(s),before);
});

test('restoring a partially recorded quest recovers its unique unspent materials',()=>{
  const s=C.newGame();s.flags={lampFound:true,matchesFound:true,threadTaken:true,parcelTaken:true};s.items=[];
  const r=C.restore(s);for(const item of ['guideLamp','dryMatches','redThread','oldParcel'])assert.equal(C.hasItem(r,item),true);
  r.items.push('foreign-item','redThread');const again=C.restore(r);assert.equal(again.items.includes('foreign-item'),false);assert.equal(again.items.filter(id=>id==='redThread').length,1);
});
test('Ren gives practical progress-dependent help and lights the lamp only when asked with matches',()=>{
  const fs=require('node:fs'),vm=require('node:vm'),sandbox={KiriCore:C,KiriData:{}};vm.runInNewContext(fs.readFileSync(require.resolve('../exploration.js'),'utf8'),sandbox);
  const s=C.newGame(),speak=(choice=0)=>sandbox.KiriExploration.run('ren',s,{changed(){},talk(lines,end){for(const line of lines){if(line.choices)line.choices[choice].effect?.();}end?.();}});
  speak();assert.equal(s.flags.renMet,true);assert.equal(!!s.flags.lantern,false);assert.equal(C.hasItem(s,'guideLamp'),false);
  s.zone='station-office';C.explore(s,'take-lamp');s.zone='station';speak();assert.equal(C.hasItem(s,'lockerKey'),true);
  C.explore(s,'open-toolbox');speak(1);assert.equal(!!s.flags.lantern,false);assert.equal(C.hasItem(s,'dryMatches'),true);
  speak(0);assert.equal(s.flags.lantern,true);assert.equal(C.hasItem(s,'dryMatches'),false);assert.equal(!!s.flags.promisedRen,false);
});

test('old interior saves relocate to the resized room entrance without losing exploration progress',()=>{
  for(const zone of ['station-office','town-workshop']){
    const s=C.newGame();C.setFlag(s,'lantern');C.solvePuzzle(s,'station',solutions.station);s.zone=zone;s.layoutVersion=M.LAYOUT_VERSION-1;s.player={x:16,y:11,facing:2};
    s.flags.threadTaken=true;C.giveItem(s,'redThread');C.addClue(s,'dutyLog');C.collectMemory(s,'photo');
    const r=C.restore(JSON.parse(JSON.stringify(s))),spawn=M.maps[zone].spawn;
    assert.equal(r.zone,zone);assert.deepEqual(r.player,{x:spawn[0],y:spawn[1],facing:0});assert.ok(C.hasItem(r,'redThread'));assert.ok(r.clues.includes('dutyLog'));assert.ok(r.memories.includes('photo'));assert.equal(r.flags.lantern,true);
  }
});

test('interior furniture is rectangular integer-cell prefabs with collision derived from the same box',()=>{
  for(const zone of ['station-office','town-workshop']){
    const map=M.maps[zone],occupied=new Set();
    for(const prop of map.props){const g=prop.grid;assert.ok(g,zone+'/'+prop.id+' uses a prefab');assert.equal('size' in prop,false);
      for(const value of [g.x,g.y,g.w,g.d,g.h,g.top])assert.ok(Number.isInteger(value));
      if(prop.mount)continue;assert.equal(g.top+g.h,g.y+g.d);
      for(let y=g.y;y<g.y+g.d;y++)for(let x=g.x;x<g.x+g.w;x++){const cell=x+','+y;assert.equal(occupied.has(cell),false,'Furniture must not overlap');occupied.add(cell);assert.equal(map.solids[y*map.w+x],true);}
    }
    for(const mat of map.tatami)for(const value of [mat.x,mat.y,mat.width,mat.height])assert.ok(Number.isInteger(value));
  }
});
test('the full interior floor is connected and the two-cell main aisles stay clear',()=>{
  for(const zone of ['station-office','town-workshop']){
    const map=M.maps[zone],from={x:map.spawn[0],y:map.spawn[1]},a=map.areas.aisle;
    for(let y=a.y;y<a.y+a.height;y++)for(let x=a.x;x<a.x+a.width;x++)assert.equal(M.walkable(zone,x,y),true,'Main aisle stays clear');
    for(let y=0;y<map.h;y++)for(let x=0;x<map.w;x++)if(M.walkable(zone,x,y))assert.ok(x===from.x&&y===from.y||M.findPath(zone,from,{x,y}).length,'No inaccessible floor pocket at '+zone+'/'+x+','+y);
  }
});
test('furniture placement rejects fractional origins and overlapping boxes',()=>{
  const F=require('../furniture.js'),map={w:8,h:8,props:[],solids:Array(64).fill(false)};
  assert.throws(()=>F.place(map,'bad','stool',1.5,2),/integer/);
  F.place(map,'table','repairTable',1,1);assert.throws(()=>F.place(map,'overlap','stool',2,2),/Overlapping/);
  assert.throws(()=>F.place(map,'outside','waitingBench',7,1),/outside/);
  F.place(map,'window','shojiWindow',4,1);assert.throws(()=>F.place(map,'overlapping-lamp','wallLamp',5,2),/wall fixtures/);
});
test('interior art uses only grid-designed atlases and preserves source proportions',()=>{
  const F=require('../furniture.js');
  for(const zone of ['station-office','town-workshop'])for(const p of M.maps[zone].props)assert.ok(['prefab','decor','gridInterior'].includes(p.atlas),p.id+' must not reuse legacy furniture');
  for(const [w,h,sw,sh,mount] of [[32,64,173,351,false],[96,64,388,245,false],[64,32,301,177,false],[32,32,217,271,true]]){
    const r=F.fitArt(w,h,sw,sh,mount);assert.ok(Math.abs(r.w/r.h-sw/sh)<1e-10,'Uniform scaling preserves circles and joinery');assert.ok(r.w<=w+1e-10&&r.h<=h+1e-10);assert.ok(r.x>=0&&r.y>=0);if(!mount)assert.equal(r.y+r.h,h);
  }
  assert.equal(F.catalog.lampCabinet.completedFlag,'lampFound');assert.equal(F.catalog.lampCabinet.completedSprite,1);
});
