---
name: visualize
description: Design data graphics and dashboards — choose the right chart, set axes and scales honestly, label clearly, use color for data, and arrange KPIs for scanning. Use whenever the user has numbers to show, mentions charts, graphs, dashboards, metrics, reports, analytics or "make this data visual", or an existing chart is misleading or unreadable.
---

# Data Visualization

## Applies when
The content is quantitative. If the graphic explains a process rather than numbers, use `diagram`.
A chart is an instrument for comparison; if no comparison is needed, the number belongs in a
sentence.

## Workflow
1. **State the question the chart answers.** "Which region grew?" not "show revenue". The question
   determines the chart type.
2. **Choose the encoding from the data type**: change over time → line; ranking → horizontal bar;
   part-of-whole → stacked bar or treemap (avoid pies unless 2–3 slices); distribution → histogram
   or box; correlation → scatter; single value → KPI tile.
3. **Set the scale honestly**: bar charts start at zero; line charts may not, but say so. No
   truncated axes without a break mark and a label.
4. **Maximize data-ink**: remove chart junk, gridlines that do not aid reading, 3D, shadows,
   background images, redundant legends. Label series directly at the line end where possible.
5. **Label deliberately**: axis units, time zone, source, date range, and the takeaway as a title
   ("Revenue doubled in Q3", not "Revenue").
6. **Color with a job**: one series = one color; sequential for magnitude; diverging for
   above/below; categorical max 6–8 distinct hues, ordered for colorblind safety. Never encode
   meaning by color alone.
7. **Check small and grayscale**: the chart must read at 320 px wide and with no hue.
8. **Dashboard order**: top-left = scope and time; then the primary KPI; then trends; then detail.
   Every tile answers one question and declares its time range.

## Decision points
- **Chart or table?** Values that must be looked up precisely → table; patterns → chart. A table
  can be better than a bad chart.
- **One chart or small multiples?** Small multiples for comparing across categories; one chart for
  comparing series within one category.
- **Annotate or not?** Annotate the one event that explains the shape ("pricing change"). Two
  annotations maximum.
- **Real numbers or an index?** Index when absolute scale is confidential or incomparable; label
  the base explicitly.

## Rules to apply
- [`96-data-visualization`](../rules/96-data-visualization.md) — chart choice, data-ink, honesty.
- [`97-dashboard-design`](../rules/97-dashboard-design.md) — density, KPI layout, scanning order.
- [`18-color-accessibility`](../rules/18-color-accessibility.md) — colorblind-safe encoding.
- [`16-palette-construction`](../rules/16-palette-construction.md) — sequential and categorical ramps.
- [`46-information-architecture`](../rules/46-information-architecture.md) — ordering for scanning.
- [`03-contrast-and-emphasis`](../rules/03-contrast-and-emphasis.md) — making the signal strong.

## References
- [`web-and-ui`](../references/web-and-ui.md) — chart sizing, dashboards, states.
- [`color`](../references/color.md) — ramps and contrast anchors.

## Production checks
- Axes labeled with units; zero baseline on bars; no dual axes unless unavoidable and marked.
- Legend or direct labels — not both, not neither.
- Source, date and time zone present.
- Grayscale test: categories still distinguishable.
- Small-size test at 320 px: labels legible, no overlapping ticks.
- Empty, loading and error states designed for dashboards.
- Numbers formatted consistently (thousands separators, decimals, currency).

## Output format
`Question:` what the chart answers. `Encoding:` chart type + why. `Data-ink removed:` list.
`Color:` ramps and ratios. `Labels:` title, axes, source. `Risks:` misleading shapes, missing
context, unreadable small sizes.
