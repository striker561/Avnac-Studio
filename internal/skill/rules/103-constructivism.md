# Rule: Constructivism

**Domain:** history · **ID:** `103-constructivism`

## Purpose
Build a composition that argues: one aggressive axis, montaged evidence, type as mass — the visual
grammar of the Soviet avant-garde, usable wherever a message needs pressure behind it.

## Definition
Constructivism as a design language (c.1915–1933) makes a dominant diagonal the organizing axis,
collides photographic fragments with flat color planes and typographic blocks, restricts the palette
to red, black, and off-white, and treats the poster as an instrument rather than an object.

## Core Principles
- The diagonal is the engine: one dominant axis at 30–45°, with everything else either answering it
  or standing at exactly 90° to it.
- Montage over illustration. Photographs, flat planes, and type collide at hard edges; feathered masks
  and soft shadows dissolve the argument.
- Two-color discipline: red is the call, black is the structure, off-white is the field. A fourth tone
  arrives only as a duotone photograph.
- Type is a mass, not a caption — condensed caps at 120–200 px, sometimes rotated 90°, set as a block.
- The surface must feel unfinished and urgent: cropped forms, arrows, numerals, an edge that runs off
  the page.

## Techniques
1. **Set the axis before placing anything** — draw one diagonal corner to corner; each element sits on
   it or perpendicular to it. In Avnac, rotate a `group` to −32° and set type on that baseline.
2. **Lock the palette** — `#D7261E`, `#111111`, `#F2EDE4`. No blue, no gradient, no tint of the red;
   a tint turns an argument into a mood.
3. **Montage in three planes** — background (flat field or coarse halftone photo), middle (a cut
   figure at 0 px feather), front (type, a rule, a numeral). Clip `image` to a rectangle; never use a
   soft-edged mask.
4. **Scale jump of 8:1** — headline 200 px against body 25 px. At that ratio the body becomes texture,
   which is both the period effect and why the message survives at distance.
5. **Copy the rhetoric, avoid the USSR** — copy: diagonal axis, montage, red/black, condensed caps,
   numerals as graphics. Avoid: fake Cyrillic, hammer and sickle, sepia "aged paper", stencil borders,
   quotations you cannot attribute.

## When to Use
- Campaign and protest work, music and event posters that need energy, covers about power and money.
- When the message is an imperative and the audience only has to be moved, not informed.

## When to Avoid
- Quiet or luxury positioning; this language shouts by construction.
- Health, finance, and public services, where revolutionary iconography reads as a warning.
- Long-form reading: condensed or rotated type at these sizes is display, not text.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Three competing diagonals | Energy becomes noise; no reading path | One dominant axis, others at 90° |
| Rotated body copy | Unreadable below 24 px | Rotate display type only |
| Sepia and grain "to look old" | The period was high-contrast, not brown | Coarse halftone instead |
| Red across 40% of the canvas | Red stops meaning "act" | Keep red under 10% |
| Soft-masked photographic cutouts | Montage needs hard edges | 0 px feather, clipped rectangles |

## Practical Examples
A 1080×1350 transit-strike poster:

- Field `#F2EDE4`; red `rect` 1080×90 at y=1240; black `rect` 26×1350 at x=1010.
- Photograph 560×760 at x=64 y=420, duotone `#111111`/`#F2EDE4`, hard rectangle, tilted −3°.
- Headline 150 px condensed caps `#111111`, leading 0.88, tracked −3%, three lines from y=96.
- "01" at 240 px `#D7261E`, x=680 y=1060 — the numeral marks the diagonal the eye already takes.
- Caption 15 px caps, +10% tracking, at y=1280, so the red band and the caption share one baseline.

## Related Rules
- [`100-design-movements`](100-design-movements.md) — the method for using any movement as constraints.
- [`37-direction-and-movement`](37-direction-and-movement.md) — how a diagonal controls reading order.
- [`72-image-treatment`](72-image-treatment.md) — duotone and halftone that read as period process.
- [`76-visual-metaphors-and-symbolism`](76-visual-metaphors-and-symbolism.md) — keeping the metaphor from becoming a cliché.

## Sources
- Glaser & Ilić, *The Design of Dissent*, p. 82 — two posters reduced to one image and one imperative; the "Bloody Red" Pantone chip doing the argument alone.
- Glaser & Ilić, *The Design of Dissent*, p. 128 — the Silence = Death triangle covered with camouflage: appropriation aimed at a specific target.
- Glaser & Ilić, *The Design of Dissent*, p. 150 — "Employ Molotov": a single object, a single verb, no second idea.
