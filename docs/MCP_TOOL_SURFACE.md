# MCP tool surface: Avnac vs SpriteWare

**Question:** Avnac exposes 27 tools; SpriteWare exposes 14 for a comparably deep editor. Is
SpriteWare's op-based design better for Avnac, and what would adopting it cost?

**Short answer:** SpriteWare's count is low because its domain has a fixed noun model and it pushes
*verbs* into an `op` field, not because it exposes less. Avnac should adopt the pattern selectively —
batch the mutation verbs into one transactional tool — but should not collapse reads into a single
mega-tool. A 27 → ~13 surface is the realistic win; 27 → 7 would trade discoverability for a schema
nobody can read.

---

## 1. What SpriteWare actually does

Source: `internal/tools/service.go` (registry) and `internal/tools/drawing.go` (op dispatch).

14 tools, declared in one ordered `Catalog`:

| Tool | Domain noun | Verbs hidden behind `op` / `ops` |
|---|---|---|
| `doctor` | connection | probe, report |
| `sprite` | document | open, create, save, close, inspect |
| `layer` | layer | create, rename, reorder, group, merge |
| `cel` | pixels-in-a-layer | (implicit per-op) |
| `frame` | animation | add, duplicate, retime, reset |
| `tag` | frame range | name, retime |
| `slice` | named rectangle | 9-patch, bbox |
| `draw` | pixels | **20 kinds**: pixels, rect, line, polyline, ellipse, clear, replace, remap, frame, grid, text, outline, shade, blit, shift, fill, dither, gradient, hue_shift, desaturate |
| `select` | clip region | set, clear |
| `transform` | whole cel | flip, rotate, scale, translate, crop |
| `look` | observation | preview, ascii, filmstrip, diff, onion, compare |
| `validate` | lint | (none; checks everything) |
| `palette` | colour | ramps, analyse, snap, adopt |
| `export` | output | PNG, sequence, SVG, GIF, sheet, tileset |

Three mechanics make it work:

1. **Tools are nouns; verbs are `op` values.** The model picks a domain ("I am drawing pixels"),
   then a verb inside it. A new drawing kind is a new enum value, not a new tool — so the surface
   grows in *documentation*, not in *tool count*.
2. **Batching is transactional.** `draw` takes `ops: [...]` and applies the whole array as one
   edit: "the user's Ctrl+Z undoes the whole edit rather than one pixel of it." That is the
   strongest argument for the pattern — it is about *correctness of undo*, not aesthetics.
3. **One result envelope.** `ok(structured, summary)` returns structured content plus a
   human-readable line; `fail(err)` returns coded errors with remediation. Every tool looks the
   same to a client.

The guard rail is explicit: `const maxTools = 24`, enforced by `tools_test.go`. The ceiling is a
budget the project chose, not a property of the protocol.

**Cost they accept:** the `draw` description is ~200 words because it enumerates 20 kinds, and
`grid`/`text` kinds need compiled handling before dispatch. Fewer tools does not mean less context
— it moves cost from the tool list into one tool's schema and description.

---

## 2. What Avnac does

27 tools, one verb each, registered in `avnac-system/mcp/tools.go`:

| Family | Tools | Count |
|---|---|---|
| Canvas lifecycle | `create_canvas`, `clear_canvas`, `set_background`, `apply_artboard_preset` | 4 |
| Read / inspect | `get_canvas_summary`, `get_canvas_state`, `get_canvas_image`, `list_objects`, `get_object_properties`, `get_selection` | 6 |
| Compose | `render_elements`, `modify_elements`, `delete_object` | 3 |
| Arrange | `align_objects`, `distribute_objects`, `group_objects`, `ungroup_objects`, `fit_to_artboard`, `select_objects` | 6 |
| Files | `list_files`, `open_canvas`, `rename_file` | 3 |
| Assets | `search_unsplash`, `get_font_list`, `list_stickers` | 3 |
| Export | `export_png`, `export_object` | 2 |

Each has its own JSON schema, its own aliases, and its own error path. That is good for selection
accuracy (a model picking `group_objects` cannot accidentally delete), but it costs:

- **Undo granularity.** `render_elements` + `align_objects` + `group_objects` = three calls, three
  undo steps for one design action.
- **Round trips.** Each call crosses Go → Wails event → React → store → response.
- **Context.** Every tool's name, description and schema is present on every turn.

---

## 3. What would actually improve Avnac

Adopt mechanics 1–3 for *state-changing* verbs, keep reads granular.

### Proposed surface (27 → 12)

| Tool | `op` values | Notes |
|---|---|---|
| `canvas` | `create`, `clear`, `background`, `preset` | lifecycle; one call per setup |
| `inspect` | `summary`, `state`, `objects`, `object`, `selection`, `image` | reads stay one op each; keeps `annotated`/`objectId` |
| `elements` | `render`, `modify`, `delete` | **transactional batch**: ops apply as one undo step |
| `arrange` | `align`, `distribute`, `group`, `ungroup`, `fit`, `select` | align gains `cap-middle` |
| `files` | `list`, `open`, `rename` | |
| `assets` | `unsplash`, `fonts`, `stickers` | |
| `export` | `png`, `object` | |

That is 6 tools if fully collapsed. I recommend stopping at **12**: keep `inspect` split
(`get_canvas_summary`, `get_canvas_image`, `list_objects`, `get_object_properties`,
`get_selection`, `get_canvas_state`), because:

- reads are already cheap, side-effect free, and heavily used;
- `get_canvas_image` returns an image content block and has a different result shape;
- a single `inspect` op with 6 shapes makes the model choose an op *and* remember which fields
  apply to it — the exact ambiguity the op pattern introduces.

So: 6 inspect + 6 verb tools = 12 tools, down from 27.

### What each side gains

| | Current 27 | 12 with ops |
|---|---|---|
| Tool-list context | ~27 schemas | ~13 schemas, 2–3 longer descriptions |
| Undo steps for one composition | 3–6 | 1 for `elements`, 1 for `arrange` |
| Round trips for a create+align+group flow | 3 | 2 |
| Selection accuracy | verb-per-tool is unambiguous | op enum is the new ambiguity risk |
| Adding a new verb | new tool + schema | new enum value + docs |

### Migration path (low risk, incremental)

1. **`elements` first.** It has the clearest transactional story: `ops: [{op:"render"}, {op:"modify"}]`
   applied to one `applyCommands` batch → one undo step. Frontend action names stay unchanged;
   the Go tool loops over ops and calls the existing handlers. This alone removes 2 of 27 tools
   and proves the undo claim.
2. **`arrange` second.** Same shape, and `align` is where `cap-middle` lands.
3. **`canvas`, `files`, `assets`, `export` last.** These are small and rarely called; consolidating
   them saves little, so do them only if the first two are well received.
4. Leave `inspect` granular permanently unless the tool list is still a measured problem.

Keep `maxTools = 24` as a documented ceiling and add a test like SpriteWare's so the surface cannot
quietly regrow.

### What not to copy

- **Do not collapse reads into `inspect`** just to hit a number. SpriteWare's `look` can be one tool
  because every op returns a picture or a text render; Avnac's reads return five different shapes.
- **Do not copy the raw JSON schema strings.** SpriteWare hand-writes schemas because its ops are a
  union; Avnac's typed `objSchema` + flexible decoding already handles loose clients well.
- **Do not put `op` on every tool.** Only batch calls that share a transaction and a result shape.

---

## 4. Recommendation

| Step | Do it now? | Why |
|---|---|---|
| Keep `cap-middle` + text metrics as separate read/align capability | done | correct, testable, small |
| Batch `render_elements` + `modify_elements` + `delete_object` into `elements` with `ops[]` | next | biggest undo/round-trip win, contained change |
| Batch `align` / `distribute` / `group` / `ungroup` / `fit` / `select` into `arrange` | after | same mechanic, slightly more surface |
| Collapse `canvas` / `files` / `assets` / `export` | optional | small benefit, real churn |
| Collapse `inspect` | no | reads differ in shape; granular is better |

Net target: **12 tools**, one transactional `elements` call per composition, and a documented
ceiling that keeps the number honest.
