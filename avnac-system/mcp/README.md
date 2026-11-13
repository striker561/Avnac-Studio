# Avnac Studio MCP Server

This directory contains the Model Context Protocol (MCP) server implementation for Avnac Studio.

## Overview

The MCP server allows external AI agents and clients to interact with the Avnac Studio canvas directly. It leverages the official Go SDK for MCP (`github.com/modelcontextprotocol/go-sdk`) and serves both Streamable HTTP and legacy SSE.

### Architecture

1. **MCP Server (`server.go`)**: An opt-in HTTP server bound to `127.0.0.1`. Port auto-selection prefers the fixed `DefaultMCPPort` (12345) so the connect URL survives relaunches, falling back to a free ephemeral port only when it is taken; a non-zero `mcp_port` in config is a strict pin. Every request requires a bearer token (32 random bytes, stored in the OS keyring under the `mcp` entry) sent as `Authorization: Bearer`. Streamable HTTP and legacy SSE are served through the official Go SDK with its security defaults (localhost/DNS-rebinding protection on, no CORS headers). A `ConfigManager` watcher starts/stops the listener with the `mcp_enabled` setting, and `OnShutdown` stops it on app exit. Request bodies are capped at `maxRequestBodyBytes` (32 MiB): a declared `Content-Length` over the cap is refused with 413 before anything reads it, and `http.MaxBytesReader` bounds chunked bodies that declare nothing. The `server/discover` probe sniffs a bounded 4 KiB prefix rather than buffering the whole body — it runs on every POST, so an unbounded read there cost roughly 7x the request size in peak memory.
2. **Tool Registration (`tools.go`)**: Defines the tools available to MCP clients. When a tool is invoked by a client, the Go backend processes the request and emits a Wails IPC event (`mcp:action`) to the frontend. Input decoding is deliberately permissive (`decodeViaJSON` plus the flexible helpers) so numeric fields accept their string form; the same normalization is applied *inside* `elements[]` and `modifications[]` by `withNormalizedElements`, because a value nested in a batch entry otherwise reaches `encoding/json` untouched.
3. **Frontend orchestration (`frontend/src/features/scene-editor/use-mcp-actions.ts`)**: The scene editor root route subscribes to the `mcp:action` event via `subscribeToMCPActions` (`frontend/src/lib/mcp/transport.ts`) and runs a thin dispatcher — one named function per tool, shaped like the engine's `applyCommand` reducer. Payload → command conversion is pure and lives in `frontend/src/lib/mcp/commands.ts` (mutations), `frontend/src/lib/mcp/summaries.ts` (read-only responses), and `frontend/src/lib/mcp/canvas-export.ts` (image rendering). Everything reaches the scene only through the scene editor store (`useSceneEditorStore.applyCommands`); the renderer is Canvas2D (Saraswati); Fabric was removed in v0.2.0.
4. **Bounds come from the engine, never from raw fields.** Layout tools and the read-only summaries take every box from `getNodeBounds` (and `getRenderableNodeBounds` for groups). A text node has no `height` field at all — height is derived from the wrapped text — so reading `node.width` / `node.height` directly reported `height: 0` for every text element and silently corrupted `align_objects` (centring on `y + height/2` put the text's top edge on the alignment line), `distribute_objects`, and `fit_to_artboard` (reported success while changing nothing). `render_elements` also measures text for real: it waits briefly for the Google Fonts it is about to use (3 s cap, then it measures with whatever is loaded) and lays the text out through the renderer's own `layoutTextLines`, so a text element sent without a `width` gets its measured natural width instead of the 100 px rect default.

## Available Tools

The server publishes **14 tools**: six reads, six noun-shaped mutation tools, `vector` and the `guide` router whose verbs are
`op` values. The 25 hidden registrations behind those ops keep their action names 1:1 with the
frontend `mcp:action` strings, except `open_canvas`/`rename_file`, which emit
`open_workspace`/`rename_workspace`.

### Reads
- `get_canvas_summary`: Semantic summary of the artboard and objects, plus `document`, the active
  `page` (`index`, 1-based `number`, `name`) and every `pages` entry.
- `get_canvas_state`: Full raw scene state.
- `get_canvas_image`: PNG screenshot of the canvas or one object; `annotated` overlays bounds.
- `list_objects` / `get_object_properties` / `get_selection`: Object-level inspection.

### `canvas` — project, pages and artboard
- `create`: Starts a **new project** (width, height, optional name/background). Not for drafts or
  tests; it returns a `notice` when another canvas was already open.
- `add-page`: Adds a named blank page to the **open project**, switches the editor to it live,
  and returns `page` + `pageCount`. This is the draft/test/variation path.
- `go-page`: Switches pages by 1-based `page` (number or name) or 0-based `index`.
- `rename-page`: Renames a page (defaults to the current one).
- `delete-page`: Deletes a page (defaults to the current one; never the last page).
- `clear` / `background` / `preset`: Current-page background, clear, and standard sizes.

### `elements`
- `render` (batched, bottom-to-top), `modify`, `delete`, and `measure` (text layout without
  drawing). Images support `fit`, `focalPoint` and `crop`; text is measured against its real font.

### `arrange`
- `align` (including optical `cap-middle`), `distribute`, `group`, `ungroup`, `fit`, `select`.

### `files`
- `list` (works with no canvas open), `open`, `rename`.

### `assets`
- `unsplash` (compact records + quota; placement in `render` files the download report and stores
  the credit), `fonts`, `stickers`.

### `export`
- `png` (artboard) and `object` (cropped PNG).

### `vector` — path drawing
- `draw`: resolves a small scene-graph IR (`canvas`, `objects[]`, `layers[]`) with constraints
  (`centered_on`, `left_of`, `right_of`, `above`, `below`, `inside`, `aligned_with`,
  `equal_size`) and `mirrorOf`, then places the result as a vector SVG element and returns
  `boardId` + `objectId`.
- `update`: applies object-level operations (`resize`, `move`, `rotate`, `mirror`, `restyle`,
  `reorder`, `delete`, `add`) to the stored IR and re-renders once.
- `read` / `export` / `delete` / `list`: inspect the IR and v3 document, get the SVG source,
  remove the placed element, or enumerate session boards.
- Implementation: [`tools_vector.go`](tools_vector.go), with geometry in
  [`internal/vector/`](../../internal/vector/). The placed node's `src` is an SVG data URL carrying
  `data-avnac-vector-board="1"`, so the scene exporter inlines real `<path>` elements instead of a
  bitmap. Drawing knowledge lives in `skill://vector` and `rules://120..127`.

### `guide` — in-task routing
- `task` (the brief) → the workflow (`skill://...`) and 4–8 rules (`rules://...`) that apply, with the matched tokens and a confidence level. `inline=true` returns the reading material itself.
- Composition results (`canvas` create/add-page, `elements` render/measure/modify, `vector` draw) carry the same guide automatically when the payload is a clear match, so the route appears even when the agent skips the call.

### Page lifecycle

`add_page` / `goto_page` / `rename_page` / `delete_page` are hidden action handlers behind the
`canvas` ops. The first two go through the scene store's `applyPageTransition`, so the app shows
the new active page in real time. `delete_page` calls `deletePageAt` (no native confirmation) so
an MCP call never blocks on a dialog. Page names are stored in the multi-page envelope as
`pageNames`, index-aligned with `pages`; empty entries display as `Page N`.

## Development

The MCP server is constructed in `app.go` and registered in `App.startup`. The HTTP listener itself starts when the `mcp_enabled` config value is set (Settings toggle or `config.json`) and stops when it is cleared.

If you add new tools in `tools.go`, make sure to update the corresponding handler in `frontend/src/features/scene-editor/use-mcp-actions.ts` (add a dispatcher case plus a named action function), and keep payload → command conversion in `frontend/src/lib/mcp/commands.ts` so it stays unit-testable.
