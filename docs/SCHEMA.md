# Telemetry schema v1

A single event is a JSON object. Required: `kind` (one of the allowed types). The ingestion service fills `v: 1`, `at` (epoch milliseconds), `runId` (defaults to `local-run`), `agentId` (defaults to `main`), and a monotonically increasing `seq`.

Allowed kinds:
- `run.started`, `run.completed`
- `agent.started`, `agent.completed`, `agent.message`
- `model.started`, `model.completed` (observable phase transitions only)
- `tool.started`, `tool.completed`
- `file.discovered` (inventory only), `file.changed` (actual write/change)
- `test.completed`

Optional allowlisted fields: `parentAgentId`, `peerAgentId`, `filePath`, `operation` (`create`|`modify`|`delete`|`rename`), `toolName`, `status` (`ok`|`error`|`cancelled`|`unknown`), `durationMs`, `linesAdded`, `linesRemoved`, `testPassed`, `testFailed`.

Example input (the server completes missing fields):

    {"kind":"agent.started","runId":"demo-1","agentId":"builder"}
    {"kind":"tool.started","runId":"demo-1","agentId":"builder","toolName":"apply_patch"}
    {"kind":"file.changed","runId":"demo-1","agentId":"builder","filePath":"src/app.ts","operation":"modify","linesAdded":18,"linesRemoved":3}
    {"kind":"tool.completed","runId":"demo-1","agentId":"builder","toolName":"apply_patch","status":"ok","durationMs":210}

**Privacy contract:** Any unknown keys are DROPPED. Never send raw tool payloads, prompts, unredacted model output, chain-of-thought, environment variables, API keys or file content. Paths must be relative and reject traversal, hidden credentials and sensitive names. If stricter disclosure is required set `CANVAS_REDACT_PATHS=1`.

**Semantics:** `model.started` means the harness observed a model request start; it does not imply access to private reasoning. `agent.message` describes a handoff, not its content. A file may appear through `file.discovered` without any observed edits. Missing/unknown values must not be fabricated. Tool timestamps are arrival-provided and can be skewed by the producer's clock.

**Wire limits:** Maximum 200 items per HTTP batch, maximum 128 KiB per request, default 300 accepted events per second, default retained journal 3,000 events, up to 20 live viewers. Server rejects malformed batches atomically.

## Replay and transport

`POST /api/events`: canonical event or array of events (Content-Type: application/json). Optional Bearer token via `LIVING_CANVAS_TOKEN`.

`GET /api/stream`: server-sent event `snapshot` containing `events`, `stats` and a bounded materialized `state`; subsequent `telemetry` events contain canonical records with `seq`.

`GET /api/snapshot`: equivalent JSON snapshot including `state`.

`GET /api/health`: ingestion counters. A consumer should deduplicate by `seq` when reconnecting.

Schema changes require a new version and compatibility migration; renderer modules should not parse raw harness messages.
