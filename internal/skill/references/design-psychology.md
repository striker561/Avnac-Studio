# Design psychology — reference

Use to predict how a viewer will actually behave. Rules:
[`40-gestalt-principles`](../rules/40-gestalt-principles.md) through
[`47-cognitive-biases-and-visual-design`](../rules/47-cognitive-biases-and-visual-design.md).

## Gestalt, applied

| Principle | What it means for layout | Typical failure |
|---|---|---|
| Proximity | Close things are read as one group | Space between groups < space within |
| Similarity | Same look = same kind | Two kinds of button styled identically |
| Closure | The eye completes incomplete shapes | A cut-off circle reads as a bug, not a style |
| Continuity | The eye follows a line | Alignments broken by 1–2 px look accidental |
| Common fate | Things moving together belong together | Animated elements unrelated to the content |
| Figure/ground | Subject separated from field | Text over busy imagery |
| Prägnanz | The simplest reading wins | Ambiguous shape read as the wrong object |

## Attention facts worth designing around

- The first fixation is driven by contrast and faces; it happens in ~50–200 ms.
- Peripheral vision detects large shapes, motion and color, not text. The top-level hierarchy
  must survive as a blur.
- The F and Z patterns are consequences of left-aligned text and reading direction, not laws.
  Strong contrast can override them.
- Banner blindness: anything that looks like an ad is skipped, including real content in ad-shaped
  boxes.
- Change blindness: viewers miss changes outside the attended area; do not rely on subtle state
  differences.
- Gaze cues: a face looking toward an element pulls attention there.

## Cognitive load

| Load | Source | Reduce by |
|---|---|---|
| Perceptual | Many competing styles, low contrast | Fewer styles, stronger hierarchy |
| Motor | Small targets, long distances | Bigger targets, grouping related actions |
| Memory | Codes, legends, hidden state | Direct labels, visible context |
| Decision | Too many options | Defaults, progressive disclosure |
| Comprehension | Jargon, unexplained icons | Plain language, labels beside icons |

Practical limit: 5–7 visible options in a decision group; 3–4 primary actions in a screen
header.

## Affordances and signifiers

- An affordance is what an object *can* do; a signifier is the visible cue that it can.
- If a card is clickable, it needs a hover state, a pointer, and a visual difference from a
  non-clickable card. Otherwise it is hidden functionality.
- Buttons need shape + label; links need underline or weight change; inputs need a boundary.
- Feedback must be immediate (< 100 ms for press) and honest (loading states, not fake progress).

## Trust and aesthetics

- Attractive interfaces are rated more usable (aesthetic-usability effect) — but the effect fades
  after use. Do not optimize first impressions at the cost of task success.
- Consistency signals competence; inconsistency signals risk, especially in checkout, health and
  finance.
- Specific photography of real people/places outperforms generic stock for trust; generic stock
  is recognizable and costs credibility.
- Numbers, dates, guarantees and provenance reduce perceived risk more than decorative trust
  badges.

## Bias catalogue (design-relevant)

| Bias | How it shows up | Ethical use |
|---|---|---|
| Anchoring | Crossed-out prices, first option sets the scale | Show real comparisons |
| Default effect | Pre-selected plans, opt-in vs opt-out | Defaults must serve the user |
| Framing | "90% survive" vs "10% die" | Choose the honest frame |
| Loss aversion | "Don't lose your progress" | Do not fabricate loss |
| Choice overload | 12 pricing tiers | Recommend one tier |
| Social proof | "Most popular", reviews | Only if true and representative |
| Halo effect | One polished element raises perceived quality of the rest | Polish proportionally |
| Peak-end rule | Last interaction colours the memory | End well: confirmations, thank-yous |

Dark patterns to refuse: fake urgency, confirmshaming, hidden costs revealed late, obstruction
to cancellation, pre-checked consent. They work once and cost the brand permanently.

## Reading behaviour

- Screen reading is scanning: F-pattern for text-heavy pages, layer-cake for headings + bullets.
- People read ~20–28% of the words on a page on a first pass; the first two words of each line
  carry most of the load.
- Line length 45–75 characters; 66 is a good default.
- Left-aligned ragged-right is faster to read on screen than justified.

## Rules

- [`40-gestalt-principles`](../rules/40-gestalt-principles.md) — grouping and perception.
- [`41-visual-perception`](../rules/41-visual-perception.md) — how the eye samples a design.
- [`42-cognitive-load`](../rules/42-cognitive-load.md) — reducing decisions.
- [`43-attention-and-eye-tracking`](../rules/43-attention-and-eye-tracking.md) — salience.
- [`44-design-psychology`](../rules/44-design-psychology.md) — affect, trust, limits.
- [`45-affordances-and-signifiers`](../rules/45-affordances-and-signifiers.md) — signalling interaction.
- [`47-cognitive-biases-and-visual-design`](../rules/47-cognitive-biases-and-visual-design.md) — bias and ethics.
