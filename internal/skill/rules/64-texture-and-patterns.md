# Rule: Texture and Patterns

**Domain:** illustration · **ID:** `64-texture-and-patterns`

## Purpose
Decide when surface variation carries information and when it is only noise, then build it so it tiles cleanly,
exports small, and survives print reproduction.

## Definition
Texture is sub-element variation in value, color, or shape at a scale smaller than the form it sits on. Pattern is
that texture organized by a rule — grid, brick, half-drop, mirror, or seeded random.

## Core Principles
- Texture must carry one of four messages: material (paper, concrete, fabric), depth (grain at distance), state
  (worn, new, damp), or category (this section versus that). Otherwise delete it.
- Below about 2 px at final size, texture stops being texture and averages into flat tone. It costs file size,
  invites moiré, and communicates nothing.
- Density target: 8–20% coverage for a tooth on flat color; 30–50% and the texture becomes the figure; past 60%
  the surface is a pattern, not a texture.
- Pattern is content. A three-color pattern behind type competes for the same job: drop it to 10–15% opacity or
  move the type.
- Tiling must be exact. The tile has to divide the artboard: on 1080×1080, 120 px or 135 px repeats 9 or 8 times,
  while 100 px leaves an 80 px remainder and a visible seam.
- In print, fine dot patterns moiré against the halftone screen; coarsen to 45° or use a solid tint.

## Techniques
1. **Squint test** — view the artboard at 5% zoom. If the texture reads as dirt, it is too coarse or too
   high-contrast for its role.
2. **Seamless tile construction** — build a square tile, offset the contents 50% on both axes, repair the four
   edges, then restore it. Verify by tiling 3×3 and inspecting the joins.
3. **Density ladder** — generate the same texture at 8%, 16%, and 32% coverage, and choose against the actual
   background rather than on white.
4. **One module, four rotations** — repeat a single shape at 0°/90°/180°/270° on a checker offset, which gives
   structure without four separate drawings.
5. **Where to stop** — end the texture at a shape edge or a mask boundary. A soft random fade reads as an
   unfinished blend, not as texture.

## When to Use
- When a flat fill reads as plastic and the subject needs material: kraft, newsprint, concrete, fabric.
- To separate planes in flat illustration where color alone is not doing it.
- When a series needs a recurring surface language at low density — a 10% grain that appears on every spread.

## When to Avoid
- Formats under about 200 px wide: texture becomes 1–2 px and turns into noise at the size people see it.
- Directly under body copy. Any texture behind text needs to be under 10% or absent, or contrast falls below
  4.5:1 and the words stop being readable.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Texture under body copy | Lowers contrast and hurts legibility | Remove it, or keep it under 8% |
| Tile size not dividing the artboard | Visible seam at every repeat | Choose a divisor: 120 or 135 on 1080 |
| Three textures in one piece | Nothing reads as material any more | One texture, one role |
| Pattern at full strength behind type | The pattern becomes the figure | 10–15% opacity, or move the type |

## Practical Examples
A 1080×1080 poster: base `#12100E`, a 135 px tile of 2 px dots at 12% `#F4EFE6` covering only the lower 380 px,
cut off hard at the headline block by a `rect` edge rather than a fade. Coverage reads at 14% at 100% zoom and
vanishes at 25%, which is the intent: a tooth, not a picture. Tiled 3×3 in a test file, the joins are invisible.

## Related Rules
- [`61-shapes-and-forms`](61-shapes-and-forms.md) — the forms being textured.
- [`63-light-and-shadow`](63-light-and-shadow.md) — tone and texture together build depth.
- [`75-visual-effects`](75-visual-effects.md) — the wider effects budget this sits inside.
- [`72-image-treatment`](72-image-treatment.md) — grain on photography rather than on flat color.
- [`81-print-color-management`](81-print-color-management.md) — halftone screens, angles, and moiré.

## Sources
- Hofmann, *Graphic Design Manual*, p. 52 — patterns built from a circular grid by blanking out different parts of
  it, the results eliciting sensations of rotating, moving, and rocking.
- Hofmann, *Graphic Design Manual*, p. 32 — dots in three sizes, and a transposition exercise from nature: dot
  formation in an autumn leaf.
