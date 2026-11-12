# Rule: Light and Shadow

**Domain:** illustration · **ID:** `63-light-and-shadow`

## Purpose
Fix light at the start, not the end: give every form in a piece the same light so a set looks like one world and
depth reads without outlines.

## Definition
A lighting model is four decisions held constant: direction (azimuth), elevation, hardness (hard or soft
terminator), and the number of tone steps used on a surface.

## Core Principles
- Fix direction before drawing. Top-left at 45° is the default because reading order assumes it. Never flip it
  inside a set; a mirrored shadow is the fastest sign of a pasted asset.
- Two shadow types, both required: form shadow (surface turning away from light) and cast shadow (its effect on
  ground or neighbor). Form shadow alone leaves the object floating.
- Tone count follows style: 3 steps for flat and cel work, 5 for soft shading, 7 or more for realism. More steps
  than the line weight supports looks muddy; fewer than 3 reads as a flat-fill error.
- Cel shading needs a decisive terminator. Put the boundary on a form edge or a deliberate crease, never mid-curve
  at random.
- Value is relational: Hofmann's cube studies show incident light producing different tone values per face, and
  the same cube reading differently on black and white grounds.
- Atmospheric depth: contrast falls and hue shifts toward the background temperature with distance. Two planes
  suffice in flat vector work: foreground at full contrast, background at 60%.
- Shadow is not black: use a darker, cooler, more saturated version of the base at 20–40% multiply.

## Techniques
1. **Lighting brief in one line** — "key top-left, 45° elevation, hard terminator, 3 tones, cool shadow", written
   at the top of the file and repeated in the style sheet.
2. **Three-tone pass** — draw only base, shadow, and highlight, with no line. If the form fails in three tones,
   rendering will not save it.
3. **Cast shadow offset** — for a 45° key, offset by 0.5–1× the object's height opposite the light and squash the
   vertical to 50–70% so it sits on the ground.
4. **Shadow recipe** — shadow = base at 70% value, +8° toward blue; highlight = base at 120% value, −10 chroma.
   Sample once, reuse everywhere, then sweep for direction.

## When to Use
- Any illustration with more than one object, or a set that must read as one world.
- Flat vector work that needs depth without gradients or a full rendering pass.
- When a drawing reads as "stuck on" the background — usually a missing cast shadow, not a missing outline.

## When to Avoid
- Deliberately flat, diagrammatic, or icon style, where tone steps invite shading the style cannot support.
- Single-ink line work: tone means halftone, which changes the reproduction method.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Shadow direction inconsistent across a set | Reads as collage, not as one scene | Fix azimuth once, then sweep the file |
| Black at 30% for every shadow | Dead, desaturated holes in the color | Tint the base darker and cooler |
| Terminator placed mid-curve | The form looks dented or inflated | Put the edge on a crease or boundary |
| Five tones in a three-tone style | Muddy, and it fights the line weight | Reduce to base, shadow, highlight |

## Practical Examples
A 1200×800 scene in Avnac: key from top-left at 45°. Three `ellipse` cast shadows offset +32 px x and +24 px y,
filled `#1A1A2E` at 28% multiply. The sphere's highlight sits −28 px x and −28 px y, `#F4EFE6` at 85%. The
background plane `#3C4A3E` is 55% contrast against the foreground `#12100E`, which sets two depth planes without
a single gradient.

## Related Rules
- [`61-shapes-and-forms`](61-shapes-and-forms.md) — the forms the light is falling on.
- [`62-linework-and-contours`](62-linework-and-contours.md) — where tone replaces a contour line.
- [`35-perspective-and-depth`](35-perspective-and-depth.md) — depth cues beyond shadow.
- [`72-image-treatment`](72-image-treatment.md) — grading photography to match the same light.
- [`09-figure-ground`](09-figure-ground.md) — separating subject from ground by value.

## Sources
- Hofmann, *Graphic Design Manual*, p. 67 — tone-value studies: the white cube on black and the black cube on
  white, with incident light producing differentiated tone values on the faces.
- Hofmann, *Graphic Design Manual*, p. 36 — color added to the play of light and shade in gray values, with the
  spatial laws of the cube given due attention.
