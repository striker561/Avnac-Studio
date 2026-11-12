# Rule: Retro and Vintage Design

**Domain:** history · **ID:** `110-retro-and-vintage-design`

## Purpose
Build a piece in a named past period, with era-accurate type, palette, and reproduction artifacts, so
the borrowed associations do the work — and stop before it reads as kitsch.

## Definition
Retro design is the deliberate use of a specific period's visual language — decade, medium, and
production process — to borrow its associations. Vintage implies an artifact that looks genuinely old;
retro implies a new thing quoting an old one. The distinction decides how much reproduction artifact
to fake.

## Core Principles
- Name the era to the decade and the medium: "1970s offset gig poster", not "retro". That choice
  decides type, palette, process, and layout habit.
- Era accuracy lives in the details: type category, color gamut, halftone screen, paper tone,
  registration error, ink spread.
- Constrain by process. A 1960s job means two or three spot inks and coarse halftone; a 1990s job
  means four-color process, photocopy toner, and a 72 dpi web aesthetic.
- Aged is not vintage. A global sepia wash plus a grain filter is a filter, not a period.
- The artifact must not damage the message: a 1968 poster can run 30% ink coverage behind body text;
  a product page cannot.
- Kitsch risk rises with fidelity to a period the audience never experienced, and with mixing decades.

## Techniques
1. **Write the era card** — years, type category and two real faces, four hex values from that gamut,
   print process, image treatment, layout habit. Design inside the card only.
2. **Simulate the process, not the color** — halftone at 45–65 lpi for 1960s offset, 1–2 px
   misregistration on one plate, paper `#F0E6D2` with 8% noise, ink spread of +0.3 px.
3. **Gamut discipline** — 1950s: `#E4572E`, `#F3C969`, `#2E4756`, `#F5F0E1`; 1970s: `#D97B29`,
   `#7A8B3F`, `#C44536`, `#EFE3C8`. Never pure `#000000` or `#FFFFFF`; the ink was warm and imperfect.
4. **License a revival, not a novelty** — a period revival face at period sizes beats a free "retro" display font, the fastest route to kitsch.
5. **Copy the period, avoid the costume** — copy: era palette, type category, process artifacts,
   layout habits. Avoid: one-click vintage filters, sepia everywhere, fake coffee stains, distressed
   type under 36 px, two decades in one piece, and "est. 1974" on a 2024 brand.

## When to Use
- Heritage brands, anniversaries, music and food packaging, event series, editorial features about a
  period.

## When to Avoid
- Products whose proposition is modernity.
- Accessibility-critical reading, and any legal or regulated copy — texture degrades small text.
- When the audience will read the reference as a mistake rather than as affection.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Global sepia plus grain | One filter, no era logic | Era palette and one process artifact |
| Mixing a 1950s script with 1980s neon | Two period claims cancel | One era card, enforced |
| Distressed type under 18 px | Unreadable; fails contrast | Distress only above 36 px |
| Pure black and white in a 1970s piece | That ink was warm and imperfect | `#1A1712` on `#F0E6D2` |

## Practical Examples
A 1080×1350 reissue poster:

- Era card: 1974, offset, two spot inks plus black — `#F0E6D2` paper, `#C44536` and `#1A1712`.
- Field `#F0E6D2` with 8% noise; a 1080×520 `#C44536` band at y=830, one edge off by 2 px to register
  the misprint.
- Headline 120 px heavy grotesque `#1A1712` at y=140, tracked −1%, with a 1.5 px `#C44536` offset copy
  behind it; the photograph 760×520 at x=80 y=270 is a `#1A1712`/`#F0E6D2` duotone at 45 lpi.
- Footer 16 px/600 caps `#1A1712` at y=1260: "Reissue · 1974 · 250 copies" — that specificity is what
  keeps it from reading as generic nostalgia.

## Related Rules
- [`100-design-movements`](100-design-movements.md) — the constraint method this rule's era card applies.
- [`72-image-treatment`](72-image-treatment.md) — halftone, duotone, and grain that read as process.
- [`85-paper-and-material-selection`](85-paper-and-material-selection.md) — stock tone as part of the period.

## Sources
- Heller & Chwast, *Graphic Style* — decade-by-decade visual markers, and where revival tips into cliché.
- Hollis, *Graphic Design: A Concise History* — the production processes that gave each decade its look.
- *Graphic Artists Guild Handbook* — reproduction constraints (halftone, registration, spot color) that make era simulation credible.
