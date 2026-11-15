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

func TestGuidePayloadShipsVerificationDigests(t *testing.T) {
	m := NewAvnacMCP(nil, nil, nil)
	_, data, err := m.handleGuide(map[string]any{"task": "design an A2 gig poster for a jazz trio"})
	if err != nil {
		t.Fatalf("handleGuide: %v", err)
	}
	payload := data.(map[string]any)
	checks, _ := payload["checks"].([]map[string]any)
	if len(checks) != guideDigestRules {
		t.Fatalf("digest = %d rules, want %d", len(checks), guideDigestRules)
	}
	first := checks[0]
	if first["rule"] != "24-typographic-hierarchy" {
		t.Errorf("first digest rule = %v, want the poster's typographic rule", first["rule"])
	}
	if note, _ := first["applies"].(string); note == "" {
		t.Error("digest dropped the workflow's qualifier for the rule")
	}
	lines, _ := first["checks"].([]string)
	if len(lines) == 0 || !strings.Contains(lines[0], "Level census") {
		t.Errorf("digest lines = %v, want the rule's own Verification items", lines)
	}
	if payload["moreChecks"] != len(payload["rules"].([]map[string]any))-guideDigestRules {
		t.Errorf("moreChecks = %v, want the undigested remainder", payload["moreChecks"])
	}
	// The digest must be cheap enough to read: three rules, two lines each.
	for _, entry := range checks {
		if n := len(entry["checks"].([]string)); n > 2 {
			t.Errorf("rule %v ships %d checks, want at most 2", entry["rule"], n)
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
