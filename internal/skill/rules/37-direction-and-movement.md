# Rule: Direction and Movement

**Domain:** layout · **ID:** `37-direction-and-movement`

## Purpose
Control the order in which the eye travels through a design. Direction is not decoration: every
edge, every text line, every glance in a photograph is a vector, and the composition's reading
order is the sum of those vectors whether or not anyone intended it.

## Definition
A directional cue is any element that implies a vector: a line or edge, a gaze, a pointing gesture,
a text alignment and its rag, a value gradient, a repeated shape with a progression, or a crop that
cuts a moving subject at the frame edge. Implied motion is the inference of movement from a still
arrangement — an incomplete action, a trail, a lean, a repeated offset.

## Core Principles
- Vectors have weight, and they add. A strong diagonal beats a weak horizontal, so a page with a
  dominant diagonal and four horizontals reads as one diagonal — decide which vector wins.
- Gaze is the strongest vector available. A face looking right sends the eye right; if the
  headline is on the left, the composition is fighting its own strongest cue.
- Text lines are vectors. Left-aligned text fires left-to-right and snaps back on the return;
  justified text forms a hard block with a weak internal vector; centred text has no vector at all,
  which is why a fully centred page stalls.
- Implied motion needs something missing: a subject entering the frame, a crop at the leading edge,
  a trail that ends before the object does.
- The reading path should be three or four stops. More than four and the eye picks the loudest
  element and stops there, which is rarely the one you chose.

## Techniques
1. **Annotate the vectors** — on a copy of the design, draw an arrow for every cue that carries
   direction, including the rag of each text block. Where arrows cross, decide which one owns the
   focal point; usually the one attached to the largest mass wins.
2. **Gaze-linked layout** — subject at the left third looking right, headline inside the gaze cone
   in the right 55% of the canvas, no competing figure behind the subject's sightline.
3. **Step the baseline** — offset successive text blocks horizontally by 24–48 px each so the eye
   descends in a staircase. Three steps read as a path; five read as misalignment.
4. **Crop at the leading edge** — cut a moving subject so 20–25% of it exits the frame in its
   direction of travel. The missing portion is what the eye completes as motion.
5. **Progression by repetition** — 5–12 repeats of one element, each rotated 2–4° further or
   scaled 4–6% larger. Below that threshold the repeats read as a static pattern; above it they
   read as a fan.

## When to Use
- Posters, covers, and social work where the reader gets 0.3–1 s and the reading order must be
  decided for them.
- When taking a photograph into a layout: the subject's direction of travel or gaze should point at
  the information, not out of the frame.
- Sequential pieces — a folded brochure, a carousel, a scroll — where each panel must hand the eye
  to the next.

## When to Avoid
- Data display and interfaces: arrows, gradients, and diagonals imply causality and forward motion
  that the content does not support. Use alignment instead.
- Calm, formal, or memorial material where a strong vector contradicts the tone.
- Do not add an arrow to fix a layout whose hierarchy is wrong. If the reader needs a drawn arrow
  to find the headline, the problem is scale or contrast.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Subject looking out of the frame | The eye exits the design at the edge | Flip the image or move the headline into the sightline |
| Two diagonals crossing at the focal point | Creates an X that cancels both directions | Keep one diagonal, make the other a horizontal |
| Motion blur on a static subject | Reads as a camera error | Blur the background instead, or crop at the leading edge |
| A staircase of five or more steps | Reads as an alignment mistake | Cap at three steps, then break the pattern |
| Centred text used for a call to action | No vector, so nothing moves the reader down | Left-align to the page's held edge |

## Practical Examples
A 1080×1080 tile for a running club, ground `#F4F1E8`:

- Runner positioned x 120–520, mid-stride, cropped at the left edge so the trailing foot exits the
  frame — motion inferred from the missing part.
- Three chevrons at 24 px stroke, `#E4572E`, at x 620, 700, 780, each rotated 4° more than the last
  and 6% larger, forming a soft arc from the runner's direction of travel to the right edge.
- Headline "TUESDAY 6AM" at 92 px, `#141414`, left-aligned at x 600, y 700, three lines at 0.9.
- Route line as a 4 px `#141414` path from (600, 300) stepping right 24 px per 60 px of descent
  into the headline's first line.

The eye goes: runner → chevrons → headline → route line back to the start. Three stops, one
dominant vector (left to right), no crossing arrows.

## Related Rules
- [`05-rhythm-and-repetition`](05-rhythm-and-repetition.md) — repeated intervals as the mechanism behind progression and motion.
- [`34-composition-techniques`](34-composition-techniques.md) — the thumbnail stage where the reading path is chosen.
- [`35-perspective-and-depth`](35-perspective-and-depth.md) — convergence as a directional system that must agree with the horizon.
- [`41-visual-perception`](41-visual-perception.md) — how saccades and peripheral vision actually sample the path you build.
- [`71-image-composition`](71-image-composition.md) — placing a photograph so its internal vectors serve the layout.

## Sources
- Hofmann, *Graphic Design Manual*, the line studies on "paths of motion" and the railway poster in which graded line thickness produces the impression of extreme acceleration.
- Hofmann, *Graphic Design Manual*, the traffic-poster study where a progressively graded line evokes movement against a regular horizontal pattern.
- Arnheim, *Art and Visual Perception* — directed tension and the perception of implied motion in static images.
