import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveScene } from '../src/core/scene.mjs';
import { generateDemo } from '../src/core/demo.mjs';

test('inventory does not masquerade as a file edit',()=>{
  const scene=deriveScene([{kind:'file.discovered',runId:'r',at:100,agentId:'inventory',filePath:'src/a.ts'}]);
  assert.equal(scene.files.size,1);
  assert.equal(scene.changedFiles,0);
  assert.equal(scene.files.get('src/a.ts').changes,0);
});
test('file and agent histories create persistent project structure',()=>{
  const events=[
    {kind:'agent.started',agentId:'main',at:100,runId:'r'},
    {kind:'agent.started',agentId:'helper',parentAgentId:'main',at:110,runId:'r'},
    {kind:'tool.started',agentId:'helper',toolName:'edit',at:120,runId:'r'},
    {kind:'file.changed',agentId:'helper',filePath:'src/core/a.ts',linesAdded:30,at:125,runId:'r'},
    {kind:'agent.message',agentId:'helper',peerAgentId:'main',at:140,runId:'r'},
    {kind:'agent.completed',agentId:'helper',at:150,runId:'r'}
  ];
  const s=deriveScene(events);
  assert.equal(s.agents.get('helper').active,false);
  assert.equal(s.changedFiles,1);
  assert.equal(s.files.get('src/core/a.ts').added,30);
  assert.equal(s.toolCalls,1);
  assert.equal(s.interactions[0].to,'main');
});
test('synthetic replay is deterministic and ordered',()=>{
  const a=generateDemo(42),b=generateDemo(42),c=generateDemo(44);
  assert.deepEqual(a,b);
  assert.notDeepEqual(a,c);
  assert.ok(a.length>250);
  assert.ok(a.every((e,i)=>i===0||e.at>=a[i-1].at));
  assert.ok(deriveScene(a).files.size>15);
});
