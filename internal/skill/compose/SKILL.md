---
name: compose
description: Fix a composition that already exists but feels flat, crowded, unbalanced or confusing — rebalancing visual weight, restoring a clear focal point, and repairing the reading path. Use when the user says a layout looks off, empty, busy, or "not quite right", or when you need a refinement pass before delivery.
---

# Composing and Fixing a Composition

## Applies when
Elements are already on the canvas and the problem is arrangement, not content. If the brief or
the copy is wrong, fix that first; composition cannot rescue a bad message. If nothing exists
yet, use `create`.

## Workflow
1. **Diagnose before moving anything.** Write the three symptoms the user described and the one
   you see. "Feels flat" is not a diagnosis; "nothing has more than 1.2× the visual weight of
   anything else" is.
2. **Check the focal point.** Squint to 20%. If one element does not survive as a distinct shape,
   create that contrast: size first, then value, then isolation.
3. **Check the balance.** Assign rough weights (area × darkness × saturation) and compute where
   the visual center sits. If it is far from the intended axis, either move weight or accept the
   imbalance deliberately.
4. **Check the reading path.** Trace the order the eye follows. If it stalls or loops, add a
   directional cue (alignment, gaze, a line) or remove a competing element.
5. **Check the density.** Count the elements touching each quadrant. Empty quadrants need either
   space as a deliberate material or one element; crowded quadrants need merging.
6. **Change one variable per pass.** Re-render, re-squint, compare. Changing size, position and
   color at once makes it impossible to know what helped.
7. **Stop when the symptoms are gone.** Composition has diminishing returns; at some point you
   are decorating.

## Decision points
- **Add or remove?** Removing almost always improves a weak composition. Add only when a region
  is genuinely empty and the message needs support there.
- **Center or off-center?** Centered is stable and ceremonial; off-center is dynamic. Pick based
  on the message, then be consistent — half-centered reads as an accident.
- **Break the grid or fix the alignment?** Break one line deliberately for emphasis; two or more
  breaks read as sloppiness.
- **Enlarge or crop?** If an element is too small to anchor, crop it in — enlarging beyond the
  frame often solves both the scale and the edge.

## Rules to apply
- [`03-contrast-and-emphasis`](../rules/03-contrast-and-emphasis.md) — the engine of every fix.
- [`04-balance-and-proportion`](../rules/04-balance-and-proportion.md) — weights and proportion systems.
- [`08-negative-space`](../rules/08-negative-space.md) — when emptiness is the fix.
- [`34-composition-techniques`](../rules/34-composition-techniques.md) — the pattern library.
- [`36-scale-and-proportion`](../rules/36-scale-and-proportion.md) — scale jumps that resolve flatness.
- [`37-direction-and-movement`](../rules/37-direction-and-movement.md) — repairing the reading path.
- [`07-alignment-and-proximity`](../rules/07-alignment-and-proximity.md) — grouping and edges.

## References
- [`composition`](../references/composition.md) — focal point, balance and pattern choices.
- [`visual-hierarchy`](../references/visual-hierarchy.md) — the size and value steps to check.

## Production checks
- Before/after at 25% zoom side by side.
- Grayscale check: the fix did not depend on hue.
- Nothing overlaps text accidentally; check every text box edge.
- Margins and safe areas still hold after moving elements.
- The composition still works at the smallest required size.

## Output format
Report: the diagnosis (symptoms → causes), the changes made (one line each), a before/after
comparison at 25%, and what you deliberately left alone.
