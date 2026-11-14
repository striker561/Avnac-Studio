# Rule: Brand Color and Typography

**Domain:** branding · **ID:** `55-brand-color-and-typography`

## Purpose
Settle the two decisions that outlive every layout: the color an organization is recognized by, and the type it
speaks in. Both are licensed assets with specifications, not preferences.

## Definition
Brand color is the hue-value-chroma position that identifies an organization before a word is read: one hero,
two supports, three neutrals. Brand type is the licensed family that sets every published word, with a weight
and size fixed per hierarchy level.

## Core Principles
- One hero, two supports, three neutrals. Six saturated colors is a mood that the next editor re-balances.
- Own a narrow slice of the wheel: "blue" cannot be owned, `#1B3A5C` can. Hold the hue within ±10° everywhere.
- Color is relational. Albers's brown reads as two colors on two grounds, so approve a hex on white, on black,
  and on the gray it ships against.
- Two families maximum; one family with five weights beats two families with two.
- License before layout. Desktop rights do not cover web embedding, app bundling, or e-books.
- Check the fallback stack: a different x-height changes measure and line breaks on the platforms you ship on.

## Techniques
1. **Anchor on a value** — take the target hex into OKLCH, then build 100/300/500/700/900 by moving lightness
   only, so every tint stays the same hue.
2. **60-30-10 test** — on 1920×1080, set 60% neutral, 30% support, 10% hero. If the hero dies at 240 px wide,
   its value is too close to the neutral.
3. **Adjacent-brand check** — six competitor swatches at 200×200 px `rect`s. Within ~10° of the leader's hue,
   move value or chroma and leave hue alone.
4. **License ledger** — foundry, tier (desktop/web/app/e-book), seats, embedding, webfont hosting, renewal. No
   row, no ship.
5. **Three-size proof** — one sentence at 96/32/14 px in every weight. Reject closed counters at 14 px and gappy
   spacing at 96 px.

## When to Use
- A new identity, sub-brand, or product line that must sit beside a parent without competing.
- A brand entering a new medium where the current color and type have no spec.
- A client asks for "our colors" and nobody on the call can produce a hex.

## When to Avoid
- One-off work with no repeat exposure: an event poster can borrow a palette without founding a system.
- Seasonal color launches: change accent weight inside the existing ramp rather than founding a hue, or the
  brand color stops meaning anything.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Hero chosen on screen only | Saturated blues and greens shift badly in CMYK | Pick against a Pantone reference and proof the stock |
| Six "brand colors" | Nothing is memorable; every layout re-balances them | Collapse to 1 hero, 2 supports, 3 neutrals |
| Free font in the wordmark | License may forbid embedding or outline distribution | License a retail family, or commission drawn letterforms |
| Desktop license only | Web and app use are unlicensed from day one | Buy the web/app tier at the same time |

## Practical Examples
A cold-brew identity on 1920×1080: a `rect` at (0, 0) filled `#12100E` holds the 60%; a `group` wordmark centered
at (960, 470) in `#E8B54B` covers about 11% of the area, so it still reads at 240 px; a `rect` 1920×140 at y 940
in `#3C4A3E` holds the 30%, carrying 18 px Inter Medium `#F4EFE6` at 70%.

Fraunces runs 72–120 px only, axis locked to `wght 600 / SOFT 40`; Inter covers 14–32 px. Fallback is declared as
Inter → system sans and both web licenses are logged.

## Related Rules
- [`10-color-theory`](10-color-theory.md) — the hue/value/chroma vocabulary the anchor is chosen in.
- [`13-color-perception`](13-color-perception.md) — why the same hex changes identity on a different ground.
- [`16-palette-construction`](16-palette-construction.md) — the ramp and neutrals this anchor feeds into.
- [`23-type-pairing`](23-type-pairing.md) — the structural logic behind using one family or two.
- [`57-brand-guidelines`](57-brand-guidelines.md) — where these values get written down and enforced.

## Sources
- Horstman, *Interacting with Color*, p. 8 — identical brown swatches appear as two colors against dark blue and yellow.
- Horstman, *Interacting with Color*, p. 57 — "any color 'goes' or 'works' with any other color, presupposing
  that their quantities are appropriate."
- Graphic Artists Guild, *Handbook*, pp. 328–329 — fonts licensed as software under non-transferable EULAs
  covering the file, not the typeface's shape.
