const {test}=require('node:test');
const assert=require('node:assert/strict');
const Move=require('../movement.js');
const Maps=require('../maps.js');
const player=()=>({x:10,y:10,facing:0});
test('latest distinct direction wins; releasing it resumes the held direction',()=>{
  const keys=new Set(['d']);assert.equal(Move.direction(keys).facing,2);
  keys.add('w');assert.equal(Move.direction(keys).facing,3);
  keys.add('d');assert.equal(Move.direction(keys).facing,3);
  keys.delete('w');assert.equal(Move.direction(keys).facing,2);
  keys.add('a');assert.equal(Move.direction(keys).facing,1);
});
test('a mid-step turn never rewinds the current leg and applies at the next boundary',()=>{
  const p=player(),motion=Move.create(),keys=new Set(['d']);
  const next=()=>{const d=Move.direction(keys);return d?{x:p.x+d.dx,y:p.y+d.dy}:null;};
  const before=Move.advance(motion,p,.06,next);assert.ok(before.x>10&&before.x<11);
  keys.add('w');const after=Move.advance(motion,p,.02,next);
  assert.ok(after.x>before.x);assert.equal(after.y,10);
  const corner=Move.advance(motion,p,.07,next);
  assert.equal(p.x,11);assert.equal(p.y,10);assert.equal(p.facing,3);assert.ok(corner.y<10);
  assert.equal(motion.walking,true);
});
test('walking carries unused frame time across cells instead of stopping each tile',()=>{
  const p=player(),motion=Move.create();const next=()=>({x:p.x+1,y:p.y});
  for(let i=0;i<60;i++){
    const position=Move.advance(motion,p,1/60,next);
    assert.equal(motion.walking,true);assert.ok(Math.abs(position.x-(10+(i+1)/60/Move.STEP_SECONDS))<1e-8);
  }
});
test('30, 60 and 144 Hz produce the same distance and animation phase',()=>{
  const snapshots=[];
  for(const hz of [30,60,144]){
    const p=player(),m=Move.create();for(let i=0;i<hz;i++)Move.advance(m,p,1/hz,()=>({x:p.x+1,y:p.y}));
    snapshots.push({position:Move.visual(m,p),frame:m.frame});
  }
  for(const s of snapshots){assert.ok(Math.abs(s.position.x-snapshots[0].position.x)<1e-8);assert.equal(s.frame,snapshots[0].frame);}
});
test('releasing movement finishes the current cell and settles into the neutral frame',()=>{
  const p=player(),m=Move.create();let held=true;const next=()=>held?{x:p.x+1,y:p.y}:null;
  Move.advance(m,p,.07,next);held=false;Move.advance(m,p,.07,next);
  assert.equal(p.x,11);assert.equal(m.step,null);assert.equal(m.walking,false);assert.equal(m.frame,1);
});
test('walking uses both stride poses and resets after stopping',()=>{
  const p=player(),m=Move.create(),frames=new Set();
  for(let i=0;i<25;i++){Move.advance(m,p,.016,()=>({x:p.x+1,y:p.y}));frames.add(m.frame);}
  assert.deepEqual([...frames].sort(),[0,1,2]);Move.reset(m);assert.equal(m.frame,1);assert.equal(m.walkTime,0);
});
test('a queued turn into a blocked tile respects collision without losing the completed leg',()=>{
  const p={x:25,y:11,facing:0},m=Move.create();let direction=[0,-1];
  const next=()=>{const point={x:p.x+direction[0],y:p.y+direction[1]};return Maps.walkable('river',point.x,point.y)?point:null;};
  Move.advance(m,p,.08,next);direction=[1,0];Move.advance(m,p,.06,next);
  assert.equal(p.y,10);assert.ok(Maps.walkable('river',p.x,p.y));
  direction=[0,-1];for(let i=0;i<15;i++)Move.advance(m,p,.03,next);
  assert.equal(p.y,9);assert.equal(m.walking,false);
});
test('an arrival that opens a scene stops remaining movement immediately',()=>{
  const p=player(),m=Move.create();let arrivals=0;
  Move.advance(m,p,.25,()=>({x:p.x+1,y:p.y}),()=>{arrivals++;return false;});
  assert.equal(arrivals,1);assert.equal(p.x,11);assert.equal(m.step,null);
});
