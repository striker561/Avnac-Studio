---
name: avnac-designer
description: Design or edit graphics in Avnac Studio — posters, flyers, social posts, banners, logos, packaging, UI screens, print files. Use when the user asks for a visual deliverable or to inspect or change an open canvas.
---

# Avnac Studio Designer

Avnac is a design canvas driven over MCP at `127.0.0.1`. The design knowledge lives in
MCP resources, not in this file: this file is the procedure, the resources are the content.

## 0. Read first — mandatory, in this order

Every design task runs these steps before the first composition call:

1. `guide(task=<the brief>)` — route the brief. Returns the workflow URI, the rules, and the
   Verification lines of the top three rules in `checks`; always-on `gates` ride along.
2. Read `skill://<task>` (the workflow). Its "Rules to apply" list is the reading set.
3. Read the rules behind `checks`, and any the workflow links that name your fault. Every rule
   opens with its **Avnac ops** paragraph and its first check is the **Ops receipt** — run the
   command, then read the reason. Open the rule when a check needs more than the receipt.
4. Compose (`canvas` → `elements`).
5. `canvas op=validate`, then `get_canvas_image`. Report pass/fail per check and name the rules.

- **No confident route?** Read `skill://avnac-design` and pick the closest workflow, then
  `rules://index`. "No match" is not permission to design from memory.
- **You cannot skip the route.** Without one, `validate` returns `guideReceipt` with every rule
  pending and `readNext` naming the rules your artifact needed — the omission is reported, not hidden.
- **Do not invent citations.** If you cannot name the rule you applied, you did not apply one.

## 1. Connection

Opt-in in **Settings → MCP server**. Copy the URL and bearer token; send
`Authorization: Bearer <token>` on every request. The connect URL opens in a browser without a
token as a liveness check.

## 2. Canvas

- Origin top-left, `x`/`left` right, `y`/`top` down, pixels. Elements render bottom → top in array order.
- **One project, many pages.** `canvas` op=create is a new project — only for a new deliverable.
  Drafts, tests and variants go on `canvas` op=add-page (named), then `op=delete-page` or keep.
- Always confirm `get_canvas_summary` reports the page you mean (`page.name`) before editing.
- Existing file not open? `files` op=list → `files` op=open. Never recreate an existing design in a
  new file. Retitle with `files` op=rename; there is no delete-file over MCP.

## 3. Tools

Fourteen tools: six reads, seven `op` mutations, and `guide`. Legacy action names work as `op`.
Every rule and workflow is built around these ops; `references://avnac-ops` is the catalogue,
including the operations that do not exist (no palette, mask, blend or PDF op).

| Tool | Use |
|---|---|
| `get_canvas_summary` | Start here: document, active page, objects |
| `get_canvas_image` | PNG of the artboard or one `objectId` — the visual check |
| `get_object_properties` | One object's box/styles; text also returns `capHeight`/`capCenterY` |
| `get_canvas_state`, `list_objects`, `get_selection` | Raw scene, ids, selection |
| `canvas` | `create`, `add-page`, `go-page`, `rename-page`, `delete-page`, `clear`, `background`, `preset`, `resize`, `snapshot`, `restore`, `undo`, `redo`, `status`, `validate` |
| `elements` | `render`, `modify`, `delete`, `measure`; the schema is on the tool |
| `arrange` | `align` (incl. `cap-middle`), `distribute`, `group`, `ungroup`, `fit`, `select` |
| `assets` | `unsplash`, `fonts`, `stickers` |
| `export` | `png`, `object` (`multiplier`, `transparent`) |
| `vector` | `draw`, `update`, `read`, `export`, `delete`, `list` |
| `files` | `list`, `open`, `rename` |
| `guide` | Route a brief to the library |

## 4. Things the schema does not tell you

- **Text fit**: call `elements` op=measure before a text-heavy layout; it returns the width, line
  count and cap metrics the render will use. A text element with no width is auto-measured.
- **Optical alignment**: `arrange` op=align with `cap-middle` targets the cap-height band, not the
  box. `get_object_properties` exposes the same numbers when placing by hand.
- **Photography**: always `fit: "cover"` when the image ratio differs from the box; add
  `focalPoint` for what survives the crop. Unsplash results are cached per query — reuse them; the
  download is filed when the image is placed, not when searched. Name the photographer in your
  reply and add a credit line for publication.
- **Fonts**: `Poppins`, `Inter` and `DM Serif Display` are verified; if a screenshot shows fallback
  glyphs, switch the text to one of them.
- **Vectors**: `vector` draws editable geometry (marks, icons, characters, badges). Use
  `elements` for page composition; `vector` for paths. Read `skill://vector` first, refine with
  `op=update` by `boardId` instead of redrawing.

## 5. Workflow

1. **Brief** — extract constraints (size, exact copy, names, dates, palette, style, imagery). Ask up
   to three questions only if something critical is missing; otherwise state assumptions.
2. **Route** — step 0 above, before the first composition call.
3. **Set up** — `get_canvas_summary`; `canvas` op=create or op=add-page; background; assets.
4. **Compose** — one `elements` op=render call, background-first. Keep type at the sizes the route
   gives you; do not re-derive the scale here.
5. **Verify** — `canvas` op=validate (fix what it reports), then `get_canvas_image`; one screenshot
   per milestone, not per element.
6. **Report** — pass/fail per requirement and per failing check, the rules followed by id, anything
   invented or approximated. Never claim success silently.

For edits, write the diff first (what changes, what stays) and start from the real canvas.
