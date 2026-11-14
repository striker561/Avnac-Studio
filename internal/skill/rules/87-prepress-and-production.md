# Rule: Prepress and Production

**Domain:** production · **ID:** `87-prepress-and-production`

## Purpose
Get a finished file through a printer's prepress department on the first attempt. Prepress is where
technical faults become money: a missing font, a 180 PPI image or an untrapped overprint stops a
press and moves the job to the back of the queue.

## Definition
Prepress is the conversion of a design file into a press-ready package: color-managed separations,
trapping, overprint control, imposition, proofing and a PDF/X archive. Production is the schedule
and paperwork around it — specs, proofs, press check and delivery dates.

## Core Principles
- Send a PDF/X, not a native file. PDF/X-4 (ISO 15930-7) keeps live transparency and an output
  intent; PDF/X-1a flattens everything and is the safer fallback for older RIPs.
- Four numbers decide most prepress failures: 300 PPI at final size, total area coverage of
  300–320% on coated stock (240–280% uncoated), minimum line 0.25 pt, minimum type 5–6 pt.
- Overprint is a promise about what the press will not knock out. Black text overprints 100 K by
  default, white text must knock out, and rich black (60/40/40/100) never overprints.
- Trapping is a printed crutch: 0.1–0.25 mm of overlap on abutting colors, decided by the printer's
  engine. Draw clean edges and let them trap it.
- The proof is the contract. A contract proof on the final stock at the specified profile (FOGRA51
  coated, FOGRA52 uncoated) is what you sign; a desktop printout is a sketch.
- Schedule backwards from the delivery date: 1–2 days prepress and plating, 1 day proof, 1–3 days
  press and finishing, plus transit. Under five business days, choose digital print.

## Techniques
1. **Run a five-minute preflight** — fonts embedded or outlined, images ≥300 PPI at 100%, colors in
   the printer's CMYK profile or as named spots, page = trim + bleed, no dieline layer.
2. **Build the overprint pass deliberately** — 100 K body text overprints; reversed type and white
   rules knock out; rich black stays off small type, where misregister shows as a fringe.
3. **Cap total area coverage** — 300% coated, 260% on uncoated newsprint-like stock. A `#000000`
   built as 100/100/100/100 (400% TAC) offsets, sets off or mottles before it dries.
4. **Ask for two proofs** — an imposed soft proof (PDF with output intent) for pagination and creep,
   then a contract proof for color. Sign both with the date on the sheet.
5. **Write the job ticket** — trim size, stock, inks, finishes, binding, quantity, delivery date and
   the name of the person who approved the proof. One page, sent with the file.

## When to Use
- Every job printed by someone else, including digital and large format.
- When a printer returns a preflight report — that list is this rule applied item by item.

## When to Avoid
- Don't hand-trap a PDF/X-4 for a printer with a current workflow; you will fight their trap engine.
- Don't order a contract proof for a one-color internal document; a calibrated laser proof and a
  clear spec are proportionate.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Sending a native file with links | Missing links, fonts and profile | Export PDF/X-4, reopen and check it |
| 100/100/100/100 black for a large flood | 400% TAC offsets onto the next sheet | 60/40/40/100, or 100 K for text |
| RGB blue converted by the printer's RIP | Unpredictable shift toward purple | Convert in your own profile and proof |

## Practical Examples
An A2 poster, 420×594 mm, 4/0 on 170 g/m² matte, 500 copies. The Avnac canvas is 426×600 mm with
3 mm bleed; export is PDF/X-4 with a FOGRA51 output intent, images at 300 PPI, TAC capped at 300%,
crop marks 3 mm offset, no registration color in the artwork. The job ticket reads "A2 420×594,
170 g/m² matte, 4/0, no finish, 500, delivery Fri 21 Nov". Prepress takes a day, proof a day, press
and trim two days — so the signed file must reach the printer by Tuesday.

## Related Rules
- [`81-print-color-management`](81-print-color-management.md) — profiles, rich black and spot conversion behind the PDF/X settings.
- [`82-bleed-trim-and-safe-areas`](82-bleed-trim-and-safe-areas.md) — the geometry preflight checks first.
- [`83-resolution-and-raster-formats`](83-resolution-and-raster-formats.md) — the PPI audit that feeds the preflight.
- [`84-print-finishing-techniques`](84-print-finishing-techniques.md) — finish plates and their tolerances inside the package.
- [`116-design-handoff`](116-design-handoff.md) — the specs and acceptance step around the file itself.

## Sources
- ISO 15930-7 (PDF/X-4) and ISO 15930-1 (PDF/X-1a) — the exchange standards a printer will accept.
- ISO 12647-2 and FOGRA51/52 characterization data — process control, TAC limits and contract proof conditions.
- *Graphic Artists Guild Handbook* — proofs, press checks and rush charges are contractual line items, not favors.
