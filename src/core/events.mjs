/**
 * Living Canvas telemetry v1. Intentionally uses an allowlist. Raw model messages,
 * chain-of-thought, prompts, tool arguments/results, and file bodies NEVER enter it.
 */
export const KINDS = Object.freeze([
  'run.started', 'run.completed',
  'agent.started', 'agent.completed', 'agent.message',
  'model.started', 'model.completed',
  'tool.started', 'tool.completed',
  'file.changed', 'test.completed'
]);
const KIND_SET = new Set(KINDS);
const STATUS = new Set(['ok', 'error', 'cancelled', 'unknown']);
const OPERATIONS = new Set(['create', 'modify', 'delete', 'rename']);
const HIDDEN = /^(?:\.git|\.env(?:\..*)?|node_modules|\.ssh|secrets?|credentials?|private[-_]?keys?|id_rsa|id_ed25519)$/i;

function ident(value, field, fallback) {
  const v = value ?? fallback;
  if (typeof v !== 'string' || !/^[\w.:-]{1,96}$/.test(v)) {
    throw new TypeError('Invalid ' + field);
  }
  return v;
}
function boundedNumber(value, field, maximum) {
  if (value == null) return undefined;
  if (!Number.isFinite(value) || value < 0 || value > maximum) {
    throw new TypeError('Invalid ' + field);
  }
  return Math.round(value);
}
export function sanitizePath(value) {
  if (typeof value !== 'string' || value.length > 600 || value.includes('\0')) {
    throw new TypeError('Invalid filePath');
  }
  const path = value.replaceAll('\\', '/');
  if (path.startsWith('/') || /^[a-zA-Z]:/.test(path)) throw new TypeError('Absolute paths not allowed');
  const parts = path.split('/').filter(x => x && x !== '.');
  if (!parts.length || parts.some(x => x === '..' || x.length > 120 || HIDDEN.test(x))) {
    throw new TypeError('Unsafe filePath');
  }
  return parts.join('/');
}
export function normalizeEvent(raw, { now = Date.now(), runId = 'atelier-demo', includeFilePaths = true } = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new TypeError('Expected event object');
  if (!KIND_SET.has(raw.kind)) throw new TypeError('Unknown event kind');
  const at = raw.at == null ? now : raw.at;
  if (!Number.isSafeInteger(at) || at < 0) throw new TypeError('Invalid timestamp (epoch ms)');
  const event = {
    v: 1,
    kind: raw.kind,
    at,
    runId: ident(raw.runId, 'runId', runId),
    agentId: ident(raw.agentId, 'agentId', 'main')
  };
  if (raw.parentAgentId != null) event.parentAgentId = ident(raw.parentAgentId, 'parentAgentId');
  if (raw.peerAgentId != null) event.peerAgentId = ident(raw.peerAgentId, 'peerAgentId');
  if (raw.filePath != null && includeFilePaths) event.filePath = sanitizePath(raw.filePath);
  if (raw.kind === 'file.changed' && includeFilePaths && !event.filePath) {
    throw new TypeError('file.changed requires filePath');
  }
  if (raw.operation != null) {
    if (!OPERATIONS.has(raw.operation)) throw new TypeError('Invalid operation');
    event.operation = raw.operation;
  }
  if (raw.toolName != null) event.toolName = ident(raw.toolName, 'toolName');
  if (raw.status != null) {
    if (!STATUS.has(raw.status)) throw new TypeError('Invalid status');
    event.status = raw.status;
  }
  for (const [field, max] of [['durationMs', 86400000], ['linesAdded', 1000000], ['linesRemoved', 1000000], ['testPassed', 1000000], ['testFailed', 1000000]]) {
    const n = boundedNumber(raw[field], field, max);
    if (n !== undefined) event[field] = n;
  }
  // All other fields are discarded, even if callers accidentally send secrets.
  return Object.freeze(event);
}
