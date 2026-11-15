# Rule: Logo Construction

**Domain:** branding · **ID:** `53-logo-construction`

## Purpose
Turns a drawn mark into a reproducible asset: base unit, construction grid, optical corrections, minimum sizes, clear space, and a file set for every reproduction. This is the rule for "why does it look slightly wrong?"

## Definition
Logo construction is the disciplined geometry behind a mark. A base unit (usually the stem width) generates every dimension as a multiple; a construction grid of circles, squares and 15° diagonals fixes the relationships; optical corrections adjust for how the eye, not the ruler, reads curves and joins. Minimum size, clear space and file formats belong to the construction, not the handoff.

## Core Principles
- Start from a base unit: 1u = stem width, then every dimension as 1u, 1.5u, 2u, 4u. Unmeasured marks drift by half-pixels that never resolve.
- Optical beats mathematical. Circles and points overshoot by 1–2% of cap height or they read small; a 45° joint thins visually and needs roughly 3–8% extra weight. Cheng documents the same corrections in letterforms, including the Poggendorff shift on diagonals (p. 109).
- Minimum size is a measurement: 24 px icon height, 80 px lockup width, 16 px favicon. If the mark dies below that, draw a simplified variant rather than thickening everything.
- Clear space is one unit: x = cap height of the wordmark or 25% of the mark's height, never below 0.5x.
- Register ® only after registration; use ™ or ℠ before (Graphic Artists Guild Handbook, p. 709). Getting this wrong is a legal problem on a business card.

## Techniques
1. **Set the field first** — 10×10 unit grid, mark centered, a mirrored copy to check symmetry, a 15° overlay to check joint angles.
2. **Correct the four usual suspects** — overshoot round forms 1–2%, add 5% to thin 45° joints, raise horizontals 1–2%, extend curves 1 px past a straight terminal.
3. **Size ladder** — render at 16, 24, 32, 64 and 400 px. Where the counter closes, simplify the form; do not thicken the whole mark.
4. **Lock the metrics** — cap height, x-height, tracking (+2% to +5% for all caps), and the gap between mark and wordmark (0.5x to 1x).
5. **Ship a file set** — SVG master, PNG at 1×/2×/3×, reversed and one-color versions, PDF for print, plus the construction file with its grid and clear-space box.

## When to Use
- Every mark that will be reproduced, especially anything below 32 px or above 1 m.
- Before handoff, and before any trademark filing.
- When a mark "looks off" and nobody can name why — usually overshoot, joint weight, or a 0.5 px misalignment.

## When to Avoid
- Deliberately organic marks: measure and correct, but do not force them onto a grid until the character dies.
- Wordmark-only identities need spacing work more than construction geometry.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| No base unit | Elements land on inconsistent half-pixel offsets | Fix 1u, express everything as multiples |
| Mathematically equal circles | Round forms read smaller than squares | Overshoot 1–2% of cap height |
| One size delivered | Small uses get a shrunken blur | Size ladder plus a simplified 16 px variant |
| Clear space invented per layout | The mark gets cramped in handoff | Draw a fixed 1x box into the master |

## Practical Examples
A 512 px exported mark on 1u = 16 px: outer circle r = 5u, stroke 1u, overshoot 0.08u on the curve tops, a 45° cut on the lower left at 1u width. Wordmark cap height 3u, tracking +3%, gap to the mark 1u. Clear space 1u, drawn as a dashed frame in the master. At 24 px the 1u stroke falls to 0.75 px and the counter closes, so the 16 px favicon uses a solid disc and one cut instead of the ring.

## Verification
1. **Base-unit arithmetic.** Divide every dimension in the master by 1u. Pass: each quotient lands
   on a half-unit step — 1, 1.5, 2, 4. A dimension such as 2.3u was not built on the unit and drifts
   by the half-pixel that never resolves.
2. **Clear-space frame.** Draw the 1x box: cap height or 25% of the mark's height, floor 0.5x. Pass:
   no element enters it on the tightest application. Measure the two nearest neighbours and give the
   gap in units.
3. **Size ladder.** `get_canvas_image` at 16, 24, 32, 64 and 400 px. Pass: each size uses its
   assigned variant; at 24 px the 1u stroke is still a stroke, and the 16 px favicon is the
   simplified form, not the ring with its counter closed.
4. **Optical correction.** Measure round against flat: overshoot 1–2% of cap height, and make thin
   45° joints 3–8% heavier. A circle geometrically equal to the square reads small at every size.
5. **One colour, both grounds.** Render the mark in one colour at 16 px, inverted, and at 400 px.
   Pass: the silhouette reads at 16 px and the counters stay open; a detail that survives only in
   colour is not part of the mark.

## Related Rules
- [`54-logo-types-and-variations`](54-logo-types-and-variations.md) — which mark types this construction serves.
- [`22-type-anatomy`](22-type-anatomy.md) — overshoot, stroke contrast and optical correction in letterforms.
- [`68-iconography`](68-iconography.md) — the same grid and fitting discipline at icon scale.
- [`57-brand-guidelines`](57-brand-guidelines.md) — where minimum sizes and clear space get published.
- [`115-export-and-file-formats`](115-export-and-file-formats.md) — the export side of the file set.

## Sources
- Cheng, *Designing Type*, p. 109 — overshoot, optical centering and the Poggendorff illusion; why corrected forms are not mathematically equal.
- Graphic Artists Guild Handbook, p. 709 — ™, ℠ and ® tied to registration status, and the client's responsibility for a trademark search.
- Frutiger, *Signs and Symbols* — the mark as a sign that must survive reduction and mass reproduction.
