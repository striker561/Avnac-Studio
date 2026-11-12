# Rule: Design Critique

**Domain:** foundations · **ID:** `111-design-critique`

## Purpose
Turn a reaction into a diagnosis the next iteration can act on. A critique names what is wrong, where
it is, and what to change, ordered by the cost of not fixing it. Without that structure, feedback
arrives as a list of preferences and the work moves sideways for a week.

## Definition
A critique is a structured evaluation of work against its stated goal that produces named faults
ranked by severity. It keeps apart three things casual feedback fuses: **failures** the piece can be
shown to have (contrast under 4.5:1, a misspelled venue, an image at 179 PPI in a 300 PPI placement),
**weaknesses** where a better option exists and nothing is broken, and **preferences** that are
legitimate either way and need a decision-maker rather than a defense.

## Core Principles
- Judge the work against the brief, not against the critic's taste in portfolios. If no goal is
  written down, write one line first: "someone walking past at 2 m must read the date".
- Rank by cost, not by ease. Three notes that change the outcome beat fifteen that could be tidied; a
  list past five items means you have not decided what matters.
- Describe, effect, cause, fix: "The date is 13 px at 55% gray. At arm's length it disappears into
  the photograph. It is both the smallest and the lightest element on the sheet. Set it at 20 px in
  `#F2EFE6` and move it below the rule."
- Convert every note into a test. If you cannot say how you would verify the fix — squint from 3 m,
  grayscale, measure the gaps — it is still an opinion.
- On receiving critique, separate the note from the proposed fix. "Make the logo bigger" reports a
  hierarchy failure; it does not prescribe a size.

## Techniques
1. **State the goal before the first comment** — one sentence agreed by the room. Every later note is
   measured against it, which is what stops a taste argument from consuming the hour.
2. **Three passes, increasing zoom** — 3 seconds at thumbnail (order of reading), a full read at 100%
   (copy, type, contrast), inspection at final size (bleed, PPI, alignment to the grid).
3. **Tag every note F / W / P** — failure, weakness, preference. Ship the F list, discuss W, route P
   to whoever owns the decision. A critique that opens with P wastes the meeting.
4. **Write before speaking** — five minutes of silent annotation. Otherwise the first confident voice
   anchors the room and everyone converges on it, right or wrong.
5. **Close with a decision list** — who changes what, by when, and what will not change. Without one,
   the same notes return next round with a new attendee.

## When to Use
- At every milestone with a real artifact: after the direction is chosen, before the client
  presentation, before the file goes to the printer.
- When feedback arrives as a feeling — "not premium", "feels cheap". That is the signal to run the
  four-sentence format until a cause surfaces.
- On your own work as a second pass, with the notes written down rather than merely thought.

## When to Avoid
- During divergence. Structured critique on thumbnails kills the odd idea that would have won;
  collect reactions, not verdicts, until one direction is chosen.
- When the critic has not read the brief. Half of what passes for critique is a complaint that the
  work is not the work the critic would have made.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| "Make it pop" as a note | Names no property, so any change satisfies it | Name element, property, target: "headline 112 → 132 px" |
| Fifteen notes of equal weight | The maker fixes the cheap ones and the real fault ships | Rank them, cap at five, failures first |
| Critiquing concept at the polish stage | Reworking at the wrong altitude costs days | Gate the direction before refinement begins |
| Defending a choice by intent | The reader's experience outranks what you meant | Ask what the work does, then decide whether to keep it |
| The senior person stays silent | The room reads silence as approval and ships | Ask the most senior critic last and explicitly |

## Practical Examples
A 700×1000 mm exhibition poster, third round. The critic writes six notes, tags them, delivers three.

- **F1** — body copy is 9.5 pt on a sheet read from 1.5 m; re-set at 14 pt.
- **W1** — at 25% zoom the title, sponsor lockup and date all resolve at the same weight; the date
  drops to 60% white, one size step down.
- **W2** — the photograph is 2140 px wide placed at 660 mm, which is 82 PPI; crop to 420 mm (135 PPI)
  or re-request 4400 px.
- **P1, deferred** — the curator prefers a serif title. Not a fault; it goes to the curator with one
  line of cost ("the serif loses the 1.4× size jump I used for the date").

Decision list: F1 and W1 to the designer by Tuesday; W2 to the producer with a 24-hour deadline for
the new scan; P1 stays open until the print date and does not block prepress.

## Related Rules
- [`113-design-quality-checklist`](113-design-quality-checklist.md) — the pass/fail gate that handles the F list mechanically, leaving critique free for W.
- [`01-design-process`](01-design-process.md) — where critique sits between refinement and production.
- [`117-design-documentation`](117-design-documentation.md) — where the decision list is recorded so it is not re-argued next month.
- [`02-visual-hierarchy`](02-visual-hierarchy.md) — the most common source of W notes, and how to test it.
- [`112-common-design-mistakes`](112-common-design-mistakes.md) — the faults you should catch without a critique at all.

## Sources
- Monteiro, *Design Is a Job*, on presenting and critiquing work — talk about the work and not the
  person doing it, and steer feedback to goals rather than features.
- Shaughnessy, *How to Be a Graphic Designer Without Losing Your Soul*, on presenting work —
  announce, show, then stop talking so the other person can look.
- *Graphic Artists Guild Handbook*, on professional conduct and approvals — the written record of
  what was decided is the thing you can point at afterwards.
