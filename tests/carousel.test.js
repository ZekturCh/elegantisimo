import test from 'node:test';import assert from 'node:assert/strict';
import {FILTERS,wrapIndex} from '../src/carousel.js';
test('collection contains exactly crowns and glasses for each of the four logos',()=>{
  assert.equal(FILTERS.length,8);
  for(let logoIndex=0;logoIndex<4;logoIndex++)assert.deepEqual(FILTERS.filter(f=>f.logoIndex===logoIndex).map(f=>f.mode),['crown','glasses']);
  assert.equal(FILTERS.some(f=>f.mode==='hug'),false);
});
test('carousel wraps forever in both directions without skipping an effect',()=>{
  for(const direction of [-1,1]){
    let selected=0;const seen=new Set();
    for(let i=0;i<800;i++){seen.add(selected);selected=wrapIndex(selected+direction);assert.ok(selected>=0&&selected<8);}
    assert.equal(selected,0);assert.equal(seen.size,8);
  }
  assert.equal(wrapIndex(-1),7);assert.equal(wrapIndex(8),0);
});
