# Composition — reference

Use when you need to decide *where* things go and *why*, or when a layout looks correct but
feels dead. This is the fast lookup; the reasoning lives in the linked rules.

## The three questions, in order

1. **What is the focal point?** Exactly one element must win the first fixation. If two tie,
   the composition has no entry.
2. **Where does the eye go next?** A path (Z, F, diagonal, spiral, single column) should exist.
   If the viewer has to hunt, hierarchy is missing, not composition.
3. **What holds it together?** An alignment axis, a shared margin, a repeated color, or a
   grid line touching every element. Loose elements read as unfinished.

## Focal point strength

Rank by how much each element competes. Keep the top one and deliberately demote the rest.

| Device | Relative pull | Notes |
|---|---|---|
| Human face / eyes | Very high | Wins against almost any type or shape; use when the person is the message |
| Extreme size contrast | High | A 4× size jump beats color for first fixation |
| Saturated hue on neutral field | High | Loses to size when the field is busy |
| Hard value contrast (near-black on near-white) | High | Survives grayscale and small sizes |
| Isolation / more negative space | Medium-high | The lonely object gets found |
| Position at a grid intersection or third | Medium | Convention, not magic; weak alone |
| Pointing line, gaze, arrow | Medium | Directs attention along a vector |
| Texture or detail cluster | Low-medium | Attracts second fixation, rarely first |

## Common composition patterns

| Pattern | Structure | Works for | Fails when |
|---|---|---|---|
| Centered axis | Everything on the vertical centerline | Formal invitations, luxury, single message | Content has many unequal parts |
| Rule of thirds | Key elements on third lines | Photography-led layouts | Typography-led work, where column edges matter more |
| Golden / 3:5 split | Asymmetric but related division | Editorial pages, poster type/image split | Applied to every margin until it becomes decoration |
| Diagonal | Main axis runs corner to corner | Motion, sport, music, dissent | Text-heavy layouts — reading lines fight the diagonal |
| Grid field | Modular blocks on a column grid | Catalogues, dashboards, multiple equal items | One hero message with no supporting detail |
| Full bleed + inset | Image to the edges, small type island | Photography, atmosphere, premium print | When the image is low resolution or the trim is uncertain |
| Type as image | The words are the composition | Posters, statements, covers | Long copy, or when legibility at distance is required |

## Proportion and spacing

- **Margins**: for A-series print, 1/9 to 1/12 of the short edge is a safe, classical margin.
  A2 (420 × 594 mm) → 35–47 mm. Digital: 5–8% of the short edge.
- **Ratio systems** worth using: 2:3, 3:5, 5:8, 1:1.618. Pick one and reuse it for margins,
  image boxes, and type sizes; mixed ratios read as noise.
- **Spacing hierarchy**: space *between* groups should be at least 1.5× the space *within* a
  group. 2× is safer and looks intentional.
- **Optical centering**: geometric center sits ~2–4% too low for text blocks and circles; raise
  them by 1–3% of the height. Trust the eye at 100%, not the numbers.

## Depth without perspective

Flat design still needs layering. In order of subtlety: overlap → scale → value contrast →
blur → color temperature → shadow. Use two or three, not all six.

| Device | Effective strength | Cheap failure |
|---|---|---|
| Overlap | Strong, free | Ambiguous edges when values match |
| Scale | Strong | Implausible sizes when no ground plane exists |
| Value contrast | Medium | Reads as two unrelated planes |
| Blur | Medium | Looks like a mistake at small sizes |
| Temperature | Subtle | Blue/orange cliché when overdone |
| Shadow | Strong | Muddy, inconsistent light direction |

## Cropping and framing

- Crop to remove, not to fit. If the crop removes the subject's meaning (hands, context,
  horizon), change the image instead.
- Leave more space in front of a moving subject than behind — the "lead room" rule; roughly
  2:1 front-to-back.
- For print, keep critical content 5 mm inside trim and 3 mm bleed outside it.
- Aspect ratios that survive most uses: 1:1, 4:5, 3:2, 16:9, A-series. Design in the target
  ratio rather than cropping a compromise.

## The squint / blur test

Blur the composition (or view at 15–25%). What survives?

- One dominant shape → the composition works.
- A field of equal shapes → no hierarchy; increase one contrast.
- The focal point disappears → the focal point was detail, not structure.
- Text becomes gray texture with a hole → check whether the hole is where you want it.

## Rules

- [`34-composition-techniques`](../rules/34-composition-techniques.md) — the techniques this file indexes.
- [`03-contrast-and-emphasis`](../rules/03-contrast-and-emphasis.md) — how emphasis is actually produced.
- [`35-perspective-and-depth`](../rules/35-perspective-and-depth.md) — depth devices in detail.
- [`36-scale-and-proportion`](../rules/36-scale-and-proportion.md) — scale jumps and proportion systems.
- [`37-direction-and-movement`](../rules/37-direction-and-movement.md) — reading paths and vectors.
- [`38-cropping-and-framing`](../rules/38-cropping-and-framing.md) — crops that keep meaning.
- [`08-negative-space`](../rules/08-negative-space.md) — why emptiness is a material.
- [`30-grid-systems`](../rules/30-grid-systems.md) — when composition should be a grid instead.
