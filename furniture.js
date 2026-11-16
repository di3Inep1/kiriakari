/* Integer-cell furniture prefabs. Art, collision and interaction share this geometry. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.KiriFurniture=api;})(globalThis,function(){
  'use strict';
  const catalog={
    lampCabinet:{atlas:'exploration',sprite:0,w:2,d:1,h:2,clearedBy:'lampFound',focus:[.72,.28]},
    dutyDesk:{atlas:'prefab',sprite:2,w:2,d:1,h:1,focus:[.5,.3]},
    parcelShelf:{atlas:'prefab',sprite:9,w:2,d:1,h:1,completedFlag:'parcelTaken',completedSprite:10,focus:[.5,.4]},
    maintenanceBench:{atlas:'prefab',sprite:4,w:2,d:1,h:1,focus:[.5,.35]},
    serviceCounter:{atlas:'prefab',sprite:3,w:3,d:1,h:1},
    waitingBench:{atlas:'prefab',sprite:0,w:3,d:1,h:1},
    sideBench:{atlas:'prefab',sprite:1,w:1,d:3,h:3,facing:'west'},
    ticketCubby:{atlas:'interior',sprite:2,w:1,d:1,h:2},
    luggage:{atlas:'interior',sprite:3,w:1,d:1,h:1},
    wallClock:{atlas:'world',sprite:6,w:1,d:0,h:1,mount:'back-wall',fit:'contain'},
    wallLamp:{atlas:'interior',sprite:7,w:1,d:0,h:1,mount:'back-wall',fit:'contain'},
    repairTable:{atlas:'prefab',sprite:5,w:2,d:2,h:2,completedFlag:'helpedNagi',completedSprite:6,focus:[.5,.3]},
    pasteTable:{atlas:'prefab',sprite:7,w:2,d:2,h:2,focus:[.35,.45]},
    notesTable:{atlas:'prefab',sprite:8,w:2,d:1,h:1,focus:[.5,.5]},
    paperShelf:{atlas:'interior',sprite:4,w:2,d:1,h:2},
    dryingRack:{atlas:'interior',sprite:5,w:3,d:1,h:2},
    stool:{atlas:'prefab',sprite:11,w:1,d:1,h:1},
    stockBasket:{atlas:'interior',sprite:8,w:1,d:1,h:1},
    sideShelf:{atlas:'compact',sprite:6,w:1,d:2,h:2,facing:'west'},
    wardrobe:{atlas:'decor',sprite:0,w:2,d:1,h:2},
    lowCupboard:{atlas:'decor',sprite:1,w:2,d:1,h:1},
    screen:{atlas:'decor',sprite:2,w:2,d:1,h:2},
    sideScreen:{atlas:'decor',sprite:3,w:1,d:2,h:2},
    fern:{atlas:'decor',sprite:4,w:1,d:1,h:1},
    camellia:{atlas:'decor',sprite:5,w:1,d:1,h:1},
    routeBoard:{atlas:'decor',sprite:6,w:2,d:0,h:1,mount:'back-wall'},
    landscape:{atlas:'decor',sprite:7,w:1,d:0,h:1,mount:'back-wall'},
    shojiWindow:{atlas:'decor',sprite:8,w:2,d:0,h:2,mount:'back-wall',focus:[.5,.6]},
    narrowWindow:{atlas:'decor',sprite:9,w:1,d:0,h:2,mount:'back-wall'},
    umbrellaStand:{atlas:'decor',sprite:10,w:1,d:1,h:2},
    coatRack:{atlas:'decor',sprite:11,w:2,d:0,h:1,mount:'back-wall'}
  };
  function place(map,id,kind,x,y){
    const def=catalog[kind];if(!def)throw new Error('Unknown furniture: '+kind);
    if(!Number.isInteger(x)||!Number.isInteger(y))throw new Error('Furniture needs integer cells: '+id);
    if(x<0||x+def.w>map.w||y<0||y+(def.mount?def.h:def.d)>map.h)throw new Error('Furniture outside room: '+id);
    const grid={x,y,w:def.w,d:def.d,h:def.h,top:def.mount?y:y+def.d-def.h};
    if(def.mount)for(const other of map.props.filter(p=>p.mount&&p.grid)){
      const a=other.grid;if(x<a.x+a.w&&x+def.w>a.x&&y<a.top+a.h&&y+def.h>a.top)throw new Error('Overlapping wall fixtures: '+id);
    }
    for(let row=y;row<y+def.d;row++)for(let col=x;col<x+def.w;col++){
      if(map.solids[row*map.w+col])throw new Error('Overlapping furniture: '+id+' at '+col+','+row);
    }
    for(let row=y;row<y+def.d;row++)for(let col=x;col<x+def.w;col++)map.solids[row*map.w+col]=true;
    const prop={...def,id,kind,grid,x:x+Math.floor(def.w/2),y:y+(def.mount?def.h-1:def.d-1)};
    map.props.push(prop);return prop;
  }
  return {catalog,place};
});
