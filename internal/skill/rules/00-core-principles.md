# Rule: Core Principles

**Domain:** foundations · **ID:** `00-core-principles`

## Purpose
Give every design decision a small set of tests, and tell the agent how to use the rest of this library. When two rules conflict, these principles decide which wins.

## Definition
The core principles are the claims that survive when you strip every rule down to its reason. Each is a constraint that holds across formats and audiences, and breaking it produces a specific, nameable failure.

## Core Principles
- **One job per composition.** Write the single sentence the piece must deliver, then demote everything competing with it. Two equal messages produce none.
- **Differences must be perceptible or absent.** A 10% size change, a two-step gray, or a 4° hue shift reads as error, not intent. Choose a full step or choose identity.
- **Structure before decoration.** Proximity, alignment, and scale build structure; color, texture, and effects decorate a structure that already exists. Effects cannot rescue bad grouping.
- **Space is a material.** Every element spends room, and empty room is what makes the rest legible. Budget space like ink, not like leftover.
- **Constraints are content.** Canvas size, safe area, ink count, and file format decide as much as taste. Design inside them from the first thumbnail.
- **Verify by reduction.** Judge at 25%, in grayscale, and in silhouette. A decision that works only at 100% zoom has not been tested.

## Techniques
1. **Write the one-thing sentence** — before placing anything: "This canvas makes [audience] do [one thing]." If it takes more than 12 words, the brief is unfinished.
2. **Load two rules per pass** — the rule for the discipline currently failing, plus `03-contrast-and-emphasis`. Ten rules loaded mid-composition produce drift.
3. **Run the reduction pass** — 25% view, grayscale copy, `#000000` silhouette, three seconds each. Compare the first three things you see with the intended order.
4. **Resolve conflicts by the one thing** — hierarchy beats balance, legibility beats novelty, production limits beat preference. Record the tradeoff in the delivery note.
5. **Close with the quality gate** — [`113-design-quality-checklist`](113-design-quality-checklist.md) before export. A principle you cannot check is a preference.

## When to Use
- At the start of a task, to choose which rules to load at all.
- When the composition feels wrong but no element is wrong: a principle is broken, not a detail.
- When a request would break one ("make the logo bigger", "fill the empty corner") — name the principle and the failure it prevents.

## When to Avoid
- Do not recite principles after the fact. If you cannot name the failure a change prevents, you are decorating.
- Don't run the reduction pass every few minutes; it gates the end of a pass, not the middle of one.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Treating the principles as a checklist | Four half-fixes, no coherent piece | Diagnose the single failure and fix it fully |
| Confusing principle with style | "Minimal" is a look; "one job" is a constraint | State the constraint, not the aesthetic |
| Skipping the reduction pass | Errors invisible at 100% ship | 25%, grayscale, silhouette |

## Practical Examples
A 1080×1080 launch tile: product photo, headline "SHIP FASTER", date line, logo.

One-thing sentence: "This tile makes a developer open the launch post." That demotes the logo to a signature — 96×24 px at the bottom, not the top.

Grouping: headline at y=120 and date at y=200 sit 24 px apart as one block; the photo starts at y=360, a 160 px gap. The 1:6 ratio separates them without a rule.

Reduction: at 270×270 the headline still dominates and the date survives, but `#8A8A8A` on `#111111` is the first casualty — raise it to `#C9C9C9` (7.4:1).

## Related Rules
- [`01-design-process`](01-design-process.md) — turns these constraints into a sequence of decisions.
- [`02-visual-hierarchy`](02-visual-hierarchy.md) — "one job" made visible as an order of reading.
- [`03-contrast-and-emphasis`](03-contrast-and-emphasis.md) — the mechanism behind most of what is claimed here.
- [`113-design-quality-checklist`](113-design-quality-checklist.md) — the closing gate for everything above.

## Sources
- Hofmann, *Graphic Design Manual*, p. 136 — design begins with deliberate confrontation (horizontal/vertical, dot/line, black/white), not decoration.
- Müller-Brockmann, *Grid Systems in Graphic Design*, "Grid and design philosophy" — organizing as a service to communication.
- Shaughnessy, *How to Be a Graphic Designer Without Losing Your Soul*, p. 84 — work must be justifiable in words; clients cannot absorb it otherwise.
