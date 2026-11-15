# Vector board engine (v3)

The vector board is a document-space vector editor. Geometry no longer depends
on the size of the canvas element: a board has a fixed size (default 1200×900),
all coordinates are user units, and the viewport is an affine transform
(`scale, tx, ty`) layered on top.

This is the implementation of the rules in
[`reference/avnac-vector-vs-inkscape.md`](../reference/avnac-vector-vs-inkscape.md).

## Module map

```
frontend/src/lib/avnac-vector/
  constants.ts       fixed board defaults, screen-pixel interaction radii
  types.ts           v3 document, strokes, anchors, node types, viewport
  geometry.ts        points, cubics, tight bounds, RDP/smoothing, fill rules
  node-types.ts      corner / cusp / smooth / symmetric invariants
  fit.ts             Schneider cubic fitting + deviation measurement
  path.ts            stroke → cubic path, flatten, nearest point, SVG `d`
  pen-ops.ts         De Casteljau insert, refit delete, move/type helpers
  document.ts        schema creation, v1/v2 migration, ops, hit testing
  view.ts            world ↔ screen transforms, fit, zoom, padding
  snap.ts            node/axis/board snapping and angle locks
  paint.ts           canvas painting, overlays, board surface, thumbnails
  render-cache.ts    per-layer board-space cache + pure cache planner
  svg.ts             real `<path>` export + data-URL helpers
  history.ts         byte-capped snapshot undo
  index.ts           public surface
```

UI:

```
frontend/src/components/editor/vector-boards/
  vector-board-workspace.tsx      modal shell + document actions
  vector-board-toolbar.tsx        tools, paint slots, node types, snap
  vector-board-canvas.tsx         canvas element, status, zoom controls
  vector-board-layers-panel.tsx   layer list
  vector-board-cursors.ts         screen-space cursors
  hooks/
    use-vector-board-document.ts  document state, live edits, undo/redo
    use-vector-board-view.ts      fit, zoom, pan, resize behaviour
    use-vector-board-painter.ts   rAF paint loop + caches
    use-vector-board-editor.ts    pointer/keyboard state machine
    vector-board-editor-utils.ts  hit tests and stroke construction
    vector-board-paint-state.ts   refs shared by editor + painter
```

## Document model

```ts
type VectorBoardDocument = {
  v: 3
  size: { width: number; height: number }   // document units
  layers: VectorBoardLayer[]
  activeLayerId: string
}

type VectorBoardStroke = {
  id: string
  kind: 'pen' | 'line' | 'rect' | 'ellipse' | 'arrow' | 'polygon'
  points: [number, number][]                 // document units
  penAnchors?: VectorPenAnchor[]             // cubic path for 'pen'
  penClosed?: boolean
  stroke: string; strokeWidth: number; strokeOpacity: number
  fill: string; fillOpacity: number; fillRule: 'nonzero' | 'evenodd'
  lineCap: 'butt' | 'round' | 'square'
  lineJoin: 'miter' | 'round' | 'bevel'
}

type VectorPenAnchor = {
  x: number; y: number
  inX?: number; inY?: number
  outX?: number; outY?: number
  type: 'corner' | 'cusp' | 'smooth' | 'symmetric'
}
```

Everything drawable resolves to cubic segments. Rect/ellipse/polygon are
parametric while stored (four exact cubic arcs for ellipses) and convert to
paths on export.

## Rules ↔ implementation

| Rule | Where |
| --- | --- |
| R1 fit, never store samples | `fit.ts` (Schneider fit), pencil commit in `use-vector-board-editor`, tolerance slider |
| R2 document space, fixed aspect | `types.ts`, `view.ts`, v3 migration |
| R3 stroke width in document units | `types.ts`, `document.ts` scale helpers, "scale strokes" toggle |
| R4 node constraints | `node-types.ts` (`dragNodeHandle`, `applyNodeType`) |
| R5 refit on delete | `pen-ops.ts` `deleteAnchorWithRefit` (endpoint-slope least squares + fallback) |
| R6 screen-space hit radii | `view.ts` `screenPxToDoc`; every hit test divides by view scale |
| R7 snap | `snap.ts`, wired into pen placement, shape end, node drag |
| R8 fill rule | `fillRule` on strokes; `ctx.fill(rule)`; SVG `fill-rule` |
| R9 independent paint slots | stroke/fill toggles, opacity, line cap/join in the toolbar |
| R10 export paths | `svg.ts`; scene placement/drop stores SVG, exporter inlines it |
| R11 incremental paint | rAF painter, surface cache, per-layer cache, live-edit split |
| R12 undo granularity/cap | `history.ts` byte + entry caps; commit on pointerup |
| R13 Escape/Backspace | editor key handler: Escape cancels draft → node edit → selection → close |

## Pencil fitting

The pencil keeps the raw sample buffer only while the pointer is down. On
release it:

1. dedupes near-identical samples,
2. runs a light RDP pre-pass (15% of tolerance),
3. fits a chain of cubics with Schneider's algorithm,
4. infers a node type at every join from the actual handle geometry,
5. commits anchors in document units.

Tolerance is a screen-pixel preference (`1–18 px`, default 4) divided by the
view scale, so a stroke fits identically at every zoom. A 600-sample hand
stroke typically becomes 7–15 anchors; the feature test asserts under 40 and
the checklist target of under 25 at default tolerance.

## Node deletion

Deleting a node samples the stretch that the node used to describe, preserves
the surviving endpoints and their tangents, and solves for two handle lengths
(2×2 least squares). If the resulting single cubic deviates more than
`max(2 px / scale, 8% of the gap chord)`, the editor falls back to stripping
the facing handles. Endpoints are handled separately: only the facing handle
is cleared.

## Painting and performance

- One `requestAnimationFrame` per burst of invalidations.
- `canvas.width/height` is only assigned when CSS size or DPR changes.
- The board surface (backdrop, grid, border) is cached separately and only
  rebuilt when the view or viewport changes.
- Committed layers are cached in board space. Panning and zooming do **not**
  invalidate layer caches; only a changed layer object or a cache-resolution
  bucket does.
- During a move/resize/node drag, the base document (with the dragged strokes
  removed) is cached and only the dragged strokes are re-stroked on top. The
  parent `onDocumentChange` is called once, on pointerup.
- Paint-control changes (stroke width, colour, fill, join, fill rule) are a
  single live transaction. Each tick updates the live document and repaints
  only the selected strokes; one undo snapshot is committed when the slider is
  released (or after a 300 ms idle for non-slider colour changes). Clearing or
  deleting cancels the transaction instead of paying for a style commit first.
- Built cubic paths, per-stroke bounds and selection bounds are cached by
  object identity. A selection over a 2 500-node pen path therefore does not
  rebuild the path every pointer move. Nearest-point queries also prefilter
  segments with a cached bounding-box lower bound.
- Cache resolution is bounded by a pixel budget
  (`chooseCachePixelRatio`) to keep memory predictable.

Measured on a seeded 5 000-stroke board in the Wails browser (Chromium):

| Operation | Before | After |
| --- | --- | --- |
| Clear all | ~17 ms | ~17 ms |
| Undo clear (5 000 strokes) | ~29 ms | ~29 ms |
| 10 stroke-width ticks (2 000 selected) | 10 undo entries, ~9.2 MB extra history | 1 undo entry, one commit |
| 50 stroke-width ticks (1 selected, 5 000-stroke board) | 50 commits / full repaints | ~1.2 ms per tick, 1 commit |
| Undo after width drag | 11 → 10 (one tick) | 50 → 1 (one transaction) |

Budgets live in `frontend/tests/features/vector/vector-performance.test.ts`;
the coalescing/clear regression is covered end-to-end in
`tests/e2e/vector-board.e2e.ts`.

### Why the hot paths stay in JavaScript

The profiled stalls were **transaction granularity**, not arithmetic: every
slider tick created a full document snapshot, pushed history, re-rendered React
and re-stroked the whole layer. Go cannot remove canvas rasterization or the
React commit, and an IPC round-trip per pointer tick would add latency. The
geometric kernels that are genuinely CPU-bound (freehand fitting, bounds) run
in 1–10 ms for normal strokes and are batch operations; the path/bounds caches
now make repeated hit tests and repaints O(1) in the common case. Go remains the
right place for disk persistence and it already owns the board-doc file I/O.

## Persistence and scene integration

- `saveVectorBoardDocs` / `ReadVectorBoardDocs` (Wails) persist the v3 JSON.
- `loadVectorBoardDocs` migrates v1/v2. Legacy normalized coordinates are
  multiplied by the board size; `strokeWidthN` becomes document units via
  `min(width, height)`. Anchors and handles are preserved exactly.
- An in-memory live cache fronts the persisted JSON so a board dragged to the
  canvas immediately after drawing still uses the current strokes.
- Save-and-place and drag-to-canvas produce an SVG data URL with
  `data-avnac-vector-board="1"`. `avnac-selection-export.ts` detects that
  marker and inlines the board's `<path>` elements into the scene SVG instead
  of emitting an `<image>`.

## Tests

```bash
cd frontend
npm run typecheck
npm run test            # unit + feature/perf
npm run test:e2e        # needs: wails dev -browser (http://localhost:34115)
```

E2E covers every drawing tool, pen node editing (smooth/cusp/corner, refit
delete, insert), Escape/Backspace, undo/redo, layers, zoom/pan, reload
persistence, save-and-place, drag-to-canvas and SVG path export.

## Programmatic drawing (MCP)

The `vector` MCP tool drives this document model from an agent: it resolves a small scene-graph IR
into cubic paths, emits a v3 document and places real SVG on the canvas. Geometry lives in
`internal/vector/`; placement reuses the scene image-node/SVG-data-URL representation described
above. See [vector-drawing.md](vector-drawing.md) for the IR, the tool ops and the knowledge base,
and [vector-eval.md](vector-eval.md) for the tests that keep it honest. Boolean operations remain
out of scope for the editor, and the IR does not add them: rule 126 documents the technique and the
export audit covers the result.

---

## Out of scope

Boolean operations, offset/outline, live path effects, the auto node solver,
PowerStroke pressure, and a full snapping source/target matrix. The fit,
document-space and node-constraint triad is the quality floor; these are
last-mile Inkscape features.