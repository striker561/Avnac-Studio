# Rule: Shapes and Forms

**Domain:** illustration · **ID:** `61-shapes-and-forms`

## Purpose
Choose the primitive forms a piece is built from and constrain them to a family, so the work reads as designed
rather than assembled. This rule fixes the vocabulary before anything is drawn with it.

## Definition
A form family is the closed set of shapes a piece may use, defined by construction, proportion, corner treatment,
orientation, and fill behavior. A form is a primitive after the family's rules have been applied to it.

## Core Principles
- Three primitives carry most meaning: circle (unity, focus, softness), square (stability, order, containment),
  triangle (direction, tension, warning). Personality is read from the mix before any content is.
- The first fork is geometric versus organic, chosen once per piece. Geometric derives from circles, lines, and
  measurable radii; organic from growth, with continuous but irregular curvature. Choosing per element looks
  accidental.
- Form is relational: in Hofmann's confrontation studies a dot isolated in a large field fails to read as a
  partner to a square, while enlarged or in contact the pair produces contrast and residual forms.
- Corner radius is the cheapest personality setting: 0 px reads technical, 4–8 px precise, 16–24 px friendly, 50%
  of the short side reads playful or generic-app.
- Pick one proportion ratio (1:1, 4:5, 2:3, 3:2) for every rectangle, so a square module and a wide one are
  obviously the same family.
- Five to seven shapes is a vocabulary. Twenty is a scrapbook.

## Techniques
1. **Construction rule** — state how one shape is made ("every arc is a 90° segment of a circle whose radius is
   0.25× the shape's height") and apply it everywhere.
2. **Radius scale** — allow only 0 / 4 / 16 / 999 px in the file. A radius off the scale is a mistake, not a
   variation.
3. **Confrontation test** — place the two most-used forms side by side at real size, black on white. If they
   produce neither contrast nor a readable overlap, change scale before changing shape.
4. **Silhouette reduction** — fill every form black and view at 5% zoom. Shapes that merge into one blob need
   separating by scale or gap, not by color.
5. **Grid-derived placement** — derive positions from a 12-column grid or a 24 px module so forms sit in a
   measurable relationship.

## When to Use
- Abstract concepts (data, process, relationship) where no literal object exists to draw.
- Icon and diagram systems that must stay consistent across 20 or more items.
- A geometric identity lineage (Bauhaus, Constructivism) where illustration must answer to the same geometry.

## When to Avoid
- Depicting something with a known real silhouette — a dog, a hand, a bottle. The primitive must serve the
  silhouette, not the family.
- When the piece needs material truth; forms alone read as a diagram.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Mixing geometric and organic per element | Reads as clip-art assembly | Fix the mode once for the piece |
| Radii at 6, 7, 9, 11 px | Invisible inconsistency, visible sloppiness | Restrict to a four-step scale |
| Fifteen shapes in one illustration | No shape becomes memorable | Cut to five to seven and repeat them |
| No overlap rule | Forms sit on top of a space, not in it | Decide: solid occlusion, or multiply at 20% |

## Practical Examples
A 1200×1200 canvas on a 24 px module: four `ellipse` elements at r=96, centers on grid intersections (x 240/480/
720/960, y 360/600), filled `#12100E` at 100/70/45/25% — a value ramp, not four colors. One `rect` 720×480 at
(240, 600), radius 0, filled `#E8B54B`, with the circles subtracted from it so they read as in front. Every
radius in the file is 0 or 999 px.

## Related Rules
- [`60-illustration-fundamentals`](60-illustration-fundamentals.md) — the set-level decisions these forms serve.
- [`62-linework-and-contours`](62-linework-and-contours.md) — how the edges of these forms get described.
- [`64-texture-and-patterns`](64-texture-and-patterns.md) — repeating forms into surfaces.
- [`101-bauhaus`](101-bauhaus.md) — the historical grammar of primitive geometry.
- [`68-iconography`](68-iconography.md) — the small-size discipline for a shape vocabulary.

## Sources
- Hofmann, *Graphic Design Manual*, p. 130 — an isolated dot and square do not read as a contrasting pair;
  enlarged or overlapping, they produce confrontation and residual forms.
- Hofmann, *Graphic Design Manual*, p. 132 — combining basic elements and segments produces the contrasts that
  confront one another in the composition.
