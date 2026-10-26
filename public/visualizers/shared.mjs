import { hash01, topology, clamp, ageGlow } from '../../src/core/layout.mjs';
export const COLORS = ['#67daca','#af9af0','#efb47c','#83baff','#ed8cba'];

export function background(ctx,w,h,t,deep=false) {
  const fill=ctx.createRadialGradient(w*.51,h*.65,20,w*.5,h*.55,Math.max(w,h)*.8);
  fill.addColorStop(0,deep?'#142634':'#13232d');
  fill.addColorStop(.55,'#0c1822');
  fill.addColorStop(1,'#0a121b');
  ctx.fillStyle=fill;ctx.fillRect(0,0,w,h);
  ctx.save();
  for(let i=0;i<95;i++){
    const x=hash01('x'+i)*w,y=hash01('y'+i)*h;
    const alpha=.11+Math.sin(t*.00033+i)*.055;
    ctx.fillStyle='rgba(161,200,210,'+Math.max(.04,alpha)+')';
    ctx.beginPath();ctx.arc(x,y,(i%5===0?1.1:.45),0,Math.PI*2);ctx.fill();
  }
  ctx.strokeStyle='rgba(118,163,180,.045)';ctx.lineWidth=1;
  const step=45;
  for(let x=step;x<w;x+=step){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke()}
  for(let y=step;y<h;y+=step){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}
  ctx.restore();
}
export function waveEnergy(events,now,windowMs,samples=120) {
  const bins=new Float32Array(samples);
  const start=now-windowMs;
  for(const e of events){
    const x=(e.at-start)/windowMs;
    if(x<0||x>1)continue;
    const index=Math.floor(x*(samples-1));
    const weight=e.kind==='file.changed'?1.35:e.kind==='agent.message'?1.1:
      e.kind==='tool.started'?.95:e.kind==='test.completed'?1.15:.48;
    for(let d=-3;d<=3;d++){
      const j=index+d;if(j>=0&&j<samples)bins[j]+=weight*Math.exp(-d*d/3.5);
    }
  }
  return bins;
}
export function drawWavefield(ctx,env,box,{lanes=7,windowMs=46000,amplitude=25,opacity=1}={}){
  const {events,time}=env, {x,y,width,height}=box;
  const bins=waveEnergy(events,time,windowMs,126);
  ctx.save();ctx.globalAlpha=opacity;
  const maxVal=Math.max(1,...bins);
  for(let lane=0;lane<lanes;lane++){
    const hue=COLORS[lane%COLORS.length];
    const baseline=y+(lane+1)*height/(lanes+1);
    const phase=lane*.71;
    ctx.beginPath();
    for(let i=0;i<bins.length;i++){
      const xx=x+width*i/(bins.length-1);
      const intensity=bins[i]/maxVal;
      const noise=Math.sin(i*.19+phase+time*.0005)*2.8+Math.sin(i*.053+lane*2+time*.0002)*3;
      const yy=baseline+noise+(intensity*amplitude*Math.sin(i*.42+phase+time*.0012));
      if(i===0)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy);
    }
    ctx.strokeStyle=hue;ctx.lineWidth=lane===2?1.65:1.1;
    ctx.globalAlpha=(.16+(lane%3)*.1)*opacity;ctx.stroke();
    if(lane===2||lane===5){
      ctx.shadowColor=hue;ctx.shadowBlur=18;ctx.globalAlpha=.3*opacity;ctx.stroke();ctx.shadowBlur=0;
    }
  }
  ctx.restore();
}
export function drawTopology(ctx,scene,time,box,{labels=false,orbit=false}={}){
  const nodes=topology(scene.files,box);
  const dict=new Map(nodes.map(n=>[n.path,n]));
  ctx.save();
  if(orbit){
    const cx=box.x+box.width/2,cy=box.y+box.height/2;
    for(let i=0;i<4;i++){
      ctx.beginPath();ctx.ellipse(cx,cy,Math.min(box.width,box.height)*(.15+i*.1),Math.min(box.width,box.height)*(.115+i*.072),-.25,0,Math.PI*2);
      ctx.strokeStyle='rgba(108,155,184,.08)';ctx.lineWidth=.8;ctx.stroke();
    }
  }
  for(const node of nodes){
    if(!node.parent)continue;
    const other=dict.get(node.parent);
    if(!other)continue;
    const age=node.lastAt==null?0:ageGlow(time,node.lastAt);
    ctx.beginPath();ctx.moveTo(other.x,other.y);
    const cx=(node.x+other.x)/2,cy=(node.y+other.y)/2-8;
    ctx.quadraticCurveTo(cx,cy,node.x,node.y);
    ctx.strokeStyle='rgba(110,189,191,'+(.13+age*.24)+')';
    ctx.lineWidth=node.directory?.75:1;ctx.stroke();
  }
  for(const node of nodes){
    const recent=node.lastAt==null?0:ageGlow(time,node.lastAt);
    const r=node.directory?2.7:clamp(2.3+Math.sqrt(node.changes||0)*1.4,2.5,9);
    const color=node.directory?'#5a8297':node.changes?'#74e2ce':'#7489a4';
    if(recent>0.02&&!node.directory){
      const glow=ctx.createRadialGradient(node.x,node.y,1,node.x,node.y,20+recent*18);
      glow.addColorStop(0,'rgba(113,235,210,'+(.25*recent)+')');
      glow.addColorStop(1,'rgba(113,235,210,0)');
      ctx.fillStyle=glow;ctx.beginPath();ctx.arc(node.x,node.y,20+recent*18,0,Math.PI*2);ctx.fill();
    }
    ctx.fillStyle=color;ctx.globalAlpha=node.directory?.68:1;
    ctx.beginPath();ctx.arc(node.x,node.y,r,0,Math.PI*2);ctx.fill();
    if(!node.directory&&(node.changes||0)>2){
      ctx.strokeStyle='rgba(129,223,214,.24)';ctx.lineWidth=1;
      ctx.beginPath();ctx.arc(node.x,node.y,r+4+Math.sin(time*.001+node.x)*1,0,Math.PI*2);ctx.stroke();
    }
  }
  if(labels){
    ctx.font='10px ui-sans-serif, system-ui';ctx.textAlign='left';
    const newest=nodes.filter(n=>!n.directory&&n.changes).sort((a,b)=>b.lastAt-a.lastAt).slice(0,8);
    for(const node of newest){
      ctx.fillStyle='rgba(194,218,225,.72)';
      ctx.fillText(node.path.split('/').at(-1),node.x+10,node.y-5);
    }
  }
  ctx.restore();
}
export function drawCount(ctx,text,x,y,color='#7e9aa7'){
  ctx.save();ctx.fillStyle=color;ctx.font='10px ui-monospace, monospace';ctx.letterSpacing='1px';ctx.fillText(text,x,y);ctx.restore();
}
