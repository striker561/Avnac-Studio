# Typography — reference

Use when choosing, pairing, sizing or setting type. The applied rules are
[`20-typography-fundamentals`](../rules/20-typography-fundamentals.md) through
[`29-variable-and-digital-type`](../rules/29-variable-and-digital-type.md); this is the value table.

## Sizes at final size

| Use | Screen | Print |
|---|---|---|
| Display / hero | 48–200 px | 60–300 pt |
| Headline | 32–48 px | 24–48 pt |
| Subhead | 21–28 px | 14–20 pt |
| Body | 15–18 px | 9–11 pt |
| Caption / legal | 11–13 px | 6–8 pt |
| UI label | 11–14 px | — |
| Minimum legible | 12 px | 6 pt |

Screen rule of thumb: body = 1.5× the minimum you would tolerate; poster headline = 1/50 of the
viewing distance in millimetres (3 m → 60 mm cap height).

## Scales

Pick one ratio and generate levels; do not invent per-layout sizes.

| Ratio | Name | 16 px base sequence |
|---|---|---|
| 1.125 | Major second | 16, 18, 20, 23, 26, 29 |
| 1.200 | Minor third | 16, 19, 23, 28, 33, 40 |
| 1.250 | Major third | 16, 20, 25, 31, 39, 49 |
| 1.333 | Perfect fourth | 16, 21, 28, 38, 50, 67 |
| 1.500 | Perfect fifth | 16, 24, 36, 54, 81 |
| 1.618 | Golden ratio | 16, 26, 42, 68 |

For UI, 1.2 is safe. For posters, 1.33–1.5 gives the contrast needed at distance.

## Measure and leading

| Measure | Characters per line | Use |
|---|---|---|
| 45–75 | ideal body | long reading |
| 35–45 | short body, sidebars | mobile, columns |
| 20–35 | captions, decks | supporting text |
| < 20 | labels | not for sentences |

Line-height by size: body 1.4–1.6; subhead 1.2–1.3; headline 1.0–1.15; caption 1.3–1.4.
For dark-on-light text increase leading slightly; light-on-dark needs +0.05–0.1 more.

## Pairing tests

Before pairing, check these four; failure on any one is usually fatal.

| Test | Pass condition |
|---|---|
| Structural contrast | One serif + one sans, or two clearly different widths |
| x-height match | Difference under ~15%, or deliberately extreme |
| Weight availability | Both have at least 4 weights if hierarchy needs them |
| Era / tone match | Both read as the same decade and same level of formality |

Reliable pairings: geometric sans display + humanist serif text; high-contrast display serif +
neutral grotesque; one superfamily (e.g. a serif/sans family pair) when consistency matters more
than contrast.

## Setting details

| Item | Value |
|---|---|
| Optimal tracking | 0 at text sizes; +2–5% for caps; −1–3% for display |
| Word spacing | 80–100% of the space character; justified text needs 85–95% |
| Paragraph spacing | 0.5–1× line-height, or first-line indent 1–2 em — not both |
| Hyphenation | Off for headings and UI; on with 3-line minimum for justified print body |
| Widows/orphans | No single-line paragraph endings; no single word on the last line of a paragraph |
| Rags | Justified for books/reports; ragged-right for screens, posters, UI |
| Numerals | Lining for tables/caps; old-style for running text where the face offers them |
| Punctuation | Real quotes “ ”, en dash for ranges, em dash for breaks, no double spaces |

## Fonts across media

- **Print**: embed or outline; check the licence allows embedding; 300 PPI raster for anything
  rasterized; avoid light weights below 8 pt on uncoated stock.
- **Web**: subset with `unicode-range`; use `font-display: swap`; declare 2–3 fallbacks with
  matching metrics; variable fonts can replace 2–4 static files.
- **Canvas / SVG export**: convert text to paths only when the receiver cannot install the font.
  Keep a text layer in the working file.
- **Licensing**: desktop licence ≠ web licence ≠ app embedding. Check before shipping.

## Quick diagnostics

| Symptom | Likely fix |
|---|---|
| Text feels cramped | Measure too long or leading too tight — fix leading first |
| Headline feels weak | Not enough size/weight contrast with the level below |
| Page looks noisy | Too many sizes/weights; merge levels |
| Text looks "off" at small size | Optical size / x-height mismatch; try a text-optimized cut |
| Justified text has rivers | Narrow measure; turn hyphenation on or set ragged right |
| Fonts look different on Windows/macOS | Different rasterizers; test both, avoid hairline weights |

## Rules

- [`20-typography-fundamentals`](../rules/20-typography-fundamentals.md) — the base system.
- [`23-type-pairing`](../rules/23-type-pairing.md) — pairing logic in full.
- [`24-typographic-hierarchy`](../rules/24-typographic-hierarchy.md) — levels and size steps.
- [`25-spacing-and-typesetting`](../rules/25-spacing-and-typesetting.md) — tracking, leading, breaks.
- [`26-type-scale-and-proportion`](../rules/26-type-scale-and-proportion.md) — scales and responsive type.
- [`27-readability-and-legibility`](../rules/27-readability-and-legibility.md) — reading performance.
- [`29-variable-and-digital-type`](../rules/29-variable-and-digital-type.md) — web and variable fonts.
