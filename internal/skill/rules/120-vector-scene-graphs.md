# Rule: Vector Scene Graphs

**Domain:** vector · **ID:** `120-vector-scene-graphs`

## Purpose
Describe a vector drawing as a tree of addressable objects so an agent can place, edit, reorder and
re-render parts without regenerating the whole document. A scene graph is the difference between a
drawing you can revise and a path string you can only replace.

## Definition
A vector scene graph is a set of nodes — shapes, paths, groups and instances — each with a stable
id, a parent, a local transform, paint, and a stacking position. Rendering walks the tree in
document order and composes each node's transform onto its parent's. The document also carries
one coordinate frame (the board) and a layer partition.

## Core Principles
- **Objects, not path soup.** Every mark that can be named ("left ear", "window", "stem") is its
  own node with an id. A node that cannot be named is probably part of its neighbour.
- **One node, one job.** A node carries either geometry plus paint, or a transform for children.
  Do not use a group as a folder; use it when children share a transform, an opacity, or a
  semantic role the brief will refer to.
- **Depth is capped at three.** board → group → shape. Deeper trees are unreadable to an agent
  and slow to hit-test; flatten anything that only exists to organise the file.
- **Z-order is content.** Decide the depth bands before drawing: background (0), mid-ground (1),
  subject (2), detail/accent (3). Order nodes bottom to top within each band.
- **Identity survives edits.** Ids are assigned once and never recycled. An edit addresses
  `fox/ear-left`, not "the fourth path".
- **Layers are semantic.** Three to five layers named for their role (`ground`, `subject`,
  `detail`, `type`), not `Layer 1`. A layer is a paint-isolation and visibility decision, not a
  way to group unrelated shapes.
- **The renderer is dumb.** No cycles, no dangling parents, no NaN or infinite coordinates, no
  zero-area nodes that still paint. Anything the renderer has to special-case is a modelling bug.

## Techniques

**Avnac ops:** `vector` op=draw resolves the object graph and places it; `vector` op=read returns the IR, document and bounds; `vector` op=update edits by id; `export` op=svg is the resolved document.

1. **Scene table first.** Before coordinates, write a table: id, type, parent, role, paint, z.
   If two rows describe the same visual thing, merge them now.
2. **Name by role, not by order.** `rocket/body`, `rocket/fin-left`, `rocket/window`. Suffix
   variants with the axis (`-left`, `-right`, `-mirror`) so a mirror operation can find its pair.
3. **Group for transforms, not tidiness.** A group earns its place if moving it should move all
   children, or if it must fade as a unit.
4. **Bottom-up build, top-down edit.** Render background to foreground; when editing, resolve the
   parent chain first, then the target, then re-render only that subtree.
5. **Flatten audit.** After construction, list leaf count, group count and maximum depth. More
   groups than leaves means the hierarchy is organising rather than expressing.
6. **Instance repeated parts.** A repeated ear, petal or window is one definition placed N times
   with a transform, not N hand-drawn copies.

## When to Use
- Any vector drawing with more than one object: icons with cutouts, logo lockups, character and
  object illustration, diagrams, maps.
- Work that will be revised conversationally ("make the ears smaller", "move the eyes closer").
- Compositions that reuse elements: patterns, icon families, radial ornaments.

## When to Avoid
- A single-path mark where the path *is* the drawing — a monoline glyph, a hand-drawn squiggle.
  Wrapping it in a scene adds indirection for nothing.
- Final flattened artwork for delivery, where no further editing is expected and the smallest
  possible file matters.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| One path per colour with everything fused | Any edit needs a rebuild; anchors jump | Split by named part |
| Groups used as folders, five levels deep | Nothing is where its name suggests | Cap depth at three |
| Ids like `path-17` | Cannot be addressed in a later turn | Role-prefixed ids |
| Z-order left to creation order | Details land behind backgrounds | Plan four depth bands |
| A hidden copy of the same shape | Double paint at seams and double nodes | One instance, repeated by transform |

## Practical Examples
A 256 × 256 rocket icon as a scene graph. The block is the exact payload `vector` op `draw`
resolves (and `go test ./internal/skill` compiles it), so it cannot drift from the schema:

```json vector
{
  "canvas": { "width": 256, "height": 256, "background": "#F4F0E8" },
  "layers": [{ "id": "ground" }, { "id": "subject" }, { "id": "detail" }],
  "objects": [
    { "id": "ground/shadow", "type": "ellipse", "layer": "ground",
      "x": 68, "y": 216, "width": 120, "height": 16, "fill": "#00000018" },
    { "id": "subject/body", "type": "capsule", "layer": "subject",
      "x": 102, "y": 60, "width": 52, "height": 116, "fill": "#E85D3F" },
    { "id": "subject/fin-left", "type": "polygon", "layer": "subject",
      "x": 54, "y": 118, "width": 48, "height": 44,
      "points": [[96, 118], [54, 162], [96, 146]], "fill": "#D94A36" },
    { "id": "subject/fin-right", "type": "polygon", "layer": "subject",
      "mirrorOf": "subject/fin-left", "axis": "vertical", "fill": "#D94A36" },
    { "id": "detail/window", "type": "circle", "layer": "detail",
      "x": 112, "y": 78, "width": 32, "height": 32, "fill": "#9FD3E8" }
  ]
}
```

Five nodes, three layers, depth 2 — small enough to edit in one pass, and every part is
addressable by name. Array order is z-order: ground, then the body and fins, then the window.

## Verification
1. **Ops receipt.** `vector` op=read lists every object with a stable id and no duplicate, `vector` op=update can address each one, and `export` op=svg contains one path group per object. A scene that can only be read as a flat final path has no graph.
2. **Id audit.** `vector` op `read`: every part has a role-prefixed id (`rocket/body`,
   `rocket/fin-left`), no duplicates and no `path-17`. An id you would not say aloud in an
   edit request is the wrong id.
3. **Depth audit.** Count board → group → shape. Three levels maximum; a group with one child is a
   folder, not a transform, and is flattened.
4. **Z-order read.** Array order is paint order. Remove the fills for one render: anything that
   vanishes behind its neighbour was ordered wrong, not coloured wrong.
5. **Edit test.** Ask for one part to change ("move the window up 4 units") and apply it with
   `vector` op `update` by id. If any other part moves, the tree is wrong.
6. **Layer count.** Three to five layers, named for a role. Ten layers means the file is organised
   by accident.

## Related Rules
- [`121-vector-coordinate-systems`](121-vector-coordinate-systems.md) — the frame every node's transform resolves in.
- [`124-symmetry-and-transformations`](124-symmetry-and-transformations.md) — instancing and mirroring inside the tree.
- [`127-svg-generation-and-validation`](127-svg-generation-and-validation.md) — serialising the tree without losing identity.
- [`66-vector-illustration`](66-vector-illustration.md) — the drawing discipline the graph organises.
- [`61-shapes-and-forms`](61-shapes-and-forms.md) — choosing the primitive each node holds.

## Sources
- Glyphs, *Drawing good paths* (<https://glyphsapp.com/learn/drawing-good-paths>) — path direction
  and order, and the cost of overlapping shapes, in a vector editor.
- W3C, *SVG 2 Specification*, §5 Document Structure — groups, use, paint order and the document tree.
- Avnac Studio, *Vector board engine (v3)*, `docs/vector-board-engine.md` — the layer/stroke model
  this rule's graph resolves to.
