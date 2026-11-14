# Rule: Color Accessibility

**Domain:** color · **ID:** `18-color-accessibility`

## Purpose
Keep color from being the only thing that carries meaning, and hold text to ratios real eyes can read in real rooms. Accessibility here is a floor for every composition, not a variant to offer clients.

## Definition
Color accessibility means three measurable things: contrast sufficient to read the text (WCAG ratios), redundant encoding so hue is never the sole signal, and palettes that survive the common color vision deficiencies. It applies to screens, print, signage, and posters alike.

## Core Principles
- WCAG 2.2 AA asks 4.5:1 for normal text, 3:1 for large text (≥24 px, or ≥18.66 px bold), and 3:1 for UI component boundaries and meaningful graphics (SC 1.4.3, 1.4.11). AAA raises text to 7:1.
- Color alone is never a cue (SC 1.4.1). Add a label, icon, pattern, position, or weight, and check that the cue survives grayscale.
- Red-green deficiency affects roughly 1 in 12 men and 1 in 200 women; blue-yellow deficiency is rarer than 1 in 10,000. Design for deuteranopia first.
- Separate series by lightness first (20+ L* apart), then hue, then pattern. Hues that separate for you may collapse for 8% of male readers.
- Measure contrast on the final composite: text at 60% opacity over a photograph has a different ratio than the hex suggests.
- Focus indicators need 3:1 against both the component and the surrounding background.

## Techniques
1. **Compute before shipping.** Check every text/background pair and pick the nearest passing step of the same hue; a passing gray exists at almost any hue if you move value (see 14).
2. **Encode twice.** Error = red + icon + the word "Error". Link = color + underline. Chart series = color + direct label + distinct value.
3. **Start from a tested categorical set.** Okabe-Ito: #000000, #E69F00, #56B4E9, #009E73, #F0E442, #0072B2, #D55E00, #CC79A7. Drop to four or five for print, where close hues muddy.
4. **Run four passes.** Grayscale, deuteranopia simulation, 200% zoom, and a laser print. Any cue that vanishes in one pass is not yet a cue.
5. **Kill opacity overlays.** If text must sit over imagery, put a solid plate under it or raise the scrim until the measured ratio passes.

## When to Use
- Every screen interface, especially forms, validation, status, and focus states.
- Charts, maps, and diagrams where color carries the categories.

## When to Avoid
- Don't pile on redundant cues: a chart with six series needs fewer series, not six patterns.
- Don't apply 7:1 everywhere by default; AA plus generous size reads better than muddy AAA gray.
- Don't trust a simulator as proof — it approximates one deficiency, while the grayscale test is reliable in every case.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| 50% gray text (#808080) on white | 3.95:1, below the body-text floor | #767676 for 4.5:1, #4D4D4D for comfort |
| Red and green status dots | Indistinguishable for about 8% of men | Add icon shape and a text label |
| Color-only chart legend | Forces hue matching across the page | Label the series directly |
| Placeholder text at 30% opacity | Fails contrast and reads as disabled | Keep 4.5:1 and style it as editable |

## Practical Examples
A 1440×900 dashboard: the "Live" status uses #0072B2 on #FFFFFF (4.8:1) plus a check icon and the word. The alert color #D55E00 measures 3.9:1, so it carries only a 3 px rule and an icon, with the number itself in #111111 (18.9:1). Series colors come from Okabe-Ito and each line is labelled at its end, so the chart reads in grayscale as separated values rather than a legend-matching exercise.

## Related Rules
- [`14-color-contrast`](14-color-contrast.md) — the computation and the value ladder.
- [`17-limited-and-functional-palettes`](17-limited-and-functional-palettes.md) — reserving functional colors so their meaning holds.
- [`27-readability-and-legibility`](27-readability-and-legibility.md) — size and leading as the other half of readability.
- [`96-data-visualization`](96-data-visualization.md) — encoding choices for charts beyond color.
- [`98-web-accessibility`](98-web-accessibility.md) — the full WCAG 2.2 AA checklist around these ratios.

## Sources
- WCAG 2.2, SC 1.4.1 Use of Color, SC 1.4.3 Contrast (Minimum), SC 1.4.11 Non-text Contrast.
- Okabe, M. & Ito, K., "Color Universal Design (CUD)" — the eight-color categorical set reproduced above.
- Tufte, *The Visual Display of Quantitative Information*, "Aesthetics and Technique" — label the graphic directly, and choose colors the 5–10% of color-deficient viewers can still read.
