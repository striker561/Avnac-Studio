# Rule: Affordances and Signifiers

**Domain:** ui · **ID:** `45-affordances-and-signifiers`

## Purpose
Makes clickable things look clickable and inert things stay quiet, using Norman's affordance–signifier–feedback model on canvas elements. It prevents a design from looking interactive where it is not, or inert where it is.

## Definition
An affordance is an action an object permits; a signifier is the visible evidence that the action exists; feedback is the response confirming it happened. A `rect` with a fill is a button only when a signifier says so — a label, a radius, a shadow, a cursor. State design completes the definition: default, hover, active, focus, disabled, loading, error, selected, each visibly distinct.

## Core Principles
- Affordance without a signifier is invisible. A clickable `rect` on the same fill as its background is a secret.
- Feedback timing is a contract: under 100 ms reads as instant, one second needs a busy state, ten seconds needs progress and a cancel.
- A missing state is a broken affordance. Nine states is the working set for a button, six for an input, four for a card.
- Cursor is a signifier: `pointer` for clickable, `text` for selectable, `grab` for draggable, `not-allowed` for disabled. A wrong cursor is a false statement.
- Constraints prevent errors better than messages: disable what cannot be done now, and say why in one line beside it.
- Touch needs 44×44 px (Apple HIG) or 48×48 dp (Material) of target regardless of icon size; WCAG 2.2 sets 24×24 px as the pointer-target floor.

## Techniques
1. **Button anatomy** — 12×24 px padding, 6–8 px radius, one accent fill, sentence-case label. The shape carries the signifier; do not stack a border, a shadow and an icon on top of it.
2. **Hover delta** — one visible step in 150 ms or less: fill lightness −8%, or shadow from 0 to 2 px blur at 8% black. Two simultaneous changes read as jitter.
3. **Focus ring** — 2 px outline, 2 px offset, at least 3:1 against the adjacent color (WCAG 2.2 SC 2.4.7 and 1.4.11). Never remove the browser ring without replacing it.
4. **Disabled with a reason** — 40% opacity, `not-allowed`, no hover, plus a 13 px `#6B7280` line stating the condition ("Add a shipping address to continue").
5. **Draw the state matrix first** — one frame, every state for every component, before composing the screen. Missing states are found here, not in review.

## When to Use
- Every interactive element in UI work, including editor chrome: tool buttons, layer rows, resize handles.
- Print and packaging: fold lines, die-cuts, tabs, perforations and "lift here" corners are physical signifiers.
- Whenever testers say "I didn't know I could click that".

## When to Avoid
- Decorative pills and chips that are not interactive: give them no radius-plus-fill combination that reads as a button.
- Do not disable a form's submit button without a visible reason; that removes the affordance and its explanation at once.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Clickable text with no visual change | No signifier; discovery is luck | One convention: color plus weight, or underline |
| `cursor: default` on a button | Contradicts the visual affordance | `pointer` on everything clickable |
| Focus state identical to hover | Keyboard users lose their position | Distinct 2 px focus ring at 2 px offset |
| A 24 px icon as the whole touch target | Fails the 44 px target minimum | Pad to 44×44 with transparent area |

## Practical Examples
A 375×812 checkout: primary "Pay $48.00" button 343×52 at x=16, radius 8, fill `#1F6FEB`, label 17 px Semibold `#FFFFFF`; hover `#1A5FD0`; focus a 2 px `#1F6FEB` ring at 2 px offset; disabled at 40% fill with `#6B7280` helper text "Enter the card's last four digits". Secondary "Edit cart" is a 17 px `#1F6FEB` text button with no fill. The back arrow is a 44×44 target holding a 24 px `path` icon, cursor `pointer`.

## Related Rules
- [`94-interaction-states`](94-interaction-states.md) — the full state catalogue this rule signs.
- [`92-component-visual-design`](92-component-visual-design.md) — component anatomy and sizing.
- [`98-web-accessibility`](98-web-accessibility.md) — focus visibility and target size as requirements.
- [`68-iconography`](68-iconography.md) — icons that must read as controls without labels.

## Sources
- Norman, *The Design of Everyday Things*, ch. 4 "Knowing What to Do" — affordances, signifiers, mapping, feedback and constraints.
- WCAG 2.2, SC 2.4.7 Focus Visible and SC 2.5.8 Target Size (Minimum) — the 24 px floor.
- Apple Human Interface Guidelines and Material Design — the 44 pt and 48 dp touch-target conventions.
