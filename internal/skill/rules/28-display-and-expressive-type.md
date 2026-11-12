# Rule: Display and Expressive Type

**Domain:** typography · **ID:** `28-display-and-expressive-type`

## Purpose
Decide when a headline stops being a caption above a design and becomes the design itself. At
display size the spacing defaults invert, cropping becomes legal, and distortion earns its cost —
or ruins the word. This rule sets the threshold and the budget for each move.

## Definition
Display and expressive type is type set large enough that the glyph silhouette carries the
composition: on screen, roughly cap heights above 40 px (about 60 px type size upward). At that
size a reader perceives counters, stems, and the negative space between letters before they
perceive words, so the type must be composed as an image — balanced as a shape, cropped on
purpose, and given one treatment rather than argued with letter by letter.

## Core Principles
- Size is a decision, not a slider value. A word at 8× body reads as a graphic field; the same
  word at 1.5× reads as an emphasized caption. Choose the regime before you choose the size.
- Display spacing is optical. Letter gaps scale with the em, not with perceived space, so pull
  tracking to −2%…−4% at 100–200 px and −5%…−7% above 200 px; then kern the one or two pairs
  that still gape (AV, To, LY, r.).
- One violation per word. Crop it, or distort it, or layer it — pick one and execute it cleanly.
  Two violations read as a mistake, three read as a broken file.
- Keep one legible instance of every word. If the only appearance of the brand name is the
  cropped, half-bleeding one, the design contains no brand name.
- Flaws scale with the type. A 1 px optical misalignment at 16 px is an 8 px hole at 128 px;
  correct sidebearings and baseline by eye at final size, not by the value in the panel.

## Techniques
1. **Bleed-crop the word** — set the word at 700–900 px on a 1080×1350 canvas with the text
   element at x = −180 to −320 so 25–40% runs past the edge. Keep the first letter's counter
   fully inside; a cut through a counter turns the letter into a blob.
2. **Stack with negative leading** — two or three lines at 0.82–0.9× size as line-height, each
   offset horizontally by 5–8% of the canvas width. The offset reads as a deliberate step only
   when it repeats; a single offset line reads as a slip.
3. **Axis contrast inside one word** — with a variable font, run wght 200 on one syllable and 800
   on the next, or wdth 75 against 125. Put the change on a morpheme boundary or the word looks
   broken in the wrong place.
4. **Distort in one axis** — horizontal condense to 80–88%, or a shear of 8–12°, applied to a
   path copy of the text. Keep the live text underneath at 1% opacity if the file must stay
   editable; never stretch a rasterized word, because interpolation softens the stems.
5. **Set type into the image** — knock the photograph back 30–45% with a solid overlay
   (`#121212` at 40%) or set the type in multiply. Type straight over a busy photo needs a 60%
   scrim or it loses the counters.

## When to Use
- Posters, covers, section dividers, packaging fronts, and event graphics read at 2 m or more.
- When the words are the content: "SOLD OUT", a single numeral, a one-word slogan, a date.
- When the design has one thing to say and the image budget is zero — type is the cheapest
  full-bleed asset available.

## When to Avoid
- Body copy, captions, navigation, legal text, or any block the reader must scan to a decision.
  Expression costs reading speed and there is no version of that trade that pays here.
- Multi-word headlines where each word is new information — a five-word headline set at 8× body
  becomes a wall the reader skips.
- Cropping as a default. On a 320 px-wide screen a 40% crop removes the word, not the edge.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Condensing a full paragraph to fit | Tracking that is right at 200 px is unreadable at 14 px | Condense only the display line; reset tracking per size |
| Three effects on one word (crop + skew + shadow) | Each effect claims intent, so none reads as intent | Keep one, delete two |
| Cropping the only readable word | The design loses its message to gain a shape | Repeat the word small and whole somewhere in the frame |
| Tracking left at default at 300 px | Gaps look like missing letters | Set −5% and re-kern the open pairs |
| Using a text face at 700 px | Text cuts have loose spacing and stubby hairlines | Use a display cut or an optical-size axis pinned high |

## Practical Examples
A 1080×1350 gig poster where the type is the image:

- Canvas `#0E0E0E`. "LOUD" in Inter Black at 720 px, fill `#F2EDE4`, x = −140, y = 180,
  tracking −5%.
- The L's stem is cut at the left edge; the counter of the O stays whole between x 260 and 620
  and is the only fully readable shape — enough to identify the word.
- Date block at 42 px, line-height 0.9, indent x = 260 so its left edge aligns to the O's stem.
- Bottom 120 px: three lines at 16 px, `#8A857D`, +6% tracking, 22 px baseline.

The reader gets a shape in 0.3 s, the date in 2 s, the bill in 6 s. Nothing small carries a
display treatment, which is why the single cropped word still works.

## Related Rules
- [`22-type-anatomy`](22-type-anatomy.md) — counters and terminals decide whether a cropped letter survives.
- [`24-typographic-hierarchy`](24-typographic-hierarchy.md) — where display sits as level one of a ranked system.
- [`26-type-scale-and-proportion`](26-type-scale-and-proportion.md) — the ratio that produces the display step.
- [`36-scale-and-proportion`](36-scale-and-proportion.md) — extreme size jumps as a compositional strategy, not just a type one.
- [`38-cropping-and-framing`](38-cropping-and-framing.md) — crop logic that applies to letterforms as much as to photographs.

## Sources
- Cheng, *Designing Type* — display cuts are drawn with tighter spacing and finer hairlines than text cuts, so a text face set at 720 px needs its tracking rebuilt by eye.
- Müller-Brockmann, *Grid Systems in Graphic Design*, "Body and display faces" — display type is a separate regime with its own spacing and alignment rules.
- Hofmann, *Graphic Design Manual* — the hardware symbol in which a single line forms both the lettering and the object; the model for type that is also the picture.
