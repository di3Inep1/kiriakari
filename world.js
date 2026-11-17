/* Orthographic tile rendering and camera. The world is made of real map cells. */
(function (root) {
  'use strict';
  const image = new Image(); image.src = 'assets/tileset.png';
  const foliage = new Image(); foliage.src = 'assets/foliage-variety.png';
  const mountedImage = new Image(); mountedImage.src = 'assets/mounted-props.png';
  const worldProps = new Image(); worldProps.src = 'assets/world-props.png';
  const stoneGrain = new Image(); stoneGrain.src = 'assets/stone-grain.png';
  const stationKit=new Image();stationKit.src='assets/station-fixtures-v2.png';
  const craneImage=new Image();craneImage.src='assets/hanging-crane.png';
  const explorationImage=new Image();explorationImage.src='assets/exploration-props.png';
  const explorationCleared=new Image();explorationCleared.src='assets/exploration-props-cleared.png';
  const nativeFurniture={};for(const size of [32,48]){const sheet=new Image();sheet.src='assets/interior-native-'+size+'.png?v=shrine-20261117';nativeFurniture[size]=sheet;}
  const nativeItems={};for(const size of [12,16]){const sheet=new Image();sheet.src='assets/item-icons-'+size+'.png';nativeItems[size]=sheet;}
  const floorGrains=new Image();floorGrains.src='assets/shrine-library-materials.png';
  const shrinePaving={},shrineFringe={};for(const size of [32,48]){const sheet=new Image();sheet.src='assets/shrine-paving-v2-native-'+size+'.png';shrinePaving[size]=sheet;const edge=new Image();edge.src='assets/shrine-fringe-native-'+size+'.png';shrineFringe[size]=edge;}
  const woodGrain=new Image();woodGrain.src='assets/interior-wood-grain.png';
  const tatamiImage=new Image();tatamiImage.src='assets/tatami-mat.png';let tatamiBounds=null;
  const view = { tile: 48, x: 0, y: 0, width: 1, height: 1, zone: 'station' };
  const canvas = document.getElementById('tile-map'), ctx = canvas.getContext('2d');
  const scenery = document.createElement('div'); scenery.id = 'scenery'; scenery.setAttribute('aria-hidden','true');
  document.getElementById('world').appendChild(scenery);
  const furniture = document.createElement('div'); furniture.id='furniture';furniture.setAttribute('aria-hidden','true');document.getElementById('world').appendChild(furniture);
  const buildings=document.createElement('div');buildings.id='buildings';buildings.setAttribute('aria-hidden','true');document.getElementById('world').appendChild(buildings);
  const depth=(y,bias=0)=>Math.round((y+.92)*100)+100+bias;
  const buildingAt=(map,x,y)=>map.buildings.find(b=>x>=b.x&&x<b.x+b.width&&y>=b.y&&y<b.frontY);
  let buildingNodes=[],buildingKey='';
  let sceneryZone = null, sceneryNodes = [];
  let propNodes = [];
  const pavingCache=new Map(), contextPatterns=new WeakMap();
  const timberCache=new Map();
  const quietFloorCache=new Map();
  function quietFloorUnit(material,size){
    const key=material+':'+size+':'+floorGrains.naturalWidth;if(quietFloorCache.has(key))return quietFloorCache.get(key);
    const wood=material==='library-wood',unit=document.createElement('canvas');unit.width=size*(wood?6:4);unit.height=size*(wood?1:2);const p=unit.getContext('2d');p.imageSmoothingEnabled=false;
    p.fillStyle=wood?'#6e5541':material==='tower-stone'?'#4f5a61':'#83877a';p.fillRect(0,0,unit.width,unit.height);
    if(floorGrains.complete&&floorGrains.naturalWidth){const sw=floorGrains.naturalWidth/2;p.globalAlpha=wood?.24:.17;p.drawImage(floorGrains,wood?sw:0,0,sw,floorGrains.naturalHeight,0,0,unit.width,unit.height);p.globalAlpha=1;}
    if(wood){const row=size/4;for(let y=0;y<unit.height;y+=row){p.fillStyle='rgba(28,22,19,.32)';p.fillRect(0,y,unit.width,1);p.fillStyle='rgba(218,193,153,.09)';p.fillRect(0,y+1,unit.width,1);for(let x=((y/row)%2)*size*1.5;x<unit.width;x+=size*3){p.fillStyle='rgba(28,22,19,.27)';p.fillRect(x,y,1,row);}}}
    else{for(let row=0;row<2;row++){const y=row*size;p.fillStyle='rgba(28,36,36,.28)';p.fillRect(0,y,unit.width,1);p.fillStyle='rgba(219,222,203,.12)';p.fillRect(0,y+1,unit.width,1);for(let x=row*size;x<unit.width;x+=size*2){p.fillStyle='rgba(28,36,36,.28)';p.fillRect(x,y,1,size);}}}
    quietFloorCache.set(key,unit);return unit;
  }
  let dpr = 1;
  function resize() {
    const rect = document.getElementById('world').getBoundingClientRect();
    if (!rect.width) return;
    view.width = Math.round(rect.width); view.height = Math.round(rect.height);
    view.tile = rect.width < 700 ? 32 : 48;
    dpr = Math.min(devicePixelRatio || 1, 2); canvas.width = view.width * dpr; canvas.height = view.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingEnabled = false;
    document.getElementById('world').style.setProperty('--tile-size', view.tile + 'px');
  }
  function project(point) { return { x: Math.round((point.x + .5 - view.x) * view.tile), y: Math.round((point.y + .92 - view.y) * view.tile) }; }
  function unproject(x, y) { return { x: Math.floor(x / view.tile + view.x), y: Math.floor(y / view.tile + view.y) }; }
  function pavingUnit(size) {
    if(pavingCache.has(size)) return pavingCache.get(size);
    const bw=Math.max(4,Math.round(size/3)),bh=Math.max(3,Math.round(size/4));
    const unit=document.createElement('canvas');unit.width=bw*2;unit.height=bh*2;
    const pen=unit.getContext('2d');pen.imageSmoothingEnabled=false;pen.fillStyle='#46534f';pen.fillRect(0,0,unit.width,unit.height);
    for(let row=0;row<2;row++) for(let col=-1;col<=2;col++) {
      const x=col*bw+(row%2?Math.round(bw/2):0),y=row*bh;
      pen.fillStyle='#727b72';pen.fillRect(x+1,y+1,bw-1,bh-1);
      if(stoneGrain.complete&&stoneGrain.naturalWidth) {
        pen.globalAlpha=.67;
        pen.drawImage(stoneGrain,0,0,stoneGrain.naturalWidth,stoneGrain.naturalHeight,x+1,y+1,bw-1,bh-1);pen.globalAlpha=1;
      }
      pen.fillStyle='rgba(224,229,211,.12)';pen.fillRect(x+1,y+1,bw-1,1);
      pen.fillStyle='rgba(24,39,36,.16)';pen.fillRect(x+1,y+bh-1,bw-1,1);
    }
    pavingCache.set(size,unit);return unit;
  }
  function timberUnit(size){
    if(timberCache.has(size))return timberCache.get(size);
    const plank=size*3,row=Math.max(3,Math.round(size/4)),unit=document.createElement('canvas');unit.width=plank*2;unit.height=row*2;
    const pen=unit.getContext('2d');pen.imageSmoothingEnabled=false;pen.fillStyle='#493c34';pen.fillRect(0,0,unit.width,unit.height);
    for(let r=0;r<2;r++)for(let c=-1;c<3;c++){
      const x=c*plank+(r%2?plank/2:0),y=r*row;
      pen.fillStyle='#715b49';pen.fillRect(x+1,y+1,plank-1,row-1);pen.globalAlpha=.72;
      pen.drawImage(woodGrain,0,0,woodGrain.naturalWidth,woodGrain.naturalHeight,x+1,y+1,plank-1,row-1);pen.globalAlpha=1;
      pen.fillStyle='rgba(237,217,190,.07)';pen.fillRect(x+1,y+1,plank-1,1);
    }
    timberCache.set(size,unit);return unit;
  }
  function groundMaterial(map,index){
    if(map.id==='shrine'&&map.materials[index]==='stone')return 'shrine-stone';
    if(map.id==='archive'&&map.tiles[index]===31)return 'library-exit';
    if(map.id==='archive'&&map.materials[index]==='wood')return 'library-wood';
    if(map.id==='tower'&&map.materials[index]==='slate')return 'tower-stone';
    if(['station-office','town-workshop'].includes(map.id)){if(map.tiles[index]===31)return 'interior-exit';if(map.materials[index]==='wood')return 'timber';}
    return map.materials[index];
  }
  function drawTatami(pen,map,size,originX=0,originY=0){
    if(!map.tatami.length||!tatamiImage.complete||!tatamiImage.naturalWidth)return;
    if(!tatamiBounds){
      const sample=document.createElement('canvas');sample.width=tatamiImage.naturalWidth;sample.height=tatamiImage.naturalHeight;
      const scan=sample.getContext('2d');scan.drawImage(tatamiImage,0,0);const pixels=scan.getImageData(0,0,sample.width,sample.height).data;
      let minX=sample.width,minY=sample.height,maxX=0,maxY=0;
      for(let y=0;y<sample.height;y++)for(let x=0;x<sample.width;x++)if(pixels[(y*sample.width+x)*4+3]>180){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
      tatamiBounds={x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1};
    }
    const b=tatamiBounds;map.tatami.forEach(mat=>pen.drawImage(tatamiImage,b.x,b.y,b.w,b.h,mat.x*size-originX,mat.y*size-originY,mat.width*size,mat.height*size));
  }
  function texture(pen, tile, x, y, size, material, originX=0,originY=0) {
    if(material==='shrine-stone'&&shrinePaving[view.tile].naturalWidth){
      let patterns=contextPatterns.get(pen);if(!patterns){patterns=new Map();contextPatterns.set(pen,patterns);}
      const key='shrine-paving:'+size+':'+view.tile,source=shrinePaving[view.tile];
      if(!patterns.has(key)){if(size===view.tile)patterns.set(key,pen.createPattern(source,'repeat'));else{const small=document.createElement('canvas');small.width=small.height=size*6;const p=small.getContext('2d');p.imageSmoothingEnabled=false;p.drawImage(source,0,0,small.width,small.height);patterns.set(key,pen.createPattern(small,'repeat'));}}
      const pattern=patterns.get(key);pattern.setTransform(new DOMMatrix().translate(-originX,-originY));pen.fillStyle=pattern;pen.fillRect(x,y,size,size);return;
    }
    if(material==='shrine-stone'||material==='library-wood'||material==='tower-stone'){
      let patterns=contextPatterns.get(pen);if(!patterns){patterns=new Map();contextPatterns.set(pen,patterns);}
      const key=material+':'+size+':'+floorGrains.naturalWidth;
      if(!patterns.has(key))patterns.set(key,pen.createPattern(quietFloorUnit(material,size),'repeat'));
      const pattern=patterns.get(key);pattern.setTransform(new DOMMatrix().translate(-originX,-originY));pen.fillStyle=pattern;pen.fillRect(x,y,size,size);return;
    }
    if(material==='interior-exit'||material==='library-exit'){
      // Continue the room floor through a cutaway doorway, without the old black-backed tile.
      texture(pen,4,x,y,size,material==='library-exit'?'library-wood':'timber',originX,originY);
      const post=Math.max(1,Math.round(size/12)),sill=Math.max(2,Math.round(size/12));
      pen.fillStyle='#73563b';pen.fillRect(x,y,post,size);pen.fillRect(x+size-post,y,post,size);
      pen.fillStyle='#a28660';pen.fillRect(x+post,y+size-sill,size-post*2,sill);
      return;
    }
    if((material==='stone'&&stoneGrain.complete&&stoneGrain.naturalWidth)||(material==='timber'&&woodGrain.complete&&woodGrain.naturalWidth)) {
      let patterns=contextPatterns.get(pen);if(!patterns) {patterns=new Map();contextPatterns.set(pen,patterns);}
      const key=material+':'+size;
      if(!patterns.has(key)) patterns.set(key,pen.createPattern(material==='timber'?timberUnit(size):pavingUnit(size),'repeat'));
      const pattern=patterns.get(key);pattern.setTransform(new DOMMatrix().translate(-originX,-originY));
      pen.fillStyle=pattern;pen.fillRect(x,y,size,size);return;
    }
    const source=image, columns=8, rows=8, id=tile;
    const sw=source.naturalWidth/columns, sh=source.naturalHeight/rows;
    const inset=material==='object'?1:2;
    pen.drawImage(source,(id%columns)*sw+inset,Math.floor(id/columns)*sh+inset,sw-inset*2,sh-inset*2,x,y,size,size);
  }
  function blendEdge(map,x,y,px,py) {
    if(map.id==='shrine')return; // The shrine uses a continuous two-sided moss fringe below.
    const index=y*map.w+x, material=map.materials[index], size=view.tile;
    if(material!=='stone'&&material!=='dirt') return;
    [[0,-1], [1,0], [0,1], [-1,0]].forEach(([dx,dy], side)=>{
      const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=map.w||ny>=map.h) return;
      const i=ny*map.w+nx;
      if(map.materials[i]!=='grass') return;
      ctx.save();ctx.translate(px,py);ctx.translate(size/2,size/2);ctx.rotate(side*Math.PI/2);ctx.translate(-size/2,-size/2);
      ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(size,0);
      for(let n=8;n>=0;n--) ctx.lineTo(n*size/8,size*(.035+((x*7+y*11+n*13)%5)*.008));
      ctx.closePath();ctx.clip();ctx.translate(size/2,size/2);ctx.rotate(-side*Math.PI/2);ctx.translate(-size/2,-size/2);
      texture(ctx,map.tiles[i],0,0,size,'grass');ctx.restore();
    });
  }
  function drawShrineEdges(pen,map,size,originX=0,originY=0){
    const source=shrineFringe[view.tile];if(map.id!=='shrine'||!source.naturalWidth)return;
    // Draw after every ground cell: the fringe spans both sides of the boundary.
    // Its source position follows world coordinates, including opposite-facing edges.
    for(let y=0;y<map.h;y++)for(let x=0;x<map.w;x++){
      if(map.materials[y*map.w+x]!=='stone')continue;
      [[0,-1],[1,0],[0,1],[-1,0]].forEach(([dx,dy],side)=>{
        const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=map.w||ny>=map.h||map.materials[ny*map.w+nx]!=='grass')return;
        const along=[x,y,-x-1,-y-1][side],frame=((along%6)+6)%6;
        pen.save();pen.translate((x+.5)*size-originX,(y+.5)*size-originY);pen.rotate(side*Math.PI/2);
        pen.drawImage(source,frame*view.tile,0,view.tile,view.tile*2,-size/2,-size*1.5,size,size*2);pen.restore();
      });
    }
  }
  function fineWear(map,x,y,px,py) {
    const material=map.materials[y*map.w+x],r=root.KiriScenery.hash(x,y,91);
    if(!['stone','slate','wood'].includes(material)||r>.045||map.solids[y*map.w+x]) return;
    const size=view.tile,fx=px+size*(.27+root.KiriScenery.hash(x,y,92)*.4),fy=py+size*(.32+root.KiriScenery.hash(x,y,93)*.32);
    // Small low-contrast scratches cover only a few pixels of an occasional tile.
    ctx.strokeStyle='rgba(13,30,33,.12)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(fx,fy);
    ctx.lineTo(fx+size*.075,fy+size*.025);ctx.lineTo(fx+size*.12,fy-size*.02);ctx.stroke();
  }
  function propFrame(prop,solved=[],progress={}){
    if(prop.atlas==='items'){const size=view.tile===32?12:16;return {source:nativeItems[size],sprite:prop.sprite,native:true,nativeItem:true,rect:{x:prop.sprite%4*size,y:Math.floor(prop.sprite/4)*size,w:size,h:size}};}
    if(prop.grid){
      const art=root.KiriInteriorArt,variant=(prop.completedFlag&&progress.flags?.[prop.completedFlag]||prop.completedPuzzle&&solved.includes(prop.completedPuzzle))?1:0,frame=art.sprites[prop.kind][variant];
      return {source:nativeFurniture[view.tile],sprite:variant,native:true,rect:{x:frame.col*art.cell*view.tile,y:frame.row*art.cell*view.tile,w:frame.w*view.tile,h:frame.h*view.tile}};
    }
    const cleared=(prop.clearedBy&&progress.flags?.[prop.clearedBy])||(prop.onlyItemInEcho&&progress.phase!=='echo');
    const source=prop.atlas==='exploration'?(cleared?explorationCleared:explorationImage):prop.atlas==='world'?worldProps:prop.atlas==='station'?stationKit:prop.atlas==='crane'?craneImage:mountedImage;
    const columns=['world','exploration'].includes(prop.atlas)?4:prop.atlas==='crane'?1:2,rows=prop.atlas==='crane'?1:2;
    const sprite=prop.completedFlag&&progress.flags?.[prop.completedFlag]?prop.completedSprite:prop.gate&&solved.includes(prop.gate)?prop.openSprite:prop.sprite;
    return {source,columns,rows,sprite};
  }
  function drawPlatform(pen,map,size,originX=0,originY=0){
    if(!stationKit.complete||!stationKit.naturalWidth)return;
    const sw=stationKit.naturalWidth/2,sh=stationKit.naturalHeight/2;
    map.platformEdges.forEach(edge=>{for(let x=edge.x;x<edge.x+edge.width;x++)pen.drawImage(stationKit,3,sh+3,sw-6,sh-6,x*size-originX,edge.y*size-originY,size,size);});
  }
  // Roofs have their own silhouette; collision remains the wall footprint.
  // All bitmap surfaces reuse the original image_gen tileset.
  function drawBuildings(pen,map,size,originX=0,originY=0){
    map.buildings.forEach(b=>{
      const x=b.x*size-originX,y=b.y*size-originY,w=b.width*size;
      const top=y+size*.1,bottom=(b.eaveY)*size-originY,lip=size*.4;
      const polygon=()=>{pen.beginPath();pen.moveTo(x+size*.25,top);pen.lineTo(x+w-size*.25,top);pen.lineTo(x+w+lip,bottom);pen.lineTo(x-lip,bottom);pen.closePath();};
      // Narrow cast shadow and finished wall corners beneath the projecting roof.
      pen.fillStyle='rgba(5,12,19,.28)';pen.fillRect(x+w,bottom-size*.1,size*.13,(b.frontY-b.eaveY)*size+size*.18);
      for(const edge of [x,x+w-size*.09]){
        pen.fillStyle='#1c2021';pen.fillRect(edge,bottom,size*.09,(b.frontY-b.eaveY)*size);
        pen.fillStyle='#66513a';pen.fillRect(edge+size*.025,bottom,Math.max(1,size*.025),(b.frontY-b.eaveY)*size);
      }
      pen.save();polygon();pen.clip();
      for(let row=0;row<b.roofRows;row++)for(let col=-1;col<=b.width;col++)texture(pen,b.roof,x+col*size,y+row*size,size,'object');
      // Slight shading at the side returns gives the tiled plane a definite edge.
      const shade=pen.createLinearGradient(x-lip,0,x+w+lip,0);shade.addColorStop(0,'rgba(6,14,23,.45)');shade.addColorStop(.06,'rgba(6,14,23,0)');shade.addColorStop(.94,'rgba(6,14,23,0)');shade.addColorStop(1,'rgba(6,14,23,.45)');pen.fillStyle=shade;pen.fillRect(x-lip,y,w+lip*2,b.roofRows*size);
      pen.restore();
      // Dark bargeboards wrap both diagonal sides; the ridge ends are capped.
      pen.lineJoin='round';pen.strokeStyle='#1b2228';pen.lineWidth=Math.max(2,size*.075);polygon();pen.stroke();
      pen.strokeStyle=b.roof===18?'#a26c58':'#647b88';pen.lineWidth=Math.max(1,size*.025);
      pen.beginPath();pen.moveTo(x-lip+2,bottom-2);pen.lineTo(x+size*.25,top+2);pen.lineTo(x+w-size*.25,top+2);pen.lineTo(x+w+lip-2,bottom-2);pen.stroke();
      // Sample only the tiled fascia, excluding the wall baked into atlas cells 26/27.
      const sw=image.naturalWidth/8,sh=image.naturalHeight/8,id=b.roof===18?26:27;
      const left=x-lip,right=x+w+lip;
      pen.save();pen.beginPath();pen.rect(left,bottom-size*.16,right-left,size*.32);pen.clip();
      for(let px=left;px<right;px+=size)pen.drawImage(image,id%8*sw+2,Math.floor(id/8)*sh+sh*.23,sw-4,sh*.32,px,bottom-size*.16,size,size*.32);
      pen.restore();
      pen.fillStyle='#20232a';pen.fillRect(left,bottom+size*.14,right-left,Math.max(1,size*.045));
    });
  }
  function drawScenery(map,solved,progress) {
    if(sceneryZone!==map.id) {
      sceneryZone=map.id; scenery.replaceChildren();
      sceneryNodes=map.scenery.map(plant=>{
        const node=document.createElement('div');node.className='scenery-sprite'+(plant.sprite<8?' tree':' plant')+(plant.sprite===15?' leaves':'');
        node.style.setProperty('--plant-scale',plant.size);
        node.style.zIndex=String(plant.sprite===15?0:depth(plant.y,-1));
        node.dataset.groundY=String(plant.y);node.dataset.sprite=String(plant.sprite);
        const art=document.createElement('span');art.className='scenery-art';
        art.style.backgroundPosition=`${plant.sprite%4*100/3}% ${Math.floor(plant.sprite/4)*100/3}%`;
        const shadow=document.createElement('span');shadow.className='scenery-shadow';
        node.append(shadow,art);scenery.appendChild(node);return {plant,node};
      });
      furniture.replaceChildren();
      propNodes=map.props.map(prop=>{
        const node=document.createElement('canvas');node.className='scene-prop';node.dataset.prop=prop.id;
        node.width=prop.grid?prop.grid.w*view.tile:prop.atlas==='items'?(view.tile===32?12:16):256;node.height=prop.grid?prop.grid.h*view.tile:node.width;
        if(prop.phase)node.classList.add('memory-prop');
        if(prop.atlas==='items')node.style.transform=prop.surfaceOn?'translate(-50%,-50%)':'translate(-50%,-100%)';
        if(prop.grid){node.classList.add('grid-furniture');node.dataset.footprint=prop.grid.w+'x'+prop.grid.d;node.dataset.cellX=prop.grid.x;node.dataset.cellY=prop.grid.y;node.style.transform='none';}
        else node.style.setProperty('--prop-scale',prop.size);
        const pose=root.KiriMaps.attachmentPose(map.id,prop);
        node.style.zIndex=String(pose?depth(pose.building.frontY-.92,1):depth(root.KiriMaps.propGroundY(map.id,prop),prop.surfaceOn?1:prop.grid?0:-1));
        let thread=null;if(pose){thread=document.createElement('span');thread.className='roof-thread';thread.dataset.attachment=prop.attachment.building;thread.style.zIndex=node.style.zIndex;furniture.appendChild(thread);}
        furniture.appendChild(node);return {prop,node,thread,painted:null};
      });
    }
    sceneryNodes.forEach(({plant,node})=>{
      const p=project(plant),margin=plant.size*view.tile;
      node.hidden=p.x < -margin||p.x>view.width+margin||p.y < -margin||p.y>view.height+margin;
      if(!node.hidden) { node.style.left=p.x+'px';node.style.top=p.y+'px'; }
    });
    propNodes.forEach(item=>{
      const {prop,node,thread}=item,frame=propFrame(prop,solved,progress),key=prop.atlas+'-'+frame.sprite+'-'+(frame.native?view.tile:frame.source===explorationCleared?'cleared':'original');
      const visible=root.KiriCore.inPhase(progress,prop.phase);
      if(visible&&node.hidden){node.classList.remove('revealed');void node.offsetWidth;node.classList.add('revealed');}node.hidden=!visible;if(thread)thread.hidden=!visible;if(!visible)return;
      if(frame.nativeItem){if(node.width!==frame.rect.w){node.width=frame.rect.w;node.height=frame.rect.h;item.painted=null;}node.style.width=frame.rect.w+'px';node.style.height=frame.rect.h+'px';}
      if(prop.grid&&(node.width!==prop.grid.w*view.tile||node.height!==prop.grid.h*view.tile)){node.width=prop.grid.w*view.tile;node.height=prop.grid.h*view.tile;item.painted=null;}
      if(item.painted!==key&&frame.source.complete&&frame.source.naturalWidth){
        const {source,columns,rows,sprite}=frame,pen=node.getContext('2d');
        pen.imageSmoothingEnabled=false;pen.clearRect(0,0,node.width,node.height);
        if(prop.grid||frame.nativeItem)drawGridFrame(pen,frame,0,0,node.width,node.height);else{const sw=source.naturalWidth/columns,sh=source.naturalHeight/rows;pen.drawImage(source,(sprite%columns)*sw+4,Math.floor(sprite/columns)*sh+4,sw-8,sh-8,0,0,256,256);}item.painted=key;
      }
      if(prop.grid){const g=prop.grid;node.style.left=Math.round((g.x-view.x)*view.tile)+'px';node.style.top=Math.round((g.top-view.y)*view.tile)+'px';node.style.width=g.w*view.tile+'px';node.style.height=g.h*view.tile+'px';return;}
      const pose=root.KiriMaps.attachmentPose(map.id,prop),surface=root.KiriMaps.surfacePose(map.id,prop),p=surface?project(surface):pose?project({x:pose.x-.5,y:pose.bottomY-.92}):project(prop);
      node.style.left=p.x+'px';node.style.top=p.y+'px';
      if(thread){const a=project({x:pose.x-.5,y:pose.threadY-.92});thread.style.left=a.x+'px';thread.style.top=a.y+'px';thread.style.height=Math.max(0,(pose.bottomY-prop.size*.5-pose.threadY)*view.tile)+'px';}
    });
  }
  function drawGridFrame(pen,frame,x,y,width,height){
    // Gameplay canvas and source rectangle have identical pixel dimensions.
    // Only map thumbnails deliberately use a smaller destination.
    const r=frame.rect;pen.imageSmoothingEnabled=false;
    pen.drawImage(frame.source,r.x,r.y,r.w,r.h,x,y,width,height);
  }
  function paintBuilding(pen,map,b,size,originX,originY){
    for(let y=b.eaveY;y<b.frontY;y++)for(let x=b.x;x<b.x+b.width;x++)texture(pen,map.tiles[y*map.w+x],x*size-originX,y*size-originY,size,'object');
    drawBuildings(pen,{buildings:[b]},size,originX,originY);
  }
  function drawBuildingLayer(map,phase){
    const size=view.tile,key=map.id+':'+size+':'+phase;
    if(key!==buildingKey){
      buildingKey=key;buildings.replaceChildren();
      buildingNodes=map.buildings.map(b=>{
        const node=document.createElement('canvas');node.className='building-sprite';node.dataset.building=b.id;
        node.width=Math.ceil((b.width+1.2)*size);node.height=Math.ceil((b.height+.4)*size);
        node.style.zIndex=String(depth(b.frontY-.92));
        const pen=node.getContext('2d');pen.imageSmoothingEnabled=false;
        paintBuilding(pen,map,b,size,(b.x-.6)*size,(b.y-.1)*size);
        pen.globalCompositeOperation='source-atop';pen.fillStyle=phase==='echo'?'rgba(226,210,174,.07)':'rgba(5,22,38,.22)';pen.fillRect(0,0,node.width,node.height);
        buildings.appendChild(node);return {b,node};
      });
    }
    buildingNodes.forEach(({b,node})=>{node.style.left=Math.round((b.x-.6-view.x)*size)+'px';node.style.top=Math.round((b.y-.1-view.y)*size)+'px';});
  }
  function draw(zone, player, time, phase,solved=[],progress={}) {
    const map = root.KiriMaps.maps[zone]; view.zone = zone;
    const cols = view.width / view.tile, rows = view.height / view.tile;
    const camera = (p, span, extent) => extent < span ? -(span - extent) / 2 : Math.max(0, Math.min(extent - span, p + .5 - span / 2));
    view.x = camera(player.x, cols, map.w); view.y = camera(player.y, rows, map.h);
    const originX=Math.round(view.x*view.tile),originY=Math.round(view.y*view.tile);
    view.x=originX/view.tile;view.y=originY/view.tile;
    ctx.fillStyle = '#07151d'; ctx.fillRect(0, 0, view.width, view.height);
    if (!image.complete || !image.naturalWidth) return;
    for (let y = Math.max(0, Math.floor(view.y)); y < Math.min(map.h, Math.ceil(view.y + rows)); y++) {
      for (let x = Math.max(0, Math.floor(view.x)); x < Math.min(map.w, Math.ceil(view.x + cols)); x++) {
        const id = map.tiles[y * map.w + x];
        const px=x*view.tile-originX,py=y*view.tile-originY;
        const building=buildingAt(map,x,y);
        texture(ctx,building?map.floor:id,px,py,view.tile,building?'grass':groundMaterial(map,y*map.w+x),originX,originY);
        blendEdge(map,x,y,px,py);
        fineWear(map,x,y,px,py);
        if(map.materials[y*map.w+x]!=='object'&&y>0&&[17,21,22,25,28].includes(map.tiles[(y-1)*map.w+x])) {
          const shade=ctx.createLinearGradient(0,py,0,py+view.tile*.5);shade.addColorStop(0,'rgba(5,15,23,.32)');shade.addColorStop(1,'rgba(5,15,23,0)');
          ctx.fillStyle=shade;ctx.fillRect(px,py,view.tile,view.tile*.5);
        }
        if (id === 6 || id === 7) { ctx.fillStyle = `rgba(102,183,206,${.04 + Math.sin(time * .0015 + x * .7 + y * .3) * .035})`; ctx.fillRect(px, py, view.tile, view.tile); }
      }
    }
    drawShrineEdges(ctx,map,view.tile,originX,originY);drawTatami(ctx,map,view.tile,originX,originY);drawPlatform(ctx,map,view.tile,originX,originY);
    ctx.fillStyle = phase === 'echo' ? 'rgba(226,210,174,.07)' : 'rgba(5,22,38,.22)'; ctx.fillRect(0, 0, view.width, view.height);
    map.lights.forEach(({x,y})=>{
      const p = project({ x, y: y - .35 }), radius = view.tile * 1.7;
      if (p.x < -radius || p.x > view.width + radius || p.y < -radius || p.y > view.height + radius) return;
      const gradient = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, radius);
      gradient.addColorStop(0, 'rgba(255,194,93,.20)'); gradient.addColorStop(1, 'rgba(255,194,93,0)');
      ctx.fillStyle = gradient; ctx.fillRect(p.x - radius, p.y - radius, radius * 2, radius * 2);
    });
    drawBuildingLayer(map,phase);drawScenery(map,solved,progress);
  }
  function thumbnail(zone, output,solved=[],progress={}) {
    const map = root.KiriMaps.maps[zone], size = 8;
    output.width = map.w * size; output.height = map.h * size;
    const pen = output.getContext('2d'); pen.imageSmoothingEnabled = false;
    if (!image.complete || !image.naturalWidth) return;
    map.tiles.forEach((tile, i) => {const x=i%map.w,y=Math.floor(i/map.w),building=buildingAt(map,x,y);texture(pen,building?map.floor:tile,x*size,y*size,size,building?'grass':groundMaterial(map,i));});
    drawShrineEdges(pen,map,size);drawTatami(pen,map,size);drawPlatform(pen,map,size);
    const layers=map.buildings.map(b=>({z:depth(b.frontY-.92),draw:()=>paintBuilding(pen,map,b,size,0,0)}));
    if(foliage.complete&&foliage.naturalWidth) {
      const sw=foliage.naturalWidth/4,sh=foliage.naturalHeight/4;
      map.scenery.forEach(p=>layers.push({z:p.sprite===15?0:depth(p.y,-1),draw:()=>{
        const extent=p.size*size;
        pen.drawImage(foliage,p.sprite%4*sw,Math.floor(p.sprite/4)*sh,sw,sh,(p.x+.5)*size-extent*.5,(p.y+.92)*size-extent*.96,extent,extent);
      }}));
    }
    map.props.filter(p=>root.KiriCore.inPhase(progress,p.phase)).forEach(p=>{const pose=root.KiriMaps.attachmentPose(zone,p),g=p.grid;layers.push({z:pose?depth(pose.building.frontY-.92,1):depth(root.KiriMaps.propGroundY(zone,p),p.surfaceOn?1:g?0:-1),draw:()=>{const frame=propFrame(p,solved,progress),{source,columns,rows,sprite}=frame;if(!source.complete||!source.naturalWidth)return;if(g){drawGridFrame(pen,frame,g.x*size,g.top*size,g.w*size,g.h*size);return;}if(frame.nativeItem){const extent=p.size*size,surface=root.KiriMaps.surfacePose(zone,p),x=(surface?surface.x+.5:p.x+.5)*size,y=(surface?surface.y+.92:p.y+.92)*size;drawGridFrame(pen,frame,x-extent/2,y-(surface?extent/2:extent),extent,extent);return;}const sw=source.naturalWidth/columns,sh=source.naturalHeight/rows,extent=p.size*size,x=pose?pose.x:p.x+.5,y=pose?pose.bottomY:p.y+.92;pen.drawImage(source,sprite%columns*sw+4,Math.floor(sprite/columns)*sh+4,sw-8,sh-8,x*size-extent*.5,y*size-extent*.985,extent,extent);}});});
    layers.sort((a,b)=>a.z-b.z).forEach(layer=>layer.draw());
  }
  root.KiriRenderer = { view, resize, draw, project, unproject, thumbnail, depth, assetsReady:()=>[image,foliage,mountedImage,worldProps,stoneGrain,stationKit,craneImage,explorationImage,explorationCleared,...Object.values(nativeFurniture),...Object.values(nativeItems),...Object.values(shrinePaving),...Object.values(shrineFringe),floorGrains,woodGrain,tatamiImage].every(i=>i.complete&&i.naturalWidth>0)&&!!root.KiriLighting?.assetsReady() };
})(globalThis);
