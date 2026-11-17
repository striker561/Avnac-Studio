# Running an agent rule-timing eval

This is the procedure for checking whether a real agent fetches Avnac's design route and reads
the right rules *before* it composes — and for explaining, with evidence, why it missed one.

The eval is a blind subagent plus the session transcript. The transcript is the ground truth: it
records every nested MCP call, every resource URI read, and the order they happened in. A delivery
note is not evidence.

## What it measures

| Question | Evidence |
|---|---|
| Did the agent route before drawing? | `guide` step vs first `elements render` / `vector draw` step |
| What did it read? | `read_mcp_resource` dispatches with `uri` |
| Did it read the routed skill and rules? | the guide payload's `rules` vs the read URIs |
| Did it read the rules the deliverable needs? | scenario rubric, written before the run |
| Did validate know the route? | `guideReceipt.source` = `explicit` or `inferred`, plus `readNext` |
| Did it use a field the schema ignores? | element keys vs the element schema |
| What was actually produced? | `get_canvas_state` per page, plus PNGs |

## Prerequisites

- Avnac Studio running, MCP server enabled, and DSH connected to it.
- The repository builds: `go test ./...`.
- Node.js for the transcript analyzer.
- Access to the DSH session store (`%USERPROFILE%\.dsh\sessions` on Windows, `~/.dsh/sessions`
  elsewhere).

## Run a scenario

1. **Write the brief and the hidden rubric first.** The brief reads like a client request. It must
   not mention `guide`, `rules://`, `validate`, "test", or "eval". The rubric names the rules the
   deliverable actually needs, and the expected timing.
2. **Prepare the surface.** Create or open a blank project at the target size so canvas setup is
   not the variable. Tell the agent the project name and that it must work only there.
3. **Launch a subagent** with a self-contained prompt. Template:

   ```
   You are designing in Avnac Studio. The blank project "<name>" is already open at <size>;
   work only in this project and do not create another one.

   Brief from the client:
   <the brief, in the client's words>

   Do not touch any local files. When you finish, reply with a short delivery note: what you
   made, any assumption you had to make, and anything the client still needs to do.
   ```

   Do not tell it that rules exist, that it is being tested, or which rules to read.
4. **Run one agent at a time.** The app has one MCP server instance; two clients driving it at once
   is not supported and the guide state is shared.
5. **Capture the result.** Call `get_canvas_summary`, then `canvas op=go-page` and
   `get_canvas_state` + `get_canvas_image` for each page. Save the state and PNGs.
6. **Analyze the transcript** (next section) and grade against the rubric.

## Analyze the transcript

```
node scripts/agent-eval/analyze-session.mjs <session-id-or-fragment>
```

The analyzer finds the session under `.dsh/sessions`, decompresses the concatenated zstd frames,
and prints JSON with:

- `session` — id, origin (`subagent`), delegation depth;
- `mcpCalls` — Avnac tool calls in order, with the parent step;
- `reads` — resource URIs, classified as `skill`, `rule` or `reference`;
- `timing` — `firstReadStep`, `firstComposeStep`, `firstValidateStep`, reads before/after compose;
- `guide` — confidence, skill, matched tokens, routed rules and checks;
- `validate` — the first validate payload, including `guideReceipt`;
- `unsupportedElementFields` — keys the element schema will ignore.

A read before the first compose is the basic pass. Then compare the `reads` against the guide's
`rules` and the rubric.

### Offline route check

```
go run ./scripts/agent-eval/routecheck.go
```

This runs the same `internal/skill` router without touching the live MCP server, so it does not
perturb the guide state a test agent will see. Edit the briefs in the file to check a new task.

## Reading the result

- **Timing:** `firstReadStep < firstComposeStep` means it read before drawing. All three calibration
  runs did this; timing was not the failure.
- **Coverage:** compare the rules the guide returned with the rules read. A digest that prints only
  some checks becomes the reading set; if the payload carries all routed rules, check that all were
  read.
- **Route correctness:** the agent's `guide` task may be a paraphrase. Record the actual task text;
  added style words ("editorial typography") can change the skill.
- **Receipt source:** `explicit` is the route the agent asked for. `inferred` came from composition
  payload text and may be wrong. Never grade an inferred route as if the agent chose it.
- **Checks vs rules:** a warning is not a rule. If `readNext` names a rule, check whether that rule
  was read before the warning was waived.
- **Output:** grade the canvas state, not the note. A claimed PNG export with no path is not a file.

## Calibration scenarios

These are the briefs used for the first run (see `.dsh/evals/agent-rule-timing/` locally for the
captures and full report):

| Scenario | What it should force | Rules that must be read |
|---|---|---|
| A5 concert programme, print + web preview | production geometry and preflight | 82 bleed, 83 resolution, 87 prepress |
| Four-slide Instagram carousel | sequence, not four posters | 77 sequence, plus hierarchy |
| 1440x1024 booking screen for older/low-vision users | states, focus, targets | 94 states, 98 accessibility |

Write the rubric before launching. For the print brief, a bleed board (A5 + 3 mm = 1819x2551 at
300 PPI) and a web preview are the output checks. For the UI brief, available/selected/unavailable
slots, a disabled button with a stated reason, a visible focus treatment, and 24 px minimum targets
are the checks.

## Pitfalls

- **Self-report is not evidence.** The agent will say it followed rules it never opened. Use the
  transcript.
- **The guide state is server-wide.** An inferred guide used to overwrite the route; the server now
  keeps an explicit route authoritative, and the receipt's `source` field tells you which one you are
  looking at. Concurrent clients still share that state, so run one at a time.
- **The app must be current.** Confirm a served rule contains `**Avnac ops:**` before trusting the
  run; otherwise you are testing an older embedded library.
- **One run is anecdotal.** It finds failure modes, not rates. Run repeated configurations before
  making a statistical claim.
- **No-local-files instructions change deliverable grading.** They keep the repo clean, but a tool
  that cannot write a PNG will look the same as an agent that chose not to. Grade tool return
  shapes separately.
- **Shared app contention.** Close other clients before a run, and confirm the active page after.
- **A warning can be a false positive.** Poster-calibrated checks fire on programmes and UI. Read the
  rule before deciding the warning is wrong; record the waiver.

## Extending the eval

- New scenario: add the brief and rubric to `docs/`
  or the local eval folder; keep it blind.
- New invariant (timing, all-rules checks, explicit-route precedence): add a Go test under
  `avnac-system/mcp` and `internal/skill` first, then the eval only diagnoses behaviour.
- New check in `validate`: add it to the frontend validator and to the rule's Verification; the
  receipt can only report checks that exist.
