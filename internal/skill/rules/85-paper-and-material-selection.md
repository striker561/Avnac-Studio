# Rule: Paper and Material Selection

**Domain:** print · **ID:** `85-paper-and-material-selection`

## Purpose
Turn a concept into a specified sheet — grammage, caliper, surface, opacity, shade — with numbers a
printer can quote. Stock is the largest single lever on how a piece feels, and it silently changes
every color on the page, so it is chosen before the artwork is finalized.

## Definition
Paper is specified by grammage (g/m², mass of one square meter), caliper (thickness in mm or µm),
surface (uncoated, matte, silk, gloss, textured), opacity (show-through resistance) and shade
(blue-white, warm white, natural). Board, corrugated and synthetic sheets follow the same logic,
with thickness given in µm or flute profiles.

## Core Principles
- Grammage is not thickness. 300 g/m² coated board is about 0.35 mm; 300 g/m² uncoated text is about
  0.45 mm because it bulks. Ask for caliper when folds, postage or box fit depend on it.
- Match weight to handling: 90–120 g/m² for text pages, 130–170 g/m² for brochure covers and
  hand-held posters, 250–350 g/m² for cards, 350–450 g/m² for business cards and packaging board.
- Opacity protects the design. A 90 g/m² uncoated sheet is roughly 88–92% opaque, so keep heavy dark
  floods off the reverse of body text below 100 g/m².
- Surface sets dot gain: uncoated 18–25%, silk 12–16%, gloss 8–12%. A 60% tint prints visibly darker
  on uncoated, so proof on the actual stock.
- Shade is a color decision: warm white warms every photograph and fights cool palettes, blue-white
  pushes yellows green. Choose the shade before the palette.

## Techniques
1. **Write the spec line in full** — "350 g/m² matte-coated, 1 side, FSC, 0.42 mm caliper, warm
   white" is quotable; "thick card" is not. Put it in the file header.
2. **Pick stock from the concept's verb** — *read*: 90–120 g/m² uncoated, low glare. *Handled*:
   300–400 g/m² with a mark-resistant surface. *Displayed*: 150–200 g/m² matte against window glare.
3. **Test with a dummy** — print one page at 100% on the candidate sheet and fold it. Digital proofs
   lie about bulk, show-through and crease cracking.
4. **Budget the substrate deliberately** — 130 → 170 g/m² adds 10–20% to paper cost, usually cheaper
   than a finish and more perceptible than one.
5. **Use alternatives that solve a problem** — Yupo or Teslin (100–200 µm) for waterproof menus,
   1.5 mm E-flute for light packaging, 1.5–2.5 mm greyboard for rigid boxes, 45–49 g/m² newsprint
   when disposability is the point.

## When to Use
- At the start of any print job, alongside trim size and before color approval.
- When the brief says "premium", "tactile", "eco" or "should feel substantial".
- When a digital proof and a press proof disagree — the stock is usually the variable.

## When to Avoid
- Don't specify a specialty sheet before checking press minimums and maximum caliper; many presses
  cannot run 600 g/m² or a 0.8 mm synthetic.
- Don't put heavy coverage on lightweight uncoated stock and expect flat results; it cockles.

## Common Mistakes
| Mistake | Why it fails | Fix |
|---|---|---|
| "300 gsm" specified for a card that must fold | Caliper too high for the crease; the fold cracks | 250 g/m² plus a score, or a two-panel design |
| Color approved from a desktop inkjet | Inkjet gain is not press gain | Contract proof on the specified stock |
| Extra-white chosen for a warm palette | The sheet pushes every warm hue toward blue | Natural or cream shade, or rebalance the palette |

## Practical Examples
A 24-page A5 zine, self-cover, 1,000 copies. Text block: 100 g/m² uncoated warm white, 0.12 mm
caliper, ~90% opacity — enough for 22 mm body type on `#F7F3E8` with no show-through. The cover uses
the same sheet printed both sides, keeping the piece on one stock and one make-ready. In Avnac the
page is 148×210 mm plus 3 mm bleed; the spec line reads "A5, 24 pp self-cover, 100 g/m² uncoated warm
white, saddle-stitch, 2 staples".

## Related Rules
- [`84-print-finishing-techniques`](84-print-finishing-techniques.md) — which finishes the chosen surface can actually take.
- [`81-print-color-management`](81-print-color-management.md) — stock and finish determine the profile and the proof.
- [`19-color-in-context`](19-color-in-context.md) — how a substrate's own color shifts everything printed on it.
- [`80-print-design-fundamentals`](80-print-design-fundamentals.md) — the ink-on-paper behavior that grammage modifies.

## Sources
- *Graphic Artists Guild Handbook* — paper is quoted by weight, finish and caliper; a stock change is a change order.
- ISO 536 (grammage) and ISO 534 (thickness and density) — the standards behind g/m² and caliper.
- Pressroom convention — dot gain by surface (uncoated 18–25%, silk 12–16%, gloss 8–12%) in FOGRA control.
