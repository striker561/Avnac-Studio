# Rule: Interaction States

**Domain:** ui · **ID:** `94-interaction-states`

## Purpose
Design what a control does when it is touched, not only what it looks like at rest. States are the
behavioral contract of an interface: they say that the click registered, that work is happening, that
something failed, and that there is nothing here yet.

## Definition
An interaction state is the visual and semantic condition of a control or region in response to input
or system status. The core set is default, hover, active, focus, disabled, loading, error and empty;
selected, indeterminate, read-only and success are additions on top.

## Core Principles
- Eight states is the floor for anything clickable. Default and hover only is half a component: it
  cannot answer "did that work?" or "why can't I click this?".
- Each state answers one question. Hover: is this interactive? Active: did my press register? Focus:
  where is my keyboard? Disabled: why not? Loading: is it working? Error: what now? Empty: what goes here?
- State changes are fast and small: 100–150 ms, one property at a time (background, border, shadow).
  A 400 ms transition makes a click feel like a failure.
- Disabled must explain itself. A grayed button with no reason is a dead end; add helper text or
  leave it enabled and validate on submit.
- Focus is never removed and never invisible. `outline: none` without a replacement is an
  accessibility defect, not a style choice.
- Errors appear where the fix happens — field-level below the field, a summary at the top of a long
  form, a toast only for failures with no field.

## Techniques
1. **Build a state matrix** — rows are components, columns are states, cells hold the token used.
   Empty cells are the audit output; fill them before shipping.
2. **Keep disabled readable** — 38–45% opacity on the fill, label still at 3:1.
3. **Separate hover from active by one step** — `#1F6F4A` → `#195C3D` → `#14492F` plus a 1 px inset
   shadow. Hover and active sharing a value is a missing state.
4. **Hold geometry through loading** — same width, label swapped for a 16 px spinner, or the row for
   a three-bar skeleton at final row height.
5. **Design the empty state as a first-run screen** — one line saying what goes here, one primary
   action, an optional 96 px illustration. Never ship a blank panel reading "No data".

## When to Use
- Every interactive element: buttons, inputs, menu items, links.
- Every region that fetches, filters or can be empty.

## When to Avoid
- Display-only elements should not fake hover; an effect on a non-clickable card is a false affordance.
- Don't design a disabled primary action when the prerequisite could simply hide it; visible-but-dead
  is the most frustrating option.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Hover-only affordance | Touch devices have no hover; the cue vanishes | Persistent affordance plus hover enhancement |
| Disabled at 20% opacity | Label falls to ~1.6:1 and looks broken | 40% fill, readable muted label, stated reason |
| Spinner replaces the page | Layout collapses and returns; context lost | Skeleton blocks at final dimensions |

## Practical Examples
A "Publish" button in a 40 px Avnac toolbar, all eight states specified: default `#1F6F4A` with a
white 15 px/600 label; hover `#195C3D`; active `#14492F` with inset shadow; focus a 2 px `#1F6F4A`
ring at 2 px offset; disabled 40% fill with helper text "Add a title to publish" under the form;
loading holding 44 px with a 16 px white spinner; error returning the button to default plus a 3 s
`#B3261E` inline banner; empty applying to the drafts list — "No drafts yet · Start a draft" with a
96 px illustration and one text button.

## Related Rules
- [`92-component-visual-design`](92-component-visual-design.md) — the craft each state is drawn within.
- [`45-affordances-and-signifiers`](45-affordances-and-signifiers.md) — why a state change signifies that the system heard you.
- [`90-ui-design-principles`](90-ui-design-principles.md) — the latency thresholds deciding which state is warranted.
- [`98-web-accessibility`](98-web-accessibility.md) — focus visibility and color-only signals as requirements.
- [`42-cognitive-load`](42-cognitive-load.md) — limiting how many states a screen presents at once.

## Sources
- WCAG 2.2, SC 1.4.1 (use of color) and SC 2.4.7 (focus visible) — states may not rely on hue alone.
- WAI-ARIA Authoring Practices — the disabled, busy and invalid semantics behind visual states.
- Nielsen, *Usability Engineering* — the 0.1 s / 1 s / 10 s limits that determine when loading is required.
