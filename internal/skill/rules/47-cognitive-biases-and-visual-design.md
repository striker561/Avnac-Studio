# Rule: Cognitive Biases and Visual Design

**Domain:** psychology · **ID:** `47-cognitive-biases-and-visual-design`

## Purpose
Names the judgment shortcuts a layout reliably triggers — anchoring, framing, defaults, choice overload — so you can design with them on purpose and refuse to design with them deceptively.

## Definition
A cognitive bias is a systematic, predictable departure from neutral judgment. The design-relevant set is small: anchoring (the first number sets the scale), framing (one fact stated as gain or loss), default effect (preselection is kept), choice overload (more options, less action), loss aversion, social proof, decoy and primacy. All of them are triggered by layout as much as by wording — position, size, order, and what is already filled in.

## Core Principles
- Anchoring: the first number in the reading order sets the scale for every number after it. "Was $480" makes $48 feel small even though the arithmetic never changes.
- Framing: "90% success" and "10% failure" are one fact and two decisions. Use one frame per page; switching between hero and table reads as manipulation.
- Default effect: 60–90% of people keep a preselected option. A default is a recommendation whether or not you meant one.
- Choice overload: 24 options cut purchase to about 3%, while 6 options reached about 30% in the jam study. Three to five visible options is the working band.
- Middle-option preference: in a three-tier set the middle is read as "the reasonable one", so price the middle at what you want sold.
- Loss aversion: a real loss ("Your draft expires in 7 days") outweighs an equal gain, and a fabricated one destroys trust permanently.

## Techniques
1. **Set the anchor on purpose** — highest value first in reading order (left, or largest), with the unit stated once: "per month, billed annually".
2. **Three tiers, one recommended** — three cards, the middle 6% larger with a 2 px accent border, tagged "Most popular", and the only filled CTA in the row.
3. **Preselect the common case** — annual billing, standard shipping, the middle plan — plus one reassurance line ("Change any time") to lower the cost of committing.
4. **Cap visible options at five** — beyond five, add filter and sort controls instead of a sixth card; a six-column price row is a scan, not a decision.

## When to Use
- Pricing pages, plan selectors, package tiers, donation amounts, quote options.
- Onboarding with a recommended path, and settings where a sensible default saves a decision.
- Print: order forms, subscription cards, membership levels, upgrade inserts.

## When to Avoid
- Irreversible or high-stakes choices — deleting an account, medical consent. Use explicit confirmation, not a nudge.
- Invented "was" prices and countdown timers that reset on reload: legally risky and corrosive. A fake anchor is fraud with a design credit.
- Expert audiences, who will notice the technique. Being managed is the one thing experts punish.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Six pricing columns | Choice overload; comparison cost exceeds the value | Three tiers, one recommended |
| Strikethrough on an invented MSRP | Illegal in many markets and readable as a lie | Show only a real prior price, with dates |
| Pre-checked marketing consent | Converts once, then churns and breaches consent rules | Unchecked by default, explicit opt-in |
| A decoy tier with no real function | Confuses the comparison it was meant to simplify | Cut it; three honest options |

## Practical Examples
A 1200 px pricing section: three cards 360 px wide with 24 px gutters; the middle card is 380 px and 6% taller with a `#1F6FEB` 2 px border and a 12 px all-caps "Most popular" tag. Prices read `$19`, `$48`, `$129` per month; the anchor sits above the row as one line, "Agency annual: $1,380", at 13 px `#6B7280`, so the monthly figures are read against a larger number first. The annual toggle is preselected with "Save 20%" in `#0F766E`, and only the middle card's CTA is filled.

## Related Rules
- [`44-design-psychology`](44-design-psychology.md) — the evidence base and its limits.
- [`51-brand-positioning`](51-brand-positioning.md) — what the price and the tiers are supposed to say about the brand.
- [`46-information-architecture`](46-information-architecture.md) — ordering options is an IA decision before it is a nudge.
- [`92-component-visual-design`](92-component-visual-design.md) — styling the recommended tier without breaking the set.

## Sources
- Tversky & Kahneman, "Judgment under Uncertainty: Heuristics and Biases" (1974) — anchoring and framing.
- Iyengar & Lepper, "When Choice is Demotivating" (2000) — the jam study, 24 versus 6 options.
- Thaler & Sunstein, *Nudge* — the default effect and its ethical boundary.
