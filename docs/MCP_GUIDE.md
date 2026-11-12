# Avnac Studio MCP & AI Designer Guide

Avnac Studio includes a built-in Model Context Protocol (MCP) server that allows external AI agents (in Cursor, Claude Desktop, MCPJam Inspector, Windsurf, Antigravity, etc.) to automate, design, and manipulate graphics inside the desktop application in real-time.

> Building or changing the server? Read [MCP_ARCHITECTURE.md](MCP_ARCHITECTURE.md) — the
> developer map of the listener, the tool bridge, and the design-library resources.

---

## 1. Connection Details

The MCP server is **opt-in and secure by default**. Enable it in **Avnac Studio → Settings → MCP server**, then copy the connect URL and bearer token shown there. The server binds to **`127.0.0.1` on a fixed default port (`12345`)** so the connect URL stays stable across launches, falling back to a free port only when that one is taken (nothing is reachable from your network either way), and every API request requires a **bearer token** stored in the OS keyring (Windows Credential Manager / macOS Keychain / Secret Service).

| Transport | Endpoint URL | Use With |
|---|---|---|
| **Streamable HTTP (Recommended)** | URL from Settings (e.g. `http://127.0.0.1:12345/`) | Cursor, Claude Code, VS Code, MCPJam |
| **SSE (Legacy)** | URL from Settings + `/sse` | Legacy SSE clients |
| **Browser Status Page** | URL from Settings, opened in a browser | Verify the server is running (no token needed) |

Security model:

- **Loopback only** — the listener never binds a network interface, so LAN devices cannot reach it.
- **Bearer token required** — send `Authorization: Bearer <token>` with every request; regenerate the token any time from Settings.
- **No wildcard CORS** — web pages you visit cannot read or write MCP responses cross-origin.
- **DNS-rebinding protection** stays enabled (SDK defaults are restored).
- The server shuts down cleanly with the app (`OnShutdown`), so relaunching never hits a stale listener holding the port.
- **Request body cap** — every POST passes through `http.MaxBytesReader` after auth; requests over the **32 MiB** cap are rejected with HTTP `413` before any tool runs, and chunked bodies without a declared length are read only up to the cap.

### Client Configuration Examples

Replace the port and token with the values shown in Avnac Settings.

#### Cursor (`~/.cursor/mcp.json` or project `.cursor/mcp.json`)
```json
{
  "mcpServers": {
    "avnac-studio": {
      "url": "http://127.0.0.1:12345/",
      "headers": {
        "Authorization": "Bearer <token from Avnac Settings>"
      }
    }
  }
}
```

#### Claude Code (CLI)
```bash
claude mcp add --transport http avnac-studio http://127.0.0.1:12345/ --header "Authorization: Bearer <token from Avnac Settings>"
```

#### VS Code (`.vscode/mcp.json`)
```json
{
  "servers": {
    "avnac-studio": {
      "type": "http",
      "url": "http://127.0.0.1:12345/",
      "headers": {
        "Authorization": "Bearer <token from Avnac Settings>"
      }
    }
  }
}
```

#### MCPJam Inspector
- **Transport**: Streamable HTTP (or SSE)
- **URL**: the URL shown in Avnac Settings
- **Headers**: `Authorization: Bearer <token from Avnac Settings>`

> **Claude Desktop** currently only launches `stdio` servers and cannot connect to this HTTP endpoint. Support for stdio-only clients may arrive later as a small relay; the HTTP server above already covers Cursor, Claude Code, and VS Code.

---

## 2. Built-in MCP Prompts

Avnac Studio advertises three user-triggered prompts through the MCP Prompts protocol. They exist
because prompts are the only primitive a client turns into a slash command: the text lands in the
conversation even when the model would not have gone looking for it.

Each prompt is **generated from the design library at request time**, not hand-written. The
server routes the brief with the same router the resources use, then embeds the matching workflow
(`poster`, `logo`, `create`, `edit`, `critique`, ...) plus its rule links and this app's tool
mapping. A poster brief therefore gets the poster workflow; a logo brief gets the logo workflow.

1. **`design-graphic`**:
   - **Arguments**: `topic` (required), `dimensions` (optional), `style` (optional).
   - **Description**: Starts a design task. Routes on the brief, embeds the matched workflow and
     the rules it links, and closes with the render-verification gate. When `dimensions` is
     omitted the prompt asks the agent to derive the size from the brief and state it.
2. **`edit-canvas`**:
   - **Arguments**: `instruction` (required, e.g. *"Change the color scheme to dark mode and center the title"*).
   - **Description**: Routes to the edit workflow, inspects the live canvas with `get_canvas_summary`,
     maps object IDs, applies targeted `elements` op=modify updates, and forbids recreating the design.
3. **`design-audit`**:
   - **Description**: Routes to the critique workflow; reads the canvas summary and an annotated
     screenshot, critiques intent match, balance, contrast, margins and hierarchy, makes one
     corrective pass, and reports pass/fail per requirement with a verdict.

Because the workflow text comes from the library, editing a `SKILL.md` or a rule changes the
prompts too — there is no second copy to keep in sync.

---

## 3. Skill & Agent Instructions

The repository includes a standardized skill specification for agents:
- [`skills/avnac-designer/SKILL.md`](../skills/avnac-designer/SKILL.md)

It also ships a **graphic design knowledge and production library**, embedded in the Go binary
and routed programmatically:

- [`internal/skill/SKILL.md`](../internal/skill/SKILL.md) — entry point, routing table and always-on gates.
- `internal/skill/<task>/SKILL.md` — 21 task workflows (poster, logo, brand, color, typography, layout, print, export, ui, ...).
- [`internal/skill/references/`](../internal/skill/references/) — 14 compact lookup notes: thresholds, tables, format specs.
- [`internal/skill/rules/`](../internal/skill/rules/) — 112 authoritative, applied design principles, grouped by domain.

[`internal/skill/skill.go`](../internal/skill/skill.go) embeds the markdown, parses it once, and
routes work: `skill.Default()` then `lib.Plan(task, 0)` returns the matching task workflow plus
the rules it links, ready to inject into a model context. `lib.Validate()` asserts the structural
contract (names, section order, cross-links, the 120-rule ceiling) and is exercised by
[`skill_test.go`](../internal/skill/skill_test.go).

### Design knowledge resources

The server also publishes the whole library as MCP **resources**, so a client that installs
nothing still reads it on demand:

| URI | Contents |
|---|---|
| `skill://avnac-design` | Entry point: routing table, always-on gates, how to read a rule |
| `skill://<task>` | 21 task workflows — `skill://poster`, `skill://ui`, `skill://print`, ... |
| `references://<subject>` | 14 lookup notes — `references://typography`, `references://color`, ... |
| `rules://<id>` | 112 authoritative principles — `rules://24-typographic-hierarchy`, ... |
| `rules://index` | Every rule by domain, with counts |

All are `text/markdown`. Relative links in the served markdown are rewritten into these URIs, so
an agent reading `skill://poster` can follow `rules://34-composition-techniques` directly. The
connect instructions carry a compact index (one line per tier) instead of all 112 rules;
`rules://index` names the rest without spending context up front.

Registration lives in [`avnac-system/mcp/resources.go`](../avnac-system/mcp/resources.go) and is
covered end to end (list + read over an in-memory transport) by
[`resources_test.go`](../avnac-system/mcp/resources_test.go).

When connected, the MCP server also automatically transmits `Instructions` to the LLM upon initialization, ensuring any connected agent understands the coordinate system, element schemas, and recommended design practices without manual prompt engineering.

---

## 4. Key Tools (12 Tools)

The published surface is noun-shaped. Six **read** tools keep one name per operation; six
**mutation** tools map to a domain and take an `op`. Every op returns the same payload the old
one-tool-per-action surface returned, and the legacy action name is accepted as an `op` value
(e.g. `op: "render_elements"`), so older habits still work.

### Reads (6)

- `get_canvas_summary`: Token-efficient artboard + object summary. Returns a no-scene error when nothing is open — call `canvas` op=create, or `files` op=list + `files` op=open.
- `get_canvas_state`: Raw scene state.
- `get_canvas_image`: PNG screenshot of the artboard, or `objectId` to crop to one object; `annotated=true` overlays boxes.
- `list_objects`: Object ids and types on the canvas.
- `get_object_properties`: Bounding box and styles of one object. Text nodes also return `metrics` — measured `ascent`, `descent`, `capHeight`, and absolute `baseline`, `capTop`, `capCenterY` — so an agent can align to the letters instead of the text box.
- `get_selection`: Ids and properties of the current selection.

### Mutations (6, `op`-based)

**`canvas`** — artboard lifecycle:
- `create` (`width`, `height`, `name`, `backgroundColor`/`color`) — starts a new canvas and navigates to it. The background is applied here; do not also call `background`.
- `clear` — removes every object, returns `clearedCount`.
- `background` (`backgroundColor`/`color`) — sets the page background.
- `preset` (`presetId`/`preset`) — `ig-square`, `ig-portrait`, `ig-story`, `hd`, `twitter-post`, `linkedin`, `youtube-thumb`, `a4-300`, `custom-4000`.

**`elements`** — create or change elements:
- `render` (`elements[]` or a JSON-encoded string, `includePreview`) — one declarative batch, bottom to top. Images take `fit` (`fill` default, or `cover`), `focalPoint` (`{x,y}`, normalized 0–1) and `crop` (`{x,y,width,height}`, normalized source rect that wins over fit); without them the photo keeps the old stretch behaviour. Types: `rect`, `ellipse`, `circle`, `polygon`, `star`, `line`, `text`, `image`, `sticker`. Text supports `textAlign`, `fontWeight`, `fontStyle`, `lineHeight`, `underline`; lines use `stroke`/`strokeWidth`. When `modify` changes a text `fontSize`, pass `width` too — the auto-measured width is kept and larger type re-wraps. Elements that cannot be built are reported in `skipped` by index and type; a batch that creates nothing fails (`isError: true`).
- `modify` (`modifications[]` or a JSON-encoded string, `includePreview`) — updates by `objectId`, including text controls.
- `delete` (`objectId`/`id`; omit to delete the current selection).\n- `measure` (`elements[]`) — returns width, height, line count, line breaks, `capHeight`/`ascent` and (with `x`/`y`) absolute `baseline`/`capTop`/`capCenterY` for proposed elements **without drawing**. Use it to check wrapping or fit a headline before rendering; for images it returns natural dimensions.

**`arrange`** — the current selection:
- `align` (`type`: `left`, `center`, `right`, `top`, `middle`, `bottom`, `cap-middle`). Single selection aligns to the artboard, multiple to each other. `cap-middle` is optical: it centres the other selected objects on the cap-height band of the first selected text object — the letters, not the text box — and fails rather than falling back to box centring.
- `distribute` (`direction`: `horizontal`/`vertical`) — needs 3+ selected objects.
- `group` (`objectIds`, min 2) / `ungroup` (`groupId`).
- `fit` (`padding`) — scales the selection to the artboard.
- `select` (`objectIds`) — selects by id.

**`files`** — saved canvases:
- `list` — `{id, name, width, height, updatedAt}`; works with no canvas open.
- `open` (`fileId`/`id`/`workspaceId`) — opens a file and makes it the active scene; unknown ids name where to look.
- `rename` (`fileId`, `name`) — renames the saved file and the live editor title when open.

**`assets`** — external assets:
- `unsplash` (`query`, `page`, `perPage`) — compact photo records plus remaining hourly quota. Identical queries are served from a two-minute cache. Placement through `elements` op=render is what fires Unsplash download tracking and stores the credit, which `get_canvas_summary` then lists.
- `fonts` — supported Google Fonts. Prefer `Poppins`, `Inter`, `DM Serif Display` for reliable rendering.
- `stickers` — built-in sticker names.

**`export`** — output:
- `png` (`multiplier`, `transparent`) — base64 PNG of the artboard.
- `object` (`objectId`, `multiplier`) — PNG of one object or group. SVG object export is not supported over MCP yet.

### Errors

A missing `op` fails schema validation; an unknown `op` names the allowed values; an op from the
wrong group fails the same way. Per-op required fields are validated by the existing decoders,
which name the missing field. Flexible input still applies: numeric strings for pixel values,
numeric font weights, and JSON-encoded arrays for `elements`/`modifications`/`objectIds`.