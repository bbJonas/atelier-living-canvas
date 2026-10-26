import { background,COLORS,drawCount } from './shared.mjs';
import { clamp } from '../../src/core/layout.mjs';
export const title='Agent currents';
export const subtitle='PARALLEL / HANDOFFS';
export function draw(ctx,env){
  const {width:w,height:h,scene,time,events}=env;
  background(ctx,w,h,time);
  const agents=Array.from(scene.agents.values()).slice(0,9);
  const startX=85,endX=w-55,top=90,space=(h-165)/Math.max(1,agents.length);
  const index=new Map(agents.map((a,i)=>[a.id,i]));
  const windowMs=90000;
  const signalTime=e=>startX+clamp((e.at-(time-windowMs))/windowMs,0,1)*(endX-startX);
  for(let j=0;j<agents.length;j++){
    const a=agents[j],y=top+(j+.5)*space,color=COLORS[j%COLORS.length];
    ctx.fillStyle='#8299aa';ctx.font='11px ui-sans-serif, system-ui';ctx.fillText(a.id,23,y-12);
    ctx.strokeStyle='rgba(103,150,168,.14)';ctx.lineWidth=.8;
    ctx.beginPath();ctx.moveTo(startX,y);ctx.lineTo(endX,y);ctx.stroke();
    // Bin pulses once: O(events * constant) rather than O(events * pixels).
    const energies=new Float32Array(136);
    for(const e of events){
      if(e.agentId!==a.id||e.at<time-windowMs)continue;
      const center=Math.round((e.at-(time-windowMs))/windowMs*135);
      const weight=e.kind==='file.changed'?1.8:1;
      for(let d=-9;d<=9;d++){
        const k=center+d;
        if(k>=0&&k<energies.length)energies[k]+=Math.exp(-d*d/14)*weight;
      }
    }
    ctx.beginPath();
    for(let k=0;k<=135;k++){
      const x=startX+(endX-startX)*k/135;
      const yy=y+Math.sin(k*.12+j*2+time*.00075)*(4+Math.min(energies[k]*4,space*.28));
      if(!k)ctx.moveTo(x,yy);else ctx.lineTo(x,yy);
    }
    ctx.strokeStyle=color;ctx.lineWidth=1.6;ctx.shadowColor=color;ctx.shadowBlur=8;ctx.stroke();ctx.shadowBlur=0;
    ctx.fillStyle=color;ctx.beginPath();ctx.arc(endX,y,2.8,0,Math.PI*2);ctx.fill();
  }
  for(const link of scene.interactions.slice(-60)){
    if(link.at<time-windowMs||!index.has(link.from)||!index.has(link.to))continue;
    const x=signalTime(link),y1=top+(index.get(link.from)+.5)*space,
      y2=top+(index.get(link.to)+.5)*space;
    ctx.beginPath();ctx.moveTo(x,y1);ctx.bezierCurveTo(x+28,y1,x-28,y2,x,y2);
    ctx.strokeStyle='rgba(238,185,144,.48)';ctx.lineWidth=1;ctx.stroke();
    ctx.fillStyle='#f2b795';ctx.beginPath();ctx.arc(x,y2,2,0,Math.PI*2);ctx.fill();
  }
  drawCount(ctx,'AGENT STREAMS / HANDOFFS',26,55);
  if(!agents.length)drawCount(ctx,'No agents observed',w*.4,h*.52);
}
