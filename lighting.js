/* Light, depth fog and a restrained photographic memory atmosphere. */
(function(root){
  'use strict';
  const lanternImage=new Image();lanternImage.src='assets/guide-lantern.png';
  let phase=null,phaseAt=-10000,lastTime=0,mix=0,fogCanvas,grain;
  // Anchored to the carrying hand, including the hidden far hand when facing north.
  function pose(facing,walking,time,reduced=false){
    const offsets=[{x:.30,y:-.25},{x:-.29,y:-.26},{x:.30,y:-.26},{x:-.24,y:-.30}];
    const anchor=offsets[facing]||offsets[0],swing=reduced?0:Math.sin(time*(walking?.012:.002));
    return {x:anchor.x+(walking?swing*.018:0),y:anchor.y+(walking?Math.abs(swing)*.025:0),angle:reduced?0:swing*(walking?8:2),behind:facing===3};
  }
  function radial(pen,x,y,r,inner,outer){
    const g=pen.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,inner);g.addColorStop(1,outer);pen.fillStyle=g;pen.fillRect(x-r,y-r,r*2,r*2);
  }
  function noise(){
    if(grain)return grain;
    grain=document.createElement('canvas');grain.width=grain.height=128;
    const pen=grain.getContext('2d'),data=pen.createImageData(128,128);
    let seed=1927;for(let i=0;i<data.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const value=seed>>>24;data.data[i]=data.data[i+1]=data.data[i+2]=value;data.data[i+3]=value%3===0?35:0;}
    pen.putImageData(data,0,0);return grain;
  }
  function paint(pen,{width,height,tile,view,point,lantern,phase:next,time,lit,particles,reduced}){
    if(phase===null){phase=next;mix=next==='echo'?1:0;}
    if(next!==phase){phase=next;phaseAt=time;}
    const dt=Math.min(64,Math.max(0,time-lastTime));lastTime=time;
    const target=next==='echo'?1:0;mix=reduced?target:mix+(target-mix)*(1-Math.exp(-dt/320));
    const t=reduced||!particles?0:time,focus=lit?lantern:point;
    pen.clearRect(0,0,width,height);pen.save();
    // A warm pool sits on the ground; it remains when decorative particles are off.
    if(lit){
      pen.save();pen.translate(point.x+tile*.12,point.y-tile*.04);pen.scale(1,.43);pen.globalCompositeOperation='screen';
      radial(pen,0,0,tile*(1.55+mix*.35),`rgba(250,182,84,${.15+mix*.07})`,'rgba(250,182,84,0)');pen.restore();
    }
    if(mix>.003){
      // Low-resolution translucent fog, cleared around the lantern instead of hiding exits.
      if(!fogCanvas)fogCanvas=document.createElement('canvas');
      const fw=Math.ceil(width/2),fh=Math.ceil(height/2);
      if(fogCanvas.width!==fw||fogCanvas.height!==fh){fogCanvas.width=fw;fogCanvas.height=fh;}
      const fog=fogCanvas.getContext('2d');fog.setTransform(.5,0,0,.5,0,0);fog.clearRect(0,0,width,height);
      for(let i=0;i<7;i++){
        const radius=tile*(3.6+i%3),span=width+radius*2;
        const x=((i*width*.31+t*.004*(i%2?1:-1)-view.x*tile*.18)%span+span)%span-radius;
        const y=height*(.18+(i%4)*.24)+Math.sin(t*.00012+i)*tile*.35;
        radial(fog,x,y,radius,`rgba(217,218,205,${.11*mix})`,'rgba(217,218,205,0)');
      }
      for(let i=0;i<3;i++){
        const x=width*(.18+i*.32)+Math.sin(t*.00015+i)*tile*1.5-view.x*tile*.08,y=height*(.28+i*.29);
        fog.save();fog.translate(x,y);fog.scale(2.8,.32);
        radial(fog,0,0,tile*2.1,`rgba(236,225,201,${.14*mix})`,'rgba(236,225,201,0)');fog.restore();
      }
      if(lit){fog.globalCompositeOperation='destination-out';radial(fog,focus.x,focus.y,tile*2.8,'rgba(0,0,0,.95)','rgba(0,0,0,0)');fog.globalCompositeOperation='source-over';}
      pen.drawImage(fogCanvas,0,0,width,height);
      pen.globalAlpha=mix*.28;pen.fillStyle=pen.createPattern(noise(),'repeat');pen.fillRect(0,0,width,height);pen.globalAlpha=1;
    }
    // Peripheral depth: edges recede while the route immediately around Mio stays clear.
    const edge=pen.createRadialGradient(point.x,point.y-tile*.45,tile*1.1,point.x,point.y-tile*.45,Math.max(width,height)*.73);
    edge.addColorStop(0,'rgba(15,21,28,0)');edge.addColorStop(.5,`rgba(22,25,33,${.035+mix*.035})`);edge.addColorStop(1,`rgba(18,22,33,${.12+mix*.23})`);pen.fillStyle=edge;pen.fillRect(0,0,width,height);
    if(lit){
      pen.save();pen.globalCompositeOperation='screen';
      const breath=reduced?1:1+Math.sin(t*.003)*.035;
      radial(pen,focus.x,focus.y,tile*.78*breath,`rgba(255,209,126,${.18+mix*.08})`,'rgba(255,209,126,0)');pen.restore();
    }
    if(particles&&!reduced){
      for(let i=0;i<(mix>.1?26:12);i++){
        const x=((i*.6180339+t*.000004*(1+i%3))%1)*width;
        const y=((i*.38197-t*.000009*(1+i%2))%1+1)%1*height;
        pen.fillStyle=`rgba(${mix>.5?'240,224,181':'242,211,145'},${.10+mix*.12+Math.sin(t*.001+i)*.06})`;pen.fillRect(x,y,i%4?1:2,1);
      }
      if(lit)for(let i=0;i<5;i++){
        const life=(t*.00028+i*.2)%1,x=focus.x+Math.sin(life*5+i*2)*tile*.15,y=focus.y-life*tile*1.1;
        pen.fillStyle=`rgba(255,219,151,${Math.sin(life*Math.PI)*.5})`;pen.fillRect(x,y,1,i%2?1:2);
      }
    }
    const age=time-phaseAt;
    if(!reduced&&age>=0&&age<1100){
      const progress=age/1100,radius=tile*(.4+progress*5.5);
      pen.strokeStyle=`rgba(243,226,184,${Math.sin(progress*Math.PI)*.13})`;pen.lineWidth=tile*.055;
      pen.beginPath();pen.ellipse(focus.x,focus.y,radius,radius*.65,0,0,Math.PI*2);pen.stroke();
    }
    pen.restore();
  }
  root.KiriLighting={pose,paint,assetsReady:()=>lanternImage.complete&&lanternImage.naturalWidth>0};
})(globalThis);
