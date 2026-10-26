import { clamp, hash01 } from '../../src/core/layout.mjs';

// Pure presentation projections. No network, random state, or fabricated work.
export const MAX_GESTURES = 720;
export const MAX_MODULES = 84;
export const PIGMENTS = [
  [110, 219, 204], [189, 167, 231], [237, 173, 127],
  [123, 178, 223], [226, 143, 173], [174, 210, 173]
];
export const pigment = key => PIGMENTS[Math.floor(hash01(key || 'main') * PIGMENTS.length)];
export const rgba = (rgb, alpha) => 'rgba(' + rgb.join(',') + ',' + clamp(alpha, 0, 1) + ')';

export function observedEvents(events, time, limit = MAX_GESTURES) {
  const max = Math.max(1, Math.floor(limit));
  const eligible = events.filter(e => Number.isFinite(e.at) && e.at <= time)
    .sort((a, b) => a.at - b.at);
  if (eligible.length <= max) return eligible;
  // Uniform history sampling keeps earlier phases instead of only the last N.
  const sampled = [];
  const stride = (eligible.length - 1) / Math.max(1, max - 1);
  for (let i = 0; i < max; i++) sampled.push(eligible[Math.round(i * stride)]);
  return sampled;
}

export function moduleLayout(files, max = MAX_MODULES) {
  const source = Array.isArray(files) ? files : Array.from(files.values());
  const capacity = Math.max(1, Math.floor(max));
  const ordered = source.filter(f => f.path && Number.isFinite(f.firstAt))
    .sort((a, b) => (Number(b.changes > 0) - Number(a.changes > 0)) ||
      a.firstAt - b.firstAt || a.path.localeCompare(b.path))
    .slice(0, capacity);
  const slots = new Set();
  return ordered.map(file => {
    let slot = Math.floor(hash01(file.path) * capacity);
    while (slots.has(slot)) slot = (slot + 1) % capacity;
    slots.add(slot);
    return { ...file, slot, strength: Math.min(1, Math.log1p(file.changes || 0) / 3.7) };
  });
}

export function tracePhases(events, time, fractions = [.16, .55, 1]) {
  const observed = events.filter(e => Number.isFinite(e.at) && e.at <= time)
    .sort((a, b) => a.at - b.at);
  if (!observed.length) return fractions.map(() => ({ time, events: [] }));
  // Quantiles by elapsed time, NOT by event count, preserve idle intervals.
  const first = observed[0].at;
  return fractions.map(fraction => {
    const at = first + (time - first) * clamp(fraction, 0, 1);
    return { time: at, events: observed.filter(e => e.at <= at) };
  });
}
