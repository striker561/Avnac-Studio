# Rule: De Stijl

**Domain:** history · **ID:** `105-de-stijl`

## Purpose
Compose with nothing but orthogonals, black bars, white, and the three primaries — a language that
makes proportion do all the work and punishes any element that is not load-bearing.

## Definition
De Stijl (1917–1931) is orthogonal construction: horizontal and vertical black line, rectangular
fields of pure red, yellow, and blue on white, no diagonals, no symmetry, and a composition cropped
from a larger order so it seems to continue past the frame.

## Core Principles
- Only horizontals and verticals. No diagonals, no curves, no rounded corners.
- Primary color only — red, yellow, blue, plus black and white. No tints, tones, or gradients.
- Line is structure, not border: black bars 4–12 px define the fields and carry visual weight.
- Asymmetry in equilibrium: unequal color areas balanced by position and saturation, never mirrored.
- The composition is a fragment — elements run off the edges; nothing is centered or symmetrically
  framed.
- White is active space with the same material status as color.

## Techniques
1. **Orthogonal lock** — keep every `rect` at rotation 0 and on a 10 px module so bars land on exact
   coordinates; a 3 px drift is visible in a composition this empty.
2. **Area budget** — white 55–65%, black 20–25%, red 8–12%, yellow 4–6%, blue 3–5%. The primaries are
   accents in a white field; equal areas read as a flag, not a painting.
3. **Bar hierarchy** — 12 px for the outer frame, 8 px for internal divisions, 4 px for accents. The
   variation is what keeps the grid from looking like a table.
4. **Crop to imply continuation** — run one bar past the canvas edge on two sides; never box the
   composition in.
5. **Copy the rules, avoid the replica** — copy: orthogonality, primaries, unequal areas, structural
   line, edge crop. Avoid: reproductions of a Mondrian canvas, 45° "De Stijl-ish" diagonals, 1 px
   lines that have lost structural weight, and pastel primaries.

## When to Use
- Cultural identity, editorial covers about systems and order, gallery graphics, packaging for a
  design-literate audience.
- When a design must look systematic rather than expressive.

## When to Avoid
- Content needing warmth, narrative, or a human face.
- Small sizes: the bars eat the field below roughly 200 px wide.
- UI: a pure De Stijl interface is exhausting and cannot differentiate states.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| A diagonal "for energy" | The whole language is orthogonality | Rotate nothing; get energy from proportion |
| Equal areas of red, yellow, blue | The eye cannot rank them; reads as a flag | 12/6/4 percentage split |
| Tints of the primaries | The doctrine excludes them, so it looks like an error | Full-strength primaries only |
| 1 px lines on a 2000 px canvas | Line loses its structural job | 4 px minimum, 8–12 px for divisions |
| Centering the composition | The language composes from the edge | Push mass to two edges, quiet one quadrant |

## Practical Examples
An 800×1000 poster:

- White `#FFFFFF` field. Black `rect` 800×12 at y=0 and `rect` 12×1000 at x=0 — two frame bars, not
  four, so the piece stays open.
- Red `rect` 300×300 at x=12 y=96; yellow `rect` 96×96 at x=520 y=96; blue `rect` 280×120 at
  x=520 y=640.
- A third black bar, 12×420, at x=312 y=396 divides the red field from the white below it.
- Type 18 px/1.5 `#111111` sans, one 240 px column at x=40 y=760, flush left — no centered line
  anywhere on the page.

## Related Rules
- [`101-bauhaus`](101-bauhaus.md) — the same primary palette with a more permissive geometry.
- [`11-color-harmony`](11-color-harmony.md) — why three full-strength primaries need unequal areas.
- [`08-negative-space`](08-negative-space.md) — white as an active material rather than leftover.
- [`100-design-movements`](100-design-movements.md) — the method for using any movement as constraints.

## Sources
- Jaffé, *De Stijl* — the movement's own rule set: orthogonality, primary color, and the refusal of symmetry.
- Horstman, *Interacting with Color*, p. 8 — "a color is almost never seen as it really is": a flat primary shifts value against white, so the field around it is part of the color decision.
- Horstman, *Interacting with Color*, p. 50 — hard versus soft contrast intervals, and why equal-area primaries cancel each other.
