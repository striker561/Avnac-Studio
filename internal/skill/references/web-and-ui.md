# Web & UI — reference

Use for screen-native layouts and interface work. Rules:
[`90-ui-design-principles`](../rules/90-ui-design-principles.md) through
[`99-interface-consistency`](../rules/99-interface-consistency.md).

## Spacing scale

Use one 4 px base; the scale below covers almost every need.

| Token | px | Use |
|---|---|---|
| `space-0` | 0 | Reset |
| `space-1` | 4 | Icon-to-label, chip padding |
| `space-2` | 8 | Inline gaps, tight padding |
| `space-3` | 12 | Button padding-y, dense lists |
| `space-4` | 16 | Default gap, input padding |
| `space-5` | 24 | Card padding, group gaps |
| `space-6` | 32 | Section padding (compact) |
| `space-7` | 48 | Section spacing |
| `space-8` | 64 | Page section rhythm |
| `space-9` | 96 | Hero/large section |

Rule: space *between* groups ≥ 1.5× space *within* a group. Do not hand-pick odd values; snap to
the scale or fix the scale.

## Type in UI

| Role | Size / line-height | Weight |
|---|---|---|
| Display | 32–48 / 1.1–1.2 | 600–700 |
| Page title | 24–32 / 1.2 | 600 |
| Section | 18–22 / 1.3 | 600 |
| Body | 14–16 / 1.5 | 400 |
| Label | 12–14 / 1.4 | 500 |
| Meta / helper | 12–13 / 1.4 | 400 |
| Code | 13–14 / 1.5 | mono |

Never go below 12 px for meaningful text; 14 px minimum for body on mobile.

## Layout

| Breakpoint | Name | Container | Columns | Gutter |
|---|---|---|---|---|
| 0–479 | Mobile | 100% − 32 px | 4 | 16 px |
| 480–767 | Large mobile | 100% − 40 px | 4–8 | 16 px |
| 768–1023 | Tablet | 720 px | 8 | 24 px |
| 1024–1279 | Laptop | 960–1040 px | 12 | 24 px |
| 1280–1535 | Desktop | 1200 px | 12 | 24–32 px |
| ≥ 1536 | Wide | 1280–1440 px | 12 | 32 px |

Cap the content width; do not let long-form text run past ~75 characters.

## Components: minimum anatomy

| Component | States required |
|---|---|
| Button | default, hover, active, focus-visible, disabled, loading |
| Input | default, focus, filled, error, disabled, read-only |
| Select | closed, open, search, empty, error |
| Checkbox / radio | unchecked, checked, indeterminate (checkbox), focus, disabled |
| Card | default, hover (if clickable), selected, disabled |
| Table | default, sorted, selected, empty, loading, error |
| Nav item | default, hover, active, focus |
| Toast / alert | info, success, warning, error, dismissible |
| Dialog | open, scrollable, destructive confirm |
| Empty state | explanation + primary action |

Missing states are the most common UI defect. Design states before decoration.

## Targets and focus

- Minimum 24×24 CSS px (WCAG 2.2 AA); 44×44 recommended on touch.
- Focus must be visible with 3:1 contrast against both the component and the page.
- Do not remove the focus ring; restyle it.
- Hit area can be larger than the visual control.

## Accessibility minimums for UI

| Item | Requirement |
|---|---|
| Body contrast | 4.5:1 |
| Large text / icons | 3:1 |
| UI boundaries | 3:1 |
| Focus indicator | 3:1 |
| Error identification | text + icon, not color only |
| Keyboard order | matches visual order |
| Labels | visible, persistent (not placeholder-only) |
| Reduced motion | honoured via media query |

## Handoff spec template

For every component or screen:

```
name, purpose (one sentence)
anatomy: parts + spacing tokens
variants/sizes
states + transitions (duration, easing)
responsive behaviour per breakpoint
content rules (max chars, truncation, empty state copy)
accessibility notes (roles, labels, keyboard)
```

## Performance-adjacent design choices

- Prefer vector icons and CSS effects over large bitmap shadows.
- A page with 6+ web fonts will render slower than 2; subset and limit weights.
- Images: declare dimensions to avoid layout shift; serve responsive sources.
- Motion: 150–250 ms for micro-interactions, 250–400 ms for transitions; ease-out for entrances.

## Rules

- [`90-ui-design-principles`](../rules/90-ui-design-principles.md) — screen hierarchy and clarity.
- [`91-design-systems`](../rules/91-design-systems.md) — tokens and governance.
- [`92-component-visual-design`](../rules/92-component-visual-design.md) — component anatomy.
- [`93-interface-layout-and-spacing`](../rules/93-interface-layout-and-spacing.md) — spacing and breakpoints.
- [`94-interaction-states`](../rules/94-interaction-states.md) — state coverage.
- [`95-responsive-interface-design`](../rules/95-responsive-interface-design.md) — reflow and touch.
- [`98-web-accessibility`](../rules/98-web-accessibility.md) — WCAG in practice.
- [`99-interface-consistency`](../rules/99-interface-consistency.md) — consistency across screens.
