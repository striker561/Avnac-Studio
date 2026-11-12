# Rule: Design Quality Checklist

**Domain:** foundations · **ID:** `113-design-quality-checklist`

## Purpose
Run this gate before any handover: a fixed order of checks that ends in a pass or a fix list, not
another round of taste. Hierarchy, type, color, alignment, production. It is a pass/fail instrument —
if a check fails, fix it and run the gate again.

## Definition
The quality gate is a short ordered set of observable tests applied at final size, in the conditions
the work will be seen in. Each test has a threshold and a verdict; "looks fine" is not a verdict, and
a piece not checked at 25% zoom and at 100% has not been checked.

## Core Principles
- Order the gate: hierarchy, type, color, alignment, production. Fixing bleed before hierarchy wastes
  work you are about to redo.
- Every check is binary: "headline legible at 25% zoom" passes; "the balance feels okay" does not.
- Test at final size and in the final medium — a 1080 px post on a phone, an A2 poster from 2 m, a
  card at 40 cm. Monitor-only review misses most production faults.
- Grayscale is the fastest hierarchy test. If the reading order collapses in gray, the hierarchy was
  leaning on hue alone.
- Sign off in writing: checks passed, the one known compromise, who accepted it, and the date.

## Techniques
1. **Hierarchy at 25% zoom** — name the first, second and third thing you see; they must match the
   intended order. Then squint: the piece should resolve into two or three masses, not six.
2. **Type at 100%** — body 14–18 px screen or 9–11 pt print, leading 1.4–1.6, measure 45–75
   characters, no widows or single-word last lines, two families maximum, no heading orphaned at a
   column foot, reversed type checked line by line.
3. **Color in grayscale and in ratios** — 4.5:1 body, 3:1 large text and UI boundaries, 3:1 focus. In
   print: TAC ≤300% coated or 260% uncoated, rich black 60/40/40/100, no four-color black in small type.
4. **Alignment with an overlay** — every edge on a grid line or a deliberate optical offset, equal
   gaps equal, one shared left edge per region, nothing nudged by 1–3 px.
5. **Production on the file** — 3 mm bleed (5 mm large format), 300 PPI at 100%, fonts embedded, PDF/X-4
   with output intent, trim size correct, naming convention followed. For UI: every state drawn,
   targets ≥44 px, empty and error present.
6. **Read the copy out loud** — typos, doubled words, wrong dates, leftover "Lorem", stale prices.

## When to Use
- Before any delivery: printer, client, developer or publish.
- Before a client presentation, so the conversation is about the idea rather than the errors.

## When to Avoid
- Concept and thumbnail rounds; production checks will reject work meant to be rough.
- A one-line internal update where the medium is a chat message.
- Not as a substitute for critique (`111-design-critique`); the gate finds faults, not weakness.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Judging at 40% zoom on a monitor | Spacing and production faults vanish | Review at 100% and at final size |
| Checking color before hierarchy | You tune a palette on a layout you will rearrange | Hierarchy, type, then color |
| Signing off without a record | Nobody remembers who accepted the compromise | Written pass list, exception, name, date |

## Practical Examples
A 1080×1080 launch post. Hierarchy passes at 25% (headline, product, date). Type passes at 100% except
the 14 px legal line at 3.9:1 on `#F2EFE6`, fixed to `#5A564C` (5.4:1). Color passes in grayscale;
alignment fails on two elements 3 px off the 72 px margin, now snapped. Production: export 2×
(2160×2160) as PNG for the feed and JPEG q85 for email, copy read aloud, one doubled word removed.
Sign-off: "5 of 6 checks passed after fixes; the 14 px legal line stays under the 16 px floor because
the client requires the full disclaimer — accepted by A. Reyes, 12 Nov."

## Related Rules
- [`02-visual-hierarchy`](02-visual-hierarchy.md) — the audit method behind check 1.
- [`112-common-design-mistakes`](112-common-design-mistakes.md) — the failure catalogue this gate intercepts.
- [`82-bleed-trim-and-safe-areas`](82-bleed-trim-and-safe-areas.md) — the exact numbers behind the production check.
- [`87-prepress-and-production`](87-prepress-and-production.md) — what happens after the file passes this gate.
- [`115-export-and-file-formats`](115-export-and-file-formats.md) — the export checks and naming convention.

## Sources
- Tufte, *The Visual Display of Quantitative Information*, p. 195 — design is choice among options; principles guide the choice rather than replace the eye.
- WCAG 2.2, SC 1.4.3 and SC 1.4.11 — the contrast thresholds used in check 3.
- ISO 12647-2 and PDF/X-4 (ISO 15930-7) — the process and file standards behind check 5.
