# Rule: Composition Techniques

**Domain:** layout · **ID:** `34-composition-techniques`

## Purpose
Get from a blank canvas to a defensible arrangement quickly, then refine it with named devices
instead of nudging. Composition is the decision about what the frame contains and where the weight
sits — everything after that is production.

## Definition
Composition is the arrangement of masses, intervals, and vectors within a frame such that
attention lands in a chosen order. A technique is a named, repeatable arrangement — thirds,
diagonal, frame-within-frame, layering, near-alignment — that can be judged against a purpose
rather than a mood.

## Core Principles
- Compose the whole frame at once. If you can move one element without consequence, the frame is
  not composed; it is a list.
- One focal point, at 1.5–3× the visual weight of the runner-up. Two elements at 1:1.1 have no
  focal point, only an argument the reader has to settle.
- Placement beats precision. An element at the 0.618 point reads as intentional; an element 4 px
  off centre reads as a slip. Choose off-centre or on-centre, never near-centre.
- Diagonals raise energy and shorten the path the eye travels: 15–45° from horizontal. A 45°
  diagonal divides the frame into two triangles, and the eye treats one as figure and one as
  ground.
- Tension lives in near-alignment. Elements 6–24 px from an edge, or 6–12 px from touching, are
  more active than either perfect alignment or obvious separation.

## Techniques
1. **Ten thumbnails at 120×160** — ten distinct mass distributions in ten minutes: centred,
   top-heavy, corner, diagonal, horizon-split, radial, grid, off-edge, small-in-void,
   full-bleed. Pick two, render both at full size, keep the one that survives at 25% zoom.
2. **Three-value block-in** — before any detail, block the frame into three values (roughly 10%,
   50%, 90% grey). If the block-in does not read as a composition, no amount of type will fix it.
3. **Diagonal placement** — put the second-most-important element on a line running 30–40° from
   the focal point, so the eye has somewhere to go after it lands.
4. **Frame within a frame** — an inset `rect` or an image edge 40–80 px inside the canvas creates
   a second frame; the gap reads as depth and as emphasis at once.
5. **Layer three planes** — background field, mid subject, foreground element, with the foreground
   overlapping the subject by 10–20% of its area. Overlap is the only depth cue that never
   misreads.

## When to Use
- At the thumbnail stage of every piece of work, before the grid, the type, or the color is chosen.
- When a layout is technically correct but feels inert — the usual cause is a missing focal point
  or every mass at the same value.
- When a design must survive being seen for 0.3 s at thumbnail size in a feed or a poster wall.

## When to Avoid
- Diagrams, charts, and tables: compositional devices distort comparison. Use the structural
  logic of the data instead.
- Dense reference pages where every item has equal status and the reader is searching, not
  looking — a focal point there misdirects attention.
- Do not apply thirds to a subject with its own strong geometry (a centred architectural facade, a
  circular logo). Cut the frame to the subject's geometry instead.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Two focal points at similar weight | The eye flickers and the message splits | Reduce the second by 50% in size or 30% in value |
| Centered composition with one element 4 px off | Reads as an error, not as tension | Go 0 px or 60+ px — never 4 |
| Diagonal used for its own sake | Energy with nothing to point at | Give the diagonal a job: connect focal point to CTA, or to the exit |
| Composition that only works at full size | Collapses to a grey rectangle at thumbnail | Test at 25% before refinement |
| Equal negative space on all sides | Subject floats, frame has no direction | Cut one margin to 40–50% of the opposite |

## Practical Examples
A 1080×1350 poster, three thumbnails, and the one that survived:

- Thumbnail A: headline centred at y 200, image centred below. Rejected — symmetric masses and no
  direction.
- Thumbnail B: subject in the left third (x 120–520), headline starting at x 600 and running to
  the right edge, cropped at 120 px type. Chosen — the subject's gaze runs right, into the type.
- Thumbnail C: full-bleed image, headline at 40 px over it. Rejected — the type competes with a
  busy field and the poster has no focal point above the photo.

The chosen version: canvas `#F1EDE4`, photograph occupying x 0–540, y 120–1350 with its subject's
eye at (200, 430) — left third intersection. Headline at 120 px Inter Bold, `#161616`, x 600, y
380, three lines at 0.9 line-height. Date line at 20 px, x 604, y 1160. The eye lands on the face,
travels right along the gaze, hits the headline, and drops to the date: three stops, no detour.

## Related Rules
- [`02-visual-hierarchy`](02-visual-hierarchy.md) — the ordering the focal point and the reading path must produce.
- [`04-balance-and-proportion`](04-balance-and-proportion.md) — mass and distribution, which the thumbnails are testing.
- [`05-rhythm-and-repetition`](05-rhythm-and-repetition.md) — intervals between masses, which decide whether a composition has a beat.
- [`35-perspective-and-depth`](35-perspective-and-depth.md) — the depth cues that turn flat overlap into space.
- [`37-direction-and-movement`](37-direction-and-movement.md) — vectors and gaze as the mechanism of a reading path.

## Sources
- Hofmann, *Graphic Design Manual*, "Composition study" and the dot–line confrontation exercises — arrangement is tested by contrast and grouping before any other element is added.
- Müller-Brockmann, *Grid Systems in Graphic Design*, "The typographic grid" — the tension in a page comes from unequal division, not from balancing every mass.
- Arnheim, *Art and Visual Perception* — visual weight, balance, and the conditions under which a frame reads as a directed whole rather than a collection.
