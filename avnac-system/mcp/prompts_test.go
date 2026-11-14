package mcp

import (
	"regexp"
	"strings"
	"testing"

	"Avnac/internal/skill"
)

var workflowRe = regexp.MustCompile(`## Workflow: ([a-z-]+)`)
var ruleURIRe = regexp.MustCompile("rules://([a-z0-9-]+)")

func workflowOf(t *testing.T, text string) string {
	t.Helper()
	m := workflowRe.FindStringSubmatch(text)
	if m == nil {
		t.Fatalf("prompt has no '## Workflow:' section:\n%s", firstLines(text, 12))
	}
	return m[1]
}

func firstLines(s string, n int) string {
	lines := strings.Split(s, "\n")
	if len(lines) > n {
		lines = lines[:n]
	}
	return strings.Join(lines, "\n")
}

func TestDesignGraphicPromptRoutesByTopic(t *testing.T) {
	cases := []struct {
		topic string
		want  string
	}{
		{"A2 gig poster for a jazz trio", "poster"},
		{"logo for a sourdough bakery", "logo"},
		{"12 column magazine spread for an architecture feature", "layout"},
		{"icon set for a weather app", "icon"},
	}
	for _, tc := range cases {
		text := designGraphicPrompt(tc.topic, "", "")
		got := workflowOf(t, text)
		if got != tc.want {
			t.Errorf("designGraphicPrompt(%q) routes to %q, want %q", tc.topic, got, tc.want)
		}
		if !strings.Contains(text, tc.topic) {
			t.Errorf("prompt text does not echo the topic %q", tc.topic)
		}
	}
}

func TestDesignGraphicPromptDefaults(t *testing.T) {
	text := designGraphicPrompt("Grand opening flyer for a ramen shop", "", "")
	if !strings.Contains(text, defaultCanvasSize) {
		t.Errorf("prompt does not state the no-size fallback %q", defaultCanvasSize)
	}
	if !strings.Contains(text, "## Before composing") {
		t.Error("prompt does not include the rule reading instruction")
	}
}

func TestEditCanvasPromptRoutesToEdit(t *testing.T) {
	text := editCanvasPrompt("change the color scheme to dark mode")
	if got := workflowOf(t, text); got != "edit" {
		t.Errorf("editCanvasPrompt routes to %q, want edit", got)
	}
	if !strings.Contains(text, "change the color scheme to dark mode") {
		t.Error("prompt does not echo the instruction")
	}
	if !strings.Contains(text, "Never recreate an existing design") {
		t.Error("prompt does not forbid recreating the design")
	}
}

func TestDesignAuditPromptRoutesToCritique(t *testing.T) {
	text := designAuditPrompt()
	if got := workflowOf(t, text); got != "critique" {
		t.Errorf("designAuditPrompt routes to %q, want critique", got)
	}
	for _, want := range []string{"annotated=true", "Verdict:", "get_canvas_summary"} {
		if !strings.Contains(text, want) {
			t.Errorf("audit prompt is missing %q", want)
		}
	}
}

// TestPromptsQuoteOnlyExistingRules is the drift guard: every rules:// URI a
// prompt emits must resolve in the library. A renamed rule breaks this test
// instead of silently handing the model a dead link.
func TestPromptsQuoteOnlyExistingRules(t *testing.T) {
	lib, err := skill.Default()
	if err != nil {
		t.Fatalf("skill.Default(): %v", err)
	}

	texts := []string{
		designGraphicPrompt("A2 gig poster for a jazz trio", "1080x1080", "risograph"),
		editCanvasPrompt("make the headline larger"),
		designAuditPrompt(),
	}
	for i, text := range texts {
		for _, m := range ruleURIRe.FindAllStringSubmatch(text, -1) {
			if _, ok := lib.Rule(m[1]); !ok {
				t.Errorf("prompt %d links missing rule %q", i, m[1])
			}
		}
		if len(ruleURIRe.FindAllString(text, -1)) == 0 {
			t.Errorf("prompt %d lists no rule URIs", i)
		}
	}
}

// TestPromptsStaySmall keeps prompts from becoming a second copy of the library.
// The workflow body is ~700 words; if a prompt grows past this the duplication
// instinct has crept back in.
func TestPromptsStaySmall(t *testing.T) {
	for name, text := range map[string]string{
		"design-graphic": designGraphicPrompt("webinar banner for a healthcare talk", "1920x1080", "clean corporate"),
		"edit-canvas":    editCanvasPrompt("recenter and enlarge the headline"),
		"design-audit":   designAuditPrompt(),
	} {
		if n := len(text); n > 14000 {
			t.Errorf("%s prompt is %d bytes, want <= 14000", name, n)
		}
	}
}
