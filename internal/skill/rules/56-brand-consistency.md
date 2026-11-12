# Rule: Brand Consistency

**Domain:** branding · **ID:** `56-brand-consistency`

## Purpose
Keep every surface recognizably the same organization, and let the agent prove it rather than assert it.
Consistency is not repeated layout but reliable reproduction of a few invariants while the rest varies.

## Definition
Brand consistency is the proportion of defined invariants correctly reproduced across all touchpoints. Define
five to seven invariants, let everything else be free, and treat unlisted variation as the drift you manage.

## Core Principles
- Name the invariants, at most seven: lockup geometry, hero hex, secondary hex, family and weight per level,
  margin or grid, image treatment, one voice rule. Unwritten invariants do not exist.
- Consistency tolerates variety: Weishaupt runs every brochure on one 30-field grid, with the red wordmark on
  stationery and on vans, while photography and format change.
- Drift is locally invisible. Each substitution looks fine alone; twelve touchpoints together read as three
  different companies.
- Drift has a price you can quote: rework hours, a wrong-color press run, and lost recognition in a thumbnail's
  third of a second.
- Consistency lives in tokens, not in a PDF. A hex that exists only in a document drifts at the first handoff.
- Log approved exceptions with date, surface, and reason; three on one surface means the system is wrong.

## Techniques
1. **Invariant sheet** — one page, six rows with exact values: lockup and clear space in px, hero hex, secondary
   hex, family and weight per level, margins in px and mm, image treatment in one sentence.
2. **Touchpoint inventory** — every surface with owner, format, and whether a non-designer can edit it. Surfaces
   nobody owns are where drift starts; give each one a name.
3. **12-up contact sheet** — twelve touchpoints on one 2400×1800 canvas at matched 400 px width. Outliers show in
   ten seconds; file-by-file inspection never does.
4. **Delta log** — date, surface, change, reason, approver. A second surface asking for the same deviation is a
   system change; write it into the tokens.
5. **Token round-trip** — build a deliverable from tokens alone and diff the outputs. Any manual nudge is an
   undocumented invariant.

## When to Use
- An organization shipping more than three surfaces, or a brand with more than one person producing assets.
- After a merger, a campaign push, or a hire, when output looks like two different teams.
- When a client says the brand "feels inconsistent" — audit before redesigning anything.

## When to Avoid
- A single deliverable with no repeat exposure: consistency has no job in a one-off poster.
- Before the invariants are agreed. Auditing an unspecified system produces blame, not fixes.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Judging one file at a time | Drift is a property of the set, not of a file | Put twelve items on one canvas |
| Enforcing identical layouts | Output stops fitting new formats | Fix the invariants, free the layout |
| Swatches eyedropped from a screenshot | Compressed pixels give an approximate hex | Read values from the master or tokens |
| No named owner for the tokens | Every team edits its own copy | One owner, one repository, versioned |

## Practical Examples
Eight exported assets were laid out on a 2400×1200 Avnac canvas at 400×400 each. Amber appeared as `#E8B54B` in
five files, `#EAB84F` in two, and `#F0C05A` in one — a print vendor had rebuilt the CMYK from a screenshot and
returned it as "the brand orange".

The fix was three values, not a redesign: one `color.hero` token at `#E8B54B`, a note that CMYK builds come from
the Pantone reference only, and a 2 px `#12100E` hairline in the audit template.

## Related Rules
- [`52-visual-identity-systems`](52-visual-identity-systems.md) — what the invariants are drawn from.
- [`57-brand-guidelines`](57-brand-guidelines.md) — the document that carries the invariant sheet.
- [`91-design-systems`](91-design-systems.md) — tokens and governance as the working mechanism.
- [`99-interface-consistency`](99-interface-consistency.md) — the same discipline inside product screens.
- [`113-design-quality-checklist`](113-design-quality-checklist.md) — where the audit sits in the delivery gate.

## Sources
- Müller-Brockmann, *Grid Systems in Graphic Design*, p. 142 — the wordmark in red on all printed matter and on
  delivery vans, lettering and color scheme kept the same.
- Müller-Brockmann, *Grid Systems in Graphic Design*, p. 141 — every cover on one grid, typeface and size
  unchanged.
- Monteiro, *Design Is a Job* — feedback needs written guidelines, or a review becomes a discussion of taste.
