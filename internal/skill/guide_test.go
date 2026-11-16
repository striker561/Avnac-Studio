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
	// The ops receipt is deliberately first: a guide prints the first two
	// checks, and the command to run is more useful there than the third
	// description of what to look at.
	if !strings.HasPrefix(checks[0], "Ops receipt — ") {
		t.Errorf("first check = %q, want the ops receipt in front", checks[0])
	}
	if !strings.Contains(strings.Join(checks, "\n"), "Level census — ") {
		t.Errorf("checks = %v, want the Level census task label kept", checks)
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

func TestGatesAreParsedFromTheEntryDocument(t *testing.T) {
	lib := testLibrary(t)
	gates := lib.Gates()
	if len(gates) != 6 {
		t.Fatalf("gates = %d, want the six always-on checks", len(gates))
	}
	for i, gate := range gates {
		if gate.Check == "" || strings.Contains(gate.Check, "**") {
			t.Errorf("gate %d is not a plain line: %q", i, gate.Check)
		}
		if len(gate.Rules) == 0 {
			t.Errorf("gate %d names no rule: %q", i, gate.Check)
		}
		for _, id := range gate.Rules {
			if _, ok := lib.Rule(id); !ok {
				t.Errorf("gate %d links missing rule %q", i, id)
			}
		}
	}
	if !strings.Contains(gates[4].Check, "Check it degraded") {
		t.Errorf("gate 5 = %q, want the degraded-output check", gates[4].Check)
	}
}
