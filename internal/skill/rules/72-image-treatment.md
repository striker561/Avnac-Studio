# Rule: Image Treatment

**Domain:** imagery · **ID:** `72-image-treatment`

## Purpose
Make images from different sources read as one voice without hiding what they show. Treatment turns a pile of
licensed frames, client snapshots, and one commission into a set the reader experiences as one photographic idea.

## Definition
Treatment is the ordered set of global adjustments applied identically to every image in a project: black
point, contrast, color balance, saturation, tonal overlay, and grain. The image is only the input.

## Core Principles
- Write the recipe as numbers before touching the first image, then apply it to all of them — including the
  ones that "look fine".
- Grade in a fixed order: black point → contrast → color balance → saturation → overlay → grain. Each step
  works on the output of the last, so reordering changes the result.
- Keep 20–30% of native color. A treatment that removes all original chroma reads as a 2012 social filter and
  makes food, skin, and product color untrustworthy.
- Text over image needs 4.5:1 against the worst pixel behind it: build a scrim for the text zone rather than
  darkening the whole photograph.
- Make consistency measurable — mean lightness within ±10 levels and saturation within ±8% across the set. If
  you cannot state the number, you are matching by mood.

## Techniques
1. **Recipe sheet** — one line per step with values: black point 8, white 245, contrast +12, saturation −15%,
   `#1B2A4A` Multiply at 18%, grain 4% at 1.5 px. Apply to all, log the exceptions.
2. **Scrim construction** — a linear gradient from 55% black to 0 over the text zone, or a flat 35% band, with
   type in the darkest 40% of its own zone rather than over the subject.
3. **Histogram match** — side by side, match midtone level within 10 levels and the highlight roll-off; then
   look away for ten seconds and look back. The eye catches drift the numbers miss.
4. **Grayscale pass** — check the set in grayscale; an image much lighter or flatter than its neighbors is
   being rescued by the overlay, and its exposure should be fixed instead.
5. **Sequence pacing** — alternate light and dense images across a spread so uniformity does not become
   monotony.

## When to Use
- Any layout with two or more photographs, especially from different sources or shoots.
- Campaigns where imagery must stay recognizable as one family across formats.
- Bringing stock imagery into line with an existing brand grade.

## When to Avoid
- Documentary, journalistic, and evidence images, where the grade is part of the record.
- Product and apparel photography: a treatment that shifts a garment's hue is a returns problem, not style.
- One hero image that needs a small correction; a full recipe over-corrects it.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Treating each image individually | The set drifts image by image | One recipe, applied to all |
| Darkening the whole photo for type | Kills the image to save the caption | Local scrim behind the text only |
| Contrast pushed to +40 | Clips highlights, posterizes skin | +10 to +15, then check at 100% |
| Different grain per image | Reads as different cameras | One grain layer over the composite |

## Practical Examples
A 1080×1350 px poster carries a commissioned portrait, a licensed product shot, and a client snapshot. Recipe:
black point 8, white 245, saturation −15%, `#1B2A4A` Multiply at 18%, grain 4% at 1.5 px. After the grade,
mean lightness reads 118, 121, and 114 — inside the ±10 window, against 156 for the untreated snapshot. A
gradient scrim from 55% black to 0 covers y=0–420, where the 72 px headline in `#F5F1E8` holds 7.9:1 at its
darkest point. Three sources, one voice.

## Related Rules
- [`73-duotone-and-color-grading`](73-duotone-and-color-grading.md) — the two-ink construction this rule stops short of.
- [`75-visual-effects`](75-visual-effects.md) — grain, glow, and blur as separate decisions.
- [`19-color-in-context`](19-color-in-context.md) — how a grade shifts against its neighbors and under light.
- [`18-color-accessibility`](18-color-accessibility.md) — the contrast floor the scrim must reach.
- [`70-photography-and-imagery`](70-photography-and-imagery.md) — where those images came from.

## Sources
- Horstman, *Interacting with Color*, p. 8 — color relativity: the same color reads differently against different neighbors, so a treatment is judged in the set, not alone.
- Horstman, *Interacting with Color*, p. 67 — contrast, hue, temperature, and saturation as the vocabulary for describing a grade.
