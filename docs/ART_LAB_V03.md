# Art Lab v0.3 — Expressive Art Lab

**Aim:** Bring saturated, recognizable generative compositions to the foreground. The artworks respond to observed metadata only; they are neither depictions of model thought nor diagnoses of code quality.

## What changed

| Style | Persistent compositional identity | Telemetry-driven growth |
| --- | --- | --- |
| **Prismatic Ink** | Multicolored, translucent wet brush, overpainting and chromatic halos | File-path anchors, agent color, revision count, events rising from bottom to top; handoffs span anchors |
| **Chromatic Bloom** | Curved growth stems and colorful layered petals | Directory regions make stems; verified file changes grow petals, hot-file revision thickens them; handoffs link growth regions |
| **Kinetic Ribbons** | Calligraphic color bands and fine filaments | Agent IDs own stable, rising streams; events extend curves, file revisions emboss, observed handoffs braid agent ribbons |

Original Kinetic Ink, Sculptural Strata and Signal Loom remain available. All use Canvas 2D, deterministic coordinates and bounded event samples, not a generative model. Style geometries are independent, not recolorings of the same painter.

## Common presentation projection

`public/visualizers/art-signals.mjs` interprets up to 720 observed events per frame through `observedEvents()`. It derives:

- **Activity burst:** count of nearby sampled events, capped at 12.
- **Revision heat:** number of sampled observed edits to the same file path.
- **Working rhythm / quiet:** elapsed intervals over 7.5 s between sampled events.
- **Growth region:** deterministic first two file-path components, or agent namespace when path is absent, capped at 84 regions.
- **Agent interplay:** only observed `agent.message` with `peerAgentId`.
- **Phase transition:** a gap-based presentation segmentation, not a claim that the agent internally changed phase.

The projection is pure and replay-safe. Its estimates can be affected by bounded downsampling: a quiet gap in the *sample* can be caused by omitted events, and revision counts are sampled counts, not full lifetime edit counts. Do not interpret these derived shapes as ground-truth operational metrics. No new capture fields or private content were added.

## New synthetic datasets

`generateDemoDataset('atlas' | 'release-rush' | 'deep-refactor', seed)` is deterministic; Atlas is unchanged.

- **Atlas** is the original baseline.
- **Release Rush** interleaves six named agents over five stages, with dense concurrent file edits, handoffs, tool/model phases, failing tests, corrections and a quieter release phase.
- **Deep Refactor** uses three agents, revisits a small set of architecture files, and gives extended pauses and longer revision sequences.

All records are simulations with canonical telemetry-v1 event types; names and paths are fictitious. Events are chronological and reproducible. **Parallelism** denotes interleaved events from independently active agents; the trace cannot reconstruct physical simultaneity of every operation.

The Demo selector resets playhead, duration, metrics and render state on change. Live has no dataset selector and does not mix synthetic events with incoming telemetry.

## Comparison and export

**Compare studies** has two axes:

1. Three styles on the same trace and corresponding elapsed-time phases (choose expressive or original studies).
2. One chosen style on three different synthetic datasets at 16%, 55%, 100% of each trace's own elapsed interval.

Nine thumbnails can be exported as a PNG contact sheet. Clicking a frame switches style and, in demo dataset comparison, the dataset and playhead. Live comparison uses only locally buffered events, and only the same-trace style axis; no historical Live data is invented.

## Resource/accessibility boundaries

- Pure Canvas 2D; no added runtime dependency, network request or LLM call.
- Art history is bounded to 720 sampled marks; growth regions to 84 and agent streams to 12. Color geometry is deterministic for identical records and seed, subject to platform-specific font/antialiasing.
- Replays use original event timestamps. Seek backwards recomputes drawing from the relevant prefix; no accumulated state leaks across seeks.
- Sidebar navigation has an independently scrollable region, visible slim scrollbar and keyboard focus styles. Desktop keeps brand/status outside nav scroll. At narrow widths the list scrolls vertically with readable labels.
- Reduced motion and background-tab handling remain governed by the existing frame scheduler.
- Files, prompts, outputs, chain-of-thought and raw tool data are not gathered beyond the existing allowlisted metadata.

## Validation status and limitations

Automated tests cover reproducibility, causal edit order, differing workloads, bounded projection, renderer stability at several phases, and static UI controls. The CI workflow invokes `npm run check` on pull requests.

**Manual acceptance is still required:** inspect desktop and mobile scrollbars (including zoom and short viewports), browser colors/layout, beginning/middle/end of each trace, backward seek, nine-frame PNG contact sheets, and performance under long replay. Canvas mock tests alone do not establish visual quality or browser performance. No browser screenshots or production telemetry should be claimed unless obtained separately.
