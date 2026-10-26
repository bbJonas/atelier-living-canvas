import test from 'node:test';
import assert from 'node:assert/strict';
import { EventCollector } from '../src/core/collector.mjs';

test('bounded journal retains order, counts evictions and notifies subscribers',()=>{
  let now=1000;
  const collector=new EventCollector({capacity:2,clock:()=>now,maxPerSecond:10});
  const observed=[];
  const stop=collector.subscribe(e=>observed.push(e.seq));
  collector.ingest([{kind:'run.started'},{kind:'tool.started',toolName:'read'}]);
  now=2000;collector.ingest({kind:'tool.completed',toolName:'read'});
  stop();
  assert.deepEqual(observed,[1,2,3]);
  assert.deepEqual(collector.snapshot().map(e=>e.seq),[2,3]);
  assert.equal(collector.stats.dropped,1);
  assert.deepEqual(collector.getAfter(2).map(e=>e.seq),[3]);
});
test('failed batch does not partially apply',()=>{
  const collector=new EventCollector({clock:()=>1000});
  assert.throws(()=>collector.ingest([{kind:'run.started'},{kind:'not.allowed'}]));
  assert.equal(collector.snapshot().length,0);
  assert.equal(collector.stats.rejected,2);
});
test('rate and batch bounds protect the ingestion endpoint',()=>{
  const collector=new EventCollector({maxPerSecond:2,clock:()=>1000});
  collector.ingest([{kind:'run.started'},{kind:'run.completed'}]);
  assert.throws(()=>collector.ingest({kind:'run.started'}),RangeError);
  assert.throws(()=>collector.ingest(new Array(201).fill({kind:'run.started'})),RangeError);
});
