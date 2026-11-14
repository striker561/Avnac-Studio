# Rule: Design Systems

**Domain:** ui · **ID:** `91-design-systems`

## Purpose
Turn a set of screens into a system that produces the next screen without a designer present. A
design system is not a component library: it is the naming, documentation and decision rights that
make ten components behave like one product.

## Definition
A design system is a governed set of decisions — tokens (named values for color, type, space, radius,
shadow, motion), components built from those tokens, documentation saying when to use each one, and a
contribution process deciding what enters the system and what leaves it.

## Core Principles
- Three token tiers: primitive (`blue-500` = `#2563EB`), semantic (`action-primary`), component
  (`button-bg`). Screens reference only the lower two; a raw hex is a bug.
- Name for role, not appearance: `surface-raised`, `text-secondary`; `light-gray-2` dies in dark mode.
- One scale per dimension: space 0/4/8/12/16/24/32/48/64, type 12/14/16/20/24/32, radius
  0/4/8/16/full, shadow 0–3. An off-scale value is a missing step, not an exception.
- Components are documented by anatomy, states and rules, not screenshots: what it is made of, what
  it becomes when loading or disabled, and two do/don't clauses.
- Deprecation is part of the system: draft/stable/deprecated status, a version, a replacement path.
- Governance is a service level, not a committee: one named owner, a five-business-day review
  window, published acceptance criteria. Slow, vague approval is what makes teams fork.

## Techniques
1. **Audit before you systematize** — count the distinct button styles; if it is 14, the target is 9
   (3 variants × 3 sizes) and that merge list is release one.
2. **Publish tokens once** — one JSON or CSS custom-property file that design and code both read.
3. **Write every component page to one template** — purpose, anatomy, variants, states, spacing,
   content rules, accessibility notes, two do's and two don'ts. Scannable beats complete.
4. **Set a contribution path** — propose → owner review (5 days) → build token-first → document →
   release. Anything outside that path is a labeled local pattern.
5. **Version with semver and a changelog** — breaking token renames are major, new components minor,
   visual fixes patch; announce majors two releases ahead.
6. **Measure adoption, not size** — % of screens on system components, raw hex count, local overrides.

## When to Use
- Two or more products, platforms or teams must look and behave like one brand.
- A product has passed roughly 30 screens or 5 contributors and drift is now measurable.
- When the same component is rebuilt per feature ("we needed a slightly different dropdown").

## When to Avoid
- One-off campaign pages with a two-week life; a system pays back over dozens of screens, not one.
- Before the core interaction is settled; systematizing a flow you will replace locks in a wrong
  abstraction.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Components without tokens | Dark mode and rebrands require rebuilding each one | Tokens first, components from tokens only |
| Documentation that is only screenshots | Nobody knows the states or the spacing | Anatomy, states, do/don't, tokens used |
| No deprecated status | Old and new components coexist for years | Mark deprecated, name the replacement |

## Practical Examples
A 12-screen admin tool in Avnac. Tokens: `surface-base #FAFAF7`, `surface-raised #FFFFFF`,
`text-primary #111418`, `text-secondary #4A4F57`, `border-subtle #E3E1DA`, `action-primary #1F6F4A`,
`action-primary-hover #195C3D`, `focus-ring #1F6F4A`. Eight components: button, input, select,
checkbox, table row, card, badge, modal. Release 0.1 ships the tokens plus four components; the
follow-up audit reports 82% of screens on system components and 11 raw hex values left, which is
exactly what release 0.2 targets.

## Related Rules
- [`92-component-visual-design`](92-component-visual-design.md) — the anatomy and state detail each documented component carries.
- [`93-interface-layout-and-spacing`](93-interface-layout-and-spacing.md) — the spacing scale the space tokens encode.
- [`99-interface-consistency`](99-interface-consistency.md) — the audit side: finding and fixing drift.
- [`57-brand-guidelines`](57-brand-guidelines.md) — the brand-level document the system implements.
- [`117-design-documentation`](117-design-documentation.md) — writing decisions so the system stays explainable.

## Sources
- WAI-ARIA Authoring Practices and WCAG 2.2 — the accessibility expectations every component page must state.
- Design Tokens Community Group draft specification — the primitive/semantic/component tier model.
- Professional convention — semver for libraries, contribution RFCs with named owners and review SLAs.
