package mcp

import (
	"context"
	"fmt"
	"strings"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"Avnac/internal/skill"
)

// Prompts are the only MCP primitive a human triggers: a client surfaces them
// as slash commands, so the text lands in the conversation even when the model
// would never have looked for it. That guarantee is why they exist.
//
// They deliberately do NOT hand-write a workflow. The design library already
// carries the method (skill://create, skill://edit, skill://critique and the
// rules behind them), and a second copy here would drift — the library's
// Validate() cannot see prompt text, so the copy rot would ship silently.
//
// Each prompt therefore contributes only what the library cannot know:
//
//  1. the user's brief (the prompt arguments),
//  2. the tool mapping for this app (the library is deliberately tool-agnostic),
//  3. the routed workflow body, read from the library at request time,
//  4. the rule URIs that workflow links, so the agent reads rather than guesses,
//  5. the verification gate that closes the loop with a render.
//
// Routing uses the same skill.Plan the rest of the server uses, so a prompt for
// a gig poster routes to the poster workflow and a logo prompt routes to logo.

// defaultCanvasSize is the prompt-level fallback when the caller supplies no
// size. It is deliberately a description, not a number: a poster brief routed to
// the poster workflow must not be told it is 1080 square.
const defaultCanvasSize = "derive from the brief and state the size you choose"

// designTools is the app-specific half of a design prompt: which tools exist.
// It names capabilities only — no ordering, no duplicated workflow steps.
const designTools = "Tools: `get_canvas_summary` to read the canvas and its pages, `canvas` op=create for a new project, " +
	"`canvas` op=add-page (name) to draft/test/vary inside the open project, `canvas` ops go-page/rename-page/delete-page to manage pages, " +
	"`elements` op=render to compose in one batch, `elements` op=measure to check text fit before drawing, " +
	"`elements` op=modify and `arrange` ops align/group to fix, " +
	"`get_canvas_image` to look at the result, `assets` op=unsplash for photography (credit the photographer, and pass `fit: \"cover\"`), " +
	"`assets` ops fonts/stickers when you need the available set."

// oneProjectRule is the page discipline every prompt repeats. The app can hold
// many pages; creating a second canvas for a draft splits the user's project
// and hides the work from the page rail they are watching.
const oneProjectRule = "One project, many pages: never create another canvas for a draft, test, variation or check. " +
	"When a canvas is already open, use `canvas` op=add-page with a descriptive name and switch to it — the app shows the active page live. " +
	"Return to the real page with `canvas` op=go-page, and delete a page you only used for testing."

// auditTools names the two reads an audit starts from.
const auditTools = "Tools: `get_canvas_summary` for structure and text, `get_canvas_image` with annotated=true " +
	"for the visual read, `elements` op=modify for the one corrective pass."

// verifyGate closes every prompt. It is the part the library cannot state,
// because it is about looking at this app's render before reporting.
const verifyGate = "## Before you report\n\n" +
	"Confirm `get_canvas_summary` names the page you meant to edit; if you are on a draft/test page, return to the real page " +
	"with `canvas` op=go-page. Call `get_canvas_image` and compare the render to the brief item by item: required copy present and spelled " +
	"correctly, dimensions, hierarchy, palette, style, and no unintended placeholder text. Fix what mismatches with " +
	"`elements` op=modify, look again, then report an honest pass/fail per requirement. Flag any content you invented."

// fallbackWorkflow is used only if the embedded library fails to load. It keeps
// the prompt useful instead of empty; the server logs the load failure.
const fallbackWorkflow = "No workflow library is available in this build. Work from the server instructions: " +
	"write the brief, set up the canvas, compose in one batch, then inspect the render and fix what fails."

// promptWorkflow renders the routed workflow and the rule reading list into b.
func promptWorkflow(b *strings.Builder, task string) {
	lib, err := skill.Default()
	if err != nil {
		b.WriteString(fallbackWorkflow)
		return
	}
	plan, err := lib.Plan(task, 0)
	if err != nil || plan.Skill == nil {
		b.WriteString(fallbackWorkflow)
		return
	}

	b.WriteString("## Workflow: " + plan.Skill.Name + "\n\n")
	b.WriteString(linkToResource(plan.Skill.Markdown()))

	if len(plan.Rules) > 0 {
		b.WriteString("\n\n## Before composing\n\n")
		b.WriteString("Read the rule resources linked under \"Rules to apply\" above. The workflow tells you what to do; " +
			"the rules carry the thresholds and the reasoning — a design decision you cannot cite is a guess.\n")
	}
}

// designGraphicPrompt is the general creation prompt. dimensions and style are
// optional; the topic drives routing so a poster brief gets the poster workflow.
func designGraphicPrompt(topic, dimensions, style string) string {
	if strings.TrimSpace(topic) == "" {
		topic = "a graphic for the user's request"
	}
	if strings.TrimSpace(dimensions) == "" {
		dimensions = defaultCanvasSize
	}
	style = strings.TrimSpace(style)
	if style == "" {
		style = "choose one and state it"
	}

	// Route on the brief alone. Style adjectives ("dark", "clean", "modern") are
	// common in skill bodies and would outvote the deliverable in a rare-token
	// scorer; the style still reaches the model in the header below.
	task := topic

	var b strings.Builder
	b.WriteString("You are the Avnac Studio AI Design Director.\n\n")
	b.WriteString("Design: " + topic + "\n")
	b.WriteString("Canvas: " + dimensions + " | Style: " + style + "\n\n")
	b.WriteString(designTools + "\n\n")
	b.WriteString(oneProjectRule + "\n\n")
	promptWorkflow(&b, task)
	b.WriteString("\n\n" + verifyGate)
	return b.String()
}

// editCanvasPrompt is the revision prompt. The instruction is folded into the
// routing task so "change the colors" and "move the headline" both land on the
// edit workflow.
func editCanvasPrompt(instruction string) string {
	instruction = strings.TrimSpace(instruction)
	if instruction == "" {
		instruction = "improve the current canvas without changing its message"
	}

	task := "edit the current canvas: " + instruction

	var b strings.Builder
	b.WriteString("You are the Avnac Studio AI Design Director.\n\n")
	b.WriteString("Apply this change to the canvas that is already open: " + instruction + "\n\n")
	b.WriteString("Start from the live canvas — inspect it, then change only what the instruction requires. " +
		"Never recreate an existing design in a new file, and never fork a variation into a new canvas.\n\n")
	b.WriteString(designTools + "\n\n")
	b.WriteString(oneProjectRule + "\n\n")
	promptWorkflow(&b, task)
	b.WriteString("\n\n" + verifyGate)
	return b.String()
}

// designAuditPrompt is the critique prompt; it routes to the critique workflow
// and keeps the audit's own read-first requirement.
func designAuditPrompt() string {
	task := "critique the current canvas design"

	var b strings.Builder
	b.WriteString("You are the Avnac Studio AI Design Director.\n\n")
	b.WriteString("Audit the page that is currently active in the open project. Name the page and document in the report. " +
		"Judge it against the brief it was made for, not against personal taste; separate failures from preferences.\n\n")
	b.WriteString(auditTools + "\n\n")
	promptWorkflow(&b, task)

	b.WriteString("\n\n## Report format\n\n")
	b.WriteString("1. `Brief:` one sentence.\n")
	b.WriteString("2. `First read:` what lands first, second, third.\n")
	b.WriteString("3. `Works:` two or three specifics.\n")
	b.WriteString("4. `Defects:` table of problem, principle, fix, impact.\n")
	b.WriteString("5. `Verdict:` ship / ship with fixes / rebuild, and the one change that matters most.\n")
	return b.String()
}

// RegisterPrompts registers the three user-triggered prompts. Handlers are thin
// wrappers so the prompt builders stay testable without an MCP client.
func (m *AvnacMCP) RegisterPrompts() {
	m.server.AddPrompt(&mcp.Prompt{
		Name:        "design-graphic",
		Description: "Start a design task with the routed workflow from the design library and the rules it links",
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
	}, func(_ context.Context, req *mcp.GetPromptRequest) (*mcp.GetPromptResult, error) {
		topic := req.Params.Arguments["topic"]
		text := designGraphicPrompt(topic, req.Params.Arguments["dimensions"], req.Params.Arguments["style"])
		return singleMessage(fmt.Sprintf("Design instructions for %s", topic), text), nil
	})

	m.server.AddPrompt(&mcp.Prompt{
		Name:        "edit-canvas",
		Description: "Revise the open canvas with the routed edit workflow, without recreating the design",
		Arguments: []*mcp.PromptArgument{
			{
				Name:        "instruction",
				Description: "The change to make (e.g., 'Change the color scheme to dark mode and center the title')",
				Required:    true,
			},
		},
	}, func(_ context.Context, req *mcp.GetPromptRequest) (*mcp.GetPromptResult, error) {
		instruction := req.Params.Arguments["instruction"]
		return singleMessage("Canvas edit instructions", editCanvasPrompt(instruction)), nil
	})

	m.server.AddPrompt(&mcp.Prompt{
		Name:        "design-audit",
		Description: "Critique the open canvas using the routed critique workflow and report pass/fail per requirement",
		Arguments:   []*mcp.PromptArgument{},
	}, func(_ context.Context, _ *mcp.GetPromptRequest) (*mcp.GetPromptResult, error) {
		return singleMessage("Canvas design audit", designAuditPrompt()), nil
	})
}

// singleMessage wraps prompt text as the one user message every prompt returns.
func singleMessage(description, text string) *mcp.GetPromptResult {
	return &mcp.GetPromptResult{
		Description: description,
		Messages: []*mcp.PromptMessage{
			{
				Role:    "user",
				Content: &mcp.TextContent{Text: text},
			},
		},
	}
}
