# Rule: Interface Consistency

**Domain:** ui · **ID:** `99-interface-consistency`

## Purpose
Make a product predictable, so a user who learned screen one needs no learning on screen forty.
Consistency buys speed; inconsistency buys support tickets.

## Definition
Two things. Internal consistency: the same element looks and behaves the same across your own
screens. External consistency: your product behaves the way its platform and category already do.
Predictability is the goal; sameness is only the method.

## Core Principles
- Same action, same appearance and position. A destructive action must not look like a neutral one
  that happens to sit nearby.
- Jakob's law: users spend most of their time in other products, so match convention unless you have
  measured evidence and a year of support capacity to teach something new.
- Spend novelty on one axis — the brand moment — and standardize the rest. A new pattern costs the
  user attention on every visit, not once.
- Used twice, it is a component; used three times, it is a token. Promote rather than recopy.
- Platform conventions are load-bearing: back gesture, ⌘/Ctrl shortcuts, right-click menus, window
  controls, permission prompts.
- One word per concept. If the button says "Publish", the toast says "Published", not "Saved".

## Techniques
1. **Inventory the twelve primitives** — button, input, select, checkbox, radio, toggle, tab, table,
   modal, toast, tooltip, nav. Fix appearance and behavior once each, then reuse without variation.
2. **Placement map** — primary action bottom-right of a form; search top-right of a nav; account menu
   top-right; logo top-left to go home. Deviating costs one relearn per screen.
3. **Token discipline** — spacing from a 4/8 px scale, radius from {0, 4, 8, 999}, elevation from
   three levels, color from named tokens only. No raw hex inside a screen file.
4. **Cross-platform parity table** — decide per pattern: identical (brand chrome, copy), adapted
   (navigation, date pickers), platform-native (share sheets, permission dialogs).
5. **The audit** — screenshot every screen, sort by element type, and diff. Count distinct button
   heights, grays, and radii; collapse each set to one.

## When to Use
- Any product past roughly five screens, and every extension of an existing app.
- Design-system work, and any handoff where a second designer will touch the same interface.
- After a merge, a rebrand, or a redesign sprint — the three events that breed drift fastest.

## When to Avoid
- When the convention itself is the problem (a harmful default the whole category shares) — break it
  loudly and explain it, don't break it quietly.
- When the interaction model *is* the differentiation and users came for it.
- When a legacy pattern is measurably failing; consistency with a failure is not a virtue.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Three button radii across the app | Reads as three component families | One radius token |
| Same gray for borders and disabled text | Two meanings, one value; hierarchy collapses | Separate border and text tokens |
| "Submit" / "Save" / "Done" for one action | User cannot predict what commits | One verb per action class |
| Custom scrollbars and selects | Breaks OS expectation and often accessibility | Keep native; style only what you must |

## Practical Examples
A settings screen at 1440×900, matching the app's other 14 screens:

- 24 px page margin, 12-column grid, form column 640 px, labels above fields at 14 px/600.
- "Save changes" 40×152 px `#1A5FB4`, bottom-right, with "Cancel" as a ghost button 8 px to its
  left — the same pair used in the other three dialogs.
- The audit found four button heights and five grays; they collapsed to two (32/40 px) and three
  (`#111111`, `#5C5C5C`, `#D8D8D8`).

## Related Rules
- [`90-ui-design-principles`](90-ui-design-principles.md) — consistency as a screen-native fundamental.
- [`91-design-systems`](91-design-systems.md) — the tokens and components that make consistency structural.
- [`92-component-visual-design`](92-component-visual-design.md) — component anatomy and state coverage.
- [`56-brand-consistency`](56-brand-consistency.md) — the same drift problem across brand touchpoints.

## Sources
- Nielsen, *Usability Engineering*, "Heuristic Evaluation" — consistency and standards as the fourth heuristic.
- Apple, *Human Interface Guidelines*; Google, *Material Design* — platform conventions treated as defaults you opt out of on purpose.
- Professional convention: Jakob's law, as formulated by Nielsen Norman Group.
