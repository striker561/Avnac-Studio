package mcp

import (
	"context"
	"fmt"
	"sort"
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
			"It returns skill:// and rules:// resource URIs, the matched task tokens and a confidence level, plus the Verification lines of the top three rules — the checks to run before the next render. Set inline=true to get the full workflow and rule text as markdown when the client cannot read resources. " +
			"Composition tool results (canvas create/add-page, elements render/measure/modify, vector draw) also carry a compact guide automatically when the payload is a clear match. " +
			"Matching is lexical — words are compared, not meaning — so a low or empty match means the brief's words did not overlap the library, not that it has nothing on the subject. " +
			"A route is where to start, not a reading limit: every skill://, rules:// and references:// URI stays readable, so open " + designEntryURI + ", " + designRuleIndexURI + " or any other rule by URI once the work moves to a subject the route did not name.",
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
	// An explicit route is the receipt's baseline: validate will report which of
	// these rules it could actually measure.
	if g.Confident() {
		m.guideMu.Lock()
		m.guideSig = guideSignature(g)
		m.guideRoute = g
		m.guideMu.Unlock()
	}
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

// guideDigestRules is how many routed rules get their Verification lines
// printed in the payload itself. The rest stay a URI: three checks are read,
// eight are skipped, so the default ships the three that are most likely to be
// run before the next render.
const guideDigestRules = 3

// guideCheckChars caps one printed check. The full rule is always one
// rules:// read away; the digest exists to be acted on, not to be complete.
const guideCheckChars = 180

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
	checks := guideChecks(g)
	gates := guideGates(g)
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
		"checks":        checks,
		"moreChecks":    len(g.Rules) - len(checks),
		"gates":         gates,
		"matchedTokens": g.Matched,
		"note": "Run these checks before the next render, not after delivery. " +
			"Each line is the rule's own Verification item; open the rules:// URI when a check needs the reasoning. " +
			"When you report the result, name the rule you followed. The route is a sample chosen by word overlap: " +
			"gates apply whatever it says, and rules://index lists the rules it did not name.",
	}
}

// guideChecks prints the Verification lines of the first few routed rules, so
// the default answer is something to do rather than a list of things to go and
// read. The workflow's own qualifier travels with the rule: a crop rule that
// applies "when there is one image" must not read as a blanket order.
func guideChecks(g *skill.Guide) []map[string]any {
	if g == nil || g.Skill == nil {
		return nil
	}
	out := make([]map[string]any, 0, guideDigestRules)
	for i, r := range g.Rules {
		if i >= guideDigestRules {
			break
		}
		lines := r.Checks()
		if len(lines) > 2 {
			lines = lines[:2]
		}
		short := make([]string, 0, len(lines))
		for _, line := range lines {
			short = append(short, truncateText(line, guideCheckChars))
		}
		entry := map[string]any{
			"rule":   r.ID,
			"title":  r.Title,
			"checks": short,
		}
		if i < len(g.RuleSources) && g.RuleSources[i] == "workflow" {
			if note := g.Skill.RuleNotes[r.ID]; note != "" {
				entry["applies"] = note
			}
		}
		out = append(out, entry)
	}
	return out
}

// guideGates ships the entry document's always-on checks with every route.
//
// The route is a sample of the library chosen by keyword overlap; these six
// checks are the part that applies whatever the sample says, and leaving them
// behind a "read the index when you feel unsure" trigger meant they were never
// read at all. Only gates whose rules the route does not already carry are
// printed, so a vector task does not repeat the vector gate.
func guideGates(g *skill.Guide) []map[string]any {
	if g == nil || g.Skill == nil {
		return nil
	}
	lib, err := skill.Default()
	if err != nil {
		return nil
	}
	routed := make(map[string]bool, len(g.Rules))
	for _, r := range g.Rules {
		routed[r.ID] = true
	}
	out := make([]map[string]any, 0, 6)
	for _, gate := range lib.Gates() {
		covered := len(gate.Rules) > 0
		for _, id := range gate.Rules {
			if !routed[id] {
				covered = false
				break
			}
		}
		if covered {
			continue
		}
		out = append(out, map[string]any{
			"check": truncateText(gate.Check, guideGateChars),
			"rules": gate.Rules,
		})
	}
	return out
}

// guideGateChars keeps a gate to one readable line. Unlike a rule digest, a
// gate has no shorter form: it is already the whole check.
const guideGateChars = 220

// truncateText shortens on a word boundary so a digest line never ends
// mid-word; the ellipsis signals that the rule file has the full sentence.
func truncateText(s string, max int) string {
	runes := []rune(strings.TrimSpace(s))
	if len(runes) <= max {
		return string(runes)
	}
	cut := runes[:max]
	for i := len(cut) - 1; i > max/2; i-- {
		if cut[i] == ' ' {
			cut = cut[:i]
			break
		}
	}
	return strings.TrimRight(string(cut), " ,;:") + "…"
}

// attachGuide adds the routed guide to a structured tool response. It never
// overwrites an existing guide, never attaches to an error payload, and stamps
// a given route once: the same URI list repeated on every render is wallpaper,
// so a repeat is skipped and the debt is reported by validate's receipt instead.
func (m *AvnacMCP) attachGuide(data any, payload map[string]any) {
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
	lib, err := skill.Default()
	if err != nil {
		return
	}
	task := taskTextFromPayload(payload)
	if task == "" {
		m.noteMissingRoute(response)
		return
	}
	g, ok := lib.Guide(task, 5)
	if !ok || !g.Confident() {
		m.noteMissingRoute(response)
		return
	}
	sig := guideSignature(g)
	m.guideMu.Lock()
	repeat := sig == m.guideSig
	if !repeat {
		m.guideSig = sig
		m.guideRoute = g
	}
	m.guideMu.Unlock()
	if repeat {
		return
	}
	response["guide"] = guidePayload(g)
}

// noteMissingRoute makes the omission visible in the tool output, which is the
// one channel an agent cannot skim past. It fires only while no route has been
// handed out in this session, so it nags once and then stops; a hard error would
// refuse legitimate work (moving a rectangle, clearing a test page) that needs no
// design knowledge.
func (m *AvnacMCP) noteMissingRoute(response map[string]any) {
	m.guideMu.Lock()
	routed := m.guideSig != ""
	m.guideMu.Unlock()
	if routed {
		return
	}
	response["guideMissing"] = "No design route has been fetched in this session. Call guide(task=<the brief>) " +
		"before the next composition: it returns the workflow, the rules and the always-on gates that this " +
		"response did not carry."
}

// guideSignature identifies a route by its workflow and rule list. Two payloads
// that route to the same reading are the same guide, whatever their wording.
func guideSignature(g *skill.Guide) string {
	if g == nil || g.Skill == nil {
		return ""
	}
	parts := make([]string, 0, len(g.Rules)+1)
	parts = append(parts, g.Skill.Name)
	for _, r := range g.Rules {
		parts = append(parts, r.ID)
	}
	return strings.Join(parts, "|")
}

// attachGuideReceipt closes the loop a guide opens. Validate runs measured,
// rule-backed checks; the receipt says which of the routed rules those checks
// cover and which are still prose the agent has to apply itself. Without it,
// "read the rules" and "read nothing" look the same in a tool result.
func (m *AvnacMCP) attachGuideReceipt(data any) {
	response, ok := data.(map[string]any)
	if !ok || response == nil {
		return
	}
	if msg, _ := response["error"].(string); msg != "" {
		return
	}
	m.guideMu.Lock()
	g := m.guideRoute
	m.guideMu.Unlock()
	if g == nil || g.Skill == nil || len(g.Rules) == 0 {
		return
	}

	measured := make(map[string]bool)
	failed := make(map[string]string)
	for _, entry := range structuredChecks(response["checks"]) {
		rule, _ := entry["rule"].(string)
		if rule == "" {
			continue
		}
		measured[rule] = true
		if entry["status"] == "warn" {
			failed[rule] = stringField(entry, "id")
		}
	}

	checked := make([]string, 0, len(g.Rules))
	pending := make([]string, 0, len(g.Rules))
	for _, r := range g.Rules {
		if measured[r.ID] {
			checked = append(checked, r.ID)
			continue
		}
		pending = append(pending, r.ID)
	}
	response["guideReceipt"] = map[string]any{
		"skill":    "skill://" + g.Skill.Name,
		"checked":  checked,
		"pending":  pending,
		"readNext": readNextRules(g, failed),
		"note": "checked rules were measured by this validate. pending rules are prose: " +
			"validate cannot see them, so apply them yourself before the next render. " +
			"readNext names the rule that owns a failing check when that rule was not in the route.",
	}
}

// readNextRules answers the route's blind spot with evidence: a check failed,
// and the rule that defines the check was not in the list the agent was given.
// That names the missing rule from the artifact instead of asking the agent to
// notice that its route is a sample.
func readNextRules(g *skill.Guide, failed map[string]string) []map[string]any {
	if len(failed) == 0 {
		return nil
	}
	lib, err := skill.Default()
	if err != nil {
		return nil
	}
	routed := make(map[string]bool, len(g.Rules))
	for _, r := range g.Rules {
		routed[r.ID] = true
	}
	ids := make([]string, 0, len(failed))
	for id := range failed {
		if !routed[id] {
			ids = append(ids, id)
		}
	}
	sort.Strings(ids)
	if len(ids) > 4 {
		ids = ids[:4]
	}
	out := make([]map[string]any, 0, len(ids))
	for _, id := range ids {
		entry := map[string]any{
			"rule":    "rules://" + id,
			"check":   failed[id],
			"because": "this check failed and the rule that owns it was not in the route",
		}
		if r, ok := lib.Rule(id); ok {
			entry["title"] = r.Title
			entry["read"] = truncateText(r.CheckTitleLine(), 140)
		}
		out = append(out, entry)
	}
	return out
}

// structuredChecks reads the checks array a validate response carries, which
// arrives as []any after JSON decoding and as []map[string]any in tests.
func structuredChecks(value any) []map[string]any {
	switch checks := value.(type) {
	case []any:
		out := make([]map[string]any, 0, len(checks))
		for _, item := range checks {
			if entry, ok := item.(map[string]any); ok {
				out = append(out, entry)
			}
		}
		return out
	case []map[string]any:
		return checks
	}
	return nil
}

// textKeyRank orders the keys taskTextFromPayload reads, most identifying
// first. A page or object name routes better than body copy, and the fixed
// order keeps the joined task text stable across runs.
func textKeyRank(key string) int {
	switch key {
	case "name":
		return 0
	case "title":
		return 1
	case "headline":
		return 2
	case "subhead":
		return 3
	case "brief":
		return 4
	case "prompt":
		return 5
	case "label":
		return 6
	case "description":
		return 7
	case "text":
		return 8
	case "body":
		return 9
	case "caption":
		return 10
	default:
		return 11
	}
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
			// Walk keys in a fixed, meaning-first order. Go randomises map
			// iteration, and the router reads the joined text left to right:
			// an object's name landing after its element text could push the
			// deliverable past the head position that marks it "named", which
			// made guide attachment depend on the run.
			keys := make([]string, 0, len(typed))
			for key := range typed {
				keys = append(keys, key)
			}
			sort.Slice(keys, func(i, j int) bool {
				ri, rj := textKeyRank(keys[i]), textKeyRank(keys[j])
				if ri != rj {
					return ri < rj
				}
				return keys[i] < keys[j]
			})
			for _, key := range keys {
				walk(typed[key], depth+1, meaningful[key])
			}
		}
	}
	walk(payload, 0, false)
	return strings.TrimSpace(strings.Join(parts, " "))
}
