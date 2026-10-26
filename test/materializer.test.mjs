import test from 'node:test';
import assert from 'node:assert/strict';
import { MaterializedScene } from '../src/core/materializer.mjs';
import { EventCollector } from '../src/core/collector.mjs';

test('materialized state outlives tiny journal without forgetting structure',()=>{
  let now=1000;
  const collector=new EventCollector({capacity:2,maxPerSecond:100,clock:()=>now});
  const materializer=new MaterializedScene();
  collector.subscribe(e=>materializer.apply(e));
  collector.ingest({kind:'file.discovered',agentId:'inventory',filePath:'src/a.ts'});
  collector.ingest({kind:'file.changed',agentId:'builder',filePath:'src/a.ts',linesAdded:13});
  now=2000;
  collector.ingest({kind:'tool.started',agentId:'builder',toolName:'test'});
  collector.ingest({kind:'test.completed',agentId:'builder',testPassed:4});
  assert.equal(collector.snapshot().length,2);
  assert.equal(materializer.scene().files.get('src/a.ts').changes,1);
  assert.equal(materializer.scene().changedFiles,1);
  assert.equal(materializer.scene().toolCalls,1);
  assert.equal(materializer.scene().testsPassed,4);
  assert.equal(materializer.agents.has('inventory'),false);
});
test('state snapshot roundtrip and bounded file eviction',()=>{
  const a=new MaterializedScene({maxFiles:2});
  for(const [i,name] of ['a','b','c'].entries()){
    a.apply({kind:'file.changed',filePath:'src/'+name+'.ts',agentId:'main',runId:'r',at:i+1});
  }
  assert.equal(a.files.size,2);
  assert.equal(a.evictedFiles,1);
  const b=new MaterializedScene({maxFiles:2});
  b.load(JSON.parse(JSON.stringify(a.snapshot())));
  assert.equal(b.total,3);
  assert.equal(b.files.has('src/a.ts'),false);
  assert.equal(b.files.get('src/c.ts').changes,1);
});
