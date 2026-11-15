package mcp

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"testing"

	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

// Resource-compliance eval. It answers one question: if an agent follows the
// protocol (call guide before composing, then read what it names), does the
// route exist, point at the right workflow, and carry enough to act on — or
// does it come back empty and teach the agent that skipping is free?
//
// What this measures: routing, payload cost, and resource resolution over a
// real in-memory MCP session. What it cannot measure: whether a model obeys.
// Obedience is a host-orchestration property; the only lever here is making the
// route cheap, correct and impossible to miss (see docs/resource-eval.md).

// guidePayloadBudget is the most a route may cost. The library's six routed
// rule bodies are ~40 KB; a route over half a kilobyte per rule would just
// recreate the reading problem the digest removed.
const guidePayloadBudget = 6000

type complianceCase struct {
	prompt string
	// want lists acceptable skills, best first. More than one means the brief
	// is genuinely ambiguous and either owner is defensible.
	want []string
}

var designPrompts = []complianceCase{
	{"design a promotional flyer for a Greek yogurt brand", []string{"poster"}},
	{"A2 gig poster for a jazz trio", []string{"poster"}},
	{"design a flyer for a yoga studio", []string{"poster", "create"}},
	{"design a logo for a coffee roastery", []string{"logo"}},
	{"build a brand guideline document for a bakery", []string{"brand"}},
	{"set up 3mm bleed and CMYK for the printer", []string{"print"}},
	{"design an Instagram story for a summer sale", []string{"create"}},
	{"fix the hierarchy on this landing page hero", []string{"ui"}},
	{"choose a color palette for a fintech app", []string{"palette"}},
	{"draw a fox logo as vector paths", []string{"vector"}},
	{"make a chart of quarterly revenue that is not misleading", []string{"visualize"}},
	{"package design for a tea box", []string{"packaging"}},
	{"critique my poster", []string{"critique"}},
}

var nonDesignPrompts = []string{
	"compute the fibonacci sequence in rust",
	"rename these files in the folder",
	"what is the capital of France",
}

func newEvalSession(t *testing.T) *sdkmcp.ClientSession {
	t.Helper()
	m := NewAvnacMCP(nil, nil, nil)
	m.RegisterTools(context.Background())
	if err := m.RegisterResources(); err != nil {
		t.Fatalf("register resources: %v", err)
	}
	ctx := context.Background()
	client := sdkmcp.NewClient(&sdkmcp.Implementation{Name: "compliance-eval", Version: "0"}, nil)
	t1, t2 := sdkmcp.NewInMemoryTransports()
	serverSession, err := m.server.Connect(ctx, t1, nil)
	if err != nil {
		t.Fatalf("server connect: %v", err)
	}
	session, err := client.Connect(ctx, t2, nil)
	if err != nil {
		t.Fatalf("client connect: %v", err)
	}
	t.Cleanup(func() {
		session.Close()
		serverSession.Close()
	})
	return session
}

func callGuide(t *testing.T, session *sdkmcp.ClientSession, task string) map[string]any {
	t.Helper()
	res, err := session.CallTool(context.Background(), &sdkmcp.CallToolParams{
		Name:      "guide",
		Arguments: map[string]any{"task": task},
	})
	if err != nil {
		t.Fatalf("guide(%q): %v", task, err)
	}
	if res.IsError {
		t.Fatalf("guide(%q) returned an error", task)
	}
	data, ok := res.StructuredContent.(map[string]any)
	if !ok {
		t.Fatalf("guide(%q) structured content is %T", task, res.StructuredContent)
	}
	return data
}

// asMaps normalizes a decoded JSON array: in-process calls hand back
// []map[string]any, while a real client sees []any.
func asMaps(value any) []map[string]any {
	switch typed := value.(type) {
	case []map[string]any:
		return typed
	case []any:
		out := make([]map[string]any, 0, len(typed))
		for _, item := range typed {
			if entry, ok := item.(map[string]any); ok {
				out = append(out, entry)
			}
		}
		return out
	}
	return nil
}

func TestResourceComplianceEval(t *testing.T) {
	session := newEvalSession(t)
	routed, failed := 0, 0
	largest := 0

	for _, tc := range designPrompts {
		data := callGuide(t, session, tc.prompt)
		encoded, _ := json.Marshal(data)
		if len(encoded) > largest {
			largest = len(encoded)
		}
		problems := []string{}
		if data["matched"] != true {
			problems = append(problems, "no route")
		}
		if data["confidence"] != "high" {
			problems = append(problems, "low confidence")
		}
		skillData, _ := data["skill"].(map[string]any)
		name, _ := skillData["name"].(string)
		allowed := false
		for _, want := range tc.want {
			if name == want {
				allowed = true
			}
		}
		if !allowed {
			problems = append(problems, fmt.Sprintf("skill %q, want %v", name, tc.want))
		}
		if checks := asMaps(data["checks"]); len(checks) == 0 {
			problems = append(problems, "no checks digest")
		}
		if gates := asMaps(data["gates"]); len(gates) == 0 {
			problems = append(problems, "no always-on gates")
		}
		if len(encoded) > guidePayloadBudget {
			problems = append(problems, fmt.Sprintf("payload %d bytes over the %d budget", len(encoded), guidePayloadBudget))
		}
		if _, exists := data["markdown"]; exists {
			problems = append(problems, "default route inlined the essays")
		}
		if len(problems) > 0 {
			failed++
			t.Errorf("%-58q -> %s", tc.prompt, strings.Join(problems, "; "))
			continue
		}
		routed++
	}

	t.Logf("design prompts routed: %d/%d, largest payload %d bytes (budget %d)",
		routed, len(designPrompts), largest, guidePayloadBudget)
	if largest > guidePayloadBudget {
		t.Errorf("largest payload %d exceeds the budget", largest)
	}
	if routed != len(designPrompts) {
		t.Errorf("%d design prompts did not get a usable route", len(designPrompts)-routed)
	}
}

func TestResourceComplianceIgnoresNonDesignWork(t *testing.T) {
	session := newEvalSession(t)
	for _, prompt := range nonDesignPrompts {
		data := callGuide(t, session, prompt)
		if data["confidence"] == "high" {
			t.Errorf("%q was routed with high confidence to %v", prompt, data["skill"])
		}
	}
}

func TestResourceComplianceResolvesEveryNamedURI(t *testing.T) {
	session := newEvalSession(t)
	data := callGuide(t, session, "design a promotional flyer for a Greek yogurt brand")

	skillData, _ := data["skill"].(map[string]any)
	uris := []string{designEntryURI, designRuleIndexURI, skillData["uri"].(string)}
	for _, entry := range asMaps(data["rules"]) {
		uris = append(uris, entry["uri"].(string))
	}
	for _, check := range asMaps(data["checks"]) {
		uris = append(uris, "rules://"+check["rule"].(string))
	}

	for _, uri := range uris {
		res, err := session.ReadResource(context.Background(), &sdkmcp.ReadResourceParams{URI: uri})
		if err != nil {
			t.Errorf("read %s: %v", uri, err)
			continue
		}
		if len(res.Contents) == 0 || strings.TrimSpace(res.Contents[0].Text) == "" {
			t.Errorf("%s resolved to an empty body", uri)
		}
	}
	t.Logf("resolved %d URIs from one route", len(uris))
}
