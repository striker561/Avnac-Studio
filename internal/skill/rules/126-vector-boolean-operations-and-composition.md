# Rule: Boolean Operations and Composition

**Domain:** vector · **ID:** `126-vector-boolean-operations-and-composition`

## Purpose
Combine shapes into one clean outline — union, subtract, intersect, exclude — without the seams,
double edges and fill errors that come from stacking overlapping paths. Booleans are the difference
between artwork that survives a vinyl cutter and artwork that only looks right on screen.

## Definition
A boolean operation computes a new region from two or more filled regions: union (A ∪ B), subtraction
(A − B), intersection (A ∩ B), exclusion (A ⊕ B). The result is a path whose fill rule and winding
must describe which areas are solid and which are holes. "Compound path" is the storage form: one
fill containing several subpaths, with even-odd or non-zero deciding how overlaps paint.

## Core Principles
- **Plan the expression before drawing.** Write `body − (arm ∪ leg)` while the parts are still
  separate copies. Order matters: subtracting A from B is not subtracting B from A.
- **Duplicate before you destroy.** Booleans are destructive; keep the originals on a hidden
  construction layer until the composition is accepted.
- **Winding is geometry, not paperwork.** Outer contours and holes need opposite directions. In font
  coordinates the convention is outer counter-clockwise, counter (hole) clockwise; the reverse of
  either paints the hole solid or the shape empty under a non-zero fill.
- **Pick the fill rule deliberately.** Non-zero is the default and rewards consistent winding;
  even-odd ignores direction and treats every other crossing as a hole. Even-odd is safer for
  compound icon shapes built from overlapping copies, non-zero for cleanly wound outlines.
- **Overlaps are an editing convenience, not a delivery format.** Keep live overlaps while the shape
  is in flux (they make editing and interpolation easier), then remove them on export.
- **Check the node count after every boolean.** A clean subtract adds 0–2 anchors per intersection; a
  result with dozens of anchors means the inputs were sloppy or the operation hit a tangent.
- **Tiny leftover paths are a defect.** An overlap inside an overlap can leave a sliver that shows as
  a white hairline. Hunt for paths below a few units in area and delete them.
- **Compound order is stacking.** Subpaths paint in order within the fill; the outermost region
  should be the first subpath so holes read as holes in every renderer.

## Techniques
1. **Silhouette first, then cut.** Build one closed outer silhouette, then subtract the interior
   holes and separations. Fewer nodes and no trapped seams between adjacent filled shapes.
2. **Same-colour union.** Two overlapping shapes of identical paint can simply be grouped; run a
   real union only when you need one outline (cutting, embroidery, single-path export).
3. **Hole by reversal.** To make a hole, draw the inner contour and reverse its direction, or use
   even-odd with a nested subpath. Verify by rendering on a contrasting background.
4. **Open-corner and reconnect.** Where two shapes must overlap for later editing, open a corner and
   reconnect nodes to control exactly where the overlap starts and ends.
5. **Double-overlap search.** After export, scan for paths under ~2 units in any dimension. They are
   almost always the sliver left where a curve met a line and bent slightly the wrong way.
6. **Boolean budget.** Count booleans per shape. More than four means the form should be redrawn from
   primitives rather than carved from copies.
7. **Post-boolean node audit.** Compare anchor count before and after. Record where the new anchors
   landed; if they sit on a smooth run, re-check tangency there.

## When to Use
- Icons and marks with counters, cutouts, or a single-colour silhouette requirement.
- Anything that will be cut, printed in one spot colour, engraved, or exported as one path.
- Building complex forms from measured primitives (circle minus circle, union of capsules).

## When to Avoid
- Multi-colour illustration where overlapping shapes are intentional and never need to merge;
  booleans would destroy the layering.
- Forms already expressible as one path — booleans add nodes for nothing.
- Text: convert to outlines only at final delivery, and never boolean editable type.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Subtracting with the wrong operand order | The wrong region disappears | Write the expression first |
| Boolean on open paths | Undefined region; editor guesses | Close both inputs |
| Inconsistent winding | Holes paint solid | Reverse inner contours |
| Forgetting the fill rule | Same path renders differently in two viewers | Set even-odd or non-zero explicitly |
| Booleans on a copy of a copy | Node count explodes | Rebuild from primitives |
| Shipping live overlaps | Print and cut show seams | Remove overlap on export |

## Practical Examples
A letter O for a 512 px logo: outer ellipse 300 × 380, inner ellipse 192 × 272, both centred.
Subtract the inner from the outer, then reverse the inner contour if the editor did not; the result
is one compound path with two subpaths, 8 anchors total, non-zero fill. A 6-unit highlight is then
unioned into the lower-right of the ring, adding 4 anchors at the tangencies. Before export the
overlap scan finds no path under 2 units, and the exported SVG declares `fill-rule="nonzero"` once:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"
     role="img">
  <title>Letter O</title>
  <path fill="#1B1B1B" fill-rule="nonzero"
        d="M256 66C338.84 66 406 151.07 406 256C406 360.93 338.84 446 256 446C173.16 446 106 360.93 106 256C106 151.07 173.16 66 256 66Z
           M256 120C202.98 120 160 180.89 160 256C160 331.11 202.98 392 256 392C309.02 392 352 331.11 352 256C352 180.89 309.02 120 256 120Z"/>
</svg>
```

The outer contour runs clockwise and the inner counter-clockwise. Reverse the inner one and the hole
fills solid under `nonzero` — which is the failure the fill rule is there to prevent.

## Verification
1. **Expression first.** Write the boolean as an expression (`outer − inner`, then `+ highlight`)
   before operating. The operand order is the design decision; a wrong order is silent.
2. **Winding and fill rule.** Every compound path declares `fill-rule`. Reverse the inner contour of
   a ring: the hole must fill solid, proving the rule is doing the work.
3. **Node delta.** Count anchors before and after the boolean. A union that adds more than about 20%
   means the inputs were the wrong shapes; rebuild from primitives instead.
4. **Overlap scan.** Before export, no two painted paths overlap. Overlap that looks fine on screen
   shows as a seam in print and a double cut at the cutter.
5. **Double-overlap render.** At 4000 px, stacked translucent shapes show no white gap at the seam.

## Related Rules
- [`122-geometric-primitives-and-construction`](122-geometric-primitives-and-construction.md) — the inputs a boolean should be built from.
- [`125-bezier-curves-and-path-construction`](125-bezier-curves-and-path-construction.md) — the geometry booleans cut and the tangency they must preserve.
- [`120-vector-scene-graphs`](120-vector-scene-graphs.md) — when to keep parts separate instead of merging them.
- [`08-negative-space`](08-negative-space.md) — the compositional role of the holes a boolean creates.
- [`127-svg-generation-and-validation`](127-svg-generation-and-validation.md) — how the compound path must be serialised and checked.

## Sources
- Glyphs, *Drawing good paths* (<https://glyphsapp.com/learn/drawing-good-paths>) — path direction,
  overlap removal on export, and the double-overlap white-gap defect.
- W3C, *SVG 2 Specification* — `fill-rule` (nonzero, evenodd) and compound path rendering.
- Avnac Studio, *Vector board engine (v3)* — fill rule on strokes and SVG `fill-rule` on export.
