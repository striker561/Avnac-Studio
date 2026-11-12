# Rule: Editorial Layout

**Domain:** layout · **ID:** `32-editorial-layout`

## Purpose
Make page 3 and page 47 look like they belong to the same publication without looking identical.
Editorial layout is the furniture that repeats — type area, folio, running head, caption, byline —
and the spread-level composition that keeps a bound object from reading as loose pages.

## Definition
Editorial layout is the page system of a publication: a fixed type area and column set, plus
recurring standing elements (folios, running heads, captions, rules, sidebars) placed at identical
coordinates on every page, composed in two-page spreads rather than as individual pages.

## Core Principles
- Compose the spread, not the page. The gutter is the centre of the unit a reader actually sees,
  so put the strongest mass off-centre and let the two halves balance as one field.
- Furniture is a signature, not a variable. One folio position, one size (8–9 pt / 11–12 px), one
  running-head style; a folio that jumps from outer-bottom to outer-top reads as a binding error.
- Keep furniture out of the gutter. Folios and running heads at the outer edge, 20–24 px above the
  trim, never inside where the fold and the binding eat them.
- Captions hang from the image, not the text baseline: caption left edge to image left edge, 8–12 px
  below, measure capped at the widest column the image spans.
- Text columns start and end on the baseline. A short column at the foot of a page is filled by a
  standfirst, a caption, or white space — never by stretching the leading to fake a full column.

## Techniques
1. **Build the furniture group once** — one `group` named `FURNITURE`: folio, running head, a
   0.5 px rule at 10% black, at identical coordinates on every page (folio baseline 24 px above
   trim, 84 px from the outer edge). Duplicate it and change only the folio number.
2. **Set the caption spec** — 8.5 pt / 11 px, line-height 1.25, `#5A5A5A` on white, with a bold
   label followed by an en space ("**Fig. 3**  The press room, 1971"). Hanging indent equal to the
   label width so the second line aligns under the first word, not the label.
3. **Mark the gutter** — before composing a spread, draw two guides 24 px either side of the
   centre. Nothing with a face, a horizon, or a straight architectural edge may land inside that
   48 px band.
4. **Alternate density across the signature** — for every 2–3 text-heavy spreads, give one to a
   full-bleed image or a single pulled quote; identical density stops being read.
5. **Suppress furniture where it collides** — chapter openers and full-bleed pages drop the running
   head and move the folio to the outer bottom at 60% opacity, rather than shrinking the image.

## When to Use
- Any multi-page object: magazines, brochures, reports, programmes, books, annual reviews.
- When content will be produced by more than one person or over more than one session — the
  furniture is what makes the second session's pages match the first.
- When a client needs to add pages later without a designer: a documented furniture set is the
  cheapest insurance against drift.

## When to Avoid
- Single-sheet work — a poster has no folio and no running head, and importing them is pure
  decoration.
- Four-page folders where every page is a different function; heavy furniture on 4 pages of
  varied content makes the piece look like a form.
- Digital scroll layouts: running heads and folios have web equivalents (sticky header, progress
  indicator) but copying the print set produces clutter.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Folio alternating sides by page | Reader cannot find the page number twice in a row | Outer-bottom on both pages of the spread |
| Running head set larger than the body | Furniture competes with content | 8–10 pt caps, +4–6% tracking, 60–70% black |
| Captions centred under images of different widths | Ragged left edges across the spread | Hang captions left from the image edge |
| Image bottoms floating off the baseline | The grid becomes visible as misalignment | Snap bottoms to a baseline; crop the overflow |
| Last column padded with leading | Uneven grey and an obvious cheat | End the column short, or set a pull quote to fill it |

## Practical Examples
An 8-page A4 brochure at 150 ppi: 1240×1754 px pages, type area 1048×1514, margins top 96, bottom
144, inner 84, outer 108, six columns of 158 px with 20 px gutters.

- Body 16/24 across two columns (336 px, ~72 characters); images span 3 or 6 columns on the field
  grid.
- Folio at x 84, baseline 1730, 11 px, `#6B6B6B`, no rule.
- Running head at x 84, baseline 60, 10 px caps, +5% tracking, `#8A8A8A`, suppressed on the
  opener.
- Caption at 11/14, `#4A4A4A`, starting 10 px below the image, measure capped at 336 px, hanging
  indent 42 px for the label.

On the centre spread the full-bleed photograph runs from the outer edge of the left page into
column 4 of the right page, so the image crosses the gutter and the remaining two columns hold a
standing sidebar at exactly the y-position used on pages 4 and 6.

## Related Rules
- [`25-spacing-and-typesetting`](25-spacing-and-typesetting.md) — hyphenation and widow control inside the columns this layout creates.
- [`30-grid-systems`](30-grid-systems.md) — the baseline and column measurements the furniture sits on.
- [`31-layout-structures`](31-layout-structures.md) — the macro-structure chosen before the repeating furniture is drawn.
- [`82-bleed-trim-and-safe-areas`](82-bleed-trim-and-safe-areas.md) — how much image must extend past the trim for a full-bleed spread.
- [`83-resolution-and-raster-formats`](83-resolution-and-raster-formats.md) — resolving images at the physical size a running page demands.

## Sources
- Müller-Brockmann, *Grid Systems in Graphic Design*, "Page numbers" — the folio belongs to the grid and the margin, and is positioned once for the whole publication.
- Müller-Brockmann, *Grid Systems in Graphic Design*, "Width of column" and "Leading" — column length must be proportioned to the typeface and leading, not chosen independently.
- Hochuli, *Detail in Typography* — captions, folios, and running heads are set to subordinate specifications so they never compete with the text they label.
