# Rule: Color Perception

**Domain:** color · **ID:** `13-color-perception`

## Purpose
Stop treating hex values as fixed appearances. The same color changes with its surround, its size, its medium, and the viewer's adaptation, so judge colors in the context where they will be seen.

## Definition
Color perception is the eye's and brain's construction of color from relative signals. Appearance depends on the surround (simultaneous contrast), on recent stimulation (adaptation and afterimages), on area (small fields look darker and duller), and on the medium (emissive screen versus reflected print).

## Core Principles
- A color is almost never seen as it physically is; it is seen in relation to its neighbors.
- Simultaneous contrast pushes appearance away from the surround: mid gray on white looks darker, the same gray on black looks lighter, and a dull color beside a saturated one looks duller.
- The effect is strongest at mid values, around 40–60% lightness, and at shared edges; extremes and separated areas shift less.
- Adaptation is fast: the eye white-balances in roughly 30 seconds to 2 minutes, so a color judged on a bright screen will not look the same in a dim room or on paper.
- Area changes color: a 10 mm swatch looks darker and duller than the same value at 500 mm.
- Boundary hardness tells you about the relationship, not the color. If one edge of a pair looks harder, the two are further apart in the color solid than you think.

## Techniques
1. **Judge on neutral gray** — place the swatch on `#808080`, then on the actual final surround. If it changes, trust the final surround.
2. **Separate to stop bleed** — insert a 2–4 px neutral gap or a 1 px `#FFFFFF` at 40% between vibrating complements.
3. **Match by disappearance** — when two colors must read the same across different grounds, adjust one until its boundary nearly vanishes. That is a perceptual match, not a numeric one.
4. **Test both grounds** — check the palette on `#FAFAFA` and on `#121212`; mid-tones shift most, so raise contrast for any mid-tone that carries text.
5. **Rest the eye** — look away for 10–20 seconds between color judgments; adjacent decisions drift toward the previous color.

## When to Use
- Any pairing that will be seen together.
- Brand color applied across light and dark backgrounds.
- Reviewing a screen design for print (see 19, 81).
- When an approved color "looks different" in the export.

## When to Avoid
- Don't chase perfect matches for viewers on uncontrolled displays; choose robust values instead.
- Skip relativity work for one-color jobs where nothing shares an edge.
- Don't correct a perceived shift by changing the hex before checking the surround; the surround is usually the cause.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Choosing an accent on white, shipping it on dark | The accent shifts hue and loses contrast | Test on the final ground |
| Equal-value complements as adjacent edges | Vibration and afterimage stripes | Break with a neutral gap or value shift |
| Picking a hex sampled from a photo | Sampled pixels are noise, not a designed color | Rebuild the color deliberately |
| Judging print color on an uncalibrated screen | Emissive and reflected media differ | Proof on the actual stock |
| Trusting a 10 mm swatch for a 2 m banner | Area shifts perceived value and chroma | Judge at final size |

## Practical Examples
`#7A8B99` on `#F2EFE9` reads as a cool blue-gray. The same hex on `#C9D6E3` reads green-gray and loses its edge entirely.

For a 1440×900 hero used on both grounds, use `#5C6B78` and add a 1 px `#FFFFFF` at 40% between the panel and the ground. The roughly 18-point value gap holds on both.

## Related Rules
- [`10-color-theory`](10-color-theory.md) — the coordinates whose appearance this rule explains.
- [`11-color-harmony`](11-color-harmony.md) — schemes that survive contact with real surrounds.
- [`14-color-contrast`](14-color-contrast.md) — the measurable side of the same phenomenon.
- [`19-color-in-context`](19-color-in-context.md) — materials, light, and series behavior.

## Sources
- Horstman, *Interacting with Color*, p. 8 — "in visual perception a color is almost never seen as it really is": color relativity is the foundation of the Albers course.
- Horstman, *Interacting with Color*, p. 30 — a single middle color can appear as either parent color, so one color reads as two and the fields seem to reverse.
- Horstman, *Interacting with Color*, p. 43 — the middle mixture and boundary hardness: a crisper boundary means the color is chromatically further from that parent.
