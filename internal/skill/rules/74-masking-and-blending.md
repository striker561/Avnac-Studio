# Rule: Masking and Blending

**Domain:** imagery · **ID:** `74-masking-and-blending`

## Purpose
Cut, composite, and merge images so no seam shows and depth reads as physical. Masking is where compositing
succeeds or fails: a perfect grade over a hard-edged cut-out still reads as a sticker.

## Definition
A mask is per-pixel coverage — 0 to 255 — that decides how much of a layer reaches the composite. A blend mode
is the arithmetic that combines a layer with what is beneath it. Together they answer two questions: what is
visible, and how it mixes.

## Core Principles
- Match the masking tool to the edge: pen path for manufactured edges, channel or select-and-mask for hair and
  foliage, hand-painted mask for organic transitions.
- Keep feather small: 0.5–1.5 px at final size. Above 3 px the edge glows, and a glow reads as a bad cut-out
  from across a room.
- Assign blend modes by job. Multiply darkens (shadows, tinting), Screen lightens (glow, smoke, glass), Overlay
  and Soft Light add contrast (grades), Color tints while keeping luminance. Difference and Exclusion are
  effects, never structure.
- Build depth with three cues at once — contrast, temperature, sharpness. Any one alone reads as a filter.

## Techniques
1. **Edge integration, five steps** — mask, match black and white points (±2 levels), add 10–15% color spill,
   matched grain, then a contact shadow. Skip one and the seam returns.
2. **Multiply shadow build** — a broad Multiply at 25–35% plus a tighter core at 45–60%. One flat black ellipse
   at 80% is the classic tell of a pasted object.
3. **Clipping group** — put grade, grain, and scrim inside the image's clip so treatment stops at the edge.
4. **Depth stack** — three planes at blur 0/6/14 px, lightness 0/−8/−16%, temperature +0/+150/+350 K; the far
   plane loses contrast, cools, and softens in that order.
5. **Mask audit** — invert the mask to find leaks, contract 1 px to kill a light fringe, inspect three edges at
   400%. Fringes are invisible at fit and obvious on press.

## When to Use
- Composite subjects into a new background or onto a colored ground.
- Isolate a subject so type can pass behind it — the "cut-out over headline" layout.
- Grade or tint one region of a photograph without touching the rest.

## When to Avoid
- When a reshoot or a different crop would solve it; masking the same weak image harder never fixes the image.
- Hero billboard work from a low-resolution source: a 600 px subject upscaled to 4 m exposes every mask edge.
- Fine hair against a busy background in a low-contrast image; choose a different frame instead.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Lasso-only mask | Faceted edges at any zoom | Pen path or channel mask, 1 px feather |
| 8 px feather to hide a bad edge | A visible halo replaces a visible edge | 0.5–1.5 px feather, fix the edge itself |
| Flat 80% black shadow | Object floats, ground looks burnt | Two Multiply passes at 25–35% and 45–60% |
| Color mode for shadows | Luminance stays lit, object glows | Multiply for shadow, Color for tint |
| White fringe on a cut-out | Lighter pixels survive the mask edge | Contract 1 px, clone 2–3 px of background in |

## Practical Examples
A 1080×1350 px poster composites a studio portrait onto a flat `#E8E2D6` ground. The subject is cut with a pen
path, 1 px feather, contracted 1 px, then given 12% spill of `#E8E2D6` along the warm side. A broad Multiply at
30% plus a 55% core sits under the feet, and 3% grain at 2 px runs over the composite so cut-out and ground
share one noise floor. At 400% the hair edge shows no light halo.

## Related Rules
- [`69-image-manipulation`](69-image-manipulation.md) — the retouching that precedes and follows a composite.
- [`75-visual-effects`](75-visual-effects.md) — blur and glow used deliberately rather than as a fix.
- [`35-perspective-and-depth`](35-perspective-and-depth.md) — the depth cues this rule applies at pixel level.
- [`09-figure-ground`](09-figure-ground.md) — separating subject from ground by value, before masking.
- [`72-image-treatment`](72-image-treatment.md) — the grade that unifies cut-out and background.

## Sources
- Hofmann, *Graphic Design Manual*, "Figure and ground" — separation is created at the boundary, so the boundary deserves the detail.
- Itten, *The Elements of Color* — value and temperature as the carriers of depth.
