# Rule: Web Accessibility

**Domain:** ui · **ID:** `98-web-accessibility`

## Purpose
Make every screen usable with a keyboard, a screen reader, a low-vision eye, and a motion-sensitive
vestibular system, at the WCAG 2.2 AA floor — without asking the design to look plainer than it
needs to.

## Definition
WCAG 2.2 AA is a set of testable success criteria, not a style: 4.5:1 text contrast (1.4.3),
3:1 for large text and UI boundaries (1.4.11), a visible focus indicator (2.4.11), 24×24 px minimum
targets (2.5.8), no keyboard traps, and semantics that match what the screen shows.

## Core Principles
- Contrast floors: body and UI text 4.5:1; large text (≥24 px, or ≥18.66 px bold) 3:1; input borders,
  meaningful icons, focus rings, and chart lines 3:1 against their neighbours.
- Focus is never removed. A 2 px ring at 2 px offset, ≥3:1 against both the component and the page
  behind it. `outline: none` without a replacement is a defect, not a style.
- Targets: 24×24 px minimum, 44×44 px for primary touch actions, 8 px between adjacent targets.
- Never encode meaning in hue alone — pair it with an icon, a word, weight, or a pattern.
- Motion: nothing flashes more than 3 times per second; honor `prefers-reduced-motion`; anything
  auto-playing beyond 5 s gets pause and stop.
- Semantics first: a real `button`, real heading levels, a real `label`. ARIA repairs what HTML
  cannot express; it does not substitute for it.

## Techniques
1. **Contrast pass** — check every text/background pair. The recurring failures are 14 px `#999999`
   on white (2.85:1) and brand orange on white. `#767676` is the lightest gray that passes on white
   at 4.54:1; `#595959` gives 7:1 if you want margin.
2. **Focus ring spec** — `2px solid #1A5FB4` with 2 px offset on light surfaces, `#8AB4F8` on dark.
   Use `:focus-visible` so pointer users don't see it, but keep it for keyboard.
3. **Heading structure** — one `h1` per page, no skipped levels; style with a class, never `h4` for size.
4. **Alt text in three modes** — informative: what it shows and why ("Bar chart: revenue up 18% in
   Q3"); decorative: `alt=""`; functional icon button: the action ("Close dialog"), not the glyph.
5. **Four tests** — tab through and confirm the order matches reading order; zoom to 200% and 400%;
   reflow at 320 px wide (1.4.10); tab to every control and photograph the focus state.

## When to Use
- Every screen deliverable. Treat it as part of layout, not a later audit.
- Contracts specifying "ADA compliance" or public-sector procurement — 2.2 AA is the usual bar.

## When to Avoid
- Don't force 4.5:1 onto a logo or onto a decorative background where no text sits.
- Don't buy an overlay widget; it doesn't fix semantics and often breaks screen readers.
- Disabled controls are exempt from 1.4.3, but aim for 3:1 so people can still read why.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| `#999999` body at 14 px | 2.85:1, fails 1.4.3 | `#767676` or darker |
| Placeholder used as the label | It vanishes on typing and may be skipped | Persistent label above the field |
| Removing focus outlines | Keyboard users lose their position | 2 px ring, offset, on every control |
| Autoplaying carousel | Moves content while it is being read | Static hero, or pause control + reduced motion |

## Practical Examples
A 1440×900 settings page:

- Body 16 px/1.5 `#1F1F1F` on `#FFFFFF` (≈16:1); secondary 14 px `#5C5C5C`; placeholder `#767676`.
- Inputs 40 px tall, 1 px `#8A8A8A` border (3:1 on white), focus 2 px `#1A5FB4` at 2 px offset.
- Every input carries a visible 14 px/600 label above it, not a placeholder inside it.
- "Save changes" 40×148 px, `#1A5FB4` with a `#FFFFFF` label (≈6.3:1), "Cancel" 8 px away.

## Related Rules
- [`18-color-accessibility`](18-color-accessibility.md) — the contrast math and colorblind-safe palettes.
- [`94-interaction-states`](94-interaction-states.md) — focus is one state among eight to design.
- [`99-interface-consistency`](99-interface-consistency.md) — accessibility conventions users already expect.
- [`114-design-accessibility-checklist`](114-design-accessibility-checklist.md) — the delivery gate.

## Sources
- W3C, *Web Content Accessibility Guidelines 2.2*, SC 1.4.3, 1.4.11, 2.4.11, 2.5.8 — the AA criteria this rule converts into numbers.
- Tufte, *The Visual Display of Quantitative Information*, p. 187 — 5–10% of viewers are color-deficient, so hue cannot be the only channel.
- Professional convention: 44×44 px touch targets (Apple HIG; Material Design).
