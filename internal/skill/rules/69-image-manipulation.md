# Rule: Image Manipulation

**Domain:** imagery · **ID:** `69-image-manipulation`

## Purpose
Change what a photograph shows without leaving evidence of the change. Retouching is credibility work:
the viewer must read the result as a photograph taken, not assembled, and disclosure is a decision, not
an accident.

## Definition
Retouching alters pixel evidence inside one photograph: marks, objects, shape, color. Compositing merges
two or more sources into one scene. Both are judged by one test — does the result obey a single light, a
single lens, and a single surface?

## Core Principles
- Match three physics or fail: one light direction within 15°, one horizon and vanishing point, one lens
  (focal length, grain, depth of field).
- Work non-destructively: duplicate the layer, mask the change, keep the untouched original in a hidden
  group. A retouch you cannot undo becomes a reshoot.
- Clone along the grain, from a zone at the same distance from focus and the same side of the light.
  Sampling across a shadow line transplants a seam.
- Keep skin texture. At 100% zoom pores must survive; the shape of a jaw or waist is not a blemish.
- Disclose any change that alters what a person appears to have done or looked like, and never retouch
  news, documentary, or evidence images — that is fabrication, not design.

## Techniques
1. **Object removal in four passes** — structure (patch or large clone at 60–80% hardness), seams (spot
   heal), texture (clone with grain), then a global grain match. Check three spots at 100%.
2. **Black-point match** — sample a neutral shadow and highlight in both sources and bring them within
   2–3 RGB levels. A 5-level mismatch reads as a cut-out even under a perfect mask.
3. **Contact shadow** — every inserted object needs a shadow at the scene's light angle, with edge
   softness matched to its height above the surface. No shadow is the loudest tell.
4. **Two-zoom audit** — 100% for seams and repeated clone patterns, 25% for tonal mismatch, plus one pass
   in grayscale, where color no longer masks value differences.

## When to Use
- Dust, scratches, sensor spots, and stray background objects on product or portrait shots.
- Extending a background or sky to fit a crop, when the added area keeps the same light and grain.
- Assembling a scene from separate shots made with one lens and one lighting setup.

## When to Avoid
- News, documentary, legal, and medical imagery; the change is the story, so there is no acceptable retouch.
- When the licence forbids derivative works or the stock image is editorial-only — see
  [`70-photography-and-imagery`](70-photography-and-imagery.md).
- When a reshoot costs less than the seam work; a real photograph is always more believable.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Removing an object but not its shadow | Object floats, ground looks painted | Rebuild the cast shadow first |
| Cloning a tiled texture | Visible wallpaper pattern at 100% | Vary, mirror, and rotate sources |
| Smoothing skin to plastic | Destroys identity, reads as CGI | Heal spots only, opacity ≤ 40% |
| Compositing two white balances | One subject warm, one green | Match neutrals, then grade the pair |
| Hard 0 px mask edge | Cut-out line visible at every zoom | 1.5–2 px feather plus edge clone strip |

## Practical Examples
A 1080×1080 px product poster has a light stand at (812, 240) behind the bottle. Patch the background from
the left third, heal two seams at 8 px, clone wall texture back at 15% opacity, and run 4% grain. Rebuild the
contact shadow with Multiply at 22% in `#1A1A1A`, angled 20° from vertical to match the key light. At 100%
the wall shows one grain structure; at 25% the bottle sits on the surface.

## Related Rules
- [`74-masking-and-blending`](74-masking-and-blending.md) — the mask and blend mechanics behind every composite.
- [`70-photography-and-imagery`](70-photography-and-imagery.md) — licensing and releases limit what may be altered.
- [`72-image-treatment`](72-image-treatment.md) — the global grade that hides small mismatches.
- [`118-ai-assisted-design`](118-ai-assisted-design.md) — disclosure and cleanup for generated imagery.

## Sources
- *Graphic Artists Guild Handbook*, p. 645 — compositing creates a derivative work of each contributing image; mechanical and artistic changes are treated differently.
- *Graphic Artists Guild Handbook*, p. 662 — *Warhol v. Goldsmith*: commercial alteration is not automatically transformative.
- National Press Photographers Association, Code of Ethics — no manipulation of news images (professional convention).
