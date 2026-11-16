/* Frame-rate independent grid movement, directional intent and real walk frames. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.KiriMovement=api;
})(globalThis,function(){
  'use strict';
  const STEP_SECONDS=.13;
  const DIRECTIONS={w:[0,-1,3],arrowup:[0,-1,3],s:[0,1,0],arrowdown:[0,1,0],a:[-1,0,1],arrowleft:[-1,0,1],d:[1,0,2],arrowright:[1,0,2]};
  function direction(keys){
    const ordered=[...keys];
    for(let i=ordered.length-1;i>=0;i--) if(DIRECTIONS[ordered[i]]){
      const [dx,dy,facing]=DIRECTIONS[ordered[i]];return {dx,dy,facing};
    }
    return null;
  }
  function create(){return {step:null,walkTime:0,walking:false,frame:1};}
  function reset(motion){motion.step=null;motion.walkTime=0;motion.walking=false;motion.frame=1;}
  function visual(motion,player){
    const s=motion.step;if(!s)return {x:player.x,y:player.y};
    const t=Math.min(1,s.elapsed/STEP_SECONDS);
    return {x:s.from.x+(s.to.x-s.from.x)*t,y:s.from.y+(s.to.y-s.from.y)*t};
  }
  function begin(motion,player,next){
    if(!next)return false;
    const dx=next.x-player.x,dy=next.y-player.y;
    if(Math.abs(dx)+Math.abs(dy)!==1)throw new Error('Movement must enter one adjacent cell.');
    player.facing=dx?(dx<0?1:2):(dy<0?3:0);
    motion.step={from:{x:player.x,y:player.y},to:{x:next.x,y:next.y},elapsed:0};return true;
  }
  function advance(motion,player,dt,nextPoint,onArrive=()=>true){
    let remaining=Math.max(0,Math.min(.25,Number.isFinite(dt)?dt:0)),halt=false;
    let guard=0;
    while(remaining>1e-9&&guard++<8){
      if(!motion.step&&!begin(motion,player,nextPoint(player)))break;
      const step=motion.step,used=Math.min(remaining,STEP_SECONDS-step.elapsed);
      step.elapsed+=used;motion.walkTime+=used;remaining-=used;
      if(step.elapsed>=STEP_SECONDS-1e-9){
        player.x=step.to.x;player.y=step.to.y;motion.step=null;
        if(onArrive(player)===false){halt=true;break;}
      }
    }
    // Queue the next leg even when dt ended exactly at a tile boundary.
    if(!motion.step&&!halt)begin(motion,player,nextPoint(player));
    motion.walking=!!motion.step;
    if(!motion.walking)motion.walkTime=0;
    motion.frame=motion.walking?[0,1,2,1][Math.floor(motion.walkTime/(STEP_SECONDS/2))%4]:1;
    return visual(motion,player);
  }
  return {STEP_SECONDS,DIRECTIONS,direction,create,reset,visual,advance};
});
