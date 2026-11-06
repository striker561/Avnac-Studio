<p align="center">
  <img src="build/appicon.png" width="116" alt="Avnac Studio" />
</p>

<h1 align="center">Avnac Studio</h1>

<h3 align="center">
  A native desktop design canvas for layouts, posters, social graphics,<br />
  and visual documents. Built on Wails and Go.
</h3>

<p align="center">
  <a href="https://github.com/striker561/Avnac-Studio/actions/workflows/ci.yml"><img src="https://github.com/striker561/Avnac-Studio/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/striker561/Avnac-Studio/releases/latest"><img src="https://img.shields.io/github/v/release/striker561/Avnac-Studio?style=flat-square&label=release&color=brightgreen" alt="Latest release" /></a>
  <img src="https://img.shields.io/github/license/striker561/avnac-studio?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey?style=flat-square" alt="Platforms" />
  <img src="https://img.shields.io/badge/Go-1.25-00ADD8?style=flat-square&logo=go&logoColor=white" alt="Go 1.25" />
  <img src="https://img.shields.io/badge/Wails-v2-DF0000?style=flat-square" alt="Wails v2" />
</p>

<p align="center">
  <a href="#download">Download</a> ·
  <a href="#ai-agents-can-design-here">MCP server</a> ·
  <a href="docs/MCP_GUIDE.md">Docs</a> ·
  <a href="CONTRIBUTING.md">Contributing</a>
</p>

<div align="center">
  <figure>
    <img src="https://github.com/user-attachments/assets/519ffe1c-9de9-4238-8303-8e89916ff640" width="78%" alt="Avnac Studio with a poster open in the canvas editor" />
    <figcaption>
      <sub>A poster placed entirely through MCP calls, open in the editor.</sub>
    </figcaption>
  </figure>
</div>

<h2 align="center" id="download">Download</h2>

<p align="center">
  <a href="https://github.com/striker561/Avnac-Studio/releases/latest/download/avnac-studio-windows-amd64-installer.exe"><img src="https://img.shields.io/badge/Windows_Installer-.exe_amd64-0078D4?style=for-the-badge&logo=windows&logoColor=white" alt="Download for Windows" /></a>
  <a href="https://github.com/striker561/Avnac-Studio/releases/latest/download/avnac-studio-macos-arm64.dmg"><img src="https://img.shields.io/badge/macOS_Apple_Silicon-arm64-000000?style=for-the-badge&logo=apple&logoColor=white" alt="Download for macOS Apple Silicon" /></a>
</p>

<p align="center">
  <a href="https://github.com/striker561/Avnac-Studio/releases/latest/download/avnac-studio-macos-amd64.dmg"><img src="https://img.shields.io/badge/macOS_Intel-x86__64-000000?style=for-the-badge&logo=apple&logoColor=white" alt="Download for macOS Intel" /></a>
  <a href="https://github.com/striker561/Avnac-Studio/releases/latest/download/avnac-studio-linux-amd64"><img src="https://img.shields.io/badge/Linux_Binary-amd64-FCC624?style=for-the-badge&logo=linux&logoColor=black" alt="Download for Linux" /></a>
</p>

<p align="center">
  <sub>Maintained by <a href="https://github.com/striker561">striker561</a> &amp; <a href="https://github.com/d3uceY">d3uceY</a></sub>
</p>

---

## A desktop app, not a browser tab

The web app needs an Elysia backend for media, Unsplash and documents, and keeps your work in IndexedDB. Studio puts that backend inside the binary and writes your files to the operating system.

|         | Avnac Studio                  | Avnac (web)                       |
| ------- | ----------------------------- | --------------------------------- |
| Runtime | Wails + Go, system webview    | Browser + Node backend            |
| Backend | None, it is inside the binary | Elysia service to run and restart |
| Storage | Native app data directory     | IndexedDB                         |
| Export  | Native OS save dialogs        | Browser download                  |
| Offline | Fully, after install          | Partial                           |

Existing browser documents are migrated on first run, so nothing is lost in the move.

---

## What it does

**Files.** Create from presets or custom dimensions, then open, duplicate, rename, delete, import and export from the Files screen. Autosave on every change, no manual saving.

**Canvas.** Text, rectangles, ellipses, polygons, stars, lines and arrows. Images from local uploads or Unsplash, with one-click background removal. Multi-select, group, reorder layers, align, distribute, resize and rotate.

**Styling.** Solid, gradient or image fills. Blur, opacity, corner radius, shadows, stroke and paint controls. Google Fonts, with size, weight and alignment.

**Documents.** Multi-page workspaces with per-page state, and nested vector boards for reusable components or isolated drawing areas.

<p align="center">
  <img src="https://github.com/user-attachments/assets/58e26032-1362-4c14-88f5-ca0c0893411e" height="228" alt="The Files screen" />
  &nbsp;
  <img src="https://github.com/user-attachments/assets/c340c44b-4703-49e1-8c5e-35a53e71d89d" height="228" alt="The canvas editor with a poster open" />
</p>

---

## AI agents can design here

Studio ships a built-in [Model Context Protocol](https://modelcontextprotocol.io) server, so an agent in Cursor, Claude Code or VS Code can create and edit a design that is already open on your screen.

It is opt-in. Turn it on in **Settings → MCP server**, which binds it to `127.0.0.1`, shows the connect URL, and stores the bearer token in your OS keyring. Only loopback connections are accepted, there is no wildcard CORS, and request bodies are capped at 32 MiB.

The server exposes 27 tools covering files, canvas setup, element creation, layout, assets, and screenshot-based self-verification, plus three prompt workflows: `design-graphic`, `edit-canvas` and `design-audit`.

<p align="center">
  <img src="https://github.com/user-attachments/assets/a9ae66f9-c7bc-4faf-983e-7767a8fac0f5" height="300" alt="A dark poster designed by an agent through MCP" />
</p>

Client setup for Cursor, Claude Code and VS Code, the full tool reference, and test prompts live in **[docs/MCP_GUIDE.md](docs/MCP_GUIDE.md)**.

---

## Saraswati engine

Saraswati is the renderer-agnostic 2D scene engine the editor runs on. It owns document structure, interaction math and bounds, and emits a render-command pipeline. The Canvas2D backend consumes those commands without owning scene state, and every mutation goes through a pure command reducer. That is what lets undo, redo and the MCP layer sit on the same path as the UI instead of beside it. Fabric has been removed.

Design rationale and the rules that keep that boundary intact are in **[docs/saraswati-engine.md](docs/saraswati-engine.md)** and **[docs/saraswati-architecture-decisions.md](docs/saraswati-architecture-decisions.md)**.

---

## Documentation

| Document                                             | What it covers                                                                                                                                                   |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [docs/MCP_GUIDE.md](docs/MCP_GUIDE.md)               | Connecting an MCP client, all 27 tools, prompt workflows                                                                                                         |
| [docs/saraswati-engine.md](docs/saraswati-engine.md) | Scene graph, command pipeline, renderer boundary. The decisions behind it are in [saraswati-architecture-decisions.md](docs/saraswati-architecture-decisions.md) |
| [CONTRIBUTING.md](CONTRIBUTING.md)                   | Setup, dependency policy, storage layout, project structure, PR guidelines                                                                                       |

---

## Tech stack

- **Frontend:** React, Vite, TypeScript, Tailwind CSS, TanStack Router
- **Desktop runtime:** Wails v2 and Go
- **Canvas engine:** Saraswati, Canvas2D renderer
- **AI UI:** `@tambo-ai/react`

---

## Development

```bash
cd frontend && npm ci && cd ..
wails dev
```

Go version, Node version, the dependency workflow, the full command list and the PR guidelines are all in **[CONTRIBUTING.md](CONTRIBUTING.md)**.

---

## Upstream

The `main` branch is a mirror of the original web app by [@akinloluwami](https://github.com/akinloluwami) at [akinloluwami/avnac](https://github.com/akinloluwami/avnac). All desktop work lives on **`studio`**, which is the default branch. Open issues and pull requests against `studio`, never `main`.

---

## Credits

Original Avnac web app created by [@akinloluwami](https://github.com/akinloluwami).

## License

[GPL](./LICENSE) © 2026 striker561, d3uceY
