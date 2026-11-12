---
name: palette
description: Build a usable color palette — anchors, value ramps, neutrals, semantic tokens and proportion rules that survive screen and print. Use when the user needs a palette, brand colors, a color scheme, a theme, or says their colors look muddy, inconsistent or "not a system".
---

# Palette Construction

## Applies when
The deliverable is a *set* of colors with roles and rules, not a single color decision. For
choosing one color or judging a pair, use `color`; for owning a brand color strategically, use
`brand`.

## Workflow
1. **Pick the anchor.** One color the design must own. Source it from the most meaningful place
   available: the logo, the product, a material, the audience's category conventions.
2. **Build a value ramp for the anchor.** 7–9 steps from near-white to near-black at even
   perceptual lightness (OKLCH). Name them 50/100/200/…/900. Check that 600–800 keep the hue.
3. **Build a neutral ramp.** Tint the gray 2–6% toward the anchor; pure gray next to a saturated
   color looks dirty, tinted gray looks intentional.
4. **Add one accent** for attention and one functional set: success, warning, error, info. Each
   needs a text-safe dark variant and a soft background variant.
5. **Assign roles, not hues.** `surface`, `surface-raised`, `border`, `text`, `text-muted`,
   `accent`, `accent-contrast`. Designers and code both consume roles.
6. **Set proportions.** 60/30/10: ground, structure, accent. Write it down; proportions are what
   make a palette look designed.
7. **Validate.** Contrast pairs, grayscale, colorblind simulation, print conversion, dark mode
   inversion.

## Decision points
- **How many colors?** 1 anchor + 1 neutral ramp + 1 accent + 4 functional = a complete system.
  More than 12 hex values is usually not a palette, it is indecision.
- **Analogous or complementary?** Analogous for calm and cohesion; complementary for energy and
  emphasis. Pick the accent strategy before generating values.
- **Light or dark default?** Dark themes need desaturated colors and lighter surfaces for
  elevation; do not derive them by inverting the light palette.
- **Print or screen first?** If print, choose CMYK-safe anchors (avoid electric blue/green) and
  check the spot-color cost for a second brand ink.

## Rules to apply
- [`16-palette-construction`](../rules/16-palette-construction.md) — ramps, neutrals, tokens.
- [`15-color-systems-and-models`](../rules/15-color-systems-and-models.md) — OKLCH, RGB, CMYK, spot.
- [`11-color-harmony`](../rules/11-color-harmony.md) — the scheme you are building.
- [`17-limited-and-functional-palettes`](../rules/17-limited-and-functional-palettes.md) — one/two-color work.
- [`18-color-accessibility`](../rules/18-color-accessibility.md) — the pairs that must pass.
- [`55-brand-color-and-typography`](../rules/55-brand-color-and-typography.md) — when the palette is a brand asset.

## References
- [`color`](../references/color.md) — spaces and contrast anchors.
- [`accessibility`](../references/accessibility.md) — minimum ratios and non-color cues.

## Production checks
- Every ramp step is distinguishable from its neighbour at small size.
- Text on `accent` passes 4.5:1; if not, the accent needs a darker text-safe variant.
- The palette has print values (CMYK, Pantone) and screen values (HEX, P3 where relevant).
- Dark mode: surfaces step lighter with elevation, text stays ≥ 4.5:1.
- The 10% accent is genuinely 10% of the design, not 40%.

## Output format
`Anchor:` color + why. `Ramps:` table of steps and uses. `Roles:` token → value → contrast
notes. `Proportions:` 60/30/10 with a note on where each appears. `Print:` CMYK/spot values.
`Risks:` muddy pairs, gamut shifts, dark-mode derivations.
