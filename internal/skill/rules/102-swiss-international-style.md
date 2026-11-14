# Rule: Swiss International Style

**Domain:** history · **ID:** `102-swiss-international-style`

## Purpose
Produce a layout that looks objective and reads in a fixed order: a grid you can defend, one sans
family, asymmetric balance, and photography used as evidence rather than mood.

## Definition
The International Typographic Style (Switzerland, 1950s–60s) organizes content on a mathematical
column and baseline grid, sets flush-left ragged-right sans-serif type at three or four sizes, weights
asymmetric layouts against generous margins, and treats photography as fact.

## Core Principles
- The grid is the argument. Every position is explainable by the columns; deviation is reserved for
  the one element that carries the message.
- Objectivity: the content is the subject, not the designer's mood. A photograph where a drawing
  would editorialize; white space where an ornament would decorate.
- One family, three or four sizes, two weights — Helvetica, Univers, Akzidenz-Grotesk, or Inter.
- Flush left, ragged right. Justify only with hyphenation and a measure of 60+ characters.
- Asymmetric margins create tension: unequal all round, heavier at the gutter than the outer edge.

## Techniques
1. **Grid from the text** — body 16 px, measure 60–75 characters, 12 columns, gutter equal to one
   line of leading. Müller-Brockmann pairs 10 pt type with 3 pt leading for the same reason.
2. **Three sizes, two weights** — 16/24/64 px at Regular/Bold; change weight rather than adding a
   family. A fourth size is usually a hierarchy failure being patched.
3. **Baseline discipline** — all text on a 4 px baseline; images and rules align to the same lines;
   captions hang below the image, in the gutter.
4. **Photography as fact** — grid-locked rectangles: no feather, no shadow, no rounded mask; crop to
   the field rather than to taste; grade every image to one neutral.
5. **The asymmetric anchor** — put the heaviest mass (image or headline) upper-left or low-left and
   leave the opposite corner quiet; the imbalance is the energy.
6. **Copy the system, avoid the look** — copy: column arithmetic, one family, asymmetric margins,
   photographic rectangles, flush-left setting. Avoid: "Swiss" as a synonym for empty, all-caps
   everything, black-and-white nostalgia for its own sake, hairlines that print as gray mush.

## When to Use
- Editorial, annual reports, wayfinding, cultural identity, data-heavy documents.
- When the content must appear neutral: research, public information, institutional publishing.

## When to Avoid
- When warmth or handmade identity is the proposition; the style reads as institutional distance.
- When the content is thin — a strict grid exposes a weak message immediately.
- Playful consumer products, where objectivity reads as coldness.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Equal margins all round | Removes the asymmetry that organizes the page | 3:5 or 4:6 vertical/horizontal ratio |
| Grid declared, not followed | A 3 px drift off the column reads as an error | Set x/y from the column arithmetic |
| Seven sizes, three families | Looks like a template, not a system | 3 sizes, 2 weights, 1 family |
| Justified text at 40 characters | Rivers and gaps; slower reading | Flush left, or 60+ characters with hyphenation |
| Photos of mixed color temperature | Breaks the objective tone | Grade to one neutral curve |

## Practical Examples
A 1240×1754 px poster (A4 at 150 dpi):

- 8 columns, 74 px margins, 20 px gutters: (1240 − 148 − 140) ÷ 8 = 119 px per column.
- Headline 64 px/700 `#111111` at x=74 y=160, spanning 5 columns, tracking −1.5%.
- Body 16 px/1.4 `#333333` in columns 1–3 from y=420; caption 12 px `#6B6B6B` under the image.
- One photograph 6 columns wide from y=760, cropped to the field edge, no radius, no shadow.
- Footer 10 px/600 uppercase, +8% tracking, at y=1680 — everything above it is air.

## Related Rules
- [`30-grid-systems`](30-grid-systems.md) — the grid arithmetic this depends on.
- [`33-asymmetric-and-modular-layouts`](33-asymmetric-and-modular-layouts.md) — asymmetry without chaos.
- [`101-bauhaus`](101-bauhaus.md) — where the method came from.
- [`100-design-movements`](100-design-movements.md) — using movements as constraints at all.

## Sources
- Müller-Brockmann, *Grid Systems in Graphic Design*, p. 41 — 10 pt type against 8 and 16 pt leading, and why the interval sets the column.
- Müller-Brockmann, p. 69 — a two-column type area in 10 pt on 3 pt leading, with unequal margins for tension.
- Müller-Brockmann, p. 135 — the "New Swiss Film" poster: 72-field grid, 59.3 × 41.8 cm, black and white, large marginal zones.
