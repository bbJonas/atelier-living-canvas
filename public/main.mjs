import { deriveScene,eventLabel } from '/src/core/scene.mjs';
import { generateDemo } from '/src/core/demo.mjs';
import { MaterializedScene } from '/src/core/materializer.mjs';
import * as hybrid from './visualizers/hybrid.mjs';
import * as cosmos from './visualizers/cosmos.mjs';
import * as streams from './visualizers/streams.mjs';
import * as rhythm from './visualizers/rhythm.mjs';

const views={hybrid,cosmos,streams,rhythm};
const $=id=>document.getElementById(id);
const canvas=$('art'),ctx=canvas.getContext('2d',{alpha:false,desynchronized:true});
if(!ctx)throw new Error('Canvas 2D not supported');
const demo=generateDemo(),start=demo[0].at,end=demo.at(-1).at,duration=end-start;
const speeds=[.5,1,2,4];
let speedIndex=1,view='hybrid',source='demo',playing=true;
let playhead=start+duration*.46,liveEvents=[],liveConnected=false;
const liveMaterializer=new MaterializedScene();
let width=0,height=0,dirty=true,lastFrame=0,lastClock=0,lastUI=0;
let frozenEvents=[],frozenScene=deriveScene([]);
let snapshotKey='',transportChanged=true;
const limit=3000;
function setButtonState(){
  for(const b of document.querySelectorAll('[data-view]')){
    const active=b.dataset.view===view;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));
  }
  const isDemo=source==='demo';
  $('source-demo').classList.toggle('selected',isDemo);
  $('source-live').classList.toggle('selected',!isDemo);
  $('source-demo').setAttribute('aria-pressed',String(isDemo));
  $('source-live').setAttribute('aria-pressed',String(!isDemo));
  for(const id of ['play','restart','scrubber','speed'])$(id).disabled=!isDemo;
  $('play').textContent=playing?'Ⅱ':'▶';
  $('play').setAttribute('aria-label',playing?'Pause replay':'Resume replay');
  $('speed').textContent=speeds[speedIndex]+'×';
  $('mode-label').textContent=views[view].title;
  $('canvas-title').textContent=views[view].subtitle;
  $('playback-label').textContent=isDemo?'DETERMINISTIC REPLAY':'INCOMING TELEMETRY';
  $('empty-live').classList.toggle('hidden',isDemo||liveEvents.length>0);
  updateConnection();
}
function updateConnection(){
  const c=$('connection');
  c.classList.toggle('offline',source==='live'&&!liveConnected);
  c.lastChild.textContent=source==='demo'?' Demo trace':liveConnected?' Connected to local stream':' Disconnected';
  $('canvas-state').textContent=source==='demo'?'Synthetic replay · not a live agent':
    liveConnected?'Live telemetry · sanitized event metadata':'Live stream not connected';
}
function resizeCanvas(){
  const rect=canvas.getBoundingClientRect();
  width=Math.max(1,rect.width);height=Math.max(1,rect.height);
  const pixelBudget=Math.sqrt(1600000/(width*height));
  const dpr=Math.max(1,Math.min(window.devicePixelRatio||1,1.75,pixelBudget));
  const cw=Math.round(width*dpr),ch=Math.round(height*dpr);
  if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch}
  ctx.setTransform(canvas.width/width,0,0,canvas.height/height,0,0);
  dirty=true;
}
new ResizeObserver(resizeCanvas).observe(canvas.parentElement);
function currentEvents(){
  if(source==='live')return liveEvents;
  return demo.filter(e=>e.at<=playhead);
}
function clockLabel(ms){
  const s=Math.max(0,Math.floor(ms/1000));
  return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
}
function make(tag,className,text){
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(text!=null)node.textContent=String(text);
  return node;
}
function detailFor(e){
  if(e.filePath)return e.filePath;
  if(e.toolName)return e.toolName+(e.status==='error'?' · error':'');
  if(e.kind==='test.completed')return (e.testPassed||0)+' passed / '+(e.testFailed||0)+' failed';
  if(e.peerAgentId)return e.agentId+' → '+e.peerAgentId;
  return e.agentId;
}
function updateLists(events,scene){
  const activity=$('activity-list');
  const rows=events.filter(e=>e.kind!=='model.started'&&e.kind!=='model.completed'&&e.kind!=='file.discovered').slice(-5).reverse();
  const activityChildren=rows.map(e=>{
    const row=make('div','activity-row');
    const family=e.kind.split('.')[0];
    row.append(make('span','event-icon '+(family==='tool'?'tool':family==='agent'?'agent':family==='test'?'test':''),family==='file'?'◈':family==='agent'?'◇':family==='test'?'▤':'⌁'));
    const content=make('div','activity-content');
    content.append(make('b','',eventLabel(e)),make('small','',detailFor(e)));
    row.append(content,make('span','activity-when',
      source==='demo'?clockLabel(e.at-start):new Date(e.at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'})));
    return row;
  });
  activity.replaceChildren(...(activityChildren.length?activityChildren:[make('div','blank-list','The activity log will fill as events arrive.')]));
  const files=$('file-list');
  const changed=Array.from(scene.files.values()).sort((a,b)=>b.lastAt-a.lastAt).slice(0,5);
  const fileChildren=changed.map(f=>{
    const row=make('div','file-row');
    row.append(make('span','file-indicator '+(f.changes?'':'indexed')));
    const content=make('div','file-content');
    content.append(make('b','',f.path.split('/').at(-1)),
      make('small','',f.path.includes('/')?f.path.slice(0,f.path.lastIndexOf('/')):'Project root'));
    row.append(content,make('span','file-count',f.changes?f.changes+' edits':'indexed'));
    row.title=f.path;
    return row;
  });
  files.replaceChildren(...(fileChildren.length?fileChildren:[make('div','blank-list','No tracked files have been observed yet.')]));
}
function updateInterface(events,scene){
  $('metric-events').textContent=scene.total.toLocaleString();
  $('metric-agents').textContent=Array.from(scene.agents.values()).filter(a=>a.active).length;
  $('agents-detail').textContent=scene.agents.size+' distinct agent IDs';
  $('metric-files').textContent=scene.changedFiles;
  $('metric-tools').textContent=scene.toolCalls;
  $('event-count').textContent=scene.total+' events';
  const demoMode=source==='demo';
  $('elapsed').textContent=demoMode?clockLabel(playhead-start):'LIVE';
  $('duration').textContent=demoMode?clockLabel(duration):'—';
  $('scrubber').value=demoMode?String(Math.round((playhead-start)/duration*1000)):'1000';
  $('empty-live').classList.toggle('hidden',demoMode||liveEvents.length>0);
  updateLists(events,scene);
}
function paint(clock){
  requestAnimationFrame(paint);
  const dt=lastClock?Math.min(100,clock-lastClock):0;
  lastClock=clock;
  if(document.visibilityState==='hidden')return;
  if(source==='demo'&&playing){
    playhead=Math.min(end,playhead+dt*speeds[speedIndex]);
    if(playhead>=end){playing=false;setButtonState()}
    dirty=true;
  }
  const frameInterval=window.matchMedia('(prefers-reduced-motion: reduce)').matches?900:1000/30;
  if(!dirty&&clock-lastFrame<frameInterval)return;
  if(clock-lastFrame<frameInterval)return;
  lastFrame=clock;dirty=false;
  const events=currentEvents(),activeTime=source==='demo'?playhead:(events.at(-1)?.at||Date.now());
  const key=source+':'+events.length+':'+Math.floor(activeTime/400);
  if(key!==snapshotKey){
    frozenEvents=events;
    frozenScene=source==='live'?liveMaterializer.scene(events):deriveScene(events);
    snapshotKey=key;
  }
  ctx.clearRect(0,0,width,height);
  views[view].draw(ctx,{width,height,time:activeTime,scene:frozenScene,events:frozenEvents});
  if(clock-lastUI>250||transportChanged){
    updateInterface(frozenEvents,frozenScene);lastUI=clock;transportChanged=false;
  }
}
function selectSource(next){
  if(next===source)return;
  source=next;dirty=true;transportChanged=true;snapshotKey='';
  setButtonState();
}
for(const button of document.querySelectorAll('[data-view]'))button.addEventListener('click',()=>{
  if(!(button.dataset.view in views))return;
  view=button.dataset.view;dirty=true;setButtonState();
});
$('source-demo').addEventListener('click',()=>selectSource('demo'));
$('source-live').addEventListener('click',()=>selectSource('live'));
$('play').addEventListener('click',()=>{playing=!playing;setButtonState();dirty=true});
$('restart').addEventListener('click',()=>{playhead=start;playing=true;transportChanged=true;dirty=true;setButtonState()});
$('scrubber').addEventListener('input',e=>{
  playhead=start+duration*Number(e.target.value)/1000;
  transportChanged=true;dirty=true;snapshotKey='';
});
$('speed').addEventListener('click',()=>{speedIndex=(speedIndex+1)%speeds.length;setButtonState()});
function download(name,blob){
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
$('export-image').addEventListener('click',()=>canvas.toBlob(blob=>{
  if(blob)download('atelier-'+view+'-'+(source==='demo'?'demo':'live')+'.png',blob);
},'image/png'));
$('export-trace').addEventListener('click',()=>{
  const payload={schema:1,source,exportedAt:new Date().toISOString(),
    events:currentEvents()};
  download('atelier-'+source+'-events.json',new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
});
const stream=new EventSource('/api/stream');
stream.addEventListener('open',()=>{liveConnected=true;updateConnection()});
stream.addEventListener('error',()=>{liveConnected=false;updateConnection()});
stream.addEventListener('snapshot',e=>{
  try{
    const data=JSON.parse(e.data);
    liveEvents=Array.isArray(data.events)?data.events.slice(-limit):[];
    if(data.state)liveMaterializer.load(data.state);
    else {liveMaterializer.load(new MaterializedScene().snapshot());for(const item of liveEvents)liveMaterializer.apply(item)}
    dirty=true;transportChanged=true;snapshotKey='';
    setButtonState();
  }catch{liveConnected=false;updateConnection()}
});
stream.addEventListener('telemetry',e=>{
  try{
    const item=JSON.parse(e.data);
    if(liveEvents.some(v=>v.seq===item.seq))return;
    liveEvents.push(item);
    liveMaterializer.apply(item);
    if(liveEvents.length>limit)liveEvents.splice(0,liveEvents.length-limit);
    dirty=true;transportChanged=true;snapshotKey='';
  }catch{ /* malformed stream item ignored */ }
});
window.addEventListener('beforeunload',()=>stream.close());
setButtonState();
resizeCanvas();
requestAnimationFrame(paint);
