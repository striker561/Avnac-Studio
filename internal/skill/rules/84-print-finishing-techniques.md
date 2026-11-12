# Rule: Print Finishing Techniques

**Domain:** print · **ID:** `84-print-finishing-techniques`

## Purpose
Make the difference between a printed sheet and a designed object, without losing the design where
the finish lands. Each finish is a separate plate with hard geometric minimums, and the artwork must
clear those minimums before the file reaches the bindery.

## Definition
Finishing covers every operation after ink: coatings (aqueous, matte, gloss, soft-touch lamination,
spot UV), foil stamping, emboss and deboss, die-cutting and creasing, perforation, and binding. Each
is a physical tool with a tolerance; the design's job is to make those tools land where the concept
intends.

## Core Principles
- Specify by name and coverage: "spot UV, wordmark only, 0.2 mm spread" — not "shiny logo". Vague
  finishing language is the most common cause of a wrong proof.
- Respect tool minimums: 0.25 pt line, 6 pt type in foil, 2 mm inside radius on a die-cut, 3 mm from
  a crease to any foil edge, ±0.1 mm register on foil and spot UV.
- One finish carries the idea; two finishes per object is the practical ceiling.
- Finishing changes color: soft-touch lamination deepens darks, gloss raises contrast, matte varnish
  over uncoated drops chroma 5–10%. Change the artwork, not the spec.
- Bound edges eat the design: saddle-stitch loses 3–5 mm at the spine, perfect binding 5–7 mm, and
  creep shifts inner pages up to 2 mm per signature on thick stock.

## Techniques
1. **Build a finish plate** — spot UV, foil and emboss each on a named layer at 100% K on white,
   never merged into CMYK. The printer plates the file exactly as drawn.
2. **Choke and spread** — hold foil 0.3 mm back from trim so it cannot crack on the cut; spread a
   spot-UV knockout 0.2 mm so misregister leaves no white sliver.
3. **Design the deboss as a value change** — 0.3–0.5 mm of relief reads only under raking light, so
   pair it with a 10% tonal shift that survives flat lighting.
4. **Score before you fold** — any fold across stock above 250 g/m² needs a crease rule, or the fold
   cracks and whitens along the line.
5. **Choose binding by extent** — saddle-stitch to 64 pages of 120 g/m², perfect binding or PUR from
   40 pages, wire-o when it must lie flat, case binding for reference volumes.
6. **Budget the dies** — a foil or cutting tool is a one-off charge (roughly USD 150–400) plus
   per-1000 impressions; a finish added after proofing doubles the schedule.

## When to Use
- Keeper pieces: cards, invitations, packaging, covers, folders, limited editions.
- When the concept is "premium" and the budget can carry a die or a foil pass.
- When a client asks why their print "looks cheap next to the competitor's" — stock plus one finish
  is usually the honest answer.

## When to Avoid
- Short digital runs where a die cannot amortize; use a stock shape or a solid ink instead.
- Mail that must survive automated sorting: heavy lamination and thick stock jam inserting lines.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Spot UV drawn as light gray in the CMYK art | No plate exists; nothing is varnished | Dedicated 100% K spot layer |
| Foil hairline over a dark flood | Foil edges chip on uncoated dark ink | 0.2 mm white base print under the foil |
| Emboss placed across a fold | The fold cracks the raised area | Keep emboss 5 mm clear of any crease |

## Practical Examples
An 85×55 mm card at 400 g/m², printed `#0E0E0E` on `#F2EFE6`, soft-touch matte lamination both
sides, spot UV on the wordmark, 0.3 mm deboss on a 12 mm seal. In Avnac the canvas is 85×55 mm plus
3 mm bleed (91×61 mm); the finish layer carries the wordmark at 100% K expanded 0.2 mm, and the seal
sits 8 mm from trim so the deboss cannot crack at the cut. Finishing adds about 40% to unit cost at
500 units and 12% at 5000.

## Related Rules
- [`85-paper-and-material-selection`](85-paper-and-material-selection.md) — the stock decides whether a finish is possible at all.
- [`82-bleed-trim-and-safe-areas`](82-bleed-trim-and-safe-areas.md) — trim, crease and tolerance numbers the finish must clear.
- [`86-packaging-and-dielines`](86-packaging-and-dielines.md) — die-cutting as a structural operation, not a decorative one.
- [`87-prepress-and-production`](87-prepress-and-production.md) — how finish plates enter the preflight pack.

## Sources
- *Graphic Artists Guild Handbook* — estimating chapters: finishing is quoted as separate line items with one-off die charges.
- Professional bindery convention — 0.25 pt line, 6 pt foil type, 2 mm die radius, 0.3 mm choke.
- ISO 12647-2 and FOGRA process standards — finishing changes measured appearance, so proofs belong on the final stock.
