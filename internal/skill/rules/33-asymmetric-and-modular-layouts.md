# Rule: Asymmetric and Modular Layouts

**Domain:** layout · **ID:** `33-asymmetric-and-modular-layouts`

## Purpose
Balance a page with unequal masses so it holds tension instead of resting, and build layouts from
modules that can be reordered without the composition falling apart. This is the difference
between asymmetry that looks composed and asymmetry that looks dropped.

## Definition
Asymmetry is balance achieved with unequal masses at unequal distances from an axis, so the page is
stable but not static. A modular layout builds from repeated self-similar blocks derived from one
unit and one ratio, so every block has the same structural status while its content differs.

## Core Principles
- Balance is a lever. A mass twice as heavy sits half as far from the axis: a 400×400 solid at
  x = 200 is answered by a 200 px block near x = 760. Check it at 25% zoom, where masses read as
  weights.
- Use a stated ratio, not a guess. 1:1.618, 2:3, and 3:5 are the classical splits; 62/38 and
  38/24/38 are their practical layout versions, and any of them beats intuition.
- One imbalance per composition. The eye should find the off-axis mass once; a second competing
  imbalance cancels the first and the page reads as unresolved.
- Modules are equal in status, not in size. Differentiate blocks with content, scale, or color
  weight — a border on some blocks and not others only makes the design look unfinished.
- Count the rules you keep against the rules you break. Controlled chaos in practice is one broken
  rule against three held rules; anything closer to 1:1 is noise.

## Techniques

**Avnac ops:** `elements` op=render places the modules and the deliberate imbalance; `arrange` op=align and op=distribute hold the underlying order; `canvas` op=validate reports `density`; `get_canvas_image` is the balance check.

1. **The 62/38 split** — on 1080 px, split at 670: the 670 zone takes the image, the 410 zone
   takes type with 48 px of interior padding. The 410 block sits lower than the image's top edge by
   60–90 px so the two masses are not level, which is what keeps the split from reading as 50/50.
2. **Corner mass and counterweight** — put the heaviest element into one corner region and answer
   it with a small dense block in the diagonally opposite quadrant at about one-fifth the area.
   Equal areas in opposite corners produce symmetry by accident; 5:1 produces tension.
3. **One unit, Fibonacci steps** — set U = 24 px. Blocks are 1U, 2U, 3U, 5U, 8U; gutters are 1U.
   Nothing is sized by eye, and every gap belongs to the same family.
4. **Rotate the single exception** — one element rotated 90° or offset by exactly half a module.
   The rest must be strictly aligned for the rotation to read as intent rather than as a mistake.
5. **Write a contrast ledger** — list the contrasts actually in play (size, value, density,
   orientation, color). Keep three; a fourth and fifth spread attention until no contrast dominates.

## When to Use
- Covers, posters, campaign key visuals, editorial spreads, and any piece where the message is
  energetic rather than administrative.
- Product and catalogue pages where items must be comparable: modules make equality visible and
  let the layout survive a swap of one item.
- When a centered layout has been tried and the design reads as timid — asymmetry is usually the
  correction, not more decoration.

## When to Avoid
- Legal documents, forms, invoices, and reference tables: asymmetry there produces search cost,
  and the reader is scanning, not looking.
- Very small formats. On a 320 px-wide banner there is no distance for masses to balance across,
  so the same split reads as a cramped column and a stray block.
- When the content has exactly two equal items with equal importance. Asymmetry then lies about
  the relationship; a symmetric 50/50 is the honest structure.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Centering the title while everything else is asymmetric | One symmetric element freezes the whole composition | Left-align the title to a held edge |
| Symmetry by accident | Even masses at even distances read as a template | Change one mass by 2×, not its position by 4 px |
| Five module sizes on one page | No unit survives, so nothing aligns | Three sizes from one U, plus one exception |
| Modular blocks with unequal content in equal boxes | Empty space inside a small block looks like a mistake | Size the block to its content; let the module be a multiple, not a fixed square |
| Rotation without a rigid grid behind it | Reads as a rotated mistake | Align everything else to the pixel, then rotate one element 90° |

## Practical Examples
A 1080×1080 album sleeve, ground `#101014`:

- Split at x = 670. The image occupies x 0–670, full height, cropped so the subject's shoulder
  exits the top edge.
- Type block sits x 670–1080 with 48 px padding, top at y 300 (not 0), holding a 64 px artist name
  on two lines at 0.92 line-height and a 15 px title.
- Counterweight: a 96×96 px `#E4572E` square at x 860, y 840 — about 1/5 the image's area in the
  opposite quadrant.
- One exception: a 30 px vertical strip of the same orange at x 1030, rotated 90°, running y
  120–400.

The image's mass is answered by the orange square's density; the type block's low position keeps
the vertical split from reading as two equal halves.

## Verification
1. **Ops receipt.** `arrange` op=distribute proves the repeated module spacing, `canvas` op=validate `density` stays under 75%, and `get_canvas_image` shows the asymmetry is deliberate rather than a slip. An asymmetry that reads as an accident fails.
2. **Lever balance.** Measure each mass and its distance from the axis: m1 × d1 against m2 × d2.
   More than 2:1 between the products means the page is unbalanced, not asymmetric.
3. **Split ratio.** Divide at the dominant vertical and compare with a stated ratio: 62/38, 2:3,
   or 3:5, within 2%. A 52/48 split reads as a near-miss, because the eye expects a decision.
4. **Unit audit.** Every block size and gutter is a multiple of U from one family — 1, 2, 3, 5,
   8 × 24 px. A 30 px gap or a 100 px block belongs to no unit and aligns with nothing made later.
5. **Exception count.** Exactly one element is rotated, offset, or differently sized; everything
   else is aligned to the pixel. Two exceptions cancel and read as noise.
6. **Counterweight area.** The answer to the heaviest mass sits in the opposite quadrant at about
   1/5 its area. Equal areas in opposite corners produce symmetry by accident.

## Related Rules
- [`04-balance-and-proportion`](04-balance-and-proportion.md) — the theory of visual weight these splits approximate.
- [`06-unity-and-variety`](06-unity-and-variety.md) — how much variation a modular system can absorb before it dissolves.
- [`07-alignment-and-proximity`](07-alignment-and-proximity.md) — the rigid edges that make a single exception legible as intent.
- [`30-grid-systems`](30-grid-systems.md) — the column grid a modular layout is measured against.
- [`102-swiss-international-style`](102-swiss-international-style.md) — the historical method this rule operationalises: asymmetry plus strict alignment.

## Sources
- Müller-Brockmann, *Grid Systems in Graphic Design*, "The typographic grid" — asymmetry and unequal margins are what give a page tension; equal division gives it inertia.
- Hofmann, *Graphic Design Manual*, the confrontation studies — contrast between dot and line, black and white, horizontal and vertical is the raw material of composition.
- Elam, *Geometry of Design* — the 1:1.618 and root-rectangle proportions that modular systems use as their ratio base.
