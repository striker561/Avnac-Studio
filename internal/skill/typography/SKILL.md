---
name: typography
description: Choose, pair, size and set type — typeface selection, hierarchy, measure, leading, tracking and type-heavy compositions like covers, headlines and editorial pages. Use whenever the task is mostly text, the user asks about fonts, says the type looks off or generic, or needs a headline to carry a design.
---

# Typography

## Applies when
Type is the main material: covers, posters with type as image, editorial pages, slide decks, brand
wordmarks. If the task is a UI screen, use `ui`; if it is a logo, use `logo`.

## Workflow
1. **Decide the voice first.** Three adjectives (e.g. "precise, warm, a little severe") and their
   opposites. Typeface choice follows voice; it cannot create it after the fact.
2. **Pick a category, then a face.** Serif for authority/tradition, sans for clarity/modernity,
   slab for stability, display for expression, mono for technical. Only then choose the specific
   face — and check it has the weights you need.
3. **Set the body.** Size, measure (45–75 characters), line-height (1.4–1.6). This is the floor
   the whole hierarchy stands on.
4. **Build levels with a scale.** Choose one ratio (1.2 for UI, 1.25–1.33 for editorial, 1.33–1.5
   for posters) and derive sizes. Fewer levels, bigger jumps.
5. **Tune spacing.** Tracking for display (−1% to −3%) and caps (+2% to +5%); kerning on
   headline pairs; paragraph spacing or indent, never both.
6. **Pair only if needed.** One family with several weights is usually stronger than two families
   fighting. If pairing, require structural contrast plus matching x-height.
7. **Check at size and at distance.** 100% for detail, 25% for hierarchy, printed proof for
   rendering and ink spread.

## Decision points
- **One family or two?** One for coherence and range; two when you need genuine voice contrast
  (editorial, packaging). Two sans families that look similar is the worst option.
- **Display or text cut?** Use optical/display cuts for large sizes and text cuts for body; using
  a display cut small flattens its details and spacing.
- **Justified or ragged?** Justified for books and formal documents with hyphenation; ragged for
  screens, posters and anything short.
- **Type as image or type as text?** If the words are the graphic, allow distortion, layering and
  cropping — but keep the reading path intact.

## Rules to apply
- [`20-typography-fundamentals`](../rules/20-typography-fundamentals.md) — the base system.
- [`23-type-pairing`](../rules/23-type-pairing.md) — pairing tests that actually predict success.
- [`24-typographic-hierarchy`](../rules/24-typographic-hierarchy.md) — levels and jumps.
- [`25-spacing-and-typesetting`](../rules/25-spacing-and-typesetting.md) — tracking, leading, breaks.
- [`26-type-scale-and-proportion`](../rules/26-type-scale-and-proportion.md) — scales.
- [`27-readability-and-legibility`](../rules/27-readability-and-legibility.md) — reading performance.
- [`28-display-and-expressive-type`](../rules/28-display-and-expressive-type.md) — when type is the image.
- [`21-type-classification`](../rules/21-type-classification.md) — naming and choosing categories.

## References
- [`typography`](../references/typography.md) — sizes, scales, measure, setting values.

## Production checks
- Fonts licensed for the medium (desktop, web, embedding, app).
- Weights used are actually available; no faux bold or faux italic.
- Line breaks in headlines are deliberate, not browser-wrapped accidents.
- Widows, orphans and single-word last lines removed.
- Text converted to outlines only in the delivered file, never the master.
- Proof at final size for print; check ink spread on uncoated stock.

## Output format
`Voice:` three adjectives. `Families:` names, weights, licensing note. `Scale:` level → size /
line-height / tracking. `Measure:` characters per line. `Risks:` rendering, licensing, long-word
behaviour on narrow formats.
