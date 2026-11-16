/* Original grid maps. Tile graphics: image_gen atlas; layout and collision: hand authored. */
(function (root, factory) {
  const value = factory();
  if (typeof module === 'object' && module.exports) module.exports = value;
  else root.KiriMaps = value;
})(globalThis, function () {
  'use strict';
  const LAYOUT_VERSION=5;
  const maps = {};
  function create(id, w, h, floor, spawn) {
    const map = { id, w, h, floor, spawn, tiles: Array(w * h).fill(floor), solids: Array(w * h).fill(floor === 7 || floor === 15), props: [], lights: [], buildings: [], gates: [], platformEdges: [],tatami:[] };
    map.put = (x, y, tile, solid = false) => { if (x >= 0 && y >= 0 && x < w && y < h) { map.tiles[y * w + x] = tile; map.solids[y * w + x] = solid; } };
    map.rect = (x, y, width, height, tile, solid = false) => { for (let r = y; r < y + height; r++) for (let c = x; c < x + width; c++) map.put(c, r, tile, solid); };
    map.prop = (id, sprite, x, y, size, footprint = [], hanging = false) => {
      map.props.push({id,sprite,x,y,size,hanging});
      footprint.forEach(([dx,dy]) => { if(x+dx>=0&&x+dx<w&&y+dy>=0&&y+dy<h) map.solids[(y+dy)*w+x+dx]=true; });
    };
    map.border = tile => { map.rect(0, 0, w, 1, tile, true); map.rect(0, h - 1, w, 1, tile, true); map.rect(0, 0, 1, h, tile, true); map.rect(w - 1, 0, 1, h, tile, true); };
    map.house = (x, y, width, height, roof = 19, id=`house-${x}-${y}`) => {
      const roofRows=Math.min(3,height-2),building={id,x,y,width,height,roof,roofRows,eaveY:y+roofRows,frontY:y+height,door:{x:x+Math.floor(width/2),y:y+height-1}};
      map.rect(x,y,width,1,roof===18?26:27,true);map.rect(x,y+1,width,roofRows-1,roof,true);
      map.rect(x,y+roofRows,width,height-roofRows,17,true);map.put(x+1,y+height-2,29,true);map.put(x+width-2,y+height-2,29,true);
      map.put(building.door.x,building.door.y,30,true);map.buildings.push(building);return building;
    };
    maps[id] = map; return map;
  }
  let m = create('station', 32, 22, 0, [17,10]);m.border(34);
  m.anchors={ren:[20,10],timetable:[11,8],photo:[4,9],'station-lock':[23,13],'to-town':[23,19],'station-door':[6,7],toolbox:[28,10],'waiting-bench':[4,9]};
  m.rect(11,3,21,3,11,true);m.rect(12,5,20,1,47,true);
  m.rect(2,7,29,6,2);m.rect(12,6,19,1,2);m.platformEdges.push({x:12,y:6,width:19});
  m.house(3,4,7,4,19,'station-office');m.put(11,8,43,true);
  m.prop('photo-bench',0,4,9,2.7,[[-1,0],[0,0],[1,0]]);
  m.prop('rail-buffer',3,11,5,1.3,[[0,0]]);Object.assign(m.props.at(-1),{atlas:'station'});
  [[12,8],[27,8],[21,16],[25,16]].forEach(([x,y])=>m.put(x,y,40,true));m.put(20,10,2,true);
  m.rect(0,13,32,1,58,true);m.rect(22,14,3,6,2);
  m.put(22,13,2,true);m.put(23,13,2);m.put(24,13,2,true);
  m.prop('station-ticket-gate',0,23,13,2.8,[[-1,0],[1,0]]);Object.assign(m.props.at(-1),{atlas:'station',gate:'station',openSprite:1});
  m.gates.push({puzzle:'station',cells:[[23,13]]});
  m.prop('maintenance-chest',1,28,10,1.7,[[0,0]]);Object.assign(m.props.at(-1),{atlas:'exploration'});
  m.areas={track:{x:12,y:5,width:20,height:1},platform:{x:2,y:7,width:29,height:6},exitPath:{x:22,y:14,width:3,height:6}};
  m = create('town', 36, 26, 0, [5, 14]); m.border(32);
  m.rect(2, 12, 32, 5, 2); m.rect(17, 2, 4, 22, 2); m.house(4,5,7,4,18,'town-west-house');m.house(25,5,7,4,19,'town-east-house');
  m.rect(4,9,7,1,2);m.rect(6,9,3,3,2);m.rect(25,9,7,1,2);m.rect(27,9,3,3,2);
  const craneHouse=m.buildings.find(b=>b.id==='town-east-house');
  m.anchors={nagi:[10,14],notice:[20,10],crane:[craneHouse.door.x-1,craneHouse.frontY-1],'to-station':[2,14],'to-shrine':[18,3],'to-archive':[33,14],'to-river':[19,23],'workshop-door':[7,8],well:[15,20],basket:[31,10]};
  m.house(5,20,7,4);m.house(26,20,6,4,18);
  [[3, 2], [14, 5], [22, 5], [2, 21], [31, 18], [22, 22], [15, 19]].forEach(([x, y]) => m.put(x, y, 33, true));
  [[13, 11], [23, 11], [16, 18], [21, 18]].forEach(([x, y]) => m.put(x, y, 40, true));
  m.put(20, 10, 43, true); m.put(10, 14, 2, true); m.rect(34, 3, 1, 21, 6, true);
  m.prop('eave-crane',0,...m.anchors.crane,.48,[],true);Object.assign(m.props.at(-1),{atlas:'crane',attachment:{building:craneHouse.id}});
  m.put(15,19,0);m.rect(14,18,3,4,2);
  m.prop('town-well',2,15,20,2.1,[[0,0],[-1,0],[1,0],[0,-1]]);Object.assign(m.props.at(-1),{atlas:'exploration'});
  m.prop('thread-basket',4,31,10,1.35,[[0,0]]);Object.assign(m.props.at(-1),{atlas:'exploration',clearedBy:'threadTaken',onlyItemInEcho:true});
  m = create('shrine', 28, 24, 1, [14, 20]); m.border(34); m.rect(5, 10, 18, 12, 10);
  m.rect(13, 8, 3, 15, 2); m.house(8, 3, 12, 6, 18); m.put(14, 8, 31);
  m.rect(10, 10, 8, 1, 56, true); m.put(13, 10, 2); m.put(14, 10, 2);
  [[9, 13], [18, 13], [9, 18], [18, 18]].forEach(([x, y]) => m.put(x, y, 40, true));
  m.put(14, 13, 60, true); m.put(6, 12, 43, true); m.put(19, 15, 10, true);
  [[3, 4], [22, 4], [2, 14], [24, 14], [4, 21], [23, 21]].forEach(([x, y]) => m.put(x, y, 33, true));
  m = create('archive', 26, 22, 4, [13, 18]); m.border(15); m.rect(1, 1, 24, 2, 17, true); m.rect(2, 3, 22, 1, 21, true);
  m.rect(2, 4, 2, 14, 21, true); m.rect(22, 7, 2, 11, 21, true); m.rect(9, 7, 3, 2, 21, true); m.rect(14, 11, 3, 2, 21, true);
  m.rect(1, 20, 24, 1, 17, true); m.put(13, 20, 31); m.put(23, 5, 61); m.put(13, 5, 49, true);
  m.prop('ledger-desk',1,7,14,2.15,[[-1,0],[0,0],[1,0]]);
  m.prop('recorder-desk',2,19,15,2.15,[[-1,0],[0,0],[1,0]]);
  m.put(6, 16, 48, true); m.put(19, 8, 48, true); m.put(12, 2, 63, true); m.put(6, 5, 40, true); m.put(20, 5, 40, true);
  m = create('tower', 24, 22, 3, [12, 18]); m.border(15); m.rect(1, 1, 22, 3, 22, true); m.put(12, 2, 63, true);
  m.rect(2, 5, 1, 13, 22, true); m.rect(21, 5, 1, 13, 22, true);
  [6, 10, 14].forEach(y => { m.put(3, y, 46, true); m.put(20, y, 46, true); });
  m.put(12, 5, 53, true); m.put(12, 7, 46, true); m.put(6, 12, 43, true); m.put(17, 13, 3, true);
  m.rect(10, 11, 4, 6, 5); m.put(12, 14, 62); m.put(6, 20, 61); m.put(20, 18, 61); m.put(5, 5, 40, true); m.put(18, 5, 40, true);
  [[8,10],[16,10],[8,17],[16,17]].forEach(([x,y]) => m.put(x,y,40,true));
  m = create('river', 36, 20, 7, [5, 11]); m.rect(0, 0, 36, 6, 1, true); m.rect(0, 16, 36, 4, 1, true);
  m.rect(1, 9, 34, 4, 2); m.rect(1, 8, 34, 1, 56, true); m.rect(1, 13, 34, 1, 56, true);
  m.rect(10, 5, 3, 4, 61); m.put(11, 5, 45, true); m.put(26, 11, 2, true);
  [4, 16, 28, 33].forEach(x => { m.put(x, 8, 40, true); m.put(x, 13, 40, true); });
  // Doors lead to compact, furnished working rooms with a clear central aisle.
  const furnish=(id,sprite,x,y,size,footprint=[],extra={})=>{m.prop(id,sprite,x,y,size,footprint);Object.assign(m.props.at(-1),{atlas:'interior',...extra});};
  const compact=(id,sprite,x,y,size,footprint=[],extra={})=>furnish(id,sprite,x,y,size,footprint,{...extra,atlas:'compact'});
  const wallLight=(id,x)=>{furnish(id,7,x,2,.95,[],{mount:'back-wall'});m.lights.push({x,y:2});};
  m=create('station-office',14,11,4,[7,8]);m.border(15);m.rect(1,1,12,2,17,true);m.rect(1,9,12,1,17,true);m.put(7,9,31);
  m.anchors={'old-lantern':[2,5],'duty-log':[4,4],parcel:[11,7],'lighting-table':[2,7],'office-window':[10,2],'office-exit':[7,9]};
  m.areas={staff:{x:1,y:3,width:7,height:3},waiting:{x:9,y:3,width:4,height:4},luggage:{x:10,y:7,width:3,height:2},entrance:{x:6,y:7,width:3,height:2}};
  m.put(3,2,29,true);m.put(10,2,29,true);
  for(const [id,sprite,x,y,size,clearedBy] of [['lamp-cabinet',0,2,5,2.0,'lampFound'],['duty-desk',6,4,4,2.1,null],['parcel-shelf',5,11,7,1.6,'parcelTaken']]){
    m.prop(id,sprite,x,y,size,[[-1,0],[0,0],[1,0]]);Object.assign(m.props.at(-1),{atlas:'exploration',clearedBy});
  }
  furnish('lighting-desk',10,2,7,1.8,[[-1,0],[0,0],[1,0]]);
  compact('ticket-counter',7,6,5,2.6,[[-1,0],[0,0],[1,0],[1,-1]]);
  furnish('waiting-bench-north',1,10,4,2.5,[[-1,0],[0,0],[1,0]]);
  compact('waiting-bench-east',0,12,6,2.5,[[0,0],[0,-1]],{facing:'west'});
  furnish('ticket-cubby',2,2,3,1.6,[[0,0]]);
  furnish('traveller-luggage',3,9,6,1.1,[[0,0]]);
  m.prop('station-wall-clock',6,7,2,.9);Object.assign(m.props.at(-1),{atlas:'world',mount:'back-wall'});
  wallLight('office-wall-lamp-west',1);wallLight('office-wall-lamp-east',12);
  m=create('town-workshop',12,11,4,[6,8]);m.border(15);m.rect(1,1,10,2,17,true);m.rect(1,9,10,1,17,true);m.put(6,9,31);
  m.anchors={workbench:[3,5],'paste-table':[8,5],'workshop-record':[3,8],'workshop-exit':[6,9]};
  m.areas={making:{x:2,y:4,width:3,height:3},wetWork:{x:7,y:4,width:2,height:2},storage:{x:8,y:6,width:3,height:3},entrance:{x:5,y:7,width:2,height:2}};
  m.put(5,2,29,true);
  m.tatami.push({x:1.6,y:4.4,width:1.6,height:3.2},{x:3.2,y:4.4,width:1.6,height:3.2});
  compact('repair-bench',2,3,5,1.7,[[0,0],[-1,0],[0,-1],[-1,-1]],{completedFlag:'helpedNagi',completedSprite:3,shape:'square'});
  compact('paste-bench',4,8,5,1.6,[[0,0],[-1,0]],{shape:'square'});
  compact('pattern-desk',5,3,8,1.5,[[0,0]],{shape:'square'});
  furnish('paper-supply-shelf',4,3,3,2.0,[[-1,0],[0,0],[1,0]]);
  furnish('lantern-drying-rack',5,8,3,2.3,[[-1,0],[0,0],[1,0]]);
  furnish('work-stool',6,4,6,.7,[[0,0]]);
  furnish('customer-stool',6,4,8,.7,[[0,0]]);
  furnish('paper-stock-basket',8,8,7,1.0,[[0,0]]);
  compact('side-paper-shelf',6,10,7,1.8,[[0,0],[0,-1]],{facing:'west'});
  wallLight('workshop-wall-lamp-west',1);wallLight('workshop-wall-lamp-east',10);
  // Furniture is a transparent layer over the actual floor, never a baked floor tile.
  const detached = {40:[0,1.3],41:[7,1.35],43:[1,1.2],45:[2,1.25],46:[3,1.2],48:[4,1.5],49:[5,1.5],53:[6,1.25]};
  Object.values(maps).forEach(map=>{
    map.tiles.forEach((tile,i)=>{
      if(!detached[tile]) return;
      const x=i%map.w,y=Math.floor(i/map.w),[sprite,size]=detached[tile];
      const neighbors=[[0,-1],[0,1],[-1,0],[1,0]].map(([dx,dy])=>map.tiles[(y+dy)*map.w+x+dx]).filter(t=>Number.isInteger(t)&&t<15);
      const counts=new Map();neighbors.forEach(t=>counts.set(t,(counts.get(t)||0)+1));
      const floor=[...counts].sort((a,b)=>b[1]-a[1])[0]?.[0]??map.floor;
      map.tiles[i]=floor;map.props.push({id:`prop-${x}-${y}`,atlas:'world',sprite,x,y,size});
      if(tile===40) map.lights.push({x,y});
    });
  });
  const scenery = typeof module === 'object' && module.exports ? require('./scenery.js') : globalThis.KiriScenery;
  scenery.enrich(maps);
  function walkable(zone, x, y, solved=[]) { const map = maps[zone]; return !!map && Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < map.w && y < map.h && !map.solids[y * map.w + x]&&!map.gates.some(g=>!solved.includes(g.puzzle)&&g.cells.some(([gx,gy])=>gx===x&&gy===y)); }
  function findPath(zone, from, to, solved=[]) {
    const map = maps[zone], tx = Math.round(to.x), ty = Math.round(to.y);
    if (!map || !walkable(zone, tx, ty,solved)) return [];
    const sx = Math.round(from.x), sy = Math.round(from.y), start = sy * map.w + sx, end = ty * map.w + tx;
    const queue = [start], previous = new Map([[start, -1]]);
    for (let n = 0; n < queue.length; n++) {
      const current = queue[n]; if (current === end) break;
      const x = current % map.w, y = Math.floor(current / map.w);
      for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) {
        const nx = x + dx, ny = y + dy, key = ny * map.w + nx;
        if (walkable(zone, nx, ny,solved) && !previous.has(key)) { previous.set(key, current); queue.push(key); }
      }
    }
    if (!previous.has(end)) return [];
    const path = []; for (let at = end; at !== start; at = previous.get(at)) path.push({ x: at % map.w, y: Math.floor(at / map.w) });
    return path.reverse();
  }
  function approach(zone, from, object,solved=[]) {
    const candidates = [[0, 1], [-1, 0], [1, 0], [0, -1]].map(([dx, dy]) => ({ x: object.x + dx, y: object.y + dy }));
    const paths = candidates.filter(p => walkable(zone, p.x, p.y,solved)).map(p => ({ point: p, path: findPath(zone, from, p,solved) })).filter(p => p.path.length || p.point.x === from.x && p.point.y === from.y);
    return paths.sort((a, b) => a.path.length - b.path.length)[0] || null;
  }
  function nearestFloor(zone, point,solved=[]) {
    const map = maps[zone]; if (walkable(zone, point.x, point.y,solved)) return { x: point.x, y: point.y };
    return { x: map.spawn[0], y: map.spawn[1] };
  }
  function attachmentPose(zone,prop){
    const building=maps[zone].buildings.find(b=>b.id===prop.attachment?.building);
    if(!building)return null;
    return {x:prop.x+.5,threadY:building.eaveY+.06,bottomY:building.frontY-.15,building};
  }
  function focusPoint(zone,object){
    const prop=maps[zone].props.find(p=>p.id===object.support),pose=prop&&attachmentPose(zone,prop);
    if(pose)return {x:pose.x-.5,y:pose.bottomY-.92-prop.size*.45};
    return {x:object.x+(object.focusOffset?.x||0),y:object.y+(object.focusOffset?.y||0)};
  }
  return { LAYOUT_VERSION,maps,walkable,findPath,approach,nearestFloor,attachmentPose,focusPoint };
});
