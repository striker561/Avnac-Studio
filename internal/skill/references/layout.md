# Layout — reference

Use when deciding structure before placing elements. Rules:
[`30-grid-systems`](../rules/30-grid-systems.md),
[`31-layout-structures`](../rules/31-layout-structures.md),
[`32-editorial-layout`](../rules/32-editorial-layout.md).

## Grid anatomy

| Part | Definition | Typical value |
|---|---|---|
| Margin | Space from trim to type area | 1/9–1/12 of short edge |
| Column | Vertical field for content | 1 column ≈ 55–75 characters |
| Gutter | Space between columns | 4–8 mm print; 16–24 px screen |
| Field / module | Column × baseline-row unit | Drives image boxes and spacing |
| Baseline grid | Horizontal rhythm for text | = body line-height |
| Hang line | Horizontal guide for starting elements | Usually the first baseline |

## Choosing a structure

| Structure | Best for | Avoid when |
|---|---|---|
| Single column | Essays, posters, mobile, one message | Comparison, tables, catalogues |
| 2 columns | Reports, brochures, editorial features | Long body text at small size |
| 3–4 columns | Newspapers, listings, dashboards | Hero imagery that needs width |
| 12-column | Web/app layouts, flexible systems | Print where 12 columns get too narrow |
| Modular | Catalogues, grids of equal items | One dominant image |
| Full-bleed + inset | Photography, premium print | Text-heavy documents |
| Broken / asymmetric | Editorial, posters, art direction | Dense data, repeated templates |

## Margins that look intentional

| Format | Short edge | Margin range |
|---|---|---|
| A4 | 210 mm | 18–25 mm |
| A3 | 297 mm | 25–33 mm |
| A2 poster | 420 mm | 35–47 mm |
| 1080 px social | 1080 px | 54–86 px (5–8%) |
| 1440 px web | 1440 px | 72–120 px (5–8%) |
| Book spread | 148 mm (A5) | inner 15–20 mm, outer 18–25 mm |

Asymmetric margins are fine — but make the ratio deliberate (2:3, 3:5) and repeat it.

## Column math

```
content width = page width − (2 × margin)
column width  = (content width − (columns − 1) × gutter) / columns
```

Worked example, A4 portrait (210 × 297 mm), 20 mm margins, 3 columns, 5 mm gutters:
content = 170 mm; columns = (170 − 10) / 3 ≈ 53.3 mm — about 60–70 characters at 10 pt.

## Vertical rhythm

- Baseline = body line-height (e.g. 16 px text / 24 px leading → 24 px baseline).
- All block spacing should be a multiple of the baseline (24, 48, 72 px).
- Headings usually need 2 baselines above and 1 below; the asymmetry signals grouping.
- Images snap to the baseline grid too, or the page looks hand-placed.

## Responsive breakpoints

| Width | Layout |
|---|---|
| < 480 px | 1 column, 16–20 px margins, stacked |
| 480–768 px | 1–2 columns, 24 px margins |
| 768–1024 px | 2 columns, 32–40 px margins |
| 1024–1440 px | 3–4 columns, 48–64 px margins, max content ~1200 px |
| > 1440 px | Same grid, wider margins; cap measure, not columns |

## Editorial components

| Element | Convention |
|---|---|
| Running head | Top outer corner, 8–9 pt, caps, 60–70% value |
| Folio | Bottom outer corner, aligned to text block |
| Deck / standfirst | 18–22 pt, 1.3 line-height, above body |
| Caption | 8–9 pt, aligned to image edge, never centered under a left-aligned image |
| Pull quote | 2–3× body size, hanging in the margin or spanning columns |
| Drop cap | 3–4 lines deep, aligned to the first baseline |

## Diagnostics

| Symptom | Likely cause | Fix |
|---|---|---|
| Page feels crowded | Margins too small or too many elements | Increase margins before shrinking type |
| Page feels empty | One small element in a large field | Enlarge the focal element, not the count |
| Layout feels "off" | Misaligned edges, inconsistent gutters | Snap to a grid; check every edge |
| Reading stalls | Measure too long, or columns of unequal weight | Shorten measure, rebalance columns |
| Spread feels split | No element crossing the gutter | Bridge with an image or a full-width rule |

## Rules

- [`30-grid-systems`](../rules/30-grid-systems.md) — building and breaking a grid.
- [`31-layout-structures`](../rules/31-layout-structures.md) — structure selection.
- [`32-editorial-layout`](../rules/32-editorial-layout.md) — spreads, folios, captions.
- [`33-asymmetric-and-modular-layouts`](../rules/33-asymmetric-and-modular-layouts.md) — asymmetry with control.
- [`07-alignment-and-proximity`](../rules/07-alignment-and-proximity.md) — edges and grouping.
- [`39-responsive-composition`](../rules/39-responsive-composition.md) — reflowing across formats.
- [`93-interface-layout-and-spacing`](../rules/93-interface-layout-and-spacing.md) — the screen variant.
