# Rule: Color Contrast

**Domain:** color · **ID:** `14-color-contrast`

## Purpose
Decide how much difference a pair of colors needs and where to spend it. Value contrast buys legibility, hue contrast buys identity, and a page that spends its strongest contrast everywhere reads as uniformly loud.

## Definition
Color contrast is the perceived difference between two adjacent colors: mostly lightness (L*), then hue and chroma. Two hues 180° apart read as one tone if their L* sits within 5; two grays 40 L* apart read as different colors. Value contrast survives a grayscale copy; hue contrast does not.

## Core Principles
- Body text needs 4.5:1 against its real background, 3:1 at 24 px or 18.66 px bold, 7:1 for sustained reading (WCAG 2.2 SC 1.4.3, 1.4.6). On white, #767676 is 4.54:1, #949494 is 3.03:1, #111111 is 18.9:1.
- Budget by hierarchy: one element takes the top of the range (~18:1), every other level sits at least 30 L* below it. Two elements at 18:1 means neither leads.
- Judge in grayscale first. If the composition holds with hue removed, the structure is sound and color is reinforcement.
- Contrast belongs to the adjacency, not the swatch: #767676 is mid gray on white and light gray on #1B2A41 (4.8:1 there).
- Dark themes are not inverted light themes. At 21:1 (#FFFFFF on #000000) thin text halates; cap dark-theme text near 15:1 and lift surfaces instead of casting shadows.

## Techniques
1. **Compute, don't eyeball.** Linearize each channel (c/255 ≤ 0.03928 → c/12.92, else ((c/255+0.055)/1.055)^2.4), weight 0.2126/0.7152/0.0722, then (L_light+0.05)/(L_dark+0.05). If the pair fails, move the text step and keep the hue.
2. **Build a value ladder on white:** #111111 at 18.9:1, #4D4D4D at 8.5:1, #767676 at 4.5:1, #949494 at 3.0:1. Assign primary, secondary, tertiary, and non-text respectively; anything lighter is ornament.
3. **Rebuild dark themes by elevation:** base #121212, raised #1E1E1E, overlay #2C2C2C; text #E8E8E8 (~15:1) and #A0A0A0 (~7:1). Elevation is a lightness step, not a shadow.
4. **Run the hue-only test.** Replace every color with its L* equivalent. If two functional elements merge, the design depended on hue; add a value step (see 18).

## When to Use
- Every text/background pair, icon, 1 px rule, chart series, and interaction state.
- When feedback says "make it pop" — usually a contrast budget problem, not a saturation problem.

## When to Avoid
- Over photography, where no single ratio holds across the image. Add a 40–60% black scrim or a solid plate behind the text instead of sampling pixels.
- Don't force 7:1 onto 120 px display type; large type is legible at 3:1 and the extra darkness flattens the sheet.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Colored text on a same-L* ground | Vanishes in grayscale and for colorblind readers | Hold the hue, add a 30+ L* step |
| #000 on #FFF for every pair | Halation and reading fatigue at 21:1 | #111111 on #FAFAFA, about 16:1 |
| Inverting the light palette for dark mode | Highlights blow out, shadows vanish | Rebuild surfaces by elevation |
| Judging a swatch in isolation | The neighbor changes the perceived value | Test in place at 100% and 25% |

## Practical Examples
A 1080×1350 poster on #1B2A41 (L* ≈ 17): headline #FFFFFF at 14.4:1, subhead #949494 at 4.8:1, accent #E4572E at 4.2:1 — fine for a 64 px accent word, not for the 18 px date line, which stays #FFFFFF. White reversed out of the accent block is 3.4:1, so that block carries only 40 px+ text or a shape.

## Related Rules
- [`03-contrast-and-emphasis`](03-contrast-and-emphasis.md) — the same budget applied to size, weight, and texture.
- [`13-color-perception`](13-color-perception.md) — why one hex reads differently against different neighbors.
- [`18-color-accessibility`](18-color-accessibility.md) — the ratios as compliance floors, with non-color backups.
- [`24-typographic-hierarchy`](24-typographic-hierarchy.md) — value steps used as typographic levels.

## Sources
- Horstman, *Interacting with Color*, p. 50 — contrast is an interval between adjacent colors; the same pair reads hard or soft depending on its neighbors.
- WCAG 2.2, SC 1.4.3 Contrast (Minimum) and SC 1.4.6 Contrast (Enhanced).
- Müller-Brockmann, *Grid Systems in Graphic Design*, p. 107 — type on a solid color area stays legible when the tint is lighter; darkening the ink costs legibility.
- Tufte, *The Visual Display of Quantitative Information*, "Aesthetics and Technique" — friendly graphics keep tonal separation that color-deficient readers can still decode.
