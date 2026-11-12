# Rule: Layout Structures

**Domain:** layout · **ID:** `31-layout-structures`

## Purpose
Choose the macro-arrangement before placing a single element. Structure decides what the reader
can compare, how many reading sequences exist, and what the edges of the canvas are for — and
changing it later invalidates every placement made under it.

## Definition
Layout structure is the arrangement of content areas at the level above the grid: how many
independent reading streams run through the page, whether they sit in columns, tiles, or bands,
and whether any element is allowed to reach the trim. Five structures cover almost all work:
single column, multi-column, modular, broken, and full-bleed.

## Core Principles
- One structure per design. A second structure needs a content reason — a different kind of
  information — not a change of mood halfway down the page.
- Structure follows stream count. One stream wants a single column; two or three parallel streams
  want columns; four or more comparable items with no inherent order want modules.
- Multi-column work requires a declared reading order: across then down (Z) or down then across
  (N). Undeclared, the reader guesses and half of them guess wrong.
- Full-bleed is a budget, not a background. When one element runs to all four edges it owns the
  canvas; everything else must drop to caption weight or it competes from a position of weakness.
- A broken grid breaks once. One violated line at the point of highest information value reads as
  emphasis; three violations read as an unfinished file.

## Techniques
1. **Count the streams** — list every piece of content and mark whether it is read as a sequence
   (1 stream), in parallel with one other (2–3 streams), or scanned as a set (4+). The count picks
   the structure without further debate.
2. **Band the canvas** — on a 1080×1350 poster, allocate 0–760 image, 760–1010 headline,
   1010–1350 details, then let exactly one band bleed past its boundary. Bands make full-bleed
   legible as a decision.
3. **Pick the reading order explicitly** — for a 3-column, 2-row layout state "across, then down"
   in the layer names (`row1-a`, `row1-b`, `row2-a`) so nobody re-flows it later into the opposite
   order.
4. **Test the module by moving it** — swap two modular blocks. If the design still reads, the
   structure is real. If it collapses, the blocks were a story told once, and the layout is a
   single column in disguise.
5. **Spend the bleed once** — a full-bleed image plus a second full-bleed color block halves the
   impact of both. The second edge should stop 48–96 px short of the trim.

## When to Use
- Single column: long-form reading, letters, legal copy, mobile-first layouts, one-argument
  posters. The measure does the work; keep it 480–700 px.
- Multi-column: editorial, reports, comparison, any page where image and text must run side by
  side without either dominating.
- Modular: catalogues, pricing, dashboards, gallery grids — anywhere items must be equal or
  reorderable.
- Broken or full-bleed: covers, hero sections, campaign key visuals, and one spread per section
  that needs to feel like an event.

## When to Avoid
- Modular structure for narrative content: a story cut into equal boxes loses its sequence, and the
  reader cannot tell which block continues which.
- Full-bleed when text must sit over the image at small sizes — a full-bleed photo behind 14 px
  copy costs you contrast you cannot buy back with a scrim.
- Broken structure in a series: if page 3 breaks the grid and pages 4–30 do not, page 3 reads as a
  printing error in the bound object.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Three columns with no declared reading order | Readers split 50/50 and both feel lost | Choose Z or N, and reinforce it with rule lines or spacing |
| Mixing single-column and modular on one page | Two structures means no structure | Move the second content type to its own page or band |
| Full-bleed image plus full-bleed color panel | Both claim the whole canvas, so neither does | Inset the second element 48–96 px |
| Equal modules for unequal content | A 40-word block and a 400-word block in identical boxes | Let the weights differ; equal size implies equal value |
| Centering a structure built on an asymmetric grid | The grid's tension disappears at the moment of use | Keep a hard left or right edge and center only the display lines |

## Practical Examples
A 1920×1080 product page hero: full-bleed photograph from y 0 to 1080, subject placed at x
960–1600, a single 76 px headline at x 120, y 420, and a 18 px subline at y 520 held to a 520 px
measure. The one non-bleed element is a 220×56 px button at x 120, y 580, `#F4F1EA` on `#111` —
full-bleed structure with three elements, not a page of floating boxes.

The same content as a 1080×1350 print poster uses a broken structure instead: a 6-column grid,
the image on columns 1–4, the headline crossing from column 3 into column 6 at 96 px, so exactly
one element violates the column edge — the headline — and it is also the most important thing on
the page.

## Related Rules
- [`30-grid-systems`](30-grid-systems.md) — the measurements the chosen structure is built from.
- [`33-asymmetric-and-modular-layouts`](33-asymmetric-and-modular-layouts.md) — how modular and asymmetric structures are balanced rather than merely assembled.
- [`34-composition-techniques`](34-composition-techniques.md) — the thumbnail stage where structures get compared before commitment.
- [`38-cropping-and-framing`](38-cropping-and-framing.md) — what happens to imagery once a full-bleed or modular frame is chosen.
- [`93-interface-layout-and-spacing`](93-interface-layout-and-spacing.md) — the same structures under UI constraints: containers, breakpoints, density.

## Sources
- Müller-Brockmann, *Grid Systems in Graphic Design*, "Type and picture area with 8, 20 and 32 grid fields" — field count is a structural decision that fixes how many picture sizes a layout can offer.
- Müller-Brockmann, *Grid Systems in Graphic Design*, "Examples of layouts with oblong and upright pictures" — full-width pictures read as generosity; upright pictures read as strength and energy, and the choice must suit the material.
- Hofmann, *Graphic Design Manual*, the confrontation and grouping studies — arrangement is decided by contrast and grouping before any grid is drawn.
