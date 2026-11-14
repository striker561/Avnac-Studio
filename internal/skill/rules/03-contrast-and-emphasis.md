# Rule: Contrast and Emphasis

**Domain:** foundations · **ID:** `03-contrast-and-emphasis`

## Purpose
Point the design at one thing at a time. Contrast is how a canvas says "look here"; emphasis is the deliberate spending of contrast on the element that must be seen first. Choosing the wrong kind of contrast, or spending it everywhere, is the most common cause of a design that is loud and unread.

## Definition
Contrast is a perceptible difference across an edge: size, weight, value, hue, chroma, texture, orientation, position, or density. Emphasis is contrast concentrated on one element while the rest holds a lower, consistent level. Contrast is always relative: a 20 px gap reads large among 8 px gaps and small among 64 px ones.

## Core Principles
- Contrast is a relationship, not a property. Nothing is "high contrast" until you name what it contrasts with.
- One axis per emphasis. Size plus weight plus color plus shadow is inflation; each addition halves the effect of the others.
- Go to the extreme. A jump from 16 to 24 px is a murmur; 16 to 56 px is a statement. Half-measures read as mistakes.
- The field sets the baseline. The cheapest way to make one element loud is to quiet everything around it.
- Isolation is contrast of position: 3× clear space emphasizes an element without changing the element.
- Contrast budget: total loudness is fixed by the format. Spend it once, twice at most, per canvas.

## Techniques
1. **Choose the axis from the content** — size for posters, value for UI, isolation for photo-led layouts, texture for line work, orientation for grids of similar items.
2. **Make the jump measurable** — at least 1.5× size, two weight steps, 30% value, or 8× area. Write the values down so the next pass cannot drift.
3. **Isolation emphasis** — clear 3× the element's usual gap around it: 120 px of empty canvas around a 40 px seal.
4. **Build confrontation pairs** — thick/thin, straight/curved, dense/open, black/white. Pair them deliberately, then decide which of the two wins.
5. **Count the pops** — blur the canvas and count what still stands out. One for a poster, two for an editorial page, three maximum for a dashboard.

## When to Use
- A piece must stop a scroll, sell one thing, or direct one action.
- A composition reads flat despite good content.
- A data display must show one number above all others.

## When to Avoid
- Dense reference material where users compare values across rows; equal contrast supports scanning.
- When emphasis would imply importance the content does not have, such as a legal line set as loudly as a price.
- When the contrast is purely decorative and adds no information.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Bold + bigger + colored + shadow | Everything shouts; nothing lands | One axis; revert the others |
| Gray-on-gray subtlety at 2:1 | Unreadable in daylight and print | 4.5:1 for text, 3:1 for large shapes |
| Contrast that vanishes in grayscale | Emphasis was hue-only | Add value or size |
| Emphasis applied to six items equally | No hierarchy, only noise | Choose one, rank the rest |

## Practical Examples
A 1080×1080 clearance tile. Ground `#F2EEE7`, one product at 640 px wide, price "−40%" at 220 px `#111111`, everything else 28 px or smaller. One axis: size. The product photo is desaturated 20% so the numerals win without competing.

At 270×270 the price is still 55 px, so the tile survives as a feed thumbnail, which is where it will actually be seen. On a 135 px-wide browser tab it finally collapses to "−40%" alone, which is still the message.

## Related Rules
- [`02-visual-hierarchy`](02-visual-hierarchy.md) — the order that emphasis is used to build.
- [`09-figure-ground`](09-figure-ground.md) — value contrast at the boundary, the hardest case.
- [`14-color-contrast`](14-color-contrast.md) — hue and value contrast ratios, with numbers.
- [`36-scale-and-proportion`](36-scale-and-proportion.md) — size as the most reliable contrast axis.

## Sources
- Hofmann, *Graphic Design Manual*, p. 136 — the confrontation studies: horizontal/vertical, dot/line, black/white. Contrast is constructed in pairs.
- Horstman, *Interacting with Color*, p. 67 — contrast named by kind: hue, temperature, saturation.
- Horstman, *Interacting with Color*, p. 53 — equal intervals of difference and equal hardness of boundary: match degrees of difference, not absolute values.
