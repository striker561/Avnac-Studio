# Rule: Rhythm and Repetition

**Domain:** foundations · **ID:** `05-rhythm-and-repetition`

## Purpose
Make a sequence of items feel like a sequence rather than a pile. Rhythm is what lets a viewer move through a list, a row of cards, or a column of text without re-deciding where to look at every step.

## Definition
Rhythm is the recurrence of intervals — gaps, sizes, weights — at a predictable beat. Repetition establishes the beat; variation of one interval creates accent. A layout has rhythm when you can predict the position of the next item before you see it.

## Core Principles
- Three interval values are enough: small (within a group), medium (between groups), large (between zones). More than three reads as arbitrary.
- Three repeats establish a pattern, five read as texture, and past a dozen identical items the group should tighten into a field.
- One break per sequence. A second accent cancels the first; put the break where the message is.
- Rhythm can accelerate: gaps of 96, 64, 40 px pull the eye toward the focus.
- Vertical rhythm matters as much as horizontal. Apply a baseline unit to every block or columns drift by a few pixels per row.
- Rhythm is not equal spacing. Equal spacing everywhere is a metronome, not a composition.

## Techniques
1. **Set the unit** — 8 px on a 1080 canvas, 12 px at 1920; every gap, padding, and block height is a multiple. Write the unit into the brief.
2. **Three-gap system** — 16 within rows, 48 between rows, 144 between sections. Never invent a fourth value for one element.
3. **Five and a break** — repeat an element five times, then interrupt with scale, color, or a doubled gap exactly once.
4. **Accelerate to the focus** — reduce gaps one step per item for three items; the compression reads as approach.
5. **Tighten as the count grows** — 4 cards at 24 px gaps become 12 cards at 12 px, so the group reads as one texture instead of twelve decisions.

## When to Use
- Lists, schedules, card rows, navigation, table rows, repeated marks, editorial columns.
- Any layout with four or more similar items.
- When a set of items looks "randomly spaced" even though nothing is obviously wrong.

## When to Avoid
- Two- or three-element layouts, where no beat can form.
- Content whose items differ in importance: hierarchy should override rhythm.
- Irregular content that resists a grid, such as a collage. Cluster it instead of forcing a beat.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Gaps of 13, 17, 22 px | Reads as sloppy rather than rhythmic | Snap to the unit: 16, 16, 24 |
| Every item identical | No accent, no place for the eye to land | Break once at the key item |
| Rhythm broken in three places | No pattern survives to be broken | Choose one break |
| Horizontal rhythm only | The column drifts 3–6 px per row | Baseline unit for all blocks |
| Margins used to fake rhythm | Groups dissolve; space stops signalling structure | Differentiate the three gap values |

## Practical Examples
A 1080×1080 schedule with six event rows. Row height 96 px, internal gap 12 px, gap between rows 24 px, header block 144 px above the first row. The unit is 12.

The headliner row is 120 px tall with a 4 px `#FF4D2E` bar on its left edge — the single break, placed where the message is. At 270×270 the rows read as a striped texture and the orange bar is the only colored mark, so the break survives the reduction.

## Related Rules
- [`04-balance-and-proportion`](04-balance-and-proportion.md) — proportion applied to areas rather than intervals.
- [`06-unity-and-variety`](06-unity-and-variety.md) — repetition as the main unity device.
- [`07-alignment-and-proximity`](07-alignment-and-proximity.md) — spacing used for grouping rather than beat.
- [`30-grid-systems`](30-grid-systems.md) — the structure that makes a vertical rhythm possible.

## Sources
- Müller-Brockmann, *Grid Systems in Graphic Design*, p. 69 — between grid fields, one line of leading is left empty or used for captions: a repeated interval doing structural work.
- Hofmann, *Graphic Design Manual*, p. 126 — line exercises that vary thickness and curvature along paths of motion, with gradation of tone: repetition with controlled variation.
- Gerstner, *Designing Programmes* — rhythm as a programmable system rather than a hand-placed arrangement.
