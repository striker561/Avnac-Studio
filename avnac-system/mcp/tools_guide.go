package mcp

import (
	"context"
	"fmt"
	"strings"

	"Avnac/internal/skill"

	"github.com/google/jsonschema-go/jsonschema"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// The guide tool is how the library reaches an agent *during* a task, not only
// when a user explicitly asks for a design skill. The server cannot know the
// user's brief from a tool payload alone (and often the model never quotes it),
// so it does the two things it can:
//
//  1. expose an explicit router (this tool) the instructions tell the agent to
//     call before specialized work;
//  2. attach a compact guide to composition tool results, computed from the
//     text the agent did send (page names, element text, object names), so the
//     route appears in-band at the moment of composition.
//
// Attaching is gated on Guide.Confident: lexical routing gives a single shared
// word the same score as a clear brief, and noise teaches agents to ignore the
// field.

// guideActions are the tool actions that create or change design content. Reads
// and pure arranging operations do not carry a guide: they either happen before
// the brief exists or after the composition decision is already made.
var guideActions = map[string]bool{
	"create_canvas":    true,
	"add_page":         true,
	"render_elements":  true,
	"measure_elements": true,
	"modify_elements":  true,
}

// vector_draw attaches its guide inside the vector tool, not through the op
// dispatcher, because it is registered directly.

func (m *AvnacMCP) registerGuideTool() {
	m.recordToolOps("guide", map[string]string{"task": ""})
	mcp.AddTool(m.server, &mcp.Tool{
		Name: "guide",
		Description: "Route a design task to Avnac's knowledge library and return the workflow and rules to read before composing. " +
			"Call this at the start of ANY task that needs specialized design instructions — poster, flyer, social graphic, logo, icon, illustration, layout, typography, color, palette, branding, print, packaging, photography, UI, data visualization, critique, or vector path drawing — " +
			"even when the user did not ask for guidance and even when you think you know the answer. Design decisions you cannot cite are guesses; the library carries the thresholds and failure modes. " +
			"It returns skill:// and rules:// resource URIs, the matched task tokens and a confidence level. Set inline=true to get the full workflow and rule text as markdown when the client cannot read resources. " +
			"Composition tool results (canvas create/add-page, elements render/measure/modify, vector draw) also carry a compact guide automatically when the payload is a clear match.",
		InputSchema: objSchema(map[string]*jsonschema.Schema{
			"task":        desc("The task or brief in the user's words: what is being designed, for whom, and in what format."),
			"brief":       desc("Alias for task."),
			"query":       desc("Alias for task."),
			"instruction": desc("Alias for task."),
			"limit":       desc("Maximum rules to return (default 6, cap 12)."),
			"inline":      desc("Return the workflow and rule text as markdown instead of URIs only."),
		}, "task"),
	}, func(ctx context.Context, req *mcp.CallToolRequest, raw map[string]any) (*mcp.CallToolResult, any, error) {
		return m.handleGuide(raw)
	})
}

func (m *AvnacMCP) handleGuide(raw map[string]any) (*mcp.CallToolResult, any, error) {
	task := stringField(raw, "task", "brief", "query", "instruction", "topic")
	if task == "" {
		return nil, nil, fmt.Errorf("guide requires task: describe what you are about to design, for example 'A2 gig poster for a jazz trio'")
	}
	limit, _ := flexibleInt(raw["limit"])
	if limit <= 0 {
		limit = 6
	}
	if limit > 12 {
		limit = 12
	}
	inline, _ := flexibleBool(raw["inline"])

	lib, err := skill.Default()
	if err != nil {
		return nil, nil, fmt.Errorf("design library unavailable: %w", err)
	}
	// The explicit tool answers even a weak lexical match, but labels it: the
	// caller sees the matched words and can decide. A hard no-match is reserved
	// for tasks that share no vocabulary with the library at all.
	g, ok := lib.Guide(task, limit)
	if !ok {
		return nil, map[string]any{
			"matched":    false,
			"task":       task,
			"entry":      designEntryURI,
			"rulesIndex": designRuleIndexURI,
			"note": "No workflow matched this task. Start at skill://avnac-design for the routing table, " +
				"or rules://index for every rule by domain, then proceed from core principles.",
		}, nil
	}

	data := guidePayload(g)
	if !g.Confident() {
		data["note"] = "Low confidence: only one generic word overlapped the library. Check matchedTokens " +
			"against the brief; add the deliverable and format for a sharper route, or read skill://avnac-design."
		candidates := make([]map[string]any, 0, len(g.Routes))
		for _, route := range g.Routes {
			candidates = append(candidates, map[string]any{
				"skill":   "skill://" + route.Skill.Name,
				"name":    route.Skill.Name,
				"score":   route.Score,
				"matched": route.Matched,
			})
		}
		data["candidates"] = candidates
	}
	if inline {
		if plan, err := lib.Plan(task, limit); err == nil {
			data["markdown"] = plan.Markdown
		} else {
			data["inlineError"] = err.Error()
		}
	}
	return nil, data, nil
}

// guidePayload is the compact, stable shape both the tool and the automatic
// attachments use.
func guidePayload(g *skill.Guide) map[string]any {
	if g == nil || g.Skill == nil {
		return nil
	}
	rules := make([]map[string]any, 0, len(g.Rules))
	for i, r := range g.Rules {
		source := "search"
		if i < len(g.RuleSources) {
			source = g.RuleSources[i]
		}
		rules = append(rules, map[string]any{
			"uri":    "rules://" + r.ID,
			"id":     r.ID,
			"title":  r.Title,
			"domain": r.Domain,
			"source": source,
		})
	}
	references := make([]map[string]any, 0, len(g.References))
	for _, ref := range g.References {
		references = append(references, map[string]any{
			"uri":   "references://" + ref.Name,
			"name":  ref.Name,
			"title": ref.Title,
		})
	}
	confidence := "low"
	if g.Confident() {
		confidence = "high"
	}
	return map[string]any{
		"matched":    true,
		"task":       g.Task,
		"confidence": confidence,
		"skill": map[string]any{
			"uri":         "skill://" + g.Skill.Name,
			"name":        g.Skill.Name,
			"description": g.Skill.Description,
		},
		"rules":         rules,
		"references":    references,
		"matchedTokens": g.Matched,
		"note": "Read the workflow, then these rules, before the next design decision. " +
			"When you report the result, name the rule you followed.",
	}
}

// attachGuide adds the routed guide to a structured tool response. It never
// overwrites an existing guide and never attaches to an error payload.
func attachGuide(data any, payload map[string]any) {
	response, ok := data.(map[string]any)
	if !ok || response == nil {
		return
	}
	if _, exists := response["guide"]; exists {
		return
	}
	if msg, _ := response["error"].(string); msg != "" {
		return
	}
	task := taskTextFromPayload(payload)
	if task == "" {
		return
	}
	lib, err := skill.Default()
	if err != nil {
		return
	}
	g, ok := lib.Guide(task, 5)
	if !ok || !g.Confident() {
		return
	}
	response["guide"] = guidePayload(g)
}

// taskTextFromPayload collects the human-meaningful strings a client sent:
// page names, element text, object names. It walks containers but only takes
// strings under keys that carry meaning — type names, ids, colours and data
// URLs are noise for routing.
func taskTextFromPayload(payload map[string]any) string {
	meaningful := map[string]bool{
		"name": true, "text": true, "title": true, "description": true,
		"brief": true, "prompt": true, "label": true, "headline": true,
		"subhead": true, "body": true, "caption": true,
	}
	var parts []string
	total := 0
	var walk func(value any, depth int, takesText bool)
	walk = func(value any, depth int, takesText bool) {
		if depth > 4 || total > 320 || len(parts) >= 16 {
			return
		}
		switch typed := value.(type) {
		case string:
			if !takesText {
				return
			}
			value := strings.TrimSpace(typed)
			if value == "" || strings.HasPrefix(value, "data:") || strings.HasPrefix(value, "#") {
				return
			}
			total += len(value)
			parts = append(parts, value)
		case []any:
			for _, item := range typed {
				walk(item, depth+1, takesText)
			}
		case map[string]any:
			for key, child := range typed {
				walk(child, depth+1, meaningful[key])
			}
		}
	}
	walk(payload, 0, false)
	return strings.TrimSpace(strings.Join(parts, " "))
}
