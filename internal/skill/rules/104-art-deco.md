# Rule: Art Deco

**Domain:** history · **ID:** `104-art-deco`

## Purpose
Make a piece read as expensive and of a period: repeated angular ornament, a central axis, metallic
accents, and tall display type — without sliding into Gatsby pastiche.

## Definition
Art Deco (c.1920–1939) builds decoration from repeated geometric motifs — fans, chevrons, sunbursts,
stepped ziggurat profiles, nested arcs — arranged on a strict central axis, in a small high-contrast
palette with one metallic accent, around tall condensed display lettering.

## Core Principles
- Geometry is ornamental and repeated: one motif at three scales on a fixed step carries the whole
  piece.
- The axis is vertical and central, or stepped-symmetric. This language is centripetal — everything
  points at the middle, which is the opposite of the Swiss axis.
- Luxury is contrast, not sheen: near-black against cream with one flat metallic.
- Type is tall, condensed, geometric, letterspaced in caps; a decorative inline or double rule is
  period-correct, a script swash is not.
- The frame contains the composition: border band, corner motifs, then a rule hierarchy inside.
- Three or four colors, and a wide value range from near-black to cream.

## Techniques

**Avnac ops:** `vector` op=draw constructs the symmetric ornament from primitives and mirrors; `vector` op=update refines the repeat; `elements` op=render sets the type; `get_canvas_image` at 400% checks the repeat.

1. **One motif, three scales** — draw a chevron or sunburst ray as a `path` on a 24 px module, repeat
   on 24 px steps, scale ×1, ×3, ×9. Group and duplicate along the step rather than redrawing by eye.
2. **Palette** — `#0E0E0E`, brass `#C9A227`, cream `#F3E9D2`, optional deep green `#1F3B34`. Brass
   stays a flat fill: no gradient, no bevel, no inner shadow.
3. **Framing system** — outer border 8 px, inner rule 2 px, corner motif 48×48; inset text from the
   frame by 1.5× the border width so the air matches the weight.
4. **Type pairing** — one tall condensed display face in caps at +6–10% tracking above 40 px, plus one
   text face at 14–18 px. A second decorative face doubles ornament and halves clarity.
5. **Copy the geometry, avoid the cliché** — copy: repeated angular motif, central axis, brass and
   cream, tall caps, framed field. Avoid: gold gradients, champagne bubbles, "Great Gatsby" script,
   Times with a swash sold as period type, 3D bevels, and metallic "shine" overlays.

## When to Use
- Hospitality, spirits, perfume, cinema and theatre, invitations, anything selling an occasion.
- Anniversary or heritage editions where the period itself is the message.

## When to Avoid
- Tech and utility interfaces; the ornament competes with state, data, and focus.
- Public-sector or value positioning, where the language reads as expense.
- Uncoated stock or low-dpi output — hairlines and foils need 0.5 pt and a process that holds it.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Gold gradients and bevels | Reads as a 2010s luxury template, not 1925 | Flat metallic color, one value |
| A sunburst behind every headline | The motif saturates into wallpaper | One motif site per composition |
| Asymmetric layout with deco ornament | The language is centripetal | Center the axis or drop the style |
| 0.25 pt hairlines | Vanishes on uncoated stock and at 72 dpi | 0.5 pt minimum, 1 pt for foil |
| Two decorative faces | Each brings its own geometry | One display, one text face |

## Practical Examples
A 1080×1350 invitation:

- Field `#0E0E0E`; cream `#F3E9D2` panel 880×1150 at x=100 y=100, 8 px border `#C9A227`.
- Sunburst: 24 `path` rays from (540, 300), 3 px `#C9A227` at 40% opacity, clipped to the panel top.
- "THE GILDED HOUR" 64 px condensed caps, +8% tracking, `#F3E9D2`, centered on y=560.
- Rule pair: 1 px `#C9A227` at y=650 and y=658, 240 px wide, centered — the double rule reads as
  period before any ornament does.
- Body 18 px serif `#E8DCC2`, centered, three lines; date 14 px caps +12% at y=1180.

## Verification
1. **Ops receipt.** `vector` op=read shows the ornament mirrored from one source, `get_canvas_image` at 400% shows no slipped repeat, and the palette is held to the stated metals. Deco built from two different corners is not symmetry.
2. **Motif census.** One motif, repeated at three scales on a 24 px step (×1, ×3, ×9). A second
   motif, or a repeat off the step, reads as wallpaper rather than ornament.
3. **Axis.** The frame centre, the rule pair and the headline share one vertical centre line: 0 px
   difference. An offset axis wearing deco ornament fails — the language is centripetal.
4. **Palette.** Four values — `#0E0E0E`, `#C9A227`, `#F3E9D2`, optional `#1F3B34` — with brass as a
   flat fill. One gradient stop, bevel or inner shadow on the metallic fails.
5. **Frame arithmetic.** Border 8 px, inner rule 2 px, corner motif 48×48, text inset 1.5× the
   border (12 px). Measure the inset; air that does not match the frame's weight looks borrowed.
6. **Hairline floor.** No painted hairline below 0.5 pt, and 1 pt for foil. `export` the plate and
   check the thinnest stroke against the output process.

## Related Rules
- [`100-design-movements`](100-design-movements.md) — using a period as constraints rather than as costume.
- [`04-balance-and-proportion`](04-balance-and-proportion.md) — symmetry and stepped balance on a center axis.
- [`64-texture-and-patterns`](64-texture-and-patterns.md) — building the repeatable motif unit.
- [`84-print-finishing-techniques`](84-print-finishing-techniques.md) — foil and emboss, where a metallic becomes physical.

## Sources
- Hillier, *Art Deco* — the motif vocabulary (fans, sunbursts, stepped profiles) and its sources.
- Heller & Chwast, *Graphic Style: From Victorian to Post-Modern* — Art Deco as a graphic, not only architectural, language.
- *Graphic Artists Guild Handbook* — foil stamping and embossing constraints that decide whether a 0.5 pt rule survives production.
