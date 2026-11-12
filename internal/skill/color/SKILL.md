---
name: color
description: Make color decisions with a reason — harmony, contrast, meaning, accessibility and how colors behave next to each other. Use whenever the user asks what colors to use, why a design feels wrong, how to make something pop or tone it down, or whether a brand palette works on screen and in print.
---

# Color Decisions

## Applies when
The task is choosing, judging or fixing color. If the job is to produce a full system of ramps and
tokens, use `palette`; if it is identity-level color ownership, use `brand`. This skill is the
judgment layer: what should the color do, and is it doing it.

## Workflow
1. **Name the job of color here.** Attention, grouping, mood, meaning, or brand recognition.
   A palette cannot do all five at once; pick the primary job.
2. **Fix value before hue.** Decide the light–dark structure first: ground, text, one element that
   must read. Hue is the last decision, not the first.
3. **Choose a scheme** from the palette-construction rule: monochrome, analogous, complementary,
   split, triadic. State the proportions: 60% ground, 30% structure, 10% accent.
4. **Check contrast numerically.** Body text 4.5:1, large text and UI 3:1, focus 3:1. Adjust value,
   not hue, when a pair fails.
5. **Check it in context.** Judge colors in the composition, never in a swatch panel. Simultaneous
   contrast will change every one of them.
6. **Check the media.** Screen sRGB/P3 vs CMYK print changes saturation; bright greens and oranges
   lose the most. Soft-proof print work.
7. **Test degraded.** Grayscale, deuteranopia simulation, small size, dark mode if relevant.

## Decision points
- **Warm or cool?** Warm advances and energizes; cool recedes and calms. In a composition, warm
  accents come forward regardless of size.
- **Saturated or muted?** One saturated color per composition. Multiple saturated colors compete
  for the same attention and produce vibration on edges.
- **Color or value?** If the message must survive grayscale, print, or colorblindness, use value.
  Color carries meaning only when value is already solved.
- **Trust the brand or break it?** Brand colors are constraints, not suggestions. Extend the
  palette with neutrals and tints before introducing a new hue.

## Rules to apply
- [`10-color-theory`](../rules/10-color-theory.md) — the attributes and models behind the choice.
- [`11-color-harmony`](../rules/11-color-harmony.md) — schemes and when each fails.
- [`13-color-perception`](../rules/13-color-perception.md) — interaction and relativity.
- [`14-color-contrast`](../rules/14-color-contrast.md) — building contrast budgets.
- [`18-color-accessibility`](../rules/18-color-accessibility.md) — the measurable minimums.
- [`12-color-psychology`](../rules/12-color-psychology.md) — meaning, with its honest limits.

## References
- [`color`](../references/color.md) — spaces, harmony tables, contrast anchors.
- [`accessibility`](../references/accessibility.md) — ratios and non-color cues.

## Production checks
- Every text/background pair measured, not eyeballed.
- Palette has roles, not just values: `surface`, `text`, `accent`, `danger`.
- Print versions exist for every brand color (CMYK + spot where needed).
- Dark mode is checked separately; do not invert values mechanically.
- Antialiasing on colored grounds: light text on saturated color can fringe; test at 1×.

## Output format
`Job:` one sentence. `Values:` hex list with roles and proportions. `Contrast:` table of the
pairs that matter with measured ratios. `Risks:` where it will drift (print, small size,
colorblindness, dark mode).
