# Rule: Export and File Formats

**Domain:** production · **ID:** `115-export-and-file-formats`

## Purpose
Choose the container that carries the design to its destination without losing what the destination
needs, then name it so nobody opens three files to find the right one. Most "the printer can't open it"
and "the developer says the colors are wrong" tickets are export decisions made an hour before deadline.

## Definition
An export is a set of losses chosen deliberately: editable structure, vector edges, live transparency,
color model, embedded fonts, metadata, pixel dimensions. Format choice is deciding which of those the
receiver actually needs; compression is deciding how much quality the channel will forgive.

## Core Principles
- Export for the receiver, never for the source. A PDF/X for the printer, an RGB JPEG for the email, an
  SVG for the developer, a PNG with alpha for the slide — all from the same canvas.
- Four questions settle most formats: who opens it, screen or substrate, must text or transparency stay
  live, and will anyone edit it downstream.
- Resolution belongs to the placement, not the file: 300 PPI at final size for offset, 150 PPI for a
  review PDF, 1×/2×/3× for screens.
- Compress where the eye will not look. JPEG is for continuous-tone photography only; type, screenshots,
  line art and flat color belong in PNG, WebP or SVG, where the file is smaller *and* sharper.
- Never overwrite a delivered file. Version in the name, keep the previous one, log the change in the
  manifest.

## Techniques
1. **Pick the format from the use, not from habit** — print: PDF/X-4 for the piece, TIFF with LZW for a
   placed CMYK image, PNG for line art. Screen: AVIF or WebP for photography, PNG for transparency and
   UI, SVG for icons. Editable handoff: the source canvas plus a reference PDF. Archive: PDF/A-2b.
2. **Climb the compression ladder deliberately** — JPEG q85 is about a third of the q100 file and
   indistinguishable at arm's length; q70 and below shows 8×8 blocking around type. Keep 4:4:4 chroma
   subsampling when the image contains type or hard colored edges. WebP runs 25–35% smaller than JPEG at
   matched quality, AVIF 40–50%.
3. **Decide transparency before compressing** — PNG-32 and SVG keep alpha; JPEG has none, so pre-composite
   onto the destination background and inspect the edge for a 1 px fringe of the old color.
4. **Convert color, then compress, then embed** — sRGB for screen, the printer's CMYK profile for press;
   compressing before converting clips the gamut twice. Then list every font, confirm embedding or
   outlining, confirm images are embedded rather than linked, confirm the output intent is present, and
   reopen the file to check it.
5. **Name and ship a manifest** — `client_project_medium_size_vNN.ext`, lowercase, hyphens, no spaces, no
   "final": `nightshift_poster_a2_print_v03.pdf`, `nightshift_post_1080x1350_web_v03.jpg`. The manifest is
   five lines: filename, dimensions, color space, fonts embedded, approval name and date.

## When to Use
- Every delivery, including the internal review link: a review file is an export with its own rules.
- When someone asks for "the original file" — that is a rights question as well as a format one.
- When a third party you will never speak to inherits the asset.

## When to Avoid
- Don't send PDF/X to a screen, a slide deck or a CMS; the press settings buy nothing and the file is
  heavy.
- Don't deliver a flattened JPEG as "the artwork" when the client may still need to change a date. Send
  the PDF and state what is editable.
- Don't upscale to hit a PPI number. A 179 PPI photograph printed at 179 PPI beats a soft 300 PPI one.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| `Final_final_v2.pdf` | Three files claim to be final | `_v03` plus ISO date; keep the previous version |
| Renaming `.jpg` to `.png` | No alpha appears, artifacts remain | Re-export from the canvas |
| A 12 MB PDF for a three-slide review | Bounced by mail servers, reviewed badly | Screen PDF, 150 PPI, sRGB, 1–3 MB |
| CMYK image on a web page | Browsers render it unpredictably | sRGB for everything on screen |
| Logo exported as a 200 px PNG | Soft at any print size, no alpha control | SVG plus PNG at 1×/2×/3× |

## Practical Examples
One campaign, two canvases, five exports.

- Feed post: `nightshift_post_1080x1350_web_v03.jpg` — JPEG q85, sRGB, 1080×1350, 260 KB.
- Story asset: `nightshift_story_1080x1920_web_v03.png` — PNG-24 at 2160×3840 for the 3× slot.
- Logo: `nightshift_logo_primary.svg` (viewBox, `currentColor`) plus `nightshift_logo_primary_512.png` with
  alpha for the deck.
- Poster: `nightshift_poster_a2_print_v03.pdf` — PDF/X-4, 426×600 mm (420×594 trim plus 3 mm bleed),
  FOGRA51 output intent, images at 300 PPI, fonts subset and embedded.
- Review: `nightshift_poster_a2_review_v03.pdf` — 150 PPI, sRGB, 1.4 MB, sent with the manifest line
  "approve by Thu 13 Nov".

The manifest is five lines in the same folder, so whoever opens it in six months can tell print from
screen without opening a single file.

## Related Rules
- [`83-resolution-and-raster-formats`](83-resolution-and-raster-formats.md) — the PPI math that decides whether an export is possible at all.
- [`81-print-color-management`](81-print-color-management.md) — profiles, conversion and output intent behind the PDF/X settings.
- [`87-prepress-and-production`](87-prepress-and-production.md) — what the printer does with the file once it lands.
- [`116-design-handoff`](116-design-handoff.md) — the specs and acceptance step around the files themselves.
- [`117-design-documentation`](117-design-documentation.md) — version names and the record of what shipped.
- [`119-generated-design-artifacts`](119-generated-design-artifacts.md) — cleaning model output before it is exported.

## Sources
- ISO 15930-7 (PDF/X-4) and ISO 19005-2 (PDF/A-2) — the exchange and archival profiles named above.
- ITU-T T.81 (JPEG) and the W3C PNG specification — the compression behaviour behind technique 2.
- *Graphic Artists Guild Handbook*, on deliverables and file delivery — why native files are a separate
  grant from usage rights.
