# Rule: Dashboard Design

**Domain:** ui · **ID:** `97-dashboard-design`

## Purpose
Build a screen that answers "is anything wrong, and where?" in under five seconds. A dashboard is
not a report with cards; it is a fixed set of questions with a fixed order of answering them.

## Definition
A dashboard is one screen of pre-attentive summaries: each tile states a question, shows one number,
and gives the comparison that makes that number mean something. The layout is a reading order, and
the reading order is a claim about what matters.

## Core Principles
- One screen, one decision. A screen serving three unrelated decisions is a report with sections.
- 5–7 tiles above the fold; past 9, nothing is seen. The rest belongs in a table below.
- Every KPI tile carries label, value, comparison, and definition. A number nobody can define
  ("engagement: 74") is decoration.
- The most consequential number goes top-left, where eyes enter; the logo does not get that slot.
- Color is a budget: one red tile means red works; three red tiles mean red is wallpaper.
- State the direction of goodness — for latency, churn, and errors, up is bad.

## Techniques
1. **Row architecture** — 1440 px canvas, 12 columns, 24 px gutters, 24 px margin. Row 1: four KPI
   tiles at 3 columns × 136 px. Row 2: trend at 8 columns + breakdown at 4, 320 px tall. Row 3:
   table at 12 columns, scrolling.
2. **KPI tile anatomy** — label 12 px/600 caps, +4% tracking, `#6B6B6B`; value 36 px/600 `#111111`
   in tabular figures; delta 13 px `#1B7F4B` or `#B3261E` with arrow **and** word ("▲ 12% better");
   footnote 11 px, "vs. previous 7 days".
3. **Sparklines for shape** — 120×32 px, 1.5 px stroke, no axes, one 4 px dot on the last point.
   Trend without demanding a chart, so the tile stays a number.
4. **Small multiples for comparison** — 3×2 panels of 200×120 px on one shared scale, one panel
   highlighted. Nine regions in nine colors is unreadable; nine panels are not.
5. **Alert ladder, three rungs** — critical: red band, icon, sentence; warning: amber;
   informational: neutral. Pair color with an icon, or color-blind readers lose the alert.
6. **Progressive density** — totals on top, breakdown middle, raw rows below. A 40-row table never
   goes above the fold.

## When to Use
- Operational monitoring, exec summaries, analytics surfaces with a recurring audience.
- When the same five questions arrive every Monday — that repetition is the signal.

## When to Avoid
- Exploratory analysis; a dashboard answers fixed questions, so use a filterable view.
- Data that changes less than daily — a static summary page reads better and costs less.
- An audience of one, used once. A well-made slide is the right artifact.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| 12 equal-weight tiles | No entry point, so the eye wanders | 3–5 primary tiles; demote the rest |
| Mixed time ranges per tile | A 7-day figure gets compared with a 30-day one | One range per row, in the row header |
| Auto-refresh without a timestamp | Nobody can tell whether the number is stale | "Updated 14:32" in the header |

## Practical Examples
A 1440×900 operations dashboard:

- Header 56 px: product name 16 px/600 left; "Updated 14:32 · last 24 h" 12 px `#6B6B6B` right.
- Row 1 at y=96: four tiles, 336×136 with 24 px gaps, `#FFFFFF` on `#F5F6F8`, radius 8.
- "Error rate" is the only tile with a 3 px red left border `#B3261E` — one alert per screen.
- Row 2 at y=256: 8-column line chart, 320 px tall, 48 px threshold rule dashed 4/4 in `#B3261E`.
- Row 3 at y=600: 10 slowest endpoints, 13 px text in 40 px rows, sorted descending.

## Related Rules
- [`96-data-visualization`](96-data-visualization.md) — the encoding rules each tile inherits.
- [`42-cognitive-load`](42-cognitive-load.md) — why 7 tiles read and 20 do not.
- [`02-visual-hierarchy`](02-visual-hierarchy.md) — building the entry point top-left promises.

## Sources
- Tufte, *The Visual Display of Quantitative Information*, p. 187 — the "friendly" graphic: words spelled out, labels on the graphic instead of a legend.
- Tufte, *Envisioning Information*, "Small Multiples" — repeated panels on a shared scale as the comparison method.
- Müller-Brockmann, *Grid Systems in Graphic Design*, p. 72 — bisecting a column field, the arithmetic behind a row grid.
