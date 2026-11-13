# Rule: Symmetry and Transformations

**Domain:** vector · **ID:** `124-symmetry-and-transformations`

## Purpose
Draw half the work and get the other half for free. Mirroring, rotation and repetition produce
symmetry that is *exact* — mathematically equal, not eyeballed — and keep the drawing editable as a
single idea instead of two approximations.

## Definition
A transformation maps geometry from one frame to another: translation, rotation, scale, reflection.
Symmetry is a transformation that maps a figure onto itself. In a vector scene graph, a transform can
be applied as a live node (an instance) or baked into copies of the geometry.

## Core Principles
- **Draw one half, derive the other.** The mirrored half must be generated, never redrawn. Two
  hand-drawn halves are never symmetric, and the error grows with size.
- **Reflection reverses winding.** Mirroring swaps handedness, so a closed path that was
  counter-clockwise becomes clockwise. Reverse the point order of the reflected copy or the fill rule
  will fight you (a hole paints solid, or the shape disappears under a non-zero fill).
- **Rotation has an origin.** "Rotate 30°" means nothing without the centre. For radial systems the
  origin is the system centre and the operation is `rotate(angle, centre)`, applied around that
  point, not the node's own origin.
- **Transform order is part of the design.** translate → rotate → scale is the house order. Inverting
  it changes the result for every non-uniform scale.
- **Copies versus instances.** An instance follows its definition (edit once, update everywhere). A
  baked copy is independent. Use instances while exploring, bake only to freeze a variant.
- **Symmetry can be approximate on purpose.** Optical correction deliberately breaks symmetry: a
  pointed apex needs a hair more space than its mirror to look centred. Record those exceptions.
- **Even counts read as formal; odd counts read as dynamic.** Three-fold radial symmetry has an
  axis of tension; four-fold is stable. Choose the count for the meaning, not for convenience.

## Techniques
1. **Canonical mirror.** Reflect every point and control handle across the axis
   (`x' = 2a − x` for a vertical axis at `x = a`), then reverse the subpath order. Handles mirror
   with their points — never re-derive them.
2. **Radial repeat.** For N copies, rotate by `360/N` around the declared centre, starting at the
   top (`−90°`) unless the design specifies otherwise. Overlap the first and last copy by 0.5–1 unit
   if you need to avoid hairline seams.
3. **Pair audit.** Count distinct halves: a symmetric drawing has half the leaf count of the naive
   build. If both halves exist as separate nodes, the mirror was skipped.
4. **Symmetry axis check.** Render the drawing with the axis visible at 400%. Any point that crosses
   the axis is either a deliberate asymmetry or a mistake — decide which.
5. **Scale with care.** Uniform scale preserves shape; non-uniform scale changes stroke weight
   optically (a 2-unit stroke becomes 2 and 4). Restroke after non-uniform scaling instead of
   scaling the stroke.
6. **Bake with a receipt.** When freezing an instance, note what it came from so a later edit can
   recreate rather than hunt for the copy.

## When to Use
- Faces, characters, insects, vehicles, architectural elevation, badges, ornaments, mandalas.
- Icon families built on a shared grid: one cell mirrored or repeated.
- Any drawing where both sides must read as identical at 4000 px.

## When to Avoid
- Deliberately hand-made, asymmetric, lively drawings: perfect mirroring makes a figure look dead.
- Text and lettering: mirroring produces mirrored glyphs, not letters. Transform the *layout*, never
  the letterforms.
- Objects with functional asymmetry (a camera's grip, a hand, a tool) where the mirror is wrong
  physically, not just visually.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Two hand-drawn halves | Asymmetry grows with size | Mirror one half |
| Mirroring without reversing winding | Holes vanish or fill solid | Reverse point order |
| Scaling non-uniformly with strokes | One side of the stroke doubles | Restroke after scaling |
| Rotating around each object's own centre | Copies drift off the circle | Rotate around the system centre |
| Mirroring text | Unreadable reversed glyphs | Mirror the layout, set real type |

## Practical Examples
A 256 × 256 butterfly: the left wing is one closed path of 11 anchors, the body is a 12 × 120
capsule, the antennae are two 2-unit strokes. The right wing is `mirror_of(left-wing,
axis = canvas-centre)` with its point order reversed; the right antenna is the mirror of the left.
Total leaf nodes: 5 instead of 9. Editing the left wing's scallops updates the right side exactly —
including the handle angles, which is what makes the wing silhouette read as one creature.

## Related Rules
- [`120-vector-scene-graphs`](120-vector-scene-graphs.md) — instancing repeated parts.
- [`121-vector-coordinate-systems`](121-vector-coordinate-systems.md) — the frames transforms compose through.
- [`125-bezier-curves-and-path-construction`](125-bezier-curves-and-path-construction.md) — handle geometry that must survive a mirror.
- [`05-rhythm-and-repetition`](05-rhythm-and-repetition.md) — repetition as composition, not just construction.
- [`61-shapes-and-forms`](61-shapes-and-forms.md) — when a form reads as symmetric.

## Sources
- Glyphs, *Drawing good paths* (<https://glyphsapp.com/learn/drawing-good-paths>) — path direction and
  order decide whether mirrored contours and counters render correctly.
- W3C, *SVG 2 Specification* — the `transform` attribute, matrix composition, and `<use>` instances.
- Avnac Studio, *Vector board engine (v3)* — node constraints and scale helpers for transformed strokes.
