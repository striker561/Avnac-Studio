# Rule: Gestalt Principles

**Domain:** psychology · **ID:** `40-gestalt-principles`

## Purpose
Tells you why a viewer reads six elements as two groups before decoding any of them, and how to make that happen on purpose. Reach for it when the complaint is "it looks cluttered" but nothing on the canvas is crowded.

## Definition
Gestalt principles are the perceptual shortcuts that organize marks into wholes: proximity (near means related), similarity (alike means related), closure (the eye completes gaps), continuity (aligned things read as one path), and common fate (shared direction means one set). They describe perception, not intent — the viewer groups whatever you draw, planned or not.

## Core Principles
- Proximity is the strongest cue: space inside a group must be at least half the space between groups; at a 1:1.2 ratio the eye merges them.
- Similarity overrides proximity when the difference is large: one `#C2410C` label among twelve `#111111` labels reads as its own set inside a tight block.
- Closure makes an unclosed shape work: a 2 px arc with a 40% gap reads as a circle at 64 px and above; under 24 px the gap reads as damage.
- Continuity is alignment made visible: a shared left edge builds a column, a 1 px offset builds a seam the eye reads as an error.
- The cues rank — proximity over similarity over continuity over closure in dense layouts — so spend the strongest cue on the most important boundary.

## Techniques
1. **Fix three spacing tiers before drawing** — 8 px inside a unit (label to value), 24–32 px between units, 64–96 px between sections. Never ship a gap that falls between tiers.
2. **Separate with value when space is unavailable** — alternate `#FAFAFA` and `#FFFFFF` table rows, or add a 1 px `#E5E5E5` rule, so proximity stops doing the grouping.
3. **Use one container edge, not many** — one box around a set of controls, dividers only where the set splits; a box per item makes every group equal.
4. **Blur-check at 6 px** — at 100% zoom the surviving clusters are the groups perception builds. Anything merged there is merged for the viewer.

## When to Use
- Any zone with more than four elements: nav bars, cards, pricing tiers, label-value pairs.
- When a client says "busy" or "I don't know where to look" and nothing is actually tight.
- Choosing whether a rule, a box, or white space should carry a separation.

## When to Avoid
- Deliberately interleaved content — a color-keyed timeline, an annotated diagram — where the eye must connect non-adjacent items. Spacing tiers then fight the reading.
- Do not use spacing to fake hierarchy in type: no gap turns 16 px body into a headline.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| The same 16 px gap everywhere | The viewer invents groups you did not intend | Three tiers: 8 / 32 / 80 px |
| A box around every item | Every closure cue is equal, so no higher group forms | One container, internal dividers |
| Centered heading over left-aligned body | Continuity breaks; the block reads as two | One axis — left-align both |
| Caption at body size and weight | Similarity merges two distinct levels | Two weight steps or a 30% value shift |

## Practical Examples
A 1200×800 pricing block: three `rect` cards 340×520 at x=60, 430, 800, 30 px gaps, 60 px to the canvas edge. Inside each card: plan name 24 px Semibold 28 px from the top; price 56 px Bold 8 px under it (same unit); features 15 px/1.5 32 px under the price (new unit); CTA 12 px under the list. Every card insets its text 24 px from the left edge, so continuity ties the columns while proximity keeps each card's units apart.

## Related Rules
- [`07-alignment-and-proximity`](07-alignment-and-proximity.md) — the layout mechanics these cues run on.
- [`02-visual-hierarchy`](02-visual-hierarchy.md) — grouping fixes the order of reading, not only the sets.
- [`09-figure-ground`](09-figure-ground.md) — closure and continuity at the subject/background boundary.
- [`30-grid-systems`](30-grid-systems.md) — a grid is continuity enforced across a whole document.

## Sources
- Wertheimer, "Laws of Organization in Perceptual Forms" (1923) — the original statements of proximity, similarity and closure.
- Arnheim, *Art and Visual Perception*, ch. "Shape" — grouping and balance in composed form.
- Müller-Brockmann, *Grid Systems in Graphic Design*, "Construction of the grid" — continuity made systematic.
