# Rule: Figure-Ground

**Domain:** foundations · **ID:** `09-figure-ground`

## Purpose
Guarantee that the subject separates from its background at first glance, and that the separation survives small sizes, poor light, and grayscale. A subject that merges with its ground is not seen at all.

## Definition
Figure-ground is the perceptual split between the object of attention (figure) and what lies behind it (ground). Separation is produced by value contrast at the boundary, edge sharpness, overlap, texture difference, and color temperature. Ambiguity happens when those cues are equal.

## Core Principles
- Value first. Aim for at least 30% lightness difference, or a 3:1 contrast ratio, at the shared edge; text needs 4.5:1.
- Silhouette is the test. Fill the figure solid `#000000` and view it at 64 px; if it is not identifiable, the shape is too complex or the separation too weak.
- Ambiguity is a tool, not an accident. Equal values, interlocking contours, and busy grounds force the eye to flip, so use them only when the flip is the message.
- Every depth cue is a separation cue: overlap beats shadow, blur beats glow, temperature beats outline.
- Text over imagery is figure-ground at its hardest. A busy ground destroys legibility even at high contrast.
- The ground is never neutral. Its value determines how every figure above it reads.

## Techniques
1. **Silhouette test** — duplicate the subject, fill `#000000`, scale to 64 px on `#FFFFFF`, and simplify the contour until it reads.
2. **Push the ground two steps** — darken or lighten the background by two value steps instead of adding a shadow or an outline to the subject.
3. **Depth stack** — overlap first, then blur the ground 2–4 px, then cool and desaturate it; stop as soon as separation reads.
4. **Plate the text** — behind type on a photo, add a `#000000` plate at 70–85% opacity or a gradient scrim; never an outline around the letters.
5. **Reversal check** — invert the composition (white figure on black) and re-read it; shapes that only work one way are fragile.

## When to Use
- Logo and mark design, where the mark must hold on any ground.
- Product cutouts on flat backgrounds.
- Poster subjects, especially single-object compositions.
- Text set over photography or texture.
- Icon sets that must survive at 16–24 px.

## When to Avoid
- Deliberate optical ambiguity in art and editorial illustration — but then the ambiguity must be readable as intent.
- Don't add drop shadows to fix separation when a value change is available; the shadow fixes nothing in grayscale.
- Don't outline type to force it off a busy image; the outline becomes the distracting figure.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| White subject on a 10% gray ground | About 1.1:1 at the edge; the shape dissolves at thumbnail | Darken the ground or add a rim light |
| Busy photo behind body text | Legibility collapses regardless of color | Plate or scrim at 70%+ |
| Glow used to separate | Reads as a halo and cheapens the mark | Value change or a clean plate |
| Subject and ground equal in grayscale | Disappears in print and for colorblind viewers | Check grayscale before color |

## Practical Examples
A 1080×1080 product tile. A white bottle on `#F4F4F2` gives roughly 1.1:1 and vanishes at 270 px. Move the ground to `#1B1B1E`, which is about 13:1 against the bottle, and add a 2 px `#3A3A40` rim on the shadow side so the silhouette does not merge with the cast shadow.

The label stays `#F4F4F2` and the shadow stays soft and directional. The ground change does the work; an outline would have flattened the product.

## Related Rules
- [`03-contrast-and-emphasis`](03-contrast-and-emphasis.md) — the contrast that creates the separation.
- [`08-negative-space`](08-negative-space.md) — space as the ground a figure needs.
- [`14-color-contrast`](14-color-contrast.md) — value and hue contrast in measurable terms.
- [`71-image-composition`](71-image-composition.md) — subject placement inside the frame.
- [`72-image-treatment`](72-image-treatment.md) — treatment that preserves separation.

## Sources
- Hofmann, *Graphic Design Manual*, p. 66 — dots of different sizes and tone values give rise to incorporation of the background or separation from it.
- Horstman, *Interacting with Color*, p. 30 — a single middle color can appear as either of its parents, so a field can reverse between figure and ground.
- Arnheim, *Art and Visual Perception*, "Figure and Ground" — when a shape reads as an object rather than as a hole.
