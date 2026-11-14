# Rule: Visual Hierarchy

**Domain:** foundations · **ID:** `02-visual-hierarchy`

## Purpose
Decide the order in which the eye takes in every element on the canvas, not only text. A composition with a stated order is read; one without an order is scanned, found wanting, and abandoned.

## Definition
Visual hierarchy is the ranked order of salience across all elements, produced by differences in size, value, color, isolation, position, and detail. A rank exists only where the difference survives blur; a ranking the viewer must compare to notice is not a rank.

## Core Principles
- Three tiers are enough: one primary, one secondary, everything else support. More than three competitors means no hierarchy.
- Rank is assigned, not discovered. Write the order before composing: 1 photo, 2 headline, 3 date, 4 logo.
- Area and value drive the first glance; color follows, then position, then detail. Spend the strongest lever on rank 1 only.
- Position carries rank. The upper-left third is the entry for left-to-right reading; the optical center sits about 5% above the geometric center.
- Hierarchy must survive grayscale and 25% zoom. Color-only ranking fails in print and for colorblind readers.
- Separate notice from read: an image may win attention, but the message must be the second fixation.

## Techniques
1. **Write the reading list** — number every element 1–5 by intended order, then squint at 10%. Where the two disagree, change one variable by a full step.
2. **Blur audit** — at 25% view with an 8 px blur, only two or three blobs should remain. If a support element is one of them, cut its area or contrast.
3. **Cover test** — hide each element in turn. If the order is unchanged, the element is decoration or should be demoted.
4. **One lever for rank 1** — a 4× area, a 30% value difference, or 3× its neighbors' clear space. One of those, not all three.
5. **Zone the canvas** — entry (top 40%), body (middle), signature (bottom 15%). Rank 1 goes in the entry zone unless the image is the message.

## When to Use
- Any canvas with three or more elements.
- When feedback says "flat", "busy", or "I don't know where to look".
- Multi-image posters and hero sections, where photographs compete with type.
- When adding an element: decide which rank it takes.

## When to Avoid
- Indexes, tables, contact sheets, and calendars, where equal weight is the function.
- Deliberately ambiguous posters — even then, keep one entry point.
- Don't invent extra levels to fill space; two clear levels beat four muddy ones.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Two elements share rank 1 | The eye oscillates and neither is read | Demote one by area or value |
| Ranking by color only | Vanishes in grayscale, print, and for colorblind readers | Add a size or isolation step |
| Every element 24 px apart at one weight | Order becomes z-order, which is arbitrary | Three zones, different densities |
| A badge outranking the message | Attention is spent on nothing | Remove it or drop it to support weight |

## Practical Examples
A 1920×1080 hero. Headline "ACCOUNTING THAT CLOSES ITSELF" at 76 px Bold `#0E1116`, x=96, baseline y=470. Subhead 24 px `#4A5560` at y=520. CTA 220×56 px filled `#1F5FFF` at y=600, with 180 px of clear space. Product screenshot 760×620 at x=1060, deliberately low-contrast on the `#F4F6F8` ground.

Reading list: headline 1, screenshot 2, CTA 3, logo 4. In the blurred 25% view the headline and CTA are the two blobs; the screenshot holds just under them because its value sits within 12% of the ground. At 480 px wide the headline and CTA survive and the subhead is lost — acceptable, since the subhead only restates the headline.

## Related Rules
- [`03-contrast-and-emphasis`](03-contrast-and-emphasis.md) — the variables hierarchy is built from.
- [`24-typographic-hierarchy`](24-typographic-hierarchy.md) — the same ordering inside a type system.
- [`40-gestalt-principles`](40-gestalt-principles.md) — why grouping is read before ranking.
- [`43-attention-and-eye-tracking`](43-attention-and-eye-tracking.md) — where the eye lands, including false hierarchy.

## Sources
- Müller-Brockmann, *Grid Systems in Graphic Design*, p. 113 — the 12-field catalogue uses two type sizes; the sequence between plates is designed, because one picture's forms disturb its neighbour.
- Tufte, *Envisioning Information*, "Layering and Separation" — separating elements from the ground creates reading order without adding weight.
- Arnheim, *Art and Visual Perception* — visual weight and the structural hierarchy of the visual field.
