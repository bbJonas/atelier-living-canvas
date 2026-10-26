const EMPTY = () => ({ files: new Map(), agents: new Map(), interactions: [], signals: [],
  total: 0, toolCalls: 0, changedFiles: 0, testsPassed: 0, testsFailed: 0,
  activeTools: new Set(), activeModels: new Set(), lastAt: 0, runId: '' });

export function deriveScene(events) {
  const scene = EMPTY();
  const changed = new Set();
  for (const e of events) {
    scene.total++;
    scene.lastAt = Math.max(scene.lastAt, e.at);
    scene.runId = e.runId;
    if (e.kind === 'file.discovered' && e.agentId === 'inventory') {
      // Inventory is a passive file listing, not an executing agent.
      if (e.filePath) {
        const parts=e.filePath.split('/');
        if (!scene.files.has(e.filePath)) scene.files.set(e.filePath,{ path:e.filePath,
          parent:parts.slice(0,-1).join('/'), firstAt:e.at,lastAt:e.at,
          changes:0,added:0,removed:0,operation:'observe',agents:[] });
      }
      continue;
    }
    const agent = scene.agents.get(e.agentId) || { id: e.agentId, parent: e.parentAgentId || null,
      firstAt: e.at, lastAt: e.at, count: 0, active: true, tools: 0 };
    agent.lastAt = e.at;
    agent.count++;
    if (e.parentAgentId) agent.parent = e.parentAgentId;
    if (e.kind === 'agent.completed') agent.active = false;
    if (e.kind === 'agent.started') agent.active = true;
    if (e.kind === 'tool.started') {
      agent.tools++;
      scene.toolCalls++;
      scene.activeTools.add(e.agentId + ':' + (e.toolName || 'tool'));
    }
    if (e.kind === 'tool.completed') scene.activeTools.delete(e.agentId + ':' + (e.toolName || 'tool'));
    if (e.kind === 'model.started') scene.activeModels.add(e.agentId);
    if (e.kind === 'model.completed') scene.activeModels.delete(e.agentId);
    scene.agents.set(e.agentId, agent);
    if ((e.kind === 'file.changed' || e.kind === 'file.discovered') && e.filePath) {
      if (e.kind === 'file.changed') changed.add(e.filePath);
      const parts = e.filePath.split('/');
      const parent = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
      const file = scene.files.get(e.filePath) || { path: e.filePath, parent, firstAt: e.at,
        lastAt: e.at, changes: 0, added: 0, removed: 0, operation: 'create', agents: [] };
      if (e.kind === 'file.changed') file.changes++;
      file.lastAt = e.at;
      file.added += e.linesAdded || 0;
      file.removed += e.linesRemoved || 0;
      file.operation = e.operation || (e.kind === 'file.discovered' ? 'observe' : 'modify');
      if (!file.agents.includes(e.agentId)) file.agents.push(e.agentId);
      scene.files.set(e.filePath, file);
    }
    if (e.kind === 'agent.message' && e.peerAgentId) {
      scene.interactions.push({ from: e.agentId, to: e.peerAgentId, at: e.at });
    }
    if (e.kind === 'test.completed') {
      scene.testsPassed += e.testPassed || 0;
      scene.testsFailed += e.testFailed || 0;
    }
    // A small bounded signal list; no original message text.
    if (e.kind !== 'model.started' && e.kind !== 'model.completed') {
      scene.signals.push({ at: e.at, kind: e.kind, agentId: e.agentId, status: e.status || 'unknown' });
      if (scene.signals.length > 350) scene.signals.shift();
    }
  }
  scene.changedFiles = changed.size;
  return scene;
}

export function eventLabel(e) {
  const names = {
    'run.started': 'Run started', 'run.completed': 'Run completed',
    'agent.started': 'Agent joined', 'agent.completed': 'Agent finished',
    'agent.message': 'Agent handoff', 'model.started': 'Model active',
    'model.completed': 'Model phase ended',
    'tool.started': 'Tool invoked', 'tool.completed': 'Tool returned',
    'file.changed': 'File changed', 'file.discovered': 'File indexed', 'test.completed': 'Tests completed'
  };
  return names[e.kind] || e.kind;
}
