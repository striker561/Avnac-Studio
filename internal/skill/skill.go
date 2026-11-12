// Package skill loads Avnac's embedded graphic-design knowledge library and
// routes a task to the sub-skill, rules and references that should inform it.
//
// The library is data, not code: markdown files are embedded at build time and
// parsed on first use. Three tiers exist and are deliberately separate:
//
//   - SKILL.md is the entry point: what the library is and how to route.
//   - <skill>/SKILL.md is a task workflow (poster, logo, color, ...).
//   - references/*.md are compact lookup notes.
//   - rules/*.md are the authoritative, applied design principles.
//
// Callers normally use Default, then Route or Plan to decide what to read and
// Rule or Skill to read it:
//
//	lib, err := skill.Default()
//	if err != nil {
//		return err
//	}
//	plan, err := lib.Plan("design a jazz gig poster for A2 print", 5)
//	// plan.Skill is the poster workflow; plan.Markdown is ready to inject.
package skill

import (
	"embed"
	"fmt"
	"math"
	"regexp"
	"sort"
	"strings"
	"sync"
)

// content holds every markdown file in the library. Patterns are deliberately
// narrow: */SKILL.md picks up the sub-skills only, so adding a directory with a
// SKILL.md is enough to register a new workflow.
//
//go:embed SKILL.md
//go:embed */SKILL.md
//go:embed rules/*.md
//go:embed references/*.md
var content embed.FS

// Rule section headings, in the order every rule must use. Validation enforces
// the order so the router can rely on it when it needs one section only.
var ruleSections = []string{
	"Purpose",
	"Definition",
	"Core Principles",
	"Techniques",
	"When to Use",
	"When to Avoid",
	"Common Mistakes",
	"Practical Examples",
	"Related Rules",
	"Sources",
}

// Domain names accepted in a rule header.
var ruleDomains = map[string]bool{
	"foundations":  true,
	"color":        true,
	"typography":   true,
	"layout":       true,
	"psychology":   true,
	"branding":     true,
	"illustration": true,
	"imagery":      true,
	"print":        true,
	"ui":           true,
	"history":      true,
	"production":   true,
}

// MaxRules is the enforced ceiling on rule files. The library is meant to stay
// small enough that an agent can hold the index of it in context.
const MaxRules = 120

// Skill is a task workflow loaded from <dir>/SKILL.md.
type Skill struct {
	// Name is the folder name and the frontmatter name; they must match.
	Name string
	// Description is the triggering sentence shown in skill catalogs.
	Description string
	// Path is the embed path, e.g. "poster/SKILL.md".
	Path string
	// Body is the markdown after the frontmatter block.
	Body string
	// Rules are the rule IDs linked under "## Rules to apply".
	Rules []string
	// References are the reference names linked in the file.
	References []string
}

// Rule is one applied design principle loaded from rules/NN-topic.md.
type Rule struct {
	// ID is the file stem, e.g. "24-typographic-hierarchy".
	ID string
	// Title is the text after "# Rule:".
	Title string
	// Domain groups rules into a subject, e.g. "typography".
	Domain string
	// Path is the embed path, e.g. "rules/24-typographic-hierarchy.md".
	Path string
	// Body is the whole file, front matter included.
	Body string
	// Sections maps each H2 heading to its trimmed content, keyed exactly as
	// ruleSections spells it.
	Sections map[string]string
	// Related holds rule IDs linked under "## Related Rules".
	Related []string
	// Sources holds the bullet lines under "## Sources".
	Sources []string
}

// Reference is a compact lookup note from references/.
type Reference struct {
	// Name is the file stem, e.g. "typography".
	Name string
	// Title is the first H1.
	Title string
	// Path is the embed path, e.g. "references/typography.md".
	Path string
	// Body is the whole file.
	Body string
}

// Library is the parsed, immutable knowledge library.
type Library struct {
	// Root is the top-level SKILL.md.
	Root *Skill

	skills     map[string]*Skill
	skillOrder []string
	rules      map[string]*Rule
	ruleOrder  []string
	refs       map[string]*Reference
	refOrder   []string

	// ruleIndex is rules/README.md: the generated index of every rule by
	// domain. It is served as rules://index over MCP and is not itself a rule.
	ruleIndex string

	// docFreq counts how many skills contain a token, used for IDF weighting.
	docFreq map[string]int
}

// Route is one ranked skill match for a task.
type Route struct {
	Skill *Skill
	// Score is the accumulated IDF-weighted token overlap. It is only
	// meaningful relative to other routes for the same query.
	Score float64
	// Matched lists the query tokens that contributed, for debugging routing.
	Matched []string
}

// Hit is one ranked rule match for a search query.
type Hit struct {
	Rule  *Rule
	Score float64
	Why   string
}

// Plan is what the router decided a task should read.
type Plan struct {
	Task       string
	Skill      *Skill
	Routes     []Route
	Rules      []*Rule
	References []*Reference
	// Markdown is the concatenated reading material for the task: the skill
	// body first, then each rule, separated by horizontal rules.
	Markdown string
}

var (
	defaultOnce sync.Once
	defaultLib  *Library
	defaultErr  error
)

// Default returns the embedded library, parsing it on first call and caching the
// result. The embedded filesystem cannot change at runtime, so a single parse is
// enough and later calls are free.
func Default() (*Library, error) {
	defaultOnce.Do(func() {
		defaultLib, defaultErr = Load()
	})
	return defaultLib, defaultErr
}

// Load parses the embedded library. It returns an error rather than a partial
// library when a file is malformed, so a broken build fails in tests instead of
// silently routing an agent to the wrong thing.
func Load() (*Library, error) {
	lib := &Library{
		skills:  make(map[string]*Skill),
		rules:   make(map[string]*Rule),
		refs:    make(map[string]*Reference),
		docFreq: make(map[string]int),
	}

	rootBody, err := content.ReadFile("SKILL.md")
	if err != nil {
		return nil, fmt.Errorf("skill: read entry point: %w", err)
	}
	meta, body, err := parseFrontmatter(string(rootBody))
	if err != nil {
		return nil, fmt.Errorf("skill: SKILL.md: %w", err)
	}
	lib.Root = &Skill{
		Name:        meta["name"],
		Description: meta["description"],
		Path:        "SKILL.md",
		Body:        body,
		References:  referenceLinks(body),
	}

	skillDirs, err := content.ReadDir(".")
	if err != nil {
		return nil, fmt.Errorf("skill: list root: %w", err)
	}
	for _, entry := range skillDirs {
		if !entry.IsDir() || entry.Name() == "rules" || entry.Name() == "references" {
			continue
		}
		path := entry.Name() + "/SKILL.md"
		raw, err := content.ReadFile(path)
		if err != nil {
			// A directory without SKILL.md is not a skill; ignore it.
			continue
		}
		m, b, err := parseFrontmatter(string(raw))
		if err != nil {
			return nil, fmt.Errorf("skill: %s: %w", path, err)
		}
		s := &Skill{
			Name:        m["name"],
			Description: m["description"],
			Path:        path,
			Body:        b,
			Rules:       ruleLinks(b),
			References:  referenceLinks(b),
		}
		if s.Name == "" {
			s.Name = entry.Name()
		}
		lib.skills[s.Name] = s
		lib.skillOrder = append(lib.skillOrder, s.Name)
	}

	ruleFiles, err := content.ReadDir("rules")
	if err != nil {
		return nil, fmt.Errorf("skill: list rules: %w", err)
	}
	for _, entry := range ruleFiles {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".md") || entry.Name() == "README.md" {
			continue
		}
		path := "rules/" + entry.Name()
		raw, err := content.ReadFile(path)
		if err != nil {
			return nil, fmt.Errorf("skill: read %s: %w", path, err)
		}
		r, err := parseRule(path, string(raw))
		if err != nil {
			return nil, err
		}
		if _, dup := lib.rules[r.ID]; dup {
			return nil, fmt.Errorf("skill: duplicate rule id %q", r.ID)
		}
		lib.rules[r.ID] = r
		lib.ruleOrder = append(lib.ruleOrder, r.ID)
	}

	refFiles, err := content.ReadDir("references")
	if err != nil {
		return nil, fmt.Errorf("skill: list references: %w", err)
	}
	for _, entry := range refFiles {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".md") {
			continue
		}
		path := "references/" + entry.Name()
		raw, err := content.ReadFile(path)
		if err != nil {
			return nil, fmt.Errorf("skill: read %s: %w", path, err)
		}
		name := strings.TrimSuffix(entry.Name(), ".md")
		ref := &Reference{Name: name, Title: firstHeading(string(raw)), Path: path, Body: string(raw)}
		lib.refs[name] = ref
		lib.refOrder = append(lib.refOrder, name)
	}

	sort.Strings(lib.skillOrder)
	sort.Strings(lib.ruleOrder)
	sort.Strings(lib.refOrder)
	// rules/README.md is the generated index, not a rule; keep it separately.
	if index, err := content.ReadFile("rules/README.md"); err == nil {
		lib.ruleIndex = string(index)
	}
	lib.indexSkills()
	return lib, nil
}

// indexSkills builds the token document frequencies used for routing.
func (l *Library) indexSkills() {
	for _, name := range l.skillOrder {
		s := l.skills[name]
		seen := make(map[string]bool)
		for _, tok := range tokenize(s.Name + " " + s.Description + " " + sectionText(s.Body, "Applies when")) {
			seen[tok] = true
		}
		for tok := range seen {
			l.docFreq[tok]++
		}
	}
}

// Root returns the entry-point skill, or nil when the library is empty.
func (l *Library) Entry() *Skill { return l.Root }

// SkillNames returns the sub-skill names in alphabetical order.
func (l *Library) SkillNames() []string { return append([]string(nil), l.skillOrder...) }

// Skill returns the sub-skill with the given name.
func (l *Library) Skill(name string) (*Skill, bool) {
	s, ok := l.skills[strings.ToLower(strings.TrimSpace(name))]
	return s, ok
}

// RuleIDs returns every rule ID in alphabetical order.
func (l *Library) RuleIDs() []string { return append([]string(nil), l.ruleOrder...) }

// Rules returns every rule in alphabetical order.
func (l *Library) Rules() []*Rule {
	out := make([]*Rule, 0, len(l.ruleOrder))
	for _, id := range l.ruleOrder {
		out = append(out, l.rules[id])
	}
	return out
}

// Rule resolves a rule by any of: exact ID ("24-typographic-hierarchy"), bare
// number ("24"), or title ("typographic hierarchy"). Resolution is forgiving
// because callers usually paraphrase what they want.
func (l *Library) Rule(query string) (*Rule, bool) {
	q := strings.ToLower(strings.TrimSpace(query))
	q = strings.TrimSuffix(q, ".md")
	q = strings.TrimPrefix(q, "rules/")
	if q == "" {
		return nil, false
	}
	if r, ok := l.rules[q]; ok {
		return r, true
	}
	// Bare number, or a number followed by punctuation and a partial title.
	if n := leadingDigits(q); n != "" {
		for _, id := range l.ruleOrder {
			if strings.HasPrefix(id, n+"-") {
				return l.rules[id], true
			}
		}
	}
	norm := normalize(q)
	for _, id := range l.ruleOrder {
		r := l.rules[id]
		if normalize(r.Title) == norm || normalize(strings.TrimPrefix(id, leadingNumber(id)+"-")) == norm {
			return r, true
		}
	}
	return nil, false
}

// ReferenceNames returns reference names in alphabetical order.
func (l *Library) ReferenceNames() []string { return append([]string(nil), l.refOrder...) }

// Reference resolves a reference by file stem.
func (l *Library) Reference(name string) (*Reference, bool) {
	r, ok := l.refs[strings.ToLower(strings.TrimSpace(name))]
	return r, ok
}

// RuleIndexBody returns rules/README.md, the generated index of every rule by
// domain. MCP serves it as rules://index so an agent can discover rules without
// the server enumerating every one of them in each resource list.
func (l *Library) RuleIndexBody() (string, error) {
	if l.ruleIndex == "" {
		return "", fmt.Errorf("skill: rules/README.md is not embedded; run the index generator")
	}
	return l.ruleIndex, nil
}

// RulesInDomain returns rules whose header names the given domain.
func (l *Library) RulesInDomain(domain string) []*Rule {
	domain = strings.ToLower(strings.TrimSpace(domain))
	var out []*Rule
	for _, id := range l.ruleOrder {
		if l.rules[id].Domain == domain {
			out = append(out, l.rules[id])
		}
	}
	return out
}

// Route ranks sub-skills for a free-text task. Scoring is IDF-weighted token
// overlap, so a rare word like "poster" counts far more than "design", which
// every description contains. The returned slice is sorted best first and is
// never empty while the library has skills; a task that matches nothing still
// gets an alphabetical list with zero scores so callers can fall back.
func (l *Library) Route(task string, limit int) []Route {
	tokens := uniqueTokens(task)
	type scored struct {
		name    string
		score   float64
		matched []string
	}
	var all []scored
	taskTokens := uniqueTokens(task)
	for _, name := range l.skillOrder {
		s := l.skills[name]
		haystack := tokenize(s.Name + " " + s.Description + " " + sectionText(s.Body, "Applies when"))
		present := make(map[string]bool, len(haystack))
		for _, t := range haystack {
			present[t] = true
		}
		nameTokens := make(map[string]bool)
		for _, t := range tokenize(s.Name) {
			nameTokens[t] = true
		}
		var score float64
		var matched []string
		for _, tok := range tokens {
			if !present[tok] {
				continue
			}
			weight := math.Log(float64(len(l.skillOrder)+1) / float64(l.docFreq[tok]))
			if weight <= 0 {
				weight = 0.01
			}
			if nameTokens[tok] {
				weight *= 2
			}
			score += weight
			matched = append(matched, tok)
		}
		// A task that names the deliverable outright ("a poster", "the logo")
		// should beat a skill that merely mentions the same words in prose.
		for _, tok := range taskTokens {
			if nameTokens[tok] {
				score += 5
				matched = append(matched, tok+" (named)")
				break
			}
		}
		all = append(all, scored{name: name, score: score, matched: matched})
	}
	sort.SliceStable(all, func(i, j int) bool {
		if all[i].score != all[j].score {
			return all[i].score > all[j].score
		}
		return all[i].name < all[j].name
	})
	if limit <= 0 || limit > len(all) {
		limit = len(all)
	}
	routes := make([]Route, 0, limit)
	for _, s := range all[:limit] {
		routes = append(routes, Route{Skill: l.skills[s.name], Score: s.score, Matched: s.matched})
	}
	return routes
}

// Search ranks rules for a query using the same IDF weighting over titles,
// IDs, and body text. It is meant for explicit lookups ("what did we say about
// bleed") rather than task routing; Route decides which workflow applies.
func (l *Library) Search(query string, limit int) []Hit {
	tokens := uniqueTokens(query)
	if len(tokens) == 0 {
		return nil
	}
	df := make(map[string]int, len(tokens))
	for _, id := range l.ruleOrder {
		r := l.rules[id]
		body := strings.ToLower(r.Title + " " + r.ID + " " + r.Body)
		for _, tok := range tokens {
			if strings.Contains(body, tok) {
				df[tok]++
			}
		}
	}
	var hits []Hit
	for _, id := range l.ruleOrder {
		r := l.rules[id]
		title := strings.ToLower(r.Title)
		body := strings.ToLower(r.Title + " " + r.ID + " " + r.Body)
		var score float64
		var why []string
		for _, tok := range tokens {
			if !strings.Contains(body, tok) {
				continue
			}
			weight := math.Log(float64(len(l.ruleOrder)+1) / float64(df[tok]+1))
			if weight <= 0 {
				weight = 0.01
			}
			if strings.Contains(title, tok) {
				weight *= 3
				why = append(why, tok+" (title)")
			} else {
				why = append(why, tok)
			}
			score += weight
		}
		if score > 0 {
			hits = append(hits, Hit{Rule: r, Score: score, Why: strings.Join(why, ", ")})
		}
	}
	sort.SliceStable(hits, func(i, j int) bool {
		if hits[i].Score != hits[j].Score {
			return hits[i].Score > hits[j].Score
		}
		return hits[i].Rule.ID < hits[j].Rule.ID
	})
	if limit > 0 && len(hits) > limit {
		hits = hits[:limit]
	}
	return hits
}

// Plan routes a task and gathers the reading material for it: the best-matching
// skill, the rules that skill links, and enough references to answer follow-up
// "how much / which ones" questions. When the skill links fewer than maxRules
// rules, the gap is filled with the best search hits for the task.
//
// maxRules bounds the search fill only: the rules a skill links are its own
// recommendation and are always included, so a plan can exceed maxRules when the
// routed skill is rule-heavy. maxRules <= 0 means "no fill". The returned Plan
// always has a Skill when the library loaded; Plan.Markdown concatenates the
// material.
func (l *Library) Plan(task string, maxRules int) (*Plan, error) {
	routes := l.Route(task, 3)
	if len(routes) == 0 {
		return nil, fmt.Errorf("skill: library has no sub-skills")
	}
	plan := &Plan{Task: task, Skill: routes[0].Skill, Routes: routes}
	seen := make(map[string]bool)
	for _, id := range plan.Skill.Rules {
		if r, ok := l.Rule(id); ok && !seen[r.ID] {
			plan.Rules = append(plan.Rules, r)
			seen[r.ID] = true
		}
	}
	limit := maxRules
	if limit <= 0 {
		limit = len(plan.Rules)
	}
	for _, hit := range l.Search(task, limit) {
		if len(plan.Rules) >= limit {
			break
		}
		if !seen[hit.Rule.ID] {
			plan.Rules = append(plan.Rules, hit.Rule)
			seen[hit.Rule.ID] = true
		}
	}
	for _, name := range plan.Skill.References {
		if ref, ok := l.Reference(name); ok {
			plan.References = append(plan.References, ref)
		}
	}
	plan.Markdown = plan.Skill.Body
	for _, r := range plan.Rules {
		plan.Markdown += "\n\n---\n\n" + r.Body
	}
	return plan, nil
}

// Validate checks the library's structural contract: names match folders,
// descriptions exist, rule sections appear once and in order, every relative
// link resolves, and the rule count stays under MaxRules. It is exported so the
// app can assert the embedded data at startup and so tests can point at the
// failure instead of a downstream nil.
func (l *Library) Validate() error {
	if l.Root == nil {
		return fmt.Errorf("skill: missing root SKILL.md")
	}
	if l.Root.Name == "" || l.Root.Description == "" {
		return fmt.Errorf("skill: SKILL.md needs name and description frontmatter")
	}
	if len(l.rules) > MaxRules {
		return fmt.Errorf("skill: %d rules exceeds the %d-rule ceiling", len(l.rules), MaxRules)
	}
	if len(l.skills) == 0 {
		return fmt.Errorf("skill: no sub-skills found")
	}
	for _, name := range l.skillOrder {
		s := l.skills[name]
		if s.Name != name {
			return fmt.Errorf("skill: %s declares name %q, folder is %q", s.Path, s.Name, name)
		}
		if strings.TrimSpace(s.Description) == "" {
			return fmt.Errorf("skill: %s has an empty description", s.Path)
		}
		if len(s.Rules) < 3 {
			return fmt.Errorf("skill: %s links %d rules; link at least 3", s.Path, len(s.Rules))
		}
		for _, id := range s.Rules {
			if _, ok := l.Rule(id); !ok {
				return fmt.Errorf("skill: %s links missing rule %q", s.Path, id)
			}
		}
		for _, ref := range s.References {
			if _, ok := l.Reference(ref); !ok {
				return fmt.Errorf("skill: %s links missing reference %q", s.Path, ref)
			}
		}
	}
	for _, id := range l.ruleOrder {
		r := l.rules[id]
		if r.Title == "" {
			return fmt.Errorf("skill: %s has no '# Rule:' title", r.Path)
		}
		if !ruleDomains[r.Domain] {
			return fmt.Errorf("skill: %s has unknown domain %q", r.Path, r.Domain)
		}
		var seen int
		for _, heading := range ruleSections {
			if _, ok := r.Sections[heading]; !ok {
				return fmt.Errorf("skill: %s is missing the %q section", r.Path, heading)
			}
			seen++
		}
		if seen != len(ruleSections) {
			return fmt.Errorf("skill: %s has the wrong section set", r.Path)
		}
		if len(r.Related) < 2 {
			return fmt.Errorf("skill: %s links %d related rules; link at least 2", r.Path, len(r.Related))
		}
		for _, rel := range r.Related {
			if _, ok := l.Rule(rel); !ok {
				return fmt.Errorf("skill: %s links missing related rule %q", r.Path, rel)
			}
		}
		if len(r.Sources) == 0 {
			return fmt.Errorf("skill: %s has no Sources", r.Path)
		}
	}
	for _, name := range l.refOrder {
		if l.refs[name].Title == "" {
			return fmt.Errorf("skill: references/%s.md has no H1 title", name)
		}
	}
	return nil
}

// Markdown returns the skill body, frontmatter stripped.
func (s *Skill) Markdown() string { return strings.TrimSpace(s.Body) }

// Markdown returns the complete rule file, which is already self-describing.
func (r *Rule) Markdown() string { return strings.TrimSpace(r.Body) }

// Section returns one H2 section of the rule, trimmed.
func (r *Rule) Section(name string) string { return strings.TrimSpace(r.Sections[name]) }

// Markdown returns the reference body.
func (ref *Reference) Markdown() string { return strings.TrimSpace(ref.Body) }

// parseRule parses rules/NN-topic.md into a Rule and enforces the header shape.
func parseRule(path, raw string) (*Rule, error) {
	r := &Rule{Path: path, Body: strings.TrimSpace(raw), Sections: make(map[string]string)}
	r.ID = strings.TrimSuffix(strings.TrimPrefix(path, "rules/"), ".md")
	body := r.Body

	var title, header string
	for _, line := range strings.Split(body, "\n") {
		line = strings.TrimSpace(line)
		if title == "" && strings.HasPrefix(line, "# Rule:") {
			title = strings.TrimSpace(strings.TrimPrefix(line, "# Rule:"))
			continue
		}
		if title != "" && header == "" && line != "" {
			header = line
			break
		}
	}
	if title == "" {
		return nil, fmt.Errorf("skill: %s: first heading must be '# Rule: <title>'", path)
	}
	r.Title = title
	m := ruleHeaderRe.FindStringSubmatch(header)
	if m == nil {
		return nil, fmt.Errorf("skill: %s: line 3 must be '**Domain:** <domain> · **ID:** `<id>`'", path)
	}
	r.Domain = strings.ToLower(m[1])
	if m[2] != r.ID {
		return nil, fmt.Errorf("skill: %s: header ID %q does not match file name", path, m[2])
	}
	r.Sections = parseSections(body)
	for _, id := range linksIn(r.Sections["Related Rules"]) {
		if id != "" {
			r.Related = append(r.Related, id)
		}
	}
	for _, line := range strings.Split(r.Sections["Sources"], "\n") {
		if strings.HasPrefix(strings.TrimSpace(line), "- ") {
			r.Sources = append(r.Sources, strings.TrimSpace(strings.TrimPrefix(strings.TrimSpace(line), "- ")))
		}
	}
	return r, nil
}

var (
	ruleHeaderRe = regexp.MustCompile(`^\*\*Domain:\*\*\s*([a-z-]+)\s*·\s*\*\*ID:\*\*\s*` + "`" + `([^` + "`" + `]+)` + "`")
	linkRe       = regexp.MustCompile(`\[[^\]]*\]\(([^)]+)\)`)
	numberRe     = regexp.MustCompile(`^(\d+)-`)
	digitsRe     = regexp.MustCompile(`^(\d+)`)
)

// parseFrontmatter splits a YAML frontmatter block from the markdown body.
// Only the scalar keys the library needs are supported, which keeps the parser
// dependency-free; a real YAML parser would add weight for no benefit here.
func parseFrontmatter(raw string) (map[string]string, string, error) {
	raw = strings.ReplaceAll(raw, "\r\n", "\n")
	lines := strings.Split(raw, "\n")
	meta := make(map[string]string)
	if len(lines) == 0 || strings.TrimSpace(lines[0]) != "---" {
		return meta, raw, nil // no frontmatter is legal for rules
	}
	end := -1
	for i := 1; i < len(lines); i++ {
		if strings.TrimSpace(lines[i]) == "---" {
			end = i
			break
		}
	}
	if end == -1 {
		return nil, "", fmt.Errorf("unterminated frontmatter")
	}
	var key string
	for _, line := range lines[1:end] {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" || strings.HasPrefix(trimmed, "#") {
			continue
		}
		if strings.HasPrefix(line, " ") || strings.HasPrefix(line, "\t") {
			// Continuation of a multi-line scalar.
			if key != "" {
				meta[key] += " " + trimmed
			}
			continue
		}
		parts := strings.SplitN(line, ":", 2)
		if len(parts) != 2 {
			return nil, "", fmt.Errorf("bad frontmatter line %q", line)
		}
		key = strings.ToLower(strings.TrimSpace(parts[0]))
		meta[key] = strings.TrimSpace(parts[1])
	}
	body := strings.Join(lines[end+1:], "\n")
	for k, v := range meta {
		meta[k] = strings.Trim(strings.TrimSpace(v), `"'`)
	}
	return meta, body, nil
}

// parseSections maps H2 headings to their content. Text before the first H2 is
// kept under "".
func parseSections(body string) map[string]string {
	out := make(map[string]string)
	var current string
	var buf []string
	flush := func() {
		if current != "" || len(buf) > 0 {
			out[current] = strings.TrimSpace(strings.Join(buf, "\n"))
		}
	}
	for _, line := range strings.Split(body, "\n") {
		if strings.HasPrefix(line, "## ") {
			flush()
			current = strings.TrimSpace(strings.TrimPrefix(line, "## "))
			buf = nil
			continue
		}
		buf = append(buf, line)
	}
	flush()
	return out
}

// sectionText returns a named H2 section from a body, or "".
func sectionText(body, heading string) string {
	sections := parseSections(body)
	return sections[heading]
}

// linksIn extracts link targets from a markdown fragment and reduces them to
// bare rule IDs (drops directories and the .md extension).
func linksIn(fragment string) []string {
	var out []string
	for _, m := range linkRe.FindAllStringSubmatch(fragment, -1) {
		target := m[1]
		if strings.HasPrefix(target, "http") || strings.HasPrefix(target, "#") {
			continue
		}
		if i := strings.IndexAny(target, "#?"); i >= 0 {
			target = target[:i]
		}
		target = strings.TrimSuffix(target, ".md")
		target = strings.TrimPrefix(target, "./")
		if i := strings.LastIndex(target, "/"); i >= 0 {
			target = target[i+1:]
		}
		out = append(out, target)
	}
	return out
}

func ruleLinks(body string) []string {
	return dedupe(linksIn(sectionText(body, "Rules to apply")))
}

func referenceLinks(body string) []string {
	var out []string
	for _, m := range linkRe.FindAllStringSubmatch(body, -1) {
		target := m[1]
		if !strings.Contains(target, "references/") {
			continue
		}
		name := target[strings.LastIndex(target, "/")+1:]
		out = append(out, strings.TrimSuffix(name, ".md"))
	}
	return dedupe(out)
}

func firstHeading(body string) string {
	for _, line := range strings.Split(body, "\n") {
		if strings.HasPrefix(line, "# ") {
			return strings.TrimSpace(strings.TrimPrefix(line, "# "))
		}
	}
	return ""
}

func leadingNumber(id string) string {
	m := numberRe.FindStringSubmatch(id)
	if m == nil {
		return ""
	}
	return m[1]
}

// leadingDigits returns the number a query starts with, if any, so "24",
// "24-typographic-hierarchy" and "24 - typographic hierarchy" all resolve.
func leadingDigits(query string) string {
	m := digitsRe.FindStringSubmatch(query)
	if m == nil {
		return ""
	}
	return m[1]
}

func dedupe(in []string) []string {
	seen := make(map[string]bool, len(in))
	out := in[:0]
	for _, s := range in {
		if s == "" || seen[s] {
			continue
		}
		seen[s] = true
		out = append(out, s)
	}
	return out
}

// normalize lowercases and flattens punctuation so "Type Pairing",
// "type-pairing" and "type_pairing" compare equal.
func normalize(s string) string {
	s = strings.ToLower(s)
	return strings.Join(strings.FieldsFunc(s, func(r rune) bool {
		return !(r >= 'a' && r <= 'z') && !(r >= '0' && r <= '9')
	}), " ")
}

// tokenize splits text into lowercase words of 3+ characters, dropping a
// trailing plural "s" so "posters" matches "poster".
func tokenize(s string) []string {
	fields := strings.Fields(normalize(s))
	out := make([]string, 0, len(fields))
	for _, f := range fields {
		if len(f) < 3 || stopWords[f] {
			continue
		}
		if len(f) > 4 && strings.HasSuffix(f, "s") {
			f = strings.TrimSuffix(f, "s")
		}
		out = append(out, f)
	}
	return out
}

func uniqueTokens(s string) []string {
	seen := make(map[string]bool)
	var out []string
	for _, t := range tokenize(s) {
		if seen[t] {
			continue
		}
		seen[t] = true
		out = append(out, t)
	}
	return out
}

var stopWords = map[string]bool{
	"the": true, "and": true, "for": true, "with": true, "that": true,
	"this": true, "from": true, "into": true, "your": true, "you": true,
	"our": true, "their": true, "them": true, "then": true, "than": true,
	"when": true, "what": true, "where": true, "which": true, "while": true,
	"have": true, "has": true, "will": true, "would": true, "should": true,
	"can": true, "make": true, "need": true, "want": true, "using": true,
	"use": true, "about": true, "just": true, "like": true, "some": true,
	"not": true, "are": true, "but": true, "all": true, "any": true,
	"how": true, "who": true, "its": true, "it": true, "is": true,
}
