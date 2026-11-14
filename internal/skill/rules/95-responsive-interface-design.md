# Rule: Responsive Interface Design

**Domain:** ui · **ID:** `95-responsive-interface-design`

## Purpose
Set what a screen becomes at every width, not only the width it was designed at. Responsiveness is a
set of content-driven decisions — what moves, what collapses, what stays — executed with fluid type,
reflow and safe areas instead of one shrinking screenshot.

## Definition
Responsive design is the re-arrangement of the same content across viewport widths using breakpoints
(widths where the layout changes), fluid sizing (values that scale continuously) and reflow (blocks
moving from horizontal to vertical). It is not proportional scaling: type does not halve with the window.

## Core Principles
- Breakpoints belong to the content, not to device names. Add one where the layout breaks — a line
  over 75 characters, a card row under 240 px, a table overflowing.
- Five widths cover most products: 320–639 phone, 640–767 large phone, 768–1023 tablet, 1024–1279
  small laptop, 1280+ desktop. Start at 320 px; a design that works there works upward.
- Type is fluid within a bounded range: `clamp(16px, 15px + 0.25vw, 19px)` for body,
  `clamp(28px, 24px + 2vw, 44px)` for a page title. Both ends are sizes you have actually rendered.
- Reflow is a requirement, not a nicety: at 320 CSS px there is no horizontal scroll (WCAG 1.4.10),
  and at 400% zoom content reflows to one column without loss.
- Touch is the default input: 44×44 px minimum targets with 8 px between them, 48 px where controls
  sit close together.
- Safe areas are real: `env(safe-area-inset-bottom)` on notched phones, 34 px for the iPhone home
  indicator, 48 px for Android gesture navigation.

## Techniques
1. **Measure your breakpoints** — resize in 8 px steps, note where the layout fails (704, 912, 1180),
   then round to a 16 px multiple. These are the only breakpoints you need.
2. **Reflow in named patterns** — 12→8→4→1 columns, sidebar→top bar→drawer, 4-up→2-up→1-up cards,
   table→stacked block with labels. One pattern per component, documented.
3. **Cap and pad media** — `width:100%`, `height:auto`, `aspect-ratio` set, `srcset` at 1×/2× so a
   phone does not download a 3000 px hero.
4. **Respect the notch and the bar** — bottom bars get `padding-bottom: max(16px,
   env(safe-area-inset-bottom))`; full-bleed heroes get `env(safe-area-inset-top)`.

## When to Use
- Any interface used on more than one device class, which is every interface.
- When a layout approved at 1440 px must hold up in a 320 px column.

## When to Avoid
- Fixed-canvas tools — video editors, canvases, map viewers — where a minimum viewport is a real
  product requirement; state it (1024×768) instead of pretending to support 320 px.
- Fluid type in data-dense UI where size changes break label-to-value alignment; fix the size and
  scale the container.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Breakpoints at 375/768/1440 because they are device widths | Layout breaks at 900 px where nobody looked | Add breakpoints where the layout fails |
| Everything scaled with `vw` | Unreadable at 320 px, enormous at 2560 px | `clamp()` with fixed min and max |
| Fixed bottom CTA under the home indicator | The button is half-swipe-blocked | Safe-area padding, minimum 16 px |

## Practical Examples
A pricing page at 1280 px shows three 380 px cards in a row with 24 px gaps; at 768 px it becomes two
columns (352 px) with the third full width; at 320 px one column at 288 px with 16 px margins. The h1
is `clamp(32px, 26px + 2.4vw, 52px)` — 32 px at 320, 44 px at 768, 52 px at 1280. The sticky
"Choose plan" bar carries `padding-bottom: max(16px, env(safe-area-inset-bottom))` and its buttons are
48 px tall with 12 px gaps. No copy drops below 16 px and no feature is removed on mobile.

## Related Rules
- [`93-interface-layout-and-spacing`](93-interface-layout-and-spacing.md) — the containers and scale that stay constant while layout reflows.
- [`39-responsive-composition`](39-responsive-composition.md) — the same reflow problem in print and poster formats.
- [`26-type-scale-and-proportion`](26-type-scale-and-proportion.md) — where the fluid type values come from.
- [`98-web-accessibility`](98-web-accessibility.md) — reflow and zoom as WCAG success criteria.
- [`94-interaction-states`](94-interaction-states.md) — hover states that must degrade to touch states.

## Sources
- WCAG 2.2, SC 1.4.10 (Reflow) and SC 1.4.4 (Resize text) — 320 CSS px without horizontal scroll, 200% text resize.
- Material Design 3 adaptive layout guidance and Apple Human Interface Guidelines — breakpoint classes and safe-area insets.
- CSS specifications for `clamp()`, `aspect-ratio` and `env(safe-area-inset-*)` — the mechanisms behind fluid sizing and notch padding.
