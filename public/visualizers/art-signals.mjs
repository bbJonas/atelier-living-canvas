import { clamp, hash01 } from '../../src/core/layout.mjs';
import { MAX_GESTURES, observedEvents } from './art-data.mjs';

/**
 * Pure, bounded interpretation of OBSERVED metadata, never inferred work.
 * Sampled historical events produce a consistent but intentionally lossy artwork.
 */
export const MAX_ART_REGIONS = 84;
export const SPECTRUM = [
  [255,91,149],[255,172,77],[254,224,114],[93,222,172],
  [75,211,244],[114,148,255],[188,118,255],[255,111,197],
  [246,134,97],[128,236,217]
];
export const colorFor = (key,offset=0) =>
  SPECTRUM[(Math.floor(hash01(String(key || 'main'))*SPECTRUM.length)+offset+SPECTRUM.length)%SPECTRUM.length];
export const inkColor = (color,a=1) => 'rgba('+color.join(',')+','+clamp(a,0,1)+')';

export function deriveArtSignals(events,time,{limit=MAX_GESTURES}={}){
  const observed=observedEvents(events,time,limit);
  const start=observed[0]?.at ?? time;
  const span=Math.max(1,time-start);
  const regions=new Map(),revisions=new Map(),agentCounts=new Map();
  const marks=[];
  let prev=start,burst=0,phase=0;
  for(const e of observed){
    const gap=Math.max(0,e.at-prev);
    const quiet=marks.length>0 && gap>7500;
    if(quiet){burst=0;phase++;}
    else burst=Math.min(12,burst+1);
    const file=e.kind==='file.changed',handoff=e.kind==='agent.message';
    const path=file?e.filePath:null;
    const regionKey=(e.filePath?.split('/').slice(0,2).join('/') || 'agent/'+e.agentId);
    const existing=regions.get(regionKey);
    if(!existing && regions.size<MAX_ART_REGIONS)
      regions.set(regionKey,{key:regionKey,x:hash01(regionKey),edits:0,count:0,
        firstAt:e.at,lastAt:e.at});
    const region=regions.get(regionKey);
    if(region){
      region.count++;
      if(file)region.edits++;
      region.lastAt=e.at;
    }
    const revision=path?(revisions.get(path)||0)+1:0;
    if(path)revisions.set(path,revision);
    agentCounts.set(e.agentId,(agentCounts.get(e.agentId)||0)+1);
    const strength=file?clamp(.4+Math.log1p((e.linesAdded||0)+(e.linesRemoved||0))*.2, .4,2):
      handoff?1.15:e.kind==='test.completed'?1:.52;
    marks.push({
      event:e,at:e.at,kind:e.kind,agent:e.agentId,
      x:hash01(path||regionKey),anchor:hash01(path||e.agentId),
      region:regionKey,phase,quiet,gap,burst,revision,
      weight:strength,progress:clamp((e.at-start)/span,0,1),
      color:colorFor(e.agentId),file,handoff,
      peer:e.peerAgentId||null
    });
    prev=e.at;
  }
  return {
    marks,regions:[...regions.values()],agentCounts,
    start,time,duration:span,phaseCount:phase+1,
    // Explicit limitation: only observed / sampled records have been transformed.
    sampled:marks.length,lossy:events.length>marks.length
  };
}
