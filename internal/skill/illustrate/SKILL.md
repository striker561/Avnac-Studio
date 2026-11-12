---
name: illustrate
description: Create original illustration — a style system, characters, scenes, objects, editorial spots or a consistent image set. Use whenever the user wants something drawn, an illustration (not a photo), a mascot, a character, a spot illustration for an article, or a series of images that must look like one family.
---

# Illustration

## Applies when
The deliverable is drawn imagery. For a mark, use `logo`; for icons, use `icon`; for photographic
treatment, use `edit` with the imagery rules.

## Workflow
1. **Define the job**: explain, decorate, or dramatize. Spot illustrations explain; hero
   illustrations dramatize; decorative illustration must never compete with the message.
2. **Write the style spec before drawing**: line weight range, palette (4–6 colors with roles),
   lighting convention (direction, shadow hardness), perspective (flat/2.5D/isometric),
   abstraction level (how faces and hands are treated).
3. **Draw the hardest subject first.** If the style cannot handle the most complex subject in the
   set, the style is wrong — find out before producing twenty easy ones.
4. **Build shapes from primitives**, then refine: silhouette first, then interior forms, then line
   or texture. A strong silhouette survives at thumbnail size.
5. **Keep the set consistent.** After every three images, line them up side by side and compare
   weight, palette, light and density. Fix the spec, not just the image.
6. **Respect the medium.** Vector for scalable/flat work, raster for painterly; 300 PPI at final
   print size; SVG with no raster effects for UI use.

## Decision points
- **Flat or dimensional?** Flat is clearer, cheaper and more on-brand for technology; dimensional
  sells product and craft. Do not mix in one set.
- **Character or object?** Characters carry emotion and require consistency rules (proportions,
  expressions, poses); objects carry information and tolerate more variation.
- **Metaphor or scene?** A metaphor (a lock, a bridge) is faster to read; a scene (a person using
  the product) is warmer but needs more space and detail.
- **How abstract?** Match the audience: more abstraction for adults and technical subjects, more
  literal representation for children and instructions.

## Rules to apply
- [`60-illustration-fundamentals`](../rules/60-illustration-fundamentals.md) — purpose and style systems.
- [`61-shapes-and-forms`](../rules/61-shapes-and-forms.md) — building the visual vocabulary.
- [`62-linework-and-contours`](../rules/62-linework-and-contours.md) — line as the signature.
- [`63-light-and-shadow`](../rules/63-light-and-shadow.md) — consistent light in a set.
- [`65-character-and-object-design`](../rules/65-character-and-object-design.md) — silhouette-first characters.
- [`64-texture-and-patterns`](../rules/64-texture-and-patterns.md) — texture without noise.
- [`76-visual-metaphors-and-symbolism`](../rules/76-visual-metaphors-and-symbolism.md) — choosing an idea that reads.

## References
- [`illustration`](../references/illustration.md) — styles, set checklist, production.

## Production checks
- Six-point set consistency: line, palette, lighting, perspective, detail density, proportions.
- Silhouette test at 25%: each image is identifiable as a shape.
- Print: 300 PPI at final size, CMYK-safe palette, text as vectors.
- Screen: SVG viewBox, no filters that break on export.
- Rights: no traced photographs, no imitation of a living illustrator's signature style.

## Output format
`Job:` explain/decorate/dramatize. `Style spec:` line, palette, light, perspective, abstraction.
`Set:` list of images with usage. `Files:` paths and formats. `Risks:` where the style will strain.
