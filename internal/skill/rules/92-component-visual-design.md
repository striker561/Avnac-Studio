# Rule: Component Visual Design

**Domain:** ui · **ID:** `92-component-visual-design`

## Purpose
Draw one control so precisely that it works at every size, in every state, on every background.
Component design is the craft layer under a design system: the padding that makes a button feel
solid, the focus ring that survives a colored hero, the shadow that separates a menu from the page.

## Definition
A component is an anatomy — container, label, leading or trailing icon, optional helper — plus a
matrix of states and sizes. Its behavior is defined by padding, height, radius, border, elevation and
focus treatment, all taken from system tokens rather than local values.

## Core Principles
- Anatomy before style: bordered, filled or borderless — one per variant, or they read as different
  component types.
- Size is a three-step scale, not a slider: 32 px small, 40 px medium, 48 px large on desktop, with
  44 px as the touch floor. Icons run 16/20/24 px with 8 px between icon and label.
- Padding follows a ratio: horizontal is 2× vertical. A 40 px button with 12 px vertical padding
  takes 24 px horizontal; text-only buttons take 16 px.
- Focus is a component, not a browser default: a 2 px ring at 2 px offset in `focus-ring`, at 3:1
  against both the control and its background.
- Elevation encodes layering, not importance: 0 flat, 1 cards, 2 popovers, 3 modals and toasts.
- Density is a variant, not a fork: a 32 px table row and a 56 px list row are the same component.

## Techniques
1. **Draw the state matrix before the polish** — default, hover, active, focus, disabled, loading,
   error. Seven states × three sizes is 21 frames; if that is too many, the component is too complex.
2. **Define elevation as shadows** — `0 1px 2px rgba(17,20,24,.08)` cards, `0 4px 12px rgba(17,20,24,.12)`
   popovers, `0 12px 32px rgba(17,20,24,.16)` modals; from level 2 up, add a 1 px `border-subtle`.
3. **Stay on the radius scale** — 4 px inputs and buttons, 8 px cards, 16 px modals and sheets, full
   for pills and avatars. One radius per level; 6 px beside 8 px is visible at a glance.
4. **Hover and active are value steps** — `#1F6F4A` → `#195C3D` on hover, `#14492F` plus a 1 px inset
   shadow on active. Never change hue; that reads as a different component.
5. **Reserve geometry for loading** — hold the width and swap the label for a 16 px spinner, or the
   row for a three-bar skeleton at final row height. Moving targets cost clicks.

## When to Use
- Building or refining any control that will appear more than twice.
- When a component looks "off" and the cause is not spacing — usually padding ratio, radius or border.
- When a component must work across light, dark and image backgrounds.

## When to Avoid
- Don't componentize a one-off hero or empty-state illustration; the state matrix has no reuse.
- Don't add elevation to signal importance in a flat design; use size, weight and color instead.
- Don't chase a 2 px optical difference between two sizes; the cost is a variant nobody can name.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| 1 px border plus a level-1 shadow | The edge doubles and looks muddy | Border on flat levels, shadow from level 2 |
| Focus ring removed for aesthetics | Keyboard users lose their position | 2 px ring at 2 px offset, 3:1 contrast |
| Disabled styled at 20% opacity | Label drops to ~1.5:1 and disappears | 38–45% fill with a muted but readable label |

## Practical Examples
A primary button in Avnac: 40 px tall, `#1F6F4A` fill, white 15 px/600 label, radius 4 px, 24 px
horizontal padding, 20 px icon with an 8 px gap. Hover `#195C3D`, active `#14492F` plus
`inset 0 1px 2px rgba(0,0,0,.2)`, focus a 2 px `#1F6F4A` ring at 2 px offset, disabled 40% fill with
the label at 72% white. On the `#111418` sidebar the same component switches to a `#2A2F36` fill and
`#F5F3EC` label to hold 4.8:1.

## Verification
1. **State matrix.** Seven states — default, hover, active, focus, disabled, loading, error — at
   three sizes: 21 frames. A missing frame is the finding; hover without focus fails the keyboard
   user.
2. **Size and padding.** Heights 32, 40, 48 px with 44 px the touch floor, icons 16/20/24 px at an
   8 px gap, horizontal padding 2× vertical — 12 px vertical gives 24 px horizontal, 16 px for text
   only. Measure the built component, not the spec.
3. **Radius and elevation.** Radius 4 px inputs and buttons, 8 px cards, 16 px modals, full for
   pills and avatars; elevation 0–3, with a 1 px `border-subtle` from level 2 up. A 6 px radius
   beside an 8 px one reads as two families at a glance.
4. **Focus ring.** 2 px at 2 px offset in `focus-ring`, at 3:1 against both the control fill and the
   page. `get_canvas_image` on the button over its darkest background shows the ring complete, not
   lost at the edge.
5. **Value steps.** Hover and active move by value only: `#1F6F4A` → `#195C3D` → `#14492F` plus a
   1 px inset shadow, never a hue change. Disabled sits at 38–45% fill with a label at 3:1; 20%
   opacity drops the label to about 1.5:1.

## Related Rules
- [`91-design-systems`](91-design-systems.md) — the tokens and documentation this component is built from.
- [`94-interaction-states`](94-interaction-states.md) — what each state must communicate, beyond how it looks.
- [`93-interface-layout-and-spacing`](93-interface-layout-and-spacing.md) — the spacing scale the padding comes from.
- [`45-affordances-and-signifiers`](45-affordances-and-signifiers.md) — why a border or shadow is a promise about clickability.
- [`68-iconography`](68-iconography.md) — icon grid, stroke weight and optical sizing inside the control.

## Sources
- WCAG 2.2, SC 1.4.11 (non-text contrast) and SC 2.4.11 (focus appearance) — the 3:1 focus requirement.
- Material Design 3 and Apple Human Interface Guidelines — 32/40/48 dp heights and the 44 pt touch floor.
- Professional systems practice — the 2:1 padding ratio and four-step elevation scale in current component libraries.
