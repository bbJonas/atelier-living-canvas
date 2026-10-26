import test from 'node:test';
import assert from 'node:assert/strict';
import { createInstrumentation, createHttpEmitter } from '../src/core/instrumentation.mjs';

test('wrapped tool and model request preserve results and report actual phases',async()=>{
  const events=[];
  let tick=1000;
  const hooks=createInstrumentation({runId:'unit',emit:e=>events.push(e),clock:()=>tick++});
  hooks.runStarted();
  hooks.agentStarted('worker','main');
  const result=await hooks.withTool('read',async()=>17,'worker');
  assert.equal(result,17);
  await assert.rejects(()=>hooks.withModelRequest(async()=>{throw Error('backend failed')},'worker'),/backend failed/);
  hooks.fileChanged('worker','src/a.ts',{linesAdded:4});
  hooks.handoff('worker','main');
  assert.deepEqual(events.map(e=>e.kind),[
    'run.started','agent.started','tool.started','tool.completed',
    'model.started','model.completed','file.changed','agent.message'
  ]);
  assert.equal(events[3].status,'ok');
  assert.equal(events[5].status,'error');
  assert.equal(events[6].filePath,'src/a.ts');
});
test('telemetry callback failures never change tool outcome',async()=>{
  const errors=[];
  const hooks=createInstrumentation({emit:()=>{throw Error('offline')},onError:e=>errors.push(e.message)});
  assert.equal(await hooks.withTool('compile',async()=>42),42);
  assert.equal(errors.length,2);
});
test('HTTP emitter batches events and drains before closing',async()=>{
  const requests=[];
  const emitter=createHttpEmitter({batchSize:2,delayMs:1000,transport:async(url,options)=>{
    requests.push(JSON.parse(options.body));
    return {ok:true};
  }});
  emitter.emit({kind:'run.started'});
  emitter.emit({kind:'run.completed'});
  emitter.emit({kind:'test.completed'});
  await emitter.close();
  assert.equal(requests.flat().length,3);
  assert.equal(emitter.stats.sent,3);
  assert.equal(emitter.stats.queued,0);
});

test('invalid metadata is reported but does not abort underlying execution',async()=>{
  const errors=[];
  const hooks=createInstrumentation({emit:()=>{},onError:error=>errors.push(error.message)});
  const value=await hooks.withTool('invalid tool name!',async()=>99);
  assert.equal(value,99);
  assert.equal(errors.length,2);
});
