# Atelier Living Canvas

A local-first observability artwork for autonomous AI work. Watch the rhythm of tools, model request phases, subagents and file edits become an evolving picture — without pretending to see an LLM's thoughts.

**Expressive Art Lab v0.3:** self-contained Node 20+ server, no external runtime packages, ten modular Canvas 2D modes (four baseline + six art studies), deterministic demo replay, live SSE ingestion, optional Git inventory, event/PNG export, tests and CI.

## Run it

    npm start

Open **http://127.0.0.1:4173**. The default **Demo** is a synthetic agent run; play/pause, seek and speed controls are functional. Choose **Atlas**, **Release Rush**, or **Deep Refactor** as clearly labeled synthetic traces; switching datasets resets the replay and metrics. Click **Live** to watch real events forwarded to the local server. To run checks:

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

## Four baseline visual languages

1. **Living artwork** — time-varying activity wavefield above the growing project topology.
2. **File cosmos** — deterministic folders and file nodes, edits glowing in the constellation.
3. **Agent currents** — distinct strands, pulse density and observed inter-agent handoffs.
4. **Activity score** — a temporal composition of amplitude, frequency and event types.

Every mode consumes the same read-only scene. Renderers can be added without changing telemetry capture.

## Art Lab studies and phase comparison

Six data-driven visual approaches complement the four baseline renderers:

- **Kinetic Ink** — translucent gestural strokes from verified file changes, handoffs, tests and tool activity; repeated paths share anchors.
- **Sculptural Strata** — an isometric abstract architecture: individual files occupy stable slots and repeated edits thicken those volumes.
- **Signal Loom** — woven agent strands, event-time weft and observed inter-agent handoff knots.
- **Prismatic Ink** — saturated overpainted gestures with stable file anchors and repeated chromatic revision marks.
- **Chromatic Bloom** — directory growth stems and organic pigment petals shaped by verified edits.
- **Kinetic Ribbons** — tall calligraphic streams tracking agents with observed handoff braids.

Use **Compare studies** in the canvas toolbar to view opening/development/latest stages on the same frozen trace, or select **Compare by: datasets** to inspect one style across the three synthetic runs. In style comparison, choose either the three expressive v0.3 styles or the original three art studies., then select a thumbnail to inspect that mode and (in Demo) seek to its timestamp. Export a 3 × 3 PNG contact sheet. Demo comparisons use the full fixed synthetic run; Live comparisons only use the journal still in memory, not an invented full history.

See [Art Lab v0.3 design notes](docs/ART_LAB_V03.md) and [v0.2 notes](docs/ART_LAB_V02.md) for the telemetry-to-visual mapping, limitations and validation steps.

## Design principles

- Two independent layers: capture / normalization / transport, then event-derived scene / renderer.
- Capture existing harness events; do not do extra LLM calls or poll source trees in the background.
- No raw prompts, reasoning traces, tool arguments/results or source code is persisted. Unknown fields are discarded. Relative path names are the only source structure captured.
- Bound the event journal and rate, cap display pixels and FPS, stop drawing in hidden tabs.
- Keep demo and live data conspicuously separated; never mislabel synthetic activity as real.
- Keep prototype standalone before integrating with the main Atelier repository.

See [architecture](docs/ARCHITECTURE.md), [schema](docs/SCHEMA.md), and the [handoff for the next artistic development stage](docs/HANDOFF_VISUAL_ART_DIRECTION.md) for internals, creative direction and known limitations.

## Security

Default bind is **loopback only**. If you intentionally expose it on a network, set `LIVING_CANVAS_TOKEN`, use authenticated TLS at the reverse proxy, and restrict clients; this prototype is **not** an internet-facing telemetry service. Set `CANVAS_REDACT_PATHS=1` to suppress path names (at the cost of graph structure). Do not feed confidential traces to a public repository.

## Project status

This is a separate demonstrator, not deployed inside Atelier and not production-hardened. An accurate mapping for each real harness, unbounded full-history replay, browser testing and performance measurements on target hardware are still necessary before integration.
