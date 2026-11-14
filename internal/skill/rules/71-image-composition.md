# Rule: Image Composition

**Domain:** imagery · **ID:** `71-image-composition`

## Purpose
Place a photograph so it does layout work: it directs the eye, reserves the ground the type stands on, and
lets the frame edge cut with intent. A good photograph dropped in at the wrong scale is a bad photograph as
far as the reader is concerned.

## Definition
Image composition is the set of decisions about crop, scale, and position made against three references: the
grid, the text block, and the page edges. The photograph is never composed by itself.

## Core Principles
- Leave look-space. A face looking sideways needs 1.5–2× its width of empty space ahead of the gaze; a
  subject looking into the gutter pulls the eye off the page.
- Keep one dominant image: hero at 60% or more of canvas height, supporting images at 30% or less. Two
  equally weighted images cancel each other.
- Crop at mid-limb, not at joints — mid-forearm, mid-thigh, above the elbow. Never through wrists, neck, or
  ankles; the eye reads that cut as injury.
- Put the horizon at a third or on a grid line, never through a head, and never dead center unless symmetry
  is the argument.
- Reserve copy space before committing to the crop: 25–40% of the image area quiet enough to carry 4.5:1 text
  at the planned size.

## Techniques
1. **Full-bleed placement** — size the image to trim plus bleed (A4 becomes 216×303 mm) and anchor the subject
   on a third; overscan 3 mm so the crop never lands on an important edge.
2. **Scale jump** — place the same subject twice, at 100% and 12% of canvas width, for depth and a second
   reading without a second photograph.
3. **Align to something** — put the headline baseline on the horizon or eye line, and the image edge on a
   column edge. Centering by default makes every other alignment look accidental.
4. **Scale, never stretch** — resize proportionally and crop the remainder; a 4% non-uniform stretch is
   invisible on a wall and obvious on a face.
5. **Quiet-zone check** — view the placement in grayscale under a 5% black overlay; a type zone with visible
   texture needs a scrim or another crop, not a heavier weight.

## When to Use
- Every layout holding a photograph larger than 30% of the canvas.
- Series work, where one placement logic has to repeat across pages or formats.
- When type and image compete and the fix is not a smaller font.

## When to Avoid
- Documentary framing where the photograph's own composition is the content; change the layout, not the crop.
- Catalogue grids of equal images, where equal scale is the point — see
  [`30-grid-systems`](30-grid-systems.md) for how that exception is built.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Subject facing out of the page | The eye exits at the trim | Mirror the image or add space ahead of the gaze |
| Image dropped in centered | All other alignments look arbitrary | Align the edge to a column, offset the subject |
| Crop through wrists and neck | Reads as amputation | Crop mid-limb or above the joint |
| Two images at equal weight | Neither becomes the entry point | One at 60%+, one at 30%− |

## Practical Examples
A 1080×1350 px poster runs the image full width from y=0 to y=760, overscanned 20 px on every side. The eye
line sits at y=380 and the horizon at y=505, a third of the image height. The headline, 96 px Inter Bold in
`#111111`, starts at y=560 on the calm shoulder below the horizon, and 34% of the left image area stays empty
because the subject looks right. At 25% zoom the gaze leads from the left third into the headline.

## Related Rules
- [`38-cropping-and-framing`](38-cropping-and-framing.md) — aspect ratios and crop logic for images alone.
- [`08-negative-space`](08-negative-space.md) — why the empty 34% is doing work, not wasting paper.
- [`37-direction-and-movement`](37-direction-and-movement.md) — gaze and vectors as directional cues.
- [`34-composition-techniques`](34-composition-techniques.md) — thirds, diagonals, and focal points at layout scale.
- [`30-grid-systems`](30-grid-systems.md) — the columns an image edge should land on.

## Sources
- Müller-Brockmann, *Grid Systems in Graphic Design*, "The grid and the image" — image proportions come from the grid's fields.
- Hofmann, *Graphic Design Manual*, "Figure and ground" — surrounding space decides how a form reads.
