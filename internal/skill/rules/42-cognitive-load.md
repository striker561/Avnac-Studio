# Rule: Cognitive Load

**Domain:** psychology · **ID:** `42-cognitive-load`

## Purpose
Keeps the number of things a viewer must hold in mind at once below the hard limit, so the design can be understood rather than merely seen. Use it when a screen is complete and still exhausting.

## Definition
Cognitive load is the working-memory cost of using a design: the items to compare, the choices to make, the labels to remember from one screen to the next. Working memory holds about four chunks — seven only when the chunks are already familiar. Load from the content is intrinsic; load from the layout is extraneous, and that is the part you can remove without losing information.

## Core Principles
- Four chunks, not seven. Miller's 7±2 assumes chunking; a first-time viewer of an unfamiliar layout gets about four.
- Decisions serialize. Choice reaction time rises with log2(n+1) (Hick's law): two options is quick, eight is slow, twenty feels like work.
- Chunking changes the count without changing the content: twelve features read as twelve items alone, as three items inside three labeled groups of four.
- Every element that does not change a decision is a tax — the decorative rule, the restated label, the icon that repeats its own text.
- Progressive disclosure is a depth budget, not a hiding trick: two levels maximum, each with a visible label.

## Techniques
1. **Count decisions per zone** — list every choice a viewer makes in one view. Above four, split the view or set a default.
2. **Chunk to three or four** — a 12-field form becomes three sections of four with visible headings; nine settings become three groups of three.
3. **Default the boring decisions** — quantity 1, standard shipping, monthly billing, the middle plan. A default removes a decision, so it must be the one you would recommend.
4. **Two-level disclosure** — primary action visible, detail behind one control labeled with a noun ("Options", "Full specs"). A third level inside a static layout is a maze.
5. **Delete non-information** — remove any element no viewer acts on, then re-read the layout. If it still reads, the deletion was correct.

## When to Use
- Forms, pricing tables, settings, onboarding, checkout — anywhere the viewer has to act.
- Dense print: instruction panels, spec sheets, ticket backs, medication-style information blocks.
- When a design is "correct but tiring" — that is load, not taste.

## When to Avoid
- Expert tools where density is the feature: trading dashboards, data tables, code editors. Experts want everything at once and know the map.
- Reference material built for lookup — an index, a legend, a parts list — where alphabetical or numeric order beats thematic grouping.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| A 12-field form on one screen | Exceeds working memory; abandonment rises | Two steps of six, progress shown |
| Four buttons of equal weight | The viewer must read all four to choose | One filled primary, the rest text buttons |
| Icon-only labels on a new feature | Requires recall of a meaning not yet learned | Icon plus label on first exposure |
| Critical info two levels deep | The viewer never opens the second level | Disclose detail, never the main action |

## Practical Examples
A 1440×900 settings screen: 240 px left nav with three sections; the content column is 640 px wide, each section headed by a 13 px all-caps `#6B7280` label with four rows beneath — twelve settings read as three chunks. Each row is label 15 px `#111111` at left, control at right, 16 px vertical padding, no dividers inside a section and a 1 px `#E5E5E5` rule between sections. One `#1F6FEB` "Save changes" button, 44 px tall, at the bottom; nothing else is filled.

## Related Rules
- [`47-cognitive-biases-and-visual-design`](47-cognitive-biases-and-visual-design.md) — what happens to a decision once the count is under control.
- [`46-information-architecture`](46-information-architecture.md) — chunking applied to a whole body of content.
- [`90-ui-design-principles`](90-ui-design-principles.md) — screen conventions that assume these limits.
- [`43-attention-and-eye-tracking`](43-attention-and-eye-tracking.md) — where the freed attention goes.

## Sources
- Miller, "The Magical Number Seven, Plus or Minus Two" (1956) — the original capacity claim and its chunking caveat.
- Cowan, "The Magical Number 4 in Short-Term Memory" (2001) — the revision to about four chunks.
- Hick (1952) and Hyman (1953) — choice reaction time against the number of alternatives.
