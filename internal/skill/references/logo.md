# Logo — reference

Use when designing, revising or testing a mark. Rules:
[`53-logo-construction`](../rules/53-logo-construction.md),
[`54-logo-types-and-variations`](../rules/54-logo-types-and-variations.md),
[`52-visual-identity-systems`](../rules/52-visual-identity-systems.md).

## Types, and what each promises

| Type | What it is | Works when | Fails when |
|---|---|---|---|
| Wordmark | The name, set in type | Name is short, distinctive, pronounceable | Name is long or generic |
| Lettermark | Initials/monogram | Long name in a narrow space | Initials collide with another brand |
| Pictorial mark | Literal object | The object is distinctive and ownable | Object is a cliché (bulb, globe, leaf) |
| Abstract mark | Non-literal form | Brand has no literal object | Nobody remembers it; needs heavy repetition |
| Emblem | Text inside a shape | Heritage, badges, uniform, labels | Needs a separate small-size variant |
| Combination | Mark + wordmark | New brands building recognition | Lockup becomes rigid; plan variations |
| Mascot | Character | Consumer, family, sports | Serious/corporate contexts |

## Construction discipline

1. **Start from a geometry.** Circle, square, triangle, or the letters' own skeleton. Draw on a
   grid at 1:1 scale with the final size in mind.
2. **Optical correction** — curves overshoot flat edges by 1–2%; a circle must be slightly larger
   than an adjacent square to look equal. Verticals look thicker than horizontals at the same
   weight: adjust.
3. **Stroke consistency** — if the mark uses strokes, keep one weight, or taper deliberately and
   consistently. Mixed accidental weights read as sloppy.
4. **Counters and gaps** — minimum gap 1/4 of the stroke width at small sizes, or the mark fills
   in when rasterized.
5. **One idea.** If you need a caption to explain the mark, it is not finished.

## Size ladder (the practical test)

Render the mark at these sizes and judge each one:

| Size | Test |
|---|---|
| 16 px | Digital favicon; only the strongest shapes survive |
| 24 px | UI icon, avatar |
| 32 px | Browser tab, small avatar |
| 48 px | App icon |
| 96 px | Social avatar |
| 200 px | Letterhead, small print |
| 400 px+ | Signage, hero use |

If the mark fails below 32 px, create a simplified variant (drop detail, thicken strokes, cut the
wordmark). Do not simply scale the complex version down.

## Clear space and minimum size

```
clear space = x, where x = the cap height of the wordmark (or 1/2 the mark's height)
minimum print size = width at which the smallest counter is 0.3 mm
minimum digital size = width at which the smallest counter is 1 px at 1× density
```

Publish both numbers in the guidelines; otherwise every vendor invents their own.

## Lockups

| Lockup | Use | Watch |
|---|---|---|
| Horizontal | Default, wide spaces, web header | Long wordmarks; test at 120 px wide |
| Stacked | Square spaces, social avatars, packaging | Line spacing between mark and name |
| Mark only | Favicon, app icon, pattern | Recognition must already exist |
| Reversed | Dark grounds | Do not just invert; re-balance weight |
| One-color | Fax, embossing, single-ink print | Test that it holds without gradients |

Keep the relationship fixed (mark size to type size, gap) — specify it as a ratio, not a picture.

## File set to deliver

| File | Purpose |
|---|---|
| `logo-primary.svg` | Master vector, editable text or outlined pair |
| `logo-primary.eps` / `.pdf` | Print handoff |
| `logo-mark.svg`, `logo-wordmark.svg` | Components for layouts |
| `logo-16.png`, `logo-32.png`, `logo-180.png`, `logo-512.png` | Rasters for web/app |
| `logo-reversed.svg` | Dark-ground version |
| `logo-onecolor.svg` | Single-ink version |
| Brand color values | HEX, RGB, CMYK, Pantone |

Outline a copy for handoff, but keep a live-text master for yourself.

## Failure catalogue

| Failure | Cause | Fix |
|---|---|---|
| Illegible at 16 px | Detail below 1 px | Simplified variant |
| Looks unbalanced | No optical correction | Adjust overshoot, spacing by eye at 100% |
| Disappears on photography | No protective space | Add clear space or a solid lockup |
| Looks generic | Literal cliché or default font | Change the idea, not the styling |
| Breaks in one color | Relies on gradient/color | Design the one-color version first |
| Different every time | No published rules | Write minimum sizes, clear space, lockups |

## Rules

- [`53-logo-construction`](../rules/53-logo-construction.md) — geometry and optical correction.
- [`54-logo-types-and-variations`](../rules/54-logo-types-and-variations.md) — types and lockups.
- [`52-visual-identity-systems`](../rules/52-visual-identity-systems.md) — the system around the mark.
- [`55-brand-color-and-typography`](../rules/55-brand-color-and-typography.md) — brand color and type.
- [`68-iconography`](../rules/68-iconography.md) — small-size discipline that also applies to marks.
- [`57-brand-guidelines`](../rules/57-brand-guidelines.md) — publishing the rules.
