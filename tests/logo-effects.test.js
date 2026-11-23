import test from 'node:test';import assert from 'node:assert/strict';
import {getCoverGeometry} from '../src/renderer.js';
import {LOGOS,facePlacement,drawLogoEffect} from '../src/logo-effects.js';
const points=[];points[33]={x:.35,y:.4};points[263]={x:.65,y:.44};points[10]={x:.5,y:.2};
test('logo tracking preserves eye span and reverses tilt in selfie mirror',()=>{
  const g=getCoverGeometry(640,480,390,700),a=facePlacement(points,g),b=facePlacement(points,{...g,mirror:true});
  assert.ok(Math.abs(a.x+b.x-390)<1e-8);assert.ok(Math.abs(a.angle+b.angle)<1e-8);assert.equal(a.span,b.span);
  assert.equal(facePlacement([],g),null);
});
test('all four original logos render as crowns and two separate lenses with bounded crops',()=>{
  for(const item of LOGOS)for(const mode of ['crown','glasses']){
    const draws=[],blends=[],ctx={save(){},restore(){},translate(){},rotate(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){},stroke(){},roundRect(){},quadraticCurveTo(){},drawImage(...args){draws.push(args);},set globalCompositeOperation(v){blends.push(v);}};
    drawLogoEffect(ctx,points,getCoverGeometry(640,480,390,700),{naturalWidth:1200,naturalHeight:1000},item,mode,500,100);
    assert.equal(draws.length,mode==='crown'?1:2);assert.ok(blends.every(v=>v==='screen'));
    for(const [,x,y,w,h,...dest] of draws){assert.ok(x>=0&&y>=0&&x+w<=1200&&y+h<=1000);assert.ok(dest.every(Number.isFinite));}
    if(mode==='glasses')assert.ok(draws[0][5]+draws[0][7]<draws[1][5]);
  }
});
