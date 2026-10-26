import { normalizeEvent } from './events.mjs';

/**
 * Wrap *real execution hooks*; does not parse model prose or invent events.
 * Emission failure is isolated from the operation being instrumented.
 */
export function createInstrumentation({ runId = 'local-run', agentId = 'main', emit, clock = Date.now, onError = () => {} } = {}) {
  if (typeof emit !== 'function') throw new TypeError('emit callback required');
  const fire = (kind, fields = {}) => {
    const item = normalizeEvent({ kind, runId, agentId, at: clock(), ...fields });
    try {
      Promise.resolve(emit(item)).catch(onError);
    } catch (error) { onError(error); }
    return item;
  };
  async function around(kind, name, operation, id = agentId) {
    if (typeof operation !== 'function') throw new TypeError('operation callback required');
    const started = clock();
    fire(kind + '.started',{ agentId:id, ...(kind === 'tool' ? {toolName:name}: {}) });
    try {
      const result = await operation();
      fire(kind + '.completed',{ agentId:id, ...(kind === 'tool' ? {toolName:name}: {}),
        durationMs:Math.max(0,clock()-started), status:'ok' });
      return result;
    } catch (error) {
      fire(kind + '.completed',{ agentId:id, ...(kind === 'tool' ? {toolName:name}: {}),
        durationMs:Math.max(0,clock()-started), status:'error' });
      throw error;
    }
  }
  return {
    runStarted: () => fire('run.started'),
    runCompleted: status => fire('run.completed',{status:status||'ok'}),
    agentStarted: (id,parentAgentId) => fire('agent.started',{
      agentId:id,...(parentAgentId?{parentAgentId}:{}) }),
    agentCompleted: (id,status='ok') => fire('agent.completed',{agentId:id,status}),
    handoff: (from,to) => fire('agent.message',{agentId:from,peerAgentId:to}),
    fileChanged: (id,filePath,options={}) => fire('file.changed',{agentId:id,filePath,...options}),
    fileDiscovered: path => fire('file.discovered',{agentId:'inventory',filePath:path}),
    testCompleted: (id,testPassed,testFailed=0) => fire('test.completed',{
      agentId:id,testPassed,testFailed,status:testFailed?'error':'ok' }),
    withTool: (name,operation,id) => around('tool',name,operation,id),
    withModelRequest: (operation,id) => around('model',null,operation,id)
  };
}

/**
 * No idle polling; timer exists only while a batch is pending. Bounded queue,
 * small batches, serialized flushes and explicit drop/error counters.
 */
export function createHttpEmitter({
  endpoint = 'http://127.0.0.1:4173/api/events',
  token = '', batchSize = 40, delayMs = 150,
  maxQueued = 800, transport = fetch
} = {}) {
  let queue = [], timer = null, closed = false, pending = Promise.resolve();
  let dropped = 0, failedBatches = 0, sent = 0;
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = 'Bearer ' + token;
  function flush() {
    if (timer != null) { clearTimeout(timer); timer = null; }
    if (!queue.length) return pending;
    const items = queue.splice(0,batchSize);
    pending = pending.then(async() => {
      const response = await transport(endpoint,{
        method:'POST', headers, body:JSON.stringify(items)
      });
      if (!response.ok) throw new Error('Ingest status '+response.status);
      sent += items.length;
    }).catch(() => { failedBatches++; dropped += items.length; });
    if (queue.length) timer = setTimeout(flush,delayMs);
    return pending;
  }
  function emit(event) {
    if (closed) { dropped++;return; }
    if (queue.length >= maxQueued) { queue.shift();dropped++; }
    queue.push(event);
    if (queue.length >= batchSize) flush();
    else if (timer == null) timer=setTimeout(flush,delayMs);
  }
  async function close() {
    closed=true;
    if (timer != null) { clearTimeout(timer);timer=null; }
    while(queue.length) await flush();
    await pending;
  }
  return {emit,flush,close,get stats(){return {sent,dropped,failedBatches,queued:queue.length}}};
}
