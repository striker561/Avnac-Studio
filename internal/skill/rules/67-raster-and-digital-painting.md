# Rule: Raster and Digital Painting

**Domain:** illustration · **ID:** `67-raster-and-digital-painting`

## Purpose
Keep painted raster artwork sharp, editable, and large enough for where it lands. Painting is the one
illustration mode where the resolution decision is irreversible after the first stroke, so settle the
arithmetic before painting.

## Definition
Raster painting builds an image from brush marks on a fixed pixel grid, organized in layers that
separate value structure, form, light, texture, and line. Sharpness is fixed at creation, and no
filter recovers it.

## Core Principles
- Decide the pixel footprint first. An element occupying 640×900 px on an Avnac canvas needs a
  1280×1800 px file to survive a 2× export or a 20% crop.
- Paint value before color. Block four values (`#1A1A1A`, `#4D4D4D`, `#999999`, `#E6E6E6`) and check
  the silhouette at 25% zoom; saturation cannot rescue a broken value structure.
- Separate layers by job, not by mood: block-in, shadow, light, texture, line. Eight is a ceiling —
  beyond that every adjustment becomes a guess about which layer changed.
- Size the brush to the form: 40–80 px for mass at 1080 px canvas width, 12–20 px for form turns, 3–6
  px for detail; marks wider than 1.5% of the short side read as mud.
- Keep a three-level ladder — silhouette, big form, texture; a fourth level is invisible at poster
  distance.

## Techniques
1. **Resolution plan** — write the placement box in pixels, multiply by 2, paint at that size. A
   640×900 px portrait zone on a 1080×1350 px poster means a 1280×1800 px document; PPI math for
   print lives in [`83-resolution-and-raster-formats`](83-resolution-and-raster-formats.md).
2. **Four-value block-in** — flats at the four values above, a Multiply layer at 25–35% for shadow
   shapes, an Overlay layer at 20% for light, and only then any hue.
3. **Layer recipe** — sketch 30% → flat color 100% → shadow Multiply 40% → light Overlay 25% →
   texture Overlay 10–15% with 3 px grain → line 100%. Flatten only on export.
4. **Edge discipline** — hard edges where light turns on a form and on cast shadows; soften only
   occlusion, at a 20–40 px edge. Uniform softness turns every surface into rubber.

## When to Use
- Hero illustration for a poster, cover, or packaging front where brush texture is part of the claim.
- Editorial spot art that needs grain and a painterly hand rather than vector crispness.
- Anything destined to be composited with photography, where grain has to match.

## When to Avoid
- Logos, icons, diagrams: they must rescale and recolor as a system, and raster is soft at every size
  but one. Use [`66-vector-illustration`](66-vector-illustration.md) and
  [`68-iconography`](68-iconography.md).
- Flat-color work going to one- or two-ink print, where raster noise fights the halftone screen.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Painting at screen size, then upscaling 200% | 3 px detail becomes mush, edges halo | Paint at 2× the placement box from the start |
| Twenty adjustment layers labelled "fix" | Value structure drifts toward gray | One layer per function, eight maximum |
| Rendering every pore at A2 | Detail under 0.3 mm at 2 m is invisible | Stop at texture, move detail to the focal third |
| Saturation to fix weak values | Chroma cannot separate what value does not | Re-block in grayscale, re-tint |

## Practical Examples
A 1080×1350 px gig poster carries a painted portrait in a 620×930 px zone at (60, 120); the source is
1240×1860 px. Shadow shapes sit on Multiply at 30%, rim light on Overlay at 20% in `#F2C14E`, and a 4%
grain layer at 3 px ties the portrait to the flat `#12100E` ground. At 25% zoom the silhouette still
reads — pass that before any color decision.

## Related Rules
- [`66-vector-illustration`](66-vector-illustration.md) — the sibling mode for anything that must scale cleanly.
- [`63-light-and-shadow`](63-light-and-shadow.md) — supplies the light logic the brush marks describe.
- [`83-resolution-and-raster-formats`](83-resolution-and-raster-formats.md) — the PPI arithmetic this rule defers to.
- [`75-visual-effects`](75-visual-effects.md) — where grain and glow belong once the painting is done.
- [`64-texture-and-patterns`](64-texture-and-patterns.md) — building the texture layer instead of downloading one.

## Sources
- *Graphic Artists Guild Handbook*, "Illustration" — illustration is licensed by use, so the deliverable is a sized file, not a canvas.
- Itten, *The Elements of Color* — value structure as the armature color sits on.
- Horstman, *Interacting with Color*, p. 57 — quantity, not color choice, decides whether a combination holds.
