# Rule: Memphis Design

**Domain:** history · **ID:** `108-memphis-design`

## Purpose
Build a piece that is loud on purpose: clashing saturated color, pattern on every surface, chunky
outlined geometry, and controlled scatter — the commercial language of 1980s Milan.

## Definition
Memphis (1981–1988) mixes four to six saturated hues that are not supposed to go together, covers
surfaces with geometric pattern, outlines shapes in heavy black, tilts elements off-axis, and treats
asymmetry as play rather than as tension.

## Core Principles
- Color clashes by design: at least one pair from the "wrong" set (pink/green, yellow/violet,
  red/cyan), all at full saturation.
- Pattern covers surface — dots, stripes, terrazzo speckles, squiggles — at two or three scales in
  one composition.
- Geometry is chunky and outlined: 4–6 px black contours unify whatever colors collide.
- Scatter, not alignment: elements float and tilt 5–15°, but the tilt comes from a fixed angle set.
- Black is the moderator — an outline, a ground, or the type — and it is what makes the clash
  readable rather than accidental.
- It was commercial: this language belongs on sleeves, posters, packaging, and title cards, not on
  serious editorial.

## Techniques
1. **Palette of four** — `#FF4FA3`, `#00C2A8`, `#FFD400`, `#7B4BFF` on `#FFF8E7` or `#111111`. Four,
   not six: the fifth hue adds noise, not delight.
2. **Three pattern tiles** — a 24 px dot grid, a 12 px stripe, a squiggle `path`. Assign one pattern
   per surface; never two patterns inside one shape.
3. **Outline rule** — every shape gets a 4–6 px `#111111` outline or none at all. Mixed stroke
   presence is what makes a piece look accidental instead of composed.
4. **Tilt from a set** — angles drawn only from {−12°, −6°, 0°, 6°, 12°}; cluster three to five
   elements so the scatter reads as rhythm.
5. **Copy the play, avoid the novelty** — copy: clashing palette, tiled pattern, chunky outlines,
   controlled tilt, black moderation. Avoid: 1980s sunset gradients, VHS scanlines, gradient-mesh
   blobs, confetti with no grid, and Memphis on anything that has to be trusted.

## When to Use
- Music and event promotion, fashion, youth products, CPG packaging aimed at nostalgia.
- Title cards and motion graphics, where the energy is the whole point.

## When to Avoid
- Finance, health, and enterprise software.
- Long-form reading: six hues and pattern behind text destroy the measure.
- Anywhere the palette would obscure data or navigation state.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Six hues at equal area | No anchor; the eye slides off | Three dominant, one accent, plus black |
| Tilting everything | Vibration instead of composition | Fixed angle set; text stays horizontal |
| Pattern with no scale contrast | Flat noise | One 12, one 24, one 48 px motif |
| Memphis on a banking app | Undercuts trust instantly | Keep it in entertainment contexts |

## Practical Examples
A 1080×1080 record sleeve:

- Field `#FFF8E7`; a 1080×420 `#FF4FA3` band at y=660; a 300×300 `#00C2A8` `ellipse` at (780, 240)
  with a 6 px `#111111` outline.
- A 24 px dot grid tiled in 20% `#111111` over the pink band only — one pattern, one surface.
- "SIDE A" 128 px/800 `#111111` at x=64 y=120, tilted −6°, with a 4 px `#7B4BFF` offset copy behind
  it at (+8, +8); the track list below is 20 px/600, horizontal, untilted — one readable block.

## Related Rules
- [`100-design-movements`](100-design-movements.md) — the constraint method applied to a decade rather than a doctrine.
- [`107-postmodernism`](107-postmodernism.md) — the same quotation impulse with irony attached.
- [`64-texture-and-patterns`](64-texture-and-patterns.md) — building tiles that repeat without seams.
- [`11-color-harmony`](11-color-harmony.md) — why deliberate clash needs a structural anchor.

## Sources
- Radice, *Memphis: Research, Experiences, Results, Failures and Successes of New Design* — the movement's own account of its palette and forms.
- Heller & Chwast, *Graphic Style* — Memphis as a commercial graphic language rather than a furniture style.
- Sottsass and Memphis Milano catalogues, 1981–1986 — the laminate surfaces and pattern sets the graphic work copied.
