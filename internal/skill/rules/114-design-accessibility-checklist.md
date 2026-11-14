# Rule: Design Accessibility Checklist

**Domain:** ui · **ID:** `114-design-accessibility-checklist`

## Purpose
Hold every deliverable to one accessibility gate that works on paper and on pixels: a poster read at 3 m,
a leaflet held at 40 cm, a page read on a phone in daylight. The gate is short, ordered and pass/fail, so
inaccessible work is caught before it reaches a printer or a release.

## Definition
An ordered set of observable checks applied at final size in the final medium, where each check has a
threshold and a verdict. The medium decides which checks apply — print has no focus ring, screens have no
substrate — but the thresholds are not renegotiated per project.

## Core Principles
- Contrast is universal: 4.5:1 for body text, 3:1 for large text (≥24 px, or ≥19 px bold) and for UI
  boundaries, meaningful icons and focus rings. Print does not exempt you; aim for ΔL* ≥ 40 between text
  and its ground.
- Size floors by medium: 16 px screen body, 12 pt print body (14 pt for forms and older readers), 7 pt
  absolute floor for continuous text. Nothing worth saying needed 6 pt.
- Distance sets the display floor: a line that must be read at distance gets cap height of roughly
  distance ÷ 120 — 25 mm at 3 m, 80 mm at 10 m. Secondary lines at half that.
- Color is never the only channel. Pair every state, category, error and required field with a word, a
  shape or a position; about 1 in 12 men and 1 in 200 women have a color vision deficiency.
- Motion: nothing flashes more than 3 times per second, anything auto-playing past 5 s gets pause and
  stop, and `prefers-reduced-motion` is honored.
- Every image carrying information needs a text alternative — alt text on screen, a caption in print, a
  plain-text schedule alongside a poster.

## Techniques
1. **Contrast pass with named pairs** — list every text/background pair and its ratio. `#767676` on white
   is 4.54:1; `#949494` is 2.9:1 and fails; brand orange on white rarely passes. Fix the pair, not the
   whole palette.
2. **Grayscale and squint** — desaturate, view at 25%, confirm the reading order survives. Anything that
   vanishes was hue-dependent. On paper, print a grayscale laser proof before the contract proof.
3. **Print legibility proof** — print at 100% on the actual stock and hold it at the intended distance.
   Reversed type on uncoated stock fills in below 8 pt, and four-color small type misregisters.
4. **Text-alternative inventory** — one row per information-bearing image. On a poster, title, date,
   venue, price and access information must exist as real text in the delivery, not only inside artwork.
5. **Simulate the deficiency** — run deuteranopia and protanopia simulation over any chart, map or state
   legend before it ships. If two categories merge, change one of them structurally.

## When to Use
- Before every delivery to print, press, app store or client review: it is the accessibility half of the
  quality gate.
- When the brief names ADA, Section 508, EN 301 549, public-sector procurement or "accessible" — 2.2 AA is
  the floor those clauses point at.
- When the audience or viewing distance is unknown: signage, transit, packaging, wayfinding.

## When to Avoid
- Don't apply 4.5:1 to a logo, a decorative panel, or atmospheric text over a photograph with no
  information in it.
- Don't force 16 px body onto a poster. Reading distance sets the floor, and 16 px at 3 m is invisible.
- Don't treat an overlay widget or a high-contrast toggle as the fix; the design itself has to pass.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| 14 px `#999999` in a slide footer | 2.85:1 before projection, worse after | `#767676` or darker, checked on the projector |
| Poster body at 10 pt for a 3 m read | ≈3.5 mm cap height, legible at 40 cm only | 18–24 pt, or cut words until it fits |
| Meaning carried by red and green alone | CVD readers and grayscale print lose it | Add icon, label, weight or position |
| 6 pt reverse on a four-color field | Ink fill-in closes the counters | One-color reverse at 8 pt or larger |
| Alt text "image of a chart" | Describes the medium, not the information | "Revenue up 18% in Q3; costs flat" |

## Practical Examples
Two deliverables from one campaign, gated the same day.

**A2 poster, 420×594 mm, read at 3 m.** Headline cap height 44 mm, date 18 mm, venue 12 mm, body 18 pt.
Title and date in `#F5F1E8` on `#121212` (≈16:1). The access line — "step-free entry, BSL interpreted
20:00 set" — is set as type rather than baked into an illustration, and repeated in the text version
sent with the file.

**390×844 phone screen.** Body 16 px `#1F1F1F` on `#FFFFFF`; secondary 14 px `#5C5C5C` (6.3:1); one `h1`;
focus 2 px `#1A5FB4` at 2 px offset; "Buy tickets" 48 px tall; the date field's error state carries an
icon, a message and a border, not color alone. Passes contrast, tab order, 200% zoom and 320 px reflow.

Verdict on the delivery note: 11 of 12 checks pass; the poster body sits at 14 pt because the curator cut
to that size — accepted by the client, with the venue address moved to the web listing at 16 px.

## Related Rules
- [`98-web-accessibility`](98-web-accessibility.md) — the full screen rule this gate extracts its screen checks from.
- [`18-color-accessibility`](18-color-accessibility.md) — contrast math and colorblind-safe palettes.
- [`27-readability-and-legibility`](27-readability-and-legibility.md) — measure, leading and the reading-distance physics behind the size floors.
- [`113-design-quality-checklist`](113-design-quality-checklist.md) — the wider pre-delivery gate this sits inside.
- [`115-export-and-file-formats`](115-export-and-file-formats.md) — alt text and metadata that must survive the export.

## Sources
- W3C, *Web Content Accessibility Guidelines 2.2*, SC 1.4.3, 1.4.11, 2.4.11, 2.5.8 — the thresholds used
  in checks 1 and 5.
- RNIB, *Clear Print Guidelines* — 12 pt minimum for continuous text, and the advice against small
  reversed-out type.
- US Access Board, *ADA Standards for Accessible Design*, §703.5.5 — 16 mm (5/8 in.) minimum cap height
  for characters on signs, scaled to mounting height.
