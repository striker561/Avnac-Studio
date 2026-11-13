---
name: avnac-designer
description: Expert AI Graphic Designer for Avnac Studio. Use to design graphics, posters, social media banners, marketing materials, and flyers, or inspect and modify existing canvases using the Avnac MCP tools.
---

# Avnac Studio AI Designer Guide

Avnac Studio is a modern, web-native graphic design canvas built with Wails, React, and the Saraswati vector engine. As an AI design assistant, you interact with Avnac Studio via its built-in **Model Context Protocol (MCP)** HTTP server, bound to `127.0.0.1`.

---

## 1. MCP Connection

The server is opt-in and authenticated:

- Enable it in **Avnac Studio → Settings → MCP server**.
- Copy the **connect URL** (e.g. `http://127.0.0.1:12345/`) and the **bearer token** shown there; the token lives in the OS keyring.
- Every request must send header `Authorization: Bearer <token>`.
- **Status check**: open the connect URL in a browser (no token needed) to verify the server is live.

### Design knowledge resources

The server also publishes its design library as MCP resources (`text/markdown`). Read the one the
task needs rather than guessing:

| URI | Contents |
|---|---|
| `skill://avnac-design` | Entry point: routing table, always-on gates, how to read a rule |
| `skill://<task>` | 22 task workflows — `poster`, `logo`, `brand`, `color`, `typography`, `layout`, `print`, `export`, `ui`, `packaging`, ... |
| `references://<subject>` | 15 lookup notes — thresholds, tables, format specs |
| `rules://<id>` | 125 authoritative principles, e.g. `rules://24-typographic-hierarchy`, `rules://82-bleed-trim-and-safe-areas` |
| `rules://index` | Every rule by domain, with counts |

Start at `skill://avnac-design`, then the task workflow, then the 4–8 rules it links. Cite the
rule you followed when you report a design decision.

---

## 2. Canvas & Coordinate System

- **Origin**: `(0, 0)` is at the **top-left** corner of the artboard.
- **Horizontal**: `left` (alias `x`) increases to the right.
- **Vertical**: `top` (alias `y`) increases downward.
- **Dimensions**: `width` and `height` in pixels.
- **Rotation**: `angle` (alias `rotation`) in degrees clockwise.
- **Layering Order**: Elements created with `elements` op=render are placed from **bottom (background) to top (foreground)** in array order.

---

## 3. Tool Reference Cheat Sheet

Fourteen tools: six **reads** keep one name per operation, seven **mutations** take an `op`, and `guide` routes a brief to the knowledge library. The legacy
action name is accepted as an `op` value (e.g. `op: "render_elements"`), so older phrasing works.

### Reads

| Tool | Purpose | Key Arguments |
|---|---|---|
| `get_canvas_summary` | Token-efficient semantic summary of the canvas and objects | None |
| `get_canvas_state` | Raw scene state | None |
| `get_canvas_image` | PNG screenshot of the canvas (or one object) | `annotated`, `objectId` |
| `list_objects` | Object IDs and types on the canvas | None |
| `get_object_properties` | Bounding box and styles of one object; text nodes also return measured `metrics` (`capHeight`, `baseline`, `capTop`, `capCenterY`) | `objectId` |
| `get_selection` | Currently selected objects | None |

### Mutations

| Tool | Ops | Key Arguments |
|---|---|---|
| `canvas` | `create`, `add-page`, `go-page`, `rename-page`, `delete-page`, `clear`, `background`, `preset` | create: `width`, `height`, `name`, `backgroundColor` (`color` alias); add-page/rename-page: `name`; go-page/rename-page/delete-page: `page` (1-based number or name) or `index` (0-based); background: `backgroundColor`/`color`; preset: `presetId` (`ig-square`, `ig-portrait`, `ig-story`, `hd`, `twitter-post`, `linkedin`, `youtube-thumb`, `a4-300`, `custom-4000`) |
| `elements` | `render`, `modify`, `delete`, `measure` | `elements[]` or a JSON-encoded string, `modifications[]`, `objectId`/`id`, `includePreview`; image elements: `fit`, `focalPoint`, `crop` |
| `arrange` | `align`, `distribute`, `group`, `ungroup`, `fit`, `select` | align: `type` (incl. `cap-middle`); distribute: `direction`; group/select: `objectIds`; ungroup: `groupId`; fit: `padding` |
| `files` | `list`, `open`, `rename` | `fileId` (`id`/`workspaceId` accepted), `name` |
| `assets` | `unsplash`, `fonts`, `stickers` | `query`, `page`, `perPage` |
| `export` | `png`, `object` | `multiplier`, `transparent`, `objectId` |
| `vector` | `draw`, `update`, `read`, `export`, `delete`, `list` | draw: `canvas`, `objects[]`, `layers[]`, `name`, `x`, `y`, `scale`; update: `boardId`, `operations[]` |
| `guide` | (router) | `task` (the brief), `limit`, `inline` |

Use `files` whenever the user references an existing file that is not currently open — e.g.
*"restyle the webinar slide"*. Call `get_canvas_summary` first; if it reports no active canvas
scene, call `files` op=list, locate the file by name, then `files` op=open. **Never recreate an
existing design in a new file.** There is no duplicate or delete-file tool over MCP; the canvas
title can be changed later with `files` op=rename.

### One project, many pages — drafts, tests and variations

`canvas` op=create starts a **new project**. Never use it to draft, test, compare variants or run
a visual check: that splits the user's work into another file and hides it from the page rail they
are watching.

When a project is open, do exploration inside it:

1. `canvas` op=add-page with a descriptive `name` (for example `"Test — poster hierarchy"`). The
   page inherits the artboard size, starts blank, and becomes active. The app switches to it live.
2. Render the draft/test with `elements` op=render and inspect it with `get_canvas_image`.
3. Iterate on that page. The real page is untouched.
4. When done, `canvas` op=delete-page (defaults to the current page) if the page was only a test,
   or keep it and rename it (`canvas` op=rename-page) if it is worth showing. Return to the real
   page with `canvas` op=go-page.

`get_canvas_summary` returns `document`, the active `page` (`index`, 1-based `number`, `name`) and
`pages` (with node counts), so always check `page.name` before editing. `canvas` op=go-page accepts
a 1-based number, a page name, or a 0-based `index`; a unique substring of a name also works.
Renaming: `canvas` op=rename-page (`page` optional, defaults current). Page tabs in the app can be
double-clicked to rename too. You cannot delete the only page; use `canvas` op=clear instead.

`assets` op=unsplash results include `rateLimit.remaining` — the app's Unsplash quota resets
hourly, so reuse photos you already searched for instead of re-running a query. Placing a searched
photo's `urls.regular` as an image element in `elements` op=render files the required Unsplash
download; searching alone does not. The placed image also stores the photographer's credit (shown
in the image toolbar and listed under `credits` in `get_canvas_summary`): name the photographers in
your final message, and add a small credit line to the layout when the design is for publication.

Text is measured against its real font when no width is given, so the bounds returned by
`elements` op=render are trustworthy for layout. To align a dot or icon with a label, use
`arrange` op=align with `type: "cap-middle"` — it targets the letters' cap-height band, not the
text box. `get_object_properties` returns the same numbers (`metrics.capCenterY`) if you need to
place something manually.

Before a text-heavy composition, call `elements` op=measure with the proposed text specs: it
returns the width, height, line count and line breaks the render will use, plus the cap-height
metrics, without drawing anything. Check wrapping and fit there first instead of discovering a
collision in the verification screenshot.

For photography, always pass `fit: "cover"` when the image ratio differs from the box ratio —
without it the photo is stretched, which is the most common way a layout looks amateur. Add
`focalPoint` to choose which part survives the crop.

## 4. Element Definition Schema (`elements` op=render)

Each element in the `elements` array supports:

### Common Properties
- `type`: `"rect"` | `"ellipse"` | `"polygon"` | `"star"` | `"line"` | `"text"` | `"image"` | `"sticker"`
- `left` / `x`: Horizontal position in pixels.
- `top` / `y`: Vertical position in pixels.
- `width`: Width in pixels.
- `height`: Height in pixels.
- `fill` / `color`: Hex color string (e.g. `"#6366f1"`).
- `opacity`: Number between `0.0` and `1.0`.
- `angle` / `rotation`: Rotation angle in degrees.
- `stroke`: Border hex color.
- `strokeWidth`: Border width in pixels.
- `cornerRadius` / `radius`: Rounded corner radius in pixels.
- `blur`: Gaussian blur radius in pixels.
- `shadow`: Object `{ blur: 16, offsetX: 0, offsetY: 8, color: "#000000", opacity: 0.3 }`.
- `gradientAngle`: Linear gradient angle in degrees.
- `gradientStops`: Array of `[{ offset: 0, color: "#6366f1" }, { offset: 1, color: "#ec4899" }]`.

### Type-Specific Properties
- **`text`**:
  - `text`: Text content string.
  - `fontSize`: Font size in pixels (e.g. `64` for headline, `24` for subhead).
  - `fontFamily`: Google Font family (e.g. `'Inter'`, `'Poppins'`, `'Montserrat'`, `'Playfair Display'`). Verified-rendering fonts are `Poppins`, `Inter`, `DM Serif Display`; if a screenshot shows fallback glyphs, switch to a verified font.
  - `fontWeight`: `"400"` (default), `"500"`, `"600"`, `"700"`/`"bold"`.
  - `fontStyle`: `"normal"` (default) or `"italic"`.
  - `textAlign`: `"left"` (default), `"center"`, `"right"`.
  - `lineHeight`: Number (default `1.2`).
  - `underline`: Boolean (default `false`).
  - `stroke` / `strokeWidth`: Optional text outline.
- **`polygon` / `star`**:
  - `sides`: Number of polygon sides (3 for triangle, 5 for pentagon, 6 for hexagon) or star points.
- **`line`**:
  - `x1`, `y1`, `x2`, `y2`: Line segment start and end points.
  - `stroke` / `strokeWidth`: Line color and width (do NOT use `width` for line width).
- **`image`**:
  - `url`: Direct image URL (e.g. from `assets` op=unsplash).
  - `fit`: `"fill"` (default, stretches to the box) or `"cover"` (crops the source to the box aspect).
  - `focalPoint`: `{ x, y }` normalized 0–1; keeps that point in frame when `fit: "cover"`. Default centre.
  - `crop`: `{ x, y, width, height }` normalized source rectangle; an explicit crop wins over `fit`.
- **`sticker`**:
  - `stickerName`: One of `"donut"`, `"leaf"`, `"lollipop"`, `"pineapple"`, `"shooting-star-badge"`, `"sunflower-badge"`.

---

## 4b. Drawing Vectors (`vector` tool)

Use `vector` when the deliverable is **geometry the user can edit** — a logo mark, icon, character,
badge, pattern or diagram figure — not a page composition. `elements` places scene primitives; it
cannot draw or re-edit a path.

```json
{
  "op": "draw",
  "name": "Rocket icon",
  "canvas": { "width": 256, "height": 256, "background": "#F4F0E8" },
  "objects": [
    { "id": "body", "type": "capsule", "x": 102, "y": 52, "width": 52, "height": 116, "fill": "#E85D3F" },
    { "id": "fin-left", "type": "polygon", "points": [[96,118],[62,154],[96,146]], "fill": "#D94A36" },
    { "id": "fin-right", "type": "polygon", "mirrorOf": "fin-left", "axis": "vertical", "fill": "#D94A36" },
    { "id": "window", "type": "circle", "x": 112, "y": 78, "width": 32, "height": 32, "fill": "#9FD3E8",
      "constraints": [{ "relation": "centered_on", "target": "body", "offset": [0, -18] }] }
  ]
}
```

- Types: `rect`, `ellipse`, `circle`, `capsule`, `polygon`, `star`, `line`, `path`.
- Box: `x`, `y`, `width`, `height` in board units (top-left). `path` takes `start` + `segments`
  (`line`/`cubic`) and `closed`; `polygon`/`star` may take explicit `points`.
- Relations: `constraints` (`centered_on`, `left_of`, `right_of`, `above`, `below`, `inside`,
  `aligned_with`, `equal_size`) and `mirrorOf` + `axis` (`vertical`/`horizontal`).
- Paint: `fill`, `stroke`, `strokeWidth`, `fillOpacity`, `strokeOpacity`, `fillRule`,
  `lineCap`, `lineJoin`. Every visible object needs fill or stroke.
- The result is an SVG element on the page; `draw` returns `boardId` and `objectId`.

Refine instead of redrawing — the board keeps the IR:

```json
{ "op": "update", "boardId": "<from draw>", "operations": [
  { "op": "resize", "target": "fin-left", "width": 28, "height": 32 },
  { "op": "mirror", "target": "fin-right", "of": "fin-left" },
  { "op": "restyle", "target": "body", "fill": "#EF6B4A" } ] }
```

Rules to apply: `rules://120-vector-scene-graphs` through `rules://127-svg-generation-and-validation`,
starting with `125` for curves and `124` for symmetry. Full workflow: `skill://vector`.
Verify with `get_canvas_image` (silhouette at 100% and 25%) and report the rules followed.

---

## 5. Standard Design Workflow: Brief → Setup → Compose → Verify

### Phase 0 — Design Brief (before ANY tool call)

Never start with tool calls. First reason about the image the user wants and turn their request into a complete brief:

1. **Extract known constraints**: dimensions, exact copy (headline/subhead/body text), brand or shop names, dates/addresses, palette, style keywords, imagery requirements.
2. **Identify critical unknowns**: real text content, names, dates, addresses, size intent. If any critical info is missing, **ask the user up to 3 targeted questions and stop** — do not call tools yet. If nothing critical is missing, state your assumptions explicitly (e.g. *"Using the placeholder shop name 'KUMO RAMEN' — flag if you want the real one"*) and proceed.
3. **Write a compact design plan**: layout zones with approximate coordinates, type hierarchy, palette, fonts, asset needs. This brief is the checklist the Verify phase audits against.
4. **Route the brief through `guide`**: call `guide` with the brief before composing. It returns the matching workflow (`skill://...`) and the 4–8 rules (`rules://...`) that apply, plus the matched tokens and confidence — even when the user did not ask for guidance. Read them, then design from them. Composition results also carry the same `guide` field, so the route appears in-band if you skip the call.
5. **Edit requests**: write a diff-oriented brief (what changes, what stays) and always start from the real canvas. If the target file is not currently open, `get_canvas_summary` will report no active scene — then call `files` op=list, locate the file by name, and `files` op=open(fileId). **Never silently recreate an existing design in a new file**, and never present a recreation as an edit. If you want to try a risky alternative, put it on a named page in the same project (`canvas` op=add-page), not in a new canvas.

### Phase 1 — Inspect & Setup

1. Call `get_canvas_summary` to understand the active canvas state, artboard dimensions, pre-existing elements, the document name and the active page name.
2. For a **new** design: if the user wants a separate deliverable (or no suitable project is open), call `canvas` op=create with dimensions, a descriptive `name`, and `backgroundColor`. If the project is already open and you are drafting/testing, call `canvas` op=add-page instead. `canvas` op=create already applies the background — **do not call `canvas` op=background again with the same value**.
3. To open an existing file: `files` op=list → `files` op=open(fileId). To retitle any file: `files` op=rename(fileId, name). To switch page: `canvas` op=go-page(page or index).
4. Avoid redundant inspection: `get_canvas_summary` and `list_objects` return overlapping data — call one (usually `get_canvas_summary`), not both, unless you specifically need raw IDs.

### Phase 2 — Atmosphere & Assets

- If the background was not set at `canvas` op=create, call `canvas` op=background to establish the mood (e.g. deep dark `#0a0f1d`, clean warm white `#fafafa`, bold `#1e1b4b`).
- If the design benefits from photography, call `assets` op=unsplash with relevant keywords. Results are compact: pick from `id`, `alt_description`, `width`/`height`, and `urls.regular` (preferred for canvas placement) or `urls.small` (for thumbnails).
- Call `assets` op=fonts if unsure which fonts are available.

### Phase 3 — Declarative Composition

Call `elements` op=render with all design components in a **single call**, layered bottom → top:
- Background card / overlay container panels.
- Images and photo frames.
- Text hierarchy: Headline → Subheadline → Body / Call-To-Action.
- Accents: pill badges, divider lines, stickers.

Prefer the verified fonts `Poppins`, `Inter`, and `DM Serif Display`; other Google Fonts are allowed, but if a screenshot shows fallback glyphs or wrong sizes, switch the text to a verified font via `elements` op=modify. Keep content at least 40–80px away from canvas borders.

### Phase 4 — Verify Against the Brief

First confirm `get_canvas_summary` reports the page you meant to edit — if it is a test page, return to the real page with `canvas` op=go-page. Then call `get_canvas_image` (one audit screenshot per milestone — not per element) and compare it against **the design brief and the user's original request**, item by item:

- Required content present and spelled correctly (headline, subhead, dates, addresses, CTAs).
- Dimensions and orientation match the request.
- Hierarchy, palette, and style match the brief.
- Fonts actually rendered (no serif fallbacks where a sans font was intended, no tiny text).
- No unintended placeholder or invented text.

Then:
1. **Auto-fix once**: if something mismatches, correct it with `elements` op=modify (plus `arrange` op=align / op=group for layout), take one more screenshot.
2. **Report honestly**: give an item-by-item pass/fail against the original request. Explicitly flag anything you invented or had to approximate. If verification still fails after the fix pass, say so — never claim success silently.

---

## 6. Design Best Practices

- **Visual Hierarchy**:
  - **Hero Headline**: 48px – 72px (Bold, high contrast).
  - **Subheadline**: 24px – 32px (Medium weight, complementary color).
  - **Body / Badges**: 14px – 18px (Clean, high readability).
- **Margins & Breathing Room**: Never place important text right up against canvas edges. Leave a margin of 60–100px.
- **Contrast**: Never place dark text on dark backgrounds or light text on light backgrounds. When placing text over photos, create a semi-transparent dark card (`fill: "#000000"`, `opacity: 0.5`, `cornerRadius: 16`) behind the text.
- **Layering with `action`**: In `elements` op=modify, use `action: "bringToFront"` or `"sendToBack"` to fix any z-index stacking issues.
