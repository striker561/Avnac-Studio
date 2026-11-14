# Rule: Bauhaus

**Domain:** history · **ID:** `101-bauhaus`

## Purpose
Use the Bauhaus as a working method — function dictates form, geometry is the vocabulary, craft is
non-negotiable — rather than as a 1920s graphic costume.

## Definition
Bauhaus design (1919–1933) derives form from use and material, builds from primary geometry (circle,
square, triangle), composes asymmetrically on a module grid, sets geometric sans-serif type in
lowercase, and limits color to the primaries plus black and a warm white.

## Core Principles
- Function first: shape follows what the thing does. Ornament that does not explain structure goes.
- Geometry is the vocabulary — circles, squares, triangles, arcs, 90° and 45° angles, constructed
  rather than sketched.
- Asymmetry balanced by mass. The period's posters are offset stacks of blocks, not centered
  arrangements.
- Type: one geometric sans, lowercase for display, tight leading, flush left. No centered headline.
- Color: primaries plus black and off-white, in flat areas. A gradient belongs to a different
  philosophy — one about surfaces rather than structure.
- The workshop standard: every element competently made, aligned, and reproducible by someone else.

## Techniques
1. **Build on a module** — a 3×3 or 4×4 module grid, elements on 8 px multiples, circles tangent to
   block edges. In Avnac, place `ellipse` and `rect` so their bounding boxes land on those lines.
2. **60-30-10 in primaries** — 60% warm white `#F4F1EA`, 30% black `#111111`, 10% split between red
   and blue. One primary used fully usually beats all three at once.
3. **Lowercase geometric display** — 72–120 px, tracking −2%, leading 0.95–1.05; body stays
   sentence case at 16–18 px.
4. **Block stack** — three rectangles of different widths aligned to one edge and offset vertically;
   the headline sits in the widest block only, so the block carries the hierarchy.
5. **Copy the logic, avoid the souvenirs** — copy: module geometry, asymmetric massing, lowercase
   geometric type, flat primaries. Avoid: fake letterpress texture, "1923" date stamps, Moholy-Nagy
   photo clichés, triangles stuck on as decoration.

## When to Use
- Cultural and educational identity, exhibition graphics, posters arguing for clarity and modernity,
  architecture and furniture collateral.
- When a client must look rational and contemporary at the same time.

## When to Avoid
- Luxury and premium positioning: the austerity reads as cheap rather than restrained.
- Playful consumer brands, where the discipline kills the warmth the brand is selling.
- Dense UI: lowercase geometric display type at 11–13 px loses x-height and scannability.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Triangles used as decoration | Geometry becomes wallpaper with no structural job | Every shape holds content or divides the field |
| All three primaries at full area | The triad fights itself; nothing ranks | 60-30-10, one accent |
| Centering the composition | The movement composes asymmetrically | Align to one edge, balance by mass |
| Futura for 11 px UI labels | Geometric sans has a small x-height at text sizes | Text face for text, display face for display |

## Practical Examples
A 700×1000 exhibition poster:

- Background `#F4F1EA`. Black `rect` x=0 y=0 w=700 h=260; title lowercase 96 px/700 `#F4F1EA` at
  x=56 y=120.
- Red `rect` x=56 y=320 w=240 h=240; blue `ellipse` 240×240 at center (476, 440), overlapping the
  red block by 40 px so the primaries collide instead of sitting side by side.
- Body 18 px/1.5 `#111111` in one 320 px column at x=56 y=620; date 16 px/600 uppercase +6% at
  y=910, above a 1 px `#111111` rule at y=880.
- Grid: 4 columns, 56 px margins, 24 px gutters — columns 129 px wide, so every x is 56 + n(153).

## Related Rules
- [`102-swiss-international-style`](102-swiss-international-style.md) — the grid discipline this started, taken to a system.
- [`105-de-stijl`](105-de-stijl.md) — the orthogonal, primary-color parent.
- [`100-design-movements`](100-design-movements.md) — the method for using any movement as constraints.

## Sources
- Whitford, *Bauhaus* — the Vorkurs, the workshops, and the 1923 exhibition that fixed the school's public image.
- Hofmann, *Graphic Design Manual*, p. 12 — the point-to-plane exercises that carry the Vorkurs method into layout.
- Itten, *The Elements of Color* — the primary-based color teaching the palette came from.
