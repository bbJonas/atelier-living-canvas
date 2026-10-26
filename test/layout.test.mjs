import test from 'node:test';
import assert from 'node:assert/strict';
import { hash01,topology,ageGlow } from '../src/core/layout.mjs';

test('deterministic placement regardless of file enumeration order',()=>{
  const files=[{path:'src/core/a.ts',changes:3},{path:'src/ui/b.tsx',changes:1}];
  const box={x:0,y:0,width:800,height:420};
  const toPositions = arr => new Map(topology(arr,box).map(n=>[n.path,[n.x,n.y]]));
  const a=toPositions(files),b=toPositions(files.slice().reverse());
  for(const [key,value] of a)assert.deepEqual(value,b.get(key));
  assert.ok(a.has('src/core'));
});
test('hashes and temporal glow remain bounded',()=>{
  assert.ok(hash01('hello')>=0&&hash01('hello')<1);
  assert.equal(ageGlow(20000,0),0);
  assert.equal(ageGlow(100,100),1);
});
