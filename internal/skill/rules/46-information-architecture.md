# Rule: Information Architecture

**Domain:** ui · **ID:** `46-information-architecture`

## Purpose
Decides what exists, what it is called, and how it is ordered and nested — then makes that structure visible in the layout. Reach for it when the content is right but finding things inside it is slow.

## Definition
Information architecture is the structure of a body of content: the items, their labels, their grouping, their order, and the paths between them. On a canvas it shows up as indentation, dividers, headings and navigation position; in print as running order, sections and a contents page. Good IA means a viewer can predict where a thing is before going to look for it.

## Core Principles
- Order by the viewer's model, not the org chart. Four orders that hold: alphabetical (lookup), chronological (sequence), frequency (daily use), importance (decision).
- Labels are the interface. Use plain nouns of one to three words with parallel grammar and no internal vocabulary: "Billing", not "Financial Operations".
- Breadth beats depth: at most seven top-level items and at most three levels. Depth costs a decision at every level; breadth costs one scan.
- One concept, one name, everywhere. Two labels for one thing double the map the viewer must hold.
- Location must be visible: active nav state, breadcrumb, page title, section number. A viewer who cannot say where they are was lost by the architecture.
- Visual hierarchy is IA made visible: indent 24 px per level, parents at full weight, children at 70% value.

## Techniques
1. **Card sort first** — 20–30 items, five users, ask them to group. Adopt a grouping only when 60–70% of participants produce it; anything less is your opinion.
2. **Seven-item cap** — if the top level exceeds seven, promote a hub ("More", "All tools") or merge two siblings. Never shrink the type to fit an eighth item.
3. **Bare-label test** — read each label with no context. If it needs its children to make sense, it is a category description, not a label.
4. **Depth audit** — write the path to the three most-wanted destinations. Any path longer than three steps is a restructure, not a nav fix.
5. **Print equivalent** — for documents, IA is running order plus contents page; test it by reading only the contents and predicting where one fact lives.

## When to Use
- Sites, apps, docs and dashboards with more than one screen or more than 20 items.
- Multi-section print: catalogs, reports, programs, manuals, exhibition guides.
- When search is being used as a substitute for structure.

## When to Avoid
- Single-screen pieces: a poster has an order of reading, not an information architecture.
- Portfolio and gallery work where browsing is the point — the grid's order is the architecture, and a menu would interrupt it.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| A 40-link mega-menu | Exceeds working memory at the moment of choice | Seven top items, one level of grouping |
| Alphabetical nav for a task product | Users think in tasks, not names | Order by frequency; keep A–Z for lookup |
| Two labels for one page | The viewer builds two maps | One label per concept, enforced in a table |
| Everything filed under "Resources" | A label that carries no information | Split by task: "Guides", "Templates", "API" |

## Practical Examples
A 1440×900 documentation site: 264 px left nav with six sections of at most six items; the active item carries a 3 px `#1F6FEB` bar on its left edge plus Semibold weight; children indent 24 px and drop to 70% value. A 13 px breadcrumb sits above the H1, and the right column lists four to six on-page anchors. The three most-wanted pages — "Install", "Tokens", "Changelog" — all sit at level 2, two clicks from home.

## Related Rules
- [`42-cognitive-load`](42-cognitive-load.md) — the working-memory limit this structure is fitted to.
- [`02-visual-hierarchy`](02-visual-hierarchy.md) — how the structure becomes visible order.
- [`32-editorial-layout`](32-editorial-layout.md) — running order and standing elements in print.
- [`93-interface-layout-and-spacing`](93-interface-layout-and-spacing.md) — nav widths and indents on the 4/8 px grid.
- [`90-ui-design-principles`](90-ui-design-principles.md) — screen conventions for navigation and location.

## Sources
- Rosenfeld, Morville & Arango, *Information Architecture*, ch. "Organization Systems" — the four ordering schemes and labeling systems.
- Müller-Brockmann, *Grid Systems in Graphic Design*, "Systems of order in ancient and modern times" — ordering as a design problem before it was a software problem.
- Nielsen Norman Group, "Card Sorting" — the agreement thresholds used to accept a grouping.
