# Rule: Typography Fundamentals

**Domain:** typography · **ID:** `20-typography-fundamentals`

## Purpose
Set text that behaves like a material rather than a label stuck onto a shape. Six decisions govern every text element — family, size, weight, measure, leading, alignment — and fixing them once separates a design from a run of guesses.

## Definition
Typography is control of those six variables, plus case and color, at a stated viewing distance. The minimum viable type system is the smallest set of fixed values that covers the work: one family, two weights, three sizes, one measure, one leading, one alignment.

## Core Principles
- Body size follows distance and medium: 16–18 px on screen, 9–11 pt in print, 24 pt+ at 3 m. Below 14 px on screen, only labels and captions survive.
- Measure is a width, not a character count you hope for: 45–75 characters, 66 ideal, which at 16 px Inter is roughly 600–680 px.
- Leading falls as size rises: 1.5 at 16 px, 1.45 at 20 px, 1.2 at 32 px, 1.0–1.05 at 96 px.
- Weight is a hierarchy tool, not a texture: Regular for body, Semibold or Bold one level above, and rarely more than three weights in a document.
- Alignment is a system decision. Flush left and ragged right for Latin body copy; centered for three lines or fewer; justified only with hyphenation.
- Pixels on the canvas, points in the spec: 1 pt = 4/3 px, so 12 pt body = 16 px. Mixing the two silently sets text 25–33% wrong.

## Techniques
1. **Set the frame first.** Give every text element an explicit width equal to its measure; auto-width text has no measure and drifts with the copy.
2. **Build body up, not headline down.** Body 16–18 px at 1.5, then about 1.25× for a subhead and 2.5–3× for the headline; everything else is a variation on those three.
3. **Snap leading to the grid.** 16 px × 1.5 = 24 px, 20 px × 1.5 = 30 px; multiples of 4 or 6 px keep baselines aligned across blocks.
4. **Check the rag.** Read the right edge of a three-line paragraph: a staircase or a deep notch means the measure is 5% off, not the words.
5. **Test at final size.** A 16 px block on a phone at arm's length, or a printout at 100%, exposes errors a zoomed canvas hides.

## When to Use
- Before any hierarchy, pairing, or display decision: these six values are the substrate everything else sits on.
- Whenever a layout feels wrong but nothing is visibly broken — usually measure or leading.

## When to Avoid
- A single word on a 1080×1080 post needs one size and one position, not a six-value system.
- Don't apply a body measure to captions (20–40 characters) or to a headline.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| 14 px body across a 1440 px canvas | 130+ characters per line; the eye loses its place | 16–18 px in a 600–720 px frame |
| Line-height 1.0 on body copy | Lines fuse into one gray block | 1.45–1.55 |
| Auto-width text elements | The measure changes with every edit | Fixed width, aligned to the grid |
| pt and px confused | Type ships 25–33% off | 1 pt = 1.333 px, converted once |

## Practical Examples
A 1080×1350 poster in Inter: headline 96 px/1.0 with −2% tracking in #111111; subhead 32 px/1.2; body 20 px/1.5 in a 620 px frame (about 62 characters); footer 14 px/1.4, all caps, +6% tracking. The body frame is the only measured width on the sheet, and every other element aligns to its left edge.

## Related Rules
- [`24-typographic-hierarchy`](24-typographic-hierarchy.md) — the levels this system has to support.
- [`25-spacing-and-typesetting`](25-spacing-and-typesetting.md) — tracking, hyphenation, and paragraph detail.
- [`26-type-scale-and-proportion`](26-type-scale-and-proportion.md) — where the three sizes come from.
- [`27-readability-and-legibility`](27-readability-and-legibility.md) — the floors for measure and leading.
- [`21-type-classification`](21-type-classification.md) — choosing the family these values apply to.

## Sources
- Müller-Brockmann, *Grid Systems in Graphic Design*, p. 40 — 10 pt sans with 1, 2, and 4 pt leading; long texts need wider leading and paragraphing.
- Müller-Brockmann, *Grid Systems in Graphic Design*, p. 69 — 10 pt medium sans with 3 pt leading, set ragged, column length proportioned to type size.
- Bringhurst, *The Elements of Typographic Style* — the 45–75 character measure.
