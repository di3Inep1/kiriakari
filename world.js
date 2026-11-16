/* Orthographic tile rendering and camera. The world is made of real map cells. */
(function (root) {
  'use strict';
  const image = new Image(); image.src = 'assets/tileset.png';
  const foliage = new Image(); foliage.src = 'assets/foliage-variety.png';
  const mountedImage = new Image(); mountedImage.src = 'assets/mounted-props.png';
  const worldProps = new Image(); worldProps.src = 'assets/world-props.png';
  const stoneGrain = new Image(); stoneGrain.src = 'assets/stone-grain.png';
  const view = { tile: 48, x: 0, y: 0, width: 1, height: 1, zone: 'station' };
  const canvas = document.getElementById('tile-map'), ctx = canvas.getContext('2d');
  const scenery = document.createElement('div'); scenery.id = 'scenery'; scenery.setAttribute('aria-hidden','true');
  document.getElementById('world').appendChild(scenery);
  const furniture = document.createElement('div'); furniture.id='furniture';furniture.setAttribute('aria-hidden','true');document.getElementById('world').appendChild(furniture);
  let sceneryZone = null, sceneryNodes = [];
  let propNodes = [];
  const pavingCache=new Map(), contextPatterns=new WeakMap();
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
  function texture(pen, tile, x, y, size, material, originX=0,originY=0) {
    if(material==='stone'&&stoneGrain.complete&&stoneGrain.naturalWidth) {
      let patterns=contextPatterns.get(pen);if(!patterns) {patterns=new Map();contextPatterns.set(pen,patterns);}
      if(!patterns.has(size)) patterns.set(size,pen.createPattern(pavingUnit(size),'repeat'));
      const pattern=patterns.get(size);pattern.setTransform(new DOMMatrix().translate(-originX,-originY));
      pen.fillStyle=pattern;pen.fillRect(x,y,size,size);return;
    }
    const source=image, columns=8, rows=8, id=tile;
    const sw=source.naturalWidth/columns, sh=source.naturalHeight/rows;
    const inset=material==='object'?1:2;
    pen.drawImage(source,(id%columns)*sw+inset,Math.floor(id/columns)*sh+inset,sw-inset*2,sh-inset*2,x,y,size,size);
  }
  function blendEdge(map,x,y,px,py) {
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
  function fineWear(map,x,y,px,py) {
    const material=map.materials[y*map.w+x],r=root.KiriScenery.hash(x,y,91);
    if(!['stone','slate','wood'].includes(material)||r>.045||map.solids[y*map.w+x]) return;
    const size=view.tile,fx=px+size*(.27+root.KiriScenery.hash(x,y,92)*.4),fy=py+size*(.32+root.KiriScenery.hash(x,y,93)*.32);
    // Small low-contrast scratches cover only a few pixels of an occasional tile.
    ctx.strokeStyle='rgba(13,30,33,.12)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(fx,fy);
    ctx.lineTo(fx+size*.075,fy+size*.025);ctx.lineTo(fx+size*.12,fy-size*.02);ctx.stroke();
  }
  function drawScenery(map) {
    if(sceneryZone!==map.id) {
      sceneryZone=map.id; scenery.replaceChildren();
      sceneryNodes=map.scenery.map(plant=>{
        const node=document.createElement('div');node.className='scenery-sprite'+(plant.sprite<8?' tree':' plant')+(plant.sprite===15?' leaves':'');
        node.style.setProperty('--plant-scale',plant.size);
        node.style.zIndex=String(Math.round(plant.y*5)+8);
        const art=document.createElement('span');art.className='scenery-art';
        art.style.backgroundPosition=`${plant.sprite%4*100/3}% ${Math.floor(plant.sprite/4)*100/3}%`;
        const shadow=document.createElement('span');shadow.className='scenery-shadow';
        node.append(shadow,art);scenery.appendChild(node);return {plant,node};
      });
      furniture.replaceChildren();
      propNodes=map.props.map(prop=>{
        const node=document.createElement('canvas');node.className='scene-prop';node.dataset.prop=prop.id;
        node.width=256;node.height=256;node.style.setProperty('--prop-scale',prop.size);
        node.style.zIndex=String(Math.round(prop.y*5)+(prop.hanging?12:7));
        const source=prop.atlas==='world'?worldProps:mountedImage,columns=prop.atlas==='world'?4:2;
        const paint=()=>{if(!source.naturalWidth)return;const sw=source.naturalWidth/columns,sh=source.naturalHeight/2,pen=node.getContext('2d');pen.imageSmoothingEnabled=false;pen.clearRect(0,0,256,256);pen.drawImage(source,(prop.sprite%columns)*sw+4,Math.floor(prop.sprite/columns)*sh+4,sw-8,sh-8,0,0,256,256);};
        if(source.complete) paint();else source.addEventListener('load',paint,{once:true});
        furniture.appendChild(node);return {prop,node};
      });
    }
    sceneryNodes.forEach(({plant,node})=>{
      const p=project(plant),margin=plant.size*view.tile;
      node.hidden=p.x < -margin||p.x>view.width+margin||p.y < -margin||p.y>view.height+margin;
      if(!node.hidden) { node.style.left=p.x+'px';node.style.top=p.y+'px'; }
    });
    propNodes.forEach(({prop,node})=>{const p=project(prop);node.style.left=p.x+'px';node.style.top=p.y+'px';});
  }
  function draw(zone, player, time, phase) {
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
        texture(ctx,id,px,py,view.tile,map.materials[y*map.w+x],originX,originY);
        blendEdge(map,x,y,px,py);
        fineWear(map,x,y,px,py);
        if(map.materials[y*map.w+x]!=='object'&&y>0&&[17,21,22,25,28].includes(map.tiles[(y-1)*map.w+x])) {
          const shade=ctx.createLinearGradient(0,py,0,py+view.tile*.5);shade.addColorStop(0,'rgba(5,15,23,.32)');shade.addColorStop(1,'rgba(5,15,23,0)');
          ctx.fillStyle=shade;ctx.fillRect(px,py,view.tile,view.tile*.5);
        }
        if (id === 6 || id === 7) { ctx.fillStyle = `rgba(102,183,206,${.04 + Math.sin(time * .0015 + x * .7 + y * .3) * .035})`; ctx.fillRect(px, py, view.tile, view.tile); }
      }
    }
    ctx.fillStyle = phase === 'echo' ? 'rgba(59,84,123,.19)' : 'rgba(5,22,38,.22)'; ctx.fillRect(0, 0, view.width, view.height);
    map.lights.forEach(({x,y})=>{
      const p = project({ x, y: y - .35 }), radius = view.tile * 1.7;
      if (p.x < -radius || p.x > view.width + radius || p.y < -radius || p.y > view.height + radius) return;
      const gradient = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, radius);
      gradient.addColorStop(0, 'rgba(255,194,93,.20)'); gradient.addColorStop(1, 'rgba(255,194,93,0)');
      ctx.fillStyle = gradient; ctx.fillRect(p.x - radius, p.y - radius, radius * 2, radius * 2);
    });
    drawScenery(map);
  }
  function thumbnail(zone, output) {
    const map = root.KiriMaps.maps[zone], size = 8;
    output.width = map.w * size; output.height = map.h * size;
    const pen = output.getContext('2d'); pen.imageSmoothingEnabled = false;
    if (!image.complete || !image.naturalWidth) return;
    map.tiles.forEach((tile, i) => texture(pen,tile,i%map.w*size,Math.floor(i/map.w)*size,size,map.materials[i]));
    if(foliage.complete&&foliage.naturalWidth) {
      const sw=foliage.naturalWidth/4,sh=foliage.naturalHeight/4;
      map.scenery.forEach(p=>{
        const extent=p.size*size;
        pen.drawImage(foliage,p.sprite%4*sw,Math.floor(p.sprite/4)*sh,sw,sh,(p.x+.5)*size-extent*.5,(p.y+.92)*size-extent*.96,extent,extent);
      });
    }
    map.props.forEach(p=>{const source=p.atlas==='world'?worldProps:mountedImage,columns=p.atlas==='world'?4:2;if(!source.complete||!source.naturalWidth)return;const sw=source.naturalWidth/columns,sh=source.naturalHeight/2,extent=p.size*size;pen.drawImage(source,p.sprite%columns*sw+4,Math.floor(p.sprite/columns)*sh+4,sw-8,sh-8,(p.x+.5)*size-extent*.5,(p.y+.92)*size-extent*.985,extent,extent);});
  }
  root.KiriRenderer = { view, resize, draw, project, unproject, thumbnail, assetsReady:()=>[image,foliage,mountedImage,worldProps,stoneGrain].every(i=>i.complete&&i.naturalWidth>0) };
})(globalThis);
