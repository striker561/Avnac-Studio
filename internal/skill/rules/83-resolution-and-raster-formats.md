# Rule: Resolution and Raster Formats

**Domain:** print · **ID:** `83-resolution-and-raster-formats`

## Purpose
Decide whether an image has enough pixels for the size it will print at, and pick a format that
survives the trip. The answer comes from pixel width and placed width — not from file size,
thumbnail sharpness, or what the client called the file.

## Definition
Raster resolution is fixed in pixels and variable in density. PPI belongs to the placement, not the
file: effective PPI = pixel width ÷ placed width in inches. PPI describes image data, DPI a device's
addressable dots, lpi the press's halftone screen. A file has no resolution until it is placed.

## Core Principles
- Required pixels = final width in inches × target PPI: 210 mm at 300 PPI needs 2480 px.
- Target 300 PPI at 100% for continuous-tone offset, 350 PPI at 175 lpi. PPI ≈ 2 × lpi.
- Effective PPI moves inversely with size, so shrinking the placement is always the cheapest fix for
  a soft image.
- Viewing distance sets large-format targets: 150 PPI at 1 m, 100 PPI at 2 m, 30–50 PPI for a wrap
  read at 10 m. Each doubling of distance halves the requirement.
- Bitmap line art and scanned logos need 600–1200 PPI; anti-aliasing cannot hide the stair-steps in a
  hard edge.
- Upscaling past about 120% invents detail. Interpolation smears an edge; it cannot rebuild one.

## Techniques

**Avnac ops:** `canvas` op=resize sets final pixel dimensions; `elements` op=render places images no larger than their native pixels; `export` op=png `multiplier` produces the raster; `export` op=object crops one element; `get_canvas_image` is the 100% check.

1. **Effective-PPI audit** — compute pixel width ÷ placed inches for every image and flag anything
   under 90% of target. Decide per image, not per document.
2. **Resize the placement before you resample** — 60% of the placed width turns 180 PPI into 300
   without touching a pixel.
3. **Re-request in pixels** — "5031 px wide" is a spec a supplier can meet; "print quality" is an
   adjective.
4. **Format by job** — TIFF with LZW or ZIP for press CMYK, PSD for layered handoff, PNG for UI and
   flat color, JPEG q80–90 for photographic web only, SVG for true vector, WebP or AVIF for page
   weight. Never JPEG for type, screenshots or line art.
5. **Export at scale, never upscale after** — canvas at final pixels (A4 at 300 PPI = 2480×3508)
   exported 1×; a 1080×1080 social canvas exported 2× (2160×2160).

## When to Use
- Every time an `image` element enters the canvas, and again at export.
- When a supplied logo arrives as a 200 px PNG and will print at 40 mm wide.
- When someone asks for "the same file but bigger" for a banner or booth wall.

## When to Avoid
- Don't force 300 PPI onto a 6 m banner: at 10 m viewing distance 30 PPI is correct and the file
  stays workable.
- Don't upscale to satisfy a checklist. A 180 PPI photo at 100 lpi newsprint prints; the 300 PPI
  upscale of it is softer and larger.
- Don't rename a JPEG to TIFF and call it fixed — the pixels did not change.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Reading file size in MB as "high resolution" | A 40 MB JPEG can be 900 px wide | Check pixel width ÷ placed inches |
| Treating 72 PPI as the "web default" | It describes no current display and confuses export math | Think in pixels and 1×/2×/3× scale |
| Placing a JPEG screenshot of a logo | Compression fringing shows on every edge at print size | Rebuild as SVG or trace to paths |

## Practical Examples
An A2 poster, 420×594 mm, carries a photograph at 426×600 mm (16.77 in). At 300 PPI the placement
needs 5031 px; the file is 3000 px, so effective PPI is 179 — 89% of the 350 target for 175 lpi,
tolerable for a soft background but not for a product shot. Shrink the image to 254 mm wide (3000 px
= 300 PPI) and fill the remaining bleed with a `#101010` panel, or request a 5200 px rescan. The
Avnac canvas stays 426×600 mm; only the `image` element's width changes.

## Verification
1. **Ops receipt.** The artboard pixels equal inches x PPI from `get_canvas_summary`, no image is placed above its native pixels, and `export` op=png at 1x is inspected at 100%. A file upscaled at export has invented detail.
2. **Effective PPI.** For each image, pixel width ÷ placed inches: 300 at 100% for continuous tone,
   350 at 175 lpi, 150 at 1 m, 100 at 2 m, 30–50 at 10 m. Anything under 90% of the target is
   flagged per image, not per document.
3. **Pixel arithmetic.** The placement's pixel count is final width in inches × target PPI: 210 mm
   at 300 PPI needs 2480 px, and an A4 page 2480×3508. A 1500 px file across 210 mm measures 181 PPI
   whatever the file is called.
4. **Upscale factor.** Compare placed width with the file's pixel width: no image exceeds 120% of
   native. Past that the detail is invented by interpolation and the edge is softer than the file
   supplied.
5. **Edge check.** Rasterise at the final size and inspect a hard edge at 100%: bitmap line art and
   scanned logos need 600–1200 PPI and show no stair-steps. Anti-aliasing on a 200 PPI logo is a
   blur at print size, not a fix.
6. **Format match.** The format follows the content: TIFF or PSD for press CMYK, PNG for UI and flat
   colour, JPEG q80–90 for web photography only, SVG for vector, WebP or AVIF for page weight. A
   JPEG of type, a screenshot or line art fails on every edge.

## Related Rules
- [`82-bleed-trim-and-safe-areas`](82-bleed-trim-and-safe-areas.md) — the target applies across the bleed, not just inside trim.
- [`81-print-color-management`](81-print-color-management.md) — convert to CMYK after resampling; conversion softens edges again.
- [`67-raster-and-digital-painting`](67-raster-and-digital-painting.md) — plan dimensions before painting, while the decision is free.
- [`115-export-and-file-formats`](115-export-and-file-formats.md) — format, compression and naming at delivery.

## Sources
- Müller-Brockmann, *Grid Systems in Graphic Design*, p. 62 — close reading distance of 30–35 cm underpins the 2× rule behind 300 PPI.
- ISO 12647-2 — offset process control at 150–200 lpi rulings sets the 2× PPI target.
- IDEAlliance G7 and prepress practice — 300 PPI at size for coated offset, 600 PPI for bitmap line art.
