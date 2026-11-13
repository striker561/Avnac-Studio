# Avnac Studio test map

Tests are arranged by **unit** (pure logic, fast) and **features** (cross-module behavior, larger payloads). Go package tests live next to their source under `avnac-system/`.

## Core application surfaces

| Surface | Code | Tests |
| --- | --- | --- |
| Native workspace storage | `avnac-system/io/` | `avnac-system/io/workspace_store_test.go` |
| Background removal client | `avnac-system/server/rembg.go` | `avnac-system/server/rembg_test.go` |
| Scene engine (Saraswati) | `frontend/src/lib/saraswati/` | `frontend/tests/unit/saraswati/` |
| Canvas render path | `frontend/src/components/scene-workspace/stage.tsx` | `frontend/tests/features/saraswati/render-performance.test.ts` |
| Scene editor store | `frontend/src/features/scene-editor/store/` | `frontend/tests/unit/scene-editor/` |
| Page lifecycle + naming | `frontend/src/lib/avnac-multi-page-document.ts`, `store/paging/` | `frontend/tests/unit/scene-editor/page-recipes.test.ts`, `frontend/tests/unit/storage/` |
| MCP page targeting | `frontend/src/lib/mcp/pages.ts` | `frontend/tests/unit/mcp/pages.test.ts` |
| MCP server instructions/tools | `avnac-system/mcp/` | `avnac-system/mcp/*_test.go` |
| Multi-page persistence | `frontend/src/lib/avnac-multi-page-storage.ts` | `frontend/tests/unit/storage/`, `frontend/tests/features/storage/` |
| Remove background UI | `frontend/src/lib/use-remove-bg.ts` | `frontend/tests/unit/rembg/` |

## Layout

```text
avnac-system/
  io/workspace_store_test.go          # huge file round-trips, atomic writes
  server/rembg_test.go              # SSE + HTTP client

frontend/tests/
  unit/
    saraswati/                      # reducer, adapters, spatial, editor store
    scene-editor/                   # shortcuts, input guards
    storage/                        # mergeStoredPages
    rembg/                          # hook + processing store
  features/
    storage/                        # multi-MiB workspace envelopes + Wails mocks
    saraswati/                      # render command + drag-frame budgets
```

## Commands

```bash
# Everything
go test ./...
cd frontend && npm run test

# Split suites (matches CI)
cd frontend && npm run test:unit
cd frontend && npm run test:features
```

## CI gates

- **Push / PR** — `.github/workflows/ci.yml` runs Go tests, typecheck, unit + feature Vitest.
- **Release tags** — `.github/workflows/release.yml` runs the same test job before any platform build.

## End-to-end (Wails browser)

`wails dev -browser` serves the real app with the Go bindings intact at the Wails dev URL
(`http://localhost:34115` by default). Use it for end-to-end checks that need the actual editor,
MCP bridge and native storage:

```bash
wails dev -browser
# in another terminal, drive the MCP server and the browser page
```

Point Playwright (or a browser) at the dev URL, read the bearer token from
`window.go.avnacsecrets.SecretsManager.GetKey("mcp")`, then exercise the MCP server on the URL
shown by `window.go.mcp.AvnacMCP.GetMCPInfo()`. A page created through MCP must switch the
visible page tab and active canvas in that browser session.

**One frontend at a time.** `mcp:action` is broadcast to every connected app frontend, and every
one of them applies the action before replying. `wails dev -browser` opens a browser tab *in
addition to* the native window, so two live tabs would apply each page/render twice. Close one
of them before driving mutating tools, or keep Playwright read-only and verify the live page in
the native window (capture it with `PrintWindow`/`CopyFromScreen`). Do not use this to create a
new project per test: add a named page in the open project and delete it afterwards.

## Known hot paths under test

1. **Storage** — full-buffer read/write; no streaming; 8+ MiB JSON round-trips in Go.
2. **Saraswati reducer** — per-pointer-frame `MOVE_NODE` must stay under ~16 ms for 60 fps headroom.
3. **Render command build** — `buildRenderCommands` scales with node count; full canvas clear every scene change.
4. **Serialization** — `toAvnacDocument` on every command is a documented perf risk.
