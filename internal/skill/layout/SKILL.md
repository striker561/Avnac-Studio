---
name: layout
description: Structure multi-element pages and screens — grids, margins, columns, editorial spreads, modular and broken layouts — and make the structure hold up across formats. Use whenever the work has more than a few elements to organize, the user mentions a grid, magazine, spread, brochure, report or page layout, or says the content does not fit together.
---

# Layout

## Applies when
There is content with parts that need organizing on a page or screen. For a single-message sheet,
use `poster`; for interface chrome, use `ui`; for fixing an existing weak arrangement, use
`compose`.

## Workflow
1. **Inventory the content.** Count the blocks and classify them: one hero, 2–4 secondary, N equal
   items, text runs, captions. The inventory selects the structure; structure should not be chosen
   before you know how many kinds of things there are.
2. **Choose the structure** — single column, 2/3/4 columns, 12-column, modular, broken/asymmetric,
   full-bleed. Write down why; "it looked nice" is not a reason that survives clients.
3. **Set the margins** from the format (1/9–1/12 of the short edge for print, 5–8% for screen),
   then the gutters (4–8 mm print, 16–24 px screen).
4. **Build the vertical rhythm**: body line-height becomes the baseline, and all spacing snaps to
   it. This is what makes a layout feel engineered rather than assembled.
5. **Place the hero first**, spanning columns deliberately (2 of 3, or full bleed). Then place
   secondary blocks on column edges.
6. **Break the grid exactly once** where emphasis is needed, and make the break obvious — a near
   miss reads as a mistake, a clear break reads as intent.
7. **Check the spread, not the page.** On facing pages, elements should bridge the gutter or
   deliberately mirror; otherwise the spread looks like two unrelated pages.

## Decision points
- **How many columns?** One for reading, two for comparison, three or more for scanning. Long body
  text in three narrow columns is a common failure.
- **Symmetric or asymmetric?** Symmetric is stable and formal; asymmetric is dynamic and modern,
  but needs a strong alignment axis. Half-symmetric reads as unresolved.
- **Images in the grid or full bleed?** In-grid images keep rhythm; full bleed creates emphasis and
  removes margins — use it once per spread.
- **Fixed or fluid?** Print is fixed; screens need reflow rules at every breakpoint. Define the
  behaviour of each block, not just the desktop picture.

## Rules to apply
- [`30-grid-systems`](../rules/30-grid-systems.md) — building the grid and breaking it.
- [`31-layout-structures`](../rules/31-layout-structures.md) — choosing the structure.
- [`32-editorial-layout`](../rules/32-editorial-layout.md) — spreads, folios, captions, standing elements.
- [`33-asymmetric-and-modular-layouts`](../rules/33-asymmetric-and-modular-layouts.md) — asymmetry with control.
- [`07-alignment-and-proximity`](../rules/07-alignment-and-proximity.md) — edges and grouping.
- [`39-responsive-composition`](../rules/39-responsive-composition.md) — reflow across formats.
- [`08-negative-space`](../rules/08-negative-space.md) — margins as material.

## References
- [`layout`](../references/layout.md) — grid anatomy, column math, breakpoints, editorial parts.
- [`composition`](../references/composition.md) — patterns and proportions.

## Production checks
- Every element sits on a column edge or a baseline; nothing is eyeballed.
- Measure: 45–75 characters per text column.
- Consistent margins on all four sides unless deliberately asymmetric with a stated ratio.
- Print: 3 mm bleed, 5 mm safe area, crop marks, images at final resolution.
- Screen: reflow at each breakpoint; no horizontal scroll at 320 px.
- Facing pages: gutter has enough allowance (≥ 15 mm inner margin for perfect binding).

## Output format
`Content inventory:` blocks and kinds. `Structure:` choice + why. `Grid:` margins, columns,
gutters, baseline. `Placement:` block → columns/rows. `Break:` where and why. `Reflow:` behaviour
per breakpoint.
