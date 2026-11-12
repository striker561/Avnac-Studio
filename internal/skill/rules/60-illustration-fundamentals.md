# Rule: Illustration Fundamentals

**Domain:** illustration · **ID:** `60-illustration-fundamentals`

## Purpose
Decide whether a message needs illustration rather than photography or type, choose a style that serves the
content, and keep a set coherent when images are made months apart.

## Definition
Illustration is authored image-making used to carry meaning photography cannot carry efficiently: the invisible
(process, structure), the impossible (cutaway, extreme scale), the abstract (metaphor), or the consistent.

## Core Principles
- Illustration must do one of four jobs: explain (cutaway, diagram, sequence), personify (a character who
  demonstrates), set tone (the visual voice of the brand), or depict the unphotographable. Otherwise it is
  decoration with a budget.
- Style follows content. A technical explainer wants one uniform line weight and no gradient; an onboarding flow
  wants 3–4 flat tones, rounded shapes, and high chroma. State the reason before the look.
- A set is one visual grammar: same light direction, same line weight, same 5–8 color palette, same detail level,
  same corner treatment. Any attribute that varies is a second author.
- Abstraction level is chosen once per set: photoreal, semi-flat, geometric, glyph. Mixing levels reads as
  assembled stock.
- Cost is per image: 1–3 days for a hero, 2–6 hours for a spot, 20–40 minutes for a glyph. Budget the count
  before the style.
- Rights are usage, not ownership: license by media, term, and territory; the illustrator keeps copyright.

## Techniques
1. **One-page style sheet** — fix six numbers: 5 hex values, line weight (3 px at 1200 px wide), corner radius
   (12 px), light direction (top-left 45°), tone steps (3), detail floor (no interior line under 40 px).
2. **Labelled reference board** — six images, each annotated with what you take from it ("the flat shadow of 2,
   the palette of 5"). An unlabelled mood board communicates taste, not specification.
3. **Metaphor sentence** — write it before drawing: "onboarding is a set of doors, not a hallway." Test three
   candidates for audience literacy, then commit to one.
4. **Hero/spot reduction** — draw the hero at full detail, then remove elements until a spot survives at 96×96 px.
   The spots must be recognizably the same hand as the hero.
5. **Eight-up set test** — eight finished images on one 1920×1080 canvas. Anything needing a different background,
   palette, or light to work is off-system.

## When to Use
- The subject cannot be photographed honestly: an internal process, an abstract service, a future state.
- Recurring assets must look identical for years and stock photography shifts look every season.
- A brand needs an ownable visual voice in a category saturated with photography.

## When to Avoid
- When a real photograph is more credible — food, a product's finish, a face in a testimonial.
- When the budget covers one image but the piece needs eight: one hero among eight stock images reads accidental.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Style chosen before the message | The image explains nothing and needs a caption | Write the job first, then the style |
| Mixed abstraction levels in one set | Readers see two illustrators | Fix the level in the style sheet |
| Detail designed for a large screen only | Mud at 200 px and bloated files | Design at the smallest intended size |
| Assuming the art is bought outright | Reuse beyond the license is infringement | License media, term, and territory |
## Practical Examples
A 1440×900 empty-state illustration built as one Avnac `group`: five `path` elements on `#12100E`, `#E8B54B`,
`#3C4A3E`, and `#F4EFE6`, with `#C9704A` reserved for the character's hands alone. Line weight 3 px throughout;
key light top-left, so every cast shadow `ellipse` is offset +24 px x and +16 px y. The same five paths scale to
96×96 for four feature icons, dropping interior lines and the accent color, because at 96 px the accent averages
into noise.

## Related Rules
- [`61-shapes-and-forms`](61-shapes-and-forms.md) — the shape vocabulary the set is built from.
- [`66-vector-illustration`](66-vector-illustration.md) — producing these images as clean paths.
- [`76-visual-metaphors-and-symbolism`](76-visual-metaphors-and-symbolism.md) — choosing and testing the metaphor.
- [`70-photography-and-imagery`](70-photography-and-imagery.md) — the alternative, and when it wins.
- [`52-visual-identity-systems`](52-visual-identity-systems.md) — where illustration sits in the identity.

## Sources
- Graphic Artists Guild, *Handbook*, p. 423 — the illustration markets, from editorial and book to technical and
  dimensional.
- Graphic Artists Guild, *Handbook*, p. 445 — illustrators retain copyright; usage beyond display must be
  stipulated in the agreement.
