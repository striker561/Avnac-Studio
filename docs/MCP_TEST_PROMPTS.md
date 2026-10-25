# MCP Test Prompt Suite

Practical, real-world prompts for testing the Avnac Studio MCP server end to end. Written for connecting an MCP client (Cursor, Claude Desktop, MCPJam Inspector, Windsurf, etc.) to the server described in [MCP_GUIDE.md](./MCP_GUIDE.md) and pasting each prompt as a user message.

## How to use this file

1. Launch Avnac Studio, enable **Settings → MCP server**, and open (or create) a canvas in the editor first — tools are executed by the running app, so an open canvas is required.
2. Connect your MCP client to the **connect URL shown in Settings** (Streamable HTTP, recommended) with header `Authorization: Bearer <token from Settings>`; SSE clients can append `/sse`.
3. Paste one prompt at a time, watch the canvas, and finish each prompt with a visual check (the agent should call `get_canvas_image` on its own — all prompts in Category A–C instruct it to).

**Legend:**
- ✅ — exercises the fully-working tool path (`create_canvas`, `apply_artboard_preset`, `set_background`, `render_elements`, `modify_elements`, `get_canvas_summary`, `get_object_properties`, `get_canvas_image`, `search_unsplash`, `list_stickers`, `get_font_list`, `clear_canvas`, `delete_object`, `select_objects`).
- ⚠️ — probe: deliberately exercises tools/properties that are only partially wired up today. Each probe lists the expected observation so you can distinguish "server works" from "feature not implemented". See the [Known gaps](#known-gaps-appendix) appendix for the full list.

---

## Category A — Real-world design briefs (happy path) ✅

These are written the way a real user talks: subject + size + style emphasis + imagery hints. Each forces a multi-element composition (background, shape panels, text hierarchy, photo/sticker) and a visual audit, so they exercise the whole reliable pipeline in one go.

### A1. LinkedIn company banner (food delivery)
> Design a professional LinkedIn company banner for "SwiftBites", a food delivery company, with emphasis on speed and freshness. Use the LinkedIn share size (1200x627). Warm cream background, a deep green rounded accent panel on the left with the company name in bold, and a tagline like "Farm-fresh meals in 20 minutes". Search Unsplash for a vibrant salad or courier-on-bike photo and place it in a rounded frame on the right. Keep generous margins, then screenshot the result and check the contrast.

Exercises: `apply_artboard_preset` (`linkedin`), `set_background`, `search_unsplash`, `render_elements`, `get_canvas_image`.

### A2. Instagram post (coffee shop launch)
> Create an Instagram square post announcing the grand opening of "Kettle & Crumb", a specialty coffee shop, this Saturday at 9 AM. 1080x1080. Cozy mocha-brown palette with a cream text panel, a big bold headline "GRAND OPENING", the date and time as a subheadline, and "First 50 customers get a free flat white" as small body text. Add a soft shadow on the text panel and search Unsplash for a latte-art photo as the hero image. Verify the layout visually when done.

Exercises: `create_canvas` (1080x1080), shadow styling, text hierarchy, `search_unsplash`.

### A3. Instagram story (flash sale)
> Design a 1080x1920 Instagram story for a 24-hour flash sale at "Volt Athletics", a gym gear brand. Electric violet background, a huge "-40%" headline centered vertically, "SITE-WIDE FLASH SALE" above it, "Ends tonight at midnight" as a pill badge below, and a rotated star accent behind the discount. Story format must be safe for the top and bottom UI zones — keep 250px clear at the top and bottom. Screenshot it to confirm nothing sits in the unsafe zones.

Exercises: `apply_artboard_preset` (`ig-story`), star geometry, rotation, badge shapes, margin discipline.

### A4. YouTube thumbnail (tech review)
> Make a YouTube thumbnail for a tech review video titled "I Tested 5 Budget Laptops". 1280x720. High-contrast dark slate background, the word "5" oversized in a bright coral circle, the rest of the title in two lines of bold white text on the left, and room on the right for a photo — grab a laptop photo from Unsplash. Big shapes, high contrast, readable at small size. Render a screenshot to judge readability.

Exercises: `apply_artboard_preset` (`youtube-thumb`), ellipse + text composition, contrast judgment via `get_canvas_image`.

### A5. X/Twitter post (developer conference)
> Design a 1200x675 X post for "DevCon 2026", a developer conference, announcing that the CFP (call for papers) is open. Dark navy background with a subtle indigo-to-violet feel (use two overlapping translucent rounded rectangles for depth). Headline "Call for Papers is OPEN", subtext "Submit your talk by October 15", and a small footer "devcon.io • Lisbon & online". Minimal, modern, engineering-audience aesthetic. Inspect the result visually.

Exercises: `apply_artboard_preset` (`twitter-post`), translucent overlay panels, footer typography.

### A6. Podcast cover art
> Design podcast cover art for "Night Shift", a true-crime podcast. 1080x1080, must read clearly at thumbnail size. Near-black background, the title huge in a condensed-feeling white serif (try Playfair Display), a thin gold divider line under the title, and a muted dark-red translucent circle bleeding off the bottom-right corner as atmosphere. No photos — pure typography and geometry. Screenshot to check it reads at a glance.

Exercises: `create_canvas`, line elements, translucent shapes, typography-only hierarchy.

### A7. Webinar slide
> Create a 1920x1080 slide for a webinar called "Shipping Rust in Production". Corporate-clean: white background, a slim teal top bar with the webinar title in dark text, the speaker "Dana Okafor • Staff Engineer" as a subheadline, the date "Oct 8, 2026 • 2 PM UTC" as body text, and a light gray rounded panel on the right listing three bullet lines ("Why Rust", "Migration story", "Live Q&A"). Audit the margins and alignment with a screenshot.

Exercises: `apply_artboard_preset` (`hd`), panel + list composition, light-theme contrast.

### A8. Event poster (community meetup)
> Design an A4 poster for "Plant Swap Sunday", a community gardening meetup. Use the A4 print preset at 300dpi. Sage-green background, a big botanical feel: search Unsplash for a monstera or fiddle-leaf photo and blend it in behind a semi-transparent white card that carries the details — "Sunday Oct 12", "Riverside Park, 10 AM", "Bring a cutting, take a friend". Headline in a friendly rounded font like Poppins. Check the visual balance when done.

Exercises: `apply_artboard_preset` (`a4-300`), photo behind translucent card, `search_unsplash`.

### A9. Quote card
> Make a square quote card (1080x1080) with the quote "Discipline is choosing between what you want now and what you want most." attributed to Abraham Lincoln. Deep charcoal background, the quote in elegant italic-feeling serif white text broken across three lines, oversized decorative quotation marks as text elements, and the attribution small in gold. Centered composition. Screenshot to verify the line breaks look intentional.

Exercises: text-only composition, multi-line sizing judgment, decorative accents.

### A10. Recipe card
> Design a recipe card for "Weeknight Garlic Butter Pasta". 1080x1350 portrait (Instagram portrait). Warm off-white background, a title header band in tomato red, an ingredients list as 6 small text lines inside a rounded panel, and 3 numbered steps. Search Unsplash for a garlic-pasta photo and place it at the top in a soft-cornered frame. Keep everything readable like a real printable recipe card.

Exercises: `apply_artboard_preset` (`ig-portrait`), list layout inside panels, photo framing.

### A11. Birthday card
> Create a fun birthday card, 1080x1080: "Happy 30th, Maya!". Bright sunny yellow background, playful confetti made from 10+ small rotated squares and circles in complementary colors scattered around the edges, the name in huge bold letters, and "Thirty, flirty, and thriving" as a cheeky subline. Add the donut sticker near the headline. Screenshot to make sure the confetti doesn't overlap the text.

Exercises: many-element `render_elements`, rotation, `list_stickers` + sticker element, playful composition.

### A12. Desktop wallpaper (motivational)
> Design a 1920x1080 motivational desktop wallpaper. Moody deep-teal gradient feel (layer two large translucent ellipses over a dark background), the phrase "Build in silence." as a large centered headline in white, "Let the results talk." small underneath in muted gray, and a thin horizontal accent line between them. Ultra-minimal. Verify visually that it feels calm, not cluttered.

Exercises: `apply_artboard_preset` (`hd`), atmosphere via translucent shapes, minimalist centering.

---

## Category B — Element & feature coverage ✅

One focused prompt per feature family. Each isolates a capability so a failure points at a specific element type or property.

### B1. Text hierarchy only
> Create a 1080x1080 canvas with a plain white background and add nothing but text: a 72px headline "Typography", a 32px subheadline in a different Google Font, and three 16px body lines, stacked with consistent 40px gaps. Then screenshot it and fix any vertical centering issues with modify_elements.

Isolates: `fontSize`, `fontFamily`, text default styling.

### B2. Polygon & star geometry
> On a fresh 1080x1080 dark canvas, render a row of shapes: a 3-side triangle, a 5-side pentagon, a 6-side hexagon, an 8-side octagon, a 5-point star, and a 12-point starburst, all the same size and evenly spaced by eye. Give each a different solid color. Screenshot and confirm all shapes rendered (no silent skips).

Isolates: `sides` on polygon/star, star inner-radius default.

### B3. Lines & dividers
> Design a minimal certificate 1920x1080: title "Certificate of Completion", a horizontal divider line under it, a two-column layout of text blocks separated by a vertical line, and a thin border frame made of 4 lines around the whole artboard. Use stroke widths of different thicknesses (thin 2px inner, thick 8px accents).

Isolates: `line` elements with `x1/y1/x2/y2`, stroke width behavior.

### B4. Photo-centric (Unsplash)
> Search Unsplash for "misty mountain sunrise", pick the sharpest landscape photo, and design a travel-magazine cover 1080x1350 around it: full-bleed photo, a dark translucent panel across the lower third, "WANDER" as a huge white headline, "The quiet season: why autumn is the best time to hike" as subtext, and a small "Issue 12" corner badge. Verify the panel keeps the text readable.

Isolates: `search_unsplash` → `image` element pipeline, overlay readability.

### B5. Sticker-centric
> Make a playful 1080x1080 sticker collage promoting "Sweet Route", a dessert delivery app. First call list_stickers, then build a composition using at least three of them at different sizes and rotations around a centered app-name headline on a soft pink background. Check with a screenshot that the stickers actually loaded (they should not appear as broken/empty boxes).

Isolates: `list_stickers`, `sticker` element type, sticker sizing.

### B6. Shadows, opacity & rotation
> Create a 1080x1080 canvas showing a "card deck": five rounded white rectangles stacked with slight offsets and rotations (like fanned cards), each with a soft drop shadow and slightly different opacity, on a muted blue background. The top card should read "Design System v2" in dark text. Screenshot to confirm the depth effect reads well.

Isolates: `shadow`, `opacity`, `rotation` on rects.

### B7. Corner-radius image cards
> Design a features section 1920x1080 for a SaaS landing page: three equal rounded image cards in a row (search Unsplash for "team collaboration", "code on screen", "customer support"), each with a 24px corner radius, a title under it ("Collaborate", "Automate", "Support"), and a one-line description. Keep consistent spacing by eye. Verify alignment with an annotated screenshot.

Isolates: `cornerRadius` on images, repeated consistent layout, `get_canvas_image` with `annotated: true`.

### B8. Property aliases
> Render a test composition where you deliberately use the alternate property names everywhere: `x`/`y` instead of left/top, `color` instead of fill, `rotation` instead of angle, and `radius` instead of cornerRadius. Three shapes and one text element. Then call get_object_properties on one of them and confirm the values landed correctly.

Isolates: alias acceptance (`x/y`, `color`, `rotation`, `radius`) documented for MCP agents.

---

## Category C — Multi-step edit workflows ✅

Two-session scenarios: create something first, then apply the edit prompt. These test `modify_elements`, inspection tools, and the audit loop rather than one-shot creation.

### C1. Dark-mode restyle
> (After building A7, the webinar slide) Restyle this slide to dark mode: near-black background, the top bar becomes a deep teal, all text flips to white or light gray, and the right panel becomes a dark gray card. Keep the layout identical — colors only. Screenshot before finishing to confirm no text is now unreadable.

Exercises: `get_canvas_summary` → map IDs → batch `modify_elements` fill changes, `set_background`.

### C2. Recenter & resize the headline
> (After building A6, the podcast cover) The title feels small and slightly off-center. Inspect the canvas, then make the headline 30% bigger, center it horizontally on the artboard, and nudge the gold divider to sit evenly under it again. Confirm with a screenshot that the composition is balanced.

Exercises: `get_canvas_summary`/`get_object_properties`, geometry-only `modify_elements`, visual verification.

### C3. Background swap with contrast fix
> Swap the canvas background to a saturated cobalt blue, then audit every text element for contrast and adjust any fills that clash (for example, flip dark text to white). Do not move anything.

Exercises: `set_background`, contrast audit, selective `modify_elements`.

### C4. Inspect-then-fix single object
> Look at object properties for each text element one by one, tell me their exact positions and sizes, then decide which one is misplaced relative to the others and correct it. Show your reasoning briefly before applying the fix.

Exercises: `get_object_properties` round-trip, reasoning over coordinates, targeted fix.

### C5. Annotated visual audit loop
> Take an annotated screenshot with bounding boxes, identify the element that overlaps another or breaks the margins the most, fix it, then take another annotated screenshot to prove the fix. Repeat at most twice.

Exercises: `get_canvas_image` (`annotated: true`), audit → fix → re-verify loop.

### C6. Iterate a composition
> Add a subtitle under the main headline, delete the least important decorative element you find, then select the headline and screenshot just that object (not the whole canvas) to inspect it up close.

Exercises: `render_elements` (add), `delete_object`, `select_objects`, `get_canvas_image` with `objectId`.

---

## Category D — Registered MCP prompts ✅

These test the server's built-in prompts themselves (`design-graphic`, `edit-canvas`, `design-audit` — defined in `avnac-system/mcp/prompts.go`). Invoke them from your MCP client's prompt UI, fill the arguments, and run the resulting prompt. What's under test is the server-side prompt text and whether an agent can follow it with the real tools.

### D1. design-graphic — full argument set
> Invoke the `design-graphic` prompt with topic: "Album cover for 'Neon Corridor', a synthwave band", dimensions: "1080x1080", style: "dark cyberpunk with neon pink and cyan".

Expected: the returned prompt text walks the agent through the 6-step workflow (summary → canvas → background → assets → composition → audit), and the agent produces a coherent synthwave cover.

### D2. design-graphic — minimal arguments
> Invoke the `design-graphic` prompt with only topic: "Grand opening flyer for a ramen shop".

Expected: the prompt fills defaults ("1080x1080 (Square)", "modern bold") and the design still lands — tests the default handling in the prompt template.

### D3. design-graphic — non-square dimensions string
> Invoke the `design-graphic` prompt with topic: "Webinar banner for an AI in healthcare talk", dimensions: "1920x1080", style: "clean corporate".

Expected: the agent translates the "1920x1080" dimension string into `create_canvas` or the `hd` preset correctly.

### D4. edit-canvas — restyling instruction
> (With any populated canvas) Invoke the `edit-canvas` prompt with instruction: "Change the color scheme to dark mode and center the title".

Expected: the prompt tells the agent to inspect with `get_canvas_summary`, map object IDs, and apply `modify_elements` — not to re-render everything from scratch.

### D5. edit-canvas — layout instruction
> Invoke the `edit-canvas` prompt with instruction: "Make the headline twice as large and move it to the upper third of the canvas".

Expected: targeted geometry edits to the existing headline node only.

### D6. design-audit
> Invoke the `design-audit` prompt on the current canvas.

Expected: the agent reads the summary, takes an annotated screenshot, and critiques balance, typography hierarchy, contrast, and margins — then offers (or applies) concrete fixes.

---

## Category E — Probes for partially-wired tools ⚠️

Each probe states the expected observation on the current build. These are for verification and development, not demos — most will expose gaps, and that is the point.

### E1. list_objects / get_selection timeout
> List all the objects on the canvas with their IDs and types.

Expected: the agent calls `list_objects`; the call **times out after ~5s** (the tool exists in `tools.go` but no frontend handler answers it). The agent should recover by using `get_canvas_summary` instead — a good test of agent resilience too.

### E2. align / distribute / group / fit are no-ops
> Center all the elements on the canvas horizontally, distribute them evenly, group them, and scale the selection to fit the artboard with 40px padding.

Expected: the tools return "requested" but **nothing visibly changes** — the frontend does not implement `align_objects`, `distribute_objects`, `group_objects`, `ungroup_objects`, or `fit_to_artboard`. A well-behaved agent may fall back to computing positions itself via `modify_elements` (e.g. setting `x` per element); observe whether it does.

### E3. export_png / export_object produce nothing
> Export the canvas as a PNG at 2x scale, and also export just the headline text as SVG.

Expected: the tools acknowledge the request, but **no file is saved** — the frontend does not handle `export_png`/`export_object`. Note whether the agent falsely claims success; that is the failure mode worth catching.

### E4. Gradients are silently ignored
> Draw a large rectangle with a linear gradient from indigo (#6366f1) to pink (#ec4899) using gradientStops, at a 45-degree gradientAngle.

Expected: the rectangle renders **with a solid fill** (likely indigo) — `gradientStops`/`gradientAngle` pass schema validation but the frontend ignores them. The MCP guide's mention of gradients overstates current support.

### E5. Z-order action is ignored
> Draw a red circle, then a blue square overlapping it, then use modify_elements with action "bringToFront" on the circle so it appears above the square.

Expected: the modification is accepted but **the z-order does not change** — `action` is in the `modify_elements` schema and advertised in the tool description, but unhandled in the frontend. Reorder only happens via `render_elements` array order at creation time.

### E6. Text weight/alignment are not settable
> Add a headline and make it bold and center-aligned.

Expected: the agent sets `fontWeight`/`align` (or reports it cannot) — these properties are **not in the element schema**, and the frontend hardcodes regular weight, left alignment. Watch whether the agent invents parameters or honestly reports the limitation.

### E7. Polygon side clamps
> Render two polygons: one with 2 sides and one with 50 sides.

Expected: both render as **3–32-gons per the frontend clamp** — 2 sides likely becomes 3 (triangle), 50 becomes 32. The server instructions say 3–8, the schema says nothing; only the frontend clamps. Also try a star with 30 points (clamps to 24).

### E8. Unknown sticker name
> Add a sticker named "rocket".

Expected: either the agent first calls `list_stickers` and picks a real name (good behavior), or the render **silently skips the element** — unknown stickers load `/stickers/rocket.webp`, which doesn't exist.

### E9. delete_object without an objectId
> Select nothing in particular, then just delete whatever is currently selected.

Expected: `delete_object` without `objectId` **does nothing** — the schema permits omitting it and the doc comment says "omits = delete current selection", but the frontend only acts when an `objectId` is present (and `get_selection` has no handler to even see the selection).

### E10. Canvas name is accepted but unused
> Create a canvas named "Campaign Q4" at 1080x1080, then check whether the file/workspace name actually changed.

Expected: `create_canvas` accepts `name` without error but **the name has no effect** on the workspace/file title.

---

## Known gaps appendix

Status of advertised-but-not-fully-working surface, as of 2026-10-06 (re-verified against `avnac-system/mcp/tools.go` and the frontend handler in `frontend/src/features/scene-editor/use-mcp-actions.ts` after the listener split). An earlier version of this table (2026-09-22) predated the sync request/response work (`emitSync`); most frontend-side gaps from that version are resolved. Re-run Category E probes after code changes and update this table.

| Tool / property | Advertised | Actual behavior |
|---|---|---|
| `list_objects`, `get_selection` | Request/response tools | ✅ Works (sync responses) |
| `align_objects`, `distribute_objects`, `group_objects`, `ungroup_objects`, `fit_to_artboard` | Applied to selection | ✅ Works (applied via `applyCommands`) |
| `export_png`, `export_object` | Image export | ✅ Works (returns base64 PNG content) |
| `render_elements`/`modify_elements` `gradientStops`/`gradientAngle` | Gradients | ✅ Works (solid + gradient paints) |
| text `fontWeight`, `align`, `lineHeight`, `underline` | — | ✅ Settable via MCP |
| `line` `strokeWidth` | Border width | ✅ Driven by `strokeWidth` (falls back to 2) |
| `create_canvas` `name` | Canvas name | ✅ Persisted with the document |
| `delete_object` without `objectId` | Deletes selection | ✅ Deletes the current selection |
| `modify_elements` `action` (bringToFront etc.) | Z-order changes | ❌ Ignored by frontend |
| `modify_elements` `scaleX`/`scaleY`, `locked`, `type` | Schema fields | ❌ Ignored by frontend |
| `search_unsplash` | Works Go-side | Requires an Unsplash API key in Settings; empty query returns empty results |
