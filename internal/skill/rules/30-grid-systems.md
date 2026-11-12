# Rule: Grid Systems

**Domain:** layout · **ID:** `30-grid-systems`

## Purpose
Turn sixty placement decisions into one. A grid fixes the vertical divisions, the horizontal
rhythm, and the margins, so every element has a defensible home and any departure from it is
visible as a choice.

## Definition
A grid is the sum of three measurements: column divisions (how many, how wide, what gutter),
horizontal divisions (a baseline for type, fields for images), and margins (the frame between the
page edge and the type area). It is a control instrument, not a decoration — nothing of it should
be visible in the finished piece.

## Core Principles
- Derive the columns from the text, not from the canvas. A comfortable measure is 62–72
  characters; at 16 px Inter that is 480–560 px. Choose the column count that produces that
  measure, then let the count be whatever it is.
- Gutters must exceed the eye's grouping distance: 16–24 px between columns under 300 px, 24–32 px
  above that, never less than one body leading — too small a gap and columns merge into one field.
- Margins are unequal on purpose: equal margins on all four sides give a page no direction.
  A reliable print sequence is inner 3 : top 4 : outer 5 : bottom 6; on screen, top = 2× sides and
  bottom 2–3× sides.
- One baseline rules all type. Set the body first (16/24), make the unit 24 px, and put every
  size on a multiple — 48/48 for a headline, 12 px caption on a 24 px line with 6 px of space
  before.
- Images align to grid edges, not to their own content. Upright pictures in a fine field grid read
  as strength; white space between fields is what keeps two images from merging.

## Techniques
1. **Column math** — 1440 px canvas, 96 px side margins, 24 px gutters, 12 columns: content =
   1440 − 192 = 1248; column = (1248 − 11×24) / 12 = 82 px. The same content area in 4 columns is
   288 px each with 32 px gutters (4×288 + 3×32 = 1248).
2. **Baseline from body** — 16 px body at 1.5 line-height gives a 24 px unit. Headline 48 px with
   48 px leading = 2 units; subhead 24/24 = 1 unit; caption 11 px gets 12 px leading plus 12 px
   of space-before so its next line lands on a unit.
3. **Field grid for images** — divide the type area into 3, 4, or 6 equal rows; an image spans
   whole fields so a two-field picture is exactly twice a one-field picture. More fields buy
   flexibility and cost decisions: 8 fields suit a poster, 20 suit a catalogue, 32 suit a magazine
   with many small illustrations.
4. **Reserve a deviation zone** — nominate a region (for example the right 3 of 12 columns) where
   images may bleed and type may sit off-baseline. The other 75% of the page stays ordered, so the
   break reads as intent.
5. **Draw the grid as a locked layer** — in Avnac, a `group` of 1 px `rect`s at 8% opacity named
   `GRID 12/24/96`, locked and hidden from export. Delete it before delivery; a visible grid is a
   wireframe, not a design.

## When to Use
- Multi-page, multi-element work: catalogues, reports, magazines, dashboards, any layout with more
  than about eight elements or more than two pages.
- When more than one person places content — the grid is the contract that keeps their pages
  related.
- When a design must hold repeating structures (image, caption, body, folio) without redrawing the
  arrangement each time.

## When to Avoid
- Single-image posters, one-line statements, and full-bleed photographic covers: a grid there
  constrains nothing and invites you to fill empty cells.
- Content that is one idea in one block — a 12-column grid over a 3-item menu is theatre.
- When the concept is deliberate disorder (a collage, a deconstructed layout). Build the grid
  anyway, then break it, so the break has something to break from.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Gutter narrower than the leading | Columns read as one blurry block | Gutter ≥ body leading, 24 px minimum |
| Equal margins all round | The page has no entry point and looks undecided | Asymmetric margins: 3/4/5/6 or top 2× sides |
| 32 fields for a four-item layout | Time spent on a grid the content never touches | Start at 12 columns and 3 rows; add only where needed |
| Images aligned to their frames, not the grid | Bottoms drift off the baseline and read as sloppy | Snap image bottom to a baseline, crop the overflow |
| Centering everything the grid produces | Kills the asymmetry the grid was built for | Keep one strong left or right edge; center only display lines |

## Practical Examples
A 6-column A4 editorial page at 150 ppi: canvas 1240×1754 px, margins top 96, bottom 144, inner
84, outer 108. Type area = 1048×1514 px; six columns of 158 px with 20 px gutters fill 1048
exactly. Body 16/24 fills a 158 px column at about 34 characters — too narrow, so the text runs
across two columns (336 px, 72 characters) and the remaining four columns carry a 3-field image
above a caption block. The image occupies y 96–630, landing on the 24 px baseline with 6 px of
play; its caption starts at y 654, one unit below.

## Related Rules
- [`07-alignment-and-proximity`](07-alignment-and-proximity.md) — the alignment habits a grid formalises and the optical corrections it cannot make for you.
- [`08-negative-space`](08-negative-space.md) — margins and gutters as active emptiness rather than leftover area.
- [`31-layout-structures`](31-layout-structures.md) — which grid to build, decided from the content's streams rather than from taste.
- [`32-editorial-layout`](32-editorial-layout.md) — the furniture (folios, running heads, captions) that lives on the grid page after page.
- [`39-responsive-composition`](39-responsive-composition.md) — how the same grid reduces and reflows across formats.

## Sources
- Müller-Brockmann, *Grid Systems in Graphic Design*, "The typographic grid" and "Margin proportions" — margins of equal size can never produce an interesting page; differing margins bring tension.
- Müller-Brockmann, *Grid Systems in Graphic Design*, "Type and picture area with 20 and 32 grid fields" — the finer the mesh, the greater the flexibility and the harder the grid is to find and apply.
- Tufte, *The Visual Display of Quantitative Information*, "Data-based grids" — a grid keyed to the data serves the content; a grid imposed on it fights it.
