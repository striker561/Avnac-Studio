# Rule: Design Movements

**Domain:** history · **ID:** `100-design-movements`

## Purpose
Let the agent use a historical movement as a working design language — a set of constraints that
generates decisions — instead of a costume of recognizable marks glued onto a layout.

## Definition
A movement is a coherent constraint set shared by a group of designers in a period: palette, type,
geometry, composition, subject matter, and stance. Adopting it as a language means taking its
constraints and letting them decide the work. Pastiche copies its surface marks while obeying none
of the constraints.

## Core Principles
- Extract 4–6 constraints, not 4–6 motifs. "Diagonal axis, red/black, photographic fragments,
  agitational type" is a language; "hammer and sickle plus fake Cyrillic" is a costume.
- One movement per piece. Two historical languages produce a third, accidental one that reads as
  period confusion rather than wit.
- The message picks the movement: dissent, order, luxury, play, reduction. Content that argues should
  not be dressed in a style that decorates.
- Carry the era's rules forward, not its production limits. You have four-color process; use a
  Bauhaus triad because it is a discipline, not because a press once held two inks.

## Techniques
1. **Write the constraint card before designing** — palette (3–5 hex), type (families and weights),
   geometry (angles, shapes), grid, texture (none, grain, halftone), stance (one sentence). Design
   inside the card; if a choice contradicts it, change the card out loud.
2. **Three-layer sourcing** — one primary reference (the actual posters or books), one contemporary
   re-use that works, one deliberate break. The break is where the piece becomes yours.
3. **Motif budget** — at most two signature gestures per composition (one dominant diagonal plus one
   starburst). Three or more and it is a theme party.
4. **Copy the logic, avoid the souvenirs** — copy: constraints, stance, geometry, process. Avoid:
   textural nostalgia, invented founding dates, symbolic shorthand, "est. 1923".
5. **Simulate the process, not just the palette** — 1960s offset means two spot inks, visible
   halftone at 45–65 lpi, and 1–2 px misregistration. Reproduce the constraint, not a filter.

## When to Use
- The brief names an era, or the audience is design-literate enough to read the reference.
- When the content's stance matches a movement: protest → constructivism; clarity → Swiss.
- Identity work for cultural institutions, where the reference is the point.

## When to Avoid
- Safety-critical or utility interfaces. Period languages spend legibility and affordance.
- When the movement's politics would be endorsed by association — constructivist agitation selling a
  bank is an argument nobody approved.
- Regulated or trust-sensitive contexts: health, finance, government services.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Copying motifs without constraints | Nothing governs the next decision | Write the constraint card first |
| Mixing Memphis and Swiss | Each cancels the other's logic | One movement; one borrowed gesture at most |
| Modern polish on a period style | Gradients and glass erase the era | Simulate its process: halftone, offset, misregistration |
| Full fidelity in a live product | Unreadable at UI sizes; fails contrast | Keep the language, modernize contrast and targets |
| Naming the movement as the idea | Art history is not the message | Present the constraint card, not the lecture |

## Practical Examples
Brief: a 1970s jazz-night poster, 700×1000 px.

- Constraint card: `#F2E3C6` ground, `#1B1B1B` ink, `#C8452D` and `#2F5D50` accents; one heavy
  grotesque in caps plus one italic serif; circles and arcs only, no diagonals; 1.5% grain.
- Canvas `#F2E3C6`; three concentric `ellipse` rings centered (350, 300), 6 px strokes `#C8452D`.
- Headline 96 px caps, tracked +2%, at x=64 y=620 w=520; artist line 28 px italic serif beneath; a
  2 px rule at y=600 divides type from image; date 16 px/600 caps `#2F5D50` bottom-left.

## Related Rules
- [`101-bauhaus`](101-bauhaus.md) — geometry as a constraint set, not a look.
- [`102-swiss-international-style`](102-swiss-international-style.md) — the grid taken to a full system.
- [`110-retro-and-vintage-design`](110-retro-and-vintage-design.md) — the era-accuracy problem this rule generalizes.

## Sources
- Heller & Chwast, *Graphic Style: From Victorian to Post-Modern* — the movement-by-movement visual taxonomy this rule compresses.
- Müller-Brockmann, *Grid Systems in Graphic Design*, "Grid and design philosophy" — a style argued as a system of constraints, not a surface.
- Glaser & Ilić, *The Design of Dissent* — how a movement's stance survives into new political work.
