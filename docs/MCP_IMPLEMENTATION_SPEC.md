# Spec: MCP Server with an Embedded Design-Knowledge Base

**Status:** reference implementation shipped in Avnac Studio (Go, Wails desktop app).
**Purpose of this document:** a self-contained build spec. Paste it into a repository or an
agent and it should be implementable without reading the original codebase.

**What it describes:** an MCP (Model Context Protocol) server that exposes

1. **tools** that mutate a live document held by a desktop/web app,
2. **prompts** that start structured workflows,
3. **resources** that serve a versioned, embedded knowledge base (skills → references → rules).

The knowledge base is plain markdown on disk, embedded at build time, parsed once into an
immutable in-memory index, and served read-only over `resources/read`. There is no database.

---

## 0. Non-goals

- No remote/multi-user access: the server binds loopback only.
- No dynamic content authoring at runtime: the knowledge base is a build artifact.
- No vector/semantic search service: routing is deterministic token scoring.
- No write path for resources: they are read-only by contract.

---

## 1. System shape

```
┌──────────────────────────── host application (single process) ────────────────────────────┐
│                                                                                            │
│  app startup ──► MCP server construction ──► tools + prompts + resources registered        │
│                        │                                                                   │
│                        ├── instructions = doctrine + compact resource index                │
│                        │                                                                   │
│  config watcher ──────► listener start/stop (enabled flag, port)                          │
│                                                                                            │
│  ┌──────────────┐   go-sdk / equivalent   ┌──────────────────────────────┐                 │
│  │ HTTP listener│── Streamable HTTP ─────►│ MCP server (JSON-RPC)        │                 │
│  │ 127.0.0.1    │── legacy SSE ──────────►│ tools · prompts · resources  │                 │
│  └──────────────┘                          └───────────┬──────────────────┘                 │
│                                                        │                                   │
│  ┌─────────────────────────────┐        ┌──────────────▼──────────────────┐                │
│  │ embedded knowledge base     │        │ URI → precomputed body map      │                │
│  │ SKILL.md · skills · refs · rules │◄──│ (built once at registration)    │                │
│  └─────────────────────────────┘        └─────────────────────────────────┘                │
│                                                        │                                   │
│  UI state (document) ◄── app event ── tool handler ────┘  round-trip for mutations         │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

Three surfaces, three jobs:

| Surface | Primitive | Job | Cost |
|---|---|---|---|
| Tool | `tools/call` | Change or read the document | Per call, side effects |
| Prompt | `prompts/get` | Start a task with a full instruction block | Once per task |
| Resource | `resources/read` | Consult knowledge | On demand, no side effects |

Decision rule: **mutates state → tool. Knowledge → resource. Scripted start → prompt.**

---

## 2. Storage model (the knowledge base)

This is the part to get right first; everything else reads from it.

### 2.1 Source of truth

Markdown files in a single directory tree. No database, no CMS, no generated runtime content.

```
internal/skill/
├── SKILL.md                     entry point: routing table, invariants, how to read a rule
├── <task>/SKILL.md              21 task workflows (poster, logo, brand, ...)
├── references/<subject>.md      14 lookup notes: thresholds, tables, format matrices
├── rules/NN-topic.md            112 principles, fixed 10-section shape
└── rules/README.md              generated index by domain (committed)
```

Counts at the time of writing: 1 entry + 21 skills + 14 references + 112 rules + 1 index = **149
documents**. The rule count is capped at **120**.

### 2.2 Build-time embedding

The tree is compiled into the binary:

- Go: `//go:embed SKILL.md` + `*/SKILL.md` + `rules/*.md` + `references/*.md` into an `embed.FS`.
- Node/TS: import the files into the bundle (`import.meta.glob` / static JSON manifest).
- Python: `importlib.resources` or a generated module of string constants.

Consequences that must hold: no filesystem access at runtime, no path traversal, a missing
directory is a **build** error, and the served bytes are exactly the reviewed bytes.

### 2.3 Parse once

```
Library = parse(embedded tree)      // once per process, memoized
```

Data structures to build:

```
Library
├── root          : Skill             // SKILL.md
├── skills        : map[name]Skill     // sorted name list kept too
├── rules         : map[id]Rule        // sorted id list kept too
├── references    : map[stem]Reference
├── ruleIndex     : string             // rules/README.md, not a rule
└── docFreq       : map[token]int       // IDF support, over skill text
```

`Skill` = `{name, description, path, body, ruleIDs[], referenceNames[]}`.
`Rule` = `{id, title, domain, path, body, sections: map[heading]string, relatedIDs[], sources[]}`.
`Reference` = `{name, title, path, body}`.

Memoize with a once/`sync.Once`-equivalent: the embedded tree cannot change, so one parse is
correct and cheap.

### 2.4 Precomputed publication

At server registration, build one `URI → string` map from the library. Reads become a map
lookup: no disk I/O, no markdown parsing, no allocation per request. 149 small strings ≈ a few
hundred KB — keep them.

### 2.5 Why not a database

- The corpus is small (≈115k words) and read-only.
- Reviewability matters more than query power: every fact is a diffable file.
- A DB would add a migration path for content that changes at build cadence.
- The index is a generated markdown file, so agents can read the catalogue with the same
  mechanism they read the content.

### 2.6 Encoding and formatting rules

- UTF-8, no BOM, LF line endings (normalize CRLF on read anyway).
- Markdown only. No HTML in rule bodies (tables and code fences are fine).
- File stem is the identity: `24-typographic-hierarchy.md` ↔ id `24-typographic-hierarchy`.
- Two-digit prefix = ordering band (`00–09` foundations, `10–19` color, `20–29` typography,
  `30–39` layout, `40–47` psychology, `50–58` branding, `60–69` illustration, `70–76` imagery,
  `80–87` print, `90–99` UI, `100–110` history, `111–119` quality/delivery).
- Domains are a closed enum: `foundations, color, typography, layout, psychology, branding,
  illustration, imagery, print, ui, history, production`.
- Kebab-case only; no spaces, no uppercase.

---

## 3. Knowledge base file formats

### 3.1 Rule

```markdown
# Rule: Typographic Hierarchy

**Domain:** typography · **ID:** `24-typographic-hierarchy`

## Purpose
## Definition
## Core Principles
## Techniques
## When to Use
## When to Avoid
## Common Mistakes
## Practical Examples
## Related Rules
## Sources
```

Rules of the shape:

| Constraint | Why |
|---|---|
| Exactly those ten H2s, once each, in order | The router and tests index by heading; a renamed heading is a silent gap |
| Header ID must equal the file stem | Lookup by id is O(1) and unambiguous |
| `Related Rules` = markdown links with relative paths (`24-…md`) | Rewritten to MCP URIs at publication |
| `Sources` = bullet lines | Provenance is a delivery requirement, not decoration |
| 45–95 lines typical | Long enough to be actionable, short enough to read in one pull |

### 3.2 Skill (task workflow)

```markdown
---
name: poster
description: One paragraph, 35–60 words, the words a real user would type.
---

# Poster Design

## Applies when
## Workflow
1. Numbered steps with concrete values.
## Decision points
## Rules to apply
- [`24-typographic-hierarchy`](../rules/24-typographic-hierarchy.md) — why it matters here.
## References
- [`composition`](../references/composition.md)
## Production checks
## Output format
```

Constraints: `name` equals the folder; `description` is the trigger and must be "pushy" (an
agent should know when to load it); 3+ rule links; 1+ reference link.

### 3.3 Reference

First line `# <Subject> — reference`, a "use when" paragraph, then tables/checklists, then a
rules list with 6–12 links. Numbers live here; the reasoning lives in rules.

### 3.4 Index (`rules/README.md`)

Generated from the files themselves: per-domain counts, then one bullet per rule
(`[id](id.md) — title`). Regenerate after any add/rename; never hand-edit. It is served as
`rules://index` and is excluded from the rule map.

### 3.5 Frontmatter parser (no YAML dependency needed)

Support only what the format uses:

```
if first line is "---":
    read until the next "---"
    for each line:
        indented → continuation of the previous scalar, joined with a space
        "key: value" → key lowercased, value trimmed of quotes
    body = everything after the closing fence
else: no frontmatter (legal for rules)
```

Unknown keys are ignored, not errors — hosts may drop them.

---

## 4. Library API

Minimum surface the MCP layer needs:

```
Load() -> Library, error              // parse once
Default() -> Library, error           // memoized Load
Entry() -> *Skill
SkillNames() -> []string
Skill(name) -> *Skill, bool
RuleIDs() -> []string
Rule(query) -> *Rule, bool            // "24", "24-topic", "topic title", "rules/24-topic.md"
ReferenceNames() -> []string
Reference(name) -> *Reference, bool
RuleIndexBody() -> string, error      // rules/README.md
RulesInDomain(domain) -> []*Rule
Route(task, limit) -> []Route          // ranked skills
Search(query, limit) -> []Hit          // ranked rules
Plan(task, maxRules) -> *Plan          // routed skill + rules + references + markdown
Validate() -> error
```

### 4.1 Rule lookup order

1. Exact id after trimming `rules/` and `.md`.
2. Leading number → first id with that prefix (`"24"` → `24-…`).
3. Normalized title equality (`"Type Pairing"` → `type-pairing`-style normalization).

Normalization: lowercase, collapse every run of non-alphanumerics to a single space.

### 4.2 Routing algorithm (deterministic, no ML)

```
tokens(q) = lowercase words, len >= 3, minus stopwords, strip a trailing "s" when len > 4
df[t]     = number of skills whose (name + description + "Applies when") contains t
idf(t)    = log((N_skills + 1) / df[t])          // tokens everywhere ⇒ near zero weight
score(s)  = Σ_{t ∈ tokens(q), t ∈ s} idf(t) × (2 if t ∈ tokens(s.name) else 1)
          + 5 if any token(q) equals s.name      // naming the deliverable wins
sort: score desc, then name asc (stable)
```

Properties to preserve: "design" appears in nearly every description so IDF makes it worthless;
"poster" is rare and dominates; a task that literally says "logo" must beat a description that
merely mentions logos.

### 4.3 Search (explicit lookups)

Same IDF idea over rules, with `df` counted by substring presence in title + id + body, title
matches weighted ×3. Used to fill a `Plan` when a skill links fewer rules than requested.

### 4.4 Plan

```
route  = Route(task, 3)[0]                 // best skill
rules  = resolve(route.ruleIDs)            // its own recommendations, always included
fill   = Search(task, maxRules)            // add unseen hits up to the fill target
refs   = resolve(route.referenceNames)
md     = route.body + "\n\n---\n\n" + each rule body
```

`maxRules` bounds the *fill*, not the skill's own links: a rule-heavy skill may exceed it.

### 4.5 Validation (must be exported and tested)

- Root has `name` and `description`.
- Skill count > 0; every skill's `name` equals its folder; description non-empty; ≥3 resolvable
  rule links; every reference link resolves.
- Every rule: title present, domain in enum, all ten sections present in order, ≥2 resolvable
  related links, ≥1 source bullet.
- Rule count ≤ 120.
- Every reference has an H1.

---

## 5. Publishing the knowledge base over MCP

### 5.1 URI scheme (public contract — do not rename)

| Kind | Pattern | Count | Example |
|---|---|---|---|
| Entry | `skill://avnac-design` | 1 | routing table |
| Task skill | `skill://<folder>` | 21 | `skill://poster` |
| Reference | `references://<stem>` | 14 | `references://typography` |
| Rule | `rules://<stem>` | 112 | `rules://24-typographic-hierarchy` |
| Index | `rules://index` | 1 | every rule by domain |

All are `text/markdown`. Descriptions: frontmatter description truncated to 150 runes at a word
boundary; rules use `"<Title> — <domain> rule"`. Sort the list by URI so `resources/list` is
stable across launches.

The entry URI's name segment is the product slug (`avnac-design` here). Pick one stable name per
product and never rename it: it is the first link every agent follows.

### 5.2 Link rewriting (critical)

On-disk relative links are meaningless over MCP. Rewrite every served body:

| On disk | Served |
|---|---|
| `../rules/<id>.md` | `rules://<id>` |
| `../references/<name>.md` | `references://<name>` |
| `../<skill>/SKILL.md` | `skill://<skill>` |
| `<id>.md` (inside `rules/README.md`) | `rules://<id>` |

Regexes (apply in any order):

```
\]\((?:\.\./)?rules/([A-Za-z0-9._-]+)\.md\)       -> ](rules://$1)
\]\((?:\.\./)?references/([A-Za-z0-9._-]+)\.md\)  -> ](references://$1)
\]\((?:\.\./)?([a-z]+)/SKILL\.md\)                -> ](skill://$1)
\]\((\d{2,3}-[a-z0-9-]+)\.md\)                    -> ](rules://$1)
```

Acceptance: no served body contains `](../rules/`, `](../references/`, or a bare
`(NN-….md)` link.

### 5.3 Registration and read handler

```
bodies := map[string]string{}          // built once
for r in published:
    bodies[r.uri] = rewrite(r.body)
    server.AddResource(
        Resource{URI: r.uri, Name: r.name, Description: truncate(r.description, 150),
                 MIMEType: "text/markdown"},
        handler(uri):
            body = bodies[uri] or return ResourceNotFoundError(uri)   // JSON-RPC -32002
            return ReadResourceResult{Contents: [{URI: uri,
                    MIMEType: "text/markdown", Text: body}]}
    )
```

Handlers must not touch disk, mutate server state, or call the app event bridge.

### 5.4 Instructions (the index)

Instructions ride on every message, so never enumerate all rules there. Compose:

```
<design doctrine: 5–15 lines of non-negotiables>

## On-demand reading (MCP resources)

The design library is served as resources. Read the one the task needs rather than guessing:
- `skill://avnac-design` — entry point: routing table, always-on gates, how to read a rule.
- `skill://<task>` — {N} task workflows: {names}.
- `references://<subject>` — {M} lookup notes: {names}.
- `rules://index` — all {R} rules by domain, with links.
- `rules://<id>` — one authoritative principle, e.g. `rules://24-typographic-hierarchy`.
Start at the entry, then the task skill, then the 4–8 rules it links.
```

Counts are computed from the library, never hard-coded. This block is the discovery mechanism;
`resources/list` is the second.

### 5.5 Capabilities

Advertise `tools`, `prompts`, `resources: {subscribe: false, listChanged: true}`. With the Go SDK
this follows automatically from registrations; with a hand-rolled server it must be explicit —
including any legacy `server/discover` probe path, which must answer with the same instructions
and the same capability set, or two negotiation paths will disagree.

---

## 6. MCP tool surface

### 6.1 Tool design conventions

- 20–30 tools, grouped by verb: inspect, compose, files, assets, interaction.
- Every input schema is an object with explicit `required`; descriptions say what the tool
  returns, not only what it accepts.
- Tolerate loose input: agents send numbers as strings, booleans as `"true"`, arrays as
  JSON-encoded strings. Normalize before decoding; never rely on strict unmarshal.
- Mutating tools return created/updated ids and enough data to verify the result; image-bearing
  tools may attach a PNG content block so the model can look at its own output.
- Time out every app round trip (5–30 s depending on cost) and name the likely cause when it
  expires ("is the editor open?").

### 6.2 Bridge to the host UI

If the document lives in the app's UI process, the tool handler cannot answer alone:

```
tools/call → handler → pending[requestID] = channel
                     → emit app event {action, requestId, payload}
                     → UI dispatches on action, mutates document
                     → UI calls bound method SubmitResponse(requestId, result)
                     → channel receives → handler shapes MCP result
```

Guard `pending` with a mutex; drop late responses for unknown ids; always clean up on timeout.

### 6.3 Prompts

Three prompts are enough to cover the workflow:

| Prompt | Args | Purpose |
|---|---|---|
| `design-graphic` | topic (required), dimensions, style | Route the brief → embed the matched workflow → verify render |
| `edit-canvas` | instruction (required) | Route to edit → change the live document → verify |
| `design-audit` | none | Route to critique → read → one fix → verdict |

**Generate the prompt text from the library; do not hand-write a workflow.** A prompt exists
for one reason only: it is user-triggered, so a client can surface it as a slash command and the
text reaches the conversation even when the model would never have opened the resource list.

Compose each prompt from exactly five parts:

1. The user's brief (the prompt arguments) — the only part only the user can supply.
2. The app's tool mapping (2–3 lines of tool names) — the library is deliberately tool-agnostic.
3. `lib.Plan(task, 0)`: the routed skill body, with its relative links rewritten to
   `rules://` / `references://` URIs.
4. One instruction to read the rules the workflow links.
5. A verification gate: look at the render and compare it to the brief before reporting.

Do NOT put ordering, thresholds or decision rules in the prompt. If you do, you now maintain two
copies of the method, and the library validator cannot see the prompt copy — it will drift
silently. Guard it with two tests: every `rules://` URI a prompt emits must resolve, and the
prompt size stays bounded (a few KB), so a hand-written workflow creeping back in fails the
build.

Routing note: pass the brief and style into `Plan`, but not the canvas-size sentence — an
"A2 poster" routed with "1080x1080" in the task string can be pulled toward screen-format
workflows. When the caller omits a size, say "derive from the brief" rather than inventing a
default that may contradict the routed workflow.

Prompts only run when a human picks one, so the same doctrine must also ship as the server
`instructions` on connect.

---

## 7. HTTP transport layer

One listener, loopback only.

### 7.1 Routing

| Request | Handler |
|---|---|
| `POST` with `?sessionid=` | legacy SSE message |
| `POST` (no sessionid) | Streamable HTTP |
| `GET` with `Mcp-Session-Id` | Streamable HTTP stream |
| `GET` without it (incl. `/sse`) | legacy SSE |
| `DELETE` | Streamable HTTP close |
| other | Streamable HTTP |

### 7.2 Middleware order (load-bearing)

1. **Log** method/path/remote/`Accept`/`Mcp-Session-Id`. Never log `Authorization`.
2. **Status page**: `GET` + `Accept: text/html` + no `text/event-stream` → small HTML page,
   unauthenticated, contains only the connect URL.
3. **Bearer auth**: constant-time compare; 401 with `WWW-Authenticate: Bearer realm="…"`.
4. **Body cap**: declared `Content-Length` over 32 MiB → 413; chunked bodies capped by a max-reader.
   Auth runs first so unauthorized requests cost nothing.
5. **Route**.

### 7.3 Legacy discover probe

Sniff only `POST` bodies ≤ 4 KiB; if the JSON method is `server/discover`, answer with protocol
version, supported versions, capabilities (tools/prompts/resources) and the instructions, then
return. Otherwise re-attach the consumed bytes and continue.

### 7.4 Security requirements

- 32 random bytes, hex, stored in the OS keyring; rotate without restart (read per request).
- Token never in config files, never in `MCPState` payloads, never logged.
- Degraded mode (keyring unavailable): start, warn loudly, loopback only.
- 32 MiB body cap; no filesystem paths accepted from the client.

---

## 8. Lifecycle and configuration

| Config | Default | Semantics |
|---|---|---|
| `mcp_enabled` | false | Opt-in; watcher starts/stops the listener live |
| `mcp_port` | 0 | `0` = auto: try 12345, else ephemeral. Non-zero = strict pin, clamped 1024–65535 |

Rules:

- Register tools/prompts/resources **before** binding, so the first client sees everything.
- A config save must not move a dynamic-port listener; only an explicit pin change restarts it.
- A pinned port that is taken is a surfaced error, not a crash.
- `app.shutdown` must stop the listener; a stale listener is the classic relaunch failure.
- Serialize start/stop/config updates behind one mutex.

---

## 9. Failure behaviour

| Failure | Required behaviour |
|---|---|
| Library fails to load at startup | Log; keep tools working (guidance degrades, canvas doesn't) |
| Unknown resource URI | `-32002`, not a 500 |
| Tool times out | Error naming the likely cause, channel cleaned up |
| Port taken (pinned) | Report in state/log, server stays down |
| No token available | Warn, serve loopback only |
| Oversized body | 413 without buffering |

Invariant: **knowledge failures never break tools.**

---

## 10. Test requirements

| Test | What it proves |
|---|---|
| Load shape | counts match (1 + skills + refs + rules + 1), no empty bodies |
| Validate | contract, links, domains, ceiling |
| URI uniqueness | one resource per URI, sorted list |
| Link rewriting | no `../rules/` or `(NN-….md)` remains in served bodies |
| In-memory end-to-end | real client lists all resources and reads entry/skill/ref/rule/index |
| Unknown URI | returns resource-not-found |
| Auth | missing/wrong token rejected; status page open; constant-time path |
| Transports | streamable initialize + SSE connect + prompts list + discover probe |
| Body caps | declared and chunked oversize rejected; unauthorized rejected before capping |
| Lifecycle | enable/disable/port change; stop frees the port |
| Routing | sample task → expected skill in top 3 (12+ cases) |
| Determinism | same task twice → same order |

Coverage expectation: knowledge/loader ≥80%; server/transport ≥40% (tool handlers that require
the UI runtime are integration-tested, not unit-tested).

---

## 11. Build order (checklist)

**M0 — skeletons**
- [ ] Create the directory tree and the four file types with one real example each.
- [ ] Add the embed globs; confirm a missing directory breaks the build.

**M1 — parser**
- [ ] Frontmatter parser (quotes, continuations, CRLF).
- [ ] Rule header + ten-section parser.
- [ ] Link extraction for `Rules to apply`, `References`, `Related Rules`, `Sources`.
- [ ] `Load` + memoized `Default`.

**M2 — validation**
- [ ] `Validate()` with the checks in §4.5.
- [ ] Content test that runs it over the real tree.

**M3 — routing**
- [ ] Tokenizer + stopwords + IDF.
- [ ] `Route`, `Rule`, `Search`, `Plan`; tie-breaking; determinism test.

**M4 — MCP publication**
- [ ] Resource list builder (typed, sorted, described).
- [ ] Link rewriting + tests.
- [ ] Registration + read handler + not-found mapping.
- [ ] Instructions index computed from the library.

**M5 — transport**
- [ ] Listener, transports, routing, middleware order.
- [ ] Bearer auth + keyring token + rotation.
- [ ] Status page, discover probe, body caps.
- [ ] Lifecycle wiring to config watcher and app shutdown.

**M6 — content**
- [ ] Populate the corpus (rules first, then references, then task skills, then the entry file).
- [ ] Generate the index file; commit it.
- [ ] Lint pass: sections, links, encoding.
- [ ] Routing table tests against real descriptions.

---

## 12. Porting notes

| Concern | Go (reference) | TypeScript | Python |
|---|---|---|---|
| Embed | `embed.FS` | bundler `import.meta.glob` → string map | `importlib.resources` / generated constants |
| MCP SDK | `modelcontextprotocol/go-sdk` | `@modelcontextprotocol/sdk` | `mcp` |
| Once | `sync.Once` | module-level promise | module-level singleton |
| Regex rewrite | `regexp.ReplaceAllString` | `String.replace` | `re.sub` |
| Frontmatter | hand parser (§3.5) | hand parser or `gray-matter` | hand parser or `PyYAML` |
| Server | `http.Server` | `node:http` / Fastify | `uvicorn` / `http.server` |
| Keyring | `go-keyring` | `keytar` | `keyring` |

Keep the storage model identical across ports: **markdown files, embedded, parsed once, served
from a URI map, links rewritten on publication.** The transport and SDK are replaceable; the
storage contract is what makes the library portable.

---

## 13. Wire examples

```jsonc
// initialize
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{
  "protocolVersion":"2025-06-18","capabilities":{},
  "clientInfo":{"name":"cursor","version":"1"}}}
// → result.instructions includes the compact index; capabilities include resources

// list
{"jsonrpc":"2.0","id":2,"method":"resources/list"}
// → 149 {uri, name, description, mimeType:"text/markdown"}

// read a workflow
{"jsonrpc":"2.0","id":3,"method":"resources/read",
 "params":{"uri":"skill://poster"}}
// → contents[0].text = poster workflow, with links rewritten to rules:// / references://

// read the rule it links
{"jsonrpc":"2.0","id":4,"method":"resources/read",
 "params":{"uri":"rules://24-typographic-hierarchy"}}

// unknown
{"jsonrpc":"2.0","id":5,"method":"resources/read",
 "params":{"uri":"rules://nope"}}
// → error {"code":-32002}
```

---

## 14. Definition of done

1. `resources/list` returns exactly `1 + skills + references + rules + 1` entries, unique URIs.
2. A fresh client can start at the entry resource, reach a task workflow, and reach every rule it
   links without ever seeing a relative path.
3. `Validate()` passes over the real tree and fails loudly on a renamed heading or a broken link.
4. Routing picks the intended skill for at least 12 realistic prompts, deterministically.
5. The listener binds loopback only, rejects unauthenticated calls, survives config toggles, and
   frees its port on shutdown.
6. Killing the knowledge base (empty embed) still leaves tools functional, with one clear log line.
7. `go test ./...` (or equivalent) is green, with the knowledge/loader layer above 80% coverage.
