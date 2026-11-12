---
name: critique
description: Evaluate a design with structure and evidence — separating taste from failure, naming the principle behind each problem, and ending with a verdict the client can act on. Use when the user asks whether a design works, what is wrong with it, how to make it better, or wants a review before sending work to a client, printer or developer.
---

# Design Critique

## Applies when
The artifact exists and the question is "is this good?" rather than "make this". This skill also
covers critiquing your own draft before delivery, and interpreting vague client feedback
("make it pop", "it feels off") into a fixable defect.

## Workflow
1. **Restate the brief in one sentence.** Audience, message, medium. A design can only be judged
   against a job; without the job, critique collapses into taste.
2. **Read it cold for three seconds**, at the size it will be seen. Note what you understood and
   what you looked at first. That is the empirical part — record it before analyzing.
3. **Run the hierarchy audit.** Name the first, second and third elements. Compare with the
   intended order. If the intended first element is not first, that is a defect, not a style
   choice.
4. **Check the mechanics in order**: alignment, spacing, type sizes and line-height, contrast
   ratios, color roles, image resolution, margins, consistency of details (radii, strokes,
   capitalization). Mechanics are objective and cheap to fix; do them before aesthetics.
5. **Check meaning.** Does the visual metaphor say what the message says? Is the imagery
   culturally loaded, clichéd, or misleading? Would the intended audience get it without
   explanation?
6. **Check production reality.** Print: bleed, safe area, PPI, color space, fonts. Screen:
   breakpoints, states, focus, contrast, tap targets. A critique that ignores production is half
   a critique.
7. **Separate the three verdicts.** (a) Broken — fails its job; fix before shipping. (b) Works,
   improvable — ship-able with named improvements. (c) Preference — a taste difference; say so
   and let the client decide.
8. **Write one recommendation per defect**, ordered by impact, each naming the principle and the
   concrete change ("Level 2 competes with level 1: drop the subhead to 28 px/Medium").

## Decision points
- **Whose taste wins?** The audience's comprehension wins over the designer's preference. When
  both are defensible, present both with trade-offs instead of arguing.
- **Fix or rebuild?** If the hierarchy or structure is wrong, rebuilding is faster than
  polishing. If the structure works, polish is correct.
- **How many issues to report?** Three to five defects, ordered by impact. A list of twenty is
  not a critique; it is a reason to ignore all of it.
- **Is the client's note literal?** "Make the logo bigger" often means "the brand is not
  visible enough". Diagnose the complaint, then fix the cause — but confirm before ignoring a
  literal request.

## Rules to apply
- [`111-design-critique`](../rules/111-design-critique.md) — the full critique method and language.
- [`02-visual-hierarchy`](../rules/02-visual-hierarchy.md) — the audit every critique starts with.
- [`112-common-design-mistakes`](../rules/112-common-design-mistakes.md) — the failure catalogue to check against.
- [`113-design-quality-checklist`](../rules/113-design-quality-checklist.md) — the pre-delivery gate.
- [`114-design-accessibility-checklist`](../rules/114-design-accessibility-checklist.md) — accessibility is not optional in a review.
- [`03-contrast-and-emphasis`](../rules/03-contrast-and-emphasis.md) — diagnosing "flat" and "busy" complaints.

## References
- [`visual-hierarchy`](../references/visual-hierarchy.md) — level counts and contrast steps to check.
- [`accessibility`](../references/accessibility.md) — the ratios and non-color cues to verify.

## Production checks
- Every claim in the critique points at a location on the artwork and a number where one exists.
- At least one thing is named as working — a critique with no positives is not trusted and
  usually not accurate.
- The verdict is one of: ship, ship with named fixes, or rebuild.
- Recommendations are ordered by impact, not by how easy they are to state.

## Output format
1. `Brief:` one sentence.
2. `First read:` what a viewer sees in three seconds.
3. `Works:` two or three specific things, with why.
4. `Defects:` table of problem, principle, fix, impact (high/medium/low).
5. `Verdict:` ship / ship with fixes / rebuild, and the one change that matters most.
