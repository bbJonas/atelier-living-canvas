/**
 * Small incremental projection. The journal can discard old individual events
 * while artwork topology and run counters continue to evolve.
 */
export class MaterializedScene {
  constructor({ maxFiles = 2500, maxAgents = 96 } = {}) {
    this.maxFiles = maxFiles;
    this.maxAgents = maxAgents;
    this.files = new Map();
    this.agents = new Map();
    this.interactions = [];
    this.activeTools = new Set();
    this.activeModels = new Set();
    this.total = 0;
    this.toolCalls = 0;
    this.testsPassed = 0;
    this.testsFailed = 0;
    this.lastAt = 0;
    this.runId = '';
    this.evictedFiles = 0;
  }
  apply(e) {
    this.total++;
    this.lastAt = Math.max(this.lastAt, e.at);
    this.runId = e.runId;
    if (!(e.kind === 'file.discovered' && e.agentId === 'inventory')) {
      let agent = this.agents.get(e.agentId);
      if (!agent) {
        if (this.agents.size >= this.maxAgents) {
          const finished = Array.from(this.agents.values()).find(a => !a.active);
          if (finished) this.agents.delete(finished.id);
        }
        if (this.agents.size < this.maxAgents) {
          agent = { id: e.agentId, parent: e.parentAgentId || null,
            firstAt: e.at, lastAt: e.at, count: 0, tools: 0, active: true };
          this.agents.set(e.agentId, agent);
        }
      }
      if (agent) {
        agent.lastAt = e.at; agent.count++;
        if (e.parentAgentId) agent.parent = e.parentAgentId;
        if (e.kind === 'agent.started') agent.active = true;
        if (e.kind === 'agent.completed') agent.active = false;
        if (e.kind === 'tool.started') agent.tools++;
      }
    }
    if (e.kind === 'tool.started') {
      this.toolCalls++;
      this.activeTools.add(e.agentId + ':' + (e.toolName || 'tool'));
    }
    if (e.kind === 'tool.completed') this.activeTools.delete(e.agentId + ':' + (e.toolName || 'tool'));
    if (e.kind === 'model.started') this.activeModels.add(e.agentId);
    if (e.kind === 'model.completed') this.activeModels.delete(e.agentId);
    if (e.filePath && (e.kind === 'file.discovered' || e.kind === 'file.changed')) {
      let f = this.files.get(e.filePath);
      if (!f) {
        if (this.files.size >= this.maxFiles) {
          this.files.delete(this.files.keys().next().value);
          this.evictedFiles++;
        }
        const parts = e.filePath.split('/');
        f = { path: e.filePath, parent: parts.slice(0,-1).join('/'),
          firstAt: e.at, lastAt: e.at, changes: 0, added: 0, removed: 0,
          operation: 'observe', agents: [] };
        this.files.set(e.filePath,f);
      }
      // LRU by last observation, bounded even for very large projects.
      this.files.delete(e.filePath); this.files.set(e.filePath,f);
      f.lastAt = e.at;
      if (e.kind === 'file.changed') {
        f.changes++; f.operation = e.operation || 'modify';
        f.added += e.linesAdded || 0; f.removed += e.linesRemoved || 0;
        if (!f.agents.includes(e.agentId)) f.agents.push(e.agentId);
      }
    }
    if (e.kind === 'agent.message' && e.peerAgentId) {
      this.interactions.push({ from: e.agentId, to: e.peerAgentId, at: e.at });
      if (this.interactions.length > 120) this.interactions.shift();
    }
    if (e.kind === 'test.completed') {
      this.testsPassed += e.testPassed || 0;
      this.testsFailed += e.testFailed || 0;
    }
  }
  snapshot() {
    return {
      v: 1, total: this.total, toolCalls: this.toolCalls,
      testsPassed: this.testsPassed, testsFailed: this.testsFailed,
      lastAt: this.lastAt, runId: this.runId, evictedFiles: this.evictedFiles,
      files: Array.from(this.files.values()),
      agents: Array.from(this.agents.values()),
      interactions: this.interactions.slice(),
      activeTools: Array.from(this.activeTools),activeModels: Array.from(this.activeModels)
    };
  }
  load(s) {
    if (!s || s.v !== 1 || !Array.isArray(s.files) || !Array.isArray(s.agents)) {
      throw new TypeError('Invalid materialized snapshot');
    }
    this.files = new Map(s.files.slice(-this.maxFiles).map(f => [f.path,{...f}]));
    this.agents = new Map(s.agents.slice(-this.maxAgents).map(a => [a.id,{...a}]));
    this.interactions = (s.interactions || []).slice(-120);
    this.activeTools = new Set(s.activeTools || []);
    this.activeModels = new Set(s.activeModels || []);
    for (const k of ['total','toolCalls','testsPassed','testsFailed','lastAt','evictedFiles']) {
      this[k] = Number.isFinite(s[k]) ? s[k] : 0;
    }
    this.runId = s.runId || '';
  }
  scene(recentEvents = []) {
    return {
      total: this.total,toolCalls: this.toolCalls,
      testsPassed: this.testsPassed,testsFailed: this.testsFailed,
      lastAt: this.lastAt,runId: this.runId,
      files: this.files, agents: this.agents, interactions: this.interactions,
      activeTools: this.activeTools, activeModels: this.activeModels,
      changedFiles: Array.from(this.files.values()).filter(f => f.changes > 0).length,
      signals: recentEvents.slice(-350).map(e => ({ at: e.at, kind: e.kind,
        agentId: e.agentId, status: e.status || 'unknown' })),
      evictedFiles: this.evictedFiles
    };
  }
}
