# Rule: UI Design Principles

**Domain:** ui · **ID:** `90-ui-design-principles`

## Purpose
Design for a screen that is looked at, clicked and returned to, not a sheet that is read once.
Screen-native design answers to state, latency and convention: the same rectangle must survive
hover, focus, loading and error, and it must look like the thing the user already knows.

## Definition
UI design is the arrangement of interactive surfaces so a person can predict what will happen before
acting. Its materials are layout regions, type ramps, controls and spacing; its constraints are
pixel grids, input methods (mouse 1 px, finger 44 px) and the platform's own conventions.

## Core Principles
- One primary action per screen: fill one button, outline or demote the other. Two buttons at equal
  weight make the user hesitate.
- Targets have a floor: 44×44 px on touch, 32×32 px for mouse, 24×24 px minimum in dense desktop
  toolbars, with 8 px between adjacent targets.
- Contrast is functional: body 4.5:1, large text 3:1, icons and boundaries 3:1, focus 3:1.
- Conventions are free usability: navigation left or top, primary action bottom-right in a form,
  dismiss top-right, search where the platform puts it.
- Density is chosen per screen: a settings page at 8–12 elements per viewport, a data table at 25+
  rows. The wrong density is a format problem, not a spacing bug.

## Techniques

**Avnac ops:** `canvas` op=preset or op=resize sets the screen; `elements` op=render places components and type; `canvas` op=validate reports `contrast_floor`, `level_census` and `margin_ladder`; `get_canvas_image` is the state check.

1. **Name the screen's job in one verb** — publish, review, compare. Every element either serves
   that verb or moves below the fold; delete the rest.
2. **Build the type ramp first** — 12/14/16/20/24/32 px, 1.25–1.5 line-height; body sits at 16 px.
3. **Establish an 8 px rhythm** — padding, gaps and heights on multiples of 4.
4. **Design the empty and broken versions first** — a table with zero rows, a failed save, a disabled
   submit. If those three look intentional, the populated screen will too.
5. **Place one anchor per region** — a heading, a metric or an image that fixes the eye; everything
   else aligns to it. Unanchored regions read as a pile of controls.
6. **Test at 100% zoom on a 1280×720 viewport** — if the primary task falls below the fold there,
   the hierarchy is wrong however good it looks on a 2560 px monitor.

## When to Use
- Any screen, panel, modal or settings page inside a product.
- When translating a print or brand layout into an interface and the print hierarchy stops working.
- When a screen feels cluttered although every element was requested by someone.

## When to Avoid
- Marketing pages where persuasion is the job and one oversized statement is the point; the density
  floor does not apply, the one-primary-action rule still does.
- Creative canvases and professional tools, where high density is the value — a 24 px toolbar is
  correct there, not a violation.
- Platform conventions win: iOS and Android differ on back navigation and dialog placement.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Gray-on-gray secondary text at 2.8:1 | Illegible in sunlight and for low-vision users | 4.5:1 minimum; use size or weight for hierarchy |
| Every button filled and colored | No primary action; the eye has no entry | One filled button per view, others demoted |
| 28 px touch targets in a mobile list | Mis-taps on the row above and below | 44 px row height, 8 px separation |

## Practical Examples
A 1440×900 settings screen in Avnac: 240 px navigation on `#111418`, a 640 px form column on
`#FAFAF7`, page title 24 px/600 `#111418`, field labels 14 px/500 `#4A4F57`, helper text 13 px
`#6B7280` (4.6:1). Fields are 40 px tall with 8 px inner padding and 16 px vertical gaps; rows group
into three sections separated by 32 px and a 1 px `#E3E1DA` rule. One filled `#1F6F4A` "Save changes"
sits bottom-right at 40 px, with "Cancel" as a text button beside it.

## Verification
1. **Ops receipt.** `canvas` op=validate passes `contrast_floor`, `level_census` and `margin_ladder` on the screen, and `get_canvas_image` shows the primary action first. A screen that passes the checks but has no visible action has failed the product test.
2. **Primary action.** `get_canvas_image`: count the filled buttons. Exactly one per screen; every
   other action is outlined, a text button or a link. Two filled buttons at equal weight leave the
   eye no entry point, and the user hesitates.
3. **Target floors.** Measure every control: 44×44 px on touch, 32×32 px for a mouse, 24×24 px in a
   dense toolbar, 8 px between adjacent targets. A 28 px row in a mobile list is under the floor and
   mis-taps the row above.
4. **Contrast.** Body text 4.5:1, large text 3:1, icons, boundaries and the focus ring 3:1 against
   their neighbours. Report the lowest ratio on the screen; 2.8:1 on secondary text is the failure
   this rule names.
5. **Rhythm and ramp.** Every padding, gap and height is a multiple of 4, type comes from
   12/14/16/20/24/32 px at 1.25–1.5 line-height, and body sits at 16 px. An off-scale 10 or 14 px
   gap is the audit output.
6. **Viewport test.** At 100% on 1280×720, the primary task and one anchor per region sit above the
   fold, and a settings page shows 8–12 elements. If the task needs scrolling there, the hierarchy
   is wrong however good the screen looks at 2560 px.

## Related Rules
- [`93-interface-layout-and-spacing`](93-interface-layout-and-spacing.md) — the spacing and container system this rule assumes.
- [`94-interaction-states`](94-interaction-states.md) — the state coverage behind every control named here.
- [`92-component-visual-design`](92-component-visual-design.md) — anatomy, sizing and elevation of the components.
- [`98-web-accessibility`](98-web-accessibility.md) — the WCAG criteria behind the contrast and target floors.
- [`99-interface-consistency`](99-interface-consistency.md) — how conventions are enforced across a product.

## Sources
- WCAG 2.2, SC 1.4.3, SC 1.4.11 and SC 2.5.8 — contrast minimums and target size.
- Apple Human Interface Guidelines and Material Design 3 — 44 pt and 48 dp target conventions, platform navigation.
- Nielsen, *Usability Engineering* — the 0.1 s / 1 s / 10 s response-time thresholds for feedback.
