# Rule: Visual Perception

**Domain:** psychology · **ID:** `41-visual-perception`

## Purpose
Explains how the eye physically samples a canvas — in jumps, with a tiny high-resolution center — so you put messages where resolution exists instead of expecting the periphery to read.

## Definition
Perception runs on fixations (pauses of 200–300 ms) joined by saccades (jumps of 20–40 ms, about three or four per second while reading). Only the fovea — about 2° of visual angle — resolves detail; the periphery detects luminance contrast, motion and gross shape, and it chooses where the next fixation lands. A layout is seen in three to six glimpses, never as a whole.

## Core Principles
- At 60 cm on a phone, 2° covers about 350 px of a 1080 px-wide screen. Anything meant to be read must sit inside a fixation; anything outside is a blur that only says "something is over here".
- The periphery is tuned to contrast and motion, not text. A 6:1 dark-on-light block at the edge pulls the eye before a 12 px caption at the center.
- Gist forms in about 50 ms — one glance that reads silhouette, color and one large word, and decides whether the viewer keeps looking.
- Reading is not linear: the first fixation lands near the optical center of a block, then moves in hops of roughly seven to nine characters.
- Change blindness is real: a viewer comparing two versions will miss a swapped 16 px label. Never let a small change carry the argument.

## Techniques
1. **50 ms glance test** — export at 25% zoom, look once, look away, write down what you saw. If it isn't the intended first message, the hierarchy is inverted, not the color.
2. **Blur ladder** — 16 px blur is the poster-at-distance read, 8 px the shelf read, 4 px the first-screen read; check the same layout at all three.
3. **One fixation zone per message** — keep a headline and its subhead inside roughly 350×350 px so one fixation takes both; 900 px apart costs a saccade and a beat of comprehension.
4. **Give the periphery a job** — put next-step cues (logo, folio, "continued inside") at the edges, where low acuity only has to register presence.
5. **Test at final size** — a poster read at 3 m needs roughly 3× the type size of the same layout at 1 m.

## When to Use
- Any layout with a primary message and a two-second window: posters, billboards, social cards, hero screens.
- Auditing whether a design "works at a glance" before spending time on detail.

## When to Avoid
- Long-form reading, where measure, leading and paragraph shape matter more than fixation placement.
- Dense reference material: a viewer scanning a table for one value is doing deliberate search, and a one-message layout destroys that speed.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Critical detail in the outer 10% | Lands in low-acuity periphery and risks trim | Move inside a 90% safe zone |
| Two messages 500 px apart | Forces two fixations and a comparison nobody makes | Stack them within one 350 px zone |
| Judging at 100% on a desktop monitor | Simulates a viewing distance no viewer has | Test at print size or 25% zoom |
| Relying on a 14 px footnote | Never fixated; the glance never reaches it | Promote it or delete it |

## Practical Examples
A 1200×628 link card: headline "Ship your first print run" at 44 px Semibold, x=80, y=210; subhead 18 px at y=268, so both sit inside one 340×340 fixation zone on the left. The product photo fills the right 40%, cropped at the canvas edge so its silhouette reads in the glance. Logo 120 px wide, 40 px from the bottom-left corner — a peripheral cue that only needs to register. At 25% zoom the headline survives and the subhead blurs to a gray band, which is acceptable: the headline carries the message.

## Related Rules
- [`43-attention-and-eye-tracking`](43-attention-and-eye-tracking.md) — what wins the fixation once it lands.
- [`02-visual-hierarchy`](02-visual-hierarchy.md) — the order these glimpses produce.
- [`09-figure-ground`](09-figure-ground.md) — silhouette is what the glance actually reads.
- [`27-readability-and-legibility`](27-readability-and-legibility.md) — the reading regime where fixation stops being the constraint.

## Sources
- Tufte, *The Visual Display of Quantitative Information*, p. 172 — designing so the whole display is perceived in one pass, with minimal eye movement.
- Lindgaard et al., "Attention web designers: You have 50 milliseconds to make a good first impression!" (2006).
- Ware, *Information Visualization*, ch. "Visual Features" — preattentive processing and its limits.
