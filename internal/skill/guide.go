package skill

import "strings"

// Guide is a lightweight route for a task that is already in progress: the
// workflow, the rules that apply, and why the router chose them. It is the
// in-task counterpart to Plan. Plan concatenates the full reading material;
// Guide names what to read so a tool result can point an agent at the library
// without paying for the bodies up front.
type Guide struct {
	Task  string
	Skill *Skill
	// Score is the IDF-weighted token overlap for the chosen skill. It is only
	// comparable within one call.
	Score float64
	// Matched lists the task tokens that contributed, including a "(named)"
	// marker when the task named the deliverable outright.
	Matched []string
	// Routes is the full ranked shortlist, best first.
	Routes []Route
	// Rules are the workflow's own rules first, then the best search fills.
	Rules []*Rule
	// References are the lookup notes the workflow links.
	References []*Reference
	// RuleSources records why each rule is present: "workflow" or "search".
	RuleSources []string
}

// Guide routes a task and returns the skill plus the rules worth reading.
// ok is false when the task does not overlap the library at all, so callers do
// not attach irrelevant guidance to a bare "draw a rectangle" request.
//
// maxRules bounds the total rule list. It defaults to 8, which is the upper end
// of the "4–8 rules" reading budget the entry document sets.
func (l *Library) Guide(task string, maxRules int) (*Guide, bool) {
	task = strings.TrimSpace(task)
	if task == "" {
		return nil, false
	}
	routes := l.Route(task, 3)
	if len(routes) == 0 {
		return nil, false
	}
	best := routes[0]
	if best.Score < 0.5 || len(best.Matched) == 0 {
		return nil, false
	}
	if maxRules <= 0 {
		maxRules = 8
	}
	g := &Guide{Task: task, Skill: best.Skill, Score: best.Score, Matched: best.Matched, Routes: routes}

	seen := make(map[string]bool)
	add := func(r *Rule, source string) bool {
		if r == nil || seen[r.ID] || len(g.Rules) >= maxRules {
			return false
		}
		seen[r.ID] = true
		g.Rules = append(g.Rules, r)
		g.RuleSources = append(g.RuleSources, source)
		return true
	}
	for _, id := range best.Skill.Rules {
		if r, ok := l.Rule(id); ok {
			add(r, "workflow")
		}
	}
	for _, hit := range l.Search(task, maxRules) {
		if len(g.Rules) >= maxRules {
			break
		}
		add(hit.Rule, "search")
	}
	for _, name := range best.Skill.References {
		if ref, ok := l.Reference(name); ok {
			g.References = append(g.References, ref)
		}
	}
	return g, true
}

// Confident reports whether the route has enough signal to volunteer itself.
//
// Lexical routing gives a single rare word the same score as a clear brief, so
// an auto-attached guide requires either two overlapping content words or a
// task that names the deliverable ("a poster", "the logo"). Explicit guide calls
// may still use a single-word match — the caller sees Matched and decides.
func (g *Guide) Confident() bool {
	if g == nil {
		return false
	}
	content := 0
	for _, matched := range g.Matched {
		if strings.HasSuffix(matched, "(named)") {
			return true
		}
		content++
	}
	return content >= 2
}

// SkillURI is the MCP resource URI for the routed workflow.
func (g *Guide) SkillURI() string {
	if g == nil || g.Skill == nil {
		return ""
	}
	return "skill://" + g.Skill.Name
}

// RuleURIs returns the routed rules as MCP resource URIs, in reading order.
func (g *Guide) RuleURIs() []string {
	if g == nil {
		return nil
	}
	out := make([]string, 0, len(g.Rules))
	for _, r := range g.Rules {
		out = append(out, "rules://"+r.ID)
	}
	return out
}

// ReferenceURIs returns the routed references as MCP resource URIs.
func (g *Guide) ReferenceURIs() []string {
	if g == nil {
		return nil
	}
	out := make([]string, 0, len(g.References))
	for _, ref := range g.References {
		out = append(out, "references://"+ref.Name)
	}
	return out
}
