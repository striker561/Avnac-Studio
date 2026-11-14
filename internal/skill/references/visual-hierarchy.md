# Visual hierarchy — reference

Use when you need to check or fix the order in which a design is read. The reasoning is in
[`02-visual-hierarchy`](../rules/02-visual-hierarchy.md) and
[`24-typographic-hierarchy`](../rules/24-typographic-hierarchy.md); this file is the value table.

## How many levels

| Surface | Levels | Typical elements |
|---|---|---|
| Social post / single graphic | 3 | Headline, support line, detail/footer |
| Poster | 4 | Headline, subhead, body, credits |
| Web page | 5–6 | Page title, section header, card title, body, label, meta |
| Dashboard | 4 | Page title, KPI value, KPI label, unit/timestamp |
| Book / report spread | 5 | Chapter title, section head, body, caption, folio |
| Logo lockup | 2 | Wordmark, descriptor |

More than six levels means the content needs grouping, not more styles.

## Size steps that survive

Perceptual steps, not arithmetic ones. Each level must be clearly different at a glance.

| Transition | Minimum ratio | Comfortable | Example |
|---|---|---|---|
| Body → secondary | 1.2× | 1.33× | 16 → 21 px |
| Secondary → subhead | 1.3× | 1.5× | 21 → 32 px |
| Subhead → headline | 1.5× | 2× | 32 → 64 px |
| Headline → hero display | 2× | 3–6× | 64 → 200 px |
| Body → caption | 0.85× | 0.75× | 16 → 12 px |

If two levels are closer than 1.2× in size, differentiate by weight or value instead — do not
split the difference.

## Weight and value steps

| Channel | Weak (avoid) | Clear (use) |
|---|---|---|
| Weight | Regular → Medium | Regular → Semibold/Bold (two or more steps) |
| Value on light ground | `#000` → `#333` | `#111` → `#4B4B4B` (≈70%) or `#737373` (≈55%) |
| Value on dark ground | `#FFF` → `#DDD` | `#F5F1E8` (≈95%) → `#A8A29A` (≈70%) |
| Case | Title Case → Sentence case | ALL CAPS (+2–5% tracking) for labels only |
| Letter spacing | 0 → +1% | −1% to −3% for display; +4% to +8% for small caps |

Value steps must also satisfy contrast minimums — see
[`accessibility`](accessibility.md).

## Hierarchy devices, ranked by reliability

1. **Size** — strongest, works at any distance, survives grayscale.
2. **Value contrast** — survives colorblindness and printing.
3. **Weight** — good for small distinctions within a level.
4. **Position** — top-left and center win; bottom-right loses; convention does the work.
5. **Isolation / space** — an element with more space around it gains status.
6. **Color** — weakest alone; reinforcement only.
7. **Decoration** (rules, boxes, shadows) — adds noise, not order.

## Hierarchy audit

Run this on every draft, in order. Each step has a pass condition.

1. **Three-second read** — name elements 1, 2, 3. *Pass:* matches the intended order.
2. **Squint/blur to 20%** — the top level survives as a shape. *Pass:* you can still point at level 1.
3. **Grayscale** — order unchanged. *Pass:* no level relies on hue alone.
4. **Small size** — at 25% zoom on a phone, level 1 and 2 remain legible. *Pass:* body ≥ 14 px equivalent.
5. **Counting** — count distinct sizes, weights, colors used for text. *Pass:* ≤ 3 sizes + ≤ 3 weights + ≤ 4 text colors.
6. **Equal means equal** — items with the same role look the same. *Pass:* no accidental variation (a label at 13 px next to a label at 15 px).

## Common false hierarchies

| Symptom | Likely cause | First fix |
|---|---|---|
| "It feels flat" | Adjacent levels differ by < 1.2× | Increase the size jump at the top |
| "It feels busy" | Too many levels or too many colors | Merge levels; cut text colors to 3 |
| "I don't know where to look" | Two elements tie for level 1 | Demote one by a full step |
| "The logo is lost" | Logo competes with a headline | Give the logo its own quiet zone |
| "It looks unfinished" | Bottom cloud of equal small text | Group details by proximity, not by size |
| "The CTA is invisible" | CTA uses color only | Add size/weight, then a clear shape |

## Rules

- [`02-visual-hierarchy`](../rules/02-visual-hierarchy.md) — the principles behind this table.
- [`24-typographic-hierarchy`](../rules/24-typographic-hierarchy.md) — the type-specific version.
- [`03-contrast-and-emphasis`](../rules/03-contrast-and-emphasis.md) — how emphasis is produced.
- [`07-alignment-and-proximity`](../rules/07-alignment-and-proximity.md) — grouping reinforces order.
- [`41-visual-perception`](../rules/41-visual-perception.md) — why the eye lands where it does.
- [`43-attention-and-eye-tracking`](../rules/43-attention-and-eye-tracking.md) — salience and false hierarchy.
