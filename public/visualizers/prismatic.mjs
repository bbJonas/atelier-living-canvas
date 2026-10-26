import { deriveArtSignals, inkColor, colorFor } from './art-signals.mjs';
import { clamp, hash01 } from '../../src/core/layout.mjs';
export const title='Prismatic Ink';
export const subtitle='CHROMA / OVERPAINT';

export function draw(ctx,{width:w,height:h,events,time}){
  const ground=ctx.createLinearGradient(0,0,w,h);
  ground.addColorStop(0,'#180d2b');ground.addColorStop(.54,'#181a39');
  ground.addColorStop(1,'#0d1f2a');ctx.fillStyle=ground;ctx.fillRect(0,0,w,h);
  const {marks,regions}=deriveArtSignals(events,time);
  const s=Math.min(w,h),top=h*.15,bottom=h*.89;
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  ctx.globalCompositeOperation='screen';
  // Real directory groups create a subdued field of persistent pigment.
  for(const region of regions){
    if(!region.edits)continue;
    const x=w*(.13+region.x*.74),r=clamp(18+region.edits*1.6,20,s*.26);
    const grad=ctx.createRadialGradient(x,h*.53,0,x,h*.53,r*1.7);
    const p=colorFor(region.key,2);
    grad.addColorStop(0,inkColor(p,.11));grad.addColorStop(1,inkColor(p,0));
    ctx.fillStyle=grad;ctx.fillRect(x-r*1.7,h*.53-r*1.7,r*3.4,r*3.4);
  }
  for(const [i,m] of marks.entries()){
    if(m.kind==='file.discovered'||m.kind==='model.started')continue;
    const x=w*(.13+m.anchor*.74);
    const y=bottom-(bottom-top)*m.progress;
    const spin=hash01(m.region+':'+m.revision+':'+i);
    const r=clamp(s*.018*m.weight*(1+Math.log1p(m.revision)*.22),3,s*.095);
    const p=m.file?colorFor(m.agent,i%3):colorFor(m.agent,3);
    const alpha=m.file?.22:m.handoff?.3:.09;
    const direction=spin>.5?1:-1;
    const bend=(spin-.5)*s*.27;
    // Chromatic translucent brush bodies retain every sampled gesture.
    ctx.beginPath();
    ctx.moveTo(x-r*2.3,y+r*direction);
    ctx.bezierCurveTo(x+bend-r,y-r*2.8,x-bend*.5+r,y+r*2.5,x+r*2.9,y-r*direction);
    ctx.strokeStyle=inkColor(p,alpha);ctx.lineWidth=r*(m.file?1.65:.58);ctx.stroke();
    ctx.strokeStyle=inkColor(colorFor(m.agent,2),.31+Math.min(.21,m.revision*.018));
    ctx.lineWidth=m.file?1.4:.65;ctx.stroke();
    if(m.file && (i%3===0 || m.revision>3)){
      const halo=ctx.createRadialGradient(x,y,0,x,y,r*2.5);
      halo.addColorStop(0,inkColor(p,.24));halo.addColorStop(1,inkColor(p,0));
      ctx.fillStyle=halo;ctx.fillRect(x-r*2.5,y-r*2.5,r*5,r*5);
      ctx.beginPath();ctx.arc(x,y,r*(.2+Math.min(m.revision,8)*.085),0,Math.PI*2);
      ctx.strokeStyle=inkColor(colorFor(m.region,1),.38);ctx.lineWidth=.8;ctx.stroke();
    }
    if(m.handoff&&m.peer){
      const peerX=w*(.13+hash01(m.peer)*.74);
      ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo((x+peerX)/2,y-r*3,peerX,y-r*.4);
      ctx.strokeStyle=inkColor(colorFor(m.peer,2),.38);ctx.lineWidth=1.35;ctx.stroke();
    }
  }
  ctx.restore();
  ctx.font='10px ui-monospace,monospace';ctx.fillStyle='#f8c9dd';
  ctx.fillText('PRISMATIC INK  /  '+marks.length+' OBSERVED MARKS',24,43);
}
