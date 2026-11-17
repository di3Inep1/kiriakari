/* Prepare immutable, native-resolution interior sheets. No runtime trimming or fitting.
 * Run after changing generated artwork/catalog: node scripts/import-interior-art.cjs
 * Uses Node built-ins only; supports non-interlaced 8-bit RGB/RGBA PNGs.
 */
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const F=require('../furniture.js'),root=path.resolve(__dirname,'..');
const sources={
  shrineAltar:{file:'shrine-votive-altar.png',cols:2,rows:1},
  prefab:{file:'grid-furniture.png',cols:4,rows:3},
  decor:{file:'grid-decor.png',cols:4,rows:3},
  gridInterior:{file:'grid-interior-redrawn.png',cols:5,rows:2},
  worktable:{file:'grid-worktables-v2.png',cols:3,rows:1},
  balanced:{file:'grid-furniture-balanced.png',cols:4,rows:2},
  balancedCounter:{file:'grid-counter-props-balanced.png',rects:[{x:0,y:0,w:900,h:724},{x:900,y:0,w:600,h:724},{x:1533,y:0,w:600,h:724}]}
};
const crcTable=Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc32(buf){let n=0xffffffff;for(const b of buf)n=crcTable[(n^b)&255]^(n>>>8);return(n^0xffffffff)>>>0;}
function chunk(type,data){const name=Buffer.from(type),out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);name.copy(out,4);data.copy(out,8);out.writeUInt32BE(crc32(Buffer.concat([name,data])),data.length+8);return out;}
function encode(width,height,pixels){
  const head=Buffer.alloc(13);head.writeUInt32BE(width);head.writeUInt32BE(height,4);head[8]=8;head[9]=6;
  const raw=Buffer.alloc((width*4+1)*height);for(let y=0;y<height;y++)pixels.copy(raw,y*(width*4+1)+1,y*width*4,(y+1)*width*4);
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',head),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
function paeth(a,b,c){const p=a+b-c,aa=Math.abs(p-a),bb=Math.abs(p-b),cc=Math.abs(p-c);return aa<=bb&&aa<=cc?a:bb<=cc?b:c;}
function decode(file){
  const png=fs.readFileSync(file);if(!png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw new Error('Invalid PNG: '+file);
  const width=png.readUInt32BE(16),height=png.readUInt32BE(20);
  if(png[24]!==8||![2,6].includes(png[25])||png[28]!==0)throw new Error('Expected non-interlaced RGB/RGBA8: '+file);
  const data=[];for(let p=8;p<png.length;){const n=png.readUInt32BE(p),type=png.toString('ascii',p+4,p+8);if(type==='IDAT')data.push(png.subarray(p+8,p+8+n));p+=n+12;}
  const channels=png[25]===2?3:4,raw=zlib.inflateSync(Buffer.concat(data)),stride=width*channels,scan=Buffer.alloc(width*height*channels);
  for(let y=0;y<height;y++){const filter=raw[y*(stride+1)],start=y*stride;
    if(filter>4)throw new Error('Unknown PNG filter');
    for(let x=0;x<stride;x++){const a=x>=channels?scan[start+x-channels]:0,b=y?scan[start-stride+x]:0,c=y&&x>=channels?scan[start-stride+x-channels]:0;
      const prediction=[0,a,b,Math.floor((a+b)/2),paeth(a,b,c)][filter];scan[start+x]=(raw[y*(stride+1)+1+x]+prediction)&255;
    }
  }
  const pixels=channels===4?scan:Buffer.alloc(width*height*4);
  if(channels===3)for(let i=0;i<width*height;i++){scan.copy(pixels,i*4,i*3,i*3+3);pixels[i*4+3]=255;}
  return {width,height,pixels};
}
for(const source of Object.values(sources))Object.assign(source,decode(path.join(root,'assets',source.file)));
function frame(source,sprite){
  if(source.rects){const r=source.rects[sprite];return {x:r.x+4,y:r.y+4,w:r.w-8,h:r.h-8};}
  const sw=source.width/source.cols,sh=source.height/source.rows;
  return {x:Math.round(sprite%source.cols*sw)+4,y:Math.round(Math.floor(sprite/source.cols)*sh)+4,w:Math.round(sw)-8,h:Math.round(sh)-8};
}
function bounds(source,sprites){
  const box={x:Infinity,y:Infinity,right:0,bottom:0};
  for(const sprite of sprites){const f=frame(source,sprite);
    for(let y=0;y<f.h;y++)for(let x=0;x<f.w;x++)if(source.pixels[((y+f.y)*source.width+x+f.x)*4+3]>96){
      box.x=Math.min(box.x,x);box.y=Math.min(box.y,y);box.right=Math.max(box.right,x+1);box.bottom=Math.max(box.bottom,y+1);
    }
  }
  if(!Number.isFinite(box.x))throw new Error('Empty sprite');return {...box,w:box.right-box.x,h:box.bottom-box.y};
}
const manifest={version:1,sizes:[32,48],cell:3,columns:6,sprites:{}},jobs=[];
for(const [kind,def] of Object.entries(F.catalog)){
  const source=sources[def.atlas];if(!source)throw new Error('No grid source for '+kind);
  const sprites=[def.sprite,...(Number.isInteger(def.completedSprite)?[def.completedSprite]:[])],crop=bounds(source,sprites);
  manifest.sprites[kind]=sprites.map(sprite=>{
    const index=jobs.length,entry={col:index%manifest.columns,row:Math.floor(index/manifest.columns),w:def.w,h:def.h};
    jobs.push({entry,source,sprite,crop,mount:!!def.mount});return entry;
  });
}
manifest.rows=Math.ceil(jobs.length/manifest.columns);
for(const tile of manifest.sizes){
  const width=manifest.columns*manifest.cell*tile,height=manifest.rows*manifest.cell*tile,pixels=Buffer.alloc(width*height*4);
  for(const {entry,source,sprite,crop,mount} of jobs){
    const f=frame(source,sprite),fit=F.fitArt(entry.w*tile,entry.h*tile,crop.w,crop.h,mount);
    // Uniform scale and integer placement are decided ONCE, during import.
    const dw=Math.round(fit.w),dh=Math.round(fit.h),ox=entry.col*manifest.cell*tile+Math.floor((entry.w*tile-dw)/2),oy=entry.row*manifest.cell*tile+(mount?Math.floor((entry.h*tile-dh)/2):entry.h*tile-dh);
    for(let y=0;y<dh;y++)for(let x=0;x<dw;x++){
      const sx=f.x+crop.x+Math.min(crop.w-1,Math.floor((x+.5)*crop.w/dw)),sy=f.y+crop.y+Math.min(crop.h-1,Math.floor((y+.5)*crop.h/dh));
      const from=(sy*source.width+sx)*4,to=((oy+y)*width+ox+x)*4;
      source.pixels.copy(pixels,to,from,from+4);
    }
  }
  const file='assets/interior-native-'+tile+'.png';fs.writeFileSync(path.join(root,file),encode(width,height,pixels));console.log(file+' '+width+'x'+height);
}
const moduleText='/* Generated by scripts/import-interior-art.cjs. Rectangles include transparent padding. */\n(function(root,factory){if(typeof module===\'object\'&&module.exports)module.exports=factory();else root.KiriInteriorArt=factory();})(globalThis,()=>('+JSON.stringify(manifest)+'));\n';
fs.writeFileSync(path.join(root,'interior-art.js'),moduleText);
console.log(jobs.length+' fixed sprite frames imported; originals retained.');
// Large repeating ground material is also prepared once at each native tile size.
const shrinePaving=decode(path.join(root,'assets/shrine-aged-paving.png'));
for(const tile of [32,48]){
  const size=tile*8,pixels=Buffer.alloc(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const sx=Math.min(shrinePaving.width-1,Math.floor((x+.5)*shrinePaving.width/size)),sy=Math.min(shrinePaving.height-1,Math.floor((y+.5)*shrinePaving.height/size));
    shrinePaving.pixels.copy(pixels,(y*size+x)*4,(sy*shrinePaving.width+sx)*4,(sy*shrinePaving.width+sx)*4+4);
  }
  fs.writeFileSync(path.join(root,'assets/shrine-paving-native-'+tile+'.png'),encode(size,size,pixels));
}
// Inventory UI and the loose memory photo also use prepared pixel rectangles.
const icons={...decode(path.join(root,'assets/inventory-items.png')),cols:4,rows:3};
for(const size of [12,16,48]){
  const width=size*4,height=size*3,pixels=Buffer.alloc(width*height*4);
  for(let sprite=0;sprite<12;sprite++){
    const f=frame(icons,sprite),crop=bounds(icons,[sprite]),fit=F.fitArt(size-2,size-2,crop.w,crop.h,true),dw=Math.round(fit.w),dh=Math.round(fit.h),ox=sprite%4*size+Math.floor((size-dw)/2),oy=Math.floor(sprite/4)*size+Math.floor((size-dh)/2);
    for(let y=0;y<dh;y++)for(let x=0;x<dw;x++){
      const sx=f.x+crop.x+Math.min(crop.w-1,Math.floor((x+.5)*crop.w/dw)),sy=f.y+crop.y+Math.min(crop.h-1,Math.floor((y+.5)*crop.h/dh)),from=(sy*icons.width+sx)*4,to=((oy+y)*width+ox+x)*4;
      icons.pixels.copy(pixels,to,from,from+4);
    }
  }
  fs.writeFileSync(path.join(root,'assets/item-icons-'+size+'.png'),encode(width,height,pixels));
}

