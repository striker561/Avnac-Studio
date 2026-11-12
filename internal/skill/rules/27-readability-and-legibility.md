# Rule: Readability and Legibility

**Domain:** typography · **ID:** `27-readability-and-legibility`

## Purpose
Keep text readable as a block, not merely recognizable as letters. Legibility gets a word; readability gets a paragraph; comprehension is what the design is actually for.

## Definition
Legibility is the ease of distinguishing individual characters — a property of typeface, size, contrast, and rendering. Readability is the ease of reading continuous text — a property of measure, leading, alignment, and language. Both are measurable, and both fail quietly.

## Core Principles
- Measure: 45–75 characters per line, 66 as the target. Below 35 the eye returns too often; above 90 it loses the line on the return sweep.
- Leading: 1.4–1.6 for 16–18 px body, rising with measure; 1.25–1.35 at 24–32 px.
- Contrast: 4.5:1 is the floor, 7:1 for long-form. Avoid #000 on #FFF for large blocks; #1A1A1A on #FAFAFA measures about 16:1 and is easier to sustain.
- Justification needs hyphenation, 45+ characters, and consistent word spacing. Without all three, set ragged right.
- All caps flatten word shapes and slow long strings; keep caps to three or four words or to labels.
- Size floors: 16 px minimum for screen body, 18 px for long blocks, 9 pt for print body, 12 pt and up for large-print editions.

## Techniques
1. **Count characters.** Average three full lines; outside 45–75, change the frame width rather than the type size.
2. **Read three lines at 100%.** If you re-read a line, add 0.1 to the leading before changing anything else.
3. **Check justification by word space.** Compare the same word across adjacent lines; a difference above 50% means ragged right or hyphenation is needed.
4. **Test contrast on the composite,** including opacity and any image behind the text (see 14).
5. **Print it.** A 100% printout at reading distance exposes what a 25% canvas view hides.

## When to Use
- Long-form copy, interface body text, and poster detail blocks — anywhere past 100 words.
- When a client says the text "feels dense" or "looks like a wall".

## When to Avoid
- Don't apply a 66-character measure to a headline or a 12-character label.
- Don't justify a 25-character column; the word spaces will be the loudest thing on the page.
- Don't chase 45–75 characters for captions; 20–40 is the correct range there.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Full-width body at 1440 px | About 150 characters; the eye cannot find the next line | 600–720 px frame |
| 16 px body at 1.2 leading | Lines touch and the block grays out | 1.5 |
| #808080 body on white | 3.95:1, below the floor | #767676 for 4.5:1, #4D4D4D for comfort |
| Centered six-line paragraph | Both edges ragged, nothing to anchor on | Flush left |
| Justified text without hyphenation | Rivers and uneven word space | Hyphenate, or set ragged |

## Practical Examples
A 600-word article on a 1440×900 canvas: body 18 px/1.6 in a 680 px frame, about 72 characters in Inter, #1A1A1A on #FAFAFA at 16:1, ragged right, 24 px between paragraphs. At a 900 px frame the same copy runs about 95 characters and the test reader loses the line on the return sweep; at 680 px the re-reads stop.

## Related Rules
- [`20-typography-fundamentals`](20-typography-fundamentals.md) — the base values these floors constrain.
- [`22-type-anatomy`](22-type-anatomy.md) — counters and apertures that decide small-size survival.
- [`25-spacing-and-typesetting`](25-spacing-and-typesetting.md) — the leading and hyphenation mechanics.
- [`26-type-scale-and-proportion`](26-type-scale-and-proportion.md) — scales whose smallest step must clear these floors.
- [`32-editorial-layout`](32-editorial-layout.md) — columns, captions, and running text in context.

## Sources
- Müller-Brockmann, *Grid Systems in Graphic Design*, p. 40 — with leading too tight the eye is forced to read the neighbouring lines; long text also needs paragraph markers.
- Müller-Brockmann, *Grid Systems in Graphic Design*, p. 69 — column length proportioned to type size, set ragged, as the condition for comfortable reading.
- WCAG 2.2, SC 1.4.3 Contrast (Minimum) — the 4.5:1 and 3:1 thresholds.
- Bringhurst, *The Elements of Typographic Style* — the 45–75 character measure and the case against long justified lines.
