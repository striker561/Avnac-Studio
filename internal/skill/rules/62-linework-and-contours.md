# Rule: Linework and Contours

**Domain:** illustration · **ID:** `62-linework-and-contours`

## Purpose
Use line to describe form and to sign the work: the weight, the variation along a stroke, the joins, and where
each contour is allowed to stop. Line is a system with settings, not a single stroke width.

## Definition
Linework is every stroke in a drawing together: base weight, variation between and along strokes, taper, join and
cap treatment, and rules for where a contour ends.

## Core Principles
- Weight is relative to the ground. Hofmann: a line thickened too far in proportion to its length stops reading as
  a line and becomes a plane; a black line thins toward gray, while a white line on black gains luminosity as it
  thins. Choose weight against the background, never in the abstract.
- Two weights do most of the work: silhouette and interior at 2:1 — 4 px and 2 px on a 1000 px artboard. Three
  maximum; a fourth reads as noise, not hierarchy.
- Taper encodes pressure and speed. Uniform strokes read mechanical and suit icons and diagrams; tapered strokes
  read hand-made and suit editorial and character work. Pick one mode per set.
- Continuity is meaning: a break in a contour reads as light, an edge change, or an error. Close contours on
  closed forms and open them only where the form turns into the light.
- Outer contour carries silhouette, inner contour carries structure. Approve the silhouette first; every interior
  line is detail on a shape that must already work.
- Line style is the signature: base weight, taper, joins, and ink temperature (`#000000` vs `#141414`) read first.

## Techniques
1. **Weight ramp from one base** — 8 px emphasis, 4 px silhouette, 2 px interior, 1 px texture, all derived from
   one base. Whole pixels only, so nothing blurs.
2. **Taper ratio** — a brushed line ends at 25–40% of its maximum width over its last 15% of length. More taper
   reads as a pen flick, less as a worm.
3. **Contour reduction** — redraw the same object three times, removing one contour each time, until the form
   breaks. The last readable version is the drawing.
4. **Gray-out test at final size** — export at 96 px wide and check that interior lines still exist. If they
   average to gray, drop them rather than thickening everything.

## When to Use
- Line-based identity systems, icons, editorial work, technical cutaways, and any job that reproduces in one ink.
- When form must be described without value or color: single-color print, engraving-style work, diagrams.

## When to Avoid
- Photoreal or painterly rendering, where contours do not exist and drawn outlines flatten the image.
- Dense pattern work, where a contour fights the pattern; separate those layers with value instead.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| All lines at one weight | No depth and no hierarchy; every form flattens | Two-weight system at 2:1 |
| Tapering the wrong end | Reads as a rendering error | Taper away from the light or contact point |
| Open contours on closed forms | Gaps read as unfinished edges | Close the silhouette |
| Sub-pixel strokes at print | Drop out or print as broken gray | 0.25 pt minimum at final size |

## Practical Examples
A 1000×1400 portrait in Avnac: silhouette at 4 px `#12100E`, interior folds at 2 px in the same fill, and two
1 px hatch groups at 30° and 150° confined to the shadow region. The shoulder contour is unbroken; the chest
contour breaks for 80 px where the light hits, so the gap reads as light, not a mistake. At 96 px the 1 px hatch
disappears, which is fine: the silhouette still carries the form.

## Related Rules
- [`61-shapes-and-forms`](61-shapes-and-forms.md) — the forms these contours describe.
- [`63-light-and-shadow`](63-light-and-shadow.md) — where a contour is allowed to break.
- [`66-vector-illustration`](66-vector-illustration.md) — producing tapered strokes as editable paths.
- [`68-iconography`](68-iconography.md) — stroke weight on a grid at small sizes.
- [`60-illustration-fundamentals`](60-illustration-fundamentals.md) — the set-level style sheet.

## Sources
- Hofmann, *Graphic Design Manual*, p. 13 — a line thickened in proportion to its length is read as a plane; the
  black line turns gray as it thins while the white line gains luminosity.
- Hofmann, *Graphic Design Manual*, p. 29 — the same figure drawn with progressively thicker lines, making weight
  a variable of the exercise rather than a detail.
