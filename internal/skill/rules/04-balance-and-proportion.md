# Rule: Balance and Proportion

**Domain:** foundations · **ID:** `04-balance-and-proportion`

## Purpose
Keep the composition from tipping, and make its rectangles and divisions feel decided rather than accidental. Balance governs where visual weight sits; proportion governs the ratios between the parts that carry it.

## Definition
Balance is the distribution of visual weight around the canvas's axes. Proportion is the ratio relationship between dimensions: canvas, blocks, margins, type area. Weight comes from area, value, density, color, subject matter, and isolation.

## Core Principles
- Weight sources, strongest first: darkness, size, density, saturation, faces and gaze, isolation. A 60 px black mark can balance a 500 px pale image near the opposite edge.
- Symmetry reads stable, formal, institutional; asymmetry reads dynamic and contemporary. Both need a counterweight; asymmetry only hides it better.
- The optical center sits about 5% above the geometric center. Mathematical centering looks low; optical centering looks centered.
- Use one ratio family per piece: 1:1.414, 1:1.618, 2:3, 3:5, 4:5. Mixing three reads as no system at all.
- Margins should be unequal, with the largest at the bottom (or at the gutter in a spread). Equal margins read as indecision.
- The golden section is a preference, not a law; experimental preference for it is mild and highly context-dependent.

## Techniques
1. **Weight map** — divide the canvas into a 4×4 grid, count dark cells per quadrant, note the centroid. Move one element rather than resizing three.
2. **Small dark counterweight** — place the logotype or a solid block at the light end of the diagonal from the main mass.
3. **Pick a ratio and apply it** — 2:3 gives 640×960, 400×600, 240×360; every block echoes the canvas.
4. **Split asymmetrically** at 1/3–2/3 or 38/62 instead of 50/50, and keep the split line consistent across the piece.
5. **Optical centering** — nudge centered text up 2–4 px at 100 px size, and let punctuation hang outside the measure.

## When to Use
- Single-image posters, covers, invitations, and any layout with one dominant mass.
- Choosing a canvas size or a column split.
- When the layout feels like it is falling to one side.
- When a client says "it feels off" with no other diagnosis.

## When to Avoid
- Strict modular grids that already distribute weight (see 30).
- Data tables where function dictates column widths.
- Don't force a golden rectangle onto content whose shape is given: a 16:9 photo, a fixed ad slot, a phone screen.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| A 50/50 split with no counterweight | No anchor; the piece feels unresolved | Shift to 1/3–2/3 or add a small dark mass |
| Equal margins on all four sides | Reads indecisive and deadens the page | Bottom largest, then outer, then top |
| Centering type by bounding box | Looks low and slightly left | Move it up 2–4 px |
| Mixing 1.618, 1.5, and arbitrary widths | The ratios cancel; nothing reads as intended | One family, applied everywhere |
| Balancing by area alone | A dense dark block outweighs a larger pale one | Weight is area × contrast |

## Practical Examples
A 1080×1350 invitation (4:5). A dark block 1080×480 is anchored at the bottom in `#101010`; the type block sits top-left at x=96, y=120, 620 px wide; a 96×96 gold seal at x=888, y=152 counterweights the bottom mass across the diagonal.

Margins are unequal by design: 120 px top, 96 px sides, 0 px bottom because the block bleeds. The 620 px type block is 0.57 of the width, close to 3:5, so the type area echoes the canvas rather than sitting on it arbitrarily.

## Related Rules
- [`05-rhythm-and-repetition`](05-rhythm-and-repetition.md) — proportion applied to intervals rather than areas.
- [`08-negative-space`](08-negative-space.md) — margins as the proportion decision the viewer reads first.
- [`30-grid-systems`](30-grid-systems.md) — proportion made systematic across pages.
- [`33-asymmetric-and-modular-layouts`](33-asymmetric-and-modular-layouts.md) — asymmetry as a working method.

## Sources
- Müller-Brockmann, *Grid Systems in Graphic Design*, p. 45 — margin proportions: margins of equal size "can never result in an interesting page design"; contrast of margins creates tension.
- Müller-Brockmann, *Grid Systems in Graphic Design*, p. 171 — proportion canons across civilizations; Max Bill's column at 60 cm diameter and 420 cm height, a 1:7 ratio.
- Tufte, *The Visual Display of Quantitative Information*, p. 194 — preference for the golden rectangle is mild and context-dependent; when the data does not suggest a shape, move toward graphics about 50% wider than tall.
