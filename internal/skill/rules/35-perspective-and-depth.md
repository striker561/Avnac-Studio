# Rule: Perspective and Depth

**Domain:** layout · **ID:** `35-perspective-and-depth`

## Purpose
Build believable space inside a flat canvas, and know when depth is the wrong move. Depth cues are
ranked: the cheap ones are unambiguous and the expensive ones fail loudly, so use them in order
and stop as soon as the space reads.

## Definition
Depth is a set of cues that make a two-dimensional arrangement read as receding space: overlap,
relative size, position in frame, blur, value and color temperature, and linear convergence. Only
the last requires a constructed perspective system; the rest are decisions about edges.

## Core Principles
- Rank the cues: overlap > relative size > vertical position > blur > temperature > convergence.
  Overlap never misreads; convergence misreads at once if any element disagrees with the horizon.
- One-point perspective needs exactly one horizon and one vanishing point, and every consistent
  edge must agree with them; mixing one-point and two-point in one frame looks wrong without
  saying why.
- Objects at twice the distance appear half the size. Pick two depths deliberately — near and far
  — and size the rest by the ratio between them rather than by eye.
- Warm advances, cool recedes. A 15–20° shift toward blue plus a 10% chroma drop reads as further
  away; this works even when nothing else in the frame indicates depth.
- Blur is the easiest cue to overdo. 0.5–2 px separates a foreground element at 1080 px wide;
  4–8 px reads as a background; anything above that reads as a focus error rather than distance.

## Techniques
1. **Set the horizon by eye level** — 38% from the top for a standing figure at chest height,
   55–60% for a tabletop, 65–70% for a low angle; every size in the frame follows from it.
2. **Build three planes** — background flat field plus 10–15% value lift, midground at full
   contrast, foreground 15–25% darker with 2–4 px blur. A fourth plane adds work, not space.
3. **Push the vanishing point off-canvas** — place it at x = −200 to 1600 on a 1920 canvas so the
   diagonals exit the frame instead of meeting inside it. A visible vanishing point creates a
   starburst that will compete with the headline.
4. **Anchor with a cast shadow** — offset 45°, width 2–3× the object's base, opacity 20–35%,
   blurred 6–12 px. A shadow with zero offset makes the object float; a sharp shadow makes it a
   cut-out.
5. **Gradient the atmosphere** — a linear gradient from `#0F1B2D` to `#2A4560` behind a subject
   lifts it forward by value separation alone, with no blur and no perspective construction.

## When to Use
- Scene-based imagery: product shots on a surface, characters in an environment, poster
  photomontage, packaging renders, illustration with a landscape.
- Layouts that need to imply a space beyond the frame — a page bleeding an image so the scene seems
  larger than the crop.
- When two elements must read at different importance but must also read as related: near/far
  encodes that relationship without a size jump in the type.

## When to Avoid
- Interfaces, dashboards, and data display: perspective costs legibility and comparison, and a
  tilted chart is a lie about the numbers.
- Flat graphic concepts — Swiss poster, De Stijl, brutalist web. Depth cues there read as a
  stylistic mismatch, not as space.
- When the horizon would land behind the headline: converging lines under text create vibration
  that no scrim reliably fixes.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Two horizon lines from different photos | The composite reads as physically impossible | Match the horizon before scaling either element |
| Blur applied to the subject instead of the background | Looks like a focus miss | Blur by plane: background and foreground only |
| Drop shadow at zero offset | The object looks pasted on | Offset 45°, 20–35% opacity, 6–12 px blur |
| Every element at full contrast | No plane recedes, so nothing advances | Drop background contrast 15% and lift its value |
| Converging verticals plus a centred vanishing point plus centred type | Three systems competing for the same axis | Keep verticals vertical, or move the type off the axis |

## Practical Examples
A 1920×1080 key visual for a headphones launch, on `#15171C`:

- Horizon at y = 620, so the product reads as sitting on a surface at table height.
- Background: radial gradient from `#23262E` at the centre to `#15171C` at the edges, plus a
  1.5 px blur on a distant wall edge at y = 560.
- Product at x 1180–1620, y 480–760, full contrast, `#E8E6E1` body with `#2B2B2B` shadows.
- Foreground: a blurred `#0D0E11` shape at 92% opacity, x 0–420, overlapping nothing, blurred
  8 px — a near plane that frames the frame.
- Cast shadow under the product: 520×90 px ellipse at 25% opacity, blurred 10 px, offset 30 px
  left.

No perspective construction is used, and the visual still reads as a room because the cues agree:
one horizon, one size ratio, one temperature direction from foreground to background.

## Related Rules
- [`34-composition-techniques`](34-composition-techniques.md) — layering as a compositional device before it becomes a depth cue.
- [`36-scale-and-proportion`](36-scale-and-proportion.md) — relative size, the second-strongest depth cue and the same mechanism as hierarchy.
- [`38-cropping-and-framing`](38-cropping-and-framing.md) — how the crop decides which part of the space the reader can infer.
- [`63-light-and-shadow`](63-light-and-shadow.md) — shadow direction and value, which must agree across every plane.
- [`75-visual-effects`](75-visual-effects.md) — the effects budget, which depth work spends faster than any other technique.

## Sources
- Horstman, *Interacting with Color*, the chapter on "color mixture in paper — illusion of transparence, illusion of depth" — depth can be produced by color interaction alone, with no perspective system.
- Hofmann, *Graphic Design Manual*, the packaging study in which the angles of a cube's faces change with the viewpoint — apparent form is a function of the observer's position, not of the object.
- Itten, *The Elements of Color* — warm and cool as advancing and receding, and the limits of that rule under simultaneous contrast.
