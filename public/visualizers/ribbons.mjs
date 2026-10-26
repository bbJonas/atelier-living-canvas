import { deriveArtSignals, inkColor, colorFor } from './art-signals.mjs';
import { clamp, hash01 } from '../../src/core/layout.mjs';
export const title='Kinetic Ribbons';
export const subtitle='FLOW / INTERPLAY';

export function draw(ctx,{width:w,height:h,events,time}){
  const ground=ctx.createLinearGradient(0,0,w,h);
  ground.addColorStop(0,'#0c1830');ground.addColorStop(.52,'#14243c');
  ground.addColorStop(1,'#1c102a');ctx.fillStyle=ground;ctx.fillRect(0,0,w,h);
  const {marks,agentCounts}=deriveArtSignals(events,time);
  const agents=[...agentCounts.keys()].slice(0,12);
  const s=Math.min(w,h),top=h*.14,bottom=h*.92;
  const tracks=new Map();
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  ctx.globalCompositeOperation='screen';
  // Each observed agent owns one continuous calligraphic stream.
  for(let j=0;j<agents.length;j++){
    const agent=agents[j],p=colorFor(agent);
    const items=marks.filter(m=>m.agent===agent&&m.kind!=='file.discovered');
    const anchor=w*(.12+hash01(agent)*.76);
    const shift=(j-(agents.length-1)/2)*w*.025;
    const X=m=>clamp(anchor+shift+
      Math.sin(m.progress*9+hash01(agent+'s')*6.28)*w*.082+
      (m.burst-5)*w*.002,24,w-24);
    tracks.set(agent,X);
    if(!items.length)continue;
    let px=X({progress:0,burst:0}),py=bottom;
    const ribbon=ctx.createLinearGradient(anchor-s*.16,0,anchor+s*.16,h);
    ribbon.addColorStop(0,inkColor(colorFor(agent,2),.88));
    ribbon.addColorStop(.5,inkColor(p,.48));
    ribbon.addColorStop(1,inkColor(colorFor(agent,1),.68));
    ctx.beginPath();ctx.moveTo(px,py);
    for(const m of items){
      const x=X(m),y=bottom-(bottom-top)*m.progress;
      ctx.bezierCurveTo(px+(x-px)*.18,py-(py-y)*.68,x-(x-px)*.18,y+(py-y)*.32,x,y);
      px=x;py=y;
    }
    ctx.strokeStyle=ribbon;ctx.lineWidth=clamp(s*.026+Math.sqrt(items.length)*.36,6,s*.062);ctx.stroke();
    ctx.strokeStyle=inkColor(colorFor(agent,3),.78);ctx.lineWidth=1.6;ctx.stroke();
    // Parallel fine filaments add texture and layer depth.
    for(const offset of [-5,5]){
      ctx.beginPath();ctx.moveTo(X({progress:0,burst:0})+offset,bottom);
      let lastX=anchor+offset,lastY=bottom;
      for(const m of items){
        const x=X(m)+offset,y=bottom-(bottom-top)*m.progress;
        ctx.quadraticCurveTo((lastX+x)/2,(lastY+y)/2,x,y);
        lastX=x;lastY=y;
      }
      ctx.strokeStyle=inkColor(p,.27);ctx.lineWidth=.9;ctx.stroke();
    }
  }
  // Revisions emboss the stream; observed handoffs braid agent streams.
  for(const m of marks){
    if(m.kind==='file.discovered')continue;
    const X=tracks.get(m.agent);if(!X)continue;
    const y=bottom-(bottom-top)*m.progress,x=X(m),p=colorFor(m.agent,2);
    if(m.handoff&&tracks.has(m.peer)){
      const to=tracks.get(m.peer)(m);
      ctx.beginPath();ctx.moveTo(x,y);
      ctx.bezierCurveTo(x,y-s*.085,to,y+s*.085,to,y);
      ctx.strokeStyle=inkColor(colorFor(m.peer,1),.53);ctx.lineWidth=clamp(2+m.burst*.3,2,6);ctx.stroke();
      ctx.beginPath();ctx.arc(to,y,2.8,0,Math.PI*2);
      ctx.fillStyle=inkColor(p,.95);ctx.fill();
    }else if(m.file){
      const r=clamp(2+Math.log1p(m.revision)*1.4,2,8);
      ctx.beginPath();ctx.moveTo(x-r*1.4,y+r);ctx.lineTo(x+r*1.4,y-r);
      ctx.strokeStyle=inkColor(p,.6);ctx.lineWidth=1+Math.min(3,m.revision*.16);ctx.stroke();
    }else if(m.kind==='test.completed'){
      ctx.beginPath();ctx.arc(x,y,3.5,0,Math.PI*2);
      ctx.strokeStyle=inkColor(p,.55);ctx.lineWidth=1;ctx.stroke();
    }
  }
  ctx.restore();
  ctx.font='10px ui-monospace,monospace';ctx.fillStyle='#c6daed';
  ctx.fillText('KINETIC RIBBONS  /  '+agents.length+' OBSERVED AGENT STREAMS',24,43);
}
