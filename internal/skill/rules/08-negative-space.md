# Rule: Negative Space

**Domain:** foundations · **ID:** `08-negative-space`

## Purpose
Treat emptiness as a designed quantity rather than a leftover. Space is what makes type legible, groups legible, and a design feel either considered or cramped; it is the cheapest and most reliable signal of quality available to a layout.

## Definition
Negative space is every area not occupied by an element: outer margins, gutters, padding, leading, and the gaps inside forms. It is active when its shape and size are deliberate, and passive when it is whatever remained after placement.

## Core Principles
- Measure space against the short edge: keep type 8% of it from trim, 64 px on 800 px and 108 px on 1350 px.
- Margins should be unequal — largest at the bottom, then the outer edge, then the top. Equal margins read as indecision and flatten the page.
- Containers need padding of 1–2× the body size: 16–32 px around 16 px text. Text touching a box edge reads as an error, not a style.
- Density has a number: 55–75% active area for information-dense work, 25–45% for premium and editorial, under 20% for a single-message poster.
- Space between groups is the cheapest grouping device — cheaper than a rule, a box, or a color, all of which add ink.
- Micro-space counts. Leading, tracking, and the counters inside letters are negative space too; a cramped line-height undoes a generous margin.

## Techniques
1. **Margin ladder** — 1080×1350: 96 px top, 88 px sides, 144 px bottom. The heavy bottom stops the content from falling.
2. **Density budget** — decide coverage before placing (say 35% for an invitation), then count filled cells on a 4×4 grid rather than trusting the eye.
3. **Group gap instead of divider** — delete the rule and raise the between-group gap to 3× the within-group gap.
4. **Pad to the leading** — container padding of one line-height (22–26 px at 16 px body) minimum, on all sides.
5. **Subtraction pass** — remove one element; if the piece improves, it was competing for air. Repeat until removal hurts.

## When to Use
- Premium, editorial, and single-message work.
- When a layout feels cramped, cheap, or "busy" and nothing is actually overlapping.
- When you are about to add a border or a divider to separate content.
- Posters and covers read at distance, where air is the first thing that reads.

## When to Avoid
- Dense reference material — timetables, data tables, dashboards — where users scan comparatively. Reduce chrome there, not data.
- Small formats such as an 85×55 mm card, where space is scarce; use alignment and grouping instead of air.
- Never open space inside a functional block: a gap in the middle of a form or a price table reads as a missing row.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Equal margins on all sides | Page reads flat and indecisive | Ladder: bottom largest |
| Filling an empty corner because it looks wrong | Adds a competing element and destroys focus | Leave it, re-check the density budget |
| Text padded flush to a container edge | Reads as clipping | Padding of at least one line-height |
| Space distributed evenly so groups dissolve | Everything floats, nothing groups | 3:1 gap ratio between groups |

## Practical Examples
A 1080×1350 gallery invitation. Three lines at the top — title 44 px, date 20 px, address 20 px — all at x=88 from y=96. A 24 px `#B9A16B` rule at y=980 crosses the full width inside the margins. The bottom 340 px stays empty.

Active area is about 21%, which is correct for a single-message piece: at 270 px, the invitation still reads as three lines and a gold rule, and the emptiness is what makes it read as a gallery rather than a flyer.

## Related Rules
- [`04-balance-and-proportion`](04-balance-and-proportion.md) — margins are the proportion decision the viewer reads first.
- [`09-figure-ground`](09-figure-ground.md) — space as the ground that lets a figure exist.
- [`30-grid-systems`](30-grid-systems.md) — constructing margins and gutters systematically.
- [`42-cognitive-load`](42-cognitive-load.md) — why air reduces the number of simultaneous decisions.
- [`71-image-composition`](71-image-composition.md) — placing photographs so the empty area has a job.

## Sources
- Müller-Brockmann, *Grid Systems in Graphic Design*, p. 45 — margins of equal size "can never result in an interesting page design"; the wide back margin belongs to the binding.
- Hofmann, *Graphic Design Manual*, p. 66 — the spacing between dots produces either incorporation of the background or separation from it: space generates grouping.
- Arnheim, *Art and Visual Perception* — emptiness as an active part of the visual field.
