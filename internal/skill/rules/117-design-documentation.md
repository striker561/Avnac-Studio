# Rule: Design Documentation

**Domain:** production · **ID:** `117-design-documentation`

## Purpose
Leave a record that lets someone else — including you in six months — change the design without breaking
the reasoning behind it. Documentation is not a description of what the pixels look like; it is the log of
what was decided, what was rejected, and which constraint made it so.

## Definition
Project documentation is a small, versioned set of artifacts attached to the work: a decision log
(decision, alternatives, reason, owner, date), a version history (what changed at each delivery), an asset
register (what each asset is and what it may be used for), and one page of rationale for anyone who was
not in the room.

## Core Principles
- A decision without a reason is an instruction; a decision with a reason can be re-decided when the
  constraint moves. Record the constraint, not just the choice.
- Record the rejected option in one line. It is the cheapest way to stop the same argument from returning
  with a new stakeholder's name on it.
- Write reasons that can be checked later. "112 px headline so it survives a 25% thumbnail in-feed" beats
  "stronger hierarchy" — one is testable, the other is a mood.
- Versions are immutable: v02 is a new file, never an edit of v01. Every artifact carries a version, a
  date and an owner.
- The asset library has a schema or it is a folder of guesses: name, format, dimensions, color space,
  license, source, intended use, owner.
- Use four statuses only: proposed, accepted, superseded, deprecated. A fifth status is a sign nobody is
  deciding.

## Techniques
1. **Keep a decision log** — a table with `id | date | decision | alternatives | reason | owner`, ten to
   twenty rows for a project: `D07 · 2026-11-05 · body 16 px, not 14 px · 14 px was on the table for
   density · it passed contrast but failed the 320 px reflow test · AR`.
2. **Keep a version history** — one line per delivery: version, date, what changed, what deliberately did
   not, who approved. `v03 · 12 Nov · date moved below the rule, legal re-set to 12 pt · headline
   unchanged · client`. Keep the previous file.
3. **Keep an asset register** — a CSV with the same columns every time, license and expiry included. An
   expired stock photograph is a legal problem, not a filing problem.
4. **Name the canvas, not only the file** — group and layer names such as `poster/headline`, `hero/cta`,
   `bg/texture`, so a written note can point at an element the next editor finds in one click.
5. **Write the one-page rationale and link supersession** — three paragraphs: the problem, the decision
   that solved it, the compromise accepted. When a brand or system document later changes, its
   decision-log entry points at the replacement, so no reader follows a dead instruction.

## When to Use
- Any project longer than two weeks, or with more than one decision-maker.
- Brand and design-system work, where the documentation is half the deliverable rather than a by-product.
- Whenever a constraint is likely to move: budget, platform, audience, regulation.

## When to Avoid
- Don't write a decision log for a single-artboard social post. A filename and a two-line caption are
  proportionate.
- Don't reconstruct decisions months later as a narrative of how clever the process was. If it did not
  affect the artifact, it was not a decision.
- Don't let documentation become an unrequested deliverable for a client who asked for a poster. Either
  scope and price it, or skip it.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Recording "per client feedback" as the reason | Names no constraint, so it cannot be revisited | Record what the client needed, not who asked |
| Overwriting v01 with v02 | The reason a change happened disappears with the old file | New file per version, old one kept |
| Asset library without a license column | A stock image expires and stays in use | Add license and expiry; audit quarterly |
| A 40-page brand book nobody opens | Completeness is not usability | One page of rationale, a token file, a decision log |
| Writing the rationale months later | It reconstructs a story instead of a record | Write the entry the day the decision is made |

## Practical Examples
A six-week identity project, documented in four small files.

- `decisions.md` — 14 rows, one line each: `D03 · 2026-10-14 · wordmark, not a symbol · symbol explored
  for the app icon and dropped · it turned to mush at the 12 mm minimum size · AR`; and
  `D09 · 2026-10-29 · brand red #C6362F, not #E23B32 · the lighter red shifted toward orange on uncoated
  stock · AR`.
- `changelog.md` — `v01 · 21 Oct · three directions · internal`; `v02 · 28 Oct · direction B with the red
  corrected · client`; `v03 · 11 Nov · final lockups plus a 24 px favicon · client, signed`.
- `assets.csv` — `logo_primary.svg | SVG | 24×24 viewBox | sRGB | owned | AR | nav, print, favicon`.
- `rationale.pdf` — one page: the positioning problem, why a wordmark, and the accepted compromise that
  the app icon is a letterform in a rounded square.

Six months later a new designer reads those four files and knows why the red changed.

## Related Rules
- [`116-design-handoff`](116-design-handoff.md) — the package this record travels inside.
- [`57-brand-guidelines`](57-brand-guidelines.md) — the client-facing document, a different artifact from the project record.
- [`91-design-systems`](91-design-systems.md) — tokens and components as living documentation rather than a PDF.
- [`111-design-critique`](111-design-critique.md) — the decision list at the end of a critique is the raw material for the log.
- [`115-export-and-file-formats`](115-export-and-file-formats.md) — version naming that makes the history legible at a glance.

## Sources
- Nygard, "Documenting Architecture Decisions" (2011) — the decision-record shape of context, decision,
  status and consequences, which this rule adapts to design.
- *Graphic Artists Guild Handbook*, on records and file retention — why a studio keeps source files and
  written approvals.
- Shaughnessy, *How to Be a Graphic Designer Without Losing Your Soul*, on the studio archive — what a body
  of work is actually made of once the projects end.
