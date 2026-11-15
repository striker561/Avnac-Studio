package skill

import (
	"strings"
	"testing"
)

func TestGuideRoutesTaskAndRules(t *testing.T) {
	lib := testLibrary(t)

	g, ok := lib.Guide("design an A2 gig poster for a jazz trio, bold and typographic", 8)
	if !ok {
		t.Fatal("Guide() found nothing for a poster task")
	}
	if g.Skill == nil || g.Skill.Name != "poster" {
		t.Fatalf("skill = %v, want poster", g.Skill)
	}
	if len(g.Rules) == 0 || len(g.Rules) > 8 {
		t.Errorf("rules = %d, want 1..8", len(g.Rules))
	}
	var posterRule bool
	for _, r := range g.Rules {
		if strings.HasPrefix(r.ID, "24-") {
			posterRule = true
		}
	}
	if !posterRule {
		t.Errorf("rules = %v, want the poster workflow's typographic rule", g.RuleURIs())
	}
	if g.SkillURI() != "skill://poster" {
		t.Errorf("SkillURI = %q", g.SkillURI())
	}
	for _, uri := range g.RuleURIs() {
		if !strings.HasPrefix(uri, "rules://") {
			t.Errorf("rule URI %q is not a resource URI", uri)
		}
	}
}

func TestGuideRoutesVectorWork(t *testing.T) {
	lib := testLibrary(t)
	g, ok := lib.Guide("draw a fox as clean vector paths with mirrored ears", 6)
	if !ok {
		t.Fatal("Guide() found nothing for a vector task")
	}
	if g.Skill.Name != "vector" {
		t.Fatalf("skill = %q, want vector", g.Skill.Name)
	}
	if len(g.References) == 0 || g.ReferenceURIs()[0] != "references://vector-graphics" {
		t.Errorf("references = %v, want vector-graphics first", g.ReferenceURIs())
	}
}

func TestGuideRejectsUnrelatedTask(t *testing.T) {
	lib := testLibrary(t)
	// A single shared word can still produce a route (the explicit tool shows
	// it so the caller can judge), but it must never look confident enough to
	// volunteer itself onto a tool result.
	if g, ok := lib.Guide("compute the fibonacci sequence in rust", 6); ok && g.Confident() {
		t.Fatalf("Guide() was confident about %q for an unrelated task", g.Skill.Name)
	}
	if g, ok := lib.Guide("", 6); ok || g != nil {
		t.Error("Guide with an empty task should return nil, false")
	}
}

func TestGuideConfidence(t *testing.T) {
	lib := testLibrary(t)
	cases := []struct {
		task string
		want bool
	}{
		{"design an A2 gig poster for a jazz trio", true},             // named deliverable
		{"draw a fox as clean vector paths with mirrored ears", true}, // several content words
		{"bleed", false},                    // one strong word, no naming
		{"make the background blue", false}, // one content word
	}
	for _, tc := range cases {
		g, ok := lib.Guide(tc.task, 6)
		if !ok {
			t.Fatalf("Guide(%q) returned nothing", tc.task)
		}
		if got := g.Confident(); got != tc.want {
			t.Errorf("Guide(%q).Confident() = %v, want %v (matched %v)", tc.task, got, tc.want, g.Matched)
		}
	}
}

func TestGuideRespectsRuleLimit(t *testing.T) {
	lib := testLibrary(t)
	for _, limit := range []int{3, 5, 12} {
		g, ok := lib.Guide("build a brand guideline document for a bakery", limit)
		if !ok {
			t.Fatalf("Guide(limit=%d) found nothing", limit)
		}
		if len(g.Rules) > limit {
			t.Errorf("Guide(limit=%d) returned %d rules", limit, len(g.Rules))
		}
		if len(g.Rules) != len(g.RuleSources) {
			t.Errorf("rules and sources differ: %d vs %d", len(g.Rules), len(g.RuleSources))
		}
	}
}

func TestGuideIsDeterministic(t *testing.T) {
	lib := testLibrary(t)
	first, ok := lib.Guide("minimal swiss poster with a strong grid", 6)
	if !ok {
		t.Fatal("no guide")
	}
	for i := 0; i < 5; i++ {
		next, ok := lib.Guide("minimal swiss poster with a strong grid", 6)
		if !ok || next.Skill.Name != first.Skill.Name {
			t.Fatalf("run %d changed the skill", i)
		}
		if strings.Join(next.RuleURIs(), ",") != strings.Join(first.RuleURIs(), ",") {
			t.Fatalf("run %d changed the rule order", i)
		}
	}
}

func TestRuleChecksAreTaskShaped(t *testing.T) {
	lib := testLibrary(t)
	r, ok := lib.Rule("24-typographic-hierarchy")
	if !ok {
		t.Fatal("rule 24 missing")
	}
	checks := r.Checks()
	if len(checks) < 3 {
		t.Fatalf("rule 24 exposes %d checks", len(checks))
	}
	if !strings.HasPrefix(checks[0], "Level census — ") {
		t.Errorf("first check = %q, want the task label in front", checks[0])
	}
	for _, id := range lib.RuleIDs() {
		rule, _ := lib.Rule(id)
		if len(rule.Checks()) == 0 {
			t.Errorf("%s has no verification checks", id)
		}
	}
}

func TestSkillRuleNotesCarryTheQualifier(t *testing.T) {
	lib := testLibrary(t)
	poster, ok := lib.Skill("poster")
	if !ok {
		t.Fatal("poster skill missing")
	}
	note := poster.RuleNotes["38-cropping-and-framing"]
	if !strings.Contains(note, "when there is one image") {
		t.Errorf("poster note for 38 = %q, want the conditional qualifier", note)
	}
	if strings.HasSuffix(note, ".") {
		t.Errorf("note keeps its trailing period: %q", note)
	}
}
