# Rule: Data Visualization

**Domain:** ui · **ID:** `96-data-visualization`

## Purpose
Make a table of numbers into a picture whose proportions a reader can trust at a glance. This rule
picks the chart form, strips what carries no information, and catches distortions that persuade
instead of inform.

## Definition
Data visualization maps measured quantities onto visual variables — position, length, area, angle,
value, hue — so ratios in the data are readable as ratios on screen. The mapping is honest only
when equal data differences produce equal visual differences from a stated zero.

## Core Principles
- Position on a common scale is the most accurate encoding; length second; angle and area third;
  color last. Use the most accurate encoding the data allows.
- Bar, column, and area encodings start at zero. A cropped bar axis does not zoom in, it misstates
  the ratio between the bars.
- Sort by value unless categories carry an intrinsic order (months, age bands, stages). Alphabetical
  order hides the ranking the reader came for.
- One chart answers one question. Two units on one y-axis produce a relationship that exists only
  inside the chart.

## Techniques
1. **Pick the form from the question** — comparison: horizontal bar; trend: line with 4–6 ticks;
   distribution: histogram; part-to-whole: stacked bar (pie only at 2–3 slices); correlation: scatter.
2. **Erase to the data-ink floor** — delete vertical gridlines, frame, and background fill; keep a
   1 px zero baseline `#D4D4D4` and 4–5 horizontal gridlines at 12% tint. Axis labels 12 px
   `#6B6B6B`, data labels 14 px `#1A1A1A`.
3. **Anchor zero, then check the lie factor** — lie factor = (percent change shown) ÷ (percent change
   in the data). Outside 0.95–1.05, redraw. Crop a line's range only if the caption prints it.
4. **Label directly, delete the legend** — put the series name at the end of its line, 12 px in the
   series color. A legend makes the eye shuttle; a direct label stays on the data.
5. **Small multiples instead of a rainbow** — nine 240×160 px panels on one shared scale and one
   color beat nine hues in one frame: shape compares, hue stops identifying.

## When to Use
- Any chart in a report, slide, infographic, or dashboard.
- When one number is the headline: a 64 px figure with a one-line comparison beats a chart of it.

## When to Avoid
- Decorative "data art" that claims no quantity — readers will read magnitudes off it anyway.
- Dual-axis charts unless both series are indexed to 100 with a labeled baseline.
- More than ~2,000 plotted points; bin them or use a heatmap first.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| 3D bars and extruded pies | Near bars look larger at equal value | Flat 2D; keep depth outside the plot |
| Truncated bar baseline | Doubles the apparent difference | Start at zero, or use a dot plot |
| Rainbow categorical palette | 12 hues blur, and 5–10% of viewers can't split red/green | One hue in value steps, plus direct labels |
| Labeling every point | Ink without information; the shape vanishes | Label first, last, max, min |

## Practical Examples
A 1200×800 "Weekly signups" card:

- Plot: `rect` x=160 y=120 w=880 h=480; 1 px zero baseline `#D4D4D4` at y=600.
- 8 bars, w=72, gap=38 (8×72 + 7×38 = 842, inside 880); 4,200 → 448 px tall.
- Bars `#2F5D8C`; the current week alone in `#E4572E`, so color means "now", not "category".
- No legend, no vertical gridlines; x-labels 12 px `#6B6B6B`, every other one suppressed.
- Data labels on the max and current bars only: 14 px `#111111`, 8 px above the cap.

## Related Rules
- [`97-dashboard-design`](97-dashboard-design.md) — these charts assembled into one screen.
- [`18-color-accessibility`](18-color-accessibility.md) — palettes that survive color-blindness.
- [`02-visual-hierarchy`](02-visual-hierarchy.md) — figure, title, and caption are a hierarchy too.
- [`42-cognitive-load`](42-cognitive-load.md) — why fewer marks read faster.

## Sources
- Tufte, *The Visual Display of Quantitative Information*, p. 61 — the lie factor, and the 0.95–1.05 band that separates distortion from plotting error.
- Tufte, p. 97 and p. 100 — data-ink defined as the non-erasable core, then maximized by erasing non-data-ink.
- Tufte, p. 107 — grid ticks and frames kept only where they orient the reader.
