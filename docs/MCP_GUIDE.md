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
     maps object IDs, applies targeted `modify_elements` updates, and forbids recreating the design.
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

## 4. Key Tools Summary (27 Tools)

### File Management
- `list_files`: List all saved canvas files — `{id, name, width, height, updatedAt}`. Works even when no canvas is open.
- `open_canvas`: Open a saved file by workspace id (from `list_files`) and make it the active scene. Unknown ids return an error listing where to look.
- `rename_file`: Rename a saved file by workspace id; also updates the live editor title if the file is open.

### Setup & Canvas
- `get_canvas_summary`: Get token-efficient summary of the artboard and all objects. Returns `{error: "No active canvas scene..."}` when no canvas is open — call `create_canvas` first, or `list_files` + `open_canvas` to load an existing file.
- `create_canvas`: Initialize canvas with `width`, `height`, optional `backgroundColor` (`color` alias accepted) and `name`.
- `apply_artboard_preset`: Resize via `presetId` (`ig-square`, `ig-portrait`, `ig-story`, `hd`, `twitter-post`, `linkedin`, `youtube-thumb`, `a4-300`, `custom-4000`; `preset` alias accepted). Unknown ids return an error listing valid ids.
- `set_background`: Set canvas background via `color` (`backgroundColor` alias accepted). Returns the new background or a no-scene error. Not needed right after `create_canvas` when a background was passed there.
- `clear_canvas`: Remove all objects. Returns `clearedCount`.

### Assets & Photography
- `search_unsplash`: Search royalty-free photos and retrieve image URLs. Returns compact records (`id`, `alt_description`, `width`, `height`, `photographer`, `credit`, `urls.small`/`urls.regular`) and the remaining hourly quota in `rateLimit`. Identical queries are served from a two-minute cache. Unsplash's download call fires from `render_elements` when a searched photo's URL is actually placed — searching or previewing costs no download, and the photo's credit is stored on the placed image (listed under `credits` in `get_canvas_summary`).
- `list_stickers`: Get built-in sticker names (`donut`, `leaf`, `lollipop`, `pineapple`, `shooting-star-badge`, `sunflower-badge`).
- `get_font_list`: List supported Google Fonts. Prefer `Poppins`, `Inter`, and `DM Serif Display` for reliable canvas rendering.

### Creation & Editing
- `render_elements`: Create elements in one call (`rect`, `ellipse`, `polygon`, `star`, `line`, `text`, `image`, `sticker`). Text supports `textAlign`, `fontWeight`, `fontStyle`, `lineHeight`, `underline`. Lines use `stroke`/`strokeWidth` (not `width`). Elements that cannot be built are reported in `skipped` with their index and type; if nothing could be created the call fails (`isError: true`) instead of returning an empty success.
- `modify_elements`: Update properties by `objectId`, including text controls (`fontWeight`, `textAlign`, `lineHeight`, etc.).
- **Flexible inputs**: top-level keys and nested `elements[]` / `modifications[]` fields accept flexible forms — numeric font weights (`fontWeight: 700`), numeric strings for pixel values (`fontSize: "230"`), and object strokes (`stroke: {color: "#ff00ff"}`) alongside the string forms above.
- `delete_object`: Delete object by ID (omit to delete current selection).
- `align_objects`: Align selection via `type` (`left`, `center`, `right`, `top`, `middle`, `bottom`). Single selection aligns to artboard; multiple aligns to each other.
- `distribute_objects`: Distribute 3+ selected elements via `direction` (`horizontal`, `vertical`; `type` alias accepted).
- `group_objects` / `ungroup_objects`: Manage grouping (`objectIds` min 2 / `groupId`).
- `fit_to_artboard`: Scale selection to fill canvas with optional `padding`.

### Verification & Export
- `get_canvas_image`: Render a visual PNG screenshot of the artboard.
- `get_object_properties`: Inspect bounding box and styles of an element.
- `export_png`: Export the canvas to a downloadable PNG file.
- `export_object`: Export an individual object/group as PNG or SVG.
