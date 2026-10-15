import test from 'node:test';import assert from 'node:assert/strict';
import {getCoverGeometry,projectLandmark,smileScore,makeSmileGate} from '../src/renderer.js';
test('cover+mirror maps landmarks exactly into preview',()=>{
  const g=getCoverGeometry(1280,720,360,780,true);
  assert.equal(g.drawHeight,780);
  const left=projectLandmark({x:0,y:.5},g),right=projectLandmark({x:1,y:.5},g);
  assert.ok(left.x>right.x);assert.equal(left.y,390);
});
test('smile blendshapes averaged from left and right categories',()=>{
  assert.ok(Math.abs(smileScore([{categoryName:'mouthSmileLeft',score:.8},{categoryName:'mouthSmileRight',score:.4}])-.6)<1e-12);
  assert.equal(smileScore(null),0);
});
test('smile gate debounce and hysteresis',()=>{
  const gate=makeSmileGate(.46,.29,170);
  assert.equal(gate.update(.6,0),false);assert.equal(gate.update(.6,180),true);
  assert.equal(gate.update(.34,210),true);assert.equal(gate.update(.20,220),false);
  assert.equal(gate.update(.6,300),false);assert.equal(gate.update(.6,480),true);
  gate.reset();assert.equal(gate.active,false);
});
