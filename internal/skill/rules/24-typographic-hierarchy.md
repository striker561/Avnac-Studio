# Rule: Typographic Hierarchy

**Domain:** typography · **ID:** `24-typographic-hierarchy`

## Purpose
Give the reader an unambiguous order in which to take in the text. Hierarchy is how a design
answers "what do I read first?" before the reader has to think about it. When every level looks
equally important, the reader either stops or invents an order you did not intend.

## Definition
Typographic hierarchy is the visible ranking of text elements achieved by differences in size,
weight, case, color/value, spacing, and position. A hierarchy exists only when adjacent levels
are *perceptibly* different; a difference the reader has to compare to notice is not a level,
it is noise.

## Core Principles
- Four levels cover almost every layout: primary (headline), secondary (subhead or deck),
  tertiary (body), quaternary (captions, labels, legal). Five is the practical maximum on a
  poster; three on a social post.
- Make adjacent levels differ by at least one clear step: a size jump of roughly 1.3×–1.5×, a
  weight jump of two steps (Regular → Bold, not Regular → Medium), or a value jump of at least
  30% lightness. Two mild changes do not add up to one clear change.
- Hierarchy comes from relationship, not decoration. If the headline needs an underline, a
  drop shadow and a different color to stand out, the underlying scale is wrong.
- Equal-importance items must *look* equal. A caption and a label with different sizes imply a
  difference in meaning the design does not have.
- Proximity reinforces hierarchy: space above a headline is larger than the space below it, so
  the headline groups with its subhead and separates from what came before.
- Body text sets the floor. Establish body size and leading first, then build levels above it;
  hierarchy designed downward from the headline usually ends with unreadable body copy.

## Techniques
1. **Scale jump** — set body at 16 px, then headline at 48–72 px (3×–4×, not 1.5×). Display
   type is a different regime: a poster headline can be 8× body; a UI dialog title rarely
   exceeds 1.75×.
2. **Weight and case layering** — keep one family, use Bold for level 1, Semibold for level 2,
   Regular for level 3. All-caps at small sizes for labels only, with +2%–5% tracking.
3. **Value contrast** — primary text at full strength (e.g. `#111111`), secondary at 70%
   (`#4B4B4B`), tertiary at 55% (`#737373`). On dark grounds, invert the direction but keep the
   same step sizes; do not let tertiary text fall below 4.5:1 against the background.
4. **Measure the jump, don't eyeball it** — write the actual values into the design brief
   (level, size, weight, color, leading). If two levels share all four values, they are the same
   level.
5. **The three-second test** — view the composition at 25% zoom. You should be able to name the
   levels top-down in three seconds. If two elements compete, change one variable by a full step
   rather than nudging both.

## When to Use
- Any composition with more than one text element, from a 1080×1080 post to a 24-page brochure.
- Interfaces: page title, section header, body, label, helper text, error text.
- When a client says the design "feels flat" or "busy" — usually a hierarchy problem, not a
  color problem.

## When to Avoid
- Deliberately flat, index-like material (a wall of equal entries, a museum label sheet) where
  equal treatment is the message. Even then, keep one clear entry point.
- Don't force four levels into a format that carries two sentences. A single-line banner has one
  level; adding a fake subhead weakens it.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Sizes 18/20/22 px across three levels | Differences fall below perceptual threshold | Use a 1.3×–1.5× step: 18/26/36 px |
| Creating hierarchy with color only | Fails in grayscale, for colorblind readers, and in print | Add a size or weight step, keep color as reinforcement |
| Decorative fonts to distinguish levels | Each new family adds noise and inconsistency | One family, multiple weights; two families maximum |
| Bold *and* larger *and* colored for emphasis | Emphasis inflation: everything shouts, nothing lands | One variable per level change |
| Equal spacing above and below headings | Headings float, belonging to neither block | Space above ≈ 2× space below |

## Practical Examples
A 1080×1080 event poster, four levels, one family (Inter):

- Headline "NIGHT SHIFT" — 112 px, Bold, `#F5F1E8` on `#121212`, tracked −2%.
- Subhead "A late-night print fair" — 34 px, Medium, 80% white.
- Body "Fri 14 Nov · 20:00 · Warehouse 9" — 22 px, Regular, 70% white, 1.45 line-height.
- Footer "Free entry · @nightshiftpress" — 15 px, Medium, all caps, 60% white, +4% tracking.

The headline is 5× body, so the first fixation is guaranteed; the 34 px subhead is 1.5× body and
distinctly heavier than the 22 px body, so level 2 reads as a caption to the headline rather than
as another body line.

## Related Rules
- [`02-visual-hierarchy`](02-visual-hierarchy.md) — the same ordering logic across all elements, not just type.
- [`03-contrast-and-emphasis`](03-contrast-and-emphasis.md) — contrast is the mechanism hierarchy uses.
- [`26-type-scale-and-proportion`](26-type-scale-and-proportion.md) — a scale generates the size steps so you don't invent them per layout.
- [`27-readability-and-legibility`](27-readability-and-legibility.md) — the floor below which level 4 stops working.
- [`93-interface-layout-and-spacing`](93-interface-layout-and-spacing.md) — the UI variant of these levels.

## Sources
- Cheng, *Designing Type*, p. 140 — x-height and cap-height ratios change apparent size at the same point size, so equal numeric sizes do not read as equal.
- Müller-Brockmann, *Grid Systems in Graphic Design*, "Body and display faces" — the split between text and display type, and why display sizes need their own treatment.
- Tufte, *The Visual Display of Quantitative Information*, p. 190 — contrast in weight encodes contrast in meaning; heavier means more important.
