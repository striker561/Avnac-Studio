---
name: print
description: Prepare designs for print — bleed, trim and safe areas, CMYK and spot color, resolution, paper and finishing choice, preflight and printer handoff. Use whenever work will be printed, the user mentions a printer, press, bleed, CMYK, paper stock, business cards, brochures or packaging, or asks why a print job came back wrong.
---

# Print Production

## Applies when
The final medium is ink on a substrate. If the deliverable is a screen only, use `export`; if it
is a structural object, add `packaging`.

## Workflow
1. **Confirm the physical spec first**: finished size, quantity, stock, inks, finishing, delivery
   date. Every later decision depends on these; guessing them is how jobs get reprinted.
2. **Set the document up correctly**: finished size + 3 mm bleed (5 mm for large format and
   packaging), 5 mm safe area inside trim, CMYK with the printer's profile, 300 PPI images (150
   for large format).
3. **Design with the geometry visible.** Turn on bleed/safe guides and keep type, logos and
   critical content inside the safe area; let backgrounds and images bleed.
4. **Choose colors with the substrate in mind.** Avoid electric greens and bright oranges in CMYK;
   use spot colors for brand-critical inks; rich black (40/30/30/100) for large solids, 100K for
   text.
5. **Match stock to concept.** Uncoated + heavy = tactile and premium; coated + gloss = image
   saturation; newsprint = urgency and cheapness. Check the proof on the actual stock where
   possible.
6. **Design for finishing.** Foil and emboss need ≥ 0.5 pt strokes and no fine gradients; spot UV
   needs a separate mask file; die cuts need 2 mm minimum radii and 3 mm clearance.
7. **Preflight**: fonts embedded, images at resolution, no RGB, overprint checked, ink limit within
   profile (300% coated, 240–260% uncoated), page order and sizes correct.
8. **Hand off with a written spec** and a low-res proof; review the printer's proof, not your
   screen.

## Decision points
- **Digital or offset?** Short runs and variable data → digital; long runs with spot colors → offset.
- **One or two inks?** Often stronger and cheaper for simple designs; one-color work forces
  better hierarchy.
- **Bleed or border?** A white border needs no bleed but shows trimming variation; a full-bleed
  color needs accurate bleed and consistent trim.
- **Coated or uncoated?** Coated holds detail and saturation; uncoated holds tactility and reads as
  premium but desaturates and absorbs.

## Rules to apply
- [`80-print-design-fundamentals`](../rules/80-print-design-fundamentals.md) — print vs screen thinking.
- [`81-print-color-management`](../rules/81-print-color-management.md) — profiles, CMYK, spot, proofing.
- [`82-bleed-trim-and-safe-areas`](../rules/82-bleed-trim-and-safe-areas.md) — the exact geometry.
- [`83-resolution-and-raster-formats`](../rules/83-resolution-and-raster-formats.md) — resolution math.
- [`84-print-finishing-techniques`](../rules/84-print-finishing-techniques.md) — designing for a finish.
- [`85-paper-and-material-selection`](../rules/85-paper-and-material-selection.md) — stock choice.
- [`87-prepress-and-production`](../rules/87-prepress-and-production.md) — preflight and handoff.

## References
- [`print-production`](../references/print-production.md) — numbers, stocks, finishes, cost levers.

## Production checks
- [ ] Bleed 3 mm (5 mm large format/packaging), safe area 5 mm inside trim
- [ ] Images ≥ 300 PPI at placed size (150 for large format)
- [ ] CMYK profile matches the printer; spot colors named exactly
- [ ] Rich black only on large solids; text 100K
- [ ] Fonts embedded or outlined in the delivered file
- [ ] Ink limit within the profile's total area coverage
- [ ] Overprint preview checked; no unexpected dropouts
- [ ] Export as PDF/X-4 (or X-1a when required), one file per deliverable
- [ ] Proof reviewed on screen and, for critical jobs, on stock

## Output format
`Spec:` size, stock, inks, finishing, quantity, date. `Files:` paths with format and color space.
`Preflight:` checklist results. `Risks:` the three things most likely to go wrong at the printer.
