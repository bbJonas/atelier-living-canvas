# Architecture / design decisions

## Principle

Living Canvas observes the *execution* of work, not a model's private mind. The artwork is a deterministic interpretation of structured telemetry. It must never claim to visualize hidden reasoning or knowledge not exposed by the harness.

## Layer A — capture and transport (no visualization dependencies)

- Instrument the harness/tool gateway at the moment a tool **starts** and **ends**; emit metadata only. File writes are captured from the execution result or explicit edit hook, not guessed from chat text.
- Optionally take a one-time inventory of Git-tracked project paths with \`node scripts/send-events.mjs --git-files\`. These are \`file.discovered\` events, NOT \`file.changed\`.
- Canonical schema: \`src/core/events.mjs\` / \`docs/SCHEMA.md\`.
- \`EventCollector\` validates whole batches, keeps a bounded journal (default 3,000 events), limits input rate (default 300/s), and fans out lightweight SSE messages. No telemetry database or background polling.
- \`POST /api/events\` ingests; \`GET /api/stream\` yields initial snapshot + events; \`GET /api/snapshot\` enables inspection; \`GET /api/health\` exposes counters.
- CLI bridge reads canonical JSONL, or produces a Git-file inventory. Adapters for DSH, OpenCode, Pi, Hermes and Atelier can call the same contract. Do not advertise vendor integrations as ready before verifying their event hooks.

## Layer B — transformation and artwork

- \`deriveScene\` builds agent, file and interaction relationships from the event trace.
- \`topology\` is pure and deterministic: file and folder paths occupy stable positions.
- Renderers are isolated modules in \`public/visualizers/\`. Each has \`title\`, \`subtitle\`, and \`draw(ctx, { width, height, scene, events, time })\`.
- A browser-native 2D canvas draws wavefields, constellations, branching agent activity and scores. No shader framework or expensive simulation loop is required.
- Replay works from a seeded, synthetic trace. Live mode only represents events received by the server.
- Export the PNG or the sanitized JSON trace. No upload or remote analytics.

## Resource budget and boundaries

- No permanent indexer or deep file scanning. The CLI inventory runs once when explicitly requested.
- Up to 30 draw FPS; actual internal resolution is capped to roughly 1.6 million pixels; reduced-motion preference drops to ~1 FPS; hidden tabs do not render.
- Event history is bounded; very long runs need a separate bounded *materialized state* to preserve old file changes beyond the event journal. This is an explicit follow-up and a known v0.1 limit.
- UI repaint and DOM panels are throttled; graphs use simple 2D primitives.
- Default binding: \`127.0.0.1:4173\`. Protect non-loopback deployments with \`LIVING_CANVAS_TOKEN\`, reverse-proxy TLS and authentication. Do not expose the ingestion service directly to the internet.
- File path names themselves may be sensitive; hide absolute paths, traversal, secret/config folders. \`CANVAS_REDACT_PATHS=1\` disables paths completely (and thus the file-cosmos detail).
- No raw prompts, model outputs, reasoning text, tool arguments/results or file bodies are in the allowlisted format.

## Extensibility

Add a capture adapter by converting genuine harness execution hooks to telemetry v1. Add artwork by implementing the renderer interface and registering it in \`public/main.mjs\`. This leaves capture independent from all visual styles.

Future Harness²/ALTK integration should consume exported event *summaries* for evaluation, never have visualization heuristics automatically change agent policy. Treat the artwork as observability, not a quality oracle.

## Current limits

This version is a working artistic demonstrator with generic live ingestion, not a native Atelier integration. It has no privileged access to LLM internals. Event kind coverage depends on what the harness actually emits. Canvas layout represents paths, not full semantic import dependencies. Historical snapshots after the journal cap, multi-run multiplexing, authenticated remote access, and browser accessibility reviews remain future work.
