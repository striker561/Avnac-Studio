# Rule: Spacing and Typesetting

**Domain:** typography · **ID:** `25-spacing-and-typesetting`

## Purpose
Fix the spacing that decides whether a block of text reads or fights: tracking, kerning, leading, paragraph separation, hyphenation, and the widows that make a finished page look unfinished.

## Definition
Typesetting is the adjustment of space at three scales — between letters (tracking and kerning), between lines (leading), and between blocks (paragraph spacing and indents). Tracking is measured in thousandths of an em, leading in pixels or points.

## Core Principles
- Body text at 14–24 px sits at zero tracking. Display above 48 px tightens by 1–3%; all-caps labels at 10–16 px open by 4–8%, small caps at 8–10 px by 8–12%.
- Kerning is automatic at body sizes. Correct manually only above 48 px, and only the pairs that show: AV, AW, AY, LT, PA, TA, To, Ty, VA, Wa, Yo.
- Leading rises with measure: 1.35 at 40 characters, 1.5 at 66, 1.6 at 85. It falls with size: 1.0–1.05 at 96 px.
- Leading must clear the extenders; ascender to descender often measures 1.09 em, so anything under 1.1 collides (see 22).
- Paragraph space or first-line indent, never both. Paragraph space runs 0.75–1.0× the leading; an indent is 1 em.
- Hyphenation belongs to justified text; ragged right needs it only below 45 characters.

## Techniques
1. **Set leading on the grid.** Body 16/24, 20/30, 24/36 — leading as a multiple of 4 or 6 px keeps baselines aligned across columns.
2. **Track only the extremes.** No tracking at 14–24 px, −2% on display, +6% on caps labels; then check that counters have not closed.
3. **Separate paragraphs one way.** 16 px body at 1.5 leading gets 18 px of space before, or a 16 px first-line indent with no space — pick one per document.
4. **Fix widows in order.** Copy edit one word, then change the measure by 2–3%, then adjust tracking by 0.3%. Never insert a manual line break; it returns with the next edit.
5. **Set hyphenation rules.** Two consecutive hyphens maximum, three characters minimum each side, no proper nouns, nothing hyphenated across a spread.

## When to Use
- Any block longer than three lines.
- Whenever late copy changes "break" the page: the problem is spacing, not the words.

## When to Avoid
- Don't track out a face with tight apertures to make it airy; you get gaps, not legibility.
- Don't justify a 30-character column: you get rivers, and hyphenation cannot save it.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| 1.0 leading on 20 px body | Lines collide and the block turns gray | 1.45–1.5 |
| Blank line between paragraphs at 1.5 leading | A 1.5× gap reads as a section break | 0.75–1.0× leading |
| Widow: one word on the last line | The paragraph looks unfinished | Edit, adjust measure, then track |
| Justified text without hyphenation | Rivers and uneven word space | Hyphenate, or set ragged |

## Practical Examples
An A4 editorial page sets 10/12 pt body (120% leading) in two 62 mm columns, justified with hyphenation; captions run 8/9.5 pt ragged right; paragraph spaces are 9 pt with no first-line indent. A widow at the top of column two is cleared by widening that column 2 mm — the measure rises to 64 characters, still inside 45–75 — not by a manual break that would return with the next edit.

## Related Rules
- [`20-typography-fundamentals`](20-typography-fundamentals.md) — the measure and leading values this rule refines.
- [`22-type-anatomy`](22-type-anatomy.md) — extenders that set the minimum leading.
- [`24-typographic-hierarchy`](24-typographic-hierarchy.md) — space above a heading as its level marker.
- [`26-type-scale-and-proportion`](26-type-scale-and-proportion.md) — the sizes whose leading you are setting.
- [`32-editorial-layout`](32-editorial-layout.md) — columns, folios, and running heads around these blocks.

## Sources
- Müller-Brockmann, *Grid Systems in Graphic Design*, p. 40 — 10 pt sans with solid, 1, 2, and 4 pt leading; long text needs wider leading and paragraph markers (blank line, indent, initial, small cap).
- Müller-Brockmann, *Grid Systems in Graphic Design*, p. 69 — 10 pt medium sans at 3 pt leading (130%), set ragged, column length proportioned to type size.
- Cheng, *Designing Type*, p. 59 — word-space and punctuation widths, and why a period shares a quarter-em body with the space.
- Bringhurst, *The Elements of Typographic Style* — hyphenation limits and widow control.
