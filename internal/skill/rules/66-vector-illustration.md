# Rule: Vector Illustration

**Domain:** illustration · **ID:** `66-vector-illustration`

## Purpose
Build illustrations in Avnac as clean, editable paths that scale without artifacts, recolor in one pass, and export
small. Quality is measured in anchors and closures, not in how it looks at 100%.

## Definition
Vector illustration constructs an image from paths — anchors with handles — filled or stroked, and combined by
boolean operations. A path is only as good as its anchor count, its closure, and its consistency with its
neighbors.

## Core Principles
- Anchor economy. A circle needs 4 anchors, a leaf 6–8, a face profile 12–20, a full character silhouette 30–60.
  An anchor you cannot justify is a bump you will pay to fix later.
- Handles follow geometry: at a smooth anchor the two handles are collinear and about one third of the segment
  length; cusps get independent handles. Breaking this rule is what makes curves wobble.
- Stroke for constant weight, fill for variable weight. A stroke that should taper must become a fill; a uniform
  shape is easier as a stroke.
- Booleans are destructive. Duplicate before union, subtract, intersect, or exclude, then check the anchor count:
  a clean subtract adds 0–2, a bad one dozens.
- An open path with a fill closes implicitly with a straight line — the most common artifact in hand-built icons.
- Minimum stroke is 0.25 pt for print (~0.35 px at 300 ppi) and 0.5 px for screen; thinner drops out or prints
  gray.

## Techniques

**Avnac ops:** `vector` op=draw resolves the IR to cubic paths and places it; `vector` op=update refines by id; `vector` op=export returns the SVG; `get_canvas_image` is the scale check.

1. **Silhouette block, then subtract** — draw the whole outline as one closed path, then subtract the interior
   holes. Fewer nodes, and no overlapping seams to trap a fill.
2. **Anchor audit** — select all and count. If a shape has more than 1.5× the anchors its form requires, simplify
   now; later edits multiply the mess.
3. **Boolean plan as an expression** — write `body − (arm ∪ leg)` before drawing, so order is decided while the
   pieces are still separate copies.
4. **Stroke-to-fill for taper** — outline the stroke, then pull the two end anchors inward to 40% of the width to
   create the taper without adding nodes.
5. **Export checklist** — artboard equals `viewBox`, no `style=` attributes, one `fill` per path, three gradient
   stops maximum, under 100 KB per spot, and a render test at 24 px and 4000 px.

## When to Use
- Anything that must reproduce at multiple sizes: icons, logos, diagrams, from favicon to billboard.
- Work recolored for a brand, a theme, or dark mode: fills are cheap to swap.
- Line and flat-color styles, which is most editorial and product illustration.

## When to Avoid
- Painterly, textured, or photographic work: vector brushwork looks stiff and costs more nodes than it is worth.
- Tiny one-off marks under 16 px, where a bitmap or icon font is more reliable.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Hundreds of anchors on a simple curve | Curves wobble and files bloat | Rebuild with 4–8 anchors |
| Open paths with fill | Implicit closing lines slash across the shape | Close the path or remove the fill |
| Scaling 1 px strokes down | Disappear at print | Minimum 0.25 pt at final size |
| Nested groups from design software | Impossible to select or recolor cleanly | Flatten to one group depth |

## Practical Examples
A 512×512 spot illustration in Avnac: one `path` for the leaf silhouette, 7 anchors, closed, `#3C4A3E` fill and no
stroke; one `path` for the vein, 3 anchors, 2 px stroke `#12100E`; one `ellipse` r=24 for the highlight, `#F4EFE6`
at 60%. The stem is a 4 px stroked path converted to a fill, tapering 4 px to 1.5 px at the tip. At 512 px the file
is 3 KB; at 24 px the vein is dropped rather than thinned below 0.5 px.

## Verification
1. **Ops receipt.** `vector` op=read shows the objects and their constraints, `vector` op=export opens with a matching viewBox, and `get_canvas_image` is unchanged in character between 25% and 400%. A vector illustration that loses its proportions when scaled was not vector.
2. **Anchor audit.** `vector` op `read`: leaf 6–8 anchors, face 12–20, silhouette 30–60, circle 4.
   Above 1.5× the form's requirement, simplify before export; the extra anchors are bumps.
3. **Closure audit.** No open path carries a fill, and every closed path's first and last anchor
   coincide. An open filled path closes implicitly with a straight line, the usual icon artefact.
4. **Boolean delta.** Anchor count after a subtract or union rises by 0–2. Dozens more means the
   boolean crossed itself; duplicate and redo rather than patching the result.
5. **Render pair.** Rasterise at 24 px and 4000 px: at 24 px no feature is under 0.5 px, so the vein
   is dropped rather than thinned; at 4000 px handles show no facet and no stray geometry.
6. **Export read.** `vector` op `export` returns the file: one fill per path, three gradient stops
   maximum, no `style=` attributes, and under 100 KB per spot.

## Related Rules
- [`61-shapes-and-forms`](61-shapes-and-forms.md) — the vocabulary these paths are built from.
- [`62-linework-and-contours`](62-linework-and-contours.md) — weight and taper decisions before drawing.
- [`68-iconography`](68-iconography.md) — the small-size variant of this production discipline.
- [`119-generated-design-artifacts`](119-generated-design-artifacts.md) — cleaning up SVG produced by a model.
- [`115-export-and-file-formats`](115-export-and-file-formats.md) — choosing the output format.

## Sources
- Hofmann, *Graphic Design Manual*, p. 14 — pen and brush impose no limit on refinements of stroke thickness,
  which vector construction formalizes.
- W3C, *SVG 2 Specification* — path data, `viewBox`, and the rendering model for fills, strokes, and clipping.
