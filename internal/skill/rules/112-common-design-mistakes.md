# Rule: Common Design Mistakes

**Domain:** foundations · **ID:** `112-common-design-mistakes`

## Purpose
Give the agent a triage order for when a composition looks wrong and nothing obvious is broken. These come from
decisions that were never made, so they recur across media and skill levels.

## Definition
A recurring failure is a defect that appears independently of style, subject, or software. Each has a visible
signal and a fix you can type into the canvas.

## Core Principles
In descending order of frequency:

- **No hierarchy.** Everything is roughly the same size and weight, so there is no entry point. Signal: you cannot
  name the first thing you see. Fix: a 3×–4× jump between top level and body.
- **Default spacing and alignment.** Elements sit where the cursor landed. Signal: four or more distinct gaps,
  nothing sharing an edge. Fix: one margin value, one grid, then re-place everything.
- **Too many colors or fonts.** Each solved a local problem. Signal: the palette cannot be listed from memory.
  Fix: three colors, two families, delete the rest.
- **Low-contrast text.** Gray on gray that looked fine on a bright screen. Signal: squint and the paragraph
  dissolves. Fix: 4.5:1 for body, 3:1 at 24 px and above.
- **Crowded or orphaned edges.** Content pressed to the trim, or one element floating 12 px from a corner. Fix:
  mirror the margins; give every element an edge.
- **Inconsistent detail.** Two corner radii, three shadow directions, mixed icon weights. Signal: 200% zoom shows
  disagreements. Fix: tokenize and re-apply.

## Techniques
1. **The squint pass** — zoom to 25% and name the first three things you see. If the order is wrong, stop:
   nothing else can be judged until hierarchy is fixed.
2. **Grayscale conversion** — flatten to grayscale. Anything that vanishes relied on hue alone; colorblind readers
   lost it too.
3. **Edge census** — measure every element's distance to the nearest edge and to its neighbor. More than four
   distinct values means fault 2; set one per role everywhere.
4. **Reduce one thing** — delete the element with the lowest information value, re-render, compare. Repeat until
   the piece gets worse, then restore the last deletion.

## When to Use
- The final review pass, in the order above, before anything is exported.
- When a piece "feels wrong" and no single element is obviously at fault.
- When picking up someone else's file: audit before restyling, or you fix the wrong layer.

## When to Avoid
- During thumbnail exploration, where these checks kill the search before it starts.
- On deliberately messy idioms — punk, brutalism, Memphis — where the faults are the language. There the check
  becomes consistent inconsistency.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Fixing detail before hierarchy | Time spent on a layout that cannot work | Run the six faults in order |
| Adding an element to fix crowding | More content in the same space | Remove the weakest element |
| Judging at 100% on a bright screen | Hides small-size and contrast failures | Check at 25%, then in grayscale |
| Treating a client preference as a defect | Fixes the wrong layer | Ask what felt wrong, then diagnose |

## Practical Examples
A 1920×1080 event banner, audited in order. The headline is 40 px against 32 px body — 1.25×, under the 1.3×
threshold — so it becomes 64 px. Margins read 40/40/60/40 and become 96 px all round. Five colors collapse to
`#12100E`, `#F4EFE6`, `#E8B54B`. The caption at `#8A8A8A` on `#F4EFE6` measures 2.9:1 and moves to `#5E5E5E` at
5.6:1. The logo sits 24 px from the bottom edge and moves to 96 px. Five changes, no new elements, no new fonts.

## Related Rules
- [`02-visual-hierarchy`](02-visual-hierarchy.md) — the fault that accounts for most of the list.
- [`07-alignment-and-proximity`](07-alignment-and-proximity.md) — the mechanics behind faults 2 and 5.
- [`18-color-accessibility`](18-color-accessibility.md) — the contrast floor behind fault 4.
- [`113-design-quality-checklist`](113-design-quality-checklist.md) — the gate this triage feeds into.
- [`111-design-critique`](111-design-critique.md) — how to say all of this without insulting the work.

## Sources
- Tufte, *The Visual Display of Quantitative Information* — chart junk: every mark carrying no information costs
  the reader attention.
- WCAG 2.2, SC 1.4.3 — 4.5:1 for normal text, 3:1 for large text.
- Hofmann, *Graphic Design Manual*, p. 130 — a small isolated dot and square fail to read as a contrast pair until
  scale and proximity change.
