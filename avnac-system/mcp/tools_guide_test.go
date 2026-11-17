package mcp

import (
	"context"
	"strings"
	"testing"

	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

func TestGuideToolRoutesAndInlines(t *testing.T) {
	m := NewAvnacMCP(nil, nil, nil)
	m.RegisterTools(context.Background())

	ctx := context.Background()
	client := sdkmcp.NewClient(&sdkmcp.Implementation{Name: "guide-test", Version: "0"}, nil)
	t1, t2 := sdkmcp.NewInMemoryTransports()
	serverSession, err := m.server.Connect(ctx, t1, nil)
	if err != nil {
		t.Fatalf("server connect: %v", err)
	}
	defer serverSession.Close()
	session, err := client.Connect(ctx, t2, nil)
	if err != nil {
		t.Fatalf("client connect: %v", err)
	}
	defer session.Close()

	res, err := session.CallTool(ctx, &sdkmcp.CallToolParams{
		Name:      "guide",
		Arguments: map[string]any{"task": "design an A2 gig poster for a jazz trio"},
	})
	if err != nil {
		t.Fatalf("guide call: %v", err)
	}
	if res.IsError {
		t.Fatalf("guide returned an error: %+v", res.Content)
	}
	data, ok := res.StructuredContent.(map[string]any)
	if !ok {
		t.Fatalf("guide structured content is %T", res.StructuredContent)
	}
	if data["matched"] != true {
		t.Fatalf("guide did not match a poster task: %v", data)
	}
	skillData, _ := data["skill"].(map[string]any)
	if skillData["uri"] != "skill://poster" {
		t.Errorf("skill = %v, want skill://poster", skillData)
	}
	if data["confidence"] != "high" {
		t.Errorf("confidence = %v, want high", data["confidence"])
	}
	rules, _ := data["rules"].([]any)
	if len(rules) == 0 {
		t.Fatal("guide returned no rules")
	}
	first, _ := rules[0].(map[string]any)
	if !strings.HasPrefix(first["uri"].(string), "rules://") {
		t.Errorf("rule URI = %v", first["uri"])
	}

	// inline=true returns the reading material itself.
	res, err = session.CallTool(ctx, &sdkmcp.CallToolParams{
		Name:      "guide",
		Arguments: map[string]any{"task": "design an A2 gig poster for a jazz trio", "inline": true},
	})
	if err != nil {
		t.Fatalf("inline guide call: %v", err)
	}
	data, _ = res.StructuredContent.(map[string]any)
	markdown, _ := data["markdown"].(string)
	if !strings.Contains(markdown, "# ") || !strings.Contains(markdown, "## Core Principles") {
		t.Error("inline guide did not include the workflow and rules")
	}
}

func TestGuideToolFlagsLowConfidence(t *testing.T) {
	m := NewAvnacMCP(nil, nil, nil)
	_, data, err := m.handleGuide(map[string]any{"task": "compute the fibonacci sequence in rust"})
	if err != nil {
		t.Fatalf("handleGuide: %v", err)
	}
	payload := data.(map[string]any)
	if payload["matched"] != true {
		t.Fatalf("expected a (flagged) match, got %v", payload)
	}
	if payload["confidence"] != "low" {
		t.Errorf("confidence = %v, want low", payload["confidence"])
	}
	if payload["matchedTokens"] == nil || payload["candidates"] == nil {
		t.Errorf("low-confidence payload must expose why it matched: %v", payload)
	}
}

func TestGuideToolNoMatchPointsAtEntry(t *testing.T) {
	m := NewAvnacMCP(nil, nil, nil)
	_, data, err := m.handleGuide(map[string]any{"task": "xyzzy plugh quux"})
	if err != nil {
		t.Fatalf("handleGuide: %v", err)
	}
	payload := data.(map[string]any)
	if payload["matched"] != false {
		t.Errorf("unrelated task matched: %v", payload)
	}
	if payload["entry"] != designEntryURI || payload["rulesIndex"] != designRuleIndexURI {
		t.Errorf("no-match payload = %v, want entry and rule index", payload)
	}
}

func TestGuideToolRequiresTask(t *testing.T) {
	m := NewAvnacMCP(nil, nil, nil)
	if _, _, err := m.handleGuide(map[string]any{}); err == nil || !strings.Contains(err.Error(), "requires task") {
		t.Errorf("error = %v, want a task requirement", err)
	}
}

func TestGuideToolCapsRuleLimit(t *testing.T) {
	m := NewAvnacMCP(nil, nil, nil)
	_, data, err := m.handleGuide(map[string]any{"task": "build a brand guideline document for a bakery", "limit": 50})
	if err != nil {
		t.Fatal(err)
	}
	rules, _ := data.(map[string]any)["rules"].([]map[string]any)
	if len(rules) > 12 {
		t.Errorf("rules = %d, want <= 12", len(rules))
	}
}

func TestAttachGuideOnCompositionResults(t *testing.T) {
	m := NewAvnacMCP(nil, nil, nil)
	response := map[string]any{"success": true}
	m.attachGuide(response, map[string]any{
		"name": "Blue Note jazz poster",
		"elements": []any{
			map[string]any{"type": "text", "text": "Blue Note jazz trio, live"},
			map[string]any{"type": "text", "text": "Friday 7pm"},
		},
	})
	guide, ok := response["guide"].(map[string]any)
	if !ok {
		t.Fatalf("composition result has no guide: %v", response)
	}
	skillData, _ := guide["skill"].(map[string]any)
	if skillData["uri"] == "" {
		t.Error("automatic guide has no skill URI")
	}
}

func TestAttachGuideSkipsWeakAndNonDesignPayloads(t *testing.T) {
	cases := []map[string]any{
		{"elements": []any{map[string]any{"type": "rect"}}},
		{"padding": 8},
		{"elements": []any{map[string]any{"type": "text", "text": "OK"}}},
	}
	m := NewAvnacMCP(nil, nil, nil)
	for i, payload := range cases {
		response := map[string]any{"success": true}
		m.attachGuide(response, payload)
		if _, exists := response["guide"]; exists {
			t.Errorf("payload %d got a guide: %v", i, response["guide"])
		}
	}
}

func TestAttachGuideNeverOverwritesOrDecoratesErrors(t *testing.T) {
	m := NewAvnacMCP(nil, nil, nil)
	existing := map[string]any{"guide": "keep-me"}
	m.attachGuide(existing, map[string]any{"name": "Ramones tribute poster"})
	if existing["guide"] != "keep-me" {
		t.Error("attachGuide overwrote an existing guide")
	}
	failed := map[string]any{"error": "no scene"}
	m.attachGuide(failed, map[string]any{"name": "Ramones tribute poster"})
	if _, exists := failed["guide"]; exists {
		t.Error("attachGuide decorated an error payload")
	}
}

func TestOpDispatcherAttachesGuide(t *testing.T) {
	var got map[string]any
	h := opDispatcher(NewAvnacMCP(nil, nil, nil), "elements", map[string]string{"render": "render_elements"}, map[string]toolHandler{
		"render_elements": func(_ context.Context, _ *sdkmcp.CallToolRequest, raw map[string]any) (*sdkmcp.CallToolResult, any, error) {
			got = map[string]any{"success": true}
			return nil, got, nil
		},
	})
	_, _, err := h(context.Background(), nil, map[string]any{
		"op":   "render",
		"name": "Blue Note jazz poster",
		"elements": []any{
			map[string]any{"type": "text", "text": "Blue Note jazz trio, live"},
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	if _, ok := got["guide"]; !ok {
		t.Error("op dispatcher did not attach a guide to a composition result")
	}
}

// An explicit guide is the route the agent asked for. A composition result's
// inferred guide may fill an empty slot, but it must not replace that route:
// validate quotes the route back, and an inferred "illustrate" from the words
// "series"/"rule" made a print run's readNext look irrelevant.
func TestExplicitGuideIsNotOverwrittenByComposition(t *testing.T) {
	m := NewAvnacMCP(nil, nil, nil)
	if _, _, err := m.handleGuide(map[string]any{"task": "design an A2 gig poster for a jazz trio"}); err != nil {
		t.Fatalf("handleGuide: %v", err)
	}
	response := map[string]any{"success": true}
	m.attachGuide(response, map[string]any{"name": "Brand guidelines for a bakery"})
	if _, exists := response["guide"]; exists {
		t.Error("composition attached a second guide over the explicit route")
	}
	m.guideMu.Lock()
	route, explicit := m.guideRoute, m.guideExplicit
	m.guideMu.Unlock()
	if route == nil || route.Skill.Name != "poster" || !explicit {
		t.Errorf("route = %v explicit = %v, want the poster route", route, explicit)
	}
}

// With no explicit route, the composition guide is the only route there is.
// It may be used, but the receipt says so instead of presenting it as fetched.
func TestInferredGuideReceiptIsLabelled(t *testing.T) {
	m := NewAvnacMCP(nil, nil, nil)
	response := map[string]any{"success": true}
	m.attachGuide(response, map[string]any{"name": "Blue Note jazz poster"})
	if _, exists := response["guide"]; !exists {
		t.Fatal("composition result carries no inferred guide")
	}
	validated := map[string]any{"success": true}
	m.attachGuideReceipt(validated)
	receipt, ok := validated["guideReceipt"].(map[string]any)
	if !ok {
		t.Fatalf("validate result has no receipt: %v", validated)
	}
	if receipt["skill"] != "skill://poster" {
		t.Errorf("receipt skill = %v, want skill://poster", receipt["skill"])
	}
	if receipt["source"] != "inferred" {
		t.Errorf("receipt source = %v, want inferred", receipt["source"])
	}
}

// A new guide call with low confidence means the task has moved on. The old
// route must not survive to be quoted at the next validate.
func TestLowConfidenceGuideClearsStaleRoute(t *testing.T) {
	m := NewAvnacMCP(nil, nil, nil)
	if _, _, err := m.handleGuide(map[string]any{"task": "design an A2 gig poster for a jazz trio"}); err != nil {
		t.Fatalf("handleGuide: %v", err)
	}
	if _, _, err := m.handleGuide(map[string]any{"task": "Simple test badge: near-black full-artboard square 400x400, white uppercase TOOL CHECK, 4px orange border"}); err != nil {
		t.Fatalf("low-confidence handleGuide: %v", err)
	}
	m.guideMu.Lock()
	route, explicit, sig := m.guideRoute, m.guideExplicit, m.guideSig
	m.guideMu.Unlock()
	if route != nil || explicit || sig != "" {
		t.Errorf("route = %v explicit = %v sig = %q, want the stale route cleared", route, explicit, sig)
	}
}

func TestGuidePayloadShipsVerificationDigests(t *testing.T) {
	m := NewAvnacMCP(nil, nil, nil)
	_, data, err := m.handleGuide(map[string]any{"task": "design an A2 gig poster for a jazz trio"})
	if err != nil {
		t.Fatalf("handleGuide: %v", err)
	}
	payload := data.(map[string]any)
	checks, _ := payload["checks"].([]map[string]any)
	rules, _ := payload["rules"].([]map[string]any)
	if len(checks) != len(rules) {
		t.Fatalf("checks = %d rules, want every routed rule (%d)", len(checks), len(rules))
	}
	first := checks[0]
	if first["rule"] != "24-typographic-hierarchy" {
		t.Errorf("first digest rule = %v, want the poster's typographic rule", first["rule"])
	}
	if note, _ := first["applies"].(string); note == "" {
		t.Error("digest dropped the workflow's qualifier for the rule")
	}
	lines, _ := first["checks"].([]string)
	if len(lines) == 0 || !strings.Contains(lines[0], "Ops receipt") {
		t.Errorf("digest lines = %v, want the ops receipt first", lines)
	}
	if !strings.Contains(strings.Join(lines, "\n"), "Level census") {
		t.Errorf("digest lines = %v, want the rule's own Verification items", lines)
	}
	if _, exists := payload["moreChecks"]; exists {
		t.Error("moreChecks is stale: every routed rule now carries its checks")
	}
	// The payload stays cheap to read: every rule, at most two lines each.
	for _, entry := range checks {
		if n := len(entry["checks"].([]string)); n > 2 {
			t.Errorf("rule %v ships %d checks, want at most 2", entry["rule"], n)
		}
	}
}

// The router reads the joined task text left to right, so the order the
// payload's keys are walked in changes which skill matches. Go randomises map
// iteration; textKeyRank pins the order and keeps attachment reproducible.
func TestTaskTextIsStableAcrossRuns(t *testing.T) {
	payload := map[string]any{
		"name": "Blue Note jazz poster",
		"elements": []any{
			map[string]any{"type": "text", "text": "Blue Note jazz trio, live"},
		},
	}
	first := taskTextFromPayload(payload)
	if !strings.HasPrefix(first, "Blue Note jazz poster") {
		t.Fatalf("task text = %q, want the name first", first)
	}
	for i := 0; i < 20; i++ {
		if got := taskTextFromPayload(payload); got != first {
			t.Fatalf("run %d = %q, want %q", i, got, first)
		}
	}
}

func TestAttachGuideStampsARouteOnce(t *testing.T) {
	m := NewAvnacMCP(nil, nil, nil)
	payload := map[string]any{
		"name":     "Blue Note jazz poster",
		"elements": []any{map[string]any{"type": "text", "text": "Blue Note jazz trio, live"}},
	}
	first := map[string]any{"success": true}
	m.attachGuide(first, payload)
	if _, ok := first["guide"]; !ok {
		t.Fatal("first composition result carries no guide")
	}
	second := map[string]any{"success": true}
	m.attachGuide(second, payload)
	if _, ok := second["guide"]; ok {
		t.Error("the same route was stamped twice; a repeated guide is wallpaper")
	}
	other := map[string]any{"success": true}
	m.attachGuide(other, map[string]any{"name": "brand guidelines for a bakery"})
	if _, ok := other["guide"]; !ok {
		t.Error("a different route was not stamped")
	}
}

func TestValidateReceiptReportsCheckedAndPendingRules(t *testing.T) {
	m := NewAvnacMCP(nil, nil, nil)
	if _, _, err := m.handleGuide(map[string]any{"task": "design an A2 gig poster for a jazz trio"}); err != nil {
		t.Fatalf("handleGuide: %v", err)
	}
	response := map[string]any{"success": true, "checks": []any{
		map[string]any{"id": "level_census", "rule": "24-typographic-hierarchy", "status": "warn"},
		map[string]any{"id": "margin_ladder", "rule": "08-negative-space", "status": "pass"},
	}}
	m.attachGuideReceipt(response)
	receipt, ok := response["guideReceipt"].(map[string]any)
	if !ok {
		t.Fatalf("validate result has no receipt: %v", response)
	}
	if receipt["skill"] != "skill://poster" {
		t.Errorf("receipt skill = %v", receipt["skill"])
	}
	if receipt["source"] != "explicit" {
		t.Errorf("receipt source = %v, want explicit", receipt["source"])
	}
	checked := receipt["checked"].([]string)
	if len(checked) != 2 || checked[0] != "24-typographic-hierarchy" || checked[1] != "08-negative-space" {
		t.Errorf("checked = %v, want the two inferred rules", checked)
	}
	pending := receipt["pending"].([]string)
	if len(pending) == 0 {
		t.Error("pending is empty; rules validate cannot measure must stay visible")
	}
	for _, id := range pending {
		if strings.HasPrefix(id, "24-") || strings.HasPrefix(id, "08-") {
			t.Errorf("rule %s is both checked and pending", id)
		}
	}
}

func TestReceiptIsSilentWithoutARoute(t *testing.T) {
	m := NewAvnacMCP(nil, nil, nil)
	response := map[string]any{"success": true}
	m.attachGuideReceipt(response)
	if _, ok := response["guideReceipt"]; ok {
		t.Error("receipt attached without a routed guide")
	}
}

func TestGuideShipsAlwaysOnGatesOutsideTheRoute(t *testing.T) {
	m := NewAvnacMCP(nil, nil, nil)
	_, data, err := m.handleGuide(map[string]any{"task": "design an A2 gig poster for a jazz trio"})
	if err != nil {
		t.Fatalf("handleGuide: %v", err)
	}
	gates, _ := data.(map[string]any)["gates"].([]map[string]any)
	if len(gates) == 0 {
		t.Fatal("route carries no always-on gates")
	}
	found := false
	for _, gate := range gates {
		if len(gate["rules"].([]string)) == 0 {
			t.Errorf("gate has no rules: %v", gate)
		}
		for _, id := range gate["rules"].([]string) {
			if strings.HasPrefix(id, "113-") {
				found = true
			}
		}
	}
	if !found {
		t.Error("the poster route omits 113; its gate must still arrive with the route")
	}
}

func TestGuideSkipsGatesTheRouteAlreadyCovers(t *testing.T) {
	m := NewAvnacMCP(nil, nil, nil)
	_, data, err := m.handleGuide(map[string]any{"task": "draw a fox as clean vector paths with mirrored ears"})
	if err != nil {
		t.Fatalf("handleGuide: %v", err)
	}
	gates, _ := data.(map[string]any)["gates"].([]map[string]any)
	for _, gate := range gates {
		for _, id := range gate["rules"].([]string) {
			if strings.HasPrefix(id, "125-") {
				t.Errorf("vector route repeats the vector gate: %v", gate)
			}
		}
	}
}

func TestReceiptNamesTheRuleThatOwnsAFailingCheck(t *testing.T) {
	m := NewAvnacMCP(nil, nil, nil)
	if _, _, err := m.handleGuide(map[string]any{"task": "design an A2 gig poster for a jazz trio"}); err != nil {
		t.Fatalf("handleGuide: %v", err)
	}
	response := map[string]any{"success": true, "checks": []any{
		map[string]any{"id": "alignment", "rule": "07-alignment-and-proximity", "status": "warn"},
		map[string]any{"id": "margin_ladder", "rule": "08-negative-space", "status": "pass"},
	}}
	m.attachGuideReceipt(response)
	receipt := response["guideReceipt"].(map[string]any)
	next, _ := receipt["readNext"].([]map[string]any)
	if len(next) != 1 {
		t.Fatalf("readNext = %v, want the one failing rule outside the route", next)
	}
	if next[0]["rule"] != "rules://07-alignment-and-proximity" || next[0]["check"] != "alignment" {
		t.Errorf("readNext entry = %v", next[0])
	}
	if next[0]["title"] == "" {
		t.Error("readNext entry has no title")
	}
}

func TestReceiptDoesNotAskForRulesAlreadyRouted(t *testing.T) {
	m := NewAvnacMCP(nil, nil, nil)
	if _, _, err := m.handleGuide(map[string]any{"task": "design an A2 gig poster for a jazz trio"}); err != nil {
		t.Fatalf("handleGuide: %v", err)
	}
	response := map[string]any{"success": true, "checks": []any{
		map[string]any{"id": "margin_ladder", "rule": "08-negative-space", "status": "warn"},
	}}
	m.attachGuideReceipt(response)
	receipt := response["guideReceipt"].(map[string]any)
	if next, ok := receipt["readNext"].([]map[string]any); ok && len(next) > 0 {
		t.Errorf("readNext asked for a routed rule: %v", next)
	}
}

func TestCompositionWithoutARouteSaysSo(t *testing.T) {
	m := NewAvnacMCP(nil, nil, nil)
	first := map[string]any{"success": true}
	m.attachGuide(first, map[string]any{"elements": []any{map[string]any{"type": "rect"}}})
	if _, ok := first["guideMissing"]; !ok {
		t.Fatal("a composition with no route did not report the omission")
	}
	if _, _, err := m.handleGuide(map[string]any{"task": "design an A2 gig poster for a jazz trio"}); err != nil {
		t.Fatal(err)
	}
	second := map[string]any{"success": true}
	m.attachGuide(second, map[string]any{"elements": []any{map[string]any{"type": "rect"}}})
	if _, ok := second["guideMissing"]; ok {
		t.Error("the nudge persisted after a route was fetched")
	}
}
