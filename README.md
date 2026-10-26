# Atelier Living Canvas

A local-first observability artwork for autonomous AI work. Watch the rhythm of tools, model request phases, subagents and file edits become an evolving picture — without pretending to see an LLM's thoughts.

**Prototype v0.1:** self-contained Node 20+ server, no external runtime packages, four modular Canvas 2D modes, deterministic demo replay, live SSE ingestion, optional Git inventory, event/PNG export, tests and CI.

## Run it

    npm start

Open **http://127.0.0.1:4173**. The default **Demo** is a synthetic agent run; play/pause, seek and speed controls are functional. Click **Live** to watch real events forwarded to the local server. To run checks:

    npm run check

## Connect a harness

Instrument observed execution events (not model text), then POST canonical metadata:

    curl -sS -X POST http://127.0.0.1:4173/api/events \
      -H 'Content-Type: application/json' \
      -d '{"kind":"file.changed","runId":"run-123","agentId":"builder","filePath":"src/app.ts","operation":"modify","linesAdded":17}'

Alternatively pipe one telemetry-v1 JSON record per line into:

    node scripts/send-events.mjs < events.ndjson

Optionally, from within a Git project, take a one-time tracked-file inventory:

    node scripts/send-events.mjs --git-files

This inventories files, but does **not** call them edits. A generic programmatic bridge exists in `src/core/instrumentation.mjs`: `createInstrumentation({runId, emit})` supplies hooks for agent starts/ends, verified file changes, real tool/model-request spans, tests and handoffs; `createHttpEmitter()` provides small on-demand HTTP batches. Existing DSH/OpenCode/Pi/Hermes/Atelier-specific adapters are not bundled or claimed; each should translate its trustworthy runtime events into [the stable schema](docs/SCHEMA.md).

## Four visual languages

1. **Living artwork** — time-varying activity wavefield above the growing project topology.
2. **File cosmos** — deterministic folders and file nodes, edits glowing in the constellation.
3. **Agent currents** — distinct strands, pulse density and observed inter-agent handoffs.
4. **Activity score** — a temporal composition of amplitude, frequency and event types.

Every mode consumes the same read-only scene. Renderers can be added without changing telemetry capture.

## Design principles

- Two independent layers: capture / normalization / transport, then event-derived scene / renderer.
- Capture existing harness events; do not do extra LLM calls or poll source trees in the background.
- No raw prompts, reasoning traces, tool arguments/results or source code is persisted. Unknown fields are discarded. Relative path names are the only source structure captured.
- Bound the event journal and rate, cap display pixels and FPS, stop drawing in hidden tabs.
- Keep demo and live data conspicuously separated; never mislabel synthetic activity as real.
- Keep prototype standalone before integrating with the main Atelier repository.

See [architecture](docs/ARCHITECTURE.md) and [schema](docs/SCHEMA.md) for internals and known limitations.

## Security

Default bind is **loopback only**. If you intentionally expose it on a network, set \`LIVING_CANVAS_TOKEN\`, use authenticated TLS at the reverse proxy, and restrict clients; this prototype is **not** an internet-facing telemetry service. Set \`CANVAS_REDACT_PATHS=1\` to suppress path names (at the cost of graph structure). Do not feed confidential traces to a public repository.

## Project status

This is a separate demonstrator, not deployed inside Atelier and not production-hardened. An accurate mapping for each real harness, unbounded full-history replay, browser testing and performance measurements on target hardware are still necessary before integration.
