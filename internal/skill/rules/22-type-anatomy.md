# Rule: Type Anatomy

**Domain:** typography · **ID:** `22-type-anatomy`

## Purpose
Predict how a typeface will behave at 12 px or at 120 px before you commit to it. The parts of a letter are measurable, and a few ratios explain apparent size, small-size survival, and why two faces at the same point size look different.

## Definition
Anatomy is the set of named parts and metrics of a letter: baseline, x-height, cap height, ascender, descender, overshoot, counters, apertures, stems, bowls, and terminals. The ratios between them — x-height to cap height, ascender to descender, counter area to stroke — are what predict behavior.

## Core Principles
- x-height as a share of cap height is the best single predictor of apparent size: Cheng measures 63% and 71% in two sans faces at one nominal size (p. 140). A 63% face at 16 px reads about like a 71% face at 14 px.
- Extenders set the vertical rhythm: in traditional text faces ascenders reach cap height (p. 133), and ascender and descender each run about 28% of cap height (p. 139).
- Counter size predicts survival at small size: large open counters hold at 11–12 px, small tight ones fill in.
- Aperture predicts blur tolerance: open apertures (Frutiger, Gill) keep a, c, and e distinct at low resolution; closed ones turn into texture.
- Stroke contrast sets a size floor: high-contrast hairlines vanish below about 24 px in print and 28 px on screen.
- Terminals are texture, not information. Ball terminals sparkle at 72 px and smudge at 12 px.

## Techniques
1. **Measure the ratio.** Render "x" and "H" at 100 px, measure pixel heights, divide. Do it before committing.
2. **Correct apparent size.** To match a 71% face, set the 63% face at 1.13× the size (71/63); to go the other way, set the large-x-height face at 0.89×.
3. **Pick the regime by counters.** Body below 14 px needs large counters and moderate contrast; display above 48 px can carry high contrast and small counters.
4. **Check extenders against leading.** Ascender plus descender often exceeds 1.0 em, so leading under 1.1 collides at display sizes.
5. **Judge at final size.** A 72 px specimen hides exactly the failures that appear at 14 px.

## When to Use
- Choosing between two plausible faces for the same job.
- Matching a headline face to a body face (see 23).
- Deciding whether a caption needs its own face or a larger size.

## When to Avoid
- A one-word display lockup: silhouette and spacing matter more than anatomy (see 28).
- Don't reject a face on x-height alone; width and contrast can outweigh it.
- Don't chase 1% differences in a face that will render at 96 px on a phone.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Two faces at the same px size | Their x-heights differ by 6–10% | Scale by the measured ratio |
| Judging from a 72 px specimen | Counters and hairlines behave differently at 14 px | Test at final size |
| Assuming a large x-height always wins | At display sizes it looks cramped | Use the display cut, not the text cut |
| Tightening tracking on a cramped face | Spacing cannot open a closed counter | Choose a face with open counters |

## Practical Examples
A 900×1200 poster sets "HARVEST" at 140 px in a Didone; the hairlines hold. The same face at 18 px in the caption loses its thin strokes, so the caption switches to a low-contrast grotesque, set at 0.94× nominal because its x-height measures 72% against the Didone's 68%.

## Related Rules
- [`21-type-classification`](21-type-classification.md) — narrowing the list before you measure.
- [`23-type-pairing`](23-type-pairing.md) — matching two faces by these ratios.
- [`27-readability-and-legibility`](27-readability-and-legibility.md) — size and contrast floors.
- [`28-display-and-expressive-type`](28-display-and-expressive-type.md) — when silhouette beats anatomy.
- [`29-variable-and-digital-type`](29-variable-and-digital-type.md) — optical-size axes and screen rendering.

## Sources
- Cheng, *Designing Type*, p. 140 — x-height at 63% and 71% of cap height in two sans faces, with the counters and joins that follow from it.
- Cheng, *Designing Type*, p. 133 — ascenders matching cap height in traditional text faces, and made taller in large-x-height faces.
- Cheng, *Designing Type*, p. 139 — descenders equal to ascenders, both about 28% of cap height.
- Cheng, *Designing Type*, p. 159 — terminals and spurs: ball terminals, horns, and the one-story g in slab serifs.
