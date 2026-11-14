# Rule: Print Color Management

**Domain:** print · **ID:** `81-print-color-management`

## Purpose
Get the color you designed onto the sheet. A hex value describes light on a screen; ink is a physical filter on
paper, so artwork has to be converted and proofed deliberately rather than exported and hoped for.

## Definition
Color management is a profile-based pipeline: source and destination are described by ICC profiles, and a color
management module maps between them through a device-independent space (Lab or XYZ). CMYK is not a color space in
the abstract — it is whatever the profile, ink, and stock make of it.

## Core Principles
- Choose the output profile before designing: GRACoL 2006 for US coated, FOGRA39 for European coated, SWOP for US
  web. Assigning a profile after the layout exists moves every color on the page.
- Judge with numbers: Delta E of 2 or less is acceptable, 3–5 is visible in solids, above 5 the proof is rejected.
- Build blacks by job. Large solids take rich black at 40C/30M/30Y/100K; small type, hairlines, and reversed type
  take 0/0/0/100 only, because four-ink registration fringes at small sizes.
- Cap total area coverage at 300% on coated and 240% on uncoated; above that ink dries badly and scuffs.
- Keep spots as spots: a Pantone ink stays a spot channel until final output. A brand color rebuilt from four
  process inks is a different color on the sheet.
- Proof under D50, then check the sheet. A contract proof says what the press should do; the press check says what
  it did.

## Techniques
1. **Convert once, with a reason** — relative colorimetric with black point compensation for general work,
   perceptual for photo sets with out-of-gamut color. Convert once and archive the CMYK master.
2. **Black rule table** — put it in the file notes: body text 0/0/0/100, rules 0/0/0/100, solid panels
   40/30/30/100, shadows 0/0/0/70–100.
3. **Soft-proof with paper simulation** — read numbers, not the screen: a 50% tint should measure near 50% in the
   proof, and a brand solid within 2–3 Delta E.
4. **Press check** — measure 25/50/75% tints, gray balance at 50/40/40, registration on hairlines, then hold the
   sheet under D50 next to the proof.

## When to Use
- Any offset or digital print job with a brand color, photography, or a dark solid area.
- When collateral is printed by several vendors and the color has to hold across them.
- When converting a screen design to print and deciding what happens to `#E4572E`.

## When to Avoid
- Screen-only deliverables; stay in sRGB and do not convert.
- Judging by monitor alone on an uncalibrated display — that proves nothing about ink.
- As a reason to convert twice: RGB → CMYK → RGB → CMYK destroys gamut and darkens every neutral.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Converting back and forth | Gamut shrinks each round trip | One conversion, one master |
| Rich black on 8 pt type | Registration fringes the type | K-only for type and rules |
| TAC at 340% on uncoated | Set-off, scuffing, slow drying | 240% cap on uncoated |
| Spot rebuilt as 4-color | Brand color drifts per press | Keep the spot channel |

## Practical Examples
A brand red `#E4572E` converts to about 0/85/90/0 in FOGRA39, close to Pantone 165 C. Because it appears on kraft,
a coated brochure, and a 3 m banner, it is specified as the spot, with the CMYK build as a fallback for the
digital run only. A 12 pt reversed caption sits 0/0/0/0 on a 0/0/0/100 panel, while the 60% panel behind the logo
is 40/30/30/100 at 300% TAC. The proof measures 165 C within Delta E 2; the press sheet holds at two of three
sample points.

## Related Rules
- [`15-color-systems-and-models`](15-color-systems-and-models.md) — RGB, CMYK, Lab, and what a profile describes.
- [`80-print-design-fundamentals`](80-print-design-fundamentals.md) — ink coverage as a design budget.
- [`82-bleed-trim-and-safe-areas`](82-bleed-trim-and-safe-areas.md) — trim geometry that color has to respect.
- [`87-prepress-and-production`](87-prepress-and-production.md) — preflight, overprint, and the printer conversation.
- [`19-color-in-context`](19-color-in-context.md) — why a proof looks different on a wall.

## Sources
- ISO 12647-2 (professional convention) — process control for offset lithography: TVI, gray balance, and TAC limits.
- *Pocket Pal: A Graphic Arts Production Handbook* — ink, paper, and press behavior in trade practice.
- *Graphic Artists Guild Handbook* — production specs and proof approvals as part of the job record.
