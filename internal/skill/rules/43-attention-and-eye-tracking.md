# Rule: Attention and Eye Tracking

**Domain:** psychology · **ID:** `43-attention-and-eye-tracking`

## Purpose
Predicts where the first three fixations land and why, so the loudest thing in a layout is also the most important thing. It also names the failure where loudness and meaning disagree.

## Definition
Attention is a selection process. The eye lands on whichever element is locally most salient, then on the next most salient, for the first one to two seconds. Salience comes from luminance contrast, color contrast, size, motion or implied motion, and meaning (faces, text, arrows, hazard). It is relative to the field: an element is loud only compared with its neighbors.

## Core Principles
- One focal point per view. Three equally loud elements do not produce a rich layout; they produce an arbitrary scan order.
- Salience is a fixed budget. Raising one element's contrast lowers every other element's in practice, because the comparison is local.
- Faces are privileged: a visible face is fixated within about 200 ms, and viewers follow its gaze. A subject looking left sends attention left.
- Motion outranks static contrast in the periphery; in static work implied motion does the same job — blur, streak, diagonal, graded repeat. Hofmann's movement exercises are built on this.
- False hierarchy is the usual failure: a saturated badge, a red dot, a stock photo that pulls the eye and means nothing. Attention without a job costs a fixation it never repays.

## Techniques
1. **Grayscale audit** — desaturate the layout and rank elements by value contrast. The top three should be exactly your three intended levels, in order.
2. **Zone map** — divide the canvas into thirds; at most one third may hold the loudest element, and the middle third should not be the emptiest.
3. **Gaze direction** — crop a person so their gaze points into the headline. If it points off-canvas, the viewer follows it off-canvas.
4. **Demote instead of decorate** — to raise a headline, drop everything else 20–30% in value rather than adding a glow, shadow, or outline.
5. **Cap saturated color** — one hue at full strength, secondary hues at 60% chroma or less, and pure `#FF0000` reserved for real errors.

## When to Use
- Hero screens, covers, posters, thumbnails: anywhere the design gets under two seconds.
- Diagnosing a layout where "my eye keeps going to the wrong place".
- Auditing a finished page for accidental salience before adding anything new.

## When to Avoid
- Scanning tasks where many items must be equally findable — a contact sheet, a product grid, a legend.
- Formal documents where a loud element would misrepresent the emphasis of the content.
- Never manufacture salience for a message the design cannot support; attention you cannot answer is worse than none.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Hero image brighter than the headline | First fixation lands on decoration | Drop the image 15–20% in value |
| Red dot used decoratively | Reads as an alert and eats the first fixation | Reserve alert color for alerts |
| Subject looking off-canvas | Attention follows the gaze out of frame | Crop or flip so the gaze points inward |
| Three CTAs in one viewport | Scan order becomes arbitrary | One filled primary, two quiet links |

## Practical Examples
A 1920×1080 hero: portrait cropped so the face sits in the upper third on the right, eyes at y≈300, gaze pointing left into a 64 px headline at x=120, y=280. One `#FF5A1F` button 220×56 sits 40 px under the headline; everything else is neutral `#F5F5F4` and `#1C1917`. Grayscale check: face, headline, button are the three strongest values, in that order — acceptable because the gaze delivers the eye to the headline and the button is the only chroma in the frame.

## Related Rules
- [`41-visual-perception`](41-visual-perception.md) — how the fixation forms and where it can resolve detail.
- [`02-visual-hierarchy`](02-visual-hierarchy.md) — salience is the mechanism; hierarchy is the intent.
- [`03-contrast-and-emphasis`](03-contrast-and-emphasis.md) — the value and color moves that create salience.
- [`37-direction-and-movement`](37-direction-and-movement.md) — gaze, vectors and implied motion as attention routing.
- [`70-photography-and-imagery`](70-photography-and-imagery.md) — choosing images whose gaze does work.

## Sources
- Yarbus, *Eye Movements and Vision* (1967) — scan paths change with the viewer's task, not just the image.
- Tufte, *The Visual Display of Quantitative Information*, p. 172 — designing for perception with minimal eye movement.
- Hofmann, *Graphic Design Manual*, the movement exercises — graded lines and repeated strokes as implied motion.
