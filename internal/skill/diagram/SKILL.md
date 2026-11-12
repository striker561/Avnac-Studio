---
name: diagram
description: Draw diagrams that explain structure and process — flows, system maps, org charts, timelines, schematics and step sequences. Use whenever the user needs something explained rather than decorated, mentions a flowchart, process, architecture, workflow, timeline or "how it works" graphic, or has a diagram that is unreadable.
---

# Diagrams

## Applies when
The graphic exists to make a relationship legible: sequence, hierarchy, dependency, cycle, or
geography. If the content is numeric, use `visualize`; if the goal is persuasion, use `poster`.

## Workflow
1. **Write the sentence the diagram must prove**, e.g. "data enters here, is validated, and leaves
   as a report". If you cannot write it, the diagram has no job yet.
2. **Pick the diagram type from the relationship**, not from style: sequence → flow or timeline;
   hierarchy → tree; dependencies → graph; cycle → loop; comparison → matrix; geography → map.
3. **Reduce to 5–9 primary nodes.** More than nine and the reader stops reading structure and
   starts reading a puzzle. Group the rest into one node that links elsewhere.
4. **Lay out on a grid.** Consistent node sizes, one alignment direction (usually left→right or
   top→bottom), even gaps. Orthogonal connectors with consistent corner radius.
5. **Label the edges, not just the nodes.** "Approve", "fails validation", "retries ×3". Edges
   carry the logic; unlabelled arrows are decoration.
6. **Set one visual encoding per meaning**: shape = type of thing, fill = state, line style =
   relationship. Do not encode the same meaning twice.
7. **Check the reading path and the crossings.** Minimize edge crossings; if unavoidable, use a
   bridge or reroute. Every path should be traceable without lifting attention.
8. **Add a legend only when encoding is not obvious.** A diagram needing a legend for its arrows
   usually needs simpler arrows.

## Decision points
- **Flow or freeform?** Flow for procedure and handoff; freeform for conceptual maps where order
  does not matter.
- **How much detail?** One level per diagram. Nested detail belongs in a second diagram, linked.
- **Horizontal or vertical?** Left→right matches reading for processes; top→bottom for hierarchies
  and time. Long horizontal flows break in print — wrap into rows with clear continuation marks.
- **Color or shape?** Use shape first (works in one ink, colorblind-safe), color second.

## Rules to apply
- [`46-information-architecture`](../rules/46-information-architecture.md) — ordering and grouping logic.
- [`07-alignment-and-proximity`](../rules/07-alignment-and-proximity.md) — node alignment and grouping.
- [`34-composition-techniques`](../rules/34-composition-techniques.md) — reading path and focal node.
- [`68-iconography`](../rules/68-iconography.md) — icons inside nodes.
- [`18-color-accessibility`](../rules/18-color-accessibility.md) — encoding that survives grayscale.
- [`96-data-visualization`](../rules/96-data-visualization.md) — when the diagram carries values.

## References
- [`visual-hierarchy`](../references/visual-hierarchy.md) — levels and emphasis in a node set.
- [`layout`](../references/layout.md) — grid and spacing for structured graphics.

## Production checks
- 5–9 primary nodes; one level of detail.
- All connectors orthogonal, same radius, arrowheads consistent.
- Every edge that carries logic has a label.
- Grayscale test: shape and line style still distinguish categories.
- Text inside nodes fits at the smallest output size; truncate deliberately, not by overflow.
- Export: SVG for screen, PDF/EPS for print; text as text where possible.

## Output format
`Claim:` the sentence the diagram proves. `Type:` flow/tree/graph/loop/matrix/map + why.
`Nodes:` list with grouping. `Edges:` labels and meaning. `Encoding:` shape/fill/line legend.
`Risks:` crossings, density, small-size legibility.
