# Rule: Vector Coordinate Systems

**Domain:** vector · **ID:** `121-vector-coordinate-systems`

## Purpose
Make geometry predictable across boards, viewports, groups and exported files, so a coordinate means
the same thing at authoring time, at hit-test time and at export time. Nearly every "the SVG looks
wrong" bug is a coordinate-frame bug.

## Definition
A coordinate system maps numbers to positions. This library uses four frames:

| Frame | Origin | Unit | Used for |
|---|---|---|---|
| Board (document) | top-left of the board | user unit = 1 drawing unit | everything stored |
| Viewport | top-left of the window | CSS pixel | pan, zoom, hit radii |
| Local (node) | the node's anchor | user unit | geometry inside a shape |
| Export | viewBox origin | user unit | SVG output |

A transform composes frames: `world = parent × translate × rotate × scale × local`.

## Core Principles
- **Store only board units.** Convert pointer, zoom or screen pixels at the boundary and discard
  them. Storing a scaled coordinate is how a drawing drifts when the window resizes.
- **Board size and viewBox are the same rectangle.** A 1200 × 900 board exports
  `viewBox="0 0 1200 900"` with `width="1200" height="900"`. Any other pair invites stroke-width
  and font-size surprises.
- **Y grows down, angles grow clockwise.** That is the Avnac and SVG convention; convert once when
  importing data from a y-up source instead of flipping per point.
- **Transform order is fixed:** translate, then rotate, then scale, around the declared anchor.
  Two implementations that disagree about order disagree about every rotated object.
- **Round where it is read, not where it is stored.** Keep full precision internally, round to two
  decimals in SVG. Rounding during intermediate maths accumulates visible drift.
- **Screen-space interactions stay in screen space.** Hit radius, handle size and snap distance are
  declared in screen pixels and divided by the view scale before comparing with geometry.
- **Every drawing declares its frame.** Canvas size, viewBox and (if reused) a symbol's own
  viewBox. A symbol without a frame is only correct at one size.

## Techniques
1. **Frame check.** After placing, assert every painted bound sits inside the board, with a margin
   of at least 2% of the short edge; anything outside is debris (the vector-editor equivalent of
   a stray path wrecking sidebearings).
2. **Nine-point anchors.** Place objects by their anchor (top-left, centre, cap-middle) and store
   which anchor was used. "Centre" without an anchor is ambiguous for text.
3. **Transform stack table.** For every rotated group, write the resolved matrix once:
   `translate(cx,cy) rotate(a) scale(sx,sy) translate(-cx,-cy)`. Debugging is comparing expected
   with actual, not re-deriving by eye.
4. **Normalised symbols.** Reusable parts (an icon inside a logo, a petal in a pattern) are
   authored in a 0..1 or unit-square frame and scaled at placement, so one definition works at
   every size.
5. **Zoom-invariant strokes.** When a stroke must keep its printed weight while the art is scaled,
   either scale the width with the geometry or export `vector-effect="non-scaling-stroke"`. Decide
   which, write it down, and use it consistently in the file.
6. **Unit audit before handoff.** Search the document for `px`, `pt`, `%` and `em` in geometry
   attributes. Path data must be unitless; width/height may carry units but the viewBox must not.

## When to Use
- Every multi-size deliverable: favicon to billboard, icon set, logo lockup, diagram on a page.
- Any drawing placed into a scene that can be moved, rotated or scaled afterwards.
- Any import from another tool, where the source frame almost never matches the target.

## When to Avoid
- A one-off export at a single fixed size with no editing and no reuse; the frame still matters,
  but there is no cross-frame contract to maintain.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Art drawn at 1200 px in a `0 0 100 100` viewBox | Strokes look 12× too thick, fonts wrong | viewBox equals board |
| Storing pointer coordinates | Drawing drifts with zoom and window size | Convert to board units |
| Rotating about the wrong origin | Object orbits instead of turning | Rotate about the declared anchor |
| Mixing y-up font data with y-down SVG | Everything is vertically mirrored | Flip the frame once |
| Rounding every intermediate step | Gaps at seams and drifting closure | Round at serialisation only |

## Practical Examples
A 1200 × 900 board with a 64 px icon placed at `(980, 60)` and scaled to 1.5×:

```yaml
canvas: { width: 1200, height: 900 }
object:
  id: badge/check
  type: symbol
  source: icons/check      # authored in a 24 × 24 frame
  at: [980, 60]            # board units, top-left anchor
  scale: 1.5               # 36 × 36 drawn size
  strokeWidth: 2           # 2 user units, so 3 at 1.5× unless non-scaling
```

Exported root: `<svg xmlns="…" width="1200" height="900" viewBox="0 0 1200 900">`. The symbol keeps
its own `viewBox="0 0 24 24"`, so the same definition drops into a 16 px favicon without edits.

## Related Rules
- [`120-vector-scene-graphs`](120-vector-scene-graphs.md) — the tree these frames resolve through.
- [`124-symmetry-and-transformations`](124-symmetry-and-transformations.md) — composing mirrors and rotations correctly.
- [`127-svg-generation-and-validation`](127-svg-generation-and-validation.md) — what the exported frame must contain.
- [`36-scale-and-proportion`](36-scale-and-proportion.md) — how size changes read optically.
- [`39-responsive-composition`](39-responsive-composition.md) — the screen-side version of one artwork, many sizes.

## Sources
- W3C, *SVG 2 Specification* — coordinate systems, `viewBox`, and the transform attribute.
- Glyphs, *Drawing good paths* (<https://glyphsapp.com/learn/drawing-good-paths>) — "Vectors out of
  bounds": stray geometry destroys the numbers an editor derives from the drawing.
- Avnac Studio, *Vector board engine (v3)* — document space, viewport as an affine layer, screen-px
  interaction radii.
