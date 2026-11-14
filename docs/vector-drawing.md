# Vector drawing: IR, tool and knowledge base

This document explains how an agent draws vector artwork in Avnac Studio: the intermediate
representation, the `vector` MCP tool, the knowledge base that teaches the technique, and where the
source material came from. The v3 board engine itself is documented in
[vector-board-engine.md](vector-board-engine.md).

## Why an intermediate representation

Writing raw SVG is a poor interface for a model. A path string is opaque, hard to validate, and
impossible to edit by part. Avnac already solved the analogous problem for pixels with a discrete
tile map; the vector equivalent is a **scene graph of objects and relationships**:

```
IR  ──▶  cubic geometry  ──▶  v3 vector-board document  ──▶  SVG  ──▶  scene element
        (resolve)             (frontend schema)              (export)
```

The model describes *what* the drawing is — a capsule body, a mirrored fin, a window centred on the
body — and the engine derives coordinates, handles, winding and SVG. Every stage is pure Go in
[`internal/vector/`](../internal/vector/), so the geometry is testable without a browser.

The IR supports:

| Concern | Representation |
|---|---|
| Objects | `id`, `type`, `layer`, array order = z-order |
| Geometry | top-left box (`x/y/width/height`), explicit `points`, or `start` + `segments` |
| Primitives | `rect`, `ellipse`, `circle`, `capsule`, `polygon`, `star`, `line`, `path` |
| Paint | `fill`, `stroke`, `strokeWidth`, opacity, `fillRule`, cap/join |
| Relationships | `constraints` (`centered_on`, `left_of`, `right_of`, `above`, `below`, `inside`, `aligned_with`, `equal_size`) |
| Symmetry | `mirrorOf` + `axis` (`vertical`/`horizontal`), default axis = board centre |
| Incremental edits | `resize`, `move`, `rotate`, `mirror`, `restyle`, `reorder`, `delete`, `add` |

Resolution runs in dependency order: constraints and mirrors are resolved until no object is
waiting; a pass that makes no progress is reported as a cycle. A mirrored shape is reflected *and
reversed* so its winding survives the reflection — the bug that makes holes fill solid.

## The `vector` MCP tool

`vector` is the thirteenth published tool and the only one added after the 27 → 12 collapse. It is a
new document model, not a new scene primitive: it owns layers of strokes, node geometry and an SVG
artifact, and it keeps a board per session so edits can address objects by id.

| Op | Purpose | Result |
|---|---|---|
| `draw` | Resolve an IR and place it on the active page | `boardId`, `objectId`, bounds, warnings |
| `update` | Apply object operations and re-render once | updated bounds/segments |
| `read` | Return the IR, the v3 document and per-object bounds | JSON |
| `export` | Return the self-contained SVG | SVG text |
| `delete` | Remove the placed element and forget the board | acknowledgement |
| `list` | Boards created this session | list |

Placement reuses the editor's "save and place" representation: an image node whose `src` is an SVG
data URL marked `data-avnac-vector-board="1"`. The renderer draws it resolution-independently, and
the SVG exporter inlines the `<path>` elements instead of emitting an `<image>` (see
`frontend/src/lib/avnac-selection-export.ts`). The scene half is a pure command builder
(`buildVectorPlaceCommands` / `buildVectorUpdateCommand` in `frontend/src/lib/mcp/commands.ts`).

Why not an `elements` op: `elements` shares one transaction over scene primitives; vector drawing has
its own document, its own state across calls and its own output. The full argument is in
[MCP_TOOL_SURFACE.md](MCP_TOOL_SURFACE.md) §5.

## Knowledge base

| Tier | File | What it carries |
|---|---|---|
| Task skill | [`internal/skill/vector/SKILL.md`](../internal/skill/vector/SKILL.md) | The workflow: intent → spatial plan → IR → resolve → draw → verify → refine, plus the object schema and tool ops |
| Rules | `internal/skill/rules/120-127` | Scene graphs, coordinate systems, primitives, constraints, symmetry, Bézier construction, booleans, SVG validation |
| Reference | [`internal/skill/references/vector-graphics.md`](../internal/skill/references/vector-graphics.md) | Constants, formulas, optical corrections, stroke contrast, line grammar, relationship vocabulary, mark-on-a-page table, SVG checklist, IR schema |
| Index | `rules://index` | The eight rules under a new **Vector drawing** domain |

The router reaches the skill on phrasing such as "draw … as clean vectors", "fix the bezier", "mirror
the left wing", "remove the path overlaps", "export an SVG with the right viewBox"; the eval in
[`internal/skill/vector_eval_test.go`](../internal/skill/vector_eval_test.go) pins that behaviour in
both directions (it must fire, and it must not steal poster/print/logo/layout requests).

Routing does not wait for the user to ask for a skill. The `guide` tool takes the brief and returns
the workflow plus the rules that apply, and composition tool results (`canvas` create/add-page,
`elements` render/measure/modify, `vector` draw) carry the same guide automatically when the payload
is a clear match. That is what makes the library part of doing the task rather than an optional
lookup — see [vector-eval.md](vector-eval.md) §4 for the eval.

## Source material

The path-construction rules (especially 125 and 126) are grounded in Glyphs' *Drawing good paths*:

- <https://glyphsapp.com/learn/drawing-good-paths>
- A cleaned copy of the article, its 22 figures and a claim-by-claim digest live in
  `reference/glyphs-drawing-good-paths/` (`article.md`, `images/`, `NOTES.md`).
  `reference/` is git-ignored by design; the digest maps every claim to the rule it feeds, so the
  committed rules can be audited without redistributing the article.
- Re-scrape with `node scripts/scrape-glyphs-drawing-good-paths.mjs`.

What transferred: the magic triangle, zero handles, inflections, extrema, G2 harmony, balanced
handles (≈55.6% for a circle, 60–70% in type), hang-through, nudging, winding and overlap removal.
What did not: hinting zones, sidebearings and master interpolation, which are font production, not
general vector geometry.

### Design-library grounding

The vector section was written from web sources before the indexed design library existed, so it
carried geometry and production but none of the design reasoning around it. That gap is now closed
by citing the same books the rest of the library already cites. No new rule file was added: the
library sits at the `MaxRules` ceiling of 128, and these are extensions of rules that already had
the right subject.

| Source | What it added | Where it landed |
|---|---|---|
| Cheng, *Designing Type*, pp. 67–68, 105–109, 145–147 | Overshoot as ≈2% of cap height; optical versus mathematical centring (49.9 / 50.1); counters widened rather than scaled; strokes narrowed at acute joins; measured contrast ratios (19–24% high, ≈32% medium, ≈49% slab) and diagonal ranges; the Poggendorff shift on crossings | Reference: *Optical corrections*, *Stroke contrast and joins*. Rule 122: overshoot, optical centre, counters, joins, techniques 7–8, two mistake rows |
| Hofmann, *Graphic Design Manual*, pp. 12–13, 126, 166 | The dot as structure and the line as a dot in motion; the line's constructive job; two parallels generating a third; black and white lines as interdependent; the four-move transformation vocabulary; a thickened line becoming a plane; the diagonal as structural | Reference: *Line grammar* |
| Vignelli, *The Vignelli Canon*, pp. 28, 32, 40, 44, 52, 72, 92 | Grid density chosen rather than maximised; type and illustration on the same grid with column gaps of one leading unit; the letterhead column that exists for the mark; white space as tension versus serenity; two type sizes at most; logo equity | Reference: *A mark on a page*. Skill: *Placing vector art in a composed page* |
| Müller-Brockmann, *Grid Systems in Graphic Design*, "Construction of the grid", p. 69 | The module as the source of sizes; one line of leading left empty between grid fields; pictures bound to cap and descender lines | Reference: *A mark on a page* |

What transferred: corrections as numbers, contrast as a ratio, line behaviour as a small closed
vocabulary, and the page-fit decisions that make a drawing survive next to type.
What did not: grid construction itself (rules 30–31), type design as a discipline (rules 20–29),
and identity-system structure (rules 52–58) — the vector section links to them instead of
restating them.

One conflict is deliberately resolved rather than merged: an elbow join reads *thin* and needs
added weight (rule 53, Cheng's specimens), while an acute vertex where two strokes overlap reads
*thick* and needs local narrowing. Both rules now say which join each number applies to.

## Verifying a drawing

1. `vector` op=draw returns warnings for open filled paths, stroked-with-zero-width objects,
   geometry far outside the board and oversized segment counts.
2. `get_canvas_image` shows the placed element; read the silhouette at 100% and 25%.
3. `vector` op=read lists per-object bounds and segment counts (anchor audit).
4. `vector` op=export runs the SVG audit again and returns the source.
