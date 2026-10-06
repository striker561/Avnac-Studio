# Avnac Studio MCP Server

This directory contains the Model Context Protocol (MCP) server implementation for Avnac Studio.

## Overview

The MCP server allows external AI agents and clients to interact with the Avnac Studio canvas directly. It leverages the official Go SDK for MCP (`github.com/modelcontextprotocol/go-sdk`) and serves both Streamable HTTP and legacy SSE.

### Architecture

1. **MCP Server (`server.go`)**: An opt-in HTTP server bound to `127.0.0.1` on a free ephemeral port (or the pinned `mcp_port` from config). Every request requires a bearer token (32 random bytes, stored in the OS keyring under the `mcp` entry) sent as `Authorization: Bearer`. Streamable HTTP and legacy SSE are served through the official Go SDK with its security defaults (localhost/DNS-rebinding protection on, no CORS headers). A `ConfigManager` watcher starts/stops the listener with the `mcp_enabled` setting, and `OnShutdown` stops it on app exit.
2. **Tool Registration (`tools.go`)**: Defines the tools available to MCP clients. When a tool is invoked by a client, the Go backend processes the request and emits a Wails IPC event (`mcp:action`) to the frontend.
3. **Frontend orchestration (`frontend/src/features/scene-editor/use-mcp-actions.ts`)**: The scene editor root route subscribes to the `mcp:action` event via `subscribeToMCPActions` (`frontend/src/lib/mcp/transport.ts`) and runs a thin dispatcher — one named function per tool, shaped like the engine's `applyCommand` reducer. Payload → command conversion is pure and lives in `frontend/src/lib/mcp/commands.ts` (mutations), `frontend/src/lib/mcp/summaries.ts` (read-only responses), and `frontend/src/lib/mcp/canvas-export.ts` (image rendering). Everything reaches the scene only through the scene editor store (`useSceneEditorStore.applyCommands`); the renderer is Canvas2D (Saraswati); Fabric was removed in v0.2.0.

## Available Tools

The MCP server provides 27 tools for canvas automation. Tool names equal their emitted `mcp:action` action strings 1:1, except `open_canvas`/`rename_file`, which emit `open_workspace`/`rename_workspace` (the frontend handler also keys on those).

### 1. File Management (no canvas required)
- `list_files`: Lists all saved canvas files (`id`, `name`, width, height, `updatedAt`) from workspace storage.
- `open_canvas`: Opens a saved file by workspace id and makes it the active scene (emits `open_workspace`; pre-validates the id in Go).
- `rename_file`: Renames a saved file (emits `rename_workspace`), also updating the live editor title when open.

### 2. Context & Inspection
- `get_canvas_summary`: Token-efficient semantic summary of artboard + objects.
- `list_objects`: Lists all objects with raw IDs.
- `get_selection`: Returns the current selection.
- `get_canvas_state`: Returns the full scene state.
- `get_canvas_image`: Returns a visual PNG screenshot of the canvas (or one object).
- `get_object_properties`: Returns detailed properties of a specific object.
- `get_font_list`: Returns supported Google Fonts.

### 3. Creation
- `create_canvas`: Navigates to the editor and initializes a new artboard (width, height, optional name/background).
- `render_elements`: Declaratively creates a batch of elements (`rect`, `ellipse`, `polygon`, `star`, `line`, `text`, `image`, `sticker`) in one call, bottom-to-top layering.

### 4. Manipulation & Styling
- `modify_elements`: Batch-updates element properties by objectId (fill, text controls, shadow, gradients, z-order `action`).
- `delete_object`: Removes an object (or the current selection).
- `set_background`: Changes the artboard background color.
- `apply_artboard_preset`: Quickly resizes to standard sizes (IG, X, HD, A4).

### 5. Layout & Organization
- `select_objects`: Programmatically selects objects by ID.
- `group_objects` / `ungroup_objects`: Manages object hierarchy.
- `align_objects`: Aligns objects to the artboard or each other.
- `distribute_objects`: Evenly spaces objects horizontally or vertically.
- `fit_to_artboard`: Scales objects to fill the canvas area.

### 6. Utilities & Assets
- `clear_canvas`: Removes all objects.
- `search_unsplash`: Searches Unsplash; returns compact records (id, alt, size, photographer, small/regular URLs).
- `export_png` / `export_object`: Export the canvas or a single object as an image.

## Development

The MCP server is constructed in `app.go` and registered in `App.startup`. The HTTP listener itself starts when the `mcp_enabled` config value is set (Settings toggle or `config.json`) and stops when it is cleared.

If you add new tools in `tools.go`, make sure to update the corresponding handler in `frontend/src/features/scene-editor/use-mcp-actions.ts` (add a dispatcher case plus a named action function), and keep payload → command conversion in `frontend/src/lib/mcp/commands.ts` so it stays unit-testable.
