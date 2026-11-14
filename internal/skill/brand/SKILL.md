---
name: brand
description: Build or evaluate a brand identity — positioning, personality, visual identity system, logo policy, color and type ownership, guidelines, consistency and rebranding. Use whenever the user mentions brand, identity, rebrand, guidelines, "our brand feels inconsistent", or needs one visual language across many touchpoints.
---

# Brand Identity

## Applies when
The work spans more than one artifact or must express a position rather than a message. For a
single logo file, use `logo`; for a palette alone, use `palette`. Use this skill when the question
is "what should this brand look like *everywhere*".

## Workflow
1. **Collect the strategy inputs**, in this order: audience, category, differentiator, proof,
   personality (3–5 adjectives with opposites), constraints. If two are missing, ask; do not
   design into a vacuum.
2. **Write the positioning statement** in one sentence: for [audience] who [need], [brand] is the
   [category] that [differentiator], because [proof].
3. **Translate personality into design axes.** Each adjective becomes a directional decision:
   "precise" → tighter spacing, fewer strokes, aligned geometry; "warm" → rounded forms, softer
   contrast, human imagery. Write the mapping down; it is the argument for every later choice.
4. **Build the identity system in layers**: mark and lockups, color (1 owned + neutrals +
   functional), type (display + text + fallback), imagery (photography/illustration/icon style),
   layout (grid + templates), motion/voice if relevant.
5. **Test for distinctiveness.** Cover the logo: can the brand still be recognized from color,
   type and layout alone? If not, the system is the logo, not an identity.
6. **Produce applications, not mockups.** Six to ten real artifacts the brand will actually use.
7. **Write the guidelines** last, from the decisions that survived the applications.
8. **Set the consistency mechanism**: templates, tokens, asset library, and a review cadence.

## Decision points
- **Who owns the color?** One owned color beats a tasteful palette nobody remembers. Check the
  category first: if every competitor is blue, own something else.
- **Flexible or fixed?** Fixed systems are cheap and consistent; flexible systems (variable
  layout, changing imagery) age better but need better rules. Choose based on internal capability.
- **Evolve or rebuild?** Preserve equity unless the strategy changed. A redraw solves execution
  problems; a rebuild solves strategy problems.
- **How strict should guidelines be?** Strict enough to keep recognition, loose enough that
  non-designers can produce something acceptable. Publish ratios and minimums, not screenshots.

## Rules to apply
- [`50-brand-strategy`](../rules/50-brand-strategy.md) — strategy to design constraints.
- [`51-brand-positioning`](../rules/51-brand-positioning.md) — writing the statement.
- [`52-visual-identity-systems`](../rules/52-visual-identity-systems.md) — the layers and their relationships.
- [`55-brand-color-and-typography`](../rules/55-brand-color-and-typography.md) — owning color and type.
- [`56-brand-consistency`](../rules/56-brand-consistency.md) — drift and audits.
- [`57-brand-guidelines`](../rules/57-brand-guidelines.md) — documents people actually use.
- [`58-rebranding-and-evolution`](../rules/58-rebranding-and-evolution.md) — when and how to change.
- [`49-timelessness-and-longevity`](../rules/49-timelessness-and-longevity.md) — how long the identity must live, and what that rules out.

## References
- [`branding`](../references/branding.md) — strategy templates, system layers, audit method.
- [`logo`](../references/logo.md) — mark construction and file sets.

## Production checks
- Every application uses the same core elements; no one-off fonts or colors.
- Logo policy covers: clear space, minimum sizes, lockups, misuse, one-color, reversed.
- Color values exist for HEX, RGB, CMYK and spot where print matters.
- Type licences cover every medium the brand will use.
- Templates are editable by non-designers and still look native.
- Accessibility: brand pairs pass contrast; the identity does not depend on color alone.

## Output format
`Positioning:` one sentence. `Personality:` adjectives + design translation. `System:` mark,
color, type, imagery, layout with one-line rationale each. `Applications:` list with files.
`Guidelines:` structure. `Risks:` where consistency will break first.
