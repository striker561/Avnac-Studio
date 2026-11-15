---
name: icon
description: Design icon sets and single icons — grid and keyline construction, consistent stroke weights, metaphor selection and pixel fitting. Use whenever the task involves icons, glyphs, symbols, favicons, app icons or tab bars, or the user says an icon is unclear, inconsistent with the others, or blurry at small sizes.
---

# Iconography

## Applies when
The output is a pictogram, not an illustration or a logo. If the icon carries the brand, also use
`logo`. If the set illustrates a concept rather than representing an object or action, use
`illustrate`.

## Workflow
1. **Write the metaphor and the action.** An icon must name what it does ("delete"), not what it
   looks like. Prefer the most conventional metaphor unless convention is the problem.
2. **Pick the grid and keylines.** 24×24 canvas with a 20×20 live area, 2 px padding, and
   keyline shapes: 20×20 square, 20×20 circle, 20×18 rectangle. All icons are drawn to fill their
   keyline, so weight reads consistently.
3. **Choose a stroke system.** One weight (2 px at 24 px = 1.5 px optical at 1×), round or square
   caps, one join style, one corner radius. Write these down before drawing.
4. **Draw the first five as a set**, not one by one: a filled object, a line object, a symbol, an
   arrow, a UI control. If they sit together well, the system works.
5. **Optical, not mathematical.** Circles overshoot by ~1 px; diagonal strokes are slightly thinner;
   dense shapes get 1 px more padding. Equal optical weight beats equal numbers.
6. **Pixel-fit the small sizes.** At 16 px, snap to the pixel grid, avoid 1 px strokes between
   pixels, and consider a simplified variant instead of scaling.
7. **Name, group and export.** One name per icon, one size per export, 1× and 2× where relevant.

## Decision points
- **Filled or outlined?** Filled reads better at small sizes and for active states; outline is
  lighter for toolbars. Pick one for the default and use the other for state changes only.
- **Literal or abstract?** Literal when the object is universal (trash, mail); abstract when the
  concept has no object (settings, sync). Abstract icons need labels more often.
- **24 or 20 grid?** 24 for general UI, 20 for dense toolbars, 16 for favicons and legacy. Do not
  mix grids in one set.
- **How many in a set?** 12–40 is a set; 200 is a library and needs naming and governance.

## Rules to apply
- [`68-iconography`](../rules/68-iconography.md) — grids, stroke logic, metaphor selection.
- [`45-affordances-and-signifiers`](../rules/45-affordances-and-signifiers.md) — icons as signs of what is possible.
- [`09-figure-ground`](../rules/09-figure-ground.md) — shape legibility against backgrounds.
- [`92-component-visual-design`](../rules/92-component-visual-design.md) — icon states inside components.
- [`18-color-accessibility`](../rules/18-color-accessibility.md) — 3:1 for meaningful icons.
- [`66-vector-illustration`](../rules/66-vector-illustration.md) — path production hygiene.

## References
- [`web-and-ui`](../references/web-and-ui.md) — sizes, states and touch targets.
- [`illustration`](../references/illustration.md) — style consistency across a family.

## Production checks
- All icons share the grid, live area, stroke weight and corner logic.
- 16 px render tested; no sub-pixel strokes.
- Icons have accessible names in the UI layer; not icon-only without a label where meaning matters.
- Fill and stroke versions exist for active/inactive states.
- Export as SVG with `viewBox`, currentColor where possible; PNG fallbacks for legacy contexts.

## Output format
`Metaphor:` per icon + why. `Grid:` canvas, live area, keylines. `Stroke:` weight, caps, joins,
radius. `Sizes:` which sizes have dedicated variants. `Files:` list. `Risks:` ambiguous icons.
