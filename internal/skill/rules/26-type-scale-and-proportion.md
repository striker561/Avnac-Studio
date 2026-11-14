# Rule: Type Scale and Proportion

**Domain:** typography · **ID:** `26-type-scale-and-proportion`

## Purpose
Generate the sizes instead of inventing them, choose a ratio that fits the number of levels and the canvas, and let the scale respond to viewport without flattening the hierarchy.

## Definition
A modular scale is a geometric series of sizes, s_n = s_0 × r^n, where s_0 is the body size and r is a fixed ratio. The ratio sets how far apart adjacent levels sit, and therefore how many levels a format can hold.

## Core Principles
- Ratio follows level count: three levels want 1.333–1.5, four want 1.25, five or six want 1.2, dense interfaces 1.125. More levels need a smaller ratio or the top step outgrows the canvas.
- From a 16 px base, 1.25 gives 16, 20, 25, 31, 39, 49; 1.5 gives 16, 24, 36, 54, 81. A 1080×1350 poster carries four of the 1.5 steps; a dashboard carries six of the 1.25 steps.
- One ratio per design. Two scales on one page produce two hierarchies and therefore none.
- Round once, at the end. 16 × 1.25 = 20.0, 25.0, 31.25 → 31, 39.06 → 39; recomputing from rounded values drifts 3–5% by the fifth step.
- A 1.2 step is subtle below 18 px and can read as the same level (see 24). If two levels look equal, use a larger ratio, not another weight.
- Responsive type compresses the ratio, not the body: body stays 16–18 px while the top steps come down.

## Techniques
1. **Pick the ratio from the level count.** Three levels → 1.5; four → 1.25 (1.333 on large formats); five → 1.2; six or more → 1.125.
2. **Generate, then round once.** 16 × 1.333 = 21.3, 28.4, 37.9, 50.6 → 21, 28, 38, 51. Write those as tokens, `--fs-1` through `--fs-5`.
3. **Step below the base with the same ratio.** 16 / 1.25 = 12.8 → 13 for captions; 16 / 1.5 = 10.7 → 11 for legal.
4. **Compress at the breakpoint.** Below 600 px, drop the top step rather than scaling everything by 0.8: a 48 px headline becomes 36 px and body stays 16 px.
5. **Compensate optically.** Above 96 px, −1% to −3% tracking and, on heavy faces, one weight down (see 22).

## When to Use
- A new design system, where every size must be derivable rather than chosen per screen.
- A responsive layout where the same hierarchy has to survive three widths.

## When to Avoid
- A layout with one text size does not need a scale; it needs a size.
- Don't force the golden ratio onto an interface: 16 × 1.618 = 25.9, and the next step is 42 px, which no component needs.
- Don't scale body text fluidly from 12 to 20 px; small screens get unreadable or large screens get absurd.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Two ratios on one page | Two hierarchies, no hierarchy | Pick one, derive everything |
| Rounding at every step | The top level drifts 3–5% | Round once at the end |
| Scaling body with the viewport | Body lands at 12 px on phones | Body fixed at 16–18 px, display scales |

## Practical Examples
A 1080×1350 poster, base 20 px, ratio 1.5: 20, 30, 45, 68, 101. Four steps are used — body 20/1.5, subhead 30/1.2, headline 45/1.1, and 68/1.0 with −2% tracking. The 101 px step exists for one word, "SALT", used once. At 600 px wide the two top steps drop to 45 and 30 while body stays at 20.

## Related Rules
- [`20-typography-fundamentals`](20-typography-fundamentals.md) — the six values the scale fills in.
- [`22-type-anatomy`](22-type-anatomy.md) — x-height ratios that make equal sizes read unequal.
- [`24-typographic-hierarchy`](24-typographic-hierarchy.md) — the jumps the reader actually perceives.
- [`27-readability-and-legibility`](27-readability-and-legibility.md) — the floor the smallest step cannot cross.
- [`95-responsive-interface-design`](95-responsive-interface-design.md) — breakpoints and fluid type in practice.

## Sources
- Müller-Brockmann, *Grid Systems in Graphic Design*, p. 15 — grid fields correspond in depth to a specific number of lines of text, so type size and leading determine the grid.
- Cheng, *Designing Type*, p. 140 — x-height ratios change apparent size, so equal nominal steps do not produce equal jumps.
- Bringhurst, *The Elements of Typographic Style* — proportional type scales and the discipline of deriving sizes rather than picking them.
