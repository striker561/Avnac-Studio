# Rule: AI-Assisted Design

**Domain:** production · **ID:** `118-ai-assisted-design`

## Purpose
Use generative tools for the part of the work they are genuinely good at — breadth, texture, first drafts,
variants — while keeping authorship, judgment and accountability where they belong. This rule is about the
seams: what you prompt, what you check, what you disclose, and what you refuse to ship.

## Definition
AI-assisted design is producing artifacts with a generative model under human direction, where the human
sets the constraints, selects and edits the output, and carries professional responsibility for the result.
It is not "the model made it": the brief, the critique, the cleanup and the sign-off stay human acts, and
they are what the client is paying for.

## Core Principles
- The model produces candidates, not decisions. Generate 8–12, judge them at thumbnail size against the
  brief, keep one, then edit it.
- Prompt the spec, not the vibe: medium, dimensions, subject, composition, palette in hex, light,
  rendering, explicit exclusions. "A modern poster" is not a prompt; "a 3:4 flat-color screenprint of a
  night market in two inks, `#121212` and `#F2B33D`, no text, no people" is.
- Treat every output as a draft of unknown provenance. Assume garbled text, invented anatomy, inconsistent
  perspective, accidental trademarks and near-copies until you have looked.
- Text is not generated, it is set. Never ship letterforms from an image model; put real type over or
  beside the image.
- Ownership is unsettled. In the US, material generated purely by a model, with no human authorship, is not
  copyrightable; anything you must own needs substantial human authorship on top. Read the tool's terms
  for commercial use and indemnity before the project depends on them.
- Disclose when it matters, and keep confidences. Say which artifacts were generated and with what tool
  when the client, publisher or law requires it; never present generated work as commissioned human work.
  Assume prompts and uploads are retained: no unreleased client material in a tool you have not cleared.

## Techniques
1. **Write a six-line constraint block before generating** — subject, medium or style, composition and
   crop, palette in hex, what must not appear, aspect ratio. Change one line per iteration so you learn
   which line is doing the work.
2. **Cull at thumbnail, then inspect at 100%** — choose at 160 px by silhouette and value. Then check
   corners, center, text and any human for repeating tiles, mush, symmetric faces and warped lines.
3. **Critique the output as a draft** — run the `111-design-critique` structure on it: hierarchy, focal
   point, contrast, edge quality. An image can be beautiful and still be the wrong composition for the
   layout it has to sit in.
4. **Retype and rebuild** — replace generated text with typeset text, generated logos and icons with
   constructed vector, generated charts with ones drawn from real data.
5. **Log, disclose, clear** — one line per artifact: tool, date, prompt summary, seed, edits. Before
   shipping, search any mark, clear likeness for real people, and check the style against living artists.

## When to Use
- Ideation: exploring directions faster than sketching allows, then drawing the chosen one properly.
- Backgrounds, textures and abstract fields where no factual content is required.
- Comping with placeholder imagery before the commissioned shot arrives; grunt work with a checker on it.

## When to Avoid
- Logos and identity marks: originality cannot be verified and the output is not constructible as clean,
  optically corrected vector.
- Recognizable people, a living artist's signature style, cultural or religious symbols you cannot vet,
  and any claim, figure or name that has to be true.
- Text-led artifacts — menus, typographic covers, infographics. The model cannot set type.
- Work where the contract requires an assignable copyright and the client will not accept generated
  material.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Prompting "modern, clean, premium poster" | Three adjectives, no constraints, twelve unusable outputs | Six-line constraint block with hex palette and exclusions |
| Shipping generated letterforms | Broken kerning, invented spelling, no font license | Set real type over the image |
| Accepting the first candidate | No comparison; the first output anchors the direction | Generate 8–12, cull at thumbnail |
| Staying silent about the tool | The client finds out later; trust and sometimes contract breach | Disclosure line in the delivery note |
| Upscaling a 1024 px output to A2 | 1024 px at 420 mm is 62 PPI: visible mush | Regenerate larger, place smaller, or composite |

## Practical Examples
A 1080×1350 social poster for a night market. The background is generated; everything else is designed.

Prompt: "screenprint texture, two inks `#121212` and `#F2B33D`, abstract night-market stalls in silhouette,
no text, no people, 4:5, high contrast, coarse halftone." Twelve candidates at 1024×1280, culled at 160 px
to four by silhouette. The chosen one was regenerated at 2048×2560 and inspected at 100%, where two
"lanterns" turned out to be faces; that corner was cropped out and replaced with a `#121212` panel.

Headline "NIGHT SHIFT" set at 112 px Inter Bold, date 34 px, footer 15 px — all live text. The image sits
behind a 40% `#121212` scrim so the type clears 4.5:1. Delivery note: "Background image generated with
[tool], Nov 2026; all typography and layout original."

## Related Rules
- [`119-generated-design-artifacts`](119-generated-design-artifacts.md) — the per-format cleanup that follows this rule.
- [`111-design-critique`](111-design-critique.md) — the critique structure you apply to generated output.
- [`117-design-documentation`](117-design-documentation.md) — where provenance and disclosure are recorded.
- [`69-image-manipulation`](69-image-manipulation.md) — retouching and compositing after generation.
- [`115-export-and-file-formats`](115-export-and-file-formats.md) — what the cleaned artifact is exported as.

## Sources
- U.S. Copyright Office, *Copyright Registration Guidance: Works Containing Material Generated by
  Artificial Intelligence* (2023) — the human-authorship requirement behind the ownership principle.
- *Graphic Artists Guild Handbook*, "Impact of Generative AI on the Profession" — market saturation, style
  imitation and the licensing concerns raised for professional practice.
- Monteiro, *Design Is a Job*, on professional responsibility — you answer for the work you put into the
  world, whoever or whatever drew it.
