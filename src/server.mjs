import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';
import { EventCollector } from './core/collector.mjs';
import { MaterializedScene } from './core/materializer.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || '127.0.0.1';
const TOKEN = process.env.LIVING_CANVAS_TOKEN || '';
const collector = new EventCollector({
  capacity: Number(process.env.CANVAS_CAPACITY || 3000),
  maxPerSecond: Number(process.env.CANVAS_RATE || 300),
  includeFilePaths: process.env.CANVAS_REDACT_PATHS !== '1'
});
const materializer = new MaterializedScene();
collector.subscribe(event => materializer.apply(event));
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8'
};
const respond = (res, code, payload) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store' });
  res.end(JSON.stringify(payload));
};
const pushSSE = (res, name, value) => {
  res.write('event: ' + name + '\ndata: ' + JSON.stringify(value) + '\n\n');
};
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // local CLI clients do not send Origin
  return origin === 'http://' + req.headers.host || origin === 'https://' + req.headers.host;
}
async function readBody(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 128 * 1024) throw new RangeError('Payload too large');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy',
    "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'");
  let url;
  try { url = new URL(req.url, 'http://localhost'); }
  catch { return respond(res, 400, { error: 'Invalid URL' }); }
  if (url.pathname === '/api/health' && req.method === 'GET') {
    return respond(res, 200, { ok: true, schema: 1, ...collector.stats });
  }
  if (url.pathname === '/api/snapshot' && req.method === 'GET') {
    return respond(res, 200, { events: collector.snapshot(), stats: collector.stats, state: materializer.snapshot() });
  }
  if (url.pathname === '/api/events' && req.method === 'POST') {
    if (!sameOrigin(req)) return respond(res, 403, { error: 'Cross-origin writes disabled' });
    if (TOKEN && req.headers.authorization !== 'Bearer ' + TOKEN) {
      return respond(res, 401, { error: 'Invalid bearer token' });
    }
    if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) {
      return respond(res, 415, { error: 'application/json required' });
    }
    try {
      const output = collector.ingest(await readBody(req));
      return respond(res, 202, { accepted: output.length, lastSeq: output.at(-1).seq });
    } catch (error) {
      return respond(res, error instanceof RangeError ? 429 : 400, { error: error.message });
    }
  }
  if (url.pathname === '/api/stream' && req.method === 'GET') {
    if (collector.stats.subscribers >= 20) return respond(res, 503, { error: 'Too many viewers' });
    res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive',
      'X-Accel-Buffering': 'no' });
    pushSSE(res, 'snapshot', { events: collector.snapshot(), stats: collector.stats, state: materializer.snapshot() });
    const unsubscribe = collector.subscribe(event => {
      if (!res.destroyed) pushSSE(res, 'telemetry', event);
    });
    const beat = setInterval(() => { if (!res.destroyed) res.write(': heartbeat\n\n'); }, 15000);
    const cleanup = () => { clearInterval(beat); unsubscribe(); };
    req.on('close', cleanup);
    res.on('close', cleanup);
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return respond(res, 405, { error: 'Method not allowed' });
  let file;
  try {
    const uri = decodeURIComponent(url.pathname);
    if (uri.includes('\0')) throw new Error('Bad path');
    if (uri === '/') file = resolve(ROOT, 'public/index.html');
    else if (uri.startsWith('/src/core/')) file = resolve(ROOT, '.' + uri);
    else file = resolve(ROOT, 'public', '.' + uri);
    const permitted = [resolve(ROOT,'public'), resolve(ROOT,'src/core')];
    if (!permitted.some(dir => file.startsWith(dir + sep))) throw new Error('Outside public roots');
    if (!(extname(file) in TYPES)) throw new Error('Unsupported resource');
    const content = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)], 'Cache-Control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch {
    respond(res, 404, { error: 'Not found' });
  }
});
server.listen(PORT, HOST, () => {
  console.log('Living Canvas: http://' + HOST + ':' + PORT);
  console.log('Ingestion: POST /api/events (structured metadata only)');
  if (HOST !== '127.0.0.1' && HOST !== '::1' && !TOKEN) {
    console.warn('WARNING: Non-loopback binding without LIVING_CANVAS_TOKEN');
  }
});
