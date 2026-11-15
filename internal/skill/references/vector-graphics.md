# Vector Graphics Reference

Numbers, formulas and checklists for constructing cubic vector artwork. Rules are authoritative;
this file is the lookup table you reach for while drawing.

- [Frames and units](#frames-and-units)
- [Node and handle values](#node-and-handle-values)
- [Optical corrections](#optical-corrections)
- [Stroke contrast and joins](#stroke-contrast-and-joins)
- [Primitive formulas](#primitive-formulas)
- [Relationship vocabulary](#relationship-vocabulary)
- [Symmetry and transforms](#symmetry-and-transforms)
- [Booleans, winding and fill rules](#booleans-winding-and-fill-rules)
- [Line grammar](#line-grammar)
- [A mark on a page](#a-mark-on-a-page)
- [SVG output checklist](#svg-output-checklist)
- [Vector IR quick schema](#vector-ir-quick-schema)

## Frames and units

| Frame | Origin | Unit | Notes |
|---|---|---|---|
| Board | top-left | 1 user unit | All stored geometry |
| Viewport | window top-left | CSS pixel | Pan/zoom, hit radii |
| Local | object anchor | user unit | Shape geometry |
| Export | viewBox origin | user unit | SVG |

- Transform order: `translate(cx,cy) rotate(a) scale(sx,sy) translate(-cx,-cy)`.
- Board size equals viewBox: a 1200×900 board exports `viewBox="0 0 1200 900"`.
- Angles clockwise, y down. Convert y-up data once at import.
- Interaction radii (screen px) → divide by view scale before hit tests.
- Round at serialisation: two decimals; never NaN, Infinity or `-0`.

## Node and handle values

| Quantity | Value | Use |
|---|---|---|
| Circle handle constant κ | 0.5522847498 × r | Four-cubic circle/ellipse |
| Circle as % of triangle | ~55.6% | Glyphs' "55–56%" |
| Designed curve band | 60–70% | Icons, type, logos |
| Outside usable band | < 55% or > 75% | Flattens or bulges |
| Handle fraction meaning | 100% = handles meet at the intersection; 0% = retracted | Balanced-handle maths |
| Anchor budgets | circle 4 · leaf 6–8 · face 12–20 · character 30–60 | Complexity check |
| Refit acceptance | deviation ≤ 2 px at final size, or ≤ 8% of the chord | Delete-a-node refit |
| Minimum stroke | 0.25 pt print · 0.5 px screen | Feature visibility |

Node types:

| Type | Handles | Tangent | Use |
|---|---|---|---|
| corner | none | breaks | Box corners, hard turns |
| cusp | two, independent | breaks | Pointed leaf tips, serifs |
| smooth | collinear | continuous | Most curve joins |
| symmetric | collinear + equal | continuous + equal curvature | Circles, balanced arcs |

Magic-triangle test: for each segment, the two anchors and the handles' intersection form a triangle.
Both handles must lie inside it; neither may cross the other handle or its elongation.

## Primitive formulas

| Shape | Construction |
|---|---|
| Circle, radius r | Four cubics; each control point at 0.5522847498·r from its anchor |
| Ellipse, rx ry | Same, with κ·rx and κ·ry on the matching axis |
| Rounded rect, radius r | Four lines + four quarter arcs; r ≤ min(w,h)/2 |
| Capsule | Two lines + two semicircles, radius = min(w,h)/2 |
| Regular N-gon | Vertices at angle `−90° + k·360/N`, radius from the box |
| Star | 2N vertices alternating outer R and inner r; r/R 0.38–0.50 |
| Tangent join | Arc centre on the perpendicular to the line at the join |
| Optical overshoot | Round forms +1–1.5% beyond the flat reference |

## Relationship vocabulary

| Relation | Derived placement |
|---|---|
| `centered_on(t)` | centre = centre(t) + offset |
| `left_of(t, gap)` | right edge = left(t) − gap |
| `right_of(t, gap)` | left edge = right(t) + gap |
| `above(t, gap)` | bottom = top(t) − gap |
| `below(t, gap)` | top = bottom(t) + gap |
| `inside(t, pad)` | fit inside bounds(t) − pad, centred |
| `aligned_with(t, axis)` | centres share x or y |
| `equal_size(t)` | copy width/height of t |
| `mirror_of(t, axis)` | reflect across axis through t's centre (in the IR this is `mirrorOf` + `axis`, a top-level field rather than a constraint) |
| `distributed(axis, gap)` | even gaps between resolved bounds |

Rules: one absolute anchor per group; no cycles; gaps as ratios or spacing tokens; solve top-down;
keep constraints in the file; mark optical overrides.

## Symmetry and transforms

- Reflect across vertical axis x = a: `x' = 2a − x`; horizontal axis y = a: `y' = 2a − y`.
- Mirror the control points with their anchors, then reverse the subpath order (winding flips).
- Radial n: rotate copies by `360/n` about the system centre, start at −90° unless specified.
- Non-uniform scale changes stroke weight: restroke instead of scaling the stroke.
- Instances follow their definition; baked copies do not. Bake only to freeze.
- Optical asymmetry is allowed and must be recorded.

## Booleans, winding and fill rules

| Operation | Result |
|---|---|
| union | one outer contour, internal edges removed |
| subtract | A minus B; order matters |
| intersect | shared region only |
| exclude | symmetric difference (two contours) |

- Font convention: outer counter-clockwise, holes clockwise. Reverse holes when importing.
- `nonzero`: direction-sensitive; consistent winding required.
- `evenodd`: direction-insensitive; every other crossing is a hole. Safer for stacked compounds.
- A clean subtract adds 0–2 anchors per intersection; dozens means bad inputs.
- Remove overlaps on export; keep them live while editing.
- Double overlap → hairline white gaps; hunt for paths under ~2 units and delete them.

## Optical corrections

Machines build equal geometry; eyes read unequal value. Every correction below is a small,
deliberate inequality that makes the form look *even*.

| Correction | Amount | Why the eye needs it |
|---|---|---|
| Round form overshoot | 1–1.5% in marks, ≈2% in letterforms (of cap height) | A circle beside a square reads smaller at equal size |
| Undershoot below the baseline | same 1–2%, mirrored | The curve must look planted, not sliced off |
| Optical centre | not the midpoint — a measured `O` splits about 49.9 / 50.1, and flat-bottomed forms sit visibly off the midline | mass low in the form pulls the perceived centre with it |
| Counter of a round form | not a scaled copy of the outline; widen it at top and bottom ("more shoulder") | a true ellipse counter reads as a pointed diamond |
| Stroke turning an elbow | add 3–8% locally | the turn reads thin at the joint |
| Strokes overlapping at an acute vertex | narrow the stroke locally | the overlap darkens into a blob |
| Thin stroke crossing a thick one | offset the crossing geometry | the thin line appears to jump (Poggendorff) |

Rules of use:

- Correct the path, never a rendered copy of it.
- Round the correction to the grid you are drawing on; a fractional unit survives scaling as a bump.
- Elbow and acute vertex are opposite corrections. Do not apply one fix to both kinds of join.
- Record the number in the construction notes so a redraw is not re-guessed.
- Check at 400%: a correction you cannot see at 400% is doing nothing; one you can see at 100% is
  too large.

Sources: Cheng, *Designing Type*, pp. 67–68 — overshoot expressed as a percentage of cap height,
optical versus mathematical centring (49.9 / 50.1), and the counter widened to avoid a pointed
diamond; p. 109 — the crossing illusion and the offset that restores it; pp. 145–147 and 210 —
figure annotations that narrow the stroke at a join. The elbow weight matches Cheng's specimens and
[`53-logo-construction`](../rules/53-logo-construction.md).

## Stroke contrast and joins

Contrast is a ratio, not a mood. Read as thin ÷ thick:

| Weight class | Thin as % of thick |
|---|---|
| High contrast (Didone) | 19–24% |
| Medium (transitional) | ≈32% |
| Low contrast (slab) | ≈49% |
| Monoline (geometric sans) | 100% |

- A thick diagonal runs 94–101% of the vertical; a thin diagonal 91–119% of the horizontal.
  Diagonals are corrected *relative to the stems*, never copied from them.
- Declare one ratio per drawing and hold it. Two parts of the same mark at 30% and 55% read as two
  drawings glued together.
- The join is the one place the ratio is allowed an exception, because that is where two strokes
  add up or thin out.
- In a stroked (not filled) drawing the same physics lives in `strokeWidth` and `stroke-linejoin`:
  a mitre on an acute angle throws a spike, so shorten `stroke-miterlimit` or round the join.

Sources: Cheng, *Designing Type*, pp. 105–106 and 109 — measured contrast percentages, the diagonal
ranges, and the A/V vertex observations.

## Line grammar

Hofmann's dot–line–plane studies are the vocabulary a vector drawing actually uses, and they are
cheap to check:

| Principle | What it means in a vector file |
|---|---|
| The dot is static and bound to a centre; the **line is a dot in motion** | a stroke implies direction — both of its ends should have a reason to be where they are |
| The line's job is **construction**: it joins, articulates, supports, holds together | use lines to build, then decide which ones stay visible |
| **Two parallel lines generate a third** — the interval between them | the gap is a drawn element and deserves the same attention as the stroke |
| Repetition merges: a thin line at a constant interval stops reading as a line and becomes a tone | stripe density is a colour decision, not a line decision (rule 64) |
| Remove lines from a grid and **white lines appear on another plane** | black and white lines are interdependent: a compound path with holes is two drawings, not one |
| The visible vocabulary is four moves — change the interval, thicken the line, remove from one side, slant it | every pattern in rule 64 is one of these four |
| A line thickened in proportion to its length stops reading as a line and becomes a plane | the stroke : interval ratio decides whether a pattern is lines or a field (rule 62) |
| The diagonal is the structural element that carries movement | one dominant diagonal per figure, not three |

Sources: Hofmann, *Graphic Design Manual*, p. 12 — the dot as structure and its expansion into a
plane; p. 13 — the line as the trace of a moving dot, the grid of lines, and the black/white line
dependence; p. 126 — line exercises varying thickness and curvature along paths of motion; p. 166 —
a composition of "large and small curves, long and short straight lines" that reads as one
statement.

## A mark on a page

A vector element dropped onto a composition inherits every grid decision around it. Treat the
page's module as the drawing's module.

| Decision | Rule | Source |
|---|---|---|
| Module | draw the mark on a unit that divides the page grid, so its size is a grid multiple and not an arbitrary pixel value | Müller-Brockmann, *Grid Systems*, "Construction of the grid" |
| Grid density | choose the grid, do not maximise it: a module too fine gives no help, one too coarse is restrictive | Vignelli, *Canon*, p. 40 |
| Gap | space between a vector element and a column = one line of type (one leading unit) | Vignelli, p. 52; Müller-Brockmann, p. 69 |
| Alignment | align to type, not to a box: top to the cap line, bottom to the descender line | Müller-Brockmann, p. 69 |
| Lockup | fix mark size : type size : gap as one ratio and reuse it; a lockup re-drawn per page is not a lockup | Vignelli, p. 44 |
| Clear space | publish it as a number — cap height, or half the mark's height | rule 53 |
| Scale | two type sizes at most; hierarchy comes from scale contrast, not from more weights | Vignelli, p. 72 |
| White space | tight margins build tension, wide margins serenity — choose one and hold it | Vignelli, p. 92 |
| Reduction | what is left when nothing more can be removed is the design | Müller-Brockmann, "Type and picture area with 32 grid fields" |

- Place with `vector` op=draw `x`/`y`/`scale`, then verify against the page grid in the composited
  render — not in the isolated SVG.
- The mark must survive at the smallest size the page uses, and its clear space must survive
  cropping.
- Equity: an established mark is an asset. Re-vectorise it, do not redesign its form (Vignelli,
  p. 32).

## SVG output checklist

1. Root has `xmlns`, matching `width`/`height`, and a unitless `viewBox` equal to the board.
2. Every painted element declares `fill` (or `fill="none"`) and `stroke` behaviour.
3. Presentation attributes, not `style=`.
4. Compound paths declare `fill-rule`.
5. No open path carries a fill.
6. Numbers finite, two decimals, no exponents.
7. Stroke ≥ 0.25 pt at final size for print, ≥ 0.5 px for screen.
8. Gradients: ≤ 3 stops, explicit angle, `userSpaceOnUse` when positioned.
9. No external font/image/stylesheet dependency; text is outlined or really present.
10. `role="img"` + `<title>` for meaningful graphics; `aria-hidden="true"` when decorative.
11. Render test at 16, 24, 64, 512, 4000 px.
12. Data-URL placement: decodes to valid XML, no external refs, a few hundred KB at most.

## Vector IR quick schema

```json
{
  "canvas": { "width": 1200, "height": 900, "background": "#F4F0E8" },
  "layers": [{ "id": "subject", "name": "Subject" }],
  "objects": [
    {
      "id": "rocket/body",
      "type": "capsule",
      "layer": "subject",
      "x": 574, "y": 62, "width": 52, "height": 116,
      "rotation": 0,
      "fill": "#E85D3F", "fillOpacity": 1,
      "stroke": "", "strokeWidth": 0,
      "constraints": [
        { "relation": "centered_on", "target": "canvas", "offset": [0, 0] }
      ]
    },
    {
      "id": "rocket/fin-right",
      "type": "polygon",
      "mirrorOf": "rocket/fin-left",
      "axis": "vertical",
      "fill": "#D94A36"
    },
    {
      "id": "rocket/spark",
      "type": "path",
      "start": [128, 20],
      "segments": [
        { "type": "cubic", "control1": [140, 10], "control2": [160, 40], "to": [150, 60] }
      ],
      "closed": false,
      "stroke": "#F4B23F", "strokeWidth": 3, "fill": ""
    }
  ]
}
```

Object types: `rect`, `ellipse`, `circle`, `capsule`, `polygon`, `star`, `line`, `path`.
Position/size: `x, y, width, height` (top-left box). `polygon`/`star` accept `points`, `sides`,
`innerRatio`; `line` accepts `x1,y1,x2,y2`; `path` accepts `start`, `segments`, `closed`.
Paint: `fill`, `stroke`, `strokeWidth`, `fillOpacity`, `strokeOpacity`, `fillRule`, `lineCap`,
`lineJoin`. Relations: `constraints[]`, `mirrorOf` + `axis`.

IR rules the resolver enforces:

- `mirrorOf` defaults to the board centre on that axis; set `axisValue` to move the mirror line.
  A mirrored object takes the source's geometry, so it must not carry its own constraints
  (constrain the source instead) and is edited through the source.
- `constraints` read the target's resolved bounds, so they solve top-down; a cycle is an error.
- An open path with a fill is reported and the fill is dropped, because filling it would draw a
  straight closing chord.
- Every visible object needs `fill` or `stroke`; a stroke with `strokeWidth: 0` is ignored.
- `resize` scales explicit points/paths in place and keeps the centre unless `anchor: top-left`.