import { background,waveEnergy,COLORS,drawCount } from './shared.mjs';
export const title='Activity score';
export const subtitle='RHYTHM / DENSITY';
export function draw(ctx,env){
  const {width:w,height:h,events,time}=env;
  background(ctx,w,h,time,true);
  const bins=waveEnergy(events,time,100000,190);
  const mx=Math.max(1,...bins),layers=14;
  for(let j=0;j<layers;j++){
    const baseline=h*.17+j*h*.048;
    const color=COLORS[(j+1)%COLORS.length];
    ctx.beginPath();
    for(let i=0;i<bins.length;i++){
      const x=30+(w-60)*i/(bins.length-1);
      const energy=bins[i]/mx;
      const wave=Math.sin(i*.13+j*.57+time*.00045)*(.4+energy*25);
      const low=Math.sin(i*.043+j*.82+time*.0002)*4;
      const y=baseline+wave+low;
      if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    ctx.globalAlpha=.15+.047*(j%5);
    ctx.strokeStyle=color;ctx.lineWidth=j%4===0?1.9:1.05;ctx.stroke();
  }
  ctx.globalAlpha=1;
  const start=time-100000;
  for(const e of events){
    const p=(e.at-start)/100000;if(p<0||p>1)continue;
    const x=30+p*(w-60);
    const color=e.kind==='file.changed'?'#70d8bd':e.kind.startsWith('tool.')?'#af9aee':'#e8ae83';
    ctx.fillStyle=color;ctx.globalAlpha=e.kind==='model.started'?.12:.35;
    ctx.fillRect(x,h*.84,1,e.kind==='file.changed'?24:12);
  }
  ctx.globalAlpha=1;
  drawCount(ctx,'AN ACTIVITY SCORE / LAST 100 SECONDS',30,55);
  drawCount(ctx,'DENSITY • TIMING • EVENT TYPES',30,h-40);
}
