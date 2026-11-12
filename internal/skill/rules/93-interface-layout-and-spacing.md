# Rule: Interface Layout and Spacing

**Domain:** ui · **ID:** `93-interface-layout-and-spacing`

## Purpose
Give a screen a measurable structure: a spacing scale that decides every gap, containers that stop
lines from running to the edge, and a column grid that keeps regions in relation at any width.
Spacing is the cheapest hierarchy tool in a UI and the first thing to look arbitrary when improvised.

## Definition
An interface layout is a set of containers — page, region, card — filled by a column grid, with
vertical rhythm driven by a spacing scale. The scale is a fixed set of allowed increments (4, 8, 12,
16, 24, 32, 48, 64, 96 px); every margin, padding and gap is one of those numbers.

## Core Principles
- Two base values, two jobs: 4 px for adjustments inside a component, 8 px for everything between
  components. A gap that is not a multiple of 4 is a mistake with a story.
- Space encodes relationship, monotonically: 4–8 px same group, 12–16 px related groups, 24–32 px new
  section, 48–96 px new region. Adjacent levels differ by at least 2× or grouping is ambiguous.
- Line length is a container decision: 45–75 characters, roughly 480–720 px at 16 px. Cap prose
  containers at 720 px and let data tables run wider.
- Break the grid, not the scale. Twelve columns give 2/3/4/6-column spans; a 5-column layout on 12
  columns produces fractional gutters that never align optically.
- Vertically, snap to a 4 px baseline: 20 px line-height for 13–14 px text, 24 px for 15–16 px,
  28–32 px for 20–24 px headings.

## Techniques
1. **Compute the column** — (container − 2 × margin − (n−1) × gutter) ÷ n. At 1280 px with 32 px
   margins and 24 px gutters: (1280 − 64 − 264) ÷ 12 = 79.3 px; a 4-column card spans 389 px.
2. **Name the five vertical steps** — section padding 48 px, block gap 24 px, field gap 16 px, label
   gap 8 px, icon gap 4 px.
3. **Set the container widths** — 640 px form, 768 px article, 1024 px dashboard, 1280 px data table,
   1440 px app shell, with 16/24/32/48 px margins by width.
4. **Align to one shared edge** — a single left edge for headings, body and controls in a region. Two
   edges 8 px apart is the most common cause of "why does this feel messy".

## When to Use
- Any multi-region screen: dashboard, settings, list-detail, form, editor shell.
- When a layout goes to a developer — the scale is the only way the numbers survive handoff.
- When a screen feels crowded although the content is modest; the gaps are inconsistent, not small.

## When to Avoid
- Full-bleed editorial or campaign pages where one image is the layout; the grid is a frame, not a
  structure.
- Dense professional tools — timelines, canvases, spreadsheets — where optical alignment to content
  beats numeric alignment to the grid. Document the exception.
- A 12-column grid on a 320 px viewport; there, one column and 16 px margins are the whole system.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Gaps of 10, 14, 18, 22 px | Reads as noise; nothing groups | Snap to 8/16/24 from the scale |
| The same 16 px gap everywhere | Sections and fields look equally related | 16 within, 32 between sections, 48 between regions |
| Content stretched to 1920 px | Lines pass 120 characters; reading collapses | Max-width 720 px |
| Two left edges 8 px apart | The eye reads a wobble, not a hierarchy | One shared left edge per region |

## Practical Examples
A list-detail screen at 1440×900 in Avnac: app shell 1440 px, 240 px rail on `#111418`, content
1200 px with 32 px margins and 12 columns at 24 px gutters (71.8 px each). The list panel spans 4
columns (383 px), the detail panel 8 (767 px), 24 px between them. Vertically: 48 px page padding,
24 px under the detail header, 16 px between field rows, 8 px between label and value, 4 px between
icon and text. Body copy caps at 720 px inside the detail panel, leaving 47 px unused on purpose.

## Related Rules
- [`30-grid-systems`](30-grid-systems.md) — the print column-grid math this scale inherits.
- [`95-responsive-interface-design`](95-responsive-interface-design.md) — how these containers reflow across widths.
- [`07-alignment-and-proximity`](07-alignment-and-proximity.md) — the grouping logic the gap steps encode.
- [`08-negative-space`](08-negative-space.md) — why the space between regions is doing work.
- [`91-design-systems`](91-design-systems.md) — where the space scale lives as tokens.

## Sources
- Müller-Brockmann, *Grid Systems in Graphic Design*, "The grid in three-dimensional design" — one module governs distances between unlike parts.
- Material Design 3 and Apple Human Interface Guidelines — the 4/8 dp base unit and container widths.
- Professional UI convention — 45–75 characters per line, 480–720 px at 16 px.
