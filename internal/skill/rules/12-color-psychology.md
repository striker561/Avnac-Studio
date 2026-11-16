# Rule: Color Psychology

**Domain:** color · **ID:** `12-color-psychology`

## Purpose
Use color meaning deliberately, and refuse to over-claim what color does. This rule exists so the library never repeats pop-psychology color charts as fact.

## Definition
Color psychology is the study of learned and contextual associations between colors and meanings, moods, or behaviors. Its findings are probabilistic, culture-bound, and small next to the effects of contrast, composition, wording, and product category.

## Core Principles
- Associations are learned, not innate. Red reads as urgency in Euro-American commerce, as luck and celebration in Chinese contexts, and as mourning in parts of Southern Africa.
- Category convention beats universal theory. A bank is expected to look blue and sober, a health brand green and clean, a discounter red and yellow. Fitting the convention buys trust; breaking it buys attention and costs some.
- Value and chroma carry as much affect as hue. Dark and desaturated reads premium and calm; light and saturated reads cheap, playful, or urgent.
- Laboratory effects are small and context-dependent. There is no defensible universal color-to-emotion table.
- Copy, image, typography, and position can override a color's association in one glance.
- Never let color be the only carrier of meaning (see 18).

## Techniques

**Avnac ops:** `guide` checks the category the colour is being asked to carry; `elements` op=render sets the meaning-bearing colour; `canvas` op=validate reports `contrast_floor`; `get_canvas_image` tests meaning in the composition, where it changes. There is no semantic-colour op.

1. **Audit the category** — collect 8–10 competitor marks, note their dominant hues, and decide whether to match for trust or depart for differentiation. Say which in the rationale.
2. **Check the markets** — list the three largest markets, flag hues with conflicting meanings, and pair the color with a word or icon that fixes the reading.
3. **Set affect by value** — for calm and premium, lightness 85–95% with chroma under 20%; for urgency, lightness under 45% with chroma above 60%.
4. **Test the reading** — show the piece for 10 seconds and ask "what is this selling?" rather than "how does this color make you feel."
5. **Write the claim down** — "blue to match category convention and cue reliability", never "blue increases trust by 34%".

## When to Use
- Brand color selection (see 55).
- Campaign mood and art direction briefs.
- UI semantic colors: error, success, warning, information.
- Packaging, where shelf context sets the reading.

## When to Avoid
- When contrast and accessibility set the constraint; use the accessible color and adjust the message.
- When the audience spans cultures you cannot verify; reduce color's load and lean on wording.
- When the only argument for a color is personal preference.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| "Blue means trust" applied globally | Ignores culture, category, and value | State the context and the source |
| Assuming red means danger everywhere | Wrong in several major markets | Verify per market; back it with copy |
| Saturated red for errors in a luxury brand | Breaks the affect the product sells | Keep the hue, lower the chroma |
| Citing a retention percentage as fact | No reliable universal figure exists | Describe the association, not a statistic |
| Using color alone for state | Fails for colorblind users and in print | Add an icon, label, or shape |

## Practical Examples
A 1080×1080 clinic tile. Ground `#EAF4F1` (light, low chroma, so calm), primary `#0E7C66` (health green, 4.9:1 on the ground), and `#B3261E` reserved for the "no-show" badge only.

Green matches the category convention, so the tile reads as medical without explanation. The red appears once in the whole system, which is what makes it read as an exception rather than as the brand's voice.

## Verification
1. **Ops receipt.** `get_canvas_image` shows the intended association before the caption is read, `canvas` op=validate `contrast_floor` passes, and the category conventions were checked with `guide`. A colour that needs a paragraph to explain is not carrying meaning.
2. **Category position.** Lay the piece beside the 8–10 competitor marks from the audit: it either
   sits in the category's dominant hue or it is visibly the exception. Neither means it has a colour
   but no position.
3. **Ten-second read.** Show it for 10 seconds and ask "what is this selling?". The answer names the
   category unprompted; "a poster", or the colour's name, means the association is not carrying it.
4. **Affect band.** Measure the dominant colour: calm and premium sit at 85–95% lightness with
   chroma under 20%, urgency under 45% lightness with chroma above 60%. A premium build at C 40% is
   outside the band whatever the hue.
5. **Hue removal.** Desaturate: every state, error and required field keeps a word, icon, shape or
   position. A meaning that exists only in hue fails this and SC 1.4.1 together.
6. **Claim audit.** Read the rationale: every colour claim names its context and carries no
   percentage. "Blue matches the category convention" is checkable; "blue increases trust 34%" is a
   statistic nobody can reproduce.

## Related Rules
- [`11-color-harmony`](11-color-harmony.md) — the palette-level decisions this rule sits on top of.
- [`18-color-accessibility`](18-color-accessibility.md) — the constraint that overrides meaning.
- [`44-design-psychology`](44-design-psychology.md) — how far psychological claims can be leaned on at all.
- [`55-brand-color-and-typography`](55-brand-color-and-typography.md) — committing a brand to a hue.

## Sources
- Madden, Hewett & Roth, "Managing Images in Different Cultures: A Cross-National Study of Color Meanings and Preferences," *Journal of International Marketing* (2000) — meaning varies by culture and by product category.
- Aslam, "Are You Selling the Right Colour? A Cross-cultural Review of Colour as a Marketing Cue," *Journal of Marketing Communications* (2006).
- WCAG 2.2, SC 1.4.1 "Use of Color" — color must not be the only means of conveying information.
