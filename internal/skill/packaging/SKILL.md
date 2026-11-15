---
name: packaging
description: Design packaging and structural print — dielines, panels, folds, labels, boxes, pouches and sleeves — with artwork that survives folding, gluing, legal copy and a shelf. Use whenever the deliverable wraps, contains or labels a physical product, or the user mentions a box, label, dieline, sleeve, package or bottle.
---

# Packaging

## Applies when
The design goes onto a three-dimensional object. If the output is a flat sheet, use `print`; if
the packaging is the product's identity system, also use `brand`.

## Workflow
1. **Get the real dieline** from the converter or structural designer. Do not invent one. Ask for
   the die line in vector with fold, cut, glue and bleed layers named.
2. **Map panels before designing**: primary display panel (PDP), side panels, back panel, top,
   bottom, glue flaps. Decide what must be where for shelf and legal reasons.
3. **Respect the geometry**: cut lines, fold lines, glue areas, panel gaps, and the "no print"
   zones (glue, folds, inside tucks). Artwork crossing a fold distorts — plan for it or avoid it.
4. **Design the PDP first**, for the viewing distance on shelf (1–2 m) and for a thumbnail on a
   marketplace listing. The PDP must work as a 200 px image.
5. **Place legal and mandatory copy** where it is legible and complete: ingredients, net weight,
   warnings, barcode, recycling marks, manufacturer. Use the actual regulatory layout for the
   market; do not improvise.
6. **Design for production**: 300 PPI images, CMYK, spot colors only when needed, minimum text 6 pt,
   minimum line 0.25 pt, no hairlines on folds.
7. **Prove it in 3D** — a digital mockup and, for critical work, a white dummy printed and folded.
   Flat artwork hides panel imbalance and fold conflicts.
8. **Hand off**: dieline + artwork aligned on the same artboard, plus a spec sheet listing stock,
   finish, ink and lamination.

## Decision points
- **Rigid or flexible?** Rigid boxes carry premium and need more structural clearance; flexible
  pouches need distortion allowances for the film's stretch.
- **Print or label?** Labels are cheaper for short runs and allow version changes; direct print is
  better for premium and full coverage.
- **Window or no window?** Product visibility sells, but windows add cost and constrain layout.
- **Shelf-facing or e-commerce-first?** E-commerce needs a strong front panel and readable
  thumbnail; shelf needs contrast against neighbours.

## Rules to apply
- [`86-packaging-and-dielines`](../rules/86-packaging-and-dielines.md) — dielines, folds, glue, artwork
- [`82-bleed-trim-and-safe-areas`](../rules/82-bleed-trim-and-safe-areas.md) — bleed and safety for cuts
- [`85-paper-and-material-selection`](../rules/85-paper-and-material-selection.md) — board and substrate
- [`84-print-finishing-techniques`](../rules/84-print-finishing-techniques.md) — foil, emboss, varnish
- [`80-print-design-fundamentals`](../rules/80-print-design-fundamentals.md) — print thinking
- [`18-color-accessibility`](../rules/18-color-accessibility.md) — contrast for small legal copy

## References
- [`print-production`](../references/print-production.md) — stock, finishing, prepress numbers.
- [`logo`](../references/logo.md) — mark behaviour at small sizes on pack.

## Production checks
- [ ] Dieline from the converter used; no redrawn geometry
- [ ] Artwork aligned to the dieline on one artboard; fold/cut layers preserved
- [ ] 3 mm bleed past cut lines; 6–10 mm safety from folds and cuts for text
- [ ] Legal copy complete for the target market, ≥ 6 pt, high contrast
- [ ] Barcode placed on a flat area with quiet zone (≥ 3 mm) and correct size
- [ ] Images 300 PPI at final size; CMYK; spot colors specified
- [ ] White dummy folded and checked for conflicts
- [ ] Spec sheet: stock, finish, ink, lamination, quantity

## Output format
`Structure:` box/pouch/sleeve + dieline source. `Panels:` what goes where. `PDP:` hierarchy and
thumbnail check. `Legal:` items and placement. `Production:` stock, ink, finish. `Risks:` fold
conflicts, copy truncation, shelf contrast.
