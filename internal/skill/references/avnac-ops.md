# Avnac ops

The operations this build publishes, and the vocabulary a rule uses to name the operation that
performs it. Read this before writing a rule, a workflow or a report: "set the type" is advice,
"`elements` op=measure then `elements` op=render" is an instruction an agent can execute.

## How the library cites an op

- A cited op is a backticked tool name followed by op=name — for example `elements` op=render, `canvas` op=validate,
  `vector` op=update. Backticks around the tool, none around the op.
- A read tool is cited by name alone: `get_canvas_image`, `get_object_properties`, `guide`.
- Every rule opens its Techniques section with an **Avnac ops:** paragraph and opens its
  Verification with an **Ops receipt** check. The receipt is the command; the rest of the rule is
  the reason. Every workflow carries an **Avnac ops** table, and every lookup reference opens with
  the ops that apply its numbers. `go test ./internal/skill -run TestRulesCiteKnownOps` holds them
  to this catalogue.
- If no op performs the step, the rule says so and names the visual check instead. An invented op
  is worse than no op: the agent calls it, gets an unknown-op error, and stops trusting the library.

## The tools

### `canvas` — project, pages, artboard

| op | Does |
|---|---|
| op=create | Start a new project at width/height. Only for a new deliverable. |
| op=add-page | Add a named blank page to the open project and switch to it. Drafts, tests and variants. |
| op=go-page | Switch the active page (1-based number, name, or 0-based index). |
| op=rename-page | Rename a page. |
| op=delete-page | Delete a page; never the last one. |
| op=clear | Remove every object on the current page. |
| op=background | Set the current page background. |
| op=preset | Resize to a standard preset: ig-square, ig-portrait, ig-story, hd, twitter-post, linkedin, youtube-thumb, a4-300, custom-4000. |
| op=resize | Change the artboard size in place. |
| op=snapshot | Capture every page and return a restore token. |
| op=restore | Return to a snapshot token. |
| op=undo / op=redo | Step through object and page history. |
| op=status | Connected client, revision, active page, implemented actions. |
| op=validate | The measured audit: issues plus rule checks (below). |

### `elements` — create, change, remove, measure

| op | Does |
|---|---|
| op=render | Place a batch in one call, bottom to top. Types: rect, ellipse, circle, polygon, star, line, text, image, sticker. |
| op=modify | Update by objectId, id or unique name; returns before/after and changedFields. |
| op=delete | Remove an object, or the current selection when no target is given. |
| op=measure | Width, height, line count, cap metrics for proposed elements, without drawing. |

Fields that matter in the rules: `x`, `y`, `width`, `height`, `fill`, `stroke`, `strokeWidth`,
`opacity`, `rotation`, `cornerRadius`, text `text`, `fontSize`, `fontFamily`, `fontWeight`,
`fontStyle`, `lineHeight`, `textAlign`, `underline`, images `url`, `fit`, `focalPoint`, `crop`,
and `gradientStops`/`gradientAngle` on fills.

### `arrange` — the selection

| op | Does |
|---|---|
| op=align | left, center, right, top, middle, bottom, cap-middle. Single selection aligns to the artboard; multiple align to each other. cap-middle centres on the cap-height band, not the box. |
| op=distribute | Even horizontal or vertical gaps; needs three or more objects. |
| op=group / op=ungroup | Group two or more objects, or dissolve a group. |
| op=fit | Scale the selection to the artboard with padding. |
| op=select | Select by id, which is how an arrange op is aimed. |

### `files` — saved canvases

| op | Does |
|---|---|
| op=list | Saved canvases with id, name, size, updated time. Works with nothing open. |
| op=open | Open a saved canvas as the active scene. |
| op=rename | Rename the saved file and the open editor title. |

### `assets` — external material

| op | Does |
|---|---|
| op=unsplash | Photo search with compact records and remaining quota. Placement is what fires download tracking and stores the credit. |
| op=fonts | Supported Google Fonts plus a `loaded` map for requested families. |
| op=stickers | Built-in sticker names. |

### `export` — output

| op | Does |
|---|---|
| op=png | Base64 PNG of the artboard; multiplier, transparent. |
| op=object | PNG or SVG of one object or group, cropped to it. |
| op=svg | Editable SVG of the page or selection; optionally writes a file. |

### `vector` — original path artwork

| op | Does |
|---|---|
| op=draw | Resolve an IR of rect, ellipse, circle, capsule, polygon, star, line and path objects into cubic paths and place it. Constraints and mirrorOf are resolved here. |
| op=update | Apply resize, move, rotate, mirror, restyle, reorder, delete or add by object id, re-resolving once. |
| op=read | The IR, the resolved document and per-object bounds. |
| op=export | The self-contained SVG source; optionally writes it. |
| op=delete / op=list | Remove the placed drawing, or enumerate this session's boards. |
| op=status / op=recover | Check or repair a placement after a lost response. Never redraw blindly. |

### Reads and routing

| Tool | Returns |
|---|---|
| `get_canvas_summary` | Document, active page, every page, and a semantic object summary. Start here. |
| `get_canvas_state` | Raw scene state. |
| `get_canvas_image` | PNG of the artboard or one object; `annotated=true` overlays boxes. The visual check. |
| `list_objects` | Object ids and types. |
| `get_object_properties` | Bounds and styles of one object; text also returns cap metrics and baselines. |
| `get_selection` | The selected objects and their properties. |
| `guide` | Route a brief to the workflow and 4–8 rules, with matched tokens and confidence. |

## What validate measures

`canvas` op=validate returns `issues` (errors, warnings) and `checks` — a passing check is still
reported, because it is the receipt that the rule was applied. Each check names the rule it
backs:

| Check id | Rule | Measures |
|---|---|---|
| `margin_ladder` | 08-negative-space | Smallest margin against the 8% floor; bottom should be largest. |
| `density` | 08-negative-space | 4×4 bounds occupancy; warns above 75%. |
| `level_census` | 24-typographic-hierarchy | Distinct text levels (size + weight + colour); four, five on a poster. |
| `type_steps` | 24-typographic-hierarchy | Adjacent size ratios; under 1.15× is one level, not two. |
| `alignment` | 07-alignment-and-proximity | Display text centre 0–8 px off the artboard axis. |
| `optical_centring` | 04-balance-and-proportion | Display text exactly on the geometric centre. |
| `contrast_floor` | 14-color-contrast | Text against its topmost solid background: 4.5:1 body, 3:1 large. |

## What has no op

State these as limits and give the visual check; do not invent a tool call:

- **Palette generation, ramps, hue shifts, palette locking.** Colour is a hex on an element. There
  is no ramp op and no palette-swap op.
- **Blur, grayscale, colour-blind simulation, squint tests.** `get_canvas_image` renders the
  artboard as it is; the reduction passes are a person looking, or an image edit outside Avnac.
- **Blend modes, masks, clipping paths, boolean path operations, direct node editing.** Vector
  `update` moves, scales, rotates, mirrors, restyles, reorders, deletes and adds whole objects —
  it does not move a handle. Redraw the object or add a corrected one.
- **CMYK, spot colour, PDF/X, bleed marks, dielines as production data.** Exports are PNG and SVG;
  print values are authored and checked in the document, then converted outside Avnac.
- **Tracking, kerning and OpenType features.** Text is set with `fontFamily`, `fontSize`,
  `fontWeight`, `fontStyle`, `lineHeight` and `textAlign`; there is no letter-spacing control, so a
  tracking instruction is a typeface choice or a manual line, not a value you can apply.
- **Non-text contrast.** `contrast_floor` measures text only; measure shape-against-shape pairs by
  hand with the WCAG formula.
- **Real text measurement at export time.** `elements` op=measure and `get_object_properties`
  metrics are the numbers the render uses; there is no separate PDF font embedding step.
