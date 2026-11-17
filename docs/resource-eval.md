# Resource-compliance eval

The question this eval answers: **if an agent follows the protocol, does the route exist, name the
right workflow, and carry enough to act on?** If any of those is false, the protocol loses — an
agent that calls `guide` and gets a weak answer learns that skipping is cheaper.

It runs in `go test` against a real in-memory MCP session, so it exercises the protocol a client
actually sees: `guide` over the tool, resources over `read_mcp_resource`.

## Run it

```bash
go test ./avnac-system/mcp -run TestResourceCompliance -v
```

## What it checks

| Check | Pass condition | Why |
|---|---|---|
| Routing | 13 common briefs (flyer, poster, logo, brand, print, social story, landing page, palette, vector, chart, packaging, critique, flyer) route with high confidence to the expected workflow | A route that comes back empty teaches the agent to skip |
| Payload budget | The largest route is under **6000 bytes** | The six rule bodies behind it are ~40 KB; a route that big recreates the reading problem |
| Digest present | `checks` (every routed rule's Verification lines) and `gates` (always-on checks) are non-empty | This is the actionable part; URIs alone are not |
| No accidental inlining | `inline=false` (the default) returns URIs, not essays | Context cost |
| Non-design prompts | "compute the fibonacci sequence" etc. never route with high confidence | Noise teaches agents to ignore the field |
| URI resolution | Every `skill://`, `rules://`, `references://` in a route reads back non-empty | A dangling URI is worse than none |
| Omission visible | A composition with no route returns `guideMissing`; it stops after a route exists | The only channel an agent cannot skim past is tool output |

## What it cannot check

Whether a model obeys the protocol. That is host orchestration — the eval proves the affordance is
there, cheap and correct; the skill (`skills/avnac-designer/SKILL.md`) states the order, and
`validate`'s `guideReceipt` reports what went unmeasured when the order was skipped.

## Results when this was written

- 13/13 design briefs routed with high confidence, largest payload **5,018 bytes**.
- 3/3 non-design prompts stayed below high confidence.
- 12 URIs from one route resolved with content.
- The eval found two real routing gaps on first run: a promotional flyer went to `brand` because
  "brand" was read as a named deliverable, and "Instagram story" matched nothing. Fixed by lowering
  the named-deliverable bonus and adding the missing vocabulary to `poster`, `create` and `ui`.
