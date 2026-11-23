import test from 'node:test';import assert from 'node:assert/strict';
import {maskHasForeground,drawMaskedUser} from '../src/occlusion.js';
test('rejects masks that exist but contain no user silhouette',()=>{
  assert.equal(maskHasForeground(new Uint8ClampedArray(256*256*4)),false);
  assert.equal(maskHasForeground(new Uint8ClampedArray(256*256*4).fill(255)),false);
  const rgba=new Uint8ClampedArray(256*256*4);
  for(let y=32;y<256;y++)for(let x=70;x<186;x++)rgba[(y*256+x)*4+3]=255;
  assert.equal(maskHasForeground(rgba),true);
});
test('user video and mask share mirror, crop and output scale in both camera modes',()=>{
  for(const mirror of [true,false]){
    const calls=[],user={setTransform(...a){calls.push(['transform',...a]);},clearRect(){},save(){calls.push(['save']);},restore(){calls.push(['restore']);},translate(...a){calls.push(['translate',...a]);},scale(...a){calls.push(['scale',...a]);},drawImage(...a){calls.push(['image',...a]);},set globalCompositeOperation(v){calls.push(['blend',v]);}},scratch={width:0,height:0,getContext:()=>user},dest={drawImage(...a){calls.push(['output',...a]);}},source={},mask={};
    drawMaskedUser(dest,source,{mirror,offsetX:-100,offsetY:0,drawWidth:590,drawHeight:760},mask,scratch,390,760,2);
    const images=calls.filter(c=>c[0]==='image');assert.equal(images[0][1],source);assert.equal(images[1][1],mask);assert.deepEqual(images[0].slice(2),images[1].slice(2));
    assert.equal(calls.filter(c=>c[0]==='scale').length,mirror?1:0);
    assert.ok(calls.findIndex(c=>c[0]==='blend'&&c[1]==='destination-in')>calls.indexOf(images[0]));
    assert.equal(scratch.width,780);assert.equal(scratch.height,1520);assert.equal(calls.at(-1)[0],'output');
  }
});
