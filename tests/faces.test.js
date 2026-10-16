import test from 'node:test';
import assert from 'node:assert/strict';
import {createFaceTracker} from '../src/faces.js';
const face=x=>{const p=[];p[33]={x:x-.05,y:.3};p[263]={x:x+.05,y:.3};return p;};
const blend=(l,r)=>({categories:[{categoryName:'mouthSmileLeft',score:l},{categoryName:'mouthSmileRight',score:r}]});
test('up to three people have independent smile gates',()=>{
  const tracker=createFaceTracker(3);
  const result={faceLandmarks:[face(.2),face(.5),face(.8)],faceBlendshapes:[blend(.8,.8),blend(.05,.05),blend(.9,.9)]};
  tracker.update(result,0);
  let faces=tracker.update(result,200);
  assert.deepEqual(faces.map(x=>x.smiling),[true,false,true]);
  assert.ok(faces[0].smileAt===200 && faces[1].smileAt===null);
});
test('changing MediaPipe detection order keeps person identity',()=>{
  const tracker=createFaceTracker(3);
  const r=(xs,smiles)=>({faceLandmarks:xs.map(face),faceBlendshapes:smiles.map(s=>blend(s,s))});
  tracker.update(r([.2,.7],[.9,.0]),0);
  tracker.update(r([.7,.2],[.0,.9]),200);
  const faces=tracker.getFaces(200);
  assert.equal(faces.find(f=>f.center.x<.4).smiling,true);
  assert.equal(faces.find(f=>f.center.x>.4).smiling,false);
});
test('old faces expire and reset clears tracking',()=>{
  const tracker=createFaceTracker(3);
  tracker.update({faceLandmarks:[face(.35)],faceBlendshapes:[blend(.8,.8)]},0);
  assert.equal(tracker.getFaces(521).length,0);
  tracker.reset();assert.equal(tracker.getFaces(0).length,0);
});
