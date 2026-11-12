# Rule: Design Process

**Domain:** foundations · **ID:** `01-design-process`

## Purpose
Turn a request into a finished piece through a fixed sequence of narrowing decisions, so expensive work happens only after cheap decisions are settled. It also sets how much process a job deserves: twenty thumbnails for an internal slide is waste; one draft for a print run is negligence.

## Definition
Design process is the ordered set of stages — brief, research, thumbnails, refinement, production — each gated by an exit test that must pass before the next begins. The stage count stays constant; depth scales with risk, the cost of being wrong: money, reprint, or rework.

## Core Principles
- Decide in words before pixels. A five-line brief — audience, one message, format in px, constraints, success test — costs six minutes and prevents most rework.
- Diverge cheap, converge expensive. Twenty thumbnails at 1:4 scale cost less than one hour of refinement on the wrong concept.
- End every stage with a recorded decision and the alternative you rejected. A decision you cannot restate was not a decision.
- Risk sets depth: internal one-off (light), client deliverable (standard), print at cost or brand system (full).
- Freeze the concept before production. After the freeze, changes are scope changes, priced and scheduled, not edits.

## Techniques
1. **Five-line brief** — audience, single message, canvas in px, constraints, success test ("a stranger can name the event and date from 2 m"). Ten minutes maximum.
2. **Timed divergence** — 20 thumbnails at 90 seconds each, 270 px wide for a 1080 px canvas (1:4). No undo, no color, no type detail: shape and placement only.
3. **Two-pass selection** — pick five by gut, then score them 1–5 on message clarity, distinctiveness, and producibility. Take the highest total and keep the runner-up.
4. **Vertical slice** — refine one complete section (headline, hero, one button) to final quality, test it at 25%, then propagate its values to the rest and log the version (`v0.1`, `v0.2`) in the filename.

## When to Use
- Any task with more than one deliverable or one feedback round.
- When the request is vague ("something clean and modern") — the brief is how you find out what that means.
- Print, brand, and public-facing work, where being wrong costs money.

## When to Avoid
- A one-element correction needs a direct edit plus one reduction check, not a process.
- When a design system already fixes palette, type, and grid, skip research and thumbnails; go straight to layout.
- Don't present process artifacts as proof of effort — show decisions and outcomes.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Starting in the final canvas at 100% | Detail locks in before composition is solved | Thumbnails at 1:4 first |
| Showing three near-identical options | The client picks decoration, not a concept | Options that differ in concept |
| Skipping thumbnails because the layout "is obvious" | It is the convention you were hired to beat | Force ten bad thumbnails |
| Refining a weak concept | Polish makes a bad idea convincing enough to ship | Return to thumbnails |

## Practical Examples
A 1080×1350 poster for a warehouse print fair, medium risk.

Brief: designers and students, one message ("late-night print fair, Fri 14 Nov"), two colors `#121212` and `#F5F1E8`, success test "the date is legible at 250 px wide".

Divergence: 16 thumbnails at 270×338 px, 90 seconds each. Concept 9 wins — the date as the poster's structure, numerals cropped by the left edge — on distinctiveness and producibility.

Refinement: numerals at 460 px, tracked −4%, cropped 40 px past the edge; body at 22 px; tested at 270 px, where the date still reads.

Production: PNG at 1080×1350 for the feed, plus an A4 master at 2480×3508 px with 35 px bleed (3 mm at 300 ppi) for the run.

## Related Rules
- [`00-core-principles`](00-core-principles.md) — the constraints the brief has to encode.
- [`34-composition-techniques`](34-composition-techniques.md) — what thumbnails are actually for.
- [`111-design-critique`](111-design-critique.md) — running the selection pass without taste arguments.
- [`113-design-quality-checklist`](113-design-quality-checklist.md) — the gate before production.

## Sources
- Shaughnessy, *How to Be a Graphic Designer Without Losing Your Soul*, p. 84 — announce the work, show it, stop talking; clients need time to respond.
- Monteiro, *Design Is a Job* — scope, change orders, and why unfrozen concepts destroy schedules.
- Graphic Artists Guild, *Handbook*, "Estimates" — pricing and scheduling by stage rather than by finished artifact.
