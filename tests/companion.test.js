import test from 'node:test';
import assert from 'node:assert/strict';
import {getCoverGeometry} from '../src/renderer.js';
import {shoulderAnchor,createShoulderTracker,drawCompanion,createHandLayer,INSTRUCTORS} from '../src/companion.js';
const pose=(x=.5,visibility=1)=>{
  const p=[];p[11]={x:x-.10,y:.45,visibility};p[12]={x:x+.10,y:.48,visibility};return p;
};
test('shoulder anchor respects selfie mirror and cover crop',()=>{
  const g=getCoverGeometry(1280,720,390,760,false);
  const a=shoulderAnchor(pose(.48),g),b=shoulderAnchor(pose(.48),{...g,mirror:true});
  assert.ok(Math.abs(a.x+b.x-390)<1e-8);
  assert.equal(a.span,b.span);assert.ok(Math.abs(a.angle+b.angle)<1e-8);
  assert.equal(shoulderAnchor(pose(.5,.3),g),null);
  assert.equal(shoulderAnchor([],g),null);
});
test('tracking smooths motion, fades on loss and reacquires without old-position drag',()=>{
  const g=getCoverGeometry(640,480,640,480);
  const tracker=createShoulderTracker();
  const start=tracker.update(pose(),g,0);
  const moved=tracker.update(pose(.6),g,100);
  assert.ok(moved.x>start.x&&moved.x<384);
  assert.ok(tracker.get(400).alpha<1);
  assert.equal(tracker.get(451),null);
  assert.equal(tracker.update(pose(.6),g,600).x,384);
  tracker.reset();assert.equal(tracker.get(601),null);
});
test('front hand and rear body use identical placement and scale on either side',()=>{
  for(const item of INSTRUCTORS)for(const side of [-1,1]){
    const runs=[];
    for(const front of [false,true]){
      const ops=[],ctx={save(){},restore(){},translate(...a){ops.push(['translate',...a]);},rotate(...a){ops.push(['rotate',...a]);},scale(...a){ops.push(['scale',...a]);},beginPath(){},rect(){},clip(){},drawImage(...a){ops.push(['image',...a.slice(1)]);}};
      drawCompanion(ctx,{naturalWidth:1536,naturalHeight:1024},{x:210,y:300,span:150,angle:.1,alpha:1},item.calibration,side,front,{});
      runs.push(ops);
    }
    assert.deepEqual(runs[0].slice(0,3),runs[1].slice(0,3));
    const body=runs[0].at(-1),hand=runs[1].at(-1),c=item.calibration.hand;
    assert.ok(Math.abs(hand[1]-(body[1]+c.x*body[3]))<1e-8);
    assert.ok(Math.abs(hand[2]-(body[2]+c.y*body[4]))<1e-8);
    assert.ok(runs[0].every(op=>op.slice(1).every(Number.isFinite)));
  }
});
test('hand layer preserves wrist and fades its arm connection instead of clipping a rectangle',()=>{
  for(const item of INSTRUCTORS){
    const gradients=[],blends=[],ctx={drawImage(){},fillRect(){},set globalCompositeOperation(value){blends.push(value);},createLinearGradient(){const stops=[];gradients.push(stops);return {addColorStop(...stop){stops.push(stop);}};}},canvas={getContext:()=>ctx};
    const layer=createHandLayer({naturalWidth:1536,naturalHeight:1024},item.calibration,()=>canvas);
    assert.ok(layer.width>0&&layer.height>0);assert.ok(blends.includes('destination-in'));
    assert.deepEqual(gradients[0].at(-1),[1,'#fff0']);assert.deepEqual(gradients[1][0],[0,'#fff0']);
    assert.ok(gradients[0][1][0]>.5);
  }
});
