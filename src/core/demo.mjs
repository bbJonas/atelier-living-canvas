/** Synthetic, deterministic test data. Never represented as a real agent run. */
const FILES = [
  'src/index.ts','src/app.ts','src/core/runtime.ts','src/core/queue.ts',
  'src/core/scheduler.ts','src/core/state.ts','src/api/server.ts',
  'src/api/routes.ts','src/api/events.ts','src/components/Header.tsx',
  'src/components/Editor.tsx','src/components/Timeline.tsx',
  'src/components/AgentList.tsx','src/components/Inspector.tsx',
  'src/styles/theme.css','src/styles/layout.css',
  'test/runtime.test.ts','test/scheduler.test.ts','test/api.test.ts',
  'test/components.test.ts','docs/architecture.md','docs/operations.md',
  'package.json','README.md','src/adapters/opencode.ts','src/adapters/hermes.ts',
  'src/core/telemetry.ts','test/telemetry.test.ts'
];
export function generateDemo(seed = 42) {
  let state = seed >>> 0;
  const random = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
  const base = 1761436800000; // stable timestamp, no live-data illusion
  const events = [];
  let t = base;
  const runId = 'demo-atlas';
  const add = (kind, agentId = 'main', fields = {}) => {
    events.push({ kind, agentId, runId, at: Math.round(t), ...fields });
  };
  add('run.started');
  add('agent.started');
  const agents = ['main','architect','builder','verifier'];
  for (let i = 0; i < 260; i++) {
    t += 500 + random() * 1400 + (i % 29 === 0 ? 2200 : 0);
    if (i === 10) add('agent.started','architect',{parentAgentId:'main'});
    if (i === 24) add('agent.started','builder',{parentAgentId:'main'});
    if (i === 52) add('agent.started','verifier',{parentAgentId:'main'});
    const available = i < 10 ? 1 : i < 24 ? 2 : i < 52 ? 3 : 4;
    const agent = agents[Math.floor(random() * available)];
    const choice = random();
    if (choice < 0.18) {
      add('model.started',agent);
      t += 250 + random() * 700;
      add('model.completed',agent,{durationMs:Math.round(250 + random() * 1400)});
    } else if (choice < 0.43) {
      const toolName = ['read','search','grep','edit','test'][Math.floor(random()*5)];
      add('tool.started',agent,{toolName});
      t += 40 + random()*300;
      add('tool.completed',agent,{toolName,durationMs:Math.round(90+random()*900),status:random()<.06?'error':'ok'});
    } else if (choice < 0.80) {
      const filePath = FILES[Math.floor(random() * Math.min(FILES.length,3+Math.floor(i/7)))];
      add('file.changed',agent,{filePath,operation:i<40?'create':'modify',
        linesAdded:Math.floor(3+random()*110),linesRemoved:Math.floor(random()*28)});
    } else if (choice < 0.9 && available > 1) {
      const peer = agents[Math.floor(random()*available)];
      if (peer !== agent) add('agent.message',agent,{peerAgentId:peer});
    } else {
      add('test.completed',agent,{testPassed:Math.floor(random()*18),
        testFailed:random()<.13?1:0,status:'ok'});
    }
  }
  t += 500;
  for (const agent of agents.slice(1)) add('agent.completed',agent);
  add('agent.completed');
  add('run.completed');
  return events;
}


/** Different synthetic workloads: identical seed and scenario always yield identical records. */
export const DEMO_DATASETS = Object.freeze([
  {id:'atlas', label:'Atlas', description:'Baseline · exploratory development'},
  {id:'release-rush', label:'Release Rush', description:'High parallelism · tests and handoffs'},
  {id:'deep-refactor', label:'Deep Refactor', description:'Patient revisions · deliberate architecture'}
]);

const RELEASE_PATHS = [
  'src/client/App.tsx','src/client/Workbench.tsx','src/client/Canvas.tsx',
  'src/client/theme.css','src/client/router.ts','src/api/routes.ts',
  'src/api/auth.ts','src/api/events.ts','src/api/stream.ts',
  'src/core/task-queue.ts','src/core/scheduler.ts','src/core/worker.ts',
  'src/core/state.ts','src/core/cache.ts','src/core/recovery.ts',
  'src/integrations/github.ts','src/integrations/telemetry.ts',
  'test/client.test.ts','test/api.test.ts','test/e2e.test.ts',
  'test/worker.test.ts','docs/release.md','docs/architecture.md'
];
const REFACTOR_PATHS = [
  'src/core/graph.ts','src/core/graph-index.ts','src/core/graph-state.ts',
  'src/core/runtime.ts','src/core/scheduler.ts','src/core/queue.ts',
  'src/core/transforms.ts','src/core/cache.ts','src/api/graph.ts',
  'test/graph.test.ts','test/runtime.test.ts','test/scheduler.test.ts',
  'docs/architecture.md','docs/migration.md'
];

/** Metadata-only, causally structured simulation; never actual production telemetry. */
function generateScenario(id, seed) {
  if (id !== 'release-rush' && id !== 'deep-refactor') throw new RangeError('Unknown demo dataset: ' + id);
  const rush=id==='release-rush';
  let state=((seed >>> 0) ^ (rush ? 0x52b8d7a1 : 0xa8d95321)) >>> 0;
  const rand=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
  const paths=rush?RELEASE_PATHS:REFACTOR_PATHS;
  const agents=rush?['lead','frontend','backend','integrations','qa','release']:
    ['architect','refactor','verifier'];
  const base=1761436800000;
  let t=base,seq=0;
  const seen=new Set(),events=[];
  const runId='demo-'+id;
  function add(kind,agentId='lead',fields={}) {
    events.push({kind,agentId,runId,at:Math.round(t),seq:++seq,...fields});
  }
  const chief=agents[0];
  add('run.started',chief);
  add('agent.started',chief);
  // Phase-specific densities and team sizes have deliberate quiet intervals.
  const phases=rush?[
    {count:105,step:640,active:2,pause:3000,files:.27,handoff:.13,tests:.09,fail:.08},
    {count:250,step:190,active:5,pause:12000,files:.54,handoff:.19,tests:.10,fail:.19},
    {count:310,step:110,active:6,pause:2500,files:.60,handoff:.17,tests:.14,fail:.25},
    {count:245,step:270,active:5,pause:16000,files:.46,handoff:.18,tests:.19,fail:.13},
    {count:105,step:850,active:3,pause:9000,files:.23,handoff:.11,tests:.29,fail:.01}
  ]:[
    {count:80,step:1400,active:2,pause:25000,files:.32,handoff:.06,tests:.08,fail:.07},
    {count:145,step:900,active:2,pause:42000,files:.64,handoff:.05,tests:.08,fail:.10},
    {count:150,step:1200,active:3,pause:55000,files:.70,handoff:.09,tests:.13,fail:.15},
    {count:125,step:1700,active:3,pause:38000,files:.61,handoff:.06,tests:.20,fail:.08},
    {count:65,step:1900,active:2,pause:22000,files:.26,handoff:.04,tests:.37,fail:.01}
  ];
  const started=new Set([chief]);
  let iteration=0;
  for(let phaseIndex=0;phaseIndex<phases.length;phaseIndex++){
    const phase=phases[phaseIndex];
    t+=phase.pause;
    for(let j=0;j<phase.active;j++){
      const agent=agents[j];
      if(!started.has(agent)){
        add('agent.started',agent,{parentAgentId:chief});started.add(agent);
      }
    }
    for(let j=0;j<phase.count;j++,iteration++){
      // Time is monotonically increasing, though work by different agents interleaves.
      t+=phase.step*(.4+rand()*1.4)+(j%71===0?phase.step*13:0);
      const members=agents.slice(0,phase.active);
      const agent=members[Math.floor(rand()*members.length)];
      const choice=rand();
      if(choice<phase.files){
        // A small stable hot set creates revisits and visible revision heat.
        const index=rand()<.72?Math.floor(rand()*Math.min(6,paths.length)):
          Math.floor(rand()*paths.length);
        const filePath=paths[index];
        const first=!seen.has(filePath);
        seen.add(filePath);
        const linesAdded=Math.floor(3+rand()*(rush?130:52));
        const linesRemoved=first?0:Math.floor(rand()*(rush?72:46));
        add('file.changed',agent,{filePath,operation:first?'create':'modify',linesAdded,linesRemoved});
      }else if(choice<phase.files+phase.handoff && phase.active>1){
        const peer=members[(members.indexOf(agent)+1+Math.floor(rand()*(members.length-1)))%members.length];
        add('agent.message',agent,{peerAgentId:peer});
      }else if(choice<phase.files+phase.handoff+phase.tests){
        const failed=rand()<phase.fail?1+Math.floor(rand()*3):0;
        add('test.completed',agent,{testPassed:3+Math.floor(rand()*32),testFailed:failed,
          status:failed?'error':'ok'});
      }else if(rand()<.53){
        const toolName=['read','search','edit','test','lint','build'][Math.floor(rand()*6)];
        add('tool.started',agent,{toolName});
        t+=35+rand()*260;
        add('tool.completed',agent,{toolName,durationMs:Math.round(35+rand()*900),
          status:rand()<phase.fail*.25?'error':'ok'});
      }else{
        add('model.started',agent);
        t+=80+rand()*380;
        add('model.completed',agent,{durationMs:Math.round(300+rand()*1700)});
      }
    }
  }
  t+=2200;
  for(const agent of [...started].reverse())add('agent.completed',agent);
  add('run.completed',chief);
  return events;
}

export function generateDemoDataset(id='atlas',seed=42){
  if(id==='atlas')return generateDemo(seed);
  return generateScenario(id,seed);
}
