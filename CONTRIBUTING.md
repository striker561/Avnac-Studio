# Contributing to Avnac Studio

Thanks for your interest in contributing. Avnac Studio is the native desktop port of [Avnac](https://github.com/akinloluwami/avnac), built with Wails + Go. Contributions to the desktop-specific layer are welcome.

---

## Before You Start

- All desktop-specific work lives on the **`studio`** branch — this is the default branch. Do **not** target `main`; that branch mirrors the upstream web app.
- For bugs or feature requests, [open an issue](https://github.com/striker561/Avnac-Studio/issues) first so we can align before you invest time in a PR.
- For changes to the canvas editor or core UI, check whether the change belongs here or upstream at [akinloluwami/avnac](https://github.com/akinloluwami/avnac).

---

## Setting Up Locally

### Prerequisites

- [Go](https://go.dev/dl/) — see `go.mod` for the required version
- [Node.js](https://nodejs.org/) 22 + npm 10
- [Wails CLI v2](https://wails.io/docs/gettingstarted/installation)

If you use `nvm`, this repo includes `.nvmrc`, so run `nvm use` before installing frontend dependencies.

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@latest
wails doctor
```

### Run the full desktop app

```bash
cd frontend
npm ci
cd ..
wails dev
```

### Run the frontend only (UI work)

```bash
cd frontend
npm ci
npm run dev
```

Vite starts at `http://localhost:3300`. Native features (file storage, export dialogs, Unsplash config) are only available in the full Wails runtime.

---

## Dependency Workflow (Important)

`frontend/package-lock.json` is source-controlled and has to stay in sync with `frontend/package.json`. Note that the CI workflow, the four release jobs and `wails.json`'s `frontend:install` all currently run `npm install`, so the lockfile is not enforced as a build input today. Locally, `npm ci` is still the right command when you want an install that matches the lockfile exactly.

- Use `npm ci` for a clean local install, or to verify the lockfile is consistent.
- Use `npm install` only when you intentionally change dependencies.
- If `frontend/package.json` changes, commit the matching `frontend/package-lock.json` update in the same commit.
- If `frontend/package-lock.json` changed but you did not mean to change dependencies, revert it before pushing.

In practice:

- First-time setup: `cd frontend && npm ci`
- Day-to-day coding: keep your existing install, or rerun `npm ci` when you need a clean slate
- Adding/updating a package: run `npm install <package>` or `npm install`, verify the result, then commit both manifest and lockfile changes together

---

## Where Things Live

```text
frontend/       React UI, editor, routes, native client wrappers
avnac-system/   Go services: config, IO, workspace storage, media proxy, MCP server
app.go          Wails app bootstrap and service wiring
main.go         Wails runtime setup and bindings
```

| Area                                      | Path                       |
| ----------------------------------------- | -------------------------- |
| Editor UI and behavior                    | `frontend/src/components/` |
| Routes and navigation                     | `frontend/src/routes/`     |
| Frontend storage and document logic       | `frontend/src/lib/`        |
| Native IO, config, and workspace services | `avnac-system/`            |
| Wails app bootstrap                       | `app.go`, `main.go`        |

---

## Native Workspace Storage

Each document gets its own folder in the OS app config directory:

```text
<UserConfigDir>/avnac-studio/documents/<workspace-id>/
  meta.json
  document.json
  pages.json
  vector-boards.json
  vector-board-docs.json
```

- `meta.json` powers the Files list without loading full canvas data
- `document.json` holds the main Saraswati document payload
- `pages.json` holds page-level workspace state
- `vector-boards.json` and `vector-board-docs.json` hold vector board state

---

## Useful Commands

**Frontend:**

```bash
cd frontend
npm run dev        # start dev server
npm run build      # production build
npm run test       # run tests
npm exec tsc -- --noEmit --pretty false  # type-check
```

**Go:**

```bash
go build ./...     # verify Go compiles
```

**Production build:**

```bash
wails build        # output goes to build/bin/
```

---

## Pull Request Guidelines

- Target the **`studio`** branch.
- Keep PRs focused — one concern per PR.
- If your change touches the Go backend (`avnac-system/`), include a brief note on what service or file is affected and why.
- If your change touches the canvas editor, test with at least one of: text, shape, image, and multi-select.
- Run `npm exec tsc -- --noEmit` and `go build ./...` before submitting — the PR should have no type errors or build failures.

---

## Maintainers

- [@striker561](https://github.com/striker561)
- [@d3uceY](https://github.com/d3uceY)

Original Avnac web app by [@akinloluwami](https://github.com/akinloluwami).
