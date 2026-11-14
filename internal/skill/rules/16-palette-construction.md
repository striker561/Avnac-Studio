# Rule: Palette Construction

**Domain:** color · **ID:** `16-palette-construction`

## Purpose
Turn a brand color, a photograph, or a mood into a small set of colors that have jobs. A palette is not a collection of pleasant hex values; it is a set of roles that still hold when the layout changes.

## Definition
A palette is five to seven colors with assigned functions — ground, surface, text ramp, accent, functional — tied together by a stable hue relationship and a controlled lightness range. It becomes a system when every color has a name, a role, and a known contrast against the ground.

## Core Principles
- Five to seven colors is the working ceiling: one anchor, one accent, three neutrals, one functional set. Beyond that, no color repeats often enough to look intentional.
- Neutrals carry the area. 80–90% of a layout's pixels should be neutral; the anchor and accent live in the remaining 10–20%.
- Tint neutrals toward the anchor by 2–6% chroma. Pure #808080 beside a saturated orange reads as dirty; #F4F1EA beside #E4572E reads as family.
- 60-30-10 is an area rule, not a color count: 60% ground, 30% secondary, 10% accent. A poster can run 85-12-3; a UI can run 92-6-2.
- Name tokens by role, not appearance. `--surface` and `--text-muted` survive a rebrand; `--sand` and `--rust` do not.

## Techniques
1. **Anchor from evidence.** Take the color the brand or subject already owns — logo, product, venue — and measure its hue in OKLCH. Everything else is built at that H, or at a deliberate rotation from it.
2. **Neutral ramp in five steps.** L 0.97, 0.92, 0.82, 0.55, 0.22 at anchor H with C 0.01–0.03. Assign page ground, card surface, hairline, muted text, primary text.
3. **Accent by rotation.** Rotate H by 150–180° at a matching L (within 5) for a complement, or hold H and push C to 0.20 for a monochrome accent. Matching L stops the edge from vibrating.
4. **Test at three areas.** View the accent at 5%, 30%, and 100% coverage. It must still read at 5% and must not take over at 30%; if it does, lower C by 0.03.

## When to Use
- A new project arrives with a logo color and nothing else.
- Extending a light palette into dark mode, or a screen palette into print.

## When to Avoid
- Don't invent a palette when a brand guideline already supplies one; derive tints and a neutral ramp from it instead (see 17).
- Don't build a nine-step ramp when the design uses four values; unused steps are maintenance debt.
- Don't derive a palette from a photograph unless the photo stays in the layout — without it, nothing holds the colors together.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Twelve colors "for flexibility" | None repeats enough to read as a system | Cut to seven with roles |
| Accent covering 40% of the sheet | The accent stops being an accent | Cap it at 10% or demote it |
| Pure gray neutrals | Dead and faintly dirty beside a saturated anchor | Tint 2–6% chroma at the anchor hue |
| Complementary pair at equal L and full C | Edges vibrate and text on it is unreadable | Offset L by 10–15 or desaturate one |

## Practical Examples
A 1080×1350 poster: ground #F4F1EA over 60% of the area, secondary field #1B2A41 at 30%, accent #E4572E at 10%. Text #111111 on the ground measures 16.7:1; secondary text in #1B2A41 is 12.8:1; the accent against the ground is only 3.0:1, so it carries a bar, a rule, and one 96 px word — never the 18 px details, which stay #111111.

## Related Rules
- [`11-color-harmony`](11-color-harmony.md) — the scheme that supplies the hue rotations.
- [`15-color-systems-and-models`](15-color-systems-and-models.md) — OKLCH is where the ramps are computed.
- [`17-limited-and-functional-palettes`](17-limited-and-functional-palettes.md) — what to do when only one or two colors are allowed.
- [`55-brand-color-and-typography`](55-brand-color-and-typography.md) — choosing and owning the anchor color.
- [`91-design-systems`](91-design-systems.md) — tokens, naming, and governance for the palette.

## Sources
- Horstman, *Interacting with Color*, p. 57 — Albers: any color works with any other, given appropriate quantities.
- Horstman, *Interacting with Color*, p. 60 — the same four colors in different quantities yield four different dominant colors.
- Itten, *The Elements of Color* — color quantity and area as compositional variables.
