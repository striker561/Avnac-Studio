# Rule: Visual Effects

**Domain:** imagery · **ID:** `75-visual-effects`

## Purpose
Use grain, glow, blur, distortion, and shadow only where they carry meaning. Effects are the fastest way to make
a flat composition feel dimensional, and the fastest way to make a competent one feel like a filter pack.

## Definition
An effect is any post-process that restructures pixels rather than describing content: blur, glow, grain,
displacement, noise, drop shadow. It changes how the image is seen, not what it shows, so it has to be argued for.

## Core Principles
- Set an effects budget: two per element, three per composition. Each answers one question — focus, depth,
  material, or mood — and an effect that answers none is decoration.
- Blur encodes depth only as a stack: 0 px near, 4–8 px mid, 12–16 px far at a 1080 px canvas. Never blur the
  plane the viewer should be looking at.
- Glow needs a threshold: only pixels above 85% lightness emit, blurred 20–40 px and screened at 40–60%.
  Glowing a midtone produces fog, not light.
- Grain is material, not a knob: 2–6% at 1–2 px reads as film or paper, 8% hides banding, 15% reads as damage.
  At 300 PPI, 1 px grain vanishes entirely.
- Distortion breaks message — text distorts into illegibility, faces into the uncanny. Keep displacement under
  10% of the element's width, or off anything semantic.
- Text takes no effect except one shadow at 10% opacity or less, 2 px offset, 0 blur.

## Techniques
1. **Depth stack** — three planes at blur 0/6/14 px, lightness 0/−8/−16%, temperature +0/+150/+350 K. All three
   cues together read as distance; one alone reads as a mistake.
2. **Glow construction** — duplicate, Screen, blur 30 px, mask to highlights above 85% lightness, set 50%. Two
   passes at 30% and 20% beat one at 80%.
3. **Grain overlay** — one 3–4% monochrome noise layer at 2 px over the whole composite, so every source shares
   one noise floor; check 100% zoom for repeating pattern.
4. **Effect audit** — 25% for halos, 400% for banding, then switch the effect off. If nothing is lost, delete it.

## When to Use
- Separating a foreground subject from a busy ground without altering the ground's content.
- Evoking a material or medium: newsprint, CRT scanlines, photocopy, wet ink.
- Unifying sources that arrived with different sharpness and noise.

## When to Avoid
- Over text, where blur, glow, and outline all cost legibility for a gain the reader cannot name.
- Small-format print: grain below 0.1 mm disappears on press while still muddying the proof.
- When the image underneath is weak — effects amplify composition, they do not supply it.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Drop shadow on every element | Nothing shares a plane, page turns to mud | Shadow only where an object touches a surface |
| Blur as fake depth of field | Edges smear instead of defocusing | Blur the plane, keep the subject sharp |
| Glow on a midtone | Reads as fog | Threshold at 85% lightness, mask highlights |
| Grain at screen resolution | Vanishes at 300 PPI | Scale grain to final output size |

## Practical Examples
A 1080×1350 px poster uses exactly two effects. A duplicate of the background photograph gets blur 6 px,
lightness −8%, and +150 K, then sits behind the cut-out subject, which keeps 0 px blur and full contrast — that
is the depth. One 3% monochrome grain layer at 2 px covers image and flat `#12100E` ground so both share a noise
floor. The 96 px headline gets nothing, because a shadow on type is the first thing a viewer reads as amateur.

## Related Rules
- [`63-light-and-shadow`](63-light-and-shadow.md) — the light logic every effect has to imitate.
- [`35-perspective-and-depth`](35-perspective-and-depth.md) — depth cues at layout scale, before pixels.
- [`74-masking-and-blending`](74-masking-and-blending.md) — where blur and shadow meet compositing edges.
- [`72-image-treatment`](72-image-treatment.md) — the global grade an effect must sit inside.
- [`41-visual-perception`](41-visual-perception.md) — why halos and banding register before content.

## Sources
- Tufte, *The Visual Display of Quantitative Information*, "Chartjunk: vibrations, grids, and ducks" — added visual noise competes with the information it decorates.
- Itten, *The Elements of Color* — glow, haze, and atmosphere as contrast of light rather than added color.
