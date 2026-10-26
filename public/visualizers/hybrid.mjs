import { background,drawWavefield,drawTopology,drawCount } from './shared.mjs';
export const title='Living artwork';
export const subtitle='ACTIVITY × STRUCTURE';
export function draw(ctx,env){
  const {width:w,height:h,scene,time}=env;
  background(ctx,w,h,time);
  const lineY=h*.465;
  ctx.strokeStyle='rgba(131,180,191,.17)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(24,lineY);ctx.lineTo(w-24,lineY);ctx.stroke();
  drawWavefield(ctx,env,{x:35,y:h*.09,width:w-70,height:h*.32},
    {lanes:8,amplitude:26,windowMs:50000});
  drawCount(ctx,'ACTIVITY / TIME',36,h*.10);
  drawTopology(ctx,scene,time,{x:20,y:h*.36,width:w-40,height:h*.72},{orbit:false,labels:w>730});
  drawCount(ctx,'FILES / RELATIONSHIPS',36,h*.57);
  if(scene.files.size===0)drawCount(ctx,'No file events in current window',w*.38,h*.75);
}
