# Rule: Color Naming and Reference

**Domain:** color · **ID:** `59-color-naming-and-reference`

## Purpose
Convert the words people use for color — "sage", "coral", "gold", "make it pop" — into
specifications that survive a brief, a handoff, and a press check, and use the history and
associations inside a color name deliberately rather than being surprised by them.

## Definition
Color naming is the link between three things: a **name** (sage, chartreuse, oxblood), a
**coordinate** (hex, CMYK build, PMS, Lab), and a **reference** (a swatch, a photograph, an
object). A name without a coordinate is an intention. A coordinate without a reference is exact
and unmemorable, which is why it gets substituted at the first handoff.

## Core Principles
- A name points; a coordinate specifies. Every approved color carries name, hex, print build, and
  a reference — and the reference is the tie-breaker when two people read the name differently.
- One color has many names. The dictionary lists five or six "other names" per entry: blue is
  also cobalt, navy, indigo, oxford, and royal. Synonyms are the mechanism of miscommunication.
- Names carry an origin and a judgment. Chartreuse takes its name from the monastery liqueur, and
  the name itself has "a bad reputation … referred to as a 'fake' color, like aubergine, named by
  tricky marketing committees" (p. 139). A name can cost a design its approval.
- Names carry an era. Brown and orange were the 1970s; a color pair can age a design before the
  layout does (see `110-retro-and-vintage-design`).
- Materials masquerade as colors. Metallic gold, fluorescent yellow, and neon are inks and
  finishes, not hex values: gold on uncoated stock "will appear brown", and CMYK "cannot replicate
  true metallic colors" (p. 245).
- Culture changes the reading. Brown is the color of mourning in India and of Thanksgiving in the
  United States; the same name inverts across markets (see `12-color-psychology`).
- Even a printed swatch is an approximation: the book's own note says the four-color process
  shifts every patch slightly. Agree on the coordinate, then proof on the substrate.

## Techniques
1. **Keep a palette table with five columns** — role, name, hex, print build, reference. One row
   per color; no color enters a file before it has a row.
2. **Run the three-name test** — the client's word, the dictionary's "other names", and the trade
   name (PMS). Where they disagree, show two swatches side by side and have the client choose a
   coordinate, not a word.
3. **Pair every adjective with a number** — "warm", "dusty", "vibrant", and "muted" are directions,
   not values. Give the adjective plus a hex plus a reference image in the same sentence.
4. **Check the material before the mood** — if the word implies a material (gold, pearl, neon,
   chrome), write ink, stock, and finish, and price the foil before approving the proof. A metallic
   that is not budgeted becomes a brown stamp.
5. **Name for two audiences** — tokens by role for the system (`surface-raised`,
   `accent-600`), evocative names for the client story ("Kiln Red"). Never use the story
   name in code or the token name in a pitch.
6. **Run a cultural pass** — check the color and the name in the audience's market before the
   name goes into a guideline; a color that reads premium in one market can read mourning in
   another.

## When to Use
- Every brief that arrives with a color word in it, which is most of them.
- Building brand guidelines, design tokens, or a palette document where someone else will reproduce
  the color.
- Print work that involves spot inks, metallic, fluorescent, or a brand color that must match
  across substrates.

## When to Avoid
- Do not build a naming ceremony for a one-off exploration; a hex in the layer name is enough.
- Do not let vocabulary replace judgment: naming a color well does not make it the right color
  (see `19-color-in-context`).
- Avoid proprietary names ("Tiffany blue", "Cadbury purple") in deliverables and tokens; describe
  the color and give the coordinate.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| Approving "teal" with no number | Two people, two teals, one reprint | Name plus hex plus print build |
| Naming tokens by appearance | `sage-300` dies in dark mode and in a rebrand | Role names, appearance names only in the story |
| Approving a metallic from an RGB proof | Screen simulates a shine the press cannot make | Foil or metallic ink, proofed on stock |
| Using "gold" for a CMYK build | It prints brown on uncoated stock | Specify the ink and the substrate, or drop the word |
| Assuming a name means one color across markets | The association inverts, sometimes badly | Cultural pass before the guideline is signed |
| Naming a color after a competitor | Trademark exposure and free positioning for them | Descriptive name plus coordinate |

## Practical Examples
A skincare client asks for "sage green". The palette table gets one row: role `accent`,
name "Sage 02", hex `#8A9A7B`, print build C45 M20 Y45 K10, PMS 5773, reference a dried
sage leaf photograph.

The neighbor test settles the argument: on the warm white `#F4F1EA` the color reads
herbal and calm; on pure `#FFFFFF` the same hex reads grey and slightly dirty, so the
pack is specified on the warm stock. The cap is soft-touch plastic, so "sage" there is a
Pantone-matched masterbatch, not a CMYK build, and the foil-blocked logo is priced as a separate
line rather than implied by the word "gold".

## Related Rules
- [`10-color-theory`](10-color-theory.md) — hue, value, and chroma behind the word.
- [`12-color-psychology`](12-color-psychology.md) — the learned and cultural associations a name carries.
- [`15-color-systems-and-models`](15-color-systems-and-models.md) — why a hex is a coordinate in one space, not a color.
- [`16-palette-construction`](16-palette-construction.md) — the palette the table documents.
- [`19-color-in-context`](19-color-in-context.md) — how the neighbor changes what the name reads as.
- [`57-brand-guidelines`](57-brand-guidelines.md) — where the naming discipline is published.

## Sources
- Adams, *The Designer's Dictionary of Color*, "Chartreuse", p. 139 — the liqueur origin, the "fake color" reputation, and the role of a name in acceptance.
- Adams, *The Designer's Dictionary of Color*, "Blue", p. 129 — five other names for one color, and the corporate default of blue.
- Adams, *The Designer's Dictionary of Color*, "Brown", p. 209 — the 1970s brown-and-orange pairing and mourning in India.
- Adams, *The Designer's Dictionary of Color*, "Metallic", p. 245 — gold on uncoated stock reads brown; foil is required for shine.
- Adams, *The Designer's Dictionary of Color*, "Color Range" plates, pp. 224, 242, 252 — CMYK cannot replicate fluorescent or metallic colors.
