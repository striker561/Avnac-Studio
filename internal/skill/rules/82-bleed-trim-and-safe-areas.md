# Rule: Bleed, Trim, and Safe Areas

**Domain:** print · **ID:** `82-bleed-trim-and-safe-areas`

## Purpose
Fix the exact geometry around the cut so no white sliver shows at the edge and nothing that matters is trimmed
away. These numbers are cheap at the start and impossible to fix after the guillotine.

## Definition
Trim is the finished cut size. Bleed is artwork extending past trim so the cut can drift without exposing paper.
The safe area is the margin inside trim where text and logos stay; the live area is what remains inside it.

## Core Principles
- Bleed 3 mm (0.125 in) for offset and digital work, 5 mm for large format, die-cuts, and heavy stock. Below 3 mm,
  a ±1.5 mm guillotine drift shows white.
- Safe margin 3 mm from trim for backgrounds, 5 mm for text, 10 mm on posters and site signage cut by hand.
- Set the canvas to trim plus 2× bleed: A4 becomes 216×303 mm, or 2551×3579 px at 300 PPI; A5 becomes 154×216 mm.
- Crop marks sit 3 mm clear of trim, 5 mm long, 0.25 pt, with registration marks outside them — never on the bleed.
- Saddle-stitch creep moves inner pages outward: allow 0.5 mm per 8-page step at 100 gsm, 1 mm at 16 pages, about
  2 mm at 32 pages on 130 gsm.
- Fold allowances change panel widths: on a 300 mm roll fold cut 99/100/101 mm so the inner panel closes flush.

## Techniques

**Avnac ops:** `canvas` op=resize sets the sheet including bleed; `elements` op=render places background art across the bleed; `arrange` op=align keeps the content block on the safe-area edge; `canvas` op=validate reports `margin_ladder`; `export` op=png carries the full sheet.

1. **Canvas first** — build the document as trim + bleed, guides on trim and safe, then compose. Only backgrounds
   cross the safe guide.
2. **Overscan full-bleed art** — run images 2–3 mm past the bleed line; never size a photograph exactly to bleed.
3. **Fold plan** — folds on their own layer, 5 mm clear either side, panel widths written into the file notes.
4. **Trim test** — at 100%, check every edge: is anything important touching the safe line, and does every
   full-bleed element cross the bleed by at least 2 mm?

## When to Use
- Every printed piece, including posters and business cards.
- Artwork handed to a printer you do not control.
- Any fold, die-cut, or bound edge that falls near the composition.

## When to Avoid
- Screen-only work, where there is no trim; use device safe areas instead
  ([`95-responsive-interface-design`](95-responsive-interface-design.md)).
- Perfect-bound inner margins, which take a 3–5 mm gutter allowance rather than bleed.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| No bleed on a full-bleed photo | White slivers at the trim | 3 mm bleed, art overscanned 2 mm |
| Text 1 mm from trim | Cut, or crowded by drift | 5 mm safe margin for text |
| Crop marks inside the bleed | Marks print onto the sheet | 3 mm clear of trim |
| One panel width on a roll fold | Folded edge will not close flush | 99/100/101 mm on a 300 mm fold |

## Practical Examples
An 8-page A5 saddle-stitched brochure: trim 148×210 mm, canvas 154×216 mm, 5 mm safe margin. The cover photograph
runs from x=−3 to x=157 and is overscanned to x=−6 and x=160. The 96 mm text column sits inside the safe guide, so
1.5 mm of trim drift never touches it. Page 8 shifts 0.5 mm in imposition, which the 8 mm bottom margin absorbs.
Crop marks are 5 mm long at 0.25 pt, offset 3 mm, on a layer the printer can toggle.

## Verification
1. **Ops receipt.** The artboard includes the stated bleed, `canvas` op=validate `margin_ladder` keeps content off the trim, and `export` op=png at 1x includes the bleed with no white edge. A file that trims to the content has already lost the bleed.
2. **Canvas arithmetic.** The canvas is trim plus 2× bleed: A4 becomes 216×303 mm or 2551×3579 px at
   300 PPI, A5 becomes 154×216 mm. A canvas equal to trim has no bleed, and the first 1.5 mm of
   drift shows paper.
3. **Bleed crossing.** At 100%, every full-bleed element crosses the bleed line by at least 2 mm and
   each photograph is overscanned 2–3 mm past it. An image sized exactly to bleed fails a ±1.5 mm
   guillotine drift.
4. **Safe margin.** Measure trim to the nearest text or logo: 5 mm for text, 3 mm for backgrounds,
   10 mm on posters and site signage cut by hand. Text 1 mm inside trim is cut, not merely crowded.
5. **Crop marks.** `export` op `svg` returns the mark geometry: 5 mm long at 0.25 pt, offset 3 mm
   from trim, registration marks outside them, none on the bleed. A mark that prints on the sheet is
   artwork the printer did not order.
6. **Creep.** Saddle-stitch creep is 0.5 mm per 8-page step at 100 g/m², 1 mm at 16 pages, about
   2 mm at 32 pages on 130 g/m². The innermost page's outer margin absorbs the shift or imposition
   compensates it.

## Related Rules
- [`80-print-design-fundamentals`](80-print-design-fundamentals.md) — sheet choice and margins that precede trim.
- [`81-print-color-management`](81-print-color-management.md) — ink coverage at the edges you just defined.
- [`83-resolution-and-raster-formats`](83-resolution-and-raster-formats.md) — the pixel size of a 216×303 mm canvas.
- [`84-print-finishing-techniques`](84-print-finishing-techniques.md) — how die-cuts and foils change the allowance.
- [`86-packaging-and-dielines`](86-packaging-and-dielines.md) — bleed and safe areas on a structural die line.

## Sources
- ISO 12647-2 and printer specification sheets (professional convention) — 3 mm bleed and crop-mark placement.
- *Pocket Pal: A Graphic Arts Production Handbook* — bleed, trim, creep, and signature allowances in trade practice.
- *Graphic Artists Guild Handbook* — production specs negotiated with the printer before artwork is released.
