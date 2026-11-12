# Color — reference

Use when a color decision needs a number or a comparison. Rules:
[`10-color-theory`](../rules/10-color-theory.md) through
[`19-color-in-context`](../rules/19-color-in-context.md); this file is the lookup.

## Attributes, in order of visual weight

| Attribute | What it does | Practical control |
|---|---|---|
| Value (lightness) | Carries contrast, hierarchy and legibility | Vary first; most "color" problems are value problems |
| Chroma (saturation) | Carries energy and attention | One saturated accent beats five mid-saturation colors |
| Hue | Carries meaning and category | Vary last, and keep the count low |

## Spaces and when they matter

| Space | Use for | Watch |
|---|---|---|
| sRGB | Web, social, default screen work | Browsers assume it; do not ship untagged wide-gamut PNGs |
| Display P3 | Apple screens, modern mobile | Out-of-gamut colors shift in sRGB viewers |
| CMYK | Offset/litho print | Ink limits, rich black, hue shifts (bright oranges/greens die) |
| Spot (Pantone) | Brand-critical, 1–3 color print | Cost per ink; matches differ by stock |
| HSL | Quick UI manipulation | Not perceptually uniform — equal L steps look unequal |
| OKLCH | Perceptual ramps, palettes, accessible systems | Best for generating consistent lightness steps |
| Lab | Color difference math, profiling | Not for hand-authoring |

## Conversion anchors

| Problem | Typical cause | Fix |
|---|---|---|
| Print looks duller than screen | RGB → CMYK gamut compression | Design in CMYK for print, or soft-proof |
| Blues turn purple in print | CMYK blue is weak | Add spot or accept the shift; check proofs |
| Rich black looks washed | 100K only | Use 40C/30M/30Y/100K for large solids |
| Thin white text on photo disappears | Halftone + reflection | Add scrim or switch to dark ground |
| Same hex looks different on two screens | Untagged color / display profile | Ship tagged sRGB; do not trust one monitor |

## Harmony schemes

| Scheme | Construction | Good for | Fails when |
|---|---|---|---|
| Monochrome | One hue, many values | Sophisticated, editorial, brand-tight | Needs emphasis: no hue contrast available |
| Analogous | 2–3 adjacent hues | Calm, natural, cohesive | Too little separation; accents vanish |
| Complementary | Opposite hues | Maximum energy, sport, sale, poster | Both at full saturation; vibration on edges |
| Split-complementary | One hue + two neighbours of opposite | Softer version of complementary | Undisciplined proportions |
| Triadic | Three evenly spaced hues | Playful, children, events | Equality: one must dominate |
| Tetradic | Two complementary pairs | Rich, editorial illustration | Four voices competing |

Proportion rule: 60% dominant, 30% secondary, 10% accent. In practice: ground, structural color,
one accent.

## Contrast

| Type | Build | Min for text |
|---|---|---|
| Value contrast | Light vs dark | 4.5:1 body, 3:1 large |
| Hue contrast | Different hues, same value | Not sufficient alone for text |
| Saturation contrast | Muted vs vivid | Accent only |
| Temperature contrast | Warm vs cool | Works at equal value; strong on large areas |

## Albers interaction (practical)

- A color changes appearance against its neighbour: a mid gray looks darker on white, lighter on
  black. Judge colors in the composition, never in the swatch panel.
- Two colors that "vibrate" usually share value and oppose hue — separate their values.
- Transparency effects rely on the same relativity: simulate by choosing the *resulting* colors,
  not by stacking alpha and hoping.
- A palette built in isolation will need one adjustment pass in context. Budget for it.

## Building a palette

1. Pick the anchor: the one color the brand must own (often from a logo or a material).
2. Build a value ramp for it: 50, 100, 200, 400, 600, 800, 900 (light → dark), in OKLCH at even
   lightness steps.
3. Choose a neutral ramp: a near-gray tinted toward the anchor (2–6% chroma) reads more
   intentional than pure gray.
4. Add one functional set: success, warning, error, info — each with a text-safe dark variant.
5. Name by role (`surface`, `text-muted`, `accent`), never by hue (`light-blue-2`).

## Accessibility quick table

| Pair | Ratio | Verdict |
|---|---|---|
| `#111111` on `#FFFFFF` | 18.9:1 | Any size |
| `#767676` on `#FFFFFF` | 4.54:1 | Body text passes |
| `#999999` on `#FFFFFF` | 2.85:1 | Large text only |
| `#FFFFFF` on `#0B5FFF` | 4.6:1 | Body passes |
| `#FFD400` on `#FFFFFF` | 1.3:1 | Never |
| `#FFD400` on `#111111` | 12.4:1 | Excellent |

Full procedure: [`accessibility`](accessibility.md).

## Rules

- [`10-color-theory`](../rules/10-color-theory.md) — hue/value/chroma and color models.
- [`11-color-harmony`](../rules/11-color-harmony.md) — schemes and their failure modes.
- [`13-color-perception`](../rules/13-color-perception.md) — interaction and relativity.
- [`14-color-contrast`](../rules/14-color-contrast.md) — contrast budgets.
- [`16-palette-construction`](../rules/16-palette-construction.md) — ramps and tokens.
- [`18-color-accessibility`](../rules/18-color-accessibility.md) — contrast in practice.
- [`81-print-color-management`](../rules/81-print-color-management.md) — CMYK, spot and proofing.
