/**
 * Local bridge. stdin mode accepts one canonical telemetry-v1 object per line.
 * --git-files records a *one-time* tracked-file inventory (NOT write activity).
 * No raw tool logs, prompts, or responses are forwarded.
 */
import { createInterface } from 'node:readline';
import { execFileSync } from 'node:child_process';
import { sanitizePath } from '../src/core/events.mjs';

const endpoint = process.env.LIVING_CANVAS_URL || 'http://127.0.0.1:4173/api/events';
const token = process.env.LIVING_CANVAS_TOKEN;
const headers = { 'content-type': 'application/json' };
if (token) headers.authorization = 'Bearer ' + token;
async function post(events) {
  const response = await fetch(endpoint, {
    method: 'POST', headers, body: JSON.stringify(events)
  });
  if (!response.ok) throw new Error('Ingest HTTP ' + response.status + ': ' + await response.text());
}
async function sendBatches(items, n = 50) {
  for (let i = 0; i < items.length; i += n) {
    await post(items.slice(i, i + n));
    if (i + n < items.length) await new Promise(resolve => setTimeout(resolve, 225));
  }
}
if (process.argv.includes('--git-files')) {
  const runId = process.env.CANVAS_RUN_ID || 'local-project';
  const raw = execFileSync('git', ['ls-files', '-z'], { maxBuffer: 8 * 1024 * 1024 }).toString();
  const events = [];
  for (const candidate of raw.split('\0')) {
    if (!candidate) continue;
    try {
      events.push({ kind: 'file.discovered', runId,
        filePath: sanitizePath(candidate), agentId: 'inventory' });
    } catch { /* do not leak hidden or unsafe paths */ }
  }
  await sendBatches(events);
  console.log('Tracked project files indexed: ' + events.length);
} else {
  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
  let batch = [];
  let pending = Promise.resolve();
  let failure = null;
  function flush() {
    if (!batch.length || failure) return;
    const items = batch;
    batch = [];
    pending = pending.then(() => post(items)).catch(error => { failure = error; });
  }
  // Flush sparse, long-running streams promptly; never wait for stdin EOF.
  const timer = setInterval(flush, 150);
  try {
    for await (const line of rl) {
      if (failure) throw failure;
      if (!line.trim()) continue;
      batch.push(JSON.parse(line));
      if (batch.length >= 40) flush();
      if (batch.length >= 200) await pending;
    }
    flush();
    await pending;
    if (failure) throw failure;
  } finally {
    clearInterval(timer);
  }
}
