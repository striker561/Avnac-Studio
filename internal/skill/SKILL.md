---
name: avnac-graphic-design
description: Expert graphic design knowledge and production library for Avnac Studio — traditional print, branding, typography, color, layout, illustration, vector path construction, imagery, packaging, poster work, data visualization and modern UI design. Use for any request to create, adapt, critique or production-prepare a visual design, even when the user never says "design" (for example "make my logo work at 16 px", "why does this poster feel flat", "fix the contrast in my dashboard", "draw a fox as clean vectors", "set up bleed for the printer", or "pick a palette for this brand").
---

# Avnac Graphic Design Knowledge & Production Library

This library exists so an agent can design *and* defend the design. It pairs aesthetic
judgment with the production knowledge that decides whether the work survives a printer, a
browser, or a client review. Every rule is written to be applied to a canvas, not quoted at a
reader.

## How the library is built

Four kinds of files, with one job each:

| File | What it is | When to read it |
|---|---|---|
| `SKILL.md` (this file) | Entry point, routing table, cross-cutting gates | Always, once |
| `<task>/SKILL.md` | A workflow for one kind of design task (poster, logo, ui, ...) | As soon as the task type is clear |
| `references/<subject>.md` | Compact lookup: thresholds, tables, format specs | When you need numbers or a quick comparison |
| `rules/NN-topic.md` | The authoritative principle: techniques, the ops that perform them, and the receipt that proves them | When a decision needs a reason |

The split is deliberate. A skill tells you *how to run the task*; a rule tells you *what is
true*; a reference gives you *the numbers*. Reading all 125 rules is wasteful and flattens your
attention. Read the routed skill, then the four to eight rules it links, then a reference only
when you need a value table. The route is a sample, not the set: the always-on gates below apply
whatever it says, and `rules/README.md` is where the rules it did not name are listed.

Every rule, workflow and lookup reference is built around the tools. A rule opens its Techniques
with **Avnac ops:** naming the exact calls, and opens its Verification with an **Ops receipt** that
runs them; where no op performs a step the rule says so and names the visual check instead.
Workflows carry an **Avnac ops** table for their own steps, and references open with the ops that
apply their numbers. The full surface, and the operations that do not exist, is
[`references/avnac-ops`](references/avnac-ops.md) — read it before inventing a call.

## Routing table

Pick the closest task skill. If a request spans two, take the one that owns the *deliverable*
and borrow rules from the other.

| Skill | Use for |
|---|---|
| `create` | Starting a new composition from a brief; format choice; first draft under time pressure |
| `poster` | Single-sheet work: gig bills, exhibition and film posters, protest and event print |
| `layout` | Multi-element structure: editorial spreads, brochures, multi-column and modular pages |
| `compose` | Fixing a composition that exists but does not work: balance, focal point, flow |
| `typography` | Type selection, pairing, hierarchy, spacing, type-heavy work |
| `color` | Color decisions with a reason: harmony, contrast, accessibility, meaning |
| `palette` | Producing a usable palette: ramps, neutrals, tokens, limited-color systems |
| `brand` | Strategy, positioning, identity systems, guideline documents, rebrands |
| `logo` | Marks and wordmarks: construction, optical correction, lockups, small-size behaviour |
| `illustrate` | Original drawn imagery, style systems, character and object sets |
| `vector` | Actual path construction: vector IR, Bézier curves, node repair, symmetry, booleans, SVG |
| `icon` | Icon sets and single icons: grids, stroke weights, metaphor consistency |
| `edit` | Revising existing work: refinement passes, feedback, version discipline |
| `analyze` | Reading a design or a reference image: what it does, why, what to borrow |
| `critique` | Structured evaluation with vocabulary and a verdict the client can act on |
| `export` | Getting files out: formats, compression, color space, naming, delivery |
| `print` | Production: bleed, trim, resolution, stock, finishing, prepress, press checks |
| `packaging` | Structural work: dielines, panels, folds, artwork across a 3D object |
| `mockup` | Presenting work in context: mockups, device frames, scene composition |
| `diagram` | Explaining structure: flows, systems, processes, schematics |
| `visualize` | Data graphics: chart choice, data-ink, dashboards, honest scales |
| `ui` | Screen-native interface work: components, states, spacing, accessibility |

If nothing fits, `create` is the general fallback, and `critique` is the general fallback when
the request is about judging existing work.

## Always-on gates

These six checks apply to every deliverable, whatever the skill says. They are the difference
between a design that looks finished and one that is finished.

1. **One message per surface.** Name the first, second and third thing the viewer should see
   before you place anything. If you cannot name them, the design has no hierarchy yet —
   [`02-visual-hierarchy`](rules/02-visual-hierarchy.md).
2. **Contrast is measured, not felt.** Text on background needs a ratio: 4.5:1 for body,
   3:1 for large text and UI boundaries. Check the value channel, not just the hue —
   [`14-color-contrast`](rules/14-color-contrast.md), [`18-color-accessibility`](rules/18-color-accessibility.md).
3. **Production values are part of the design.** Bleed 3 mm, safe area 5 mm inside trim, images
   at 150–300 PPI at final size, embedded fonts, correct color space —
   [`82-bleed-trim-and-safe-areas`](rules/82-bleed-trim-and-safe-areas.md),
   [`83-resolution-and-raster-formats`](rules/83-resolution-and-raster-formats.md).
4. **State the rules you applied.** A deliverable without a one-line rationale per decision is
   a guess the client cannot evaluate — [`117-design-documentation`](rules/117-design-documentation.md).
5. **Check it degraded.** Grayscale, 25% zoom, small phone, cheap paper, colorblind viewer. If
   it fails one, it fails — [`113-design-quality-checklist`](rules/113-design-quality-checklist.md),
   [`114-design-accessibility-checklist`](rules/114-design-accessibility-checklist.md).
6. **Vectors are constructed, not guessed.** Primitives and relationships first, curves last; every
   part has an id, mirrored halves are generated, handles stay inside the magic triangle —
   [`120-vector-scene-graphs`](rules/120-vector-scene-graphs.md),
   [`125-bezier-curves-and-path-construction`](rules/125-bezier-curves-and-path-construction.md).

## How to read a rule

Every rule is shaped the same way, so you can jump to the part you need:

- **Purpose / Definition** — what problem it solves and what it means precisely.
- **Core Principles** — the claims to satisfy. Use them as acceptance criteria.
- **Techniques** — the moves that satisfy them, with values, opening with **Avnac ops:** the exact
  calls that perform them.
- **When to Use / When to Avoid** — the judgment call, not a suggestion.
- **Common Mistakes** — the failure modes to check your own draft against.
- **Practical Examples** — one worked case in Avnac terms (canvas px, zones, hex). Examples in a
  `json vector` or `svg` fence are executable: `go test ./internal/skill` draws or parses them.
- **Verification** — the checks that prove the work: what to render, measure or count, and the pass
  condition. The first item is the **Ops receipt**: the command that proves the rule was applied.
  Run these before delivery; they are the rule's acceptance test, not a summary.
- **Related Rules / Sources** — where the claim comes from and what else constrains it.

When a rule and a reference disagree about a number, the rule is authoritative and the
reference is out of date — fix the reference.

## Avnac specifics

- The canvas works in **pixels**, origin top-left, `x` right and `y` down. Print sizes are
  authored at a chosen PPI (300 PPI is the default for print), then converted: A2 at 300 PPI is
  4961 × 7016 px.
- Elements are `text`, `rect`, `ellipse`, `path`, `image`, `group`. Compose with these
  primitives; do not fake a layout with a screenshot of a layout.
- Drawing a *new* vector object (logo mark, icon, character) is not the same as placing a scene
  primitive: use the `vector` tool, which resolves a small scene-graph IR into editable cubic paths
  and places real SVG on the page. Scene `polygon` and `star` are layout primitives, not drawing.
- The published surface is seven `op` tools (`canvas`, `elements`, `arrange`, `files`, `assets`,
  `export`, `vector`), six read tools, and `guide`. Every op is catalogued in
  [`references/avnac-ops`](references/avnac-ops.md), including the operations that do not exist:
  when a rule asks for one, use the visual check it names and say so. The design decision comes from
  this library; the tools execute it, and an op you cannot name is a step you have not finished
  deciding.
- A project (canvas) holds many pages. Drafts, tests and variations belong on a named page inside
  the open project — `canvas` op=add-page — never in a second project created for the experiment.
  Check `get_canvas_summary` for the active page name, and switch back with `canvas` op=go-page
  before delivering.
- Layers render bottom to top, so build background first and foreground last.
- Text is the most fragile element: check font size at final zoom, line-height, and whether the
  font is available in export before you commit to it.

## Working with the client

Design work is judged twice: on the craft and on the conversation around it. Non-negotiable
professional practice:

- Restate the brief in your own words and get agreement before designing.
- Show two or three genuinely different directions, not one idea in three colors.
- Price against scope, not against hours you guessed; define revision rounds.
- Say what you recommend, and why, in one sentence each. "It depends" without a
  recommendation is not advice.
- Never present work you cannot defend with a principle from this library.

See [`50-brand-strategy`](rules/50-brand-strategy.md) through
[`58-rebranding-and-evolution`](rules/58-rebranding-and-evolution.md) for identity work, and
[`111-design-critique`](rules/111-design-critique.md) for evaluation language.

## When the library does not cover it

Say so plainly, then reason from the closest principles and label the extrapolation. A useful
answer that names its assumptions beats a confident answer that invents authority. Prefer
[`00-core-principles`](rules/00-core-principles.md) and
[`01-design-process`](rules/01-design-process.md) as the base for novel cases.

## Routing during a task

When the host exposes Avnac's `guide` tool, call it with the brief **before** specialized work —
poster, flyer, logo, icon, layout, typography, color, print, packaging, photography, UI, vector
drawing or critique — even when the user did not ask for guidance. It returns the matching
`skill://` workflow and the 4–8 `rules://` that apply, with the matched tokens and a confidence
level. If you skip the call, a composition result may carry an inferred guide; it is labelled
inferred in validate and never replaces an explicit route.

## Programmatic use

The library is embedded in the Go package `Avnac/internal/skill`:

```go
lib, err := skill.Default()                       // parse once
plan, err := lib.Plan(task, 0)                    // route + gather material
fmt.Println(plan.Skill.Name, len(plan.Rules))     // e.g. "poster", 7
fmt.Println(plan.Markdown)                        // inject into the model context
```

`lib.Route(task, 3)` returns ranked skills, `lib.Rule("24")` resolves by number, ID or title,
`lib.Search("bleed", 5)` finds rules by content, and `lib.Validate()` asserts the structural
contract (names, sections, links, rule ceiling). Prefer `Plan` — it does the routing and the
reading-list assembly that the rest of this file describes.
