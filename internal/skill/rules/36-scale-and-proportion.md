# Rule: Scale and Proportion

**Domain:** layout · **ID:** `36-scale-and-proportion`

## Purpose
Use size relationships as the primary hierarchy tool, and use ratios so that sizes belong to one
family instead of being chosen one at a time. Scale is the cheapest and most reliable way to say
what matters; proportion keeps a set of sizes from looking accidental.

## Definition
Scale is the relative size of elements to each other and to the frame. Proportion is the ratio
between a part and the whole, or between parts — 1:1.618, 2:3, 3:5, or an arbitrary ratio used
consistently. Neither is absolute: a 24 px line is large beside 12 px type and small beside 96 px
type, so only relationships are perceived.

## Core Principles
- Perceptible steps are 1.25×, 1.5×, 2×, 3×, 4×, 8×. Anything below 1.15× reads as an error
  rather than a level, and a set of sizes at 18/20/22 px reads as one size set three times.
- Choose the ratio from the message, not from the mood. Quiet editorial work runs 1.25–1.4×;
  posters run 3–8×; interfaces run 1.25–1.5× because the reader is working, not looking.
- Extreme jumps change the medium. Once the largest element exceeds 4× the next, the design stops
  reading as a document and starts reading as a poster — the big element becomes an image.
- Keep one ratio in the family. If type steps are 1.5×, make the image heights and the space blocks
  multiples of the same idea; mixed ratio families read as improvisation.
- Space should scale slower than type. When type doubles, gaps grow about 1.4×; if spacing doubles
  with the type, the layout inflates and loses density.

## Techniques
1. **Write the scale plan first** — three or four sizes, decided before placing anything. A 1080
   poster: 8 px legal, 24 px body, 96 px headline, 420 px display numeral. Four values, one
   message.
2. **Pick from a modular scale** — base 16 with a 1.5 ratio gives 16, 24, 36, 54, 81, 122; base 16
   with 1.25 gives 16, 20, 25, 31, 39, 49. Round to whole pixels and keep the rounding consistent.
3. **The huge/small sandwich** — one element at 60–80% of the canvas's short side, answered by a
   block of 10–12 px text. The jump is the composition; the middle sizes are what dilute it.
4. **Harmonic canvas splits** — on 1080×1350 (4:5), split the height 540/810 (2:3) or 506/844
   (3:5). On 1080×1080, a 670/410 split (roughly 1.618:1) gives an asymmetric pair of zones.
5. **Two-zoom test** — check at 25% (hierarchy must survive) and at 400% (detail must reward). A
   design that only works at 100% has scale but no structure.

## When to Use
- Every composition with three or more elements, and every type system, from a name card to a
  24-sheet poster.
- When a design feels "almost right" but flat — an undersized jump between levels is more often the
  cause than color.
- When a series must look related across formats: shared ratios read as a family even when the
  canvas changes.

## When to Avoid
- Data display: scaling marks by value is the honest default, but decorative scale jumps on axes or
  labels distort reading. Keep label sizes uniform.
- Reference material where every entry is equal — a size hierarchy implies an importance ranking
  the content does not have.
- When content is genuinely equal in weight: two equal partners, two equal prices. Forcing a 3:1
  jump makes the design argue for a ranking nobody asked for.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Sizes at 18/20/22 px | Below the perceptual threshold; three levels look like one | 18/27/40 px from a 1.5 ratio |
| Scaling type and spacing by the same factor | Layout inflates and loses density | Scale gaps at about 70% of the type factor |
| One huge element and nothing else large | The jump reads as an accident, not a system | Add a mid level at 1/4 of the display size |
| Mixing 1.25 and 1.618 in one type system | Every step needs a decision, so the system decays | One ratio, rounded consistently |
| Enlarging a small logo or photo to fill space | Resolution dies and the element looks inflated | Recompose the zone; do not scale past 1.5× native |

## Practical Examples
A 1080×1350 climate poster with a four-value scale plan:

- Display "1.5°" — 420 px Inter Black, `#1A1A1A`, x 72, y 300. It occupies 62% of the canvas
  width and reads as an image before it reads as a number.
- Headline "IS THE LIMIT" — 96 px, `#1A1A1A`, two lines at 0.92 line-height, x 76, y 760.
- Body "Global average temperature rise since pre-industrial times" — 26 px, `#4A4A4A`, measure
  620 px, y 1010.
- Source line — 12 px, `#7A7A7A`, y 1290.

The steps are 12 → 26 → 96 → 420: ratios of roughly 2.2, 3.7, and 4.4, all far above the 1.15
threshold, so each level is unmistakable at 25% zoom. The 26 px body is 2.2× the source, which is
the smallest ratio in the set and still legible as a separate level.

## Related Rules
- [`04-balance-and-proportion`](04-balance-and-proportion.md) — the proportion systems these ratios come from.
- [`24-typographic-hierarchy`](24-typographic-hierarchy.md) — scale as the first mechanism of type hierarchy.
- [`26-type-scale-and-proportion`](26-type-scale-and-proportion.md) — the modular scale a type system is built on.
- [`28-display-and-expressive-type`](28-display-and-expressive-type.md) — what happens at the extreme end of the scale, where type becomes image.
- [`38-cropping-and-framing`](38-cropping-and-framing.md) — how the frame's aspect ratio constrains the scale plan.

## Sources
- Müller-Brockmann, *Grid Systems in Graphic Design*, "Sizes of paper" and the proportion chapter — page formats and type areas are chosen as ratios, not as arbitrary dimensions.
- Cheng, *Designing Type* — x-height and cap-height ratios mean equal point sizes do not produce equal apparent size, so scale must be judged optically.
- Elam, *Geometry of Design* — the proportional systems (golden section, root rectangles, Fibonacci) that give a set of sizes a common origin.
