---
name: ui
description: Design screens and interfaces — layout, spacing, components, states, responsive behaviour and accessibility for web and app UI. Use whenever the task is a website, app screen, dashboard shell, settings page, form, navigation or design system, or the user says the interface feels cramped, inconsistent or hard to use.
---

# Interface Design

## Applies when
The medium is an interactive screen. If the deliverable is a static graphic or poster, use those
skills; if it is primarily charts, use `visualize`.

## Workflow
1. **Define the screen's one job** and the primary action. Every screen has one; if it has three,
   it is three screens.
2. **Lay out with a 4/8 px spacing scale** and a column grid (4 mobile, 8 tablet, 12 desktop).
   Snap everything; do not hand-place.
3. **Establish type and color tokens** before components: 5–7 type roles, a surface/border/text
   palette with contrast pairs, one accent.
4. **Build components as systems**: anatomy, sizes, states (default, hover, active, focus,
   disabled, loading, error, empty). A component without states is a picture of a component.
5. **Order content by task**, top-left to bottom-right, with the primary action in the reading
   path. Navigation is not content; give it its own region.
6. **Lay out responsive behaviour per breakpoint**, not just the desktop frame: what stacks, what
   collapses into a menu, what truncates.
7. **Audit accessibility**: contrast, focus rings, target sizes, labels, keyboard order, motion.
8. **Hand off with tokens and specs**, not screenshots.

## Decision points
- **Density**: comfortable (16 px base, 24 px section gaps) for consumer; compact (14 px, 16 px
  gaps) for professional tools. Never mix densities in one surface.
- **Elevation**: use shadows sparingly — elevation should mean interaction or layering, not
  decoration. In flat systems, use borders and background steps instead.
- **Navigation pattern**: tabs for 3–5 peer destinations, sidebar for 6+, breadcrumbs for depth,
  search when the structure is unknown to the user.
- **Modality**: dialogs for decisions that block; drawers for context; avoid full-page modals for
  simple confirmations.

## Rules to apply
- [`90-ui-design-principles`](../rules/90-ui-design-principles.md) — screen hierarchy and clarity.
- [`92-component-visual-design`](../rules/92-component-visual-design.md) — component anatomy and states.
- [`93-interface-layout-and-spacing`](../rules/93-interface-layout-and-spacing.md) — spacing and grids.
- [`94-interaction-states`](../rules/94-interaction-states.md) — the state matrix.
- [`95-responsive-interface-design`](../rules/95-responsive-interface-design.md) — reflow and touch.
- [`98-web-accessibility`](../rules/98-web-accessibility.md) — WCAG in practice.
- [`91-design-systems`](../rules/91-design-systems.md) — tokens and governance.

## References
- [`web-and-ui`](../references/web-and-ui.md) — spacing scale, breakpoints, component states.
- [`accessibility`](../references/accessibility.md) — contrast and focus minimums.

## Production checks
- Every interactive element has all required states designed.
- Contrast: 4.5:1 body, 3:1 large text/icons/boundaries, visible focus ring.
- Touch targets ≥ 24×24 CSS px (44×44 recommended).
- Labels are persistent; placeholders are not labels.
- Empty, loading and error states exist for every data region.
- Layout holds at 320, 768, 1024, 1440 px without horizontal scroll.
- Tokens are named by role and consumed by components; no magic hex values.

## Output format
`Screen/job:` one sentence. `Layout:` grid, spacing scale, regions. `Components:` list with
states. `Tokens:` type and color roles used. `Responsive:` behaviour per breakpoint.
`Accessibility:` checks passed and open risks.
