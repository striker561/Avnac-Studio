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
A 256 × 256 rocket icon as a scene graph:

```yaml
canvas: { width: 256, height: 256, background: "#F4F0E8" }
layers: [ground, subject, detail]
objects:
  - id: ground/shadow,  type: ellipse, parent: null,      layer: ground,  z: 0
    center: [128, 224], size: [120, 16], fill: "#00000018"
  - id: subject/body,   type: capsule, parent: null,      layer: subject, z: 1
    center: [128, 118], size: [52, 116], fill: "#E85D3F"
  - id: subject/fin-left,  type: polygon, parent: subject/body, layer: subject, z: 2
    points: [[-26, 30], [-48, 62], [-24, 50]], fill: "#D94A36"
  - id: subject/fin-right, type: mirror,  of: subject/fin-left, axis: vertical
  - id: detail/window,  type: circle, parent: subject/body, layer: detail, z: 3
    center: [0, -18], radius: 13, fill: "#9FD3E8"
```

Leaf count 4 (plus the mirrored fin), groups 0, depth 2 — small enough to edit in one pass, and
every part is addressable by name.

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
