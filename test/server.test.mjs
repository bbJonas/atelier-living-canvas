import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

test('HTTP ingress and live snapshots use sanitized events and safe static roots', {timeout:15000}, async()=>{
  const port=30000+(process.pid%18000);
  const base='http://127.0.0.1:'+port;
  const server=spawn(process.execPath,['src/server.mjs'],{
    env:{...process.env,HOST:'127.0.0.1',PORT:String(port),LIVING_CANVAS_TOKEN:''},
    stdio:['ignore','pipe','pipe']
  });
  try{
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('Server start timeout')),5000);
      server.once('error',error=>{clearTimeout(timer);reject(error)});
      server.once('exit',code=>{clearTimeout(timer);reject(new Error('Server exited '+code))});
      server.stdout.on('data',part=>{
        if(part.toString().includes('Living Canvas:')){
          clearTimeout(timer);resolve();
        }
      });
    });
    const health=await fetch(base+'/api/health');
    assert.equal(health.status,200);
    assert.equal((await health.json()).stored,0);
    const event={kind:'file.changed',runId:'test',agentId:'main',filePath:'src/a.js',
      linesAdded:3,prompt:'DO_NOT_EXPORT',toolResult:'DO_NOT_EXPORT'};
    const posted=await fetch(base+'/api/events',{method:'POST',
      headers:{'content-type':'application/json'},body:JSON.stringify(event)});
    assert.equal(posted.status,202);
    const response=await fetch(base+'/api/snapshot');
    assert.equal(response.status,200);
    const result=await response.json();
    assert.equal(result.events[0].prompt,undefined);
    assert.equal(result.events[0].toolResult,undefined);
    assert.equal(result.state.files[0].path,'src/a.js');
    assert.equal(result.state.total,1);
    const blocked=await fetch(base+'/api/events',{method:'POST',
      headers:{'content-type':'application/json',origin:'https://malicious.invalid'},
      body:JSON.stringify(event)});
    assert.equal(blocked.status,403);
    assert.equal((await fetch(base+'/')).status,200);
    assert.equal((await fetch(base+'/src/core/events.mjs')).status,200);
    assert.equal((await fetch(base+'/package.json')).status,404);
  } finally {
    server.kill('SIGTERM');
  }
});
