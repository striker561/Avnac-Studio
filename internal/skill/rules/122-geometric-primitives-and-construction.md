# Rule: Geometric Primitives and Construction

**Domain:** vector · **ID:** `122-geometric-primitives-and-construction`

## Purpose
Build a drawing from measured primitives — circles, rectangles, polygons, capsules — before
introducing free curves. Primitives give exact tangents, repeatable radii and a construction
history that explains every point, so the result looks intentional at every size.

## Definition
A geometric primitive is a shape defined by a small parameter set: centre and radius; corner and
size; centre, radius and sides; two foci. "Construction" is the visible scaffolding — circles,
grid lines, intersections — used to derive the final path, then discarded.

## Core Principles
- **Construction before curves.** A logo built from circles and tangents is defensible; one built
  by nudging handles is a guess with no parameters to adjust later.
- **A circle is four cubics, not many points.** Use the standard handle length
  `k = 0.5522847498 × r` (the article's 55–56%). Longer handles bulge, shorter ones flatten.
- **Tangency is a contract.** Where a straight edge meets an arc, the tangent must match: the
  radius centre sits on the perpendicular at the join. A visible kink is a construction error.
- **One radius family.** Corner radii come from a small set (for example 4, 8, 16 units) rather
  than arbitrary values. The eye reads inconsistent radii as sloppiness.
- **Polygons are regular unless stated.** Regular means equal sides and equal angles: N sides at
  `360/N` starting from a chosen apex. Stars are two polygons or one polygon with alternating
  outer/inner radii.
- **Minimum feature size.** At final size no painted feature below about 0.5 px on screen survives;
  below 0.25 pt it drops out in print. Enlarge the feature or delete it.
- **Optical overshoot.** Round forms need to exceed the flat reference by roughly 1–1.5% to look
  the same size; geometries that are mathematically equal look unequal. In letterforms the accepted
  figure is closer to 2% of cap height, and the correction is mirrored below the flat reference.
- **The optical centre is not the midpoint.** A measured letter `O` splits about 49.9 / 50.1 rather
  than 50 / 50, and flat-bottomed forms carry the visible centre visibly off the midline. Centre a
  round form by eye at 400%, then record the offset as a number.
- **Counters are drawn, not inherited.** A counter that is a scaled copy of its outline reads as a
  pointed diamond. Widen it at top and bottom — "more shoulder" — so the contained space looks
  round, and give a horizontal oval a slightly wider counter at its base.
- **Joins are not neutral, and the two corrections are opposite.** A stroke turning an elbow reads
  thin and needs 3–8% more weight; two strokes overlapping at an acute vertex darken into a blob and
  need the stroke narrowed locally. Fix the joint, never the whole form.

## Techniques
1. **The three-circle logo grid.** Draw the outer circle, an inner circle at the counter radius,
   and a third circle at the stroke joint; derive the connecting edges as tangents. Every point is
   then an intersection, not a nudge.
2. **Ratio table.** Record the construction's ratios (body height : window diameter : fin offset).
   A ratio survives scaling; pixel values do not.
3. **Primitive-to-path conversion.** Ellipse to four cubics with `k = 0.5523 × r`; rectangle with
   radius `r` to four lines plus four quarter-arcs; capsule to two half-circles plus two lines.
   Convert only at export, so the primitive's parameters stay editable.
4. **Star tuning.** Inner radius between 0.38 and 0.50 of the outer for a classic five-point star;
   below 0.36 the points read as spikes, above 0.55 the star reads as a flower.
5. **Construction line weight.** Draw guides in one colour at 40% opacity and label them; on
   delivery, hide them. Guides that ship in the file are read as artwork.
6. **Corner family check.** Lay out every radius used; if there are more than four distinct values,
   snap them to the nearest of the four.
7. **Junction audit.** At 400% list every place two strokes meet and classify each one: elbow joins
   get weight, acute vertices get a local narrowing, crossings get an offset so the thin stroke reads
   continuous. A vertex that looks right at 100% and wrong at 400% is an uncorrected join.
8. **Counter audit.** Compare each enclosed space to the shape around it. If the counter is a
   scaled copy of the outline, rebuild it as its own path with a wider top and bottom.

## When to Use
- Icons, marks, badges and geometric illustration.
- Any drawing that must be redrawn at another size or with another proportion.
- Patterns and modular systems: one primitive, transformed many times.

## When to Avoid
- Organic subjects — faces, foliage, hand-lettering — where a constructed skeleton reads as stiff.
  Use the primitives for proportions, then spend anchors on the gesture.
- Text: never fake a letterform from primitives; set real type.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Circle from 8+ hand-placed nodes | Wobbles at large sizes and doubles the node count | Four cubics at k = 0.5523 |
| Radius chosen per corner by eye | Edges look unrelated | Snap to a radius family |
| Arc meets line at an angle | Visible kink, worse when scaled | Centre on the perpendicular |
| Star with inner radius 0.2 | Points look like blades and thin out | 0.38–0.50 |
| Features under 0.5 px at final size | Disappear or turn grey | Enlarge or drop |
| Counter built by scaling the outline | The enclosed space reads as a pointed diamond | Draw the counter as its own shape |
| Joints left at full weight | Elbows look thin, acute vertices blob | Correct per junction type (technique 7) |

## Practical Examples
A 512 × 512 leaf mark: two 230-radius circles offset by 300 px, and one 300-radius circle tangent to
both. The lens between the first two circles is the leaf body; the third circle trims the tip. The
final path has 6 anchors: two cusp points at the lens ends and two smooth joins at the tip, all
produced by circle intersections. Stem is a 6-unit capsule at 12° with a 3-unit taper. Nothing in
the file was placed by dragging a handle.

## Related Rules
- [`120-vector-scene-graphs`](120-vector-scene-graphs.md) — where each primitive lives in the tree.
- [`123-spatial-constraints-and-relationships`](123-spatial-constraints-and-relationships.md) — deriving placement from relationships instead of numbers.
- [`125-bezier-curves-and-path-construction`](125-bezier-curves-and-path-construction.md) — what to do once a primitive must become a curve.
- [`53-logo-construction`](53-logo-construction.md) — the logo-specific use of construction geometry.
- [`61-shapes-and-forms`](61-shapes-and-forms.md) — the visual vocabulary primitives belong to.

## Sources
- Glyphs, *Drawing good paths* (<https://glyphsapp.com/learn/drawing-good-paths>) — handles at 55–56%
  of an ellipse, and the cost of unnecessary points.
- W3C, *SVG 2 Specification* — `circle`, `rect`, `ellipse`, `polygon` and the arc command.
- Bringhurst, *The Elements of Typographic Style* — optical overshoot in round versus flat forms.
- Cheng, *Designing Type*, pp. 67–68 — overshoot as a percentage of cap height, optical versus
  mathematical centring (49.9 / 50.1), and counters widened to avoid a pointed diamond; p. 109 —
  the crossing illusion; pp. 145–147 — strokes narrowed at a join.
