# Rule: Print Design Fundamentals

**Domain:** print · **ID:** `80-print-design-fundamentals`

## Purpose
Design the sheet, not a picture of a sheet. Print fixes size, substrate, and ink before the first decision, so a
layout that ignores the physical object gets corrected by the printer at your expense.

## Definition
Print design is composition for a fixed substrate on which ink is deposited by a press, then trimmed, folded, and
bound. The reader holds it at a known distance under known light, so size and viewing distance are design inputs.

## Core Principles
- Start from a standard sheet: A4 210×297 mm, A3 297×420, A2 420×594, A5 148×210; US Letter 215.9×279.4 mm.
  Pick the sheet before the artboard — it decides fold, page count, and cost.
- Work in millimeters and points, and treat pixels as a property of placement: an image is 300 PPI at final
  size, which describes the box it sits in, not the file. See
  [`83-resolution-and-raster-formats`](83-resolution-and-raster-formats.md).
- Imposition drives cost more than design does: A4 runs 16-up on a B1 sheet (707×1000 mm) before gutters, so
  real jobs land at 8-up or 4-up, and grain direction can cut that again.
- Ink is finite: total area coverage 240–300%, heavy solids on coated stock only. Large solids on uncoated stock
  scuff, mottle, and record every handling mark.
- Screen ruling sets minimum detail: 150–175 lpi on coated, 133 lpi on uncoated. Nothing thinner than 0.25 pt, no
  type below 6 pt, no reversed type below 8 pt.
- Both sides are the design; below 90 gsm, show-through turns a bold page grey.

## Techniques
1. **Sheet and margin plan** — set margins first: 12–20 mm on A4 text pages, 20–30 mm on posters, 5 mm clear of
   any fold. The text block is what remains, not what is left over.
2. **Size for distance** — 9–10 pt body at 300–400 mm, 24–36 pt poster body at 1 m, 100 pt headline at 3 m.
   Double the viewing distance, roughly double the size.
3. **Ink budget** — cap full-coverage areas at 30% of the printed side on uncoated stock, and keep heavy solids
   off folds, where ink cracks.
4. **Imposition check** — an 8-page A4 self-cover is two A3 sheets printed both sides; an odd page count means
   paying for a blank page or a 4-page section.
5. **Stock decision early** — an 80 gsm uncoated page cannot carry a full-bleed dark photograph on both sides;
   see [`85-paper-and-material-selection`](85-paper-and-material-selection.md).

## When to Use
- Any job that ends on paper: posters, brochures, packaging, stationery, signage.
- When a screen design is adapted to print and sizes must be re-derived rather than rescaled.
- When a printer quote comes in high; the cause is usually sheet size, page count, or ink coverage.

## When to Avoid
- Screen-only work, where pixels, RGB, and viewport size govern instead.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Designing at 72 PPI, then "fixing" it | Soft at every print size | Place at final size, 300 PPI |
| 8 pt body on an A2 poster | Unreadable past 1 m | 24–36 pt body at poster scale |
| Ignoring page count | Odd signatures cost a blank page | Design to 4-page multiples |

## Practical Examples
An A5 flyer, 148×210 mm, with 10 mm margins gives a 128×190 mm live area: three columns of 40 mm and 4 mm
gutters fill 128 mm exactly. The headline runs 36 pt on 40 pt leading; body sits at 9.5/13 pt in a 40 mm
measure, about 38 characters — right for a flyer read at arm's length. A `#12100E` band bleeds off the top at
8 mm of solid, well inside the ink budget for 170 gsm uncoated, and no solid crosses the fold at 99 mm.

## Related Rules
- [`81-print-color-management`](81-print-color-management.md) — the ink side of the same sheet.
- [`82-bleed-trim-and-safe-areas`](82-bleed-trim-and-safe-areas.md) — the exact geometry around the trim.
- [`83-resolution-and-raster-formats`](83-resolution-and-raster-formats.md) — PPI at final size, worked out.
- [`85-paper-and-material-selection`](85-paper-and-material-selection.md) — stock weight and finish as design constraints.
- [`87-prepress-and-production`](87-prepress-and-production.md) — what the printer checks before plates.

## Sources
- Müller-Brockmann, *Grid Systems in Graphic Design*, "Sheet and format" — the sheet's proportions generate grid and margins.
- *Graphic Artists Guild Handbook*, "Graphic design and production" — production specs belong in the estimate, before design begins.
- *Pocket Pal: A Graphic Arts Production Handbook* — imposition, sheet sizes, and press coverage as trade practice.
