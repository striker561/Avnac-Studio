# Rule: Responsive Composition

**Domain:** layout · **ID:** `39-responsive-composition`

## Purpose
Carry one design across formats without carrying its pixels. Resizing a canvas is not adaptation:
the concept has to be re-decided for each frame, and the decision has to be about what the design
says rather than where things sat.

## Definition
Responsive composition is the practice of re-deciding the arrangement at each size or ratio while
holding the concept constant. The concept is the one claim the design must make in every format —
a sentence you can say out loud, not a layout description.

## Core Principles
- Name the concept before adapting. If you cannot state it in one sentence, you will preserve
  positions instead of meaning, and the smallest format will lose the message while keeping the
  margins.
- Classify every element: concept-critical (must survive everywhere), supporting (may drop at small
  sizes), format-specific (one format only). Cap critical at three — four means nothing is critical.
- Change structure, not scale. A 1080×1080 that becomes 1080×1920 keeps its idea by moving from
  side-by-side to stacked; scaling to 56% keeps the arrangement and loses the readability.
- Sizes do not scale linearly. Going from 1920 to 1080 wide, the headline may drop 25%, body 0%,
  and the measure 30%; body copy has a floor around 14–16 px and never scales with the canvas.
- Order is content. When elements stack, choose which one leads — usually the headline, sometimes
  the image, never by accident because it came first in the layer list.

## Techniques
1. **Design the extremes first** — make the smallest (320 px wide) and the largest (1920 px) before
   the middle. The middle sizes are where compromises hide, so fit them to two known-good ends.
2. **Ratio anchors per format** — 4:5 splits 55/45 image-to-type, 16:9 splits 38/62, 1:1 splits
   62/38; write the split into the artboard name so the next format starts from a proportion.
3. **Breakpoint table** — 320–599: single column, stacked, display at 40–56 px; 600–899: two
   columns; 900–1279: three columns; 1280+: asymmetric 12-column with the display at 96–140 px.
   Derive from content, not from device names.
4. **Fluid type by formula** — `clamp(28px, 4.5vw, 72px)` for a headline, then read the value at
   each breakpoint and place it as a fixed size in Avnac. Fluid type is a way to compute the steps,
   not a reason to ship a range.
5. **Safe-area audit** — 5% margin on all sides for platform overlays and rounded corners; keep
   captions within 8–12% of the bottom on vertical video formats; on print, map every format's trim
   and bleed independently.

## When to Use
- One campaign across feed, story, banner, poster, and print: the commonest real brief in the
  library and the one most often failed by resizing.
- Any design system where a component must survive at three widths.
- When a client asks for "the same thing but square" — that request is always about the concept,
  never about the file.

## When to Avoid
- When a format genuinely needs a different design: an OOH billboard and a business card share a
  brand, not a composition. Forcing one layout onto both produces a billboard that reads as a
  business card.
- When the concept depends on the aspect ratio itself — a panoramic horizon, a tall tower of type.
  Adapting those honestly means redesigning, and that should be quoted as a second design.
- Do not mechanically reflow dense editorial: a 12-paragraph spread cannot become a 320 px panel by
  stacking; it needs editing, which is an editorial decision, not a layout one.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Scaling the whole artboard proportionally | Body copy drops below 14 px and the hierarchy inverts | Re-decide sizes per format from the scale plan |
| Whiting out to fit a ratio | Visible padding and a design that looks squeezed | Re-crop the image; recompose the bands |
| Adding a new element per format | Three formats become three designs | Keep the element set fixed at three critical items |
| Keeping side-by-side at portrait ratios | Each half becomes too narrow to hold its content | Stack, and give the image 55–60% of the height |
| Same margins in every format | Small formats lose usable area, large ones look mean | Margins at 5–8% of the short side, not fixed px |

## Practical Examples
One poster concept — a single bold claim about water use — in three formats:

- **1080×1350 (4:5)** — image y 0–740 full-bleed; claim at 88 px across 3 lines at y 800; 22 px
  supporting line at y 1130; source at 12 px, y 1300.
- **1080×1920 (9:16)** — image y 0–980; claim at 104 px, 4 lines, y 1060; supporting line at 26 px,
  y 1560; source at 14 px, y 1740. The claim leads, the image grew but stayed above it.
- **1920×1080 (16:9)** — image occupies x 0–730 full height; claim at 132 px, 3 lines, x 800, y 300;
  supporting line at 28 px under it; source at 14 px bottom right.

Same three critical elements in the same order in all three, different structures: stacked in the
verticals, side-by-side in the horizontal. The 22 px supporting line becomes 26–28 px in the larger
formats, not because the canvas grew but because the reading distance did.

## Related Rules
- [`30-grid-systems`](30-grid-systems.md) — the column set that gets rebuilt per format while keeping its proportions.
- [`31-layout-structures`](31-layout-structures.md) — the structural choice that changes between formats.
- [`36-scale-and-proportion`](36-scale-and-proportion.md) — the scale plan that is re-decided, not interpolated.
- [`38-cropping-and-framing`](38-cropping-and-framing.md) — the crop ladder that makes one asset serve several ratios.
- [`95-responsive-interface-design`](95-responsive-interface-design.md) — the interface version: breakpoints, touch targets, safe areas.

## Sources
- Müller-Brockmann, *Grid Systems in Graphic Design*, "Sizes of paper" — formats are a fixed set of proportions, and a design must be conceived against the format it will be reproduced in.
- Müller-Brockmann, *Grid Systems in Graphic Design*, "The grid system in corporate identity" — one system applied at different scales keeps an identity recognisable while no two applications are identical.
- W3C, *CSS Values and Units* and *Media Queries* specifications — `clamp()` and breakpoint semantics as the mechanical basis for reflowing type.
