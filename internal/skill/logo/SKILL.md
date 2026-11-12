---
name: logo
description: Design, refine or test a logo, wordmark, monogram or mark — construction on a grid, optical correction, small-size behaviour, clear space, lockups and the file set to deliver. Use whenever the user wants a logo, says their mark is blurry, illegible or off-balance, or needs a version that works at 16 px and on a dark background.
---

# Logo Design

## Applies when
The deliverable is a mark, a wordmark or a lockup. For the surrounding identity system, use
`brand`. For icons that are not the brand mark, use `icon`.

## Workflow
1. **Write the mark's job in one sentence.** What must it signal, to whom, and where will it be
   seen smallest? This determines how much detail is allowed.
2. **Decide the type** (wordmark, lettermark, pictorial, abstract, emblem, combination) from the
   name, the audience and the recognition budget. Long names rarely survive as marks.
3. **Explore in black only.** 10–20 thumbnails at 200 px, no color, no gradients. If it does not
   work in one ink, it does not work.
4. **Redraw the best two on a grid** — circle/square/triangle or the letters' skeleton. Use
   consistent stroke weights, consistent corner radii, and optical corrections (1–2% overshoot on
   curves, equalize apparent weights).
5. **Test the ladder**: 16, 24, 32, 48, 96, 200, 400 px. Simplify a variant for the bottom two
   rather than scaling detail down.
6. **Set clear space and minimum size** as numbers: clear space = cap height (or ½ mark height);
   minimum print width at which the smallest counter is 0.3 mm.
7. **Build lockups** (horizontal, stacked, mark-only, reversed, one-color) with fixed ratios
   between mark size, type size and gap.
8. **Produce the file set** and the misuse examples.

## Decision points
- **Literal or abstract?** Literal is memorable when the object is distinctive and unowned;
  abstract requires budget to build meaning. If a stranger needs the name to understand it, it had
  better be beautiful.
- **Monogram or name?** Monograms work when the initials are distinctive and not confusable;
  wordmarks work when the name is short and the type can carry it.
- **One mark or a family?** A family (mark, sub-brand marks, product icons) needs a construction
  rule — same grid, same stroke, same corner logic — or it falls apart in use.
- **Emblem or separate mark?** Emblems are strong for badges, labels and heritage; they need a
  separate small-size mark or they fail in avatars.

## Rules to apply
- [`53-logo-construction`](../rules/53-logo-construction.md) — geometry and optical correction.
- [`54-logo-types-and-variations`](../rules/54-logo-types-and-variations.md) — types, lockups, variants.
- [`09-figure-ground`](../rules/09-figure-ground.md) — the mark as a shape against its field.
- [`68-iconography`](../rules/68-iconography.md) — small-size discipline.
- [`52-visual-identity-systems`](../rules/52-visual-identity-systems.md) — the system the mark anchors.
- [`18-color-accessibility`](../rules/18-color-accessibility.md) — contrast for the mark and its lockup.

## References
- [`logo`](../references/logo.md) — size ladder, clear space, file set, failure catalogue.
- [`branding`](../references/branding.md) — where the mark sits in the identity.

## Production checks
- One-color version holds; reversed version re-balanced, not inverted.
- 16 px render is recognizable; if not, a simplified favicon variant exists.
- Clear space and minimum sizes published as numbers.
- Vector master with live text kept; outlined copies for delivery.
- Raster exports at 16/32/48/180/512 px.
- Trademark check advised before final sign-off.

## Output format
`Mark:` type + one-sentence rationale. `Construction:` grid, optical corrections, stroke logic.
`Sizes:` ladder result per size. `Clear space / minimum:` numbers. `Files:` list. `Risks:` where
it will degrade (small size, embroidery, single ink, animation).
