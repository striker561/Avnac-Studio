# Rule: Bézier Curves and Path Construction

**Domain:** vector · **ID:** `125-bezier-curves-and-path-construction`

## Purpose
Construct cubic paths that render cleanly at any size, interpolate predictably, and can be edited
without the curve wobbling. Quality is measured in the number, placement and balance of anchors and
handles — not in how the shape looks at 100%.

## Definition
A cubic segment runs between two on-curve anchors and is shaped by two off-curve control points, the
handles (Bézier control points, BCPs). Every segment has exactly two handles. A path is a chain of
segments; a closed path joins its last anchor back to the first.

## Core Principles
- **Handles belong to the segment, not the node.** Each side of an anchor owns one handle, and the
  pair belongs to the segment between two anchors. A "missing" handle is a *zero handle* hidden at
  the anchor — the half-dead curve that produces lumps.
- **The magic triangle.** For each segment, take its two anchors and the point where the handles'
  elongations intersect. The curve must stay inside that triangle, and neither handle may cross the
  other handle or the other handle's elongation. Violations produce extra inflections, cusps and
  self-intersections that rasterizers handle badly.
- **Node type is a promise.**
  - *Corner*: no handles; the path turns sharply.
  - *Cusp*: two independent handles; the tangent breaks.
  - *Smooth*: handles collinear with the anchor.
  - *Symmetric*: collinear and equal length.
  Set the type deliberately; a smooth node with non-collinear handles is a bug the eye reads as a
  kink.
- **Handle length has a right range.** A circle's handles are about **55.6%** of the radius
  (`k = 0.5522847498`). Type and icon work normally sits between **60% and 70%** of the triangle;
  outside roughly 55–75% the arc either flattens or bulges. 100% means both handles meet at the
  intersection point; 0% is retracted.
- **Avoid inflections unless intended.** A segment that switches bend direction needs the extra
  control it costs. If both handles are orthogonal there is usually no need; an S-curve gets one
  inflection, placed at the crossing, not two.
- **Put nodes at the extremes.** Horizontal and vertical tangents belong on anchors. Once they are
  there you can often delete the intermediate points entirely: fewer anchors, smaller files, better
  hinting and scaling.
- **Curvature should match at a joint.** Two consecutive segments join invisibly when their
  curvature (second geometric derivative, "G2") matches. Inside and outside curves of the same shape
  must be harmonised too: the inside needs the *higher* curvature, or the form looks like a flat
  tire — too thick at 45°, too thin at the extremes.
- **Balanced handles reduce interpolation error.** Equal relative handle lengths ("Tunnification")
  keep the middle of an interpolated curve from hanging through too flat. Unequal distributions are
  a deliberate choice, not an accident.
- **Close what should fill.** An open path that is filled closes implicitly with a straight line —
  the most common artifact in hand-built icons.
- **Minimum anchors.** Circle 4, leaf 6–8, face profile 12–20, full character 30–60. An anchor you
  cannot justify is a bump you will pay to fix later.

## Techniques
1. **Magic-triangle audit.** For every curve segment, check that both handles stay inside the
   triangle and cross nothing. If a handle crosses the other's elongation, move the anchor, not the
   handle.
2. **Line to curve in one gesture.** Drop handles onto a straight segment at 55–65% of its length
   before shaping it; starting from a zero handle invites a lump at the anchor.
3. **Insert extremes, then simplify.** Add anchors at horizontal/vertical tangents, then delete the
   nodes that no longer affect the silhouette. Re-check curvature continuity after each delete.
4. **G2 join.** At a smooth joint, set both handles collinear and size them so curvature matches on
   both sides. In practice: shorter on the tighter arc, longer on the flatter one, inside tighter
   than outside.
5. **Balance handles.** For each segment compute both handles as the same fraction of the triangle;
   use `0.556` for circular arcs and `0.60–0.70` for designed curves. Keep the fractions equal
   across masters or repeated shapes.
6. **Refit after delete.** When removing an anchor, refit the surviving span with one cubic, preserve
   the endpoint tangents, and accept the result only if it deviates less than about 2 px at final
   size (or 8% of the chord).
7. **Nudge instead of scale.** To change a curve's size without changing its apparent stroke weight,
   move both ends proportionally (Ctrl-Opt in Glyphs terms: 1-unit steps, 10 with Shift) so
   thickness and curvature survive. Scaling the whole curve thins or thickens it.
8. **Open/closed check.** Before export, list open paths. A filled open path is a bug; a stroked open
   path is legitimate.

## When to Use
- Every vector drawing with curves: icons, logos, illustration, lettering, maps, diagrams.
- Any shape that will be scaled, interpolated between variants, or edited by someone else.
- Shapes derived from primitives once the primitive can no longer express the form.

## When to Avoid
- Straight-edged geometry (technical diagrams, pixel-art vectors): use lines and polygons; handles
  only add noise.
- Painterly texture: cubic paths cannot express brush texture; use a raster layer.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Handle outside the magic triangle | Inflection, cusp or self-intersection | Move the anchor or shorten the handle |
| Zero handle at an anchor ("half-dead curve") | Lump, then a kink at the join | Pull the handle out to 55–65% |
| One handle per segment | The other anchor's shape is wrong | Two handles, always |
| Smooth node with non-collinear handles | Visible kink | Make handles collinear or set cusp |
| Nodes not at extremes | Extra anchors and flat spots | Add extrema, then simplify |
| Uneven handle distribution between variants | Hang-through in interpolation | Balance the fractions |
| Filled open path | A straight closing chord cuts the shape | Close the path |
| Shallow segment only a few units deep | Cannot be expressed cleanly at integer precision | Redesign the join |

## Practical Examples
An S-curve across a 120-unit span, built with three anchors: `(40,160)` cusp, `(100,120)` smooth,
`(160,160)` cusp. Handles: the first out-handle at 62% toward `(70,132)`; the middle's two handles
collinear along the local tangent, 64% of each side; the last in-handle mirrored from the first. The
inflection sits exactly at the middle anchor. Curvature is continuous at both joins, and deleting the
middle anchor would need a refit that deviates more than 2 px, so it stays. The result is 3 anchors
instead of the 14 a freehand trace would produce.

## Related Rules
- [`122-geometric-primitives-and-construction`](122-geometric-primitives-and-construction.md) — where the curve comes from before it is shaped.
- [`124-symmetry-and-transformations`](124-symmetry-and-transformations.md) — handles must mirror with their anchors.
- [`126-vector-boolean-operations-and-composition`](126-vector-boolean-operations-and-composition.md) — what booleans do to this geometry.
- [`66-vector-illustration`](66-vector-illustration.md) — anchor budgets for illustration.
- [`62-linework-and-contours`](62-linework-and-contours.md) — weight and taper decisions that curves then express.

## Sources
- Glyphs, *Drawing good paths* (<https://glyphsapp.com/learn/drawing-good-paths>) — magic triangle,
  zero handles, inflections, extrema, G2 harmony, balanced handles (55–56% for a circle, 60–70% in
  type), hang-through, nudging, open versus closed.
- W3C, *SVG 2 Specification* — cubic Bézier commands and the rendering model.
- Schneider, "An Algorithm for Automatically Fitting Digitized Curves", *Graphics Gems* (1990) — the
  fitting method behind refit-after-delete.
