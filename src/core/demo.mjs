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
