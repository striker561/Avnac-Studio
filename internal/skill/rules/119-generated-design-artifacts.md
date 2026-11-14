# Rule: Generated Design Artifacts

**Domain:** production · **ID:** `119-generated-design-artifacts`

## Purpose
Take what a model hands back — a raster image, an SVG blob, a block of CSS, a chart — and make it survive
production. Generated output arrives plausible and unverified: correct-looking geometry with 900 nodes,
valid-looking CSS with a hard-coded 847 px, a bar chart whose bars contradict its own labels.

## Definition
A generated artifact is production-grade when it passes the same tests as a hand-made one: correct
resolution at final size, clean at 100%, valid syntax, semantically structured, accessible, traceable to a
source, and editable by whoever comes next.

## Core Principles
- Inspect by artifact type, because each fails in its own way, and "does it look good" tests none of them.
- Raster: 1024 px is a draft. Check pixels against placement — 1024 px across 420 mm is 62 PPI — then check
  detail at 100% for tile seams, repeated motifs, mush in high frequencies, watermarks, and letterforms
  that are almost words.
- SVG: generated vector is usually a traced raster or one path with hundreds of nodes. Check `viewBox`,
  strip editor metadata, drop unused `<defs>`, round coordinates, and replace embedded base64 images with
  real elements.
- CSS: generated CSS is plausible and unowned. Validate it, remove `!important`, replace magic numbers
  with tokens, and check contrast on the rendered pair rather than on the token values.
- Charts: the numbers must be real and the geometry honest. Bars start at zero, the lie factor stays near
  1.05, units are labelled, and labels are live text someone can correct.
- Provenance is part of the artifact. An untraceable asset cannot be licensed, replaced or defended. You
  are done when it is correct, not when it looks right — those are different checks, and the second one
  runs first.

## Techniques
1. **Re-target resolution** — compute the pixels the placement needs, then pick: regenerate larger, place
   smaller, composite over a solid panel, or accept lower PPI for a soft background (150 PPI is fine at
   1 m; atmosphere does not need 300).
2. **Sweep at 100% on neutral gray** — four quadrants plus the center, viewed against `#808080` so you
   judge the image and not the UI around it. Mark every defect and decide fix or crop; never "it'll be fine
   at size".
3. **Clean the SVG** — set an explicit `viewBox`, delete `<metadata>`, `sodipodi` and `inkscape` attributes,
   comments and unused gradients, flatten transforms into path data, convert `<style>` blocks to
   presentation attributes, round coordinates, add `<title>`, and use `currentColor` for monochrome icons.
   Target ≤10 KB per icon and ≤50 KB per illustration, then render at 16 px and 512 px to confirm both.
4. **Audit the CSS** — run the W3C validator; remove `!important` and unused selectors; replace fixed px in
   fluid contexts with `clamp()` and `rem`; move color and spacing into custom properties; add a
   `prefers-reduced-motion` block; then check each text/background pair as rendered.
5. **Honesty pass, then rebuild structure** — recompute totals from source data, check every number against
   the dataset, confirm a zero baseline, label axis units, replace any unsupported legend with direct
   labels. For generated logos, icons and type, rebuild as elements rather than patching pixels.

## When to Use
- Any time a generated asset enters a file that will be printed, published or handed to another team.
- As the last pass before export, over everything a model produced.
- When inheriting a project whose assets have no source files and no record.

## When to Avoid
- Don't run the full cleanup on a throwaway comp or an internal mood board; the checks cost more than the
  artifact is worth.
- Don't "clean" an SVG by re-tracing it into more nodes. If the geometry is wrong, rebuild it.
- Don't fix a chart's geometry before checking its data: wrong numbers drawn well are still fiction.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Accepting output at generation size | 1024 px reads fine on screen and mangles at A2 | Compute PPI at placement; regenerate or place smaller |
| Shipping a traced SVG as a logo | Hundreds of nodes, wobbly curves, no optical correction | Rebuild from primitives and paths |
| Keeping generated `style` attributes and `!important` | Overrides become invisible debt for the next editor | Move to tokens and classes |
| Trusting generated chart labels | Bars and numbers are produced independently; both can be wrong | Recompute from the dataset |
| No provenance line | The asset cannot be licensed, replaced or defended later | One row per asset in the register |

## Practical Examples
Three artifacts from one campaign, cleaned before export.

- **Hero image**, generated at 1024×1280 and needed at 2160×2700 for a 1080×1350 post at 2×. Regenerated
  at 2048×2560 and upscaled 5% (inside the 120% cap); two seam artifacts at the left edge were cropped out
  by shifting 6%; converted to sRGB, exported as AVIF at 380 KB with a JPEG q88 fallback.
- **Icon**, generated as a 62-node SVG: `viewBox` added, metadata stripped, transforms flattened, fill set
  to `currentColor`, `<title>` added — 6.1 KB, legible at 16 px and 512 px.
- **Bar chart** for the launch page: the generated version started its bars at 40 and carried a legend the
  data did not support. Rebuilt with a zero baseline, direct labels, a `#1A5FB4`/`#9AA0A6` pair that
  survives deuteranopia, units on the axis, and a `<table>` of the same numbers beneath it.

Each artifact gets one provenance row, so the next revision knows what was rebuilt.

## Related Rules
- [`118-ai-assisted-design`](118-ai-assisted-design.md) — the prompting, disclosure and authorship rules this cleanup follows.
- [`66-vector-illustration`](66-vector-illustration.md) — path construction and SVG production for the rebuild step.
- [`96-data-visualization`](96-data-visualization.md) — the chart standards the honesty pass enforces.
- [`83-resolution-and-raster-formats`](83-resolution-and-raster-formats.md) — the PPI math behind the re-target decision.
- [`69-image-manipulation`](69-image-manipulation.md) — retouching and compositing when an artifact is repaired rather than rebuilt.
- [`115-export-and-file-formats`](115-export-and-file-formats.md) — format and naming decisions once the artifact is clean.

## Sources
- W3C, *SVG 1.1* and *SVG 2* — `viewBox`, coordinate systems and the element model behind the cleanup pass.
- Tufte, *The Visual Display of Quantitative Information* — lie factor and baseline integrity.
- *Graphic Artists Guild Handbook*, on licensing and derivative works — why an untraceable asset cannot be
  cleared for use.
