# Rule: Color Theory

**Domain:** color · **ID:** `10-color-theory`

## Purpose
Give the agent a working model of color — three coordinates and two mixing systems — and a way to use color inside a design system instead of choosing it element by element. Most color arguments are really arguments about value and role.

## Definition
Color is a point in a three-dimensional space: hue (the angle, red through violet), value (lightness, black to white), and chroma (distance from gray). Additive mixing combines light — RGB, screens — and sums toward white. Subtractive mixing combines pigment or ink — CMY plus K — and subtracts toward black.

## Core Principles
- Value does the work; hue does the labeling. Sort any palette into grayscale first: if the values collapse, the palette fails no matter which hues were chosen.
- Name three coordinates for every color, or it cannot be reproduced, adjusted, or documented.
- Screen and print are different media: `#FF0000` on sRGB and the CMYK build of red will not match without conversion and proof.
- Colors in a system are roles, not swatches: surface, text, accent, success, warning, error. A role may change hue; the structure stays.
- Ramps beat single colors. Build 6–10 steps per hue so hover, border, subtle background, and text can come from one family.
- Keep the hue count low: one dominant hue, one accent hue, and a neutral ramp covers most work.

## Techniques
1. **Name by role and step** — `surface-100`, `ink-900`, `accent-600`. A hex without a role gets misused within a week.
2. **Build the ramp in OKLCH** — hold hue, step lightness by 6–10 points, convert to hex only at export (see 15).
3. **Set the neutrals first** — six steps from `#F7F7F5` to `#141414` with a slight warm or cool bias; pure gray looks dead beside saturated color.
4. **Check the value sequence** — convert to grayscale and confirm that colors you will place adjacent differ by at least 15% lightness.

## When to Use
- Any multi-element design.
- Building a palette from a brand color.
- When a color "looks wrong" and nobody can say why: check value before hue.
- When specifying colors for another person, a printer, or a codebase.

## When to Avoid
- Single-color work where only value matters; don't build nine steps for a three-element flyer.
- Before contrast requirements are known — determine the contrast targets first (see 14).
- When the medium is fixed and narrow, such as one spot ink, where a ramp cannot exist (see 17).

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Choosing by hue and ignoring value | Turns to mud in grayscale and in print | Sort by value first |
| Every color at maximum chroma | No hierarchy; the page vibrates | Saturate one, neutralize the rest |
| Four or more hues | No dominant family; parts look unrelated | One dominant, one accent, neutrals |
| A hex sampled from a photo | Sampled pixels are noise, not an intended color | Rebuild the color deliberately |
| Pure `#000000` for long body text | Harsh edges and tired eyes on screen | `#111111`–`#1A1A1A` |

## Practical Examples
A 1080×1080 tile system: `--surface-50 #F5F3EE`, `--surface-200 #E3DED4`, `--ink-900 #171614`, `--accent-600 #C8452B`. Their grayscale values are roughly 96, 86, 9, and 42 — four distinct steps, one accent.

The accent covers about 6% of the canvas and appears only on the action; the neutrals carry everything else. Swap it to `#2B4BC8` and the tile still works: the system is built on value and role, not one lucky hue.

## Related Rules
- [`11-color-harmony`](11-color-harmony.md) — which hues to combine once the model is in place.
- [`13-color-perception`](13-color-perception.md) — why the same value looks different on different grounds.
- [`15-color-systems-and-models`](15-color-systems-and-models.md) — RGB, CMYK, HSL, OKLCH, and gamut limits.
- [`16-palette-construction`](16-palette-construction.md) — turning these roles into a full palette.
- [`55-brand-color-and-typography`](55-brand-color-and-typography.md) — choosing the brand hue itself.

## Sources
- Horstman, *Interacting with Color*, p. 68 — a six-wedge wheel of pigment is a useful simplification; on screen, color behaves as both pigment and light.
- Horstman, *Interacting with Color*, p. 69 — the color globe: hues around the equator, white at the north pole, black at the south.
- Itten, *The Elements of Color* — primary and secondary relations, and the color solid as an ordering device.
