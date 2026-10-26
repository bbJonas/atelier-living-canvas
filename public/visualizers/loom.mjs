import { observedEvents, pigment, rgba } from './art-data.mjs';
import { clamp, hash01 } from '../../src/core/layout.mjs';
export const title = 'Signal Loom';
export const subtitle = 'TIME / INTERLACING';

export function draw(ctx, { width:w, height:h, scene, events, time }) {
  ctx.fillStyle='#101a23';ctx.fillRect(0,0,w,h);
  const marks=observedEvents(events,time);
  const start=marks[0]?.at ?? time, span=Math.max(1,time-start);
  const left=42,right=w-40,top=h*.18,bottom=h*.83;
  const agents=Array.from(scene.agents.values()).slice(0,12);
  const byAgent=new Map(agents.map(a=>[a.id,[]]));
  const X=e=>left+(right-left)*clamp((e.at-start)/span,0,1);
  for(const e of marks) if(byAgent.has(e.agentId))byAgent.get(e.agentId).push(e);
  ctx.save();ctx.lineCap='round';
  // A woven ground: dense vertical weft comes from event times, not a clock shader.
  for (let i=0;i<marks.length;i++) {
    const e=marks[i];if(e.kind==='file.discovered')continue;
    const x=X(e);
    const p=pigment(e.agentId||'main');
    const file=e.kind==='file.changed', test=e.kind==='test.completed';
    ctx.strokeStyle=rgba(p,file?.23:test?.15:.075);
    ctx.lineWidth=file?2:test?1.35:.65;
    ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,bottom);ctx.stroke();
  }
  const trackY=new Map();
  for(let j=0;j<agents.length;j++) {
    const agent=agents[j];
    const base=top+(j+1)*(bottom-top)/(agents.length+1);
    trackY.set(agent.id,base);
    const items=byAgent.get(agent.id);
    const p=pigment(agent.id);
    ctx.beginPath();ctx.moveTo(left,base);
    // Signal density bends each warp locally; neighboring agents do not share lanes visually.
    let previous=left;
    for(let i=0;i<items.length;i++) {
      const e=items[i],x=X(e);
      const excursion=(hash01(agent.id+':'+i)-.5)*h*.075+
        (e.kind==='file.changed'?-h*.027:e.kind==='agent.message'?h*.036:0);
      const y=base+excursion;
      ctx.bezierCurveTo((previous+x)/2,base,(previous+x)/2,y,x,y);
      previous=x;
    }
    ctx.lineTo(right,base);
    ctx.strokeStyle=rgba(p,.8);ctx.lineWidth=1.75;ctx.stroke();
    ctx.strokeStyle=rgba(p,.17);ctx.lineWidth=8;ctx.stroke();
    // Parallel fine fibers give the composition a cloth-like surface.
    for(const offset of [-5,5]) {
      ctx.beginPath();ctx.moveTo(left,base+offset);
      ctx.lineTo(right,base+offset);
      ctx.strokeStyle=rgba(p,.13);ctx.lineWidth=.65;ctx.stroke();
    }
  }
  // Agent handoffs are knots between warp threads at observed timestamps.
  for(const e of marks) {
    if(e.kind!=='agent.message')continue;
    const a=trackY.get(e.agentId),b=trackY.get(e.peerAgentId);
    if(a==null||b==null)continue;
    const x=X(e),p=pigment(e.agentId);
    ctx.beginPath();ctx.moveTo(x,a);
    ctx.bezierCurveTo(x+12,a,x-12,b,x,b);
    ctx.strokeStyle=rgba(p,.79);ctx.lineWidth=2;ctx.stroke();
    ctx.beginPath();ctx.arc(x,b,2.6,0,Math.PI*2);
    ctx.fillStyle=rgba(p,.94);ctx.fill();
  }
  // Time ticks frame the actual observed interval.
  ctx.strokeStyle='rgba(189,207,207,.1)';ctx.lineWidth=1;
  for(let i=0;i<=10;i++){
    const x=left+(right-left)*i/10;
    ctx.beginPath();ctx.moveTo(x,bottom+12);ctx.lineTo(x,bottom+19);ctx.stroke();
  }
  ctx.restore();
  ctx.font='10px ui-monospace,monospace';ctx.fillStyle='#b6c8c8';
  ctx.fillText('SIGNAL LOOM   /   '+agents.length+' OBSERVED AGENTS',26,47);
  ctx.fillText('EARLIER',left,h*.9);ctx.textAlign='right';ctx.fillText('NOW',right,h*.9);ctx.textAlign='left';
}
