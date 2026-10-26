import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDemo } from '../src/core/demo.mjs';
import { deriveScene } from '../src/core/scene.mjs';
import { MAX_GESTURES, MAX_MODULES, observedEvents, moduleLayout, tracePhases } from '../public/visualizers/art-data.mjs';
import * as ink from '../public/visualizers/ink.mjs';
import * as strata from '../public/visualizers/strata.mjs';
import * as loom from '../public/visualizers/loom.mjs';

const demo=generateDemo();
const at=demo.at(-1).at;

test('bounded deterministic gesture selection keeps the first and last events',()=>{
  const marks=observedEvents(demo,at,40);
  assert.equal(marks.length,40);
  assert.equal(marks[0],demo[0]);
  assert.equal(marks.at(-1),demo.at(-1));
  assert.deepEqual(observedEvents(demo,at,40),marks);
  assert.deepEqual(observedEvents(demo,at,0).length,1);
  assert.ok(observedEvents(demo,at-10000).every(e=>e.at<=at-10000));
  assert.ok(observedEvents([...demo,...demo,...demo],at).length<=MAX_GESTURES);
});

test('each phase is a real timestamp slice, never future telemetry',()=>{
  const phases=tracePhases(demo,at);
  assert.equal(phases.length,3);
  assert.equal(phases.at(-1).time,at);
  assert.equal(phases.at(-1).events.length,demo.length);
  for(const phase of phases){
    assert.ok(phase.events.every(e=>e.at<=phase.time));
    assert.equal(phase.events.length,demo.filter(e=>e.at<=phase.time).length);
  }
  assert.deepEqual(tracePhases([],at),[
    {time:at,events:[]},{time:at,events:[]},{time:at,events:[]}
  ]);
});

test('file modules occupy unique deterministic slots; edits reshape existing file',()=>{
  const files=[
    {path:'src/a.ts',firstAt:1,lastAt:1,changes:1,added:12,parent:'src'},
    {path:'src/b.ts',firstAt:2,lastAt:2,changes:2,added:5,parent:'src'}
  ];
  const original=moduleLayout(files,12);
  const modified=moduleLayout([{...files[0],changes:5,added:50},files[1]],12);
  assert.equal(original[0].slot,modified[0].slot);
  assert.ok(modified[0].strength>original[0].strength);
  assert.equal(new Set(original.map(m=>m.slot)).size,original.length);
  assert.deepEqual(moduleLayout(files,12),original);
  const many=Array.from({length:240},(_,i)=>({path:'a/'+i,firstAt:i,lastAt:i,changes:1}));
  assert.equal(moduleLayout(many).length,MAX_MODULES);
});

function mockContext(){
  const gradient={addColorStop(){}};
  let draws=0;
  const context=new Proxy({},{
    get(target,key){
      if(key==='createLinearGradient'||key==='createRadialGradient')return (...args)=>{
        assert.ok(args.every(Number.isFinite));return gradient;
      };
      if(key==='stroke'||key==='fill'||key==='fillRect')return (...args)=>{
        assert.ok(args.every(Number.isFinite));draws++;
      };
      return (...args)=>{
        assert.ok(args.filter(a=>typeof a==='number').every(Number.isFinite),
          'non-finite drawing coordinate in '+String(key));
      };
    },
    set(){return true}
  });
  return {context,draws:()=>draws};
}

test('all art studies draw across opening, middle, final and empty phases',()=>{
  for(const renderer of [ink,strata,loom]){
    assert.equal(typeof renderer.title,'string');
    for(const {time,events} of [
      ...tracePhases(demo,at),{time:at,events:[]}
    ]){
      const scene=deriveScene(events);
      const mock=mockContext();
      renderer.draw(mock.context,{width:640,height:380,scene,events,time});
      assert.ok(mock.draws()>0,renderer.title+' painted nothing');
    }
  }
});
