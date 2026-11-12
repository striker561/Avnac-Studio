# Rule: Duotone and Color Grading

**Domain:** color · **ID:** `73-duotone-and-color-grading`

## Purpose
Build an image system in two inks — or two tones on screen — that survives both a press and a brand review.
It is the cheapest way to make mixed photography look authored, and the quickest way to make it look cheap.

## Definition
A duotone prints one grayscale image in two inks, usually a dark ink plus a hue. A gradient map is the
mechanism: it maps luminance to a color ramp, so shadows take the ramp's dark end and highlights its light end.
Split toning does the same thing loosely, with one hue in the shadows and another in the highlights.

## Core Principles
- The duotone inherits the grayscale's separation: require at least 40% lightness spread between the darkest
  meaningful tone and the lightest.
- Name two inks and keep them: a shadow ink near black (`#101820`) and a highlight ink at the brand hue
  (`#E4572E`). Highlight ink stays at 0–15% in shadows, shadow ink at 0–10% in highlights.
- Use three gradient stops minimum — shadow, midtone at 50%, highlight. Two stops reads as bad sepia.
- Put contrast in a curve before the map, not inside it; stretching the map distorts every midtone's hue.
- Specify inks, not just a look: a Pantone number plus CMYK build for each. A duotone built from arbitrary RGB
  will not survive conversion.

## Techniques
1. **Build order** — desaturate, set black and white points, apply contrast, then the gradient map: `#101820`
   at 0%, `#7A2E2A` at 50%, `#F2C14E` at 100%.
2. **Split tone** — shadows +8 to +14 toward the shadow ink's hue, highlights +4 to +8 toward warm, then check
   skin against a reference; a +20 split turns faces green or sunburnt.
3. **Ink balance** — the shadow ink carries structure, the highlight ink carries mood: about 75% of the image
   area in the shadow range, 25% in the highlight.
4. **Press spec** — build each ink as a spot channel, cap total coverage at 240% on uncoated stock and 300% on
   coated, and keep small type in one ink only.
5. **Two-scale test** — 100% for banding in skies and skin, 25% for overall balance.

## When to Use
- One- or two-color print budgets where a photograph still has to appear; see
  [`17-limited-and-functional-palettes`](17-limited-and-functional-palettes.md).
- Editorial features and music or event packaging where one treatment does the art direction.
- Campaigns that need a photographic look without full-color commissioning.

## When to Avoid
- Product, food, and cosmetic imagery where color is the product.
- Portraiture where skin tone must stay accurate; a duotone always lies about skin.
- Anywhere a client expects full-color photography and has not approved a two-ink budget.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Duotone from a low-contrast gray | Two flat colors, no form | Fix the grayscale, then map |
| Two-stop gradient map | Single-hue sepia midtone | Add a 50% stop |
| Screen or Overlay to fake it | Unpredictable coverage, no press spec | Gradient map, then spot channels |
| Applied to logos and type | Brand colors and legibility break | Duotone photographs only |

## Practical Examples
A 1080×1350 px tour poster prints two spots: Pantone 2965 C shadow, Pantone 7417 C highlight. The photograph
is desaturated, black point 6 and white 248, then mapped `#0B1A24` → `#2E5A6B` → `#F2A65A`. Skin lands near
`#A9705C`, still credible. At 100% the sky shows no banding; at 25% the head reads against the `#111111`
ground. The same recipe on the support act's portrait keeps a two-sheet series consistent without a second
shoot.

## Related Rules
- [`17-limited-and-functional-palettes`](17-limited-and-functional-palettes.md) — the two-color logic a duotone serves.
- [`72-image-treatment`](72-image-treatment.md) — the general treatment recipe this rule specializes.
- [`15-color-systems-and-models`](15-color-systems-and-models.md) — where a spot ink sits outside RGB and CMYK.
- [`81-print-color-management`](81-print-color-management.md) — profiles, coverage limits, and proofing.
- [`13-color-perception`](13-color-perception.md) — why a mapped midtone picks up its neighbors' cast.

## Sources
- Horstman, *Interacting with Color*, p. 57 — "any color goes with any other, presupposing the quantities are appropriate": the argument for an ink ratio, not an ink choice.
- Itten, *The Elements of Color* — saturation and value as separate dials; a duotone trades saturation for structure.
- Pantone, *Formula Guide* (professional convention) — ink reference is a physical standard, not a hex value.
