# Illustration — reference

Use when the design needs original drawn imagery. Rules:
[`60-illustration-fundamentals`](../rules/60-illustration-fundamentals.md) through
[`69-image-manipulation`](../rules/69-image-manipulation.md).

## Choosing a style (from the message, not the mood board)

| Style | Signal | Cost | Best for |
|---|---|---|---|
| Flat vector | Clarity, friendliness, scalability | Low | UI, icons, infographics, explainers |
| Geometric / abstract | Systems, technology, abstraction | Low | Tech brands, editorial, covers |
| Line art | Intelligence, editorial, economy | Low | Op-eds, books, one-color print |
| Cell-shaded | Character, narrative, energy | Medium | Comics, games, youth brands |
| Painted / textured | Craft, warmth, heritage | High | Packaging, food, premium editorial |
| Collage / mixed media | Commentary, irony, culture | Medium | Editorial, posters, music |
| 3D / isometric | Depth, product, playfulness | High | Product, SaaS, dashboards |

Rule: the style must carry the *message*. A friendly flat illustration of a serious subject reads
as trivializing; a painted scene for a password reset is absurd.

## Set consistency checklist

A set is a system. Check all six before adding a new illustration:

1. **Line weight** — same range (e.g. 2–3 pt at 1000 px canvas), same treatment of corners.
2. **Palette** — same 4–6 colors with the same roles, same tint steps.
3. **Lighting** — same direction, same soft/hard convention, same shadow opacity.
4. **Perspective** — same vanishing logic (flat, 2.5D, isometric) across the set.
5. **Detail density** — same amount of texture per area; one busy + one sparse reads as two sets.
6. **Character proportions** — same head-to-body ratio, same hand/face abstraction level.

## Vector production

| Item | Practice |
|---|---|
| Canvas | Draw at 2–4× final size, then scale down |
| Paths | Fewest anchors that hold the curve; no redundant points |
| Strokes | Expand before boolean ops; keep a live-stroke master |
| Corners | Consistent radius per style; use the same corner tool |
| Overlaps | Use shape-builder or boolean, not stacked semi-transparent shapes |
| Export | SVG with `viewBox`, no raster effects; test at 32 px |

## Raster production

| Item | Practice |
|---|---|
| Resolution | 300 PPI at final print size; 2× for retina UI |
| Layers | Separate line, flat color, shadow, texture; keep a flattened comp |
| Brushes | One brush family per style; do not mix hard and soft accidentally |
| Texture | Apply on a separate layer with a mask; keep intensity consistent |
| Export | PNG for transparency, WebP for web, TIFF for print handoff |

## From brief to set

1. Write the list of images the project actually needs (6–12, not 40).
2. Draw the hardest one first; if the style cannot survive the hardest subject, change the style.
3. Build a palette + line + lighting spec before drawing the rest.
4. Draw 3 in a row, compare side by side; fix the system, then produce the rest.
5. Export with a naming convention (`subject_variant.svg`) and a contact sheet.

## Legal and ethical

- Reference, do not trace: a traced photo can be a derivative work.
- Do not imitate a living illustrator's signature style for commercial work; borrow technique,
  not identity.
- AI-generated imagery: check the tool's licence, disclose when required, and expect scrutiny of
  hands, text, and repeated patterns.
- For characters, avoid recognizable protected characters and trademarks.

## Rules

- [`60-illustration-fundamentals`](../rules/60-illustration-fundamentals.md) — purpose and style systems.
- [`61-shapes-and-forms`](../rules/61-shapes-and-forms.md) — building a visual vocabulary.
- [`62-linework-and-contours`](../rules/62-linework-and-contours.md) — line as signature.
- [`63-light-and-shadow`](../rules/63-light-and-shadow.md) — consistent lighting.
- [`65-character-and-object-design`](../rules/65-character-and-object-design.md) — silhouette-first design.
- [`66-vector-illustration`](../rules/66-vector-illustration.md) — path and SVG production.
- [`67-raster-and-digital-painting`](../rules/67-raster-and-digital-painting.md) — painted workflows.
