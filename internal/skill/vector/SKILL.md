---
name: vector
description: Draw and edit original vector artwork as editable paths, Bézier curves and clean SVG. Use whenever the user wants something drawn as vectors — an illustration, character, icon, badge, geometric mark, diagram figure or pattern — or complains that curves look lumpy, nodes are wrong, a shape is asymmetric, overlaps show seams, or an export renders differently in another app. Trigger on "draw", "vectorize", "trace as vectors", "make an SVG", "fix the bézier", "mirror it", "the path is lumpy", "it wobbles when scaled", even when the user never says the word vector.
---

# Drawing Vectors

## Applies when
The deliverable is geometry — paths the user can edit, scale and recolour — rather than a composed
page: a drawing built from shapes, contours, nodes and handles. That includes ornaments, patterns,
badges, geometric marks, characters, diagram figures, mandalas, radial or mirrored compositions,
petal and leaf motifs, and any existing artwork whose curves, symmetry, overlaps or SVG output is
the problem. Use `logo` when the drawing must carry a brand, `icon` when it is a UI pictogram, and
`illustrate` when the priority is style and storytelling. This skill owns the construction: the
scene graph, the coordinates, the curves, the booleans and the SVG.

## What good output looks like
- Every part has a stable id, so the next request can say "make the ears smaller" and be obeyed.
- Geometry is built from primitives and relationships, not guessed coordinates.
- Curves are inside their magic triangles, with the right node type and balanced handles.
- Symmetry is generated, never redrawn.
- The SVG opens identically in a browser, a design tool and a cutter.

## Workflow

1. **Intent.** One sentence: subject, style, palette, size, and what must be editable. If the user
   gave a reference image, read it for construction (circles, ratios, angles), not for colours first.
2. **Spatial plan.** Sketch the composition as boxes and relationships: what is centred, what is
   mirrored, what sits inside what. Name the objects here — the names become ids.
3. **Vector IR.** Write the scene as objects with type, box, paint and constraints. Keep it small:
   six to twelve objects for an icon, twenty to forty for a character. See the schema below.
4. **Resolve.** Let the engine derive positions from constraints and mirrors. Do not hand-place a
   mirrored half or a centred pair.
5. **Draw and render.** Call `vector` op=draw. It resolves the IR, places a vector SVG on the canvas
   and returns the object id, the SVG and the resolved bounds. Then `get_canvas_image` to look at it.
6. **Verify, then refine.** Check silhouette at 100% and 25%, count anchors, confirm the mirror is
   exact, confirm SVG validity. Fix with `vector` op=update by id, not by redrawing the whole scene.

## Drawing with the `vector` tool

`vector` is the noun tool for path geometry. Its verbs are `op` values:

| op | What it does | Key fields |
|---|---|---|
| `draw` | Resolve an IR and place it as a vector element on the active page | `canvas`, `objects[]`, `layers[]`, `x`, `y`, `scale`, `name` |
| `update` | Apply object-level operations to a board created this session | `boardId`, `operations[]` |
| `read` | Return the current IR and the resolved v3 document | `boardId` |
| `export` | Return the SVG source (and optionally write a file) | `boardId`, `filePath` |
| `delete` | Remove the placed element and forget the board | `boardId` |
| `list` | List boards created this session | none |

A minimal draw:

```json
{
  "op": "draw",
  "name": "Rocket icon",
  "canvas": { "width": 256, "height": 256, "background": "#F4F0E8" },
  "objects": [
    { "id": "body", "type": "capsule", "x": 102, "y": 52, "width": 52, "height": 116,
      "fill": "#E85D3F" },
    { "id": "fin-left", "type": "polygon", "x": 62, "y": 118, "width": 34, "height": 36,
      "points": [[96, 118], [62, 154], [96, 146]], "fill": "#D94A36" },
    { "id": "fin-right", "type": "polygon", "mirrorOf": "fin-left", "axis": "vertical",
      "fill": "#D94A36" },
    { "id": "window", "type": "circle", "x": 112, "y": 78, "width": 32, "height": 32,
      "fill": "#9FD3E8",
      "constraints": [{ "relation": "centered_on", "target": "body", "offset": [0, -18] }] },
    { "id": "flame", "type": "path", "start": [116, 172],
      "segments": [
        { "type": "cubic", "control1": [120, 196], "control2": [136, 196], "to": [140, 172] } ],
      "closed": true, "fill": "#F4B23F" }
  ]
}
```

Refining without regenerating:

```json
{
  "op": "update",
  "boardId": "<returned by draw>",
  "operations": [
    { "op": "resize", "target": "fin-left", "width": 28, "height": 32 },
    { "op": "mirror", "target": "fin-right", "of": "fin-left" },
    { "op": "move", "target": "window", "by": [0, -2] },
    { "op": "restyle", "target": "body", "fill": "#EF6B4A" }
  ]
}
```

Operations are applied in order and re-resolved once, so a mirror after a resize sees the new size.
Available operations: `resize`, `move`, `rotate`, `mirror`, `restyle`, `reorder`,
`delete`, `add` (adds an object using the same schema as `draw`).

## The object schema, briefly
- **Type:** `rect`, `ellipse`, `circle`, `capsule`, `polygon`, `star`, `line`, `path`.
- **Box:** `x`, `y`, `width`, `height` in board units, top-left origin. `circle` uses the
  smaller edge; `polygon` and `star` accept explicit `points` or generate from the box.
- **Path:** absolute `start: [x,y]` and `segments: [{type:"line"|"cubic", to:[x,y], control1?, control2?}]`,
  plus `closed`.
- **Paint:** `fill`, `stroke`, `strokeWidth`, `fillOpacity`, `strokeOpacity`, `fillRule`,
  `lineCap`, `lineJoin`. Empty string disables a slot.
- **Relations:** `constraints: [{relation, target, gap?, offset?, axis?}]` and
  `mirrorOf` + `axis: "vertical" | "horizontal"` (mirror line defaults to the board centre; set
  `axisValue` to move it). A mirrored object must not carry its own constraints — constrain the
  source — and you edit it through the source.
- **Layers:** `layer` id per object; array order is z-order, bottom to top.

## Rules to apply
- [`120-vector-scene-graphs`](../rules/120-vector-scene-graphs.md) — parts, ids, depth and z-order.
- [`121-vector-coordinate-systems`](../rules/121-vector-coordinate-systems.md) — board units, viewBox, transforms.
- [`122-geometric-primitives-and-construction`](../rules/122-geometric-primitives-and-construction.md) — build from measured shapes.
- [`123-spatial-constraints-and-relationships`](../rules/123-spatial-constraints-and-relationships.md) — derive placement, do not guess it.
- [`124-symmetry-and-transformations`](../rules/124-symmetry-and-transformations.md) — mirror and repeat exactly.
- [`125-bezier-curves-and-path-construction`](../rules/125-bezier-curves-and-path-construction.md) — the magic triangle, node types, balanced handles.
- [`126-vector-boolean-operations-and-composition`](../rules/126-vector-boolean-operations-and-composition.md) — union, subtract, winding and overlaps.
- [`127-svg-generation-and-validation`](../rules/127-svg-generation-and-validation.md) — the export contract and audit.

## Numbers to draw by
- Circle handle: `0.5523 × radius`. Designed curves: 60–70% of the magic triangle.
- Anchor budgets: circle 4 · leaf 6–8 · face 12–20 · character 30–60. Over 1.5× the budget means
  simplify before editing.
- Star inner radius: 0.38–0.50 of the outer. Corner radii: pick four values, reuse them.
- Minimum stroke: 0.5 px on screen, 0.25 pt in print. Round forms overshoot 1–1.5%.
- Keep everything 2% inside the board; stray geometry outside changes the exported bounds.
- Joins: a stroke turning an elbow reads thin — add 3–8%; two strokes overlapping at an acute
  vertex darken — narrow the stroke locally. Opposite corrections, different joins.
- Contrast: declare thin ÷ thick once (monoline 100%, medium ≈32%, high 19–24%) and hold it across
  every part.
- Page fit: the mark's module divides the page grid, the gap to type is one leading unit, clear
  space is cap height.

## Placing vector art in a composed page

A drawing is finished in isolation and broken on a page. Once the geometry is right:

1. **Take the module from the page, not from the drawing.** Read the layout's grid or type size and
   draw the mark so its key dimension is a multiple of that module. A mark sized to fit its own
   board has to be resized later, and resizing changes its stroke weight.
2. **Set the gap and the lockup as ratios.** Space to neighbouring type is one leading unit; the
   mark : type size : gap relationship is one ratio you reuse on every appearance. Publish clear
   space as a number (cap height or half the mark's height).
3. **Align to type, not to a box.** Vector tops meet the cap line, bottoms the descender line; an
   object aligned to a bounding box reads as slightly off everywhere it is placed.
4. **Place, then check the composite.** `vector` op=draw with `x`/`y`/`scale`, then `get_canvas_image`
   on the *page*. Isolated SVG inspection cannot show whether the mark sits on the grid, whether
   the gap is right, or whether it is competing with the headline.
5. **Spend the contrast once.** The mark is usually the only arbitrary shape on the page: give it
   the one diagonal, the one strong value, or the one saturated colour — not all three.

Numbers for the page: grid gap = 1 leading unit · clear space = cap height · two type sizes at
most · mark and wordmark share one stroke ratio. A mark that has to be redrawn for each page is
not a system; see [`53-logo-construction`](../rules/53-logo-construction.md) and
[`07-alignment-and-proximity`](../rules/07-alignment-and-proximity.md).

## Verification
1. **Silhouette read.** Render at 100% and at 25%. At 25% the drawing must still be identifiable;
   if it becomes a blob, the spacing or the counters are wrong.
2. **Anchor audit.** Count anchors per shape against the budget. Look for clusters of near-duplicate
   points — they are refit leftovers.
3. **Symmetry audit.** Axis visible at 400%: every non-mirrored point is either deliberate
   asymmetry or a mistake.
4. **SVG audit.** Root viewBox equals the board, every fill/stroke explicit, compound paths declare
   a fill rule, no open filled path, render at 16 px and 4000 px.
5. **Page check.** With the element placed, re-render the whole page: on the grid, gap = one leading
   unit, clear space intact, still legible at the smallest size the page uses.
6. **Report.** Name the rules followed and the checks passed; if something was approximated, say so.

## Failure modes to catch in your own draft
- A "centred" pair that is off by one unit because both copies were hand-placed.
- A curve that bulges just before a straight join: zero handle or handle outside the triangle.
- A mirrored shape whose hole disappeared: winding was not reversed.
- A `viewBox` that does not match the board: strokes and type scale wrong everywhere.
- A drawing that only works at one size: too many anchors, or features under the minimum stroke.
- A vertex that blobs at 400%, or an elbow that reads thin: the join was left uncorrected.

## References
- [`vector-graphics`](../references/vector-graphics.md) — handle constants, optical corrections,
  stroke contrast and joins, line grammar, primitive formulas, relationship vocabulary,
  boolean/winding table, mark-on-a-page table, SVG checklist, IR schema.
- [`illustration`](../references/illustration.md) — style and consistency across a set.
