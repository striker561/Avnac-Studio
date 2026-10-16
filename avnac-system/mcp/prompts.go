package mcp

import (
	"context"
	"fmt"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// RegisterPrompts registers built-in MCP prompts for AI design agents.
func (m *AvnacMCP) RegisterPrompts() {
	// Prompt 1: design-graphic
	m.server.AddPrompt(&mcp.Prompt{
		Name:        "design-graphic",
		Description: "Comprehensive workflow guide to create a professional graphic, banner, or poster in Avnac Studio",
		Arguments: []*mcp.PromptArgument{
			{
				Name:        "topic",
				Description: "What to design (e.g., 'Summer Music Festival Flyer', 'AI SaaS Product Launch Banner')",
				Required:    true,
			},
			{
				Name:        "dimensions",
				Description: "Canvas size (e.g., '1080x1080' for Instagram, '1920x1080' for Landscape/YouTube, '800x1200' for Poster)",
				Required:    false,
			},
			{
				Name:        "style",
				Description: "Aesthetic style (e.g., 'bold minimalist', 'dark cyberpunk', 'warm corporate', 'playful pastel')",
				Required:    false,
			},
		},
	}, func(ctx context.Context, req *mcp.GetPromptRequest) (*mcp.GetPromptResult, error) {
		topic := req.Params.Arguments["topic"]
		dimensions := req.Params.Arguments["dimensions"]
		if dimensions == "" {
			dimensions = "1080x1080 (Square)"
		}
		style := req.Params.Arguments["style"]
		if style == "" {
			style = "modern bold"
		}

		promptText := fmt.Sprintf(`You are the Avnac Studio AI Design Director.
Your task is to design a high-quality visual for: "%s".
Target Canvas: %s | Style Aesthetic: %s.

Follow this systematic 6-step design workflow:
1. DESIGN BRIEF (before any tool call):
   - Extract known constraints from the request: dimensions, exact copy, brand names, dates, palette, imagery.
   - If critical info is missing (real text content, names, dates, size intent), ask up to 3 targeted questions and STOP. Otherwise state your assumptions explicitly.
   - Write a compact design plan: layout zones with approximate coordinates, type hierarchy, palette, fonts, asset needs. Step 6 verifies the render against this brief.

2. CANVAS SETUP:
   - Check existing state with get_canvas_summary.
   - If empty or sizing differs, call create_canvas with appropriate width & height (e.g. 1080x1080), a cohesive background color, and a descriptive name.
   - create_canvas already applies backgroundColor — do not call set_background again with the same value.

3. ASSETS & IMAGERY:
   - If photographic assets enhance the concept, call search_unsplash with keywords related to "%s".
   - Pick the most relevant image URL from the results.

4. COMPOSITION & LAYERING (render_elements):
   - Background Elements: Background overlay panels, geometric cards, or accent shapes with subtle opacity (0.1 - 0.9) and cornerRadius.
   - Photography: If using an Unsplash image, position it prominently with appropriate width/height.
   - Typography Hierarchy:
     * Headline: Big and bold (fontSize 48-72px, bold weight/contrast color, top area).
     * Subheadline / Tagline: Medium (fontSize 24-32px, complementary color).
     * Details / Body / Call to Action: Smaller (fontSize 16-20px, high legibility).
     * Prefer 'Poppins', 'Inter', and 'DM Serif Display' (call get_font_list if needed); other Google Fonts may fall back if not yet loaded.
   - Accents & Badges: Pill badges for dates/categories, decorative lines, or stickers (call list_stickers to see options).
   - Keep comfortable padding/margins (at least 40-80px from canvas edges); use align_objects or group_objects to unify components.

5. RENDER & VISUAL AUDIT:
   - Call get_canvas_image to render and inspect the completed design.
   - Check readability, contrast between text and background, and balanced whitespace.

6. VERIFY AGAINST THE BRIEF:
   - Compare the screenshot to the design brief AND the user's original request, item by item: required content present and spelled correctly, dimensions, hierarchy, palette, style, no unintended placeholder text.
   - If something mismatches, fix it with modify_elements, take one more screenshot, then report an honest pass/fail per requirement. Explicitly flag any content you invented.

Begin with the design brief, then inspect the canvas with get_canvas_summary or create the canvas!`, topic, dimensions, style, topic)

		return &mcp.GetPromptResult{
			Description: fmt.Sprintf("Design instructions for %s", topic),
			Messages: []*mcp.PromptMessage{
				{
					Role:    "user",
					Content: &mcp.TextContent{Text: promptText},
				},
			},
		}, nil
	})

	// Prompt 2: edit-canvas
	m.server.AddPrompt(&mcp.Prompt{
		Name:        "edit-canvas",
		Description: "Inspect current canvas elements and apply targeted edits, restyling, or layout adjustments",
		Arguments: []*mcp.PromptArgument{
			{
				Name:        "instruction",
				Description: "What modifications to make (e.g. 'Switch to dark mode with neon accents', 'Center-align the title group')",
				Required:    true,
			},
		},
	}, func(ctx context.Context, req *mcp.GetPromptRequest) (*mcp.GetPromptResult, error) {
		instruction := req.Params.Arguments["instruction"]

		promptText := fmt.Sprintf(`You are tasked with editing the active Avnac Studio design canvas.
Requested Changes: "%s".

Workflow:
0. BRIEF: Write a diff-oriented plan first — what changes, what stays. If the target file is not the currently open canvas, call list_files and then open_canvas(fileId) to load it. NEVER recreate an existing design in a new file.
1. Call get_canvas_summary to see all existing elements, their objectIds, types, positions, colors, and text contents.
2. Formulate your update plan:
   - Identify which element IDs need modifications (text, fill, size, position, z-index).
   - Identify if any elements need to be added (render_elements) or removed (delete_object).
3. Apply updates using modify_elements:
   - Pass an array of modifications with each target objectId.
   - To reorder layers: use action: "bringToFront", "sendToBack", "bringForward", or "sendBackwards".
   - To update styling: provide new fill, color, fontSize, opacity, shadows, or gradients.
4. If background needs changing, call set_background.
5. Verify your changes with get_canvas_image, comparing the result to the requested changes item by item. Fix mismatches once with modify_elements, re-screenshot, then report an honest pass/fail per requested change.`, instruction)

		return &mcp.GetPromptResult{
			Description: "Edit existing canvas elements",
			Messages: []*mcp.PromptMessage{
				{
					Role:    "user",
					Content: &mcp.TextContent{Text: promptText},
				},
			},
		}, nil
	})

	// Prompt 3: design-audit
	m.server.AddPrompt(&mcp.Prompt{
		Name:        "design-audit",
		Description: "Perform an automated visual & semantic design critique of the current canvas",
		Arguments:   []*mcp.PromptArgument{},
	}, func(ctx context.Context, req *mcp.GetPromptRequest) (*mcp.GetPromptResult, error) {
		promptText := `Perform a design review of the current canvas in Avnac Studio:
1. Call get_canvas_summary to read the layout hierarchy and element structure.
2. Call get_canvas_image with annotated=true to inspect object bounding boxes and spatial distribution.
3. Evaluate:
   - Intent Match: Does the design actually represent what was requested? List each requirement and mark it met or unmet.
   - Visual Balance: Is the weight distributed evenly across the artboard?
   - Typography: Is there clear contrast between headline, subhead, and body? Are font choices cohesive and actually rendered (no fallback glyphs)?
   - Contrast & Accessibility: Is text clearly readable over background colors or photographic textures?
   - Alignment & Spacing: Are elements properly aligned? Are margins sufficient (not crammed against borders)?
4. Fix the most impactful mismatches once using modify_elements and align_objects, take one more screenshot, then report an honest pass/fail per requirement — flagging any placeholder content you had to invent.`

		return &mcp.GetPromptResult{
			Description: "Audit canvas design quality and layout balance",
			Messages: []*mcp.PromptMessage{
				{
					Role:    "user",
					Content: &mcp.TextContent{Text: promptText},
				},
			},
		}, nil
	})
}
