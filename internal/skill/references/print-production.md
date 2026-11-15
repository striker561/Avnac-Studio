# Print production — reference

Use when a design is going to a printer, or when a design decision has to survive one. Rules:
[`80-print-design-fundamentals`](../rules/80-print-design-fundamentals.md),
[`82-bleed-trim-and-safe-areas`](../rules/82-bleed-trim-and-safe-areas.md),
[`87-prepress-and-production`](../rules/87-prepress-and-production.md).

## The geometry, with numbers

| Item | Value | Notes |
|---|---|---|
| Bleed | 3 mm (0.125 in) | 5 mm for large format, packaging and books with trimming variation |
| Safe area | 5 mm inside trim | 8–10 mm for folded or die-cut work |
| Crop marks | 3 mm long, 3 mm offset | Only in the PDF, not in the artwork |
| Registration marks | Outside trim | Never inside the safe area |
| Fold allowance | 0.5–1 mm per fold | Increase for thick stock; check creep on saddled work |
| Spine allowance | 2× stock thickness + 1 mm | Books: confirm with the printer |
| Minimum text size | 6 pt (offset), 8 pt (digital) | Reverse text needs +2 pt |
| Minimum rule weight | 0.25 pt (offset), 0.5 pt (digital) | Hairlines may disappear |

## Resolution

| Output | PPI at final size | Notes |
|---|---|---|
| Offset / digital print | 300 | 350 for fine art / photography |
| Large format (poster, banner) | 150 at final size | 100 acceptable above A0 |
| Newsprint | 200 | Halftone screening is coarse |
| Screen / web | 72–144 CSS px equivalent | 2× for retina |
| Line art / logos | Vector, or 600–1200 PPI raster | Bitmap logos show jaggies |

Effective resolution = pixels ÷ printed inches. Upscaling above ~120% of native resolution is
visible; do not "fix" a 72 PPI JPEG by changing its metadata.

## Color management

1. Work in the printer's profile: ask for it (often FOGRA39/Coated FOGRA39, GRACoL2013, or SWOP).
2. Soft-proof before export: `View → Proof Colors`, then compare.
3. Ink limit: 300% total (coated), 240–260% (uncoated/newsprint).
4. Rich black for large solids: 40C/30M/30Y/100K. Text black: 100K only.
5. Total area coverage and overprint: check white text and thin lines on colored backgrounds.
6. Spot colors: name exactly (PANTONE 185 C), never "red".
7. PDF/X-4 for most print workflows; PDF/X-1a when the printer demands flattened transparency.

## Stock

| Stock | g/m² | Feel | Use |
|---|---|---|---|
| Bond / offset | 70–120 | Plain, absorbent | Letters, forms, cheap inserts |
| Uncoated text | 90–150 | Warm, tactile | Books, editorial, premium flyers |
| Coated silk/matte | 115–200 | Smooth, low glare | Brochures, catalogues, image-heavy |
| Coated gloss | 115–250 | Shiny, high contrast | Magazines, packaging |
| Card / cover | 250–400 | Stiff | Postcards, covers, packaging |
| Newsprint | 40–50 | Absorbent, grey | Newspapers, cheap runs |
| Specialty | — | Textured, colored, synthetic | Invitations, labels, outdoor |

Rule of thumb: 300 g/m² and above reads as "premium" in hand; below 150 g/m² reads as
disposable. Uncoated + heavy = tactile; coated + heavy = polished.

## Finishing

| Finish | Effect | Design implication |
|---|---|---|
| Matte lamination | Protects, kills glare | Colors desaturate ~5–10%; check proof |
| Gloss lamination | Contrast pop | Fingerprints; avoid large dark solids |
| Spot UV | Gloss on matte | Needs a separate 100% K mask file |
| Foil stamp | Metallic, tactile | Minimum 0.5 pt line; no fine gradients |
| Emboss / deboss | Dimensional | Minimum 1.5 mm stroke; avoid tiny type |
| Die-cut | Custom shape | 2 mm minimum radius; 3 mm clearance from cut |
| Varnish (spot) | Subtle sheen | Cheap alternative to UV; low contrast |

## Prepress handoff

- One PDF per deliverable, pages in order, named `client_job_size_v01.pdf`.
- Fonts embedded; images at final resolution; no RGB in a CMYK job unless agreed.
- Layers flattened unless the printer asked for them; overprint preview checked.
- A low-res JPG proof with the same name plus `_proof`.
- Written spec: size, stock, inks, finishing, quantity, delivery date.

## Cost levers (in order of impact)

1. Format/stock size that fits the press sheet with little waste (A-series and 8.5×11 nest well).
2. Quantity — unit price falls steeply; short runs are expensive per unit.
3. Inks — 1–2 spot colors beat 4-color process for simple designs.
4. Finishing — each separate process adds setup cost; combine or drop.
5. Paper weight — heavier stock costs more per sheet and per postage.

## Rules

- [`80-print-design-fundamentals`](../rules/80-print-design-fundamentals.md) — print vs screen thinking.
- [`81-print-color-management`](../rules/81-print-color-management.md) — profiles, CMYK, spot.
- [`82-bleed-trim-and-safe-areas`](../rules/82-bleed-trim-and-safe-areas.md) — the geometry table above.
- [`83-resolution-and-raster-formats`](../rules/83-resolution-and-raster-formats.md) — resolution math.
- [`84-print-finishing-techniques`](../rules/84-print-finishing-techniques.md) — designing for a finish.
- [`85-paper-and-material-selection`](../rules/85-paper-and-material-selection.md) — stock choice.
- [`87-prepress-and-production`](../rules/87-prepress-and-production.md) — the handoff checklist.
- [`115-export-and-file-formats`](../rules/115-export-and-file-formats.md) — export settings.
