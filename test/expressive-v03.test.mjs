import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generateDemo, generateDemoDataset, DEMO_DATASETS } from '../src/core/demo.mjs';
import { deriveScene } from '../src/core/scene.mjs';
import { deriveArtSignals, MAX_ART_REGIONS, SPECTRUM } from '../public/visualizers/art-signals.mjs';
import { tracePhases } from '../public/visualizers/art-data.mjs';
import * as prismatic from '../public/visualizers/prismatic.mjs';
import * as bloom from '../public/visualizers/bloom.mjs';
import * as ribbons from '../public/visualizers/ribbons.mjs';

test('Atlas is preserved; distinct synthetic traces are reproducible and causal',()=>{
  assert.equal(DEMO_DATASETS.length,3);
  assert.deepEqual(generateDemoDataset('atlas',42),generateDemo(42));
  assert.throws(()=>generateDemoDataset('unknown'),RangeError);
  const lengths=[];
  for(const entry of DEMO_DATASETS){
    const events=generateDemoDataset(entry.id,7);
    assert.deepEqual(events,generateDemoDataset(entry.id,7));
    assert.notDeepEqual(events,generateDemoDataset(entry.id,8));
    assert.equal(events[0].kind,'run.started');
    assert.equal(events.at(-1).kind,'run.completed');
    assert.ok(events.every((e,i)=>!i||e.at>=events[i-1].at));
    assert.ok(events.every(e=>e.runId.startsWith('demo-')));
    lengths.push(events.length);
  }
  assert.ok(lengths[1]>lengths[0]*2);
  assert.ok(lengths[2]>lengths[0]);
});

test('Release Rush has repeated files, parallel agents, handoffs and failure-retest activity',()=>{
  const events=generateDemoDataset('release-rush');
  const edits=events.filter(e=>e.kind==='file.changed');
  const counts=new Map();
  for(const e of edits)counts.set(e.filePath,(counts.get(e.filePath)||0)+1);
  assert.ok([...counts.values()].some(x=>x>12));
  assert.ok(new Set(events.map(e=>e.agentId)).size>=6);
  assert.ok(events.some(e=>e.kind==='agent.message'&&e.peerAgentId));
  assert.ok(events.some(e=>e.kind==='test.completed'&&e.testFailed>0));
  assert.ok(events.some(e=>e.kind==='test.completed'&&e.testFailed===0));
  const first=new Set();
  for(const e of edits){
    assert.equal(e.operation,first.has(e.filePath)?'modify':'create');
    first.add(e.filePath);
  }
  const scene=deriveScene(events);
  assert.equal(scene.changedFiles,first.size);
});

test('Deep Refactor revisits stable paths across more open space',()=>{
  const rush=generateDemoDataset('release-rush');
  const slow=generateDemoDataset('deep-refactor');
  const span=e=>e.at(-1).at-e[0].at;
  assert.ok(span(slow)>span(rush));
  assert.ok(new Set(slow.map(e=>e.agentId)).size<new Set(rush.map(e=>e.agentId)).size);
  const files=slow.filter(e=>e.kind==='file.changed');
  assert.ok(files.length>200);
  assert.ok(new Set(files.map(e=>e.filePath)).size<25);
});

test('art projection is deterministic, time-bounded, revision-aware and resource bounded',()=>{
  const events=generateDemoDataset('release-rush');
  const last=events.at(-1).at;
  const art=deriveArtSignals(events,last);
  assert.deepEqual(art,deriveArtSignals(events,last));
  assert.ok(art.marks.length<=720);
  assert.ok(art.regions.length<=MAX_ART_REGIONS);
  assert.ok(art.marks.some(m=>m.file&&m.revision>5));
  assert.ok(art.marks.some(m=>m.handoff));
  assert.ok(art.marks.some(m=>m.quiet));
  assert.ok(art.marks.every(m=>m.progress>=0&&m.progress<=1));
  assert.equal(new Set(SPECTRUM.map(c=>c.join(','))).size,SPECTRUM.length);
  const phases=tracePhases(events,last);
  const early=deriveArtSignals(events,phases[0].time);
  assert.ok(early.marks.every(m=>m.at<=phases[0].time));
  assert.deepEqual(early,deriveArtSignals(events,phases[0].time));
  const large=deriveArtSignals([...events,...events,...events],last);
  assert.ok(large.marks.length<=720);
});

function canvasMock(){
  let drawn=0;
  const grad={addColorStop(offset){assert.ok(Number.isFinite(offset));}};
  const ctx=new Proxy({},{
    get(_,key){
      if(key==='createLinearGradient'||key==='createRadialGradient')
        return (...args)=>{assert.ok(args.every(Number.isFinite));return grad;};
      return (...args)=>{
        assert.ok(args.filter(a=>typeof a==='number').every(Number.isFinite),
          'bad draw coordinate: '+String(key));
        if(['fill','stroke','fillRect'].includes(key))drawn++;
      };
    },
    set(){return true}
  });
  return {ctx,count:()=>drawn};
}
test('three distinct renderers paint opening, mid, end, backwards and empty safely',()=>{
  const renderers=[prismatic,bloom,ribbons];
  assert.equal(new Set(renderers.map(x=>x.title)).size,3);
  for(const name of ['atlas','release-rush','deep-refactor']){
    const events=generateDemoDataset(name);
    const phases=tracePhases(events,events.at(-1).at);
    for(const renderer of renderers){
      for(const phase of [...phases,phases[0],{time:0,events:[]}]){
        const scene=deriveScene(phase.events),m=canvasMock();
        renderer.draw(m.ctx,{width:380,height:220,scene,events:phase.events,time:phase.time});
        assert.ok(m.count()>0,renderer.title+' rendered no pixels');
      }
    }
  }
});

test('UI exposes all modes and dataset selection; sidebar can scroll independently',()=>{
  const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
  const css=readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');
  for(const mode of ['prismatic','bloom','ribbons'])
    assert.ok(html.includes('data-view="'+mode+'"'));
  for(const id of ['release-rush','deep-refactor','comparison-kind','comparison-style','comparison-group'])
    assert.ok(html.includes('id="'+id+'"')||html.includes('value="'+id+'"'));
  assert.match(css,/\.views\{flex:1 1 auto;min-height:0;overflow-y:auto/);
  assert.match(css,/@media\(max-width:850px\)/);
});
