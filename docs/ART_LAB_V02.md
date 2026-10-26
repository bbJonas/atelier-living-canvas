# Art Lab v0.2 — generative research studies

**Intent:** Improve the artistic vocabulary, not the already well-received dark workspace or the capture/transport pipeline. These are *alternatives for evaluation*, not a selected final style. The four v0.1 renderers remain in the app for reference.

## Three distinct visual grammars

| Study | Stable structure | Telemetry → gesture | Accumulation and recent activity |
| --- | --- | --- | --- |
| **Kinetic Ink** | File-path hash sets a stable horizontal pigment anchor; event timestamps set vertical chronology | Verified `file.changed` forms wider brush gestures proportional (capped) to `linesAdded`; `agent.message` forms cross-gestures; `tool.*` and `test.completed` form fine marks. `file.discovered` is **not** drawn as an edit. | Dry edges and transparent wash retain early strokes; recent marks gain contrast for 14 s |
| **Sculptural Strata** | A deterministic file-to-slot allocation, with directory-derived color and isometric faces | `scene.files` builds volumes; discovered-only files are faint plinths. Confirmed edits increase the height and layers of the *same* file module; revisions add ledges and highlight the rim | All visible volumes persist; the newest edits have 18 s of emphasized edges |
| **Signal Loom** | Each observed agent has one anchored warp, not an assumed model thought stream | Event timestamps place vertical weft threads; file changes give heavier strokes; actual `agent.message` draws handoff knots connecting agent warps. Agent-specific event kinds locally bend their own thread | Earlier weft remains visible while later events extend the fabric; quiet spans retain negative space |

**Do not overinterpret:** A model span means an observed API phase, **not** insight into hidden thinking. Path layout encodes names and event histories, not imports or semantic dependencies. No synthetic events are added to Live data.

## Compare studies

Use **Compare studies** in the canvas header. The 3 × 3 comparison draws **the same fixed telemetry** at 16%, 55%, and 100% of the *observed elapsed interval*, across all three renderers. The time-based fractions include genuine quiet periods (the columns do not normalize event count). A click selects that style and in Demo seeks to the exact phase. Export the contact sheet as a local PNG. Canvas thumbnails are recreated only on demand, not continuously.

Demo uses the **entire immutable synthetic run**, independent of its current playhead. Live can compare only the events still held in the bounded browser buffer. Early Live scenes cannot be reconstructed beyond that buffer. Live has no historical seeking.

## Boundedness, determinism and trade-offs

- Pure `art-data.mjs` functions define a deterministic history sample of at most **720 gestures** and an 84-module sculpture cap. Identical events, ordering and timestamp reproduce the same drawing; no `Math.random()`, timer-driven motion or external data is involved.
- Detailed early micro-gestures are progressively downsampled as the event window grows. Beyond 84 files, some volumes are omitted, disclosed by the on-canvas “N of total” label. Long-term composition is therefore **a bounded approximation**, not lossless persistence.
- Geometry scales from the canvas dimensions. All three studies use Canvas 2D; no shader, dependency or new network request is introduced. Backgrounds and brush textures are intentionally simple to keep CPU bounded.
- Paused Demo and idle Live no longer redraw every frame; the same 30 FPS/reduced-motion limits apply during active Demo playback. The comparison's nine offscreen paints occur only when explicitly opened.
- The compositional response to events is deterministic, but **pixel-exact** PNG reproducibility across platforms is not guaranteed due to Canvas font/antialiasing differences.
- The source-driven replay can be reconstructed at any Demo phase. Live `scene.files` carries an incremental projection, while the comparison intentionally works only with its bounded journal.

## Initial evaluation (hypotheses, not user sign-off)

| Dimension | Kinetic Ink | Sculptural Strata | Signal Loom |
| --- | --- | --- | --- |
| Artistic identity | painterly motion/overpainting | spatial, persistent architecture | textile/time interlacing |
| Readability of file revisits | anchored pigment echoes; subtle | **strong**, same-module height | change rhythm rather than file identity |
| Readability of handoffs | cross-gestures; abstract | not encoded individually | **strong**, explicit cross-thread knots |
| Long-term behavior | layered strokes, bounded sampling | shapes grow in place, bounded slots | weft fills observed elapsed time |
| Main risk | excess translucent overlap | crowded or too regular with many files | many tool events may crowd fine fibers |

**Recommendation:** Keep all three as studies until someone evaluates actual screenshots, long replay, small screens and accessibility; do not designate a winner from code alone.

## Validation

Automated: `npm run check` checks module syntax, deterministic sampling, bounded allocation, time-slice correctness, same-file revision behavior and mock Canvas drawing at four phases. GitHub Actions runs the same suite.

Manual browser sign-off still required: start the Node server; inspect Demo at start/mid/end, seek backward, change styles, open the comparison on desktop and mobile sizes, test PNG export; switch to Live and ingest real metadata; check high event densities and reduced-motion settings. Record screenshots and performance numbers on target hardware **before** declaring artistic acceptance. A Node mock-Canvas test is not equivalent to a browser screenshot or FPS benchmark.
