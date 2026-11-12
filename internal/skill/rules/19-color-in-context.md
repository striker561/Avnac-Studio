# Rule: Color in Context

**Domain:** color · **ID:** `19-color-in-context`

## Purpose
Judge a color where it will be seen: beside its neighbors, on its material, inside its series, and under its light. The value in the file is the start of the question, not the answer.

## Definition
Context is what changes a color's appearance without changing its value: adjacent colors, substrate, viewing light, and the sequence of images around it. It is why two designers can specify the same hex and ship two different colors.

## Core Principles
- A color has no fixed appearance. #E4572E on #F4F1EA reads warm and light; the same hex on #C1272D reads dull and dark. Specify pairs, not swatches.
- Neighbors set the interval: contrast is hard when the step between adjacent colors is large and soft when it is small.
- Small areas read lighter on dark grounds and darker on light grounds, so a 10 mm mark and a 300 mm field of one hex will not match.
- Material moves value before hue: uncoated stock drops value 5–15%, kraft muddies blue, newsprint yellows every light tone.
- Light is part of the palette: 2700 K tungsten yellows whites, 5000 K D50 is the proofing standard, 6500 K D65 the screen standard, and sodium street light turns blue black.
- In a series, one constant makes the set. Fix the ground or the type color and vary one dimension in a fixed order.

## Techniques
1. **Test the pair, not the swatch.** Place the color on both grounds at final size and view at 100% and 25%.
2. **Run an interval check.** Put the two colors edge to edge and squint: if the boundary disappears, the step is under 10 L* and the pairing is decorative.
3. **Proof on the substrate.** Print a 100 mm swatch on the actual stock, or simulate uncoated by adding 8% black and dropping 10% chroma.
4. **Build the series recipe.** Fix ground and type, generate six accents at matched L 0.58 and hues 40° apart, order by hue, reuse the same position for the same meaning.
5. **Check the light.** View under a 2700 K bulb as well as daylight; a blue that reads navy at noon can read black in a bar.

## When to Use
- Approving a proof or a color target, or answering "can we see it warmer?"
- A series of six to twenty pieces that must read as one family.

## When to Avoid
- Don't correct for context on a piece seen only on calibrated screens; you will chase a problem the viewer never has.
- Don't compare a screen color to a paper sample under different light: that comparison is always wrong, and it causes most bad approvals.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Approving a hex on screen against paper | Emissive vs reflective, different white points | Compare print to print, or use a D50 booth |
| One hex for a logo and a full-bleed wash | Small and large areas do not match | Lighten the large field 5–8 L* |
| Six series colors at one L | No sequence, and it collapses in grayscale | Order by L, vary hue second |
| Choosing under office fluorescents | Colors go flat and green | Check at 2700 K and 5000 K |

## Practical Examples
A six-sheet series for a venue lit at 2700 K: the cream ground #F4F1EA turns yellow indoors, so it becomes #FFFFFF, and #1B2A41 replaces black so the shadows do not crush. Ground and type stay fixed across all six; only the accent rotates at matched L 0.58, from #E4572E through #4C6FA5 to #2E7D5B, so the set reads as one system whether the sheets hang together or apart.

## Related Rules
- [`13-color-perception`](13-color-perception.md) — simultaneous contrast and adaptation, the mechanism behind these shifts.
- [`14-color-contrast`](14-color-contrast.md) — the ratios that must still hold after context is accounted for.
- [`16-palette-construction`](16-palette-construction.md) — building the palette that survives these conditions.
- [`85-paper-and-material-selection`](85-paper-and-material-selection.md) — stock choice as a color decision.

## Sources
- Horstman, *Interacting with Color*, p. 25 — one color appearing as two by looking like the reversed grounds.
- Horstman, *Interacting with Color*, p. 50 — contrast as an interval: the same colors read hard or soft depending on their neighbors.
- ISO 3664 — the D50 viewing conditions that print approvals are supposed to assume.
