import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEvent,sanitizePath,KINDS } from '../src/core/events.mjs';

test('versioned allowlist discards prompts, chain-of-thought, arguments and file contents',()=>{
  const event=normalizeEvent({kind:'tool.started',runId:'r1',agentId:'main',
    toolName:'apply_patch',prompt:'secret',reasoning:'secret',arguments:{password:'secret'},
    output:'secret',fileBody:'secret',at:1000});
  assert.equal(event.v,1);
  assert.equal(event.toolName,'apply_patch');
  for(const key of ['prompt','reasoning','arguments','output','fileBody']){
    assert.equal(key in event,false);
  }
  assert.deepEqual(Object.keys(event).sort(),['agentId','at','kind','runId','toolName','v'].sort());
});
test('normalizes relative paths and blocks traversal, absolute and hidden secrets',()=>{
  assert.equal(sanitizePath('src\\core\\a.ts'),'src/core/a.ts');
  for(const path of ['/etc/passwd','C:\\Users\\x','../private','src/../../x','src/.env','node_modules/a.js','.git/config','src/secret/token']){
    assert.throws(()=>sanitizePath(path),TypeError);
  }
});
test('rejects unknown types, malformed clocks and unsafe numeric values',()=>{
  assert.ok(KINDS.includes('file.discovered'));
  assert.throws(()=>normalizeEvent({kind:'fictional.thoughts'}),TypeError);
  assert.throws(()=>normalizeEvent({kind:'file.changed'}),TypeError);
  assert.throws(()=>normalizeEvent({kind:'run.started',at:NaN}),TypeError);
  assert.throws(()=>normalizeEvent({kind:'test.completed',testPassed:-1}),TypeError);
  assert.equal(normalizeEvent({kind:'file.changed',filePath:'src/a.js'},
    {includeFilePaths:false}).filePath,undefined);
});
