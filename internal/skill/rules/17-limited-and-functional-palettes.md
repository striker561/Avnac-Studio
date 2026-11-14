# Rule: Limited and Functional Palettes

**Domain:** color · **ID:** `17-limited-and-functional-palettes`

## Purpose
Make one or two colors carry a whole design, and keep meaning-bearing colors from being spent on decoration. A limit is a hierarchy strategy, not a budget compromise: it survives cheap printing and rigid brands.

## Definition
A limited palette constrains hue count — one or two inks, or two or three screen colors — and buys hierarchy from value, area, and repetition instead. A functional palette is a reserved subset whose only job is to encode state or category, and which never appears for decoration.

## Core Principles
- One color is a full system, not a limitation: a single ink at 100/75/50/25/10% gives five values, and the paper makes a sixth.
- When hue cannot separate, value must. In a one-ink poster the headline is 100%, the body 70%, and rules 25%.
- In two-ink work the overlap is a third color: multiply #E4572E over #1B2A41 and you get a dark brown. Design that color rather than discover it on press.
- Functional colors are rationed. Red means error, stop, or danger; amber means warning; green means success or on. Spend them elsewhere and readers stop trusting them.
- Brand-constrained work has fixed inputs: the brand color's hue, value, and area are given. Vary the ramp, the area, and the neighbor — never the brand color itself.
- Limited does not mean low contrast: a two-color job still owes body text 4.5:1.

## Techniques
1. **Build a tint ladder.** 100/75/50/25/10% screens from one ink, one per hierarchy level. At 25% zoom the levels must still separate.
2. **Split two inks by role.** Dark ink for all type, second ink for one shape or word, under 15% of area. Cover a third of the sheet and it has become the ground.
3. **Choose the overprint.** Set ink A over ink B at multiply and compare L*: if the result sits within 8 L* of either parent, use a lighter tint of A instead.
4. **Specify duotone as two inks plus a curve.** Shadows in the darker ink, midtones in the lighter, highlights as paper. "Make it orange" is not a specification (see 73).

## When to Use
- Print budgets of one or two spot colors, or digital print priced per ink.
- A brand with one color and no secondary.
- A series that must stay cheap and repeatable across twenty items.

## When to Avoid
- Full-color photography where the client expects realism: a duotone is an interpretation, not a reproduction.
- Dense categorical charts — one hue cannot separate more than four categories at small size.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Six tints of one hue as six categories | Adjacent steps are indistinguishable at small size | Cap at four, add labels or position |
| Second ink over the whole sheet | No focal point, no hierarchy | Keep it under 15% of area |
| Functional red used for a headline | The error color loses its meaning | Use the brand color for emphasis |
| "Adjusting" a brand color for contrast | Off-brand and usually still failing | Change the ground or the value, not the hue |

## Practical Examples
An A2 gig poster in black #111111 plus orange #E4572E on uncoated stock (#EDE8DC). Black on that stock measures 15.5:1, so the 96 px headline and 20 px details both hold. Orange on the stock is only 2.8:1 — a fill, not a text color — so it becomes a 120×340 px bar and a reversed numeral, with white type at 3.4:1 kept at 40 px and above.

## Related Rules
- [`14-color-contrast`](14-color-contrast.md) — the value ladder that replaces missing hues.
- [`16-palette-construction`](16-palette-construction.md) — the full-palette version of these roles.
- [`18-color-accessibility`](18-color-accessibility.md) — why functional color needs a non-color backup.
- [`81-print-color-management`](81-print-color-management.md) — spot plates, overprint, and ink behavior.

## Sources
- Müller-Brockmann, *Grid Systems in Graphic Design*, p. 107 — color area and typography: lighter tints keep type legible on a colored field.
- Horstman, *Interacting with Color*, p. 57 — quantity decides whether a color works with its neighbors.
- Tufte, *The Visual Display of Quantitative Information*, "Aesthetics and Technique" — encodings that color-deficient readers can still decode.
- WCAG 2.2, SC 1.4.1 Use of Color — color must never be the only carrier of information.
