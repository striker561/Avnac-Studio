# Accessibility — reference

Use when the work will be read by people who are not you: every screen design, every public
poster, every document. Accessibility is a correctness property, not a feature. Rules:
[`18-color-accessibility`](../rules/18-color-accessibility.md),
[`98-web-accessibility`](../rules/98-web-accessibility.md),
[`114-design-accessibility-checklist`](../rules/114-design-accessibility-checklist.md).

## Contrast minimums (WCAG 2.2)

| Content | Minimum ratio | Notes |
|---|---|---|
| Body text | 4.5:1 | Up to 24 px regular / 18.66 px bold |
| Large text | 3:1 | ≥ 24 px regular or ≥ 18.66 px bold |
| UI component boundaries, icons | 3:1 | Against adjacent color, not just background |
| Focus indicator | 3:1 | Against both component and page background |
| Disabled text | exempt | Still aim for 3:1 for usability |
| Decorative images | exempt | Anything conveying meaning needs a text alternative |

Ratios are computed on relative luminance: `(L1 + 0.05) / (L2 + 0.05)`, where L is linearized
sRGB. Chrome DevTools, Figma plugins and `webaim.org/resources/contrastchecker` all do this
correctly; do not eyeball it.

## Value pairs that pass on common backgrounds

| Foreground | On `#FFFFFF` | On `#111111` | On brand `#0B5FFF` |
|---|---|---|---|
| `#111111` | 18.9:1 ✓ | — | 3.1:1 (large only) |
| `#4B4B4B` | 8.6:1 ✓ | — | 1.4:1 ✗ |
| `#737373` | 4.6:1 ✓ | 4.6:1 ✓ | 1.0:1 ✗ |
| `#FFFFFF` | — | 18.9:1 ✓ | 4.6:1 ✓ (large/UI) |
| `#0B5FFF` | 4.6:1 ✓ | 4.1:1 ✗ | — |

Use these as sanity anchors, then measure the actual pair.

## Non-color cues

Color must never be the only carrier of meaning. For every place you use color to signal:

| Signal | Required second channel |
|---|---|
| Error / success / warning | Icon or label, not just red/green |
| Links in body text | Underline or weight change, not just hue |
| Required fields | Text "required" or `*` with a legend |
| Chart series | Distinct dash patterns, direct labels, or shape markers |
| Selected state | Border, check, or background shape |
| Focus | Visible ring with 3:1 contrast, not a subtle glow |

## Color vision

- ~8% of men and ~0.5% of women have some color vision deficiency; deuteranopia is most common.
- Red/green pairs at similar lightness are the classic failure. Separate them by lightness:
  dark red vs light green survives.
- Test palettes with a deuteranopia/protanopia simulator, and in grayscale.
- Prefer one dark and one light of the same hue over two mid-tone hues.

## Targets, motion, reading

| Item | Requirement |
|---|---|
| Touch target | ≥ 24×24 CSS px (WCAG 2.2 AA); 44×44 recommended |
| Target spacing | ≥ 8 px between unrelated targets |
| Focus order | Follows visual reading order; no traps |
| Motion | Respect `prefers-reduced-motion`; no essential info in animation only |
| Flashing | No more than 3 flashes per second |
| Text over imagery | Add a scrim or place text on a solid block; unpredicted backgrounds fail |
| Zoom / reflow | 200% zoom without loss; 320 CSS px width without horizontal scroll |

## Print and physical accessibility

- Body text at final size: 9 pt minimum, 10–11 pt preferred; large print 14 pt+.
- Contrast on paper is lower than on screen: coated stock reflects, newsprint absorbs. Add 1
  contrast step for newsprint and uncoated stock.
- Avoid text on busy photography even in print; halftones reduce edge contrast.
- Large-type and braille versions: keep a text-only layer or a tagged PDF.
- Signage: minimum 25 mm cap height per 3 m viewing distance (rule of thumb), placed at eye level.

## Audit procedure

1. List every text/background pair; measure with a contrast tool.
2. List every color-only signal; assign a second channel.
3. Tabulate targets and focus states for interactive work.
4. Run grayscale + deuteranopia simulation screenshots; compare against the original.
5. Keyboard-only pass (screens) and arm's-length read (print).
6. Record the results in the handoff — see [`116-design-handoff`](../rules/116-design-handoff.md).

## Rules

- [`18-color-accessibility`](../rules/18-color-accessibility.md) — contrast and palette construction.
- [`98-web-accessibility`](../rules/98-web-accessibility.md) — the screen implementation of this table.
- [`114-design-accessibility-checklist`](../rules/114-design-accessibility-checklist.md) — the delivery gate.
- [`14-color-contrast`](../rules/14-color-contrast.md) — how contrast is built, not just measured.
- [`27-readability-and-legibility`](../rules/27-readability-and-legibility.md) — reading, not just passing.
- [`94-interaction-states`](../rules/94-interaction-states.md) — focus and state visibility.
