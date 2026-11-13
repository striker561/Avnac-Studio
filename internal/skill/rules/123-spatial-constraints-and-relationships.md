# Rule: Spatial Constraints and Relationships

**Domain:** vector · **ID:** `123-spatial-constraints-and-relationships`

## Purpose
Express *how* objects relate — left of, centred on, inside, mirrored — instead of hard-coding every
coordinate. Relationships survive resizing, retheming and new canvas sizes; coordinates do not.

## Definition
A spatial constraint is a rule that derives one object's placement from another's resolved bounds:
`centered_on(eyes, face)`, `left_of(nose, eye, gap)`, `inside(window, body, padding)`. A resolver
reads the rules, orders them by dependency, and produces concrete positions.

## Core Principles
- **One absolute anchor.** Every solved group needs one object with absolute coordinates ("the
  subject is centred on the board"), otherwise the system has no reference.
- **Dependencies flow one way.** `a left_of b` and `b left_of a` is a cycle, not symmetry. A cycle
  is an error to report, not a value to guess.
- **Relations use bounds, and say which.** Edge-to-edge, centre-to-centre and baseline-to-baseline
  produce different results for text. Name the anchor pair.
- **Gaps are ratios or tokens, never magic numbers.** "8% of the subject width" or "one 4-unit
  spacing step" scales; "13 px" is a decision that will not travel.
- **Solve, then freeze.** Compute final geometry for rendering and export; keep the constraints in
  the document so the next turn can change one value and re-solve.
- **Report ambiguity.** If two valid solutions exist, say which was chosen and why, rather than
  silently picking one.
- **Optical overrides are allowed, but labelled.** A logo mark may need 1–2 units of manual
  centring; mark the object as optically adjusted so a later re-solve does not undo it.

## Techniques
1. **Constraint table first.** List subject, relation, reference, anchor pair, gap. Six rows are
   usually enough for a composition; twenty means the drawing is being solved instead of designed.
2. **Top-down solve.** Board placement → subject → groups → details. Each pass only reads objects
   already resolved, which makes the order explicit and the result deterministic.
3. **Pin-and-chain.** Choose the optical centre of the composition as the pin, chain the rest
   outward. This keeps the picture stable when details change.
4. **Mirror by relation, not by copy.** `mirror_of(left-ear, axis=canvas-center)` keeps the pair in
   sync when either side moves.
5. **Containment check.** After solving, assert every child bound is inside its parent's bounds
   minus padding; violations are usually a size constraint that no longer fits.
6. **Resolution log.** Emit each solved position with the rule that produced it. "Eye at (128,104)
   because centred_on(face) with gap 0.18 × face.height" is reviewable; a bare number is not.

## When to Use
- Character and object layouts: faces, mascots, product illustrations with repeated parts.
- Systems that must re-flow: icon family members, diagram nodes, pattern cells.
- Any drawing likely to be resized or edited conversationally.

## When to Avoid
- Deliberately asymmetric or expressive composition where the tension *is* the design; pinning it
  to a constraint removes the gesture.
- A single object on a board — there is nothing to relate it to.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Mutual `left_of` between two objects | Cycle; solver returns arbitrary results | One absolute anchor per group |
| Gap in pixels only | Breaks when the composition scales | Gap as ratio or spacing token |
| Mixing centre and edge anchors | Objects look off by half their size | Name the anchor pair |
| Solving before the parent exists | Child binds to a stale bound | Top-down order |
| Re-solving after an optical nudge | The nudge is lost | Mark optical overrides |

## Practical Examples
A 256 × 256 face at board centre, solved in four passes. Ratios are chosen first (eye offset
0.44 of the face width, nose gap 0.10 of its height) and converted to board units before the
constraints run, because a solver works in one unit:

```yaml
objects:
  - { id: face, type: ellipse, x: 53, y: 44, width: 150, height: 176 }   # pin, board units
  - { id: eye-left,  type: circle, width: 15, height: 15,
      relation: centered_on, target: face, offset: [-66, -21] }
  - { id: eye-right, type: circle, width: 15, height: 15,
      mirrorOf: eye-left, axis: vertical }
  - { id: nose, type: polygon, relation: below, target: face, gap: 18, offset: [0, 0] }
  - { id: mouth, type: capsule, relation: below, target: nose, gap: 10 }
```

Resolution: eyes at x = 128 ∓ 66, y = 132 − 21; nose centred under the eye midpoint; mouth centred
under the nose. Change the face size once, re-derive the two ratios, and the whole set re-solves —
no object is re-placed by hand.

## Related Rules
- [`120-vector-scene-graphs`](120-vector-scene-graphs.md) — the tree the constraints resolve into.
- [`121-vector-coordinate-systems`](121-vector-coordinate-systems.md) — which frame the solved bounds are expressed in.
- [`124-symmetry-and-transformations`](124-symmetry-and-transformations.md) — mirroring as a relationship.
- [`07-alignment-and-proximity`](07-alignment-and-proximity.md) — the compositional reason these relationships read as organised.
- [`40-gestalt-principles`](40-gestalt-principles.md) — why proximity and alignment are perceived before detail.

## Sources
- Glyphs, *Drawing good paths* (<https://glyphsapp.com/learn/drawing-good-paths>) — opposing-curve
  harmony shows how a local relationship, not a coordinate, determines quality.
- W3C, *SVG 2 Specification* — `viewBox`, alignment and `preserveAspectRatio` as declarative
  relationships.
- Avnac Studio, *Vector board engine (v3)* — snapping to node, axis and board guides as the editor's
  constraint layer.