package skill

import (
	"strings"
	"testing"
)

// testLibrary loads the embedded library once per test binary. Load is cheap
// enough to call directly, but sharing keeps failures focused on content.
func testLibrary(t *testing.T) *Library {
	t.Helper()
	lib, err := Load()
	if err != nil {
		t.Fatalf("Load() error: %v", err)
	}
	return lib
}

func TestLoadShape(t *testing.T) {
	lib := testLibrary(t)

	if lib.Root == nil {
		t.Fatal("Root is nil")
	}
	if got, want := lib.Root.Name, "avnac-graphic-design"; got != want {
		t.Errorf("root name = %q, want %q", got, want)
	}
	if lib.Root.Description == "" {
		t.Error("root description is empty")
	}
	if got, want := len(lib.SkillNames()), 21; got != want {
		t.Errorf("skills = %d, want %d", got, want)
	}
	if got := len(lib.RuleIDs()); got == 0 || got > MaxRules {
		t.Errorf("rules = %d, want 1..%d", got, MaxRules)
	}
	if got, want := len(lib.ReferenceNames()), 14; got != want {
		t.Errorf("references = %d, want %d", got, want)
	}
}

func TestValidate(t *testing.T) {
	if err := testLibrary(t).Validate(); err != nil {
		t.Fatalf("Validate() = %v", err)
	}
}

func TestEverySkillFolderIsRegistered(t *testing.T) {
	lib := testLibrary(t)
	entries, err := content.ReadDir(".")
	if err != nil {
		t.Fatal(err)
	}
	registered := make(map[string]bool, len(lib.SkillNames()))
	for _, name := range lib.SkillNames() {
		registered[name] = true
	}
	for _, e := range entries {
		if !e.IsDir() || e.Name() == "rules" || e.Name() == "references" {
			continue
		}
		if !registered[e.Name()] {
			t.Errorf("folder %q has a SKILL.md but is not registered under its folder name", e.Name())
		}
	}
}

func TestRuleLookupAcceptsNumberIDAndTitle(t *testing.T) {
	lib := testLibrary(t)

	want := "24-typographic-hierarchy"
	for _, query := range []string{"24", "24-typographic-hierarchy", "rules/24-typographic-hierarchy.md", "typographic hierarchy", "24 - typographic hierarchy"} {
		r, ok := lib.Rule(query)
		if !ok {
			t.Errorf("Rule(%q) not found", query)
			continue
		}
		if r.ID != want {
			t.Errorf("Rule(%q).ID = %q, want %q", query, r.ID, want)
		}
	}
	if _, ok := lib.Rule("no-such-rule"); ok {
		t.Error("Rule(no-such-rule) unexpectedly resolved")
	}
}

func TestRuleSectionsAreOrdered(t *testing.T) {
	lib := testLibrary(t)
	for _, id := range lib.RuleIDs() {
		r := lib.rules[id]
		last := -1
		for _, line := range strings.Split(r.Body, "\n") {
			if !strings.HasPrefix(line, "## ") {
				continue
			}
			heading := strings.TrimSpace(strings.TrimPrefix(line, "## "))
			idx := -1
			for i, want := range ruleSections {
				if want == heading {
					idx = i
					break
				}
			}
			if idx == -1 {
				t.Errorf("%s: unexpected section %q", r.ID, heading)
				continue
			}
			if idx < last {
				t.Errorf("%s: section %q is out of order", r.ID, heading)
			}
			last = idx
		}
	}
}

func TestRuleStartsWithRuleHeading(t *testing.T) {
	lib := testLibrary(t)
	for _, id := range lib.RuleIDs() {
		r := lib.rules[id]
		first := strings.TrimSpace(strings.SplitN(r.Body, "\n", 2)[0])
		if !strings.HasPrefix(first, "# Rule: ") {
			t.Errorf("%s: first line = %q, want '# Rule: <title>'", id, first)
		}
		if strings.ContainsAny(r.Title, "\n") {
			t.Errorf("%s: title contains a newline", id)
		}
	}
}

func TestNoDuplicateRuleTitles(t *testing.T) {
	lib := testLibrary(t)
	seen := make(map[string]string, len(lib.RuleIDs()))
	for _, id := range lib.RuleIDs() {
		r := lib.rules[id]
		key := normalize(r.Title)
		if other, dup := seen[key]; dup {
			t.Errorf("%s and %s share the title %q", other, id, r.Title)
		}
		seen[key] = id
	}
}

func TestRootLinksResolve(t *testing.T) {
	lib := testLibrary(t)
	for _, m := range linkRe.FindAllStringSubmatch(lib.Root.Body, -1) {
		target := m[1]
		if strings.HasPrefix(target, "http") || strings.HasPrefix(target, "#") {
			continue
		}
		if _, err := content.ReadFile(target); err != nil {
			t.Errorf("root SKILL.md links %q, which is not embedded", target)
		}
	}
}

func TestRoutePicksExpectedSkill(t *testing.T) {
	lib := testLibrary(t)

	cases := []struct {
		task string
		want string
	}{
		{"design an A2 gig poster for a jazz trio", "poster"},
		{"my logo disappears when it is 16 pixels wide", "logo"},
		{"set up bleed and crop marks for the printer", "print"},
		{"build a 12 column grid for a 32 page magazine", "layout"},
		{"pick a palette for a skincare brand", "palette"},
		{"the dashboard contrast is too low and the chart labels are unreadable", "visualize"},
		{"pair a serif with a geometric sans for a book cover", "typography"},
		{"draw a mascot and keep the whole set consistent", "illustrate"},
		{"make an icon set with a consistent stroke weight", "icon"},
		{"critique this layout before I send it to the client", "critique"},
		{"export a print-ready PDF and a web PNG", "export"},
	}
	for _, tc := range cases {
		got := lib.Route(tc.task, 3)
		if len(got) == 0 {
			t.Errorf("Route(%q) returned nothing", tc.task)
			continue
		}
		found := -1
		for i, r := range got {
			if r.Skill.Name == tc.want {
				found = i
				break
			}
		}
		if found == -1 {
			names := make([]string, len(got))
			for i, r := range got {
				names[i] = r.Skill.Name
			}
			t.Errorf("Route(%q) = %v, want %q in the top 3", tc.task, names, tc.want)
			continue
		}
		if found != 0 {
			t.Logf("Route(%q): %q ranked %d, not first (first = %q)", tc.task, tc.want, found+1, got[0].Skill.Name)
		}
	}
}

func TestRouteIsDeterministic(t *testing.T) {
	lib := testLibrary(t)
	first := lib.Route("minimal poster with a strong grid", 5)
	for i := 0; i < 5; i++ {
		next := lib.Route("minimal poster with a strong grid", 5)
		for j := range first {
			if first[j].Skill.Name != next[j].Skill.Name {
				t.Fatalf("route order changed between calls at %d", j)
			}
		}
	}
}

func TestSearchFindsRulesByContent(t *testing.T) {
	lib := testLibrary(t)
	hits := lib.Search("bleed and safe area", 5)
	if len(hits) == 0 {
		t.Fatal("Search(bleed and safe area) returned nothing")
	}
	if got := hits[0].Rule.ID; got != "82-bleed-trim-and-safe-areas" {
		t.Errorf("top hit = %q, want 82-bleed-trim-and-safe-areas", got)
	}
}

func TestPlanAssemblesReadingMaterial(t *testing.T) {
	lib := testLibrary(t)
	plan, err := lib.Plan("design a minimalist exhibition poster", 6)
	if err != nil {
		t.Fatalf("Plan() error: %v", err)
	}
	if plan.Skill == nil {
		t.Fatal("Plan().Skill is nil")
	}
	if len(plan.Rules) == 0 {
		t.Fatal("Plan().Rules is empty")
	}
	if len(plan.Rules) > len(plan.Skill.Rules)+6 {
		t.Errorf("Plan().Rules = %d, want <= %d (skill links + fill)", len(plan.Rules), len(plan.Skill.Rules)+6)
	}
	if !strings.Contains(plan.Markdown, plan.Skill.Body) {
		t.Error("Plan().Markdown does not contain the skill body")
	}
	for _, r := range plan.Rules {
		if !strings.Contains(plan.Markdown, r.Body) {
			t.Errorf("Plan().Markdown is missing rule %s", r.ID)
		}
	}
	for _, ref := range plan.References {
		if _, ok := lib.Reference(ref.Name); !ok {
			t.Errorf("Plan() returned unknown reference %q", ref.Name)
		}
	}
}

func TestPlanWithoutSkillRulesStillWorks(t *testing.T) {
	lib := testLibrary(t)
	plan, err := lib.Plan("something completely unrelated to design", 4)
	if err != nil {
		t.Fatalf("Plan() error: %v", err)
	}
	if plan.Skill == nil {
		t.Fatal("Plan().Skill is nil for an unrelated task")
	}
	if len(plan.Rules) < 3 {
		t.Fatalf("Plan().Rules = %d, want at least the skill's own links", len(plan.Rules))
	}
	// maxRules bounds the search fill, not the skill's own recommendations.
	if len(plan.Rules) > len(plan.Skill.Rules)+4 {
		t.Errorf("Plan().Rules = %d, want <= %d (skill links + fill)", len(plan.Rules), len(plan.Skill.Rules)+4)
	}
}

func TestRulesByDomain(t *testing.T) {
	lib := testLibrary(t)
	for _, domain := range []string{"typography", "color", "print", "ui", "history"} {
		if got := len(lib.RulesInDomain(domain)); got == 0 {
			t.Errorf("no rules in domain %q", domain)
		}
	}
	if got := len(lib.RulesInDomain("not-a-domain")); got != 0 {
		t.Errorf("RulesInDomain(not-a-domain) = %d, want 0", got)
	}
}

func TestSectionAccess(t *testing.T) {
	lib := testLibrary(t)
	r, ok := lib.Rule("24")
	if !ok {
		t.Fatal("rule 24 not found")
	}
	if got := r.Section("Techniques"); !strings.Contains(got, "Scale jump") {
		t.Errorf("Techniques section = %q, want it to mention the scale-jump technique", got)
	}
	if got := r.Section("Missing"); got != "" {
		t.Errorf("Section(Missing) = %q, want empty", got)
	}
}
