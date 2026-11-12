# MCP Architecture

Developer documentation for Avnac Studio's MCP server: how it boots, how a request
reaches the canvas, and how the embedded design library is published and referenced
over the protocol.

- **Audience**: contributors changing `avnac-system/mcp/` or `internal/skill/`.
- **User-facing guide**: [MCP_GUIDE.md](MCP_GUIDE.md) — setup, connect URL, tool list.
- **Prompt starters**: [MCP_TEST_PROMPTS.md](MCP_TEST_PROMPTS.md).
- **Protocol**: MCP, transport-agnostic JSON-RPC over Streamable HTTP (with a legacy SSE path).

---

## 1. What the feature exposes

One loopback HTTP server publishes three MCP surfaces. They are deliberately separate:

| Surface | Protocol primitive | What it is | Cost model |
|---|---|---|---|
| Tools | `tools/list`, `tools/call` | 27 actions that read or mutate the open canvas | Called per action; each call has side effects |
| Prompts | `prompts/list`, `prompts/get` | 3 parameterised workflow starters | Fetched once, pasted into a conversation |
| Resources | `resources/list`, `resources/read` | The whole design library: 149 read-only documents | Pulled on demand; no side effects |

The rule that decides where new functionality goes: **if it changes the document, it is a
tool; if it is knowledge the model should be able to consult, it is a resource; if it is a
scripted way to start a task, it is a prompt.**

---

## 2. Components

```
┌───────────────────────────── Avnac Studio (Wails app, single process) ─────────────────────────────┐
│                                                                                                    │
│  Go: main.go / app.go                                                                              │
│    NewApp ──► mcp.NewAvnacMCP(unsplash, io, secrets)                                               │
│                    │  builds *mcp.Server (go-sdk)                                                 │
│                    │  instructions = DesignerInstructions + designResourceIndex()                  │
│    startup ───────► MCPServer.Start(wailsCtx)                                                      │
│                    ├── RegisterTools(wailsCtx)      27 tools, each handler closes over wailsCtx    │
│                    ├── RegisterPrompts()            3 prompts                                      │
│                    └── RegisterResources()          internal/skill ──► 149 MCP resources           │
│                                                                                                    │
│    ConfigManager.AddWatcher(mcpServer.UpdateConfig)                                                │
│                    MCPEnabled / MCPPort ──► start, stop, or restart the listener live              │
│    App.shutdown ─► MCPServer.Stop()              frees the port on exit                            │
│                                                                                                    │
│  ┌──────────────── avnac-system/mcp (package mcp) ────────────────┐                                │
│  │ server.go    lifecycle, listener, auth, routing, MCPState      │                                │
│  │ tools.go     27 tool registrations, schemas, emitSync bridge   │                                │
│  │ prompts.go   design-graphic / edit-canvas / design-audit       │                                │
│  │ resources.go design library ──► resources, link rewriting      │                                │
│  └───────────────────────────────┬───────────────────────────────┘                                │
│                                  │ go-sdk v1.6.0                                                  │
│                    ┌─────────────┴─────────────┐                                                  │
│                    │ Streamable HTTP handler   │  POST/GET/DELETE   127.0.0.1:<port>              │
│                    │ legacy SSE handler        │  GET + /sse, POST ?sessionid                     │
│                    └─────────────┬─────────────┘                                                  │
│                                  │                                                                │
│  ┌───────────────────────────────▼───────────────────────────────┐                                │
│  │ internal/skill (embedded markdown, parsed once)                │                                │
│  │ SKILL.md · 21 task skills · 14 references · 112 rules          │                                │
│  └────────────────────────────────────────────────────────────────┘                                │
│                                                                                                    │
│  React frontend                                                                                    │
│    Wails event  mcp:action  ──► use-mcp-actions.ts ──► scene store / Saraswati engine              │
│    Wails binding AvnacMCP.SubmitResponse(requestId, result)  ◄── reply                             │
└────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Code map

| Path | Responsibility |
|---|---|
| `app.go` | Constructs `AvnacMCP`, registers the config watcher, calls `Start` in `startup`, `Stop` in `shutdown` |
| `avnac-system/mcp/server.go` | `AvnacMCP` struct, instructions, lifecycle (`Start`/`StartHTTP`/`Stop`), listener, bearer auth, HTTP routing, `MCPState` |
| `avnac-system/mcp/tools.go` | Tool schemas and handlers, `emitSync`, flexible input decoding, response shaping |
| `avnac-system/mcp/prompts.go` | The three prompt templates and their arguments |
| `avnac-system/mcp/resources.go` | Library → resources, URI schemes, link rewriting, instruction index |
| `avnac-system/mcp/server_test.go` | Auth, routing, lifecycle, token regeneration |
| `avnac-system/mcp/resources_test.go` | Resource count, link rewriting, in-memory list/read over a real client session |
| `avnac-system/mcp/flexible_input_test.go` | Tolerant decoding of agent-supplied JSON |
| `internal/skill/skill.go` | Embed, parse, validate, route, search, plan |
| `internal/skill/rules/` | 112 rule documents plus the generated `README.md` index |
| `internal/skill/<task>/SKILL.md` | 21 task workflows |
| `internal/skill/references/` | 14 lookup notes |
| `frontend/src/features/scene-editor/use-mcp-actions.ts` | Dispatches `mcp:action` events into the scene store |
| `frontend/src/lib/mcp/transport.ts` | Subscribes to the Wails event and calls `SubmitResponse` |
| `frontend/src/lib/mcp/payload.ts` | Converts loosely typed agent input into engine values |
| `frontend/src/routes/settings.tsx` | Reads `GetMCPInfo` / `RegenerateToken`, shows the connect URL and token from the keyring |

---

## 3. Lifecycle

### Startup

1. `NewApp` calls `mcp.NewAvnacMCP(...)`. That builds the go-sdk server and composes the
   instructions string: `DesignerInstructions` plus `designResourceIndex(lib)`. The library is
   embedded, so this parse happens once per process.
2. `ConfigManager.Startup` fires its watcher with the loaded config, which calls
   `UpdateConfig(cfg)`.
3. `UpdateConfig` starts the listener only when `mcp_enabled` is true. The port resolves as:
   - `mcp_port > 0` — strict pin; a taken port is a hard error surfaced in `MCPState.Error`.
   - `mcp_port == 0` — auto: try `DefaultMCPPort` (12345), else take an ephemeral port. The
     resolved URL is reported in Settings so the common case keeps a stable URL.
4. `App.startup` calls `MCPServer.Start(wailsCtx)`. This registers tools, prompts and resources
   **before** any listener exists, so a client connecting immediately sees the full surface. The
   `wailsCtx` is captured by tool handlers because they need it to emit `mcp:action` events.

### Reconfiguration

`ConfigManager` calls `UpdateConfig` on every save. The rules:

| Change | Effect |
|---|---|
| `mcp_enabled: false` | Listener stops, state resets |
| `mcp_enabled: true`, dynamic port | Existing listener is kept (a config save does not move it) |
| `mcp_enabled: true`, pinned port changed | Listener stops and binds the new port |
| Token regenerated | `RegenerateToken` swaps the in-memory token; the running listener demands it from the next request |

`startMu` serialises `UpdateConfig`, `StartHTTP` and `Stop`, so a settings save cannot race a
shutdown.

### Shutdown

`App.shutdown` calls `Stop`, which shuts the `http.Server`, closes the listener and clears the
token. This matters: a stale listener holding the port is the classic cause of "cannot connect
after relaunch".

---

## 4. Transport and HTTP routing

There is exactly one listener. `startHTTPLocked` builds two go-sdk handlers over the same
`*mcp.Server`:

```go
streamable := mcp.NewStreamableHTTPHandler(func(*http.Request) *mcp.Server { return m.server }, nil)
sse        := mcp.NewSSEHandler(func(*http.Request) *mcp.Server { return m.server }, nil)
srv        := &http.Server{Handler: m.buildHandler(streamable, sse)}
```

`buildHandler` wraps them in this order, and the order is load-bearing:

1. **Request log** — method, URL, remote address, `Accept`, `Mcp-Session-Id`. Never logs the
   `Authorization` header.
2. **Unauthenticated status page** — `GET` with `Accept: text/html` and no `text/event-stream`
   is answered with a small HTML page. This is what the user sees when they open the connect URL
   in a browser.
3. **Bearer auth** — unless the server has no token (degraded mode), every other request must
   carry `Authorization: Bearer <token>`, compared in constant time. A failure returns 401 with
   `WWW-Authenticate: Bearer realm="avnac-mcp"`.
4. **Body cap** — a declared `Content-Length` above 32 MiB is refused with 413; chunked bodies
   are capped by `http.MaxBytesReader`. This runs after auth so an unauthorised request costs no
   allocation.
5. **Routing**:

| Request | Handler |
|---|---|
| `POST` with `?sessionid=` (legacy SSE message) | SSE |
| `POST` without it | Streamable HTTP |
| `GET` with `Mcp-Session-Id` | Streamable HTTP (server→client stream) |
| `GET` without it (including `/sse`) | SSE |
| `DELETE` | Streamable HTTP (session close) |
| anything else | Streamable HTTP |

### The `server/discover` probe

Before the routes above, `POST` bodies of at most 4 KiB are sniffed for a hand-rolled
`server/discover` request. Some clients send it instead of, or ahead of, the SDK's session
negotiation; the body is re-attached with `prefixBody` when the sniff does not match. The probe
answers with protocol `2025-11-25`, the supported version list, and capabilities for **tools,
prompts and resources** — including the same instructions string the SDK hands out, so both
negotiation paths agree.

### SSE URL

`MCPState.SSEURL` is the base URL plus `/sse`. Routing does not key off the path, only headers
and methods, so the path is informational for clients that need a distinct endpoint.

---

## 5. Security model

| Control | Implementation |
|---|---|
| Bind address | `127.0.0.1` only, never configurable to a non-loopback host |
| Auth | 32 random bytes, hex-encoded, stored in the OS keyring under `mcp` via `SecretsManager` |
| Comparison | `subtle.ConstantTimeCompare` |
| Token lifetime | Persistent across launches; `RegenerateToken` rotates it, effective immediately |
| Degraded mode | If the keyring is unavailable the server still starts but logs a warning and serves only on loopback |
| Body size | 32 MiB declared limit + `MaxBytesReader` backstop |
| Secrets in logs | `Authorization` is never logged |
| Tool surface | No shell, no filesystem escape: tools act on the open canvas or the workspace metadata store |

The frontend reads the token for display through the existing `SecretsManager.GetKey("mcp")`
binding, which is how Settings shows the same value the client must send.

---

## 6. Tools

Tools are registered in `RegisterTools(wailsCtx)` with `mcp.AddTool(server, &mcp.Tool{...}, handler)`.
Schemas are built with three helpers in `tools.go`: `objSchema` (object + required fields),
`emptyObjSchema`, and `desc` (field description). `jsonschema.Schema` objects are shared across
the registration.

Handlers receive `(ctx, *mcp.CallToolRequest, raw map[string]any)` because agent input is
loosely typed: numbers arrive as strings, booleans as `"true"`, element arrays as JSON strings.
`tools.go` normalises that with `flexibleInt`, `flexibleBool`, `flexibleStringList`,
`withNormalizedElements` and friends before decoding into typed structs. Do not tighten this
into a strict `json.Unmarshal` — real clients send the loose forms.

### The canvas round trip

Most tools cannot answer from Go alone: the document lives in the React scene store, not in the
Go process. `emitSync` is the bridge:

```
mcp tools/call  ──► handler ──► emitSync(ctx, action, payload, timeout)
                                     │
                                     ├─ pendingRequests[requestID] = ch
                                     ├─ EventsEmit(wailsCtx, "mcp:action", {action, requestId, payload})
                                     │
                    frontend use-mcp-actions.ts dispatches on action
                                     ├─ mutates the Saraswati engine / store
                                     └─ SubmitResponse(requestId, result)   [Wails binding]
                                     │
                              ch receives result ──► handler shapes the MCP response
```

- `pendingRequests` is guarded by `mu`; a late response for an unknown id is dropped.
- Each call has a timeout (5 s, 15 s, 20 s for renders, 30 s for file opening). On timeout the
  wait channel is removed and the tool returns an error that names the likely cause: the editor
  is not open, so nothing consumed the event.
- Tools that can be answered inside Go skip the bridge entirely (workspace listing via
  `listWorkspaceMetas`, Unsplash search via the service).
- Image-returning tools attach a PNG content block alongside text, so the model can look at
  what it produced.

Tool categories: canvas inspection (`get_canvas_summary`, `get_canvas_image`, `list_objects`,
`get_object_properties`, `get_selection`), composition (`render_elements`, `modify_elements`,
`delete_object`, `group_objects`, `ungroup_objects`, `align_objects`, `distribute_objects`,
`fit_to_artboard`, `apply_artboard_preset`, `set_background`, `clear_canvas`), files
(`list_files`, `open_canvas`, `rename_file`, `export_png`, `export_object`), assets
(`search_unsplash`, `get_font_list`, `list_stickers`), and interaction (`select_objects`,
`get_canvas_state`, `create_canvas`).

---

## 7. Prompts

`prompts.go` registers three prompts, each returning one user message:

| Prompt | Arguments | Purpose |
|---|---|---|
| `design-graphic` | `topic` (required), `dimensions`, `style` | Routes the brief, embeds the matched workflow + its rules, then the render gate |
| `edit-canvas` | `instruction` (required) | Routes to the edit workflow and forbids recreating the canvas |
| `design-audit` | none | Routes to the critique workflow; summary + annotated read, one fix, verdict |

**Prompts do not contain a workflow.** They are generated from the library at request time:

```
designGraphicPrompt(topic, dimensions, style)
  task := topic + " — " + style          // the canvas sentence is deliberately excluded
  plan := lib.Plan(task, 0)              // same router as resources: poster, logo, create, ...
  message = brief + tool mapping + plan.Skill.Body (links rewritten) + rule instruction + verify gate
```

Three pieces are prompt-only because the library cannot know them: the user's brief, this app's
tool names (`get_canvas_summary`, `render_elements`, `get_canvas_image`, ...), and the
verification gate that closes the loop with a render. Everything else — ordering, decision
points, thresholds — comes from `skill://create|edit|critique` and the rules they link.

Why not keep hand-written prompt text: a second copy of the method drifts, and
`skill.Validate()` cannot see prompt strings, so the rot would ship silently. A test
(`TestPromptsQuoteOnlyExistingRules`) asserts every `rules://` URI a prompt emits resolves, and
`TestPromptsStaySmall` caps the size so the duplication instinct gets caught.

Prompts remain the only *user-triggered* primitive: clients expose them as slash commands, so the
text lands in the conversation even when the model never opens the resource list. The same
doctrine still ships as `DesignerInstructions` on connect, because prompts only run when a human
picks one.

---

## 8. The design library as MCP resources

This is the part that mirrors SpriteWare's skill tree: the knowledge ships as files, is embedded
in the binary, and is served as resources so a client that installs nothing can still read it.

### 8.1 Source of truth

`internal/skill/` is ordinary markdown. There is no database and no build step that generates
content — the `.md` files are the product.

```
internal/skill/
├── SKILL.md               entry point: routing table, gates, how to read a rule
├── <task>/SKILL.md        21 workflows (poster, logo, brand, color, ...)
├── references/*.md        14 lookup notes (thresholds, tables, formats)
├── rules/NN-topic.md      112 principles, fixed 10-section shape
└── rules/README.md        generated index by domain (rules://index)
```

The corpus was gathered and cross-checked with [vectile](https://github.com/d3uceY/vectile) —
a local RAG (Retrieval Augmented Generation) app for Windows, macOS and Linux that indexes your
notes, books and code into one SQLite database with hybrid vector + full-text search (Reciprocal
Rank Fusion), so material is found by meaning rather than exact wording. Keyboard-first, and
everything runs on your machine. Each rule is written against a passage that can be re-found
rather than recalled.

### 8.2 Embed and parse

```go
//go:embed SKILL.md
//go:embed */SKILL.md
//go:embed rules/*.md
//go:embed references/*.md
var content embed.FS
```

`skill.Load()` reads every file once and builds a `Library`:

- `skills` — frontmatter `name`/`description`, body, the rule and reference links it declares.
- `rules` — title from `# Rule:`, domain and ID from the metadata line, the ten H2 sections,
  related IDs, source bullets.
- `references` — title from the first H1.
- `ruleIndex` — `rules/README.md`, kept out of the rule map.
- `docFreq` — per-token document frequency over skill descriptions, used for IDF routing.

`skill.Default()` wraps `Load` in `sync.Once`: the embedded FS cannot change at runtime, so one
parse per process is enough. Both the MCP server and any future caller share it.

### 8.3 Publication

`designResources(lib)` returns one `designResource{URI, Name, Description, Body}` per document:

| Kind | URI pattern | Count | Example |
|---|---|---|---|
| Entry | `skill://avnac-design` | 1 | routing table and gates |
| Task skill | `skill://<folder>` | 21 | `skill://poster`, `skill://ui` |
| Reference | `references://<stem>` | 14 | `references://typography` |
| Rule | `rules://<stem>` | 112 | `rules://24-typographic-hierarchy` |
| Index | `rules://index` | 1 | every rule by domain |

Total 149. Descriptions are the frontmatter description (truncated to 150 runes on a word
boundary) or, for rules, `"<Title> — <domain> rule"` — a resource an agent will not recognise is
a resource it will not read. The list is sorted by URI so `resources/list` is stable between
launches.

### 8.4 Reference rewriting — the part that makes links work

On disk, library files link each other with relative paths because they are also readable as a
folder. Over MCP those paths are meaningless. Every served body therefore passes through
`linkToResource`:

| Link target on disk | Served as |
|---|---|
| `../rules/24-typographic-hierarchy.md` | `rules://24-typographic-hierarchy` |
| `../references/typography.md` | `references://typography` |
| `../poster/SKILL.md` | `skill://poster` |
| `02-visual-hierarchy.md` (inside `rules/README.md`) | `rules://02-visual-hierarchy` |

Without this, an agent reading `skill://poster` would follow a link that resolves to nothing.
With it, navigation is a sequence of `resources/read` calls. `resources_test.go` asserts that no
served body still contains a relative library link, and that the poster resource links
`rules://24-typographic-hierarchy`.

### 8.5 Registration and the read path

```go
bodies := make(map[string]string, len(resources))
for _, r := range resources {
    bodies[r.URI] = r.Body
    srv.AddResource(&mcp.Resource{
        URI: r.URI, Name: r.Name, Description: r.Description, MIMEType: "text/markdown",
    }, func(_ context.Context, req *mcp.ReadResourceRequest) (*mcp.ReadResourceResult, error) {
        body, ok := bodies[req.Params.URI]
        if !ok {
            return nil, mcp.ResourceNotFoundError(req.Params.URI)
        }
        return &mcp.ReadResourceResult{Contents: []*mcp.ResourceContents{{
            URI: req.Params.URI, MIMEType: "text/markdown", Text: body,
        }}}, nil
    })
}
```

Reads are a map lookup: no disk I/O, no markdown parsing, no per-request allocation of the
library. An unknown URI returns JSON-RPC `-32002` (`CodeResourceNotFound`), which clients render
as "resource not found" rather than a tool failure.

`RegisterResources` is called from `Start` and a failure is logged, not fatal — losing guidance
must never take the canvas tools down.

### 8.6 The instruction index

Instructions are paid for on every message, so the server does not enumerate 112 rules there.
`designResourceIndex(lib)` appends a compact block computed from the live library:

```
## On-demand reading (MCP resources)

The design library is served as resources. Read the one the task needs rather than guessing:
- `skill://avnac-design` — entry point: routing table, always-on gates, how to read a rule.
- `skill://<task>` — 21 task workflows: analyze, brand, color, ... visualize.
- `references://<subject>` — 14 lookup notes: accessibility, branding, ... web-and-ui.
- `rules://index` — all 112 rules by domain, with links.
- `rules://<id>` — one authoritative principle, e.g. `rules://24-typographic-hierarchy`.
Start at `skill://avnac-design`, then the task skill, then the 4–8 rules it links.
```

Counts come from the library, so they cannot drift from reality. The 112 rules collapse to two
lines; `rules://index` carries the names.

### 8.7 Read sequence

```
Client                          Avnac MCP                                    Library
  │                                │                                          │
  │─ initialize ──────────────────►│                                          │
  │◄─ instructions + capabilities ─│  (tools, prompts, resources)             │
  │                                │                                          │
  │─ resources/list ──────────────►│  149 URIs + descriptions                  │
  │◄───────────────────────────────│  (map built at registration)             │
  │                                │                                          │
  │─ resources/read skill://poster►│                                          │
  │                                │  bodies[uri] ────────────────────────────►│ (no I/O)
  │◄── markdown, links rewritten ──│                                          │
  │                                │                                          │
  │─ resources/read rules://24-...►│                                          │
  │◄── rule body ──────────────────│                                          │
  │                                │                                          │
  │─ resources/read rules://nope ─►│                                          │
  │◄── error -32002 ───────────────│                                          │
```

### 8.8 Why resources rather than tools

- **No side effects, no budget.** Reading knowledge should not consume a tool call or appear in
  an audit of document mutations.
- **Discoverable.** `resources/list` is the protocol's catalogue; an agent can browse before it
  acts, instead of guessing a tool name.
- **Cacheable.** Clients may cache `resources/read` results; tool results are not cacheable by
  contract.
- **Composable with the skill install.** The same files are a normal Agent Skill folder on disk
  (`skills/avnac-designer/SKILL.md` documents the MCP URIs for agents that install skills), so
  one source serves both paths.

### 8.9 Resource templates (available, not used)

`Server.AddResourceTemplate` is supported by go-sdk v1.6.0. The alternative design exposes
`rules://{id}` as a template and only lists `rules://index`, which keeps `resources/list` short.
It is not used because explicit resources work in every client, while template support varies.
If the rule count grows past the point where a 149-entry list is unwieldy, the migration is:
register the index explicitly, add one template, and drop the 112 individual registrations —
`designResources` is the single place to change.

---

## 9. Library data contract

The library is code-adjacent data, so its shape is enforced rather than trusted.

### Rule files

```
# Rule: <Title>

**Domain:** <domain> · **ID:** `<file stem>`

## Purpose / Definition / Core Principles / Techniques / When to Use / When to Avoid
## Common Mistakes / Practical Examples / Related Rules / Sources
```

- The ten H2 headings must exist, exactly once, in that order.
- The header line must name the same ID as the file stem, and a domain from the fixed set
  (`foundations`, `color`, `typography`, `layout`, `psychology`, `branding`, `illustration`,
  `imagery`, `print`, `ui`, `history`, `production`).
- `Related Rules` and `Sources` must not be empty, and every related link must resolve.
- At most 120 rule files (`skill.MaxRules`).

### Skill files

YAML frontmatter with `name` (must equal the folder) and `description` (the trigger sentence),
then sections including `## Rules to apply` with at least three rule links and `## References`.

### References

An H1 and lookup material; at least one H1 is enforced.

### Enforcement

| Layer | What it catches |
|---|---|
| `skill.Validate()` | Contract violations, broken links, unknown domains, rule ceiling |
| `internal/skill/skill_test.go` | Runs `Validate`, checks routing, plan assembly, section access |
| `.dsh/scratch/validate.py` | Per-file lint during authoring (not part of the build) |
| `rules/README.md` | Generated index; regenerate after adding or renaming a rule |

`Validate` is exported so a startup self-check or a future CI job can assert the embedded data
without duplicating the rules.

---

## 10. State and settings

`MCPState` is what Settings renders and what `GetMCPInfo` returns:

| Field | Meaning |
|---|---|
| `Enabled` | mirrors `mcp_enabled` |
| `Running` | listener is bound |
| `Port` | resolved port (0 when stopped) |
| `URL` | `http://127.0.0.1:<port>/` |
| `SSEURL` | `.../sse` |
| `Error` | last start failure, e.g. pinned port already in use |

Relevant config keys (`avnac-system/config/config.go`):

| Key | Default | Behaviour |
|---|---|---|
| `mcp_enabled` | `false` | The server is opt-in; Settings toggles it |
| `mcp_port` | `0` | `0` = auto (12345, else ephemeral); non-zero = strict pin, clamped to 1024–65535 |

Wails bindings the UI calls: `GetMCPInfo`, `RegenerateToken`, and the existing
`SecretsManager.GetKey` for the token value. The frontend never receives the token through
`MCPState`.

---

## 11. Failure modes

| Symptom | Cause | Where it surfaces |
|---|---|---|
| Client cannot connect | Server disabled in Settings, or wrong port | `MCPState.Enabled/Running` |
| 401 on every call | Stale token after regeneration | Response body names Settings |
| Bind error on start | Pinned port taken by another process | `MCPState.Error`, log line |
| Tool times out | The editor is not open, so nothing answers `mcp:action` | Tool error names the likely cause |
| 413 | Request body over 32 MiB (usually an oversized `render_elements`) | HTTP status |
| `-32002` on `resources/read` | Typo or a URI scheme the server does not serve | JSON-RPC error |
| Resources missing entirely | Library failed to load; logged, tools still work | Log: `mcp: design resources unavailable` |
| URL changes between launches | Port 12345 was taken, ephemeral fallback used | Settings shows the resolved URL |

---

## 12. Testing

- `go test ./avnac-system/mcp` — auth and constant-time comparison, HTTP routing table,
  lifecycle start/stop, token regeneration, resource publication.
- `TestResourcesListAndReadOverMCP` is the important one: it connects a real go-sdk client to a
  real server over `mcp.NewInMemoryTransports()`, lists all 149 resources and reads the entry,
  a skill, a reference, a rule and the index — the same path a client takes, minus the socket.
- `go test ./internal/skill` — contract validation, routing table, plan assembly, rule lookup by
  number/ID/title, search ranking, section access.
- `go build ./...` — the embed directives make a missing directory a build error rather than a
  runtime surprise.

Run everything before shipping a change to either package:

```bash
go test ./internal/skill ./avnac-system/mcp -count=1
go test ./...
```

---

## 13. Extending

| Task | Steps |
|---|---|
| Add a rule | Create `internal/skill/rules/NN-topic.md` from the template; link it from at least one task skill; run the index generator; `go test ./internal/skill` |
| Add a task skill | Create `internal/skill/<name>/SKILL.md` with matching frontmatter; link 3+ rules and 1+ reference; add a routing case to `skill_test.go` |
| Add a reference | Create `internal/skill/references/<subject>.md` with an H1 and a rules list; link it from the skills that need it |
| Add a tool | Register in `RegisterTools` with `objSchema`; if it needs the canvas, call `emitSync` with a timeout and add the matching branch in `use-mcp-actions.ts` |
| Add a prompt | Register in `RegisterPrompts`; keep the text self-contained — the client only pastes it |
| Add a resource namespace | Extend `designResources` and `designLinkPatterns`; update `resources_test.go` counts |
| Change instructions | Edit `DesignerInstructions` in `server.go`; the resource index is appended automatically |

---

## 14. Invariants

Break one of these and clients break, even if `go test` is green:

1. **URI stability.** `skill://`, `references://`, `rules://` and `rules://index` are the public
   contract. Renaming a scheme invalidates every link in every served document.
2. **Link rewriting covers every link shape.** A new relative link form that `linkToResource`
   does not know is a dead end for the agent.
3. **Instructions stay small.** They ride on every message; add a line only if it changes
   behaviour, and prefer pointing at a resource.
4. **Resources are read-only.** No handler may mutate state or call `emitSync`.
5. **The rule ceiling holds.** 120 is the point where an agent can still hold the index.
6. **Counts in the instruction index come from the library**, never hard-coded.
7. **Failures degrade, never cascade.** A resource or library failure must not stop tools.

---

## 15. Debugging

```bash
# Is it running? (no token needed; HTML status page)
curl -s http://127.0.0.1:12345/ | head

# Unauthenticated request should be 401
curl -i -X POST http://127.0.0.1:12345/ -H 'Content-Type: application/json' -d '{}'

# Authenticated initialize (token from Settings)
curl -s -X POST http://127.0.0.1:12345/ \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"curl","version":"0"}}}'

# List resources
curl -s -X POST http://127.0.0.1:12345/ \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"resources/list"}'
```

The server logs every request line (`[MCP] POST / ... Accept: ...`), the resolved URL on start,
the degraded-auth warning, and any resource-registration failure. Grep for `[MCP]` in the app
log.

To confirm the library itself is healthy without starting the app:

```bash
go test ./internal/skill -run TestValidate -v
```
