# Rule: Color Systems and Models

**Domain:** color · **ID:** `15-color-systems-and-models`

## Purpose
Pick, store, convert, and hand off color without surprises. The same color has different numbers in different spaces, and a palette that looks right on screen can fail at a press.

## Definition
A color model is a coordinate system for color: RGB (additive channels), CMYK (subtractive ink), HSL (hue, saturation, lightness), Lab (perceptual axes), OKLCH (perceptual lightness, chroma, hue). A color space adds a gamut, a white point, and a transfer curve — sRGB, Display P3, GRACoL. Equal numbers in two spaces are two different colors.

## Core Principles
- Hex is not a color; it is an sRGB coordinate in a string. #E4572E is exact in sRGB, approximate as Display P3, and undefined in CMYK.
- RGB is emitted light, CMYK is reflected ink, and their gamuts overlap only partly: vivid greens and violets exist in sRGB and cannot be printed in CMYK process.
- HSL is convenient, not perceptual. #0000FF and #FFFF00 both sit at 50% lightness in HSL, yet yellow is far lighter to the eye. Never build a value ramp in HSL.
- OKLCH is perceptual: equal L steps look equal. L runs 0–1, C 0–0.4 (sRGB rarely exceeds 0.32), H 0–360, and changing L alone leaves the hue in place.
- ΔE quantifies "close enough": ≤1 invisible, 2–3 visible side by side, ≥5 a different color.

## Techniques
1. **Design in OKLCH, deliver in hex.** Choose L, C, H, convert to sRGB, and where C falls outside the gamut, lower C until it fits — you lose saturation, not identity. Label the result "sRGB #E4572E".
2. **Ramp with fixed H.** Take L = 0.95, 0.85, 0.72, 0.58, 0.45, 0.33, 0.22, with C peaking mid-ramp at 0.14–0.18 for a warm hue and pulling back at both ends.
3. **Check the CMYK gamut before sign-off.** Convert with the printer's profile (GRACoL 2013 for US coated, FOGRA39 for European), list every color above ΔE 3, and substitute a press-safe neighbor.
4. **Specify spot twice.** A spot is a separate plate, not a process tint: it buys saturation and exact match at the cost of a plate. Pantone Solid Coated and Uncoated are different inks on different stocks, so give both numbers and mark any CMYK build as a fallback.

## When to Use
- Any palette that crosses screen and print.
- Building tints and ramps, where OKLCH gives equal-looking steps.

## When to Avoid
- A single canvas fill needs one hex value; a full Lab workflow adds nothing.
- Don't rate accessibility with HSL lightness — compute relative luminance (see 18).
- Don't specify a Pantone for short-run digital print; the press simulates the ink.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Treating hex as universal | The same value prints as a different red | Store space and value together |
| Building ramps in HSL | Mid-steps desaturate and the hue drifts | Ramp in OKLCH |
| Picking neon green on screen | Outside CMYK; prints as dull olive | Choose in-gamut or use a spot ink |
| One Pantone number for coated and uncoated | Color shifts lighter and duller on uncoated | Specify C and U separately |

## Practical Examples
A festival identity built in OKLCH at H 40 is delivered as #E4572E. Seven steps from L 0.95 to 0.25 convert to hex and then to GRACoL: the two most saturated steps land at ΔE 4–6, visible in a proof. Pull C down by 0.02 on those two and the ramp returns within ΔE 2. The program then specifies PANTONE 172 C coated and 172 U uncoated, with CMYK as fallback.

## Related Rules
- [`10-color-theory`](10-color-theory.md) — hue, value, and chroma, the vocabulary these models formalize.
- [`16-palette-construction`](16-palette-construction.md) — where OKLCH ramps become a working palette.
- [`18-color-accessibility`](18-color-accessibility.md) — contrast from luminance, not from HSL lightness.
- [`81-print-color-management`](81-print-color-management.md) — profiles, rich black, proofing, press checks.

## Sources
- Horstman, *Interacting with Color*, p. 69 — the color globe: hues at the equator, desaturated toward the white and black poles.
- Horstman, *Interacting with Color*, p. 57 — Albers on Munsell's and Ostwald's systems, and his objection that no system guarantees harmony.
- W3C, *CSS Color Module Level 4* — definitions of `lab()` and `oklch()`.
- ISO 12647-2, with GRACoL 2013 and FOGRA39 — the press conditions CMYK conversion is measured against.
