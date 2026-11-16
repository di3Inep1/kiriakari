/* Original grid maps. Tile graphics: image_gen atlas; layout and collision: hand authored. */
(function (root, factory) {
  const value = factory();
  if (typeof module === 'object' && module.exports) module.exports = value;
  else root.KiriMaps = value;
})(globalThis, function () {
  'use strict';
  const maps = {};
  function create(id, w, h, floor, spawn) {
    const map = { id, w, h, floor, spawn, tiles: Array(w * h).fill(floor), solids: Array(w * h).fill(floor === 7 || floor === 15), props: [], lights: [] };
    map.put = (x, y, tile, solid = false) => { if (x >= 0 && y >= 0 && x < w && y < h) { map.tiles[y * w + x] = tile; map.solids[y * w + x] = solid; } };
    map.rect = (x, y, width, height, tile, solid = false) => { for (let r = y; r < y + height; r++) for (let c = x; c < x + width; c++) map.put(c, r, tile, solid); };
    map.prop = (id, sprite, x, y, size, footprint = [], hanging = false) => {
      map.props.push({id,sprite,x,y,size,hanging});
      footprint.forEach(([dx,dy]) => { if(x+dx>=0&&x+dx<w&&y+dy>=0&&y+dy<h) map.solids[(y+dy)*w+x+dx]=true; });
    };
    map.border = tile => { map.rect(0, 0, w, 1, tile, true); map.rect(0, h - 1, w, 1, tile, true); map.rect(0, 0, 1, h, tile, true); map.rect(w - 1, 0, 1, h, tile, true); };
    map.house = (x, y, width, height, roof = 19) => { map.rect(x, y, width, 1, roof === 18 ? 26 : 27, true); map.rect(x, y + 1, width, 1, roof, true); map.rect(x, y + 2, width, height - 2, 17, true); map.put(x + 1, y + height - 2, 29, true); map.put(x + width - 2, y + height - 2, 29, true); if(height>=6) { map.put(x+2,y+3,29,true); map.put(x+width-3,y+3,29,true); } map.put(x + Math.floor(width / 2), y + height - 1, 30, true); };
    maps[id] = map; return map;
  }
  let m = create('station', 32, 20, 11, [16, 15]); m.border(34);
  m.rect(1, 2, 30, 2, 47, true); m.rect(1, 4, 30, 1, 2); m.rect(2, 10, 28, 8, 2);
  m.house(2, 5, 8, 5); m.put(6, 9, 31); m.put(12, 7, 43, true);
  m.put(14, 7, 40, true); m.put(25, 7, 40, true); m.put(28, 10, 30, true);
  m.prop('photo-bench',0,4,13,2.7,[[-1,0],[0,0],[1,0]]);
  m.rect(29, 12, 2, 4, 8); [2, 5, 9, 26, 29].forEach(x => m.put(x, 18, 37, true)); m.put(20, 12, 2, true);
  m = create('town', 36, 26, 0, [5, 14]); m.border(32);
  m.rect(2, 12, 32, 5, 2); m.rect(17, 2, 4, 22, 2); m.house(3, 4, 9, 7, 18); m.house(24, 4, 9, 7);
  m.house(4, 19, 9, 5); m.house(25, 20, 8, 4, 18);
  [[3, 2], [14, 5], [22, 5], [2, 21], [31, 18], [22, 22], [15, 19]].forEach(([x, y]) => m.put(x, y, 33, true));
  [[13, 11], [23, 11], [16, 18], [21, 18]].forEach(([x, y]) => m.put(x, y, 40, true));
  m.put(20, 10, 43, true); m.put(10, 14, 2, true); m.rect(34, 3, 1, 21, 6, true);
  m.prop('eave-crane',3,27,11,1.55,[],true);
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
  function walkable(zone, x, y) { const map = maps[zone]; return !!map && Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < map.w && y < map.h && !map.solids[y * map.w + x]; }
  function findPath(zone, from, to) {
    const map = maps[zone], tx = Math.round(to.x), ty = Math.round(to.y);
    if (!map || !walkable(zone, tx, ty)) return [];
    const sx = Math.round(from.x), sy = Math.round(from.y), start = sy * map.w + sx, end = ty * map.w + tx;
    const queue = [start], previous = new Map([[start, -1]]);
    for (let n = 0; n < queue.length; n++) {
      const current = queue[n]; if (current === end) break;
      const x = current % map.w, y = Math.floor(current / map.w);
      for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) {
        const nx = x + dx, ny = y + dy, key = ny * map.w + nx;
        if (walkable(zone, nx, ny) && !previous.has(key)) { previous.set(key, current); queue.push(key); }
      }
    }
    if (!previous.has(end)) return [];
    const path = []; for (let at = end; at !== start; at = previous.get(at)) path.push({ x: at % map.w, y: Math.floor(at / map.w) });
    return path.reverse();
  }
  function approach(zone, from, object) {
    const candidates = [[0, 1], [-1, 0], [1, 0], [0, -1]].map(([dx, dy]) => ({ x: object.x + dx, y: object.y + dy }));
    const paths = candidates.filter(p => walkable(zone, p.x, p.y)).map(p => ({ point: p, path: findPath(zone, from, p) })).filter(p => p.path.length || p.point.x === from.x && p.point.y === from.y);
    return paths.sort((a, b) => a.path.length - b.path.length)[0] || null;
  }
  function nearestFloor(zone, point) {
    const map = maps[zone]; if (walkable(zone, point.x, point.y)) return { x: point.x, y: point.y };
    return { x: map.spawn[0], y: map.spawn[1] };
  }
  return { maps, walkable, findPath, approach, nearestFloor };
});
