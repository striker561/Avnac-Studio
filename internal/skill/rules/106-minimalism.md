# Rule: Minimalism

**Domain:** history · **ID:** `106-minimalism`

## Purpose
Remove everything that does not carry information or structure, then make what remains precise. The
goal is not emptiness; it is a composition where every remaining decision is visible.

## Definition
Minimalism as a design strategy is subtraction to the point where proportion, spacing, one type family,
and a restrained palette carry the whole message. What is left must be exactly placed, because with
four elements a 1 px misalignment is a visible defect.

## Core Principles
- Subtraction is the method: remove, check whether meaning survived, repeat until it nearly doesn't.
- Precision replaces ornament. With few elements, alignment, margin, and optical correction are the
  whole craft.
- Space is a material: 40–60% of the canvas can be empty, and the margin is part of the composition.
- One idea per surface; one family, two or three sizes, two weights.
- Color: a neutral field, a near-black, and at most one accent under 10% of the area.
- Reduction without hierarchy is just emptiness — a minimal design still needs one entry point.

## Techniques
1. **The removal pass** — delete an element, then justify each survivor in one clause ("this rule
   separates title from detail"). If you cannot, delete it.
2. **Optical precision** — align to a 4/8 px grid, use one margin value everywhere (say 96 px), and
   raise text blocks 2–3% above the geometric center so they look centered.
3. **Type as the only event** — one family (Inter, Söhne, Helvetica Now), sizes 14/20/64, one weight
   jump, tracking −1% to −2% at display size.
4. **One accent, by scarcity** — a 12×12 dot or a 2 px rule in a saturated color against 95% neutral
   becomes the focal point because nothing else competes.
5. **Copy the restraint, avoid the emptiness** — copy: subtraction, one family, generous margin, one
   accent, optical precision. Avoid: 8 px gray body text sold as elegance, hairline-everything,
   pages with no information, and "luxury minimalism" that hides the price or the action.

## When to Use
- Premium and cultural brands, portfolios, product photography, editorial openers, museum graphics.
- When one object or one sentence must hold the whole page.

## When to Avoid
- Dense information tasks, dashboards, and multi-step forms: the space costs comprehension.
- Retail and packaging where shelf competition requires signal.
- Contexts where low contrast is baked into the aesthetic — that fails accessibility, not taste.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Gray-on-gray "elegance" | Fails 4.5:1 and reads as washed out | Keep 7:1 body contrast; reduce area, not contrast |
| Empty space with no alignment logic | Looks unfinished rather than quiet | One margin value, shared axes |
| Removing the call to action to stay pure | The design stops working | Keep the one action, cut everything else |
| 11 px body to look refined | Unreadable on screen | 16 px body minimum |
| Minimalism as a universal default | Strips cues from complex products | Reserve it for low-density, high-value surfaces |

## Practical Examples
A 1600×900 hero:

- Field `#FAFAF8`; 120 px margin on all four sides — one number, used everywhere.
- Headline 72 px/600 `#111111` at x=120 y=280 w=760, tracking −2%, leading 1.05.
- Subline 18 px `#4A4A4A` at y=420, w=520, 1.5 line-height.
- One button 44 px tall, 168 px wide, `#111111`, radius 0, label 16 px/600 `#FAFAF8`, at y=560.
- A single 1 px `#DADADA` rule at y=760 from x=120 to 1480 — the only other mark on the page.

## Related Rules
- [`08-negative-space`](08-negative-space.md) — space as a material rather than what is left over.
- [`02-visual-hierarchy`](02-visual-hierarchy.md) — the entry point reduction must not remove.
- [`03-contrast-and-emphasis`](03-contrast-and-emphasis.md) — why one accent works only when nothing competes.
- [`100-design-movements`](100-design-movements.md) — using a movement as constraints rather than a style.

## Sources
- Hofmann, *Graphic Design Manual*, p. 130 — confrontation studies: two elements on a field make contrast legible; more elements make it ambiguous.
- Tufte, *The Visual Display of Quantitative Information*, p. 100 — erase non-data-ink within reason; the same subtraction, applied to charts.
- Pawson, *Minimum* — minimalism argued as proportion and light rather than as absence.
