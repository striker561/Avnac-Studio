# Rule: Variable and Digital Type

**Domain:** typography · **ID:** `29-variable-and-digital-type`

## Purpose
Make the type that renders be the type you specified. Variable fonts and web delivery introduce
three failure modes an agent cannot see on its own canvas — silent axis substitution, fallback
line-break shifts, and platform rendering differences — and each one changes a finished design.

## Definition
A variable font is one file that interpolates continuously along named axes: `wght` (100–900),
`wdth` (75–125), `opsz` (optical size, 6–144), `slnt`, `ital`, and sometimes `GRAD` or `XOPQ`.
Digital type is that font after a rasterizer has interpreted it — with hinting, antialiasing, and
subpixel rendering that differ between operating systems and browsers.

## Core Principles
- Specify the instance, not the name. "Semibold" is a static-font label; a variable font needs
  `wght 600, opsz 96, wdth 100`. Name-only requests resolve to 400 and quietly change the design.
- An unsupported axis is ignored, not flagged. Asking for `wdth` on a font with only `wght` gives
  you the default width at your requested weight — a different typeface from the one you planned.
- `opsz` does the work optical sizing used to: at 12 px it thickens stems and loosens spacing; at
  96 px it thins hairlines and tightens sidebearings. Set it to the size you are actually using.
- Fallbacks change line breaks. Two families differing by 6% average character width shift a
  62-character line by about 4 characters, which is enough to orphan a word or break a headline.
- Rendering differs by platform. Grayscale antialiasing on macOS renders lighter; hinted
  DirectWrite on Windows renders heavier. A 300 weight at 14 px can read as 200 on one and 400 on
  the other, and light-on-dark blooming adds roughly one weight step on top of that.

## Techniques
1. **Write the instance into the spec** — for every text element, record family, `wght`, `wdth`,
   `opsz`, tracking, and color. In CSS: `font-variation-settings: "wght" 620, "opsz" 32`. In an
   Avnac text element, pin the numeric weight in the layer name so it survives handoff.
2. **Build a metric-matched fallback** — choose a fallback of the same classification and similar
   x-height, then correct with `size-adjust: 96%–104%` and `ascent-override`. Never fall back from
   a grotesk to a Didone; metric overrides cannot fake skeleton.
3. **Load the subset, preloaded, with swap** — one woff2, Latin basic, 25–40 KB, `font-display:
   swap`, `<link rel="preload">`. A 900 KB family loaded for one 72 px headline delays the
   headline, which is the only thing on the page.
4. **Grade instead of weighting for dark UI** — on `#0B0B0B`, white text blooms and looks one step
   heavier; drop `wght` by 20–30 or use a `GRAD` axis of −25 at the same measured weight. Invert
   the adjustment on light grounds.
5. **Check three renders at final size** — export at 100% and compare Windows/Chrome,
   macOS/Safari, and one mobile browser. If the wrap points move, adjust measure by ±2 characters
   rather than editing the copy.

## When to Use
- Any screen output where the design will be implemented or viewed on more than one platform.
- Brand systems built on one variable family across weights and sizes — the whole point is fewer
  files and continuous control, so use the axes.
- Dark interfaces, dense dashboards, and long-form reading views, where rendering weight drift is
  most visible.

## When to Avoid
- Print-only work: flatten to static instances at export and verify the PDF embeds them; leaving
  live variable instances invites a RIP to pick a default.
- When the fallback is a different classification, or when the client's CMS cannot load webfonts —
  design with a system stack from the start instead of pretending the font will arrive.
- Pseudo-italic and faux-bold synthesis. If the family has no italic axis or cut, choose another
  family rather than let the browser slant it.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Requesting `font-weight: 550` from a static family | No 550 cut exists; the browser synthesizes or snaps to 500 | Use a variable font or the nearest real cut, declared |
| Loading all nine weights and both widths | 400 KB+ of unused glyph data delays first paint | Subset and load two instances, preload the one above the fold |
| Trusting one browser screenshot | Wrap points and stem weight differ by platform | Compare three renders at final size before signoff |
| Leaving `opsz` at default | 12 px text gets display spacing and looks anemic | Set `opsz` to the rendered size, or use a text cut |
| Mixing a metric override with a mismatched family | Lines reflow at the moment the font swaps | Match the fallback classification before tuning `size-adjust` |

## Practical Examples
A 1440×1024 dark app header, Inter Variable, ground `#0E0E10`:

- Title "Revenue" — 32 px, `wght 620`, `opsz 32`, tracking −1%, `#F4F4F5`.
- Metric "€48,210" — 44 px, `wght 560`, `opsz 44`, tabular figures on, `#F4F4F5`.
- Body "vs. previous 30 days" — 15 px, `wght 400`, `opsz 15`, `#A1A1AA` (4.6:1 on the ground).
- Column labels — 11 px, `wght 560`, `opsz 11`, +5% tracking, `#71717A`.

On a light ground the same design needs `wght 600` for the title and `wght 380` for body, because
dark-on-light renders thinner; write both instances into the theme file rather than one weight and
a hope.

## Related Rules
- [`20-typography-fundamentals`](20-typography-fundamentals.md) — the size, weight, measure, and leading system these instances plug into.
- [`26-type-scale-and-proportion`](26-type-scale-and-proportion.md) — optical sizing as part of the scale, not an afterthought.
- [`27-readability-and-legibility`](27-readability-and-legibility.md) — the rendering weight drift that decides whether small text is readable.
- [`55-brand-color-and-typography`](55-brand-color-and-typography.md) — licensing and system defaults when the brand font is variable or webfont-only.
- [`95-responsive-interface-design`](95-responsive-interface-design.md) — fluid type across breakpoints, which depends on the loading strategy here.

## Sources
- Cheng, *Designing Type*, "Variables in type design" — weight, width, and optical size are continuous properties of a design, not separate products.
- W3C, *CSS Fonts Module Level 4* — `font-variation-settings`, `font-optical-sizing`, and the `size-adjust`/`ascent-override` descriptors for fallback metric matching.
- Microsoft, DirectWrite rendering documentation, and Apple platform typography guidance — hinting and antialiasing policies differ by platform, so identical CSS does not render identically.
