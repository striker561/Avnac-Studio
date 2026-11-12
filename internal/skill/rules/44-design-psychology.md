# Rule: Design Psychology

**Domain:** psychology · **ID:** `44-design-psychology`

## Purpose
Gives a calibrated set of effects you may rely on — and an honest account of how weak most of them are — so that "this will read as trustworthy" is a defensible claim instead of a mood.

## Definition
Design psychology is the evidence about how people judge visual work before and while using it: aesthetic-usability, affect, trust, familiarity, expectation. Each effect is a measured tendency with an effect size and a population, not a law. Applying it means setting defaults and testing them, not guaranteeing an outcome.

## Core Principles
- Aesthetic-usability: attractive work is judged more usable and its small flaws are forgiven. The effect is real and moderate, and it does not survive genuine task failure.
- Affect arrives before comprehension. Judgments of "good" or "bad" form within about 50 ms, before a word is read; visual quality sets the trust level, and the content then confirms or breaks it.
- Trust is built by specificity: a real name, a real photograph, a street address, a dated sample. Adjectives and trust badges buy almost nothing alone.
- Familiarity reads as competence. A convention-conforming layout looks reliable; a novel one looks risky unless the audience is expert or the novelty is the product.
- Most color-psychology claims (blue = trust, red = urgency) are weak and culturally loaded. Use color to fit a category convention, not to engineer an emotion.
- Every claim needs a test: write the intended impression, check it with five people or an A/B, and never ship an untested argument as a fact.

## Techniques
1. **Trust stack in the first viewport** — one specific claim, one proof (name, number, client), one human artifact (photo, signature, workspace), one contact route.
2. **Restraint as a quality signal** — three type sizes, one accent color, margins of 8–12% of the canvas. Polish reads as reliability before any copy is read.
3. **Match affect to the job** — low chroma and wide margins for institutional work; high value contrast plus one warm accent for retail and urgency.
4. **Convention first, novelty second** — logo top-left, nav top, primary action right. Spend novelty on exactly one element.
5. **Five-person read** — show it for five seconds, then ask what the product is, who it is for, and how it felt. Two of five wrong on the first two questions is a failure, not a small sample.

## When to Use
- First-impression surfaces: landing pages, packaging, covers, pitch decks, storefronts.
- Choosing between two acceptable directions when strategy has not decided it.
- Justifying restraint to a client asking for more decoration.

## When to Avoid
- Safety, medical and legal information, where clarity and completeness outrank any affective goal.
- Audiences outside the research population — say out loud that the evidence is thin.
- As cover for dark patterns: manufactured urgency and confirm-shaming are psychology used against the user.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| "Blue means trust" as a color brief | Weak, culturally variable, untestable as stated | Choose by category convention, then test recall |
| Stock smiling people as trust signals | Reads generic and lowers specificity | Real team photo, named person |
| Beauty over legibility | Aesthetic-usability collapses at task failure | Fix reading first, then polish |
| Citing 7±2 for every limit | It describes memory chunks, not layout capacity | Use four chunks and cite Cowan |

## Practical Examples
A 1440×900 hero for a bookkeeping service: H1 "Books closed by the 5th. Every month." at 56 px; one proof line "312 studios since 2016" at 16 px `#4B5563`; a real photo of two named bookkeepers at a desk, cropped 4:5, on the right 40%; one `#0F766E` button "Book a 15-minute call". No badges, no star ratings, no gradient overlay. Every item in the trust stack is checkable, which is the whole argument.

## Related Rules
- [`12-color-psychology`](12-color-psychology.md) — the color claims, and how far they actually hold.
- [`43-attention-and-eye-tracking`](43-attention-and-eye-tracking.md) — what the first 200 ms of a layout is spent on.
- [`08-negative-space`](08-negative-space.md) — the restraint that produces perceived quality.
- [`98-web-accessibility`](98-web-accessibility.md) — where psychological preference loses to hard requirements.

## Sources
- Kurosu & Kashimura (1995) and Tractinsky (1997) — the aesthetic-usability effect and its measured size.
- Fogg et al., Stanford Web Credibility Project (2003) — about 46% of participants named design the largest single factor in a site's credibility.
- Norman, *Emotional Design* — affect as a precondition for how people tolerate difficulty.
