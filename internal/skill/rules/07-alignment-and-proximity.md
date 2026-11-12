# Rule: Alignment and Proximity

**Domain:** foundations · **ID:** `07-alignment-and-proximity`

## Purpose
Create the invisible lines that hold a layout together, and let space — not boxes — say which items belong together. Alignment removes the small differences that read as carelessness; proximity removes the need for rules and dividers.

## Definition
Alignment is the sharing of edges or centers along one or more axes. Proximity is the use of relative gap size to indicate grouping. Both are structural: they work before color and type are considered, and no decoration repairs them.

## Core Principles
- One or two alignment axes per composition. Three or more means no axis at all.
- Strong alignment beats approximate alignment: a 2 px offset reads as a mistake, a 40 px offset reads as a decision.
- Near-alignments are the enemy. If two edges differ by less than 8 px on a 1080 canvas, snap them or separate them by more than 24 px.
- Proximity needs a ratio, not a value: gaps within a group at least 1.5× smaller than gaps between groups, 2:1 to 3:1 being comfortable.
- Optical alignment overrides mathematical alignment. Circles and curves overshoot flat edges by 1–2% of their diameter; quotes and parentheses hang outside the text block.
- Interrupted diagonals appear to shift; the stronger the contrast, the larger the break, so offset continuous lines deliberately.

## Techniques
1. **Declare the axes** — one primary (left edge x=96), one secondary (baseline y=880). Every element references one of them; nothing floats.
2. **Three-gap proximity** — 16 px inside a group, 48 px between groups, 144 px between sections. Grouping becomes visible without frames.
3. **Optical overshoot** — a 100 px circle extends 2 px past the alignment line; a triangle's point sits 1–2 px beyond the cap line to look level.
4. **Align images to type** — image top to cap height, image bottom to the descender line, so picture and text share a baseline.
5. **Remove the dividers** — delete every rule and box; if grouping collapses, fix the gaps rather than restoring the lines.

## When to Use
- Any layout with three or more elements.
- Forms, tables, and UI, where repeated edges imply a system.
- When a design feels messy although every element looks fine on its own.
- When you are about to add dividers to separate content.

## When to Avoid
- Deliberately scattered or collage layouts — but keep one axis to prove the scatter is intentional.
- Centering long text, which creates two ragged edges and a weak read.
- Aligning to a hidden grid the viewer cannot perceive; an alignment nobody can see is not doing work.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Left, center, and right in one block | Three axes, no structure | One alignment per block |
| Centering by bounding box | The optical center sits high; text looks low | Nudge up 2–4 px at reading size |
| Equal 24 px gaps between related and unrelated items | No grouping information, so dividers appear | 16/48/144 gap ladder |
| 3 px offsets between "aligned" edges | Reads as error at every zoom | Snap, or separate by 24 px |

## Practical Examples
A 1200×628 banner. Left axis x=64; logo 180×48 at y=48; headline baseline y=232; CTA 220×56 at y=468. The image sits at the right, its right edge at x=1136, top aligned to the headline's cap height and bottom to the descender line.

Gaps: 24 px between logo and headline, 64 px between headline and CTA. The 2.7:1 ratio makes the first two read as one lockup and the CTA as a separate action, with no divider anywhere.

## Related Rules
- [`04-balance-and-proportion`](04-balance-and-proportion.md) — edges and axes are where balance becomes visible.
- [`08-negative-space`](08-negative-space.md) — the space that proximity measures.
- [`30-grid-systems`](30-grid-systems.md) — alignment made systematic for multi-page work.
- [`40-gestalt-principles`](40-gestalt-principles.md) — the perception laws proximity is exploiting.

## Sources
- Cheng, *Designing Type*, p. 109 — the Poggendorff illusion: an interrupted line appears to shift, by an amount that depends on angle and contrast. Optical alignment is a correction, not a flourish.
- Müller-Brockmann, *Grid Systems in Graphic Design*, p. 69 — picture tops bound to the cap line, picture bottoms to the descender line, so images align to the type rather than to a box.
- Hofmann, *Graphic Design Manual*, p. 66 — varying the spacing of dots produces inclusion, exclusion, clustering, and separation from the ground: proximity is read as grouping.
