import { deriveArtSignals, inkColor, colorFor } from './art-signals.mjs';
import { clamp, hash01 } from '../../src/core/layout.mjs';
export const title='Chromatic Bloom';
export const subtitle='ORGANIC / REGROWTH';

function petal(ctx,x,y,angle,r,color,alpha){
  const dx=Math.cos(angle),dy=Math.sin(angle);
  const ox=-dy,oy=dx;
  ctx.beginPath();ctx.moveTo(x,y);
  ctx.bezierCurveTo(x+dx*r*.32+ox*r*.6,y+dy*r*.32+oy*r*.6,
    x+dx*r*.9+ox*r*.38,y+dy*r*.9+oy*r*.38,x+dx*r*1.25,y+dy*r*1.25);
  ctx.bezierCurveTo(x+dx*r*.88-ox*r*.38,y+dy*r*.88-oy*r*.38,
    x+dx*r*.26-ox*r*.52,y+dy*r*.26-oy*r*.52,x,y);
  ctx.closePath();ctx.fillStyle=inkColor(color,alpha);ctx.fill();
}
export function draw(ctx,{width:w,height:h,events,time}){
  const ground=ctx.createLinearGradient(0,0,0,h);
  ground.addColorStop(0,'#161025');ground.addColorStop(.48,'#171c2c');
  ground.addColorStop(1,'#142322');ctx.fillStyle=ground;ctx.fillRect(0,0,w,h);
  const {marks,regions}=deriveArtSignals(events,time);
  const bottom=h*.96,range=h*.77,s=Math.min(w,h);
  ctx.save();ctx.lineCap='round';ctx.globalCompositeOperation='screen';
  // Directory regions are persistent stems; edits grow on them, not on random flowers.
  const visible=regions.filter(r=>r.edits>0).slice(0,34);
  for(const region of visible){
    const x=w*(.1+region.x*.8);
    const extent=clamp((region.lastAt-(marks[0]?.at||time))/Math.max(1,time-(marks[0]?.at||time)),0,1);
    const end=bottom-range*extent;
    const bow=(hash01(region.key+'bow')-.5)*w*.13;
    const p=colorFor(region.key,1);
    ctx.beginPath();ctx.moveTo(x,bottom);
    ctx.bezierCurveTo(x+bow*.6,h*.71,x-bow,h*.43,x+bow,end);
    ctx.strokeStyle=inkColor(p,.28+Math.min(.42,region.edits*.018));
    ctx.lineWidth=clamp(1+Math.sqrt(region.edits)*1.25,1,9);ctx.stroke();
    ctx.lineWidth=.8;ctx.strokeStyle=inkColor(colorFor(region.key,3),.7);ctx.stroke();
  }
  for(let i=0;i<marks.length;i++){
    const m=marks[i];
    if(m.kind==='file.discovered'||m.kind==='model.started')continue;
    const root=w*(.1+hash01(m.region)*.8);
    const bend=(hash01(m.region+'bow')-.5)*w*.13;
    const y=bottom-range*m.progress;
    const x=root+bend*Math.sin(m.progress*Math.PI*1.3)+
      (m.anchor-.5)*s*.07;
    const p=colorFor(m.agent,m.revision%4);
    if(m.file){
      const r=clamp(3+m.weight*4+Math.sqrt(m.revision)*2+s*m.burst*.0015,4,s*.075);
      const petals=3+Math.min(4,Math.floor(m.burst/3));
      for(let j=0;j<petals;j++){
        const angle=(j/petals)*Math.PI*2+hash01(m.region)*3;
        petal(ctx,x,y,angle,r,p,.11+Math.min(.22,m.revision*.022));
      }
      ctx.beginPath();ctx.arc(x,y,clamp(1+m.revision*.25,1,5),0,Math.PI*2);
      ctx.fillStyle=inkColor(colorFor(m.region,4),.73);ctx.fill();
    }else if(m.handoff){
      const peer=w*(.1+hash01('agent/'+m.peer)*.8);
      ctx.beginPath();ctx.moveTo(x,y);
      ctx.quadraticCurveTo((x+peer)/2,y-s*.07,peer,y-s*.035);
      ctx.strokeStyle=inkColor(colorFor(m.peer,1),.39);ctx.lineWidth=2.2;ctx.stroke();
    }else if(m.kind==='test.completed'){
      ctx.beginPath();ctx.arc(x,y,3+m.burst*.3,0,Math.PI*2);
      ctx.strokeStyle=inkColor(p,.46);ctx.lineWidth=1.1;ctx.stroke();
    }
  }
  ctx.restore();
  ctx.font='10px ui-monospace,monospace';ctx.fillStyle='#e1cce9';
  ctx.fillText('CHROMATIC BLOOM  /  '+visible.length+' GROWTH REGIONS',24,43);
}
