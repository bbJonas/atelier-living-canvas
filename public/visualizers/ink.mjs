import { observedEvents, pigment, rgba } from './art-data.mjs';
import { clamp, hash01 } from '../../src/core/layout.mjs';
export const title = 'Kinetic Ink';
export const subtitle = 'PIGMENT / ACCUMULATION';

export function draw(ctx, { width:w, height:h, events, time }) {
  const paper = ctx.createLinearGradient(0, 0, w, h);
  paper.addColorStop(0, '#13242c'); paper.addColorStop(.55, '#182833');
  paper.addColorStop(1, '#101924');
  ctx.fillStyle = paper; ctx.fillRect(0, 0, w, h);
  const marks = observedEvents(events, time);
  const first = marks[0]?.at ?? time;
  const span = Math.max(1, time - first);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // A slow-growing watercolor ground, driven by actual agent/file marks.
  for (let i = 0; i < marks.length; i++) {
    const e = marks[i];
    if (e.kind === 'file.discovered' || e.kind === 'model.started') continue;
    const progress = clamp((e.at - first) / span, 0, 1);
    const key = e.filePath || e.agentId || 'main';
    const seed = hash01(key);
    const variant = hash01(key + ':' + i);
    const x = w * (.13 + seed * .74);
    const y = h * (.19 + progress * .62);
    const recent = clamp(1 - (time - e.at) / 14000, 0, 1);
    const color = pigment(e.agentId || 'main');
    const file = e.kind === 'file.changed';
    const handoff = e.kind === 'agent.message';
    const test = e.kind === 'test.completed';
    const scale = file ? clamp(9 + Math.sqrt(e.linesAdded || 0) * 1.7, 9, 30) :
      handoff ? 13 : test ? 10 : 4;
    const dx = (variant - .5) * w * .19;
    const sweep = (seed - .5) * h * .17;
    ctx.beginPath();
    ctx.moveTo(x - scale * 2.2, y + sweep);
    ctx.bezierCurveTo(x + dx - scale, y - scale * 2.4,
      x - dx + scale * 1.7, y + scale * 2.1,
      x + scale * (handoff ? 7 : 3.4), y + sweep * .4);
    ctx.strokeStyle = rgba(color, (file ? .115 : .06) + recent * .24);
    ctx.lineWidth = scale * (file ? .64 : .26);
    ctx.stroke();
    // Dry-brush edge: recognizable layering at the same file anchor.
    ctx.beginPath();
    ctx.moveTo(x - scale * 1.8, y + sweep - 1);
    ctx.quadraticCurveTo(x + dx, y - scale * 1.4,
      x + scale * 3.3, y + sweep * .4 - 2);
    ctx.strokeStyle = rgba(color, .27 + recent * .4);
    ctx.lineWidth = file ? 1.45 : .8;
    ctx.stroke();
    if (file || handoff) {
      ctx.beginPath();
      ctx.arc(x + dx * .2, y, file ? 1.7 + Math.min(3, (e.linesRemoved || 0) / 20) : 1.5, 0, Math.PI * 2);
      ctx.fillStyle = rgba(color, .55 + recent * .4);
      ctx.fill();
    }
  }
  // Translucent washes fuse repeated activity, without evolving random noise.
  const recentMarks = marks.filter(e => e.kind === 'file.changed').slice(-18);
  for (const e of recentMarks) {
    const x = w * (.13 + hash01(e.filePath || e.agentId) * .74);
    const y = h * (.19 + clamp((e.at - first) / span, 0, 1) * .62);
    const r = Math.min(w, h) * .17;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    const color = pigment(e.agentId);
    grad.addColorStop(0, rgba(color, .032));
    grad.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = grad; ctx.fillRect(x-r, y-r, 2*r, 2*r);
  }
  ctx.restore();
  ctx.fillStyle = '#aec1bf'; ctx.globalAlpha = .66;
  ctx.font = '10px ui-monospace,monospace';
  ctx.fillText('INK STUDY   /   ' + marks.length + ' OBSERVED MARKS', 26, 47);
  ctx.globalAlpha = 1;
}
