---
name: edit
description: Revise an existing design — apply client or reviewer feedback, run a refinement pass, restyle an asset, or produce a new version without breaking what already works. Use when the user says "change this", "make it more X", "the client wants…", "update the logo/text/colors", or needs another iteration of something that already exists.
---

# Editing and Revising

## Applies when
An artifact exists and must change. This is the most common real-world task and the easiest to do
badly: most revisions either ignore the request or rebuild everything. For judging whether the
work is good, use `critique`; for fixing composition specifically, use `compose`.

## Workflow
1. **Snapshot before touching anything.** Version the file (`name_v02`) and keep the previous
   export. Revisions are lossy in practice; being able to compare is the only defence. In the
   Avnac app, put an experimental variant on a named page in the same project (`canvas`
   op=add-page) rather than creating a second project; the active page is visible in the page rail
   and `get_canvas_summary` names it.
2. **Translate the request into a defect.** "Make it pop" → not enough contrast at level 1.
   "Make it cleaner" → too many elements/styles. "Make it more premium" → stock/photography,
   spacing, or finish. Write the translation down and confirm it in the reply.
3. **Check what must not change.** Brand marks, legal copy, approved colors, client-approved
   elements. List them as protected.
4. **Make the smallest change that fixes the defect.** One variable per pass, then re-render and
   compare side by side at 25%.
5. **Propagate consistently.** If a change touches a component, token or style, apply it everywhere
   it appears — or the next review will find the drift.
6. **Re-run the delivery gate** (quality checklist, accessibility, production specs) before
   returning the file.
7. **Record what changed and why** in one short line per change, so the next iteration starts from
   knowledge rather than memory.

## Decision points
- **Apply literally or fix the cause?** Apply the literal request when it is cheap and harmless;
  diagnose the cause when the literal request would damage the design. Say which you did.
- **Patch or rebuild?** Patch when structure and hierarchy are right; rebuild when the request
  reveals a structural mismatch. Rebuilding quietly is a trust problem — say it.
- **Fast or thorough?** Match the revision round to the stage: exploration gets fast passes,
  pre-delivery gets the full gate.
- **Whose version?** If several reviewers disagree, resolve by returning to the brief and the
  audience, not by averaging opinions.

## Rules to apply
- [`03-contrast-and-emphasis`](../rules/03-contrast-and-emphasis.md) — most "make it pop" requests are contrast.
- [`02-visual-hierarchy`](../rules/02-visual-hierarchy.md) — most "cleaner" requests are hierarchy.
- [`113-design-quality-checklist`](../rules/113-design-quality-checklist.md) — the gate before returning work.
- [`115-export-and-file-formats`](../rules/115-export-and-file-formats.md) — re-exporting correctly.
- [`117-design-documentation`](../rules/117-design-documentation.md) — recording what changed.
- [`111-design-critique`](../rules/111-design-critique.md) — interpreting feedback honestly.

## References
- [`visual-hierarchy`](../references/visual-hierarchy.md) — the usual fixes for "flat" and "busy".
- [`accessibility`](../references/accessibility.md) — re-check after color or size changes.

## Production checks
- Protected elements unchanged (verified by comparison, not memory).
- Re-exported at the same specs as the approved version.
- Version number and change log updated.
- Diff view reviewed: only intended pixels changed.
- Previous version kept and retrievable.

## Output format
`Request → defect:` the translation. `Changed:` bullet list with the reason. `Unchanged:`
protected items verified. `Files:` new version path. `Open:` anything that needs a decision.
