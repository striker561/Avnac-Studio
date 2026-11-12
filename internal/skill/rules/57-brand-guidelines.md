# Rule: Brand Guidelines

**Domain:** branding · **ID:** `57-brand-guidelines`

## Purpose
Produce a document that lets someone who is not a designer ship a correct asset without asking anyone. A
guideline that is beautiful and unusable is a portfolio piece; this rule is about the usable kind.

## Definition
Brand guidelines are an operational manual: the invariants, correct/incorrect pairs, templates that make the
correct output the path of least resistance, and a named owner for exceptions.

## Core Principles
- Structure follows decisions, not aesthetics: idea in three sentences → logo files, clear space, minimum sizes →
  color in hex/RGB/CMYK/Pantone → type with sizes and weights → grid, margins, safe areas → imagery → voice with
  five example sentences → do/don't pairs → templates and asset index → who to ask.
- Every rule carries a number. "Use clear space" is unenforceable; "0.5× cap height, minimum 24 px digital or
  10 mm print" is followable at 2 a.m.
- Do/don't pairs sit side by side at the same size, and they show the failure state — a stretched logo, a 2.9:1
  caption. Recognition beats recall, and one visual pair replaces three paragraphs.
- Ship tokens, not swatches: hex, RGB, CMYK, Pantone, plus a JSON or CSS block with names like `color.ink`.
- Length matters. Twelve to 24 pages for a small brand; a 90-page manual nobody opens loses to a six-page PDF
  that circulates. Put the reference sheet on page one.

## Techniques
1. **Page-one quick sheet** — the six invariants, the file-naming convention, and "who to ask" on a single page,
   so most questions are answered before the reader turns it.
2. **Do/don't spread** — six pairs maximum, each as two 400×300 px frames with a 2 px rule between them and one
   caption under the pair, not each frame.
3. **Template kit** — 1080×1080, 1920×1080, 1200×630, and A4, each with placeholder text, locked zones, and
   margins already set, delivered as native editable files and not as flat PDFs.
4. **Stranger test** — hand the document to someone who did not make it and ask for one post. Target under ten
   minutes and zero questions; every question is a missing number.

## When to Use
- More than one person or agency produces assets, or freelancers deliver per project.
- After an identity launch and before the first campaign, so the first deviation becomes a precedent.
- When support questions repeat: the same three questions are three missing pages.

## When to Avoid
- A one-person brand with a single channel: a four-page spec plus tokens beats a 20-page manual.
- Do not write guidelines to settle an argument nobody has had yet; unpracticed rules get ignored.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Portfolio photography of the logo | No editable files, so staff trace from screenshots | Ship SVG, PNG, and native templates |
| Rules without values | "Appropriate spacing" is reinterpreted every time | Give px, mm, ratios, and hex |
| Ninety pages, no index | Nobody reaches page 60 | Six-page quick sheet plus deep sections |
| PDF only | A hex cannot be copied out of a print-ready PDF | Add a token file and a live HTML version |
| No owner named | Exceptions multiply with nobody to ask | Name a role, not a person who may leave |

## Practical Examples
A 16-page guidelines PDF for a cold-brew brand. Page 1 is the quick sheet: `#12100E`, `#E8B54B`, `#3C4A3E`,
`#F4EFE6`, Inter 400/500/700, Fraunces 600, 96 px margins on 1920×1080. Page 4 lists color as hex, RGB, CMYK, and
Pantone 1235 C. Page 6 sets type at 96/48/28/18/14 px with leading per size. Page 9 holds six
do/don't pairs for the lockup at its 240 px minimum width. Page 12 links four Avnac templates at 1080×1080,
1920×1080, 1200×630, and 2480×3508.

## Related Rules
- [`52-visual-identity-systems`](52-visual-identity-systems.md) — the system the document describes.
- [`55-brand-color-and-typography`](55-brand-color-and-typography.md) — the values for the color and type pages.
- [`56-brand-consistency`](56-brand-consistency.md) — the audit this document makes possible.
- [`91-design-systems`](91-design-systems.md) — the token documentation pattern to borrow.
- [`117-design-documentation`](117-design-documentation.md) — documenting decisions, not just outcomes.

## Sources
- Müller-Brockmann, *Grid Systems in Graphic Design*, p. 140 — the design manual staff must refer to, and
  gathering every document the design will apply to before devising anything.
- Müller-Brockmann, *Grid Systems in Graphic Design*, p. 141 — the specification page itself: 30-field grid, A4,
  four colors, display sans.
