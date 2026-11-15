---
name: analyze
description: Read a design, screenshot, reference image or competitor layout and explain how it works — structure, hierarchy, type, color, grid and the decisions behind them — then extract what is reusable. Use when the user shares an image and asks why it works, what style it is, how to get that look, or what to borrow for their own design.
---

# Analyzing a Design or Reference

## Applies when
There is an existing visual artifact — a reference the user likes, a competitor's site, a poster
on a wall, a screenshot of their own draft — and the task is understanding rather than making.
For judging quality, use `critique`; for building from what you learned, use `create` or the
matching task skill.

## Workflow
1. **Look before measuring.** Note, in one sentence each: what you saw first, what the design is
   for, and what feeling it produces. This is data — record it before analysis overwrites it.
2. **Reverse the format.** Pixel dimensions, aspect ratio, intended medium (print, feed, web,
   packaging). Format explains many apparent choices.
3. **Reverse the grid.** Find the margins, the column count, and the alignment axes. Draw them
   over the image mentally: which elements snap, which deliberately break?
4. **Reverse the hierarchy.** List elements in the order they attract attention. Compare with
   the order they were probably intended to be read. Note the devices producing the order (size,
   value, position, color, isolation).
5. **Reverse the type.** Categorize the faces (serif/sans/slab/display/mono), estimate the
   levels and the scale ratio, and check measure and leading. If you can name the typeface, do;
   if not, describe its skeleton.
6. **Reverse the color.** Sample 4–6 colors, assign roles (ground, structure, accent, text), and
   estimate the proportions. Note value contrast and any interaction effects.
7. **Reverse the imagery.** Source type (photo/illustration/3D/graphic), treatment (grade,
   duotone, grain), crop logic, and the relationship between image and type.
8. **Name the strategy.** In one sentence: what idea does this design execute? Then decide what
   is transferable and what is specific to this artifact.

## Decision points
- **Style or system?** A single artifact shows style; a set shows a system. Do not infer rules
  from one example — ask for two more if the user wants to imitate a look.
- **Borrow the principle or the surface?** Principles transfer ("asymmetric balance with one
  dominant image"); surfaces do not ("this exact gradient").
- **Is the reference good?** Popularity is not quality. Judge it against the brief it served,
  and say when a famous example is actually weak on accessibility or legibility.
- **What would break on transfer?** Note the risks: fonts not licensed, colors out of gamut,
  imagery unavailable, format not supported.

## Rules to apply
- [`02-visual-hierarchy`](../rules/02-visual-hierarchy.md) — the order you are reversing.
- [`30-grid-systems`](../rules/30-grid-systems.md) — finding the hidden structure.
- [`03-contrast-and-emphasis`](../rules/03-contrast-and-emphasis.md) — why the eye lands there.
- [`21-type-classification`](../rules/21-type-classification.md) — naming what you see.
- [`19-color-in-context`](../rules/19-color-in-context.md) — color as it behaves in the artifact.
- [`76-visual-metaphors-and-symbolism`](../rules/76-visual-metaphors-and-symbolism.md) — the idea behind the image.
- [`100-design-movements`](../rules/100-design-movements.md) — placing the style historically.

## References
- [`composition`](../references/composition.md) — the patterns you are likely to find.
- [`typography`](../references/typography.md) — size, measure and pairing estimates.
- [`color`](../references/color.md) — attributes, spaces and contrast anchors.

## Production checks
- Every claim is anchored: "the headline is 4× the body" beats "the type is big".
- Sample colors from the actual file, not from memory.
- State uncertainty explicitly ("appears to be a 12-column grid; the gutters are ambiguous at
  this resolution").
- Separate observation from opinion; label the opinion.

## Output format
1. `What it is:` medium, format, purpose.
2. `First read:` what lands first, second, third.
3. `Structure:` grid, margins, alignment axes.
4. `Type:` faces or skeletons, levels, ratio, measure.
5. `Color:` sampled values with roles and proportions.
6. `Imagery:` source, treatment, crop logic.
7. `Idea:` the strategy in one sentence.
8. `Transferable:` three to five principles, each with how to apply them here.
9. `Risks:` what will not transfer and why.
