---
name: export
description: Get files out of the design correctly — choose formats, set color space, resolution and compression, handle transparency and fonts, name and organise deliverables, and hand off the right thing to a client, printer, developer or platform. Use whenever the user asks to export, download, save for web, make a PNG/PDF/SVG, compress an image, or the same artwork needs several outputs.
---

# Export and Delivery

## Applies when
The design is done and must become files. Wrong export settings are the most common way a good
design arrives broken — check this even when the user does not ask.

## Workflow
1. **List the destinations.** Each one gets its own export: web page, social platform, print,
   printer, developer, archive. One file cannot serve all of them well.
2. **Set the color space per destination**: sRGB for screens, CMYK (printer's profile) for offset,
   RGB for office/home inkjet unless told otherwise. Never send CMYK to a browser.
3. **Set resolution at final size**, not at design size: 300 PPI print, 150 PPI large format, 2×
   for retina screens.
4. **Choose the format by what must survive**: transparency (PNG/WebP), print fidelity (PDF/X),
   text and editability (SVG/PDF with live text), photographic compression (JPEG/WebP), animation
   (GIF/WebP/MP4).
5. **Embed or outline fonts** — never ship a file that silently substitutes type. Keep a live-text
   master.
6. **Compress deliberately**: JPEG 80–85 for photos, PNG for flat graphics, WebP/AVIF for web
   photos, PDF/X-4 with images downsampled to 300 PPI.
7. **Name and structure the delivery** so a stranger can use it without asking: `client_project_
   asset_variant_vNN.ext`, with folders for source, print, web, social.
8. **Verify by opening the exported file**, not the working file. Check size, colors, fonts,
   transparency and crops.

## Decision points
- **PNG or JPEG?** PNG for text, flat color, transparency; JPEG for photographic content with no
  transparency. A logo as JPEG is a defect.
- **SVG or PDF?** SVG for screens and editable vectors; PDF for print and universal sharing.
- **One PDF or several?** One file per deliverable, except when a printer asks for a combined
  imposition. Name each page.
- **Downsample or crop?** Prefer correct resolution at capture; upscaling is never a fix.

## Rules to apply
- [`115-export-and-file-formats`](../rules/115-export-and-file-formats.md) — format matrix and settings.
- [`83-resolution-and-raster-formats`](../rules/83-resolution-and-raster-formats.md) — resolution math.
- [`81-print-color-management`](../rules/81-print-color-management.md) — print color space.
- [`116-design-handoff`](../rules/116-design-handoff.md) — what the receiver needs.
- [`117-design-documentation`](../rules/117-design-documentation.md) — asset naming and versions.

## References
- [`print-production`](../references/print-production.md) — print formats and preflight.
- [`web-and-ui`](../references/web-and-ui.md) — screen sizes and formats.

## Production checks
- [ ] Colors correct for destination (sRGB vs CMYK) and visually compared to the master
- [ ] Resolution at final size, no accidental upscaling
- [ ] Fonts embedded/outlined; no substitution on open
- [ ] Transparency handled correctly on the destination background
- [ ] Bleed and crop marks present on print files only
- [ ] File size within platform limits
- [ ] Naming convention applied; versions not overwritten
- [ ] Exported file opened and inspected once

## Output format
`Deliverables:` destination → file → format → color space → dimensions/size → notes. `Source
kept:` path. `Verification:` what you opened and checked.
