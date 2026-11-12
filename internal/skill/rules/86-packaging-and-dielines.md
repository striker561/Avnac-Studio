# Rule: Packaging and Dielines

**Domain:** print · **ID:** `86-packaging-and-dielines`

## Purpose
Design artwork onto a structure, not onto a rectangle. A dieline is a fixed engineering drawing —
panels, folds, glue flaps and compensation decided by the converter — and the artwork must map onto
those faces without text falling over a crease.

## Definition
A dieline is the 1:1 cutting and creasing pattern for a folded or die-cut piece: solid lines cut,
dashed lines crease, hatched or labeled areas are waste and glue. Panels are the faces between
creases; compensation adds board thickness so the box squares up.

## Core Principles
- The dieline is a technical layer, never artwork: put it on its own layer named "DO NOT PRINT" and
  remove it before export. A magenta crease line on a printed carton is a reprint.
- Know the three zones: trim (the cut), bleed (3 mm past every outside cut), safe (3–5 mm inside
  every crease and cut). Anything that must be read sits inside the safe zone.
- Board thickness consumes artwork. A 0.5 mm folding carton needs about 0.5 mm of compensation per
  fold, 1.5 mm E-flute needs 1.5–2 mm, 3 mm B-flute needs 3–4 mm. Ask the converter for the
  compensated dieline; never draw one from a photo of a box.
- Glue areas are dead space: 10–15 mm on a folding carton, 20–25 mm on a corrugated case. Artwork
  there is destroyed by glue.
- Artwork continuity across a fold is an illusion. A crease is a hard line in the ink plus a 1 mm
  shift after folding, so a logo spanning it will break. Design each panel as a unit.

## Techniques
1. **Request the dieline before the layout** — get the converter's 1:1 PDF with layers, then build
   the Avnac canvas at that size (300×200 mm at 300 PPI = 3543×2362 px).
2. **Build named zones** — one 10%-opacity `rect` per panel, plus glue and safe-zone guides; group
   and lock them. Artwork then snaps to real faces instead of the sheet.
3. **Hold back at creases** — keep type 5 mm and rules 3 mm clear; when a background must cross,
   extend it 3 mm past the crease so a fold shift cannot expose white.
4. **Check the assembled object** — cut and fold a white dummy at 1:1. Hidden barcodes, logos on the
   wrong face and flaps covering the name are invisible in the flat artwork.

## When to Use
- Folding cartons, sleeves, pillow boxes, corrugated shippers, rigid box wraps, hang tags.
- When artwork must continue around a corner or repeat on adjacent faces.
- When a client supplies "the box" as a photo or flattened sample and expects a print-ready file.

## When to Avoid
- Don't redraw a converter's dieline; your version will miss the caliper and the box will not close.
- Don't wrap one photograph across three panels of a small carton: at 100 mm panel width the crop
  becomes unrecognizable and each crease cuts the subject.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Artwork to the trim line with no bleed | Cut tolerance shows a white edge on every panel | 3 mm bleed outside every cut edge |
| Centered on the sheet, not the panel | The front face is off-center once folded | Center to panel coordinates |
| Glue flap in brand color | Glue smears and the flap shadows through | Keep glue area unprinted |
| Same panel sizes for 0.5 mm board and 1.5 mm flute | Out of square, gap at the seam | Use the compensated dieline |

## Practical Examples
A 100×100×50 mm folding carton in 0.5 mm SBS board: the dieline is 320×210 mm overall — four 100 mm
faces, a 15 mm glue flap and tuck flaps. In Avnac the 320×210 mm canvas at 300 PPI (3780×2480 px)
holds the dieline locked on top; the front face is a guide `rect` at x=105, y=55, 100×100 mm. The
brand sits centered on that rect, 6 mm clear of the crease, the background `#1B3A2F` runs 3 mm past
each crease, and the barcode goes on the base panel, never across a fold.

## Related Rules
- [`82-bleed-trim-and-safe-areas`](82-bleed-trim-and-safe-areas.md) — bleed and safe numbers applied to a non-rectangular shape.
- [`84-print-finishing-techniques`](84-print-finishing-techniques.md) — die-cutting, creasing and their tool tolerances.
- [`85-paper-and-material-selection`](85-paper-and-material-selection.md) — board caliper drives panel compensation.
- [`30-grid-systems`](30-grid-systems.md) — build the panel grid from the structure, not from the sheet.

## Sources
- Müller-Brockmann, *Grid Systems in Graphic Design*, p. 149 — in three-dimensional work the grid is applied to real faces and to eye level, not to a flat sheet.
- Professional packaging convention — 3 mm bleed, 3–5 mm safe, 10–15 mm glue flap.
- *Graphic Artists Guild Handbook* — dielines and structural mockups come from the converter.
