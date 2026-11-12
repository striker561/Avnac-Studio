# Rule: Design Handoff

**Domain:** production · **ID:** `116-design-handoff`

## Purpose
Move finished work into someone else's hands so they can build, print or approve it without coming
back with questions. Handoff is where intent leaks: the file is fine, but the reasoning behind the
24 px gap is not in it, so the next person guesses and the guess ships.

## Definition
Handoff is a package, not a file: the artifact, the specs that describe it in the receiver's units,
the assets it depends on, annotations marking what is fixed and what may flex, acceptance criteria
that define done, and a named approver with a date. It is complete when the receiver has confirmed
they can proceed.

## Core Principles
- Write specs in the receiver's units. Developers think in px, rem and breakpoints; printers think in
  mm, pt, g/m² and spot names. Translate once, here, rather than in a meeting.
- Separate fixed from free. Logo clear space at 0.5× cap height is fixed; the column count at 1024 px
  is free. Unlabelled either way, both get changed.
- Anything you had to decide twice belongs in the document. Those are exactly the places the receiver
  will decide differently.
- States and edge cases are deliverables: default, hover, focus, active, disabled, loading, error,
  empty, long copy, translated copy, missing image.
- Acceptance criteria are testable and agreed before work starts — "the hero headline renders on one
  line at 1440 px", not "looks right". One owner for change requests, one changelog: handoff starts
  the part of the project where changes are tracked, it does not end the project.

## Techniques
1. **Build the spec table** — one row per element: name, property, value, source of truth.
   `hero/headline · size · clamp(28px, 4vw, 56px) · token: type.display`. Ten to forty rows of this
   beat a paragraph of description.
2. **Redline the artifact** — annotate the comp with dimensions, gaps, type specs and the color of
   every surface. Number the annotations and key them to the table so a change traces to a row.
3. **Hand off tokens, not swatches** — export spacing (the 4/8 px scale), type sizes, radii, shadows
   and color as named tokens with values. A screenshot of a palette is not a spec.
4. **Build the asset manifest** — filename, dimensions, format, color space, license, source, where it
   is used. A missing license is a blocker, not a footnote.
5. **Walk through, then let them drive** — 30 minutes: you state the intent, they rebuild one section
   while you watch. The questions they ask are your missing specs; add them before you leave, and get
   the 8–12-item acceptance checklist signed and dated.

## When to Use
- Any time work leaves your canvas: a dev build, a printer, another designer, a client's in-house
  team.
- On a design system release, where the same package goes to several teams at once.
- When a project is handed over mid-flight because someone left.

## When to Avoid
- Don't build the full package for a one-off internal tweak you will finish yourself in ten minutes.
- Don't hand off before the design is stable; a spec table for a layout that changes daily teaches
  people to ignore the next one.
- Don't substitute the package for the conversation. The written spec answers the questions you
  predicted, not the ones you did not.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Specs in mm on a web handoff | The developer converts and rounds differently than you did | px/rem for screen, mm/pt for print, never mixed |
| "Use brand blue" | Two blues exist in the system; the receiver picks one | Hex, token name and swatch together |
| No states drawn | Default gets built and the other seven get invented | Draw all eight, or state which are out of scope |
| Assets sent in a chat thread | Files disappear, versions diverge | One versioned folder plus a manifest |
| No named approver | Two people approve different things the same week | Name, date, and what exactly they accepted |

## Practical Examples
A marketing site hero and a 500-run postcard, handed off in the same week.

**Hero, 1440×900 canvas.** Spec rows: `hero/headline` clamp 28–56 px, weight 700, `#111111`, max
width 720 px; `hero/sub` 18 px/1.5, `#4B4B4B`; `hero/cta` 48 px tall, 24 px padding, `#1A5FB4` with a
`#FFFFFF` label; `hero/image` 2880×1800 (2×), ≤400 KB AVIF, crop anchored 40% from the left.
Breakpoints 320/768/1024/1440, collapse rule "two columns above 1024, one below". Acceptance: "hero
headline stays on one line at 1440 px", "CTA at least 44 px tall at 375 px", "hero image never crops
the face below 768 px".

**Postcard, 148×105 mm plus 3 mm bleed.** PDF/X-4, 300 PPI, fonts embedded, reverse type only above
8 pt, 500 copies on 350 g/m² uncoated. Acceptance: trim 148×105, bleed 154×111, safe area 5 mm inset,
crop marks at 3 mm offset. The printer signs the acceptance sheet with the proof date, the developer
signs the checklist at build review, and the changelog starts from those two signatures.

## Related Rules
- [`115-export-and-file-formats`](115-export-and-file-formats.md) — what the files inside the package should be.
- [`117-design-documentation`](117-design-documentation.md) — the decision log that answers "why is it like this" after you leave.
- [`91-design-systems`](91-design-systems.md) — tokens and components as the handoff medium at scale.
- [`95-responsive-interface-design`](95-responsive-interface-design.md) — breakpoints and reflow rules the spec table has to name.
- [`82-bleed-trim-and-safe-areas`](82-bleed-trim-and-safe-areas.md) — the print geometry that becomes an acceptance row.
- [`87-prepress-and-production`](87-prepress-and-production.md) — the printer's side of acceptance and the proof you sign.

## Sources
- *Graphic Artists Guild Handbook*, on design proposals and the statement of work — deliverables
  described in enough detail that the dispute never happens.
- Monteiro, *Design Is a Job*, on scope and revision limits — the conversation that prevents the
  twelfth "small change".
- W3C Design Tokens Community Group, format specification (draft) — the portable token file used in
  technique 3.
