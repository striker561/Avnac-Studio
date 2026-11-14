# Rule: SVG Generation and Validation

**Domain:** vector · **ID:** `127-svg-generation-and-validation`

## Purpose
Emit SVG that renders identically in browsers, design tools, cutters and printers — and provably so,
because the output is checked before it is delivered rather than after a client notices. Generation
is the last mile where good geometry is most often lost.

## Definition
SVG is an XML document describing vector geometry, paint and transforms. A valid vector deliverable
has a correct root frame, explicit paint on every painted element, resolvable references, no external
dependencies it cannot carry, and numbers a renderer can parse without guessing.

## Core Principles
- **The root frame is the contract.** `xmlns`, `width`, `height` and `viewBox` must agree with the
  board. `viewBox` carries unitless numbers; width/height may carry units.
- **One path per painted shape.** Use `<path>`, `<circle>`, `<rect>`, `<polygon>` for their native
  forms and convert to `<path>` only when a boolean or export demands it.
- **Presentation attributes over `style=`.** `fill`, `stroke`, `stroke-width`, `stroke-linecap`,
  `stroke-linejoin`, `fill-rule` as attributes survive more pipelines than inline CSS.
- **Paint is explicit.** Every visible element declares `fill` (or `fill="none"`). Relying on the
  default black is how an icon turns into a black blob in a dark theme.
- **Numbers are short and finite.** Two or three decimals; never NaN, Infinity or exponent notation.
  Compact relative path commands are fine; precision is not the place to save bytes.
- **Groups carry intent.** A `<g>` earns its place by sharing a transform, opacity or id. Empty
  groups and single-child groups are noise.
- **Ids are stable and unique.** `id="ear-left"`, not `id="path812"`; duplicates break references and
  make an exported file unmaintainable.
- **Text stays text when it can.** If the deliverable may be edited, keep `<text>`; if it must render
  with no font present, convert to outlines at final size and embed the outlines, not the font name.
- **Self-contained beats linked.** For MCP placement, data-URL and single-file output must not depend
  on a remote font, image or stylesheet. A referenced asset that fails to load is an invisible design
  change.
- **Accessibility is part of validity.** A meaningful graphic carries `role="img"` and a `<title>`;
  a decorative one is `aria-hidden="true"`.

## Techniques
1. **Canonical serialisation.** Emit elements in a fixed attribute order, one element per line, two
   decimals, no trailing whitespace. Diffs then show design changes, not formatting noise.
2. **Frame assertion.** Check `viewBox` equals the board and every painted bound lies inside it
   (minus a 2% margin). Out-of-frame debris silently changes bounds for the consumer.
3. **Number sanitiser.** Reject NaN/Infinity, clamp to six significant digits, strip `-0`.
4. **Paint audit.** Walk every painted node: fill or stroke declared, opacity in 0..1, stroke-width
   ≥ 0.25 pt at final size for print or ≥ 0.5 px for screen.
5. **Path audit.** Count anchors and subpaths; confirm the fill rule is set whenever a compound path
   exists; confirm no open path carries a fill.
6. **Gradient discipline.** Linear gradients get two or three stops, an explicit angle and
   `gradientUnits="userSpaceOnUse"` when the position is designed. More stops than that should be a
   raster.
7. **Render test.** Rasterise at 16, 24, 64, 512 and 4000 px. Small sizes test drop-out and stroke
   minimums; large sizes test handle smoothness and stray geometry.
8. **Data-URL check.** For MCP placement, confirm the SVG is valid XML after decoding, contains no
   external `href` and stays under the transport budget (a few hundred KB).
9. **Round-trip check.** Reopen the file in a second renderer. If the two disagree, the file relies
   on unspecified behaviour — usually a missing fill rule or an ambiguous transform.

## When to Use
- Every vector deliverable: icons, logos, illustrations, diagrams, maps, patterns.
- Any artifact produced programmatically (MCP, scripts, generators) — generated SVG needs the audit
  more, not less, than hand-authored SVG.
- Handoff to a cutter, embroiderer, printer or developer.

## When to Avoid
- Raster-only deliverables (photography, painted texture): SVG is the wrong container.
- Interactive/animated output: use the animation subset deliberately; do not smuggle scripts into a
  static asset.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| viewBox ≠ artboard | Strokes and type scale wrong in every viewer | Make them equal |
| Default black fill | Dark-theme blob | Declare fill or `none` |
| `style="fill:#f00"` | Stripped or overridden downstream | Presentation attributes |
| Missing `fill-rule` on a compound path | Holes fill solid in one renderer | Set it explicitly |
| External font/image reference | Silent fallback | Convert or embed |
| 20 anchors on a 4-anchor circle | Wobble and bloat | Refit |
| No small-size render test | Stroke disappears at 16 px | Test at final sizes |

## Practical Examples
Exported 256 × 256 rocket SVG:

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" role="img">
  <title>Rocket</title>
  <path d="M104 176c0-33 11-64 24-80 13 16 24 47 24 80z" fill="#E85D3F"/>
  <path d="M104 60c-14 10-22 26-22 44l22 14z" fill="#D94A36"/>
  <path d="M152 60c14 10 22 26 22 44l-22 14z" fill="#D94A36"/>
  <circle cx="128" cy="96" r="13" fill="#9FD3E8"/>
  <path d="M120 180l8 22 8-22z" fill="#F4B23F"/>
</svg>
```

Audit: frame matches; five paths, all with explicit fill; no group that adds nothing; 4-decimal-free
numbers; 18 anchors total; renders at 16 px with the window and flame still legible, and at 4000 px
with no facet.

## Related Rules
- [`120-vector-scene-graphs`](120-vector-scene-graphs.md) — the structure the SVG serialises.
- [`121-vector-coordinate-systems`](121-vector-coordinate-systems.md) — the frame contract in detail.
- [`125-bezier-curves-and-path-construction`](125-bezier-curves-and-path-construction.md) — the path quality the file can only preserve.
- [`126-vector-boolean-operations-and-composition`](126-vector-boolean-operations-and-composition.md) — compound paths and fill rules.
- [`115-export-and-file-formats`](115-export-and-file-formats.md) — choosing SVG against PNG, PDF or EPS.
- [`119-generated-design-artifacts`](119-generated-design-artifacts.md) — cleaning up machine-generated SVG.

## Sources
- W3C, *SVG 2 Specification* — document structure, presentation attributes, `viewBox`, fill rules.
- Glyphs, *Drawing good paths* (<https://glyphsapp.com/learn/drawing-good-paths>) — overlap removal at
  export, path order, and the defects that appear only after the file leaves the editor.
- Avnac Studio, *Vector board engine (v3)* — SVG path export, fill-rule handling and data-URL placement.
