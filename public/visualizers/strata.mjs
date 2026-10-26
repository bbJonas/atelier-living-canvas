import { moduleLayout, pigment, rgba } from './art-data.mjs';
import { clamp, hash01 } from '../../src/core/layout.mjs';
export const title = 'Sculptural Strata';
export const subtitle = 'FORM / REVISION';

function polygon(ctx, points, fill) {
  ctx.beginPath();
  points.forEach(([x,y], i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
}
export function draw(ctx, { width:w, height:h, scene, time }) {
  const ground = ctx.createLinearGradient(0, 0, 0, h);
  ground.addColorStop(0, '#111821'); ground.addColorStop(.62, '#192630');
  ground.addColorStop(1, '#0b131b');
  ctx.fillStyle = ground; ctx.fillRect(0, 0, w, h);
  const cx = w * .5, floor = h * .84;
  ctx.save();
  // The floor is architectural space, not a constellation or graph.
  polygon(ctx, [[cx,h*.37],[w*.96,floor],[cx,h*.99],[w*.04,floor]], '#1c3038');
  ctx.strokeStyle = 'rgba(164,195,188,.09)'; ctx.lineWidth = 1;
  for (let j=0;j<8;j++) {
    const y = h * (.49 + j*.063);
    ctx.beginPath();ctx.moveTo(w*.10 + j*7,y);ctx.lineTo(w*.9-j*7,y);ctx.stroke();
  }
  const modules = moduleLayout(scene.files).sort((a,b)=>a.slot-b.slot);
  const columns = 12;
  const rows = 7;
  const scale = Math.min((w - 86) / (columns * 1.18), (h - 155) / (rows * .76), 42);
  for (const m of modules) {
    const col = m.slot % columns;
    const row = Math.floor(m.slot / columns);
    const x = cx + (col - (columns-1)/2) * scale * .98 + (row-(rows-1)/2)*scale*.38;
    const y = floor - (rows-1-row) * scale*.59 - (col-(columns-1)/2)*scale*.05;
    const z = m.changes ? 9 + clamp(Math.sqrt(m.changes)*15 + Math.log1p(m.added || 0)*2, 0, h*.36) : 3;
    const dx = scale*.38, dy = scale*.15, half = scale*.36;
    const p = pigment(m.parent || m.path.split('/')[0]);
    const aged = clamp(1 - (time - m.lastAt) / 18000, 0, 1);
    const bright = .38 + m.strength*.34 + aged*.25;
    // Isometric three-face volume, revisions lift the SAME module.
    polygon(ctx, [[x-half,y-z],[x,y-z-dy],[x+half,y-z],[x,y-z+dy]],
      rgba(p, m.changes ? bright : .11));
    polygon(ctx, [[x-half,y-z],[x,y-z+dy],[x,y+dy],[x-half,y]],
      rgba(p, m.changes ? bright*.55 : .075));
    polygon(ctx, [[x,y-z+dy],[x+half,y-z],[x+half,y],[x,y+dy]],
      rgba(p, m.changes ? bright*.33 : .055));
    if (m.changes > 1) {
      const ledges = Math.min(7, m.changes);
      ctx.strokeStyle = rgba(p, .23 + aged*.34);
      for(let k=1;k<=ledges;k++) {
        const ly=y-z+k*z/(ledges+1);
        ctx.beginPath();ctx.moveTo(x-half,ly);ctx.lineTo(x,ly+dy);
        ctx.lineTo(x+half,ly);ctx.stroke();
      }
    }
    if (aged > .05 && m.changes) {
      ctx.strokeStyle = rgba(p, .3 + aged*.6);ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(x-half,y-z);ctx.lineTo(x,y-z-dy);ctx.lineTo(x+half,y-z);ctx.stroke();
    }
  }
  ctx.restore();
  ctx.fillStyle = '#bac9c7';ctx.globalAlpha=.7;
  ctx.font='10px ui-monospace,monospace';
  ctx.fillText('STRATA   /   ' + modules.length + ' OF ' + scene.files.size + ' FILE MODULES',26,47);
  ctx.globalAlpha=1;
}
