# Rules index

The authoritative half of the library. Each file is one applied principle, written to be used on
a canvas rather than quoted: purpose, definition, core principles, techniques, when to use and
avoid, common mistakes, a worked example, related rules and sources.

Read the rule that the routed task skill links. Read this index when you need to know what else
exists, or when a decision has no obvious owner.

- **Reading order**: `SKILL.md` → `<task>/SKILL.md` → the 4–8 rules it links → a reference for numbers.
- **Authority**: when a rule and a reference disagree about a number, the rule wins — fix the reference.
- **Ceiling**: this library holds at most 128 rule files so an agent can hold the index in context.
- **Adding a rule**: follow the template in any existing rule exactly; the H2 headings and their
  order are enforced by `go test ./internal/skill`.
- **Regenerating**: `node scripts/gen-rule-index.mjs` rewrites this file from the rule headers.

## Index

| Domain | Rules |
|---|---|
| Foundations | 15 |
| Color | 12 |
| Typography | 10 |
| Layout & composition | 10 |
| Perception & psychology | 7 |
| Branding & identity | 9 |
| Illustration | 9 |
| Imagery & photography | 7 |
| Print production | 8 |
| Interface design | 13 |
| Design history | 11 |
| Vector drawing | 8 |
| Critique, quality & delivery | 6 |

## Foundations — principles that govern every decision

- [`00-core-principles`](00-core-principles.md) — Core Principles
- [`01-design-process`](01-design-process.md) — Design Process
- [`02-visual-hierarchy`](02-visual-hierarchy.md) — Visual Hierarchy
- [`03-contrast-and-emphasis`](03-contrast-and-emphasis.md) — Contrast and Emphasis
- [`04-balance-and-proportion`](04-balance-and-proportion.md) — Balance and Proportion
- [`05-rhythm-and-repetition`](05-rhythm-and-repetition.md) — Rhythm and Repetition
- [`06-unity-and-variety`](06-unity-and-variety.md) — Unity and Variety
- [`07-alignment-and-proximity`](07-alignment-and-proximity.md) — Alignment and Proximity
- [`08-negative-space`](08-negative-space.md) — Negative Space
- [`09-figure-ground`](09-figure-ground.md) — Figure-Ground
- [`48-semantics-syntax-pragmatics`](48-semantics-syntax-pragmatics.md) — Semantics, Syntax, and Pragmatics
- [`49-timelessness-and-longevity`](49-timelessness-and-longevity.md) — Timelessness and Longevity
- [`111-design-critique`](111-design-critique.md) — Design Critique
- [`112-common-design-mistakes`](112-common-design-mistakes.md) — Common Design Mistakes
- [`113-design-quality-checklist`](113-design-quality-checklist.md) — Design Quality Checklist

## Color — theory, harmony, contrast, systems, accessibility

- [`10-color-theory`](10-color-theory.md) — Color Theory
- [`11-color-harmony`](11-color-harmony.md) — Color Harmony
- [`12-color-psychology`](12-color-psychology.md) — Color Psychology
- [`13-color-perception`](13-color-perception.md) — Color Perception
- [`14-color-contrast`](14-color-contrast.md) — Color Contrast
- [`15-color-systems-and-models`](15-color-systems-and-models.md) — Color Systems and Models
- [`16-palette-construction`](16-palette-construction.md) — Palette Construction
- [`17-limited-and-functional-palettes`](17-limited-and-functional-palettes.md) — Limited and Functional Palettes
- [`18-color-accessibility`](18-color-accessibility.md) — Color Accessibility
- [`19-color-in-context`](19-color-in-context.md) — Color in Context
- [`59-color-naming-and-reference`](59-color-naming-and-reference.md) — Color Naming and Reference
- [`73-duotone-and-color-grading`](73-duotone-and-color-grading.md) — Duotone and Color Grading

## Typography — selection, hierarchy, setting, type at size

- [`20-typography-fundamentals`](20-typography-fundamentals.md) — Typography Fundamentals
- [`21-type-classification`](21-type-classification.md) — Type Classification
- [`22-type-anatomy`](22-type-anatomy.md) — Type Anatomy
- [`23-type-pairing`](23-type-pairing.md) — Type Pairing
- [`24-typographic-hierarchy`](24-typographic-hierarchy.md) — Typographic Hierarchy
- [`25-spacing-and-typesetting`](25-spacing-and-typesetting.md) — Spacing and Typesetting
- [`26-type-scale-and-proportion`](26-type-scale-and-proportion.md) — Type Scale and Proportion
- [`27-readability-and-legibility`](27-readability-and-legibility.md) — Readability and Legibility
- [`28-display-and-expressive-type`](28-display-and-expressive-type.md) — Display and Expressive Type
- [`29-variable-and-digital-type`](29-variable-and-digital-type.md) — Variable and Digital Type

## Layout & composition — grids, structure, image placement, scale

- [`30-grid-systems`](30-grid-systems.md) — Grid Systems
- [`31-layout-structures`](31-layout-structures.md) — Layout Structures
- [`32-editorial-layout`](32-editorial-layout.md) — Editorial Layout
- [`33-asymmetric-and-modular-layouts`](33-asymmetric-and-modular-layouts.md) — Asymmetric and Modular Layouts
- [`34-composition-techniques`](34-composition-techniques.md) — Composition Techniques
- [`35-perspective-and-depth`](35-perspective-and-depth.md) — Perspective and Depth
- [`36-scale-and-proportion`](36-scale-and-proportion.md) — Scale and Proportion
- [`37-direction-and-movement`](37-direction-and-movement.md) — Direction and Movement
- [`39-responsive-composition`](39-responsive-composition.md) — Responsive Composition
- [`77-sequence-and-pacing`](77-sequence-and-pacing.md) — Sequence and Pacing

## Perception & psychology — how people actually look at a design

- [`40-gestalt-principles`](40-gestalt-principles.md) — Gestalt Principles
- [`41-visual-perception`](41-visual-perception.md) — Visual Perception
- [`42-cognitive-load`](42-cognitive-load.md) — Cognitive Load
- [`43-attention-and-eye-tracking`](43-attention-and-eye-tracking.md) — Attention and Eye Tracking
- [`44-design-psychology`](44-design-psychology.md) — Design Psychology
- [`47-cognitive-biases-and-visual-design`](47-cognitive-biases-and-visual-design.md) — Cognitive Biases and Visual Design
- [`76-visual-metaphors-and-symbolism`](76-visual-metaphors-and-symbolism.md) — Visual Metaphors and Symbolism

## Branding & identity — strategy, marks, systems, guidelines

- [`50-brand-strategy`](50-brand-strategy.md) — Brand Strategy
- [`51-brand-positioning`](51-brand-positioning.md) — Brand Positioning
- [`52-visual-identity-systems`](52-visual-identity-systems.md) — Visual Identity Systems
- [`53-logo-construction`](53-logo-construction.md) — Logo Construction
- [`54-logo-types-and-variations`](54-logo-types-and-variations.md) — Logo Types and Variations
- [`55-brand-color-and-typography`](55-brand-color-and-typography.md) — Brand Color and Typography
- [`56-brand-consistency`](56-brand-consistency.md) — Brand Consistency
- [`57-brand-guidelines`](57-brand-guidelines.md) — Brand Guidelines
- [`58-rebranding-and-evolution`](58-rebranding-and-evolution.md) — Rebranding and Evolution

## Illustration — form, line, light, texture, vector production

- [`60-illustration-fundamentals`](60-illustration-fundamentals.md) — Illustration Fundamentals
- [`61-shapes-and-forms`](61-shapes-and-forms.md) — Shapes and Forms
- [`62-linework-and-contours`](62-linework-and-contours.md) — Linework and Contours
- [`63-light-and-shadow`](63-light-and-shadow.md) — Light and Shadow
- [`64-texture-and-patterns`](64-texture-and-patterns.md) — Texture and Patterns
- [`65-character-and-object-design`](65-character-and-object-design.md) — Character and Object Design
- [`66-vector-illustration`](66-vector-illustration.md) — Vector Illustration
- [`67-raster-and-digital-painting`](67-raster-and-digital-painting.md) — Raster and Digital Painting
- [`68-iconography`](68-iconography.md) — Iconography

## Imagery & photography — selection, treatment, compositing

- [`38-cropping-and-framing`](38-cropping-and-framing.md) — Cropping and Framing
- [`69-image-manipulation`](69-image-manipulation.md) — Image Manipulation
- [`70-photography-and-imagery`](70-photography-and-imagery.md) — Photography and Imagery
- [`71-image-composition`](71-image-composition.md) — Image Composition
- [`72-image-treatment`](72-image-treatment.md) — Image Treatment
- [`74-masking-and-blending`](74-masking-and-blending.md) — Masking and Blending
- [`75-visual-effects`](75-visual-effects.md) — Visual Effects

## Print production — color management, bleed, paper, finishing, prepress

- [`80-print-design-fundamentals`](80-print-design-fundamentals.md) — Print Design Fundamentals
- [`81-print-color-management`](81-print-color-management.md) — Print Color Management
- [`82-bleed-trim-and-safe-areas`](82-bleed-trim-and-safe-areas.md) — Bleed, Trim, and Safe Areas
- [`83-resolution-and-raster-formats`](83-resolution-and-raster-formats.md) — Resolution and Raster Formats
- [`84-print-finishing-techniques`](84-print-finishing-techniques.md) — Print Finishing Techniques
- [`85-paper-and-material-selection`](85-paper-and-material-selection.md) — Paper and Material Selection
- [`86-packaging-and-dielines`](86-packaging-and-dielines.md) — Packaging and Dielines
- [`88-binding-and-book-construction`](88-binding-and-book-construction.md) — Binding and Book Construction

## Interface design — systems, components, states, accessibility, data

- [`45-affordances-and-signifiers`](45-affordances-and-signifiers.md) — Affordances and Signifiers
- [`46-information-architecture`](46-information-architecture.md) — Information Architecture
- [`90-ui-design-principles`](90-ui-design-principles.md) — UI Design Principles
- [`91-design-systems`](91-design-systems.md) — Design Systems
- [`92-component-visual-design`](92-component-visual-design.md) — Component Visual Design
- [`93-interface-layout-and-spacing`](93-interface-layout-and-spacing.md) — Interface Layout and Spacing
- [`94-interaction-states`](94-interaction-states.md) — Interaction States
- [`95-responsive-interface-design`](95-responsive-interface-design.md) — Responsive Interface Design
- [`96-data-visualization`](96-data-visualization.md) — Data Visualization
- [`97-dashboard-design`](97-dashboard-design.md) — Dashboard Design
- [`98-web-accessibility`](98-web-accessibility.md) — Web Accessibility
- [`99-interface-consistency`](99-interface-consistency.md) — Interface Consistency
- [`114-design-accessibility-checklist`](114-design-accessibility-checklist.md) — Design Accessibility Checklist

## Design history — movements as usable visual languages

- [`100-design-movements`](100-design-movements.md) — Design Movements
- [`101-bauhaus`](101-bauhaus.md) — Bauhaus
- [`102-swiss-international-style`](102-swiss-international-style.md) — Swiss International Style
- [`103-constructivism`](103-constructivism.md) — Constructivism
- [`104-art-deco`](104-art-deco.md) — Art Deco
- [`105-de-stijl`](105-de-stijl.md) — De Stijl
- [`106-minimalism`](106-minimalism.md) — Minimalism
- [`107-postmodernism`](107-postmodernism.md) — Postmodernism
- [`108-memphis-design`](108-memphis-design.md) — Memphis Design
- [`109-brutalism-and-neobrutalism`](109-brutalism-and-neobrutalism.md) — Brutalism and Neobrutalism
- [`110-retro-and-vintage-design`](110-retro-and-vintage-design.md) — Retro and Vintage Design

## Vector drawing — scene graphs, coordinates, curves, paths, SVG

- [`120-vector-scene-graphs`](120-vector-scene-graphs.md) — Vector Scene Graphs
- [`121-vector-coordinate-systems`](121-vector-coordinate-systems.md) — Vector Coordinate Systems
- [`122-geometric-primitives-and-construction`](122-geometric-primitives-and-construction.md) — Geometric Primitives and Construction
- [`123-spatial-constraints-and-relationships`](123-spatial-constraints-and-relationships.md) — Spatial Constraints and Relationships
- [`124-symmetry-and-transformations`](124-symmetry-and-transformations.md) — Symmetry and Transformations
- [`125-bezier-curves-and-path-construction`](125-bezier-curves-and-path-construction.md) — Bézier Curves and Path Construction
- [`126-vector-boolean-operations-and-composition`](126-vector-boolean-operations-and-composition.md) — Boolean Operations and Composition
- [`127-svg-generation-and-validation`](127-svg-generation-and-validation.md) — SVG Generation and Validation

## Critique, quality & delivery — the gate before anything ships

- [`87-prepress-and-production`](87-prepress-and-production.md) — Prepress and Production
- [`115-export-and-file-formats`](115-export-and-file-formats.md) — Export and File Formats
- [`116-design-handoff`](116-design-handoff.md) — Design Handoff
- [`117-design-documentation`](117-design-documentation.md) — Design Documentation
- [`118-ai-assisted-design`](118-ai-assisted-design.md) — AI-Assisted Design
- [`119-generated-design-artifacts`](119-generated-design-artifacts.md) — Generated Design Artifacts

---

125 rule files. Generated index; edit the rules, not this file.
