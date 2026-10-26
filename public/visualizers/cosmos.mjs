import { background,drawTopology,drawCount } from './shared.mjs';
export const title='File cosmos';
export const subtitle='PROJECT / CONSTELLATION';
export function draw(ctx,env){
  const {width:w,height:h,scene,time}=env;
  background(ctx,w,h,time,true);
  const centerX=w*.5,centerY=h*.52;
  const glow=ctx.createRadialGradient(centerX,centerY,0,centerX,centerY,h*.45);
  glow.addColorStop(0,'rgba(57,120,142,.15)');glow.addColorStop(1,'rgba(57,120,142,0)');
  ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
  drawTopology(ctx,scene,time,{x:35,y:-20,width:w-70,height:h+25},{labels:true,orbit:true});
  drawCount(ctx,'TOPOLOGY / '+scene.files.size+' FILES',35,h*.14);
  drawCount(ctx,'EACH POINT IS A FILE OR DIRECTORY',35,h*.18);
}
