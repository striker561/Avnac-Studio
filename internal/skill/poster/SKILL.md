---
name: poster
description: Design single-sheet graphics meant to be read at a distance — gig and club bills, exhibition and film posters, protest and event print, A3/A2/A1 wall sheets. Use whenever the task is one standalone sheet with one message, even when the user calls it a flyer, a banner, a cover, or "something for the show".
---

# Poster Design

## Applies when
The deliverable is a single sheet whose job is to stop someone, be understood in two seconds, and
be remembered long enough to act. Print or export, one message, one focal point. If the sheet has
to carry six paragraphs of information, it is a leaflet — use `layout` instead. If it has to work
as a wall of many, it is an exhibition system — use `create` for the system and come back here for
each sheet.

## Workflow
1. **State the one message.** Write the sentence a stranger should be able to repeat after two
   seconds, e.g. "Warehouse 9, Friday, late-night print fair." Everything on the sheet either
   supports that sentence or leaves.
2. **Choose the viewing distance.** A2/A1 on a wall: 2–5 m. A3 in a café window: 1–2 m. Phone
   story: 0.3 m. The distance sets the minimum text size and the maximum number of levels:
   at 3 m, body copy below 24 pt at final size is decoration.
3. **Pick the format and grid.** Standard: A2 (420×594 mm), A1 (594×841 mm), 1080×1350 px for
   social. Set the grid with a 3–5 mm margin of safety inside trim; use a 2- or 3-column
   structure and place the focal element on a column edge, not floating.
4. **Build the hierarchy before the image.** Headline, subhead, details, credits. Set sizes from
   the distance estimate, not from what looks nice zoomed to 100%.
5. **Choose the image strategy.** One dominant image + type, or type as the image, or a
   constructed graphic (shape/pattern/photo treatment). Do not mix all three; posters read as
   weak when type, photo and illustration each claim 30% of the sheet.
6. **Compose for the squint.** Blur or stand back: the focal point must survive as a shape. If
   the composition only works at 100% zoom, it fails on the wall.
7. **Add the practical layer last.** Date, venue, price, QR, sponsor marks — small, aligned to
   the grid, out of the focal path.
8. **Production check.** Bleed 3 mm, safe area 5 mm inside trim, images at 150–300 PPI at final
   size, CMYK or an explicitly chosen digital space, fonts embedded.

## Decision points
- **Type-led or image-led?** Type-led when the message is a phrase (a protest, a title, a name);
  image-led when the message is a scene (a film, a night, a place). Type-led posters need better
  type; image-led posters need a better crop.
- **One color or four?** One or two colors is a legitimate, often stronger, print decision and
  cheap to produce. Use it deliberately, not because the budget is low.
- **Quiet or loud?** A loud poster competes with its own environment. In a busy street, a quiet
  sheet with one small element can win where a saturated one disappears.
- **Photograph or illustration?** Photography promises realism and a specific event; illustration
  promises a mood or an idea. A real gig with a stock photo reads as fake.

## Rules to apply
- [`24-typographic-hierarchy`](../rules/24-typographic-hierarchy.md) — the poster lives or dies on four levels; set them from viewing distance.
- [`03-contrast-and-emphasis`](../rules/03-contrast-and-emphasis.md) — one focal point, with everything else deliberately quieter.
- [`08-negative-space`](../rules/08-negative-space.md) — empty space is what makes a sheet readable across a room.
- [`34-composition-techniques`](../rules/34-composition-techniques.md) — framing, thirds, tension, and the thumbnail-first habit.
- [`38-cropping-and-framing`](../rules/38-cropping-and-framing.md) — the crop is the composition when there is one image.
- [`76-visual-metaphors-and-symbolism`](../rules/76-visual-metaphors-and-symbolism.md) — dissent and event posters live on one strong metaphor, not on cleverness.
- [`82-bleed-trim-and-safe-areas`](../rules/82-bleed-trim-and-safe-areas.md) — the numbers that stop a good design from being trimmed badly.

## References
- [`composition`](../references/composition.md) — worked composition patterns and when each one applies.
- [`typography`](../references/typography.md) — type sizes, pairings and pairing traps.
- [`print-production`](../references/print-production.md) — paper, ink and finishing choices for a single sheet.

## Production checks
- Read the sheet at 25% zoom on a phone: headline visible, date and venue still legible.
- Grayscale test: the focal point is still first. Color is reinforcement, never the only carrier.
- Every detail line is correct: date, time, venue, price, URL. Poster errors are public.
- No text within 5 mm of trim and no element crossing bleed by accident.
- Export: PDF/X-4 for print, or PNG at 2× for social; check file size limits for upload.

## Output format
Report back in this shape when you finish:

1. `Message:` the one sentence the sheet carries.
2. `Format:` size, orientation, bleed/safe margins.
3. `Hierarchy:` each level with font, size, weight, color.
4. `Palette:` 3–5 hex values with roles.
5. `Files:` export paths and formats.
6. `Risks:` anything a printer or client could still break (short text, low-res image, tight safe area).
