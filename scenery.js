/* Art direction, ground variation and layered vegetation. Stable between visits. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KiriScenery = api;
})(globalThis, function () {
  'use strict';
  const hash = (x, y, seed = 1) => {
    let n = Math.imul(x + 101, 374761393) ^ Math.imul(y + 127, 668265263) ^ Math.imul(seed, 1442695041);
    n = Math.imul(n ^ n >>> 13, 1274126177); return ((n ^ n >>> 16) >>> 0) / 4294967296;
  };
  const reserved = {
    station: [[16,15],[20,12],[12,7],[4,13],[3,13],[5,13],[28,10],[30,14]],
    town: [[5,14],[10,14],[20,10],[27,11],[2,14],[18,3],[33,14],[19,23]],
    shrine: [[14,20],[14,13],[6,12],[19,15],[14,22]],
    archive: [[13,18],[13,5],[7,14],[19,15],[23,5],[13,20]],
    tower: [[12,18],[12,7],[6,12],[17,13],[6,20],[20,18]],
    river: [[5,11],[11,5],[26,11],[2,11],[33,11]]
  };
  const outdoor = new Set(['station','town','shrine','river']);
  function kind(tile) {
    if ([0,1,32,33,34,35,36,37,39].includes(tile)) return 'grass';
    if ([2,10].includes(tile)) return 'stone';
    if ([8,9,11].includes(tile)) return 'dirt';
    if ([4,5].includes(tile)) return 'wood';
    if (tile === 3) return 'slate';
    if ([6,7,38].includes(tile)) return 'water';
    return 'object';
  }
  function enrich(maps) {
    Object.values(maps).forEach((map, index) => {
      const seed = index + 31;
      map.scenery = []; map.materials = map.tiles.map(kind);
      const protectedPoints=map.anchors?[map.spawn,...Object.values(map.anchors)]:(reserved[map.id]||[map.spawn]);
      const protectedAt = (x,y,r = 1.1) => protectedPoints.some(([px,py]) => Math.hypot(px-x,py-y) < r);
      const place = (sprite,x,y,size = 1,solid = false) => {
        const cx=Math.round(x), cy=Math.round(y);
        if(cx<0||cy<0||cx>=map.w||cy>=map.h||protectedAt(x,y,sprite<8?2.4:.9)) return;
        if (sprite<8) {
          if(map.scenery.some(p=>p.sprite<8&&Math.hypot(p.x-x,p.y-y)<1.9)) return;
          // Authored trees take priority over scattered small ground-cover plants.
          map.scenery=map.scenery.filter(p=>p.solid||Math.hypot(p.x-x,p.y-y)>=1.9);
        } else if(map.scenery.some(p=>Math.hypot(p.x-x,p.y-y)<.55)) return;
        map.scenery.push({sprite,x,y,size,solid});
        if (solid) map.solids[cy*map.w+cx] = true;
      };
      // Replace one-cell foliage with larger transparent canopies and plant clumps.
      if (outdoor.has(map.id)) {
        map.tiles.forEach((tile, i) => {
          const x=i%map.w,y=Math.floor(i/map.w);
          if([32,33,34,35,36,37,39].includes(tile)) {
            map.tiles[i]=map.id==='shrine'||map.id==='river'?1:0;
            if(x>0&&y>0&&x<map.w-1&&y<map.h-1) {
              const sprite = tile===33 ? (map.id==='shrine'?1:3) : tile===37 ? 8 : tile===36 ? 13 : tile===34 ? 5 : 0;
              place(sprite,x,y,sprite<8?2.7:1.25,map.solids[i]);
            }
          }
        });
      }
      // One canonical image per material keeps hue, grain and paving joints uniform.
      // Fine wear belongs to the renderer's sparse detail pass, never a whole-tile swap.
      map.tiles.forEach((tile, i) => {
        const material=map.materials[i];
        if(material==='grass') map.tiles[i]=map.id==='shrine'||map.id==='river'?1:0;
        else if(material==='stone') map.tiles[i]=2;
        else if(material==='dirt') map.tiles[i]=tile===8?8:tile===9?9:11;
        else if(material==='wood') map.tiles[i]=tile===5?5:4;
        else if(material==='slate') map.tiles[i]=3;
      });
      if(outdoor.has(map.id)) {
        // A ragged woodland edge replaces the old repeated square tree border.
        if(map.id!=='river') {
          const edgeTrees=map.id==='shrine'?[1,4,5,7]:map.id==='town'?[0,0,2,3,6]:[0,5,5,7];
          const treeAt=(x,y)=>edgeTrees[Math.floor(hash(Math.round(x),Math.round(y),seed+11)*edgeTrees.length)];
          for(let x=1;x<map.w-1;x+=2.4) {
            place(treeAt(x,0),x,.6,2.8,true);
            place(treeAt(x,map.h-1),x,map.h-1.15,2.7,true);
          }
          for(let y=3;y<map.h-2;y+=2.6) {
            place(treeAt(0,y),.7,y,2.9,true);
            place(treeAt(map.w-1,y),map.w-1.2,y,2.9,true);
          }
        }
        // Small flowers, ferns and tufts form coherent planting rather than noise.
        for(let y=2;y<map.h-2;y++) for(let x=2;x<map.w-2;x++) {
          const i=y*map.w+x;
          if(map.materials[i]!=='grass'||map.solids[i]||hash(x,y,seed+10)>.15) continue;
          const choices=map.id==='shrine'?[11,11,13,10]:map.id==='river'?[12,12,11,9]:[8,9,9,10,11,12];
          place(choices[Math.floor(hash(x,y,seed+4)*choices.length)],x+(hash(x,y,5)-.5)*.35,y+(hash(x,y,8)-.5)*.25,.8+hash(x,y,9)*.5);
        }
        // Fallen leaves and petals also appear on the walkable stone.
        for(let y=2;y<map.h-2;y++) for(let x=2;x<map.w-2;x++) {
          if(map.materials[y*map.w+x]==='stone'&&!map.solids[y*map.w+x]&&hash(x,y,seed+6)<.006) place(15,x,y,.5);
        }
      }
      const clusters = {
        station: [[8,11,17,1.45],[9,17,17,1.1],[11,3,11,1.1],[8,3,16,1.3],[14,11,9,1],[11,23,6,1],[4,24,6,2.8],[7,11,6,2.5],[13,27,17,1.3]],
        town: [[0,14,8,3.1],[2,22,8,2.8],[3,15,21,2.8],[7,22,21,2.6],[8,5,10,1.25],[9,9,10,1],[10,11,10,1.2],[8,25,10,1.2],[10,31,10,1.25],[14,6,18,1.05],[14,28,19,1],[4,32,19,2.6],[8,14,17,1.2],[11,22,17,1.2]],
        shrine: [[1,5,8,3.1],[2,23,9,3],[4,5,17,2.6],[7,22,19,2.8],[11,7,17,1.3],[13,20,18,1.3],[10,8,9,1.3],[11,19,9,1.1],[8,7,20,1.3],[15,15,17,.9]],
        archive: [[14,5,5,1.25],[14,20,4,1.3],[11,5,18,1.2],[15,17,8,1],[15,18,17,.8]],
        tower: [[14,5,9,1.1],[14,18,9,1.1],[13,4,17,1.1],[11,19,16,1.05],[15,9,18,1.15]],
        river: [[6,5,5,3.2],[6,21,5,3.3],[2,30,4,2.9],[4,16,4,2.8],[12,3,7,1.4],[12,8,7,1.3],[12,15,7,1.4],[12,23,7,1.4],[12,30,7,1.4],[12,6,16,1.5],[12,18,16,1.5],[12,29,16,1.5],[9,13,4,1.1],[11,25,4,1.2]]
      };
      (clusters[map.id]||[]).forEach(([sprite,x,y,size])=>{
        const solid=sprite<8; const i=y*map.w+x;
        if(solid&&map.materials[i]!=='grass'&&map.materials[i]!=='dirt') return;
        place(sprite,x,y,size,solid);
      });
      map.scenery.sort((a,b)=>a.y-b.y);
    });
  }
  return { enrich, hash, kind };
});
