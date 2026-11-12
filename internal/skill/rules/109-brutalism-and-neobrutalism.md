# Rule: Brutalism and Neobrutalism

**Domain:** history · **ID:** `109-brutalism-and-neobrutalism`

## Purpose
Use exposed structure as the visual idea — raw markup and visible grids in one case, thick black
borders and hard shadows in the other — while keeping the result readable and operable.

## Definition
Digital brutalism presents the interface as its own construction: system fonts, visible borders and
grids, minimal styling, harsh contrast, offered as a critique of polish. Neobrutalism keeps that
candor as a commercial style: 2–4 px black borders, zero radius, hard offset shadows, flat
high-chroma fills.

## Core Principles
- Be honest about which one you are making. Brutalism is a position about material; neobrutalism is
  a costume of that position. Both are legitimate; confusing them is not.
- Structure is content: borders, dividers, and the grid are shown rather than hidden.
- The neobrutalist formula is fixed — 2–4 px `#000000` border, radius 0, 4–8 px shadow offset at 45°
  with no blur, one saturated fill, black text.
- Type: system or mono for brutalism, heavy grotesque for neobrutalism. No decorative faces.
- Contrast is extreme by intent, and WCAG still applies. "Raw" is not an exemption from 4.5:1.
- Interaction is loud but functional: a pressed button moves 2–8 px and its shadow collapses.

## Techniques
1. **Neobrutalist component recipe** — `rect` fill `#FFDE59`, 3 px `#000000` border, radius 0, shadow
   offset 8/8 with 0 blur, label 16 px/700 `#000000`. Pressed: translate +8/+8, shadow removed.
2. **Brutalist page skeleton** — one 720 px column, `system-ui` 18 px/1.6 `#000000` on `#FFFFFF`, 1 px
   rules between sections, no cards, no shadows, links underlined `#0000EE`.
3. **Two-color budget** — neobrutalism: `#FFDE59` and `#4EA8FF` with black and `#FFFDF5`; brutalism:
   black, white, and the system link blue.
4. **One border width** — containers 3 px, controls 2 px. Mixed widths read as unfinished rather than
   raw.
5. **Copy the candor, avoid the sticker** — copy: visible structure, hard shadows, flat fills, system
   type, honest labels. Avoid: sloppy alignment sold as rawness, unstyled forms without focus states,
   sticker-pack clip art, and "anti-design" that is 2019 flat design behind a heavier border.

## When to Use
- Indie portfolios, developer tools, cultural events, product sites signalling "no marketing".
- Print quoting early-web or constructivist rawness, where the border is the concept.

## When to Avoid
- Enterprise, health, and finance surfaces; candor reads as insecurity there.
- Accessibility-critical flows — raw aesthetics usually arrive with missing focus and hover states.
- Dense data UI, where thick frames eat the space the numbers need.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Hard shadow with blur | Becomes a 2010s drop shadow | Offset only, 0 blur |
| Inconsistent border widths | Reads as sloppy, not raw | 3 px containers, 2 px controls |
| 12 px system font for body | Genuinely hard to read | 16–18 px, 1.5 line-height |
| No focus ring, "because brutal" | Keyboard users are locked out | 3 px offset outline, still on-brand |
| Brutalism for a bank | Candor reads as instability | Use it where irreverence is the brand |

## Practical Examples
A 1440×900 landing page:

- Field `#FFFDF5`; a 1200×640 content block at x=120 y=80 with a 4 px `#000000` border, radius 0.
- Headline 64 px/800 `#000000` at x=152 y=140; body 18 px/1.6 `#000000`, measure 620 px.
- Primary button 56×220 px `#FFDE59`, 3 px border, shadow `8px 8px 0 #000000`, label 18 px/700.
- Hover collapses the shadow to `4px 4px 0`; pressed removes it and translates +8/+8 — the only
  motion on the page.
- Focus is a 3 px `#000000` outline at 4 px offset, visible against both fills.

## Related Rules
- [`100-design-movements`](100-design-movements.md) — the method for using any movement as constraints.
- [`92-component-visual-design`](92-component-visual-design.md) — component anatomy and state sets.
- [`94-interaction-states`](94-interaction-states.md) — pressed, hover, focus, and disabled coverage.
- [`98-web-accessibility`](98-web-accessibility.md) — the floor that raw aesthetics still meet.

## Sources
- Banham, *The New Brutalism: Ethic or Aesthetic?* — brutalism as an ethical position about exposed material, which the web version inherited.
- *Brutalist Websites* (archive, 2014– ) — the collection that fixed the term's web meaning.
- Professional convention: the neobrutalist border-and-hard-shadow recipe, popularized by 2020s indie product sites.
