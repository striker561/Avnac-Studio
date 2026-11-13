# Vector and in-task library eval

Three things can fail independently, so the eval checks each one separately:

1. **Routing** — a vector request reaches `skill://vector` and the eight rules.
2. **Retrieval** — the rules and reference resolve over MCP, not just on disk.
3. **Execution** — the tool turns an IR into valid geometry, SVG and a scene element.
4. **In-task guidance** — the library is reached while an agent works, not only when a user asks
   for a skill (`guide` + automatic attachments).

All four run in CI; none needs a browser or a running app.

## How to run

```bash
go test ./internal/skill/ -run TestVector -v          # routing, search, plan assembly
go test ./avnac-system/mcp/ -run 'TestVector' -v      # tool over MCP + resources
go test ./avnac-system/mcp/ -run 'TestGuide|TestAttachGuide' -v   # in-task routing
go test ./internal/vector/ -v                          # geometry, document, operations, audit
cd frontend && npx vitest run tests/unit/mcp/vector-commands.test.ts tests/features/vector/vector-placement.test.ts
```

## 1. Routing and retrieval (`internal/skill/vector_eval_test.go`)

| Case | Expectation | Why it matters |
|---|---|---|
| "draw a geometric fox as clean vectors…" | vector rank 1 | explicit vector work |
| "the curves on this icon look lumpy, fix the bezier handles" | vector rank 1 | path repair |
| "make a symmetric butterfly from paths and mirror the left wing" | vector rank 1 | mirror + construction |
| "vectorize this shape and remove the path overlaps" | vector rank 1 | boolean/overlap cleanup |
| "the exported SVG renders wrong: stray paths and a bad viewBox" | vector rank 1 | SVG validation |
| "export an SVG with the right viewBox…" | vector in top 2 | `export` may legitimately rank first |
| "draw a tiny rocket illustration as SVG for a favicon" | vector in top 2 | competes with `icon` |
| "build a radial mandala from one repeated petal" | vector in top 2 | radial symmetry vocabulary |
| "design an A2 gig poster…", "set up bleed…", "pair a serif…", "my logo disappears at 16 px", "12 column grid…", "dashboard chart labels…", "brand guideline document…" | vector **not** first, expected owner first | no over-triggering |

Plan assembly: a routed vector task includes at least eight rules, all eight IDs 120–127, the skill
body and `references/vector-graphics.md`.

Search: each rule is a top-3 hit for the question it owns — magic triangle, zero handles, balanced
handles, winding, double overlap, viewBox validation, mirror symmetry, left-of constraints, scene
graph ids, circle kappa, board units/frames.

Resource eval (`avnac-system/mcp/vector_resources_test.go`) lists and reads over a real in-memory
MCP client: `skill://vector`, `references://vector-graphics`, `rules://120..127`, and `rules://index`
reporting 125 rules with a Vector drawing section. It also asserts relative links were rewritten to
`rules://` URIs.

## 2. Geometry and tool execution

`internal/vector/vector_test.go` covers:

- a five-object rocket resolves to a valid v3 document (layers, stroke kinds, 256×256 frame);
- the mirrored fin is *exactly* symmetric and its winding reversed;
- `centered_on` with an offset lands the window at the body centre minus 18;
- `inside` preserves aspect and padding; `left_of` produces an exact gap and vertical centring;
- a circle is four anchors with handle length `0.5522847498 × r`; hexagon 6; five-point star 10;
- path anchors infer `symmetric` / `cusp` from handle geometry, and a closed path collapses its
  duplicate anchor;
- an open filled path drops the fill and warns instead of drawing a closing chord;
- ten bad inputs (no canvas, duplicate id, unknown type, no paint, missing box, constraint cycle,
  unknown target, unknown mirror…) fail with actionable messages;
- resize keeps the centre for explicit geometry, mirror tracks a resize, restyle applies, failed
  operations leave the board untouched, and a failed placement leaves no session board;
- the SVG audit catches missing fill, viewBox mismatch, NaN, missing marker and open filled paths;
- output is deterministic, and the document JSON keeps distinct anchor `x`/`y`/`inX`/`inY` fields.

`avnac-system/mcp/tools_vector_test.go` exercises the tool handler with a recorded frontend bridge;
`vector_e2e_test.go` does the same through a real MCP client session (list tools → draw → update →
export → resource read → delete).

## 3. Scene placement

`frontend/tests/unit/mcp/vector-commands.test.ts` covers sizing (fit to 640), explicit position and
scale, clamping, rejection of non-SVG sources and update guards.

`frontend/tests/features/vector/vector-placement.test.ts` applies the generated commands through the
real Saraswati reducer: the image node lands with the expected box and source, and an update replaces
the source in place instead of adding a second element.

## 4. In-task guidance (`guide`)

The library used to be reachable only through resources a user had to ask for, or a prompt a human
triggered. That is the failure mode the `guide` tool and the automatic attachments remove.

| Case | Expectation | Test |
|---|---|---|
| `guide(task="design an A2 gig poster for a jazz trio")` | `skill://poster`, ≥1 rule URI, confidence `high` | `TestGuideToolRoutesAndInlines` |
| same, `inline=true` | `markdown` contains the workflow and `## Core Principles` | `TestGuideToolRoutesAndInlines` |
| `guide(task="compute the fibonacci sequence in rust")` | answered but flagged `low`, with `matchedTokens` and `candidates` | `TestGuideToolFlagsLowConfidence` |
| `guide(task="xyzzy plugh quux")` | `matched:false` pointing at `skill://avnac-design` and `rules://index` | `TestGuideToolNoMatchPointsAtEntry` |
| `elements` render whose name/text is "Blue Note jazz poster" | result carries a compact `guide` automatically | `TestAttachGuideOnCompositionResults`, `TestOpDispatcherAttachesGuide` |
| rect-only render, `padding:8`, text "OK" | no guide: one generic word is not a brief | `TestAttachGuideSkipsWeakAndNonDesignPayloads` |
| an existing `guide`, or an error payload | never overwritten, never decorated | `TestAttachGuideNeverOverwritesOrDecoratesErrors` |
| connect instructions | mention `guide`, `skill://vector` and the rule count | `TestDesignResourceIndexMentionsTheLibrary` |

Why the two modes:

- **Explicit `guide`** is for the agent that knows it needs specialised instructions. It is
  permissive — a single overlapping word still returns a route — but labels confidence, shows the
  matched tokens and lists the other candidates, so the agent can discount a weak match.
- **Automatic attachment** is the safety net for the agent that skipped the call. It is strict:
  only a named deliverable or two overlapping content words attach a guide, because a noisy field
  on every result teaches agents to ignore it. It draws only on text the agent actually sent (page
  names, element text, drawing names), never on speculative context.

Both paths share `skill.Library.Guide`, so the workflow and rule selection cannot drift from the
router the prompts use.

## Known boundary

The Go end-to-end test substitutes the scene-editor bridge (it needs a Wails runtime and a browser).
The frontend half is covered at the reducer level, which is the same path the bridge calls. A full
browser run still needs `wails dev -browser` plus Playwright, as described in `tests/README.md`.

## Baseline results

Run on 2026-11-13 (Go 1.26.4, Node 24.12.0, Windows):

| Suite | Result |
|---|---|
| `go test ./...` | all packages pass |
| `go vet ./...` | clean |
| `go test ./internal/skill -run TestVector` | 5 evals pass |
| `go test ./avnac-system/mcp -run TestVector` | tool, resource and protocol e2e pass |
| `go test ./avnac-system/mcp -run 'TestGuide|TestAttachGuide'` | 9 guide cases pass |
| `npm run test:unit` | 283 pass (50 files) |
| `npm run test:features` | 27 pass (4 files) |
| `npm run typecheck` | clean |