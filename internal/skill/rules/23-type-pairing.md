# Rule: Type Pairing

**Domain:** typography · **ID:** `23-type-pairing`

## Purpose
Combine two typefaces so they read as one system: different enough to be doing different jobs, similar enough to belong to the same page. Most pairing failures are either too much contrast or too little.

## Definition
Pairing is the deliberate combination of families across roles — display, text, data — using contrast of structure and agreement of proportion. It is a relationship, not a list of approved couples.

## Core Principles
- One voice per role: display, text, data. Two families is the working maximum, three only with a monospace for numbers and code.
- Contrast of structure, not of era: a serif text face with a grotesque display, or a high-contrast display with a neutral sans — not Garamond with Baskerville.
- Shared skeleton holds the pair together: similar stress axis, similar proportions, similar x-height ratio (see 22).
- Match apparent weight, not named weight. A Bold serif and a Regular sans can put the same darkness on the page.
- The one-voice rule: never two faces competing for one role. If both must shout, one is not doing a display job.
- A single family with three weights is a valid pairing; for interfaces it is usually the best one.
- An economy of type is a system, not a limitation. Four well-chosen families can cover years of work; the variety comes from scale, weight, and arrangement, not from adding faces (p. 54).

## Techniques

**Avnac ops:** `assets` op=fonts verifies both families are available; `elements` op=measure tests the pairing at real sizes; `elements` op=render sets it; `get_canvas_image` shows whether the two voices separate.

1. **Assign by text run.** Give the primary family the longest run; the secondary gets headlines, captions, and numbers.
2. **Match x-heights.** If the ratios are 63% and 71%, set the second family at 0.89× the first's size so lowercase bodies align.
3. **Match weight at 100%.** Compare the stem of "l" at equal cap height; if the secondary is more than about 15% heavier, drop a weight.
4. **Test on forty words.** Set a paragraph in each at matched size and compare the gray of the block; a mismatch shows as one block looking bolder.
5. **Give monospace a third role or none.** Use it for data, code, and labels; its even rhythm fights running text (see 25).

## When to Use
- A brand supplies a display face and you need a text face.
- Editorial work with a real headline/body split.
- An interface needs one family for text and a second for numerals or code.

## When to Avoid
- When one family already has the range; a second is then decoration.
- Don't pair two serifs of the same era, or two geometric sans — the reader sees a near-miss, not a contrast.
- Don't add a script as a third voice in an interface; it reads as an advertisement.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Garamond with Baskerville | Same skeleton; the difference reads as error | Serif with sans |
| Matching nominal sizes instead of x-heights | One block looks 1–2 px smaller | Scale by the measured ratio |
| Two bold display faces | Both compete and the hierarchy collapses | One display voice, one text voice |
| Display face for body copy | Spacing built for 48 px is too tight at 14 px | Use the text cut |
| Adding a family for figures | Extra voice with no new role | Tabular figures in the existing family |

## Practical Examples
A poster pairs a high-contrast display serif at 120 px for "SALT" with a neutral grotesque at 20 px/1.5 for the details, plus a monospace at 13 px for the date and price. Measured x-heights are 66% and 72%, so the grotesque sits at 0.92× the serif's size wherever the two share a line. Three voices, three roles, one skeleton.

## Verification
1. **Ops receipt.** `assets` op=fonts reports both families `loaded`, `canvas` op=validate `level_census` stays at four or fewer, and `get_canvas_image` shows the pair differing by structure rather than by size alone.
2. **Voice count.** One family per role — display, text, data. Two families is the working
   maximum, three only with a monospace for figures and code; a fourth subtracts from all of them.
3. **x-height correction.** Measure both faces' x-height against cap height: at 63% and 71%, the
   second is set at 0.89× the first's size. A pair needing a correction outside 0.89–1.13 is not
   sharing a skeleton, whatever the description says.
4. **Stem weight.** Compare the "l" stems at equal cap height: within about 15%. A secondary more
   than 15% heavier reads as the more important voice and needs a weight dropped.
5. **Forty-word grey.** Set the same 40-word paragraph in both at matched size and view at 25%.
   One block darker is a weight mismatch, not a personality difference.
6. **Role collision.** No family serves two roles. A face used for display and body has spacing
   built for neither; the single-family system is the exception, and it needs three weights.

## Related Rules
- [`20-typography-fundamentals`](20-typography-fundamentals.md) — the six values each family has to satisfy.
- [`21-type-classification`](21-type-classification.md) — which categories are far enough apart to pair.
- [`22-type-anatomy`](22-type-anatomy.md) — the measurements that make matching objective.
- [`24-typographic-hierarchy`](24-typographic-hierarchy.md) — when a weight would do the job of a second family.
- [`29-variable-and-digital-type`](29-variable-and-digital-type.md) — fallback stacks and rendering differences between paired faces.

## Sources
- Cheng, *Designing Type*, p. 51 — Verdana and Microsoft Sans: even within one category, width and evenness of set differ enough to change the page's texture.
- Cheng, *Designing Type*, p. 180 — tabular versus proportional figures, and why a numbers problem is not a second-family problem.
- Bringhurst, *The Elements of Typographic Style* — pairing by structure and proportion rather than by style label.
- Vignelli, *The Vignelli Canon*, "Typefaces", p. 54 — an exhibition of years of work set in only four typefaces, as proof that an economy of type still produces variety.
