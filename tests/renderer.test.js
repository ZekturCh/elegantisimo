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


import {EFFECTS,nextEffectIndex,drawFrame,drawPhotoBrand,drawFaceEffect} from '../src/renderer.js';
test('three effects rotate in a closed carousel',()=>{
  assert.equal(EFFECTS.length,3);
  assert.deepEqual([nextEffectIndex(0),nextEffectIndex(1),nextEffectIndex(2)],[1,2,0]);
  assert.equal(EFFECTS[0].name,'Emblema lila');
});
function mockCanvas(){
  const text=[],ctx={
    createRadialGradient:()=>({addColorStop(){}}),
    createLinearGradient:()=>({addColorStop(){}}),
    fillRect(){},save(){},restore(){},translate(){},rotate(){},scale(){},
    beginPath(){},moveTo(){},bezierCurveTo(){},stroke(){},fill(){},roundRect(){},
    arc(){},fillText(s){text.push(s);},drawImage(){ctx.images++;},
    images:0,text
  };
  return ctx;
}
test('preview frame never draws the photo logo; saved photo stamps it',()=>{
  const ctx=mockCanvas(),logo={complete:true,naturalWidth:1421,naturalHeight:362};
  drawFrame(ctx,390,760);
  assert.equal(ctx.images,0);
  drawPhotoBrand(ctx,390,760,logo);
  assert.equal(ctx.images,1);
});
test('the three effects never retain PAOLO or MASTER CLASS branding',()=>{
  const landmarks=[];
  landmarks[10]={x:.5,y:.18};
  landmarks[33]={x:.43,y:.33};
  landmarks[263]={x:.57,y:.33};
  const geometry=getCoverGeometry(390,760,390,760,false);
  const results=EFFECTS.map((_,mode)=>{
    const ctx=mockCanvas();
    drawFaceEffect(ctx,landmarks,geometry,1200,400,mode);
    return ctx.text.join(' ');
  });
  assert.ok(results.every(t=>t.includes('ELEGANTÍSIMOS')));
  assert.ok(results.every(t=>!/PAOLO|MASTER CLASS/i.test(t)));
});
