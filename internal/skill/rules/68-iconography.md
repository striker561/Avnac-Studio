# Rule: Iconography

**Domain:** illustration · **ID:** `68-iconography`

## Purpose
Make small pictures that say one thing at 16 px and look like siblings of each other. An icon is read in
a glance at fingernail size, so every decision here is subtraction and shared geometry rather than
drawing quality.

## Definition
An icon is a reduced pictorial sign on a fixed optical grid, where a keyline, one stroke weight, and a
few allowed shapes carry the reading. Legibility comes from silhouette and contrast, not from detail.

## Core Principles
- Work on a 24×24 px grid with a 2 px keyline and a 20×20 live area. Build from four key shapes: 18×18
  square, 20 px circle, 16×20 portrait rect, 20 px diagonal at 45°.
- Fix one stroke: 2 px at 24 (8.3% of the grid), 1.75 px at 20, 1.5 px at 16. Mixed weights read as a set
  of borrowed parts.
- Choose one cap-and-join language and keep it — rounded for friendly products, butt and mitre for
  technical ones. Mixing them looks assembled, not designed.
- Correct optically, not geometrically: circles overshoot the keyline by 0.5 px, triangles sit 1 px lower
  than their geometric center, and round and square shapes share one optical baseline.

## Techniques
1. **Key-shape construction** — place the grid and the key shape, then cut: a "file" is a 16×20 rect with
   a 4 px corner fold, a "search" a 14 px circle plus a 6 px handle at 45°.
2. **Stroke lock** — center odd-width strokes on half-pixels (x.5) so 1 px lands on a whole pixel at 1×
   and stays crisp at 2×; snap terminals to the keyline.
3. **Silhouette test** — fill the icon solid black and view it at 8 px and 24 px. Unrecognizable at 8 px
   means too many parts, not too small a canvas.
4. **Set audit** — lay 12 icons in a 6×2 grid at 24 px and check stroke weight, interior radius, optical
   centering, and the shared eye line. Any icon that needs a caption is not an icon.
5. **Pixel fitting** — redraw terminal positions at 16 and 20 px instead of scaling down; a 24→16 scale
   turns a 2 px stroke into 1.33 px.

## When to Use
- Any set of three or more icons in a UI, navigation, feature grid, or signage system.
- Diagrams on posters and packaging where a picture must land faster than a caption.
- Wayfinding, where recognition happens at 5–10 m in poor light.

## When to Avoid
- A single brand mark or hero illustration, where personality beats recognition — see
  [`66-vector-illustration`](66-vector-illustration.md) and [`65-character-and-object-design`](65-character-and-object-design.md).
- Concepts that need a sentence; that sentence is a caption, not an icon.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Icons pulled from three libraries | Stroke, radius, and weight disagree visibly | Redraw on one grid, discard the outliers |
| 1 px hairlines at 24 px | Vanish at 1×, alias at fractional scale | 2 px at 24, 1.5 px at 16 |
| Centering by bounding box | Circles look small, triangles look low | Overshoot circles 0.5 px, drop triangles 1 px |
| Scaling 24 px art to 16 px | Stroke becomes 1.33 px, whole set greys out | Redraw key positions at target size |

## Practical Examples
Six editor tools at 24×24 px — move, text, rectangle, ellipse, pen, image — all with 2 px rounded
strokes, 2 px interior radii, and a 20 px live area. Export at 24, 48, and 72 px; the 72 px file is
redrawn at 3 px stroke, not scaled, so it matches a `#F5F5F5` toolbar at 1.5× density. The ellipse
carries its 0.5 px overshoot, so round, square, and portrait shapes read at one optical size.

## Related Rules
- [`66-vector-illustration`](66-vector-illustration.md) — the path and boolean technique the set is built with.
- [`62-linework-and-contours`](62-linework-and-contours.md) — stroke weight as a drawing language.
- [`61-shapes-and-forms`](61-shapes-and-forms.md) — the shape vocabulary a set is assembled from.
- [`53-logo-construction`](53-logo-construction.md) — optical correction at larger scale.
- [`93-interface-layout-and-spacing`](93-interface-layout-and-spacing.md) — the 4/8 px grid icons sit in.

## Sources
- Frutiger, *Signs and Symbols: Their Design and Meaning* — reducing a form until a sign reads at distance.
- WCAG 2.2 SC 1.4.11 — 3:1 non-text contrast between an icon and its adjacent color.
- Lidwell et al., *Universal Principles of Design* — closure: incomplete shapes still read whole.
