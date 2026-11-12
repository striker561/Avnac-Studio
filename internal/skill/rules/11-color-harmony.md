# Rule: Color Harmony

**Domain:** color · **ID:** `11-color-harmony`

## Purpose
Choose color relationships that hold together, and know why a textbook scheme can still fail on a canvas. Harmony is not a property of individual colors; it is a property of the intervals between them.

## Definition
Harmony is a controlled set of intervals between colors — in hue, value, and chroma — so the combination reads as one system with internal tension. The named schemes are interval sets on the wheel: monochrome, analogous, complementary, split-complementary, triadic, tetradic.

## Core Principles
- Monochrome (one hue, many values) is the most reliable and the easiest to make dull; it needs a wide value range and one chroma accent.
- Analogous (neighbors within ±30°) is calm and cohesive, and fails when value contrast is also low, which produces mud.
- Complementary (180°) maximizes tension and vibration. Keep the pair unequal in area or value or the edges will shimmer.
- Split-complementary (150°/210°) keeps the tension but is easier to balance with a third color; use it when complementary feels too binary.
- Triadic (120°) and tetradic need one hue to dominate decisively, or the result reads as three unrelated designs.
- Any color can work with any other given the right quantities. A scheme is a starting hypothesis, not a guarantee.

## Techniques
1. **Choose by intent** — calm: analogous or monochrome. Tension: complementary or split. Playful: triadic with one dominant. Premium: monochrome plus one metallic neutral.
2. **Make the areas unequal** — one color owns most of the canvas, a second supports, the accent stays small. Equal thirds destroy the hierarchy the scheme implies.
3. **Vary value, not hue count** — two hues with four values is richer and safer than four hues at one value.
4. **Break vibration** — put a neutral gap or a value shift between near-complements used as edges; shimmer is only useful at small accents.
5. **Test at three sizes** — 32 px, 256 px, and full canvas. A harmony that only works at full size collapses in a feed.

## When to Use
- Choosing a palette from scratch.
- Refreshing a brand whose colors have drifted into too many hues.
- Illustration sets and icon families that must look related.
- Chart series that need distinct but coherent colors (see 96).

## When to Avoid
- Brand-mandated palettes that cannot change (see 17).
- Photography-led layouts, where the image already sets the color relationships.
- Accessibility-critical UI, where contrast ratios outrank harmony (see 14, 18).

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Complementary pair at equal area and chroma | Edges vibrate and neither reads | Change the area or value of one |
| Analogous scheme at a single value | No hierarchy; everything merges | Spread the value range over 4+ steps |
| Triadic used at exactly equal proportions | Three competing designs in one frame | Let one hue own most of the area |
| Adding a fourth hue to fix a two-hue clash | More noise, not less | Adjust value or area instead |
| Applying a scheme to a photograph | The image already has its own relationships | Grade the photo into the scheme |

## Practical Examples
A 1080×1350 poster, split-complementary: base `#1B3A4B` (cool blue-green, 62% of the area), warm accent `#E4572E` (8%), warm neutral `#F2E8DC` (30%).

The accent is the only high-chroma element and sits on the call to action. The split keeps the orange from vibrating against the blue because the neutral carries the middle, which a straight complementary pair would not do at these areas.

## Related Rules
- [`10-color-theory`](10-color-theory.md) — hue, value, and chroma as the coordinates harmony moves in.
- [`12-color-psychology`](12-color-psychology.md) — what a hue is expected to mean once chosen.
- [`13-color-perception`](13-color-perception.md) — why a harmony changes when the surround changes.
- [`16-palette-construction`](16-palette-construction.md) — turning a scheme into tokens and ramps.
- [`19-color-in-context`](19-color-in-context.md) — how a harmony behaves across materials and light.

## Sources
- Horstman, *Interacting with Color*, p. 57 — fixed color systems promising harmony were antithetical to Albers: "any color 'goes' or 'works' with any other color, presupposing that their quantities are appropriate."
- Itten, *The Elements of Color* — the color star and its harmonic chords, including the complementary and triadic relations.
- Albers, *Interaction of Color* — studies in quantity and proportion rather than recipes for combination.
