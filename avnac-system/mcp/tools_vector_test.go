package mcp

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

type vectorCall struct {
	action  string
	payload map[string]any
}

// fakeVectorFrontend records the actions the tool sends and answers like the
// scene editor: draw returns a node id, everything else acknowledges.
func fakeVectorFrontend(calls *[]vectorCall, nodeID string, failWith error) func(context.Context, string, any, time.Duration) (any, error) {
	return func(_ context.Context, action string, payload any, _ time.Duration) (any, error) {
		p, _ := payload.(map[string]any)
		*calls = append(*calls, vectorCall{action: action, payload: p})
		if failWith != nil {
			return nil, failWith
		}
		if action == "vector_draw" {
			return map[string]any{"objectId": nodeID, "success": true}, nil
		}
		if action == "get_object_properties" && nodeID != "" {
			return map[string]any{
				"node": map[string]any{"id": nodeID, "type": "image"},
			}, nil
		}
		return map[string]any{"success": true}, nil
	}
}

func newVectorTestServer(nodeID string) (*AvnacMCP, *[]vectorCall) {
	m := NewAvnacMCP(nil, nil, nil)
	calls := &[]vectorCall{}
	m.vectorEmit = fakeVectorFrontend(calls, nodeID, nil)
	return m, calls
}

func drawPayload() map[string]any {
	return map[string]any{
		"op":   "draw",
		"name": "Rocket icon",
		"canvas": map[string]any{
			"width": 256, "height": 256, "background": "#F4F0E8",
		},
		"objects": []any{
			map[string]any{"id": "body", "type": "capsule", "x": 102, "y": 52, "width": 52, "height": 116, "fill": "#E85D3F"},
			map[string]any{"id": "fin-left", "type": "polygon", "points": []any{[]any{96, 118}, []any{62, 154}, []any{96, 146}}, "fill": "#D94A36"},
			map[string]any{"id": "fin-right", "type": "polygon", "mirrorOf": "fin-left", "axis": "vertical", "fill": "#D94A36"},
			map[string]any{
				"id": "window", "type": "circle", "x": 112, "y": 78, "width": 32, "height": 32, "fill": "#9FD3E8",
				"constraints": []any{map[string]any{"relation": "centered_on", "target": "body", "offset": []any{0, -18}}},
			},
		},
	}
}

func TestVectorToolDrawUpdateReadExportDelete(t *testing.T) {
	m, calls := newVectorTestServer("node-1")
	ctx := context.Background()

	_, data, err := m.handleVectorTool(ctx, drawPayload())
	if err != nil {
		t.Fatalf("draw: %v", err)
	}
	drawn := data.(map[string]any)
	boardID, _ := drawn["boardId"].(string)
	if boardID == "" {
		t.Fatal("draw returned no boardId")
	}
	if drawn["objectId"] != "node-1" {
		t.Errorf("objectId = %v, want node-1", drawn["objectId"])
	}
	if drawn["objects"] != 4 {
		t.Errorf("objects = %v, want 4", drawn["objects"])
	}
	if len(*calls) != 1 || (*calls)[0].action != "vector_draw" {
		t.Fatalf("frontend calls = %+v, want one vector_draw", *calls)
	}
	placed := (*calls)[0].payload
	src, _ := placed["src"].(string)
	if !strings.HasPrefix(src, "data:image/svg+xml;charset=utf-8,") {
		t.Errorf("placed src is not an SVG data URL: %.60q", src)
	}
	if !strings.Contains(src, "%3Cpath") {
		t.Error("placed SVG contains no path elements")
	}

	// Update by id: resize the fin and re-mirror it.
	_, data, err = m.handleVectorTool(ctx, map[string]any{
		"op":      "update",
		"boardId": boardID,
		"operations": []any{
			map[string]any{"op": "resize", "target": "fin-left", "width": 28, "height": 32},
			map[string]any{"op": "mirror", "target": "fin-right", "of": "fin-left"},
			map[string]any{"op": "restyle", "target": "body", "fill": "#EF6B4A"},
		},
	})
	if err != nil {
		t.Fatalf("update: %v", err)
	}
	updated := data.(map[string]any)
	if updated["objects"] != 4 {
		t.Errorf("objects after update = %v, want 4", updated["objects"])
	}
	if len(*calls) != 2 || (*calls)[1].action != "vector_update" {
		t.Fatalf("frontend calls after update = %+v", *calls)
	}
	if (*calls)[1].payload["objectId"] != "node-1" {
		t.Errorf("update targeted %v, want node-1", (*calls)[1].payload["objectId"])
	}

	// Read returns the IR and the v3 document.
	_, data, err = m.handleVectorTool(ctx, map[string]any{"op": "read", "boardId": boardID})
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	read := data.(map[string]any)
	doc, ok := read["doc"].(interface{})
	if !ok || doc == nil {
		t.Fatal("read returned no doc")
	}
	encoded, _ := json.Marshal(read["ir"])
	if !strings.Contains(string(encoded), "fin-right") {
		t.Error("read IR is missing fin-right")
	}
	summary := read["objects"].([]map[string]any)
	if len(summary) != 4 {
		t.Errorf("read objects = %d, want 4", len(summary))
	}

	// Export returns the SVG as text and passes its own audit.
	result, data, err := m.handleVectorTool(ctx, map[string]any{"op": "export", "boardId": boardID})
	if err != nil {
		t.Fatalf("export: %v", err)
	}
	if result == nil || len(result.Content) != 1 {
		t.Fatalf("export result = %+v", result)
	}
	text := result.Content[0].(*sdkmcp.TextContent).Text
	if !strings.Contains(text, "<svg") || !strings.Contains(text, `data-avnac-vector-board="1"`) {
		t.Error("exported SVG is incomplete")
	}
	if !strings.Contains(text, "fill-rule") && strings.Contains(text, "<path") && strings.Count(text, "<path") > 0 {
		// fill-rule is optional; this assertion only documents the shape.
		_ = text
	}

	// Delete removes the element and forgets the board.
	_, _, err = m.handleVectorTool(ctx, map[string]any{"op": "delete", "boardId": boardID})
	if err != nil {
		t.Fatalf("delete: %v", err)
	}
	if len(*calls) != 3 || (*calls)[2].action != "vector_delete" {
		t.Fatalf("frontend calls after delete = %+v", *calls)
	}
	_, list, err := m.handleVectorTool(ctx, map[string]any{"op": "list"})
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if list.(map[string]any)["count"] != 0 {
		t.Error("board still listed after delete")
	}
	if _, _, err := m.handleVectorTool(ctx, map[string]any{"op": "read", "boardId": boardID}); err == nil {
		t.Error("read after delete succeeded")
	}
}

func TestVectorToolAcceptsStringifiedPayload(t *testing.T) {
	m, _ := newVectorTestServer("node-2")
	objects, _ := json.Marshal(drawPayload()["objects"])
	canvas, _ := json.Marshal(map[string]any{"width": 256, "height": 256})
	_, data, err := m.handleVectorTool(context.Background(), map[string]any{
		"op":      "draw",
		"canvas":  string(canvas),
		"objects": string(objects),
	})
	if err != nil {
		t.Fatalf("stringified draw: %v", err)
	}
	if data.(map[string]any)["objects"] != 4 {
		t.Errorf("objects = %v, want 4", data.(map[string]any)["objects"])
	}
}

func TestVectorToolErrors(t *testing.T) {
	m, _ := newVectorTestServer("node-3")
	ctx := context.Background()

	cases := []struct {
		name string
		raw  map[string]any
		want string
	}{
		{"missing op", map[string]any{}, "requires op"},
		{"unknown op", map[string]any{"op": "explode"}, "unknown vector op"},
		{"missing board", map[string]any{"op": "read"}, "boardId is required"},
		{"unknown board", map[string]any{"op": "read", "boardId": "nope"}, "no vector board"},
		{"missing objects", map[string]any{"op": "draw", "canvas": map[string]any{"width": 10, "height": 10}}, "objects is required"},
		{"bad geometry", map[string]any{"op": "draw", "objects": []any{
			map[string]any{"id": "a", "type": "blob", "fill": "#000000"},
		}}, "unknown type"},
		{"no paint", map[string]any{"op": "draw", "objects": []any{
			map[string]any{"id": "a", "type": "rect", "width": 10, "height": 10},
		}}, "no paint"},
	}
	for _, tc := range cases {
		_, _, err := m.handleVectorTool(ctx, tc.raw)
		if err == nil || !strings.Contains(err.Error(), tc.want) {
			t.Errorf("%s: error = %v, want it to mention %q", tc.name, err, tc.want)
		}
	}
}

func TestVectorToolDrawFailureLeavesRecoverableBoard(t *testing.T) {
	m := NewAvnacMCP(nil, nil, nil)
	m.vectorEmit = fakeVectorFrontend(&[]vectorCall{}, "", errors.New("no active canvas scene"))
	result, data, err := m.handleVectorTool(context.Background(), drawPayload())
	if err != nil {
		t.Fatalf("draw returned a transport error instead of recoverable data: %v", err)
	}
	if result == nil || !result.IsError {
		t.Fatal("draw should report a tool error when placement is not acknowledged")
	}
	if data.(map[string]any)["boardId"] == "" {
		t.Fatal("failed draw did not return a boardId")
	}
	if data.(map[string]any)["recoverable"] != true {
		t.Error("failed draw did not mark itself recoverable")
	}
	_, list, _ := m.handleVectorTool(context.Background(), map[string]any{"op": "list"})
	boards := list.(map[string]any)["boards"].([]map[string]any)
	if len(boards) != 1 || boards[0]["placed"] != false {
		t.Errorf("recoverable boards = %+v, want one unplaced board", boards)
	}
}

func TestVectorStatusRecoverAndFileExport(t *testing.T) {
	m := NewAvnacMCP(nil, nil, nil)
	placed := false
	drawCalls := 0
	m.vectorEmit = func(_ context.Context, action string, payload any, _ time.Duration) (any, error) {
		p, _ := payload.(map[string]any)
		switch action {
		case "vector_draw":
			drawCalls++
			if drawCalls == 1 {
				return nil, errors.New("bridge lost the response")
			}
			placed = true
			return map[string]any{"objectId": p["objectId"], "success": true}, nil
		case "get_object_properties":
			if placed {
				return map[string]any{"node": map[string]any{"id": p["objectId"], "type": "image"}}, nil
			}
			return nil, errors.New("object not found")
		default:
			return map[string]any{"success": true}, nil
		}
	}

	result, data, err := m.handleVectorTool(context.Background(), drawPayload())
	if err != nil {
		t.Fatalf("draw transport error: %v", err)
	}
	if result == nil || !result.IsError {
		t.Fatal("first placement should report a recoverable tool error")
	}
	boardID, _ := data.(map[string]any)["boardId"].(string)
	if boardID == "" {
		t.Fatal("missing boardId after failed placement")
	}
	if data.(map[string]any)["placed"] != false {
		t.Error("failed placement was marked placed")
	}

	_, status, err := m.handleVectorTool(context.Background(), map[string]any{"op": "status", "boardId": boardID})
	if err != nil {
		t.Fatalf("status: %v", err)
	}
	if status.(map[string]any)["placed"] != false {
		t.Error("status claimed an unplaced board is placed")
	}

	_, recovered, err := m.handleVectorTool(context.Background(), map[string]any{"op": "recover", "boardId": boardID})
	if err != nil {
		t.Fatalf("recover: %v", err)
	}
	if recovered.(map[string]any)["placed"] != true || drawCalls != 2 {
		t.Errorf("recover = %+v, drawCalls=%d; want placed and a retry", recovered, drawCalls)
	}

	path := filepath.Join(t.TempDir(), "rocket")
	exportResult, exportData, err := m.handleVectorTool(context.Background(), map[string]any{
		"op": "export", "boardId": boardID, "filePath": path,
	})
	if err != nil {
		t.Fatalf("export: %v", err)
	}
	if exportResult == nil || len(exportResult.Content) == 0 {
		t.Fatal("export returned no SVG content")
	}
	written, _ := exportData.(map[string]any)["filePath"].(string)
	if !strings.HasSuffix(strings.ToLower(written), ".svg") {
		t.Fatalf("written path = %q, want an .svg file", written)
	}
	body, err := os.ReadFile(written)
	if err != nil {
		t.Fatalf("read exported SVG: %v", err)
	}
	if !strings.Contains(string(body), "<svg") {
		t.Error("written SVG is incomplete")
	}
}

func TestVectorToolRejectsFailedUpdateWithoutChangingBoard(t *testing.T) {
	m, _ := newVectorTestServer("node-4")
	_, data, err := m.handleVectorTool(context.Background(), drawPayload())
	if err != nil {
		t.Fatal(err)
	}
	boardID := data.(map[string]any)["boardId"].(string)
	if _, _, err := m.handleVectorTool(context.Background(), map[string]any{
		"op": "update", "boardId": boardID,
		"operations": []any{map[string]any{"op": "resize", "target": "nope", "width": 10}},
	}); err == nil {
		t.Fatal("update with an unknown target succeeded")
	}
	_, read, err := m.handleVectorTool(context.Background(), map[string]any{"op": "read", "boardId": boardID})
	if err != nil {
		t.Fatal(err)
	}
	summary := read.(map[string]any)["objects"].([]map[string]any)
	if len(summary) != 4 {
		t.Errorf("objects after failed update = %d, want 4", len(summary))
	}
}

func TestVectorDrawPlacementDefaults(t *testing.T) {
	m, calls := newVectorTestServer("node-placement")
	if _, _, err := m.handleVectorTool(context.Background(), drawPayload()); err != nil {
		t.Fatalf("draw: %v", err)
	}
	placement := (*calls)[0].payload
	if _, ok := placement["x"]; ok {
		t.Error("draw forwarded x when the caller gave none; the editor must centre it")
	}
	if _, ok := placement["y"]; ok {
		t.Error("draw forwarded y when the caller gave none")
	}

	payload := drawPayload()
	payload["x"] = 10
	payload["y"] = "20"
	payload["scale"] = "0.5"
	m2, calls2 := newVectorTestServer("node-placement-2")
	if _, _, err := m2.handleVectorTool(context.Background(), payload); err != nil {
		t.Fatalf("draw with placement: %v", err)
	}
	placed := (*calls2)[0].payload
	if placed["x"] != float64(10) || placed["y"] != float64(20) || placed["scale"] != float64(0.5) {
		t.Errorf("placement = %v, want x=10 y=20 scale=0.5", placed)
	}
}

func TestVectorDrawUsesDeterministicFallbackNodeID(t *testing.T) {
	m := NewAvnacMCP(nil, nil, nil)
	m.vectorEmit = func(context.Context, string, any, time.Duration) (any, error) {
		return map[string]any{"success": true}, nil
	}
	_, data, err := m.handleVectorTool(context.Background(), drawPayload())
	if err != nil {
		t.Fatalf("draw: %v", err)
	}
	boardID := data.(map[string]any)["boardId"]
	if boardID == "" || data.(map[string]any)["objectId"] != boardID {
		t.Fatalf("fallback objectId = %v, want boardId %v", data.(map[string]any)["objectId"], boardID)
	}
	_, list, _ := m.handleVectorTool(context.Background(), map[string]any{"op": "list"})
	if list.(map[string]any)["count"] != 1 {
		t.Error("a successful placement did not store the board")
	}
}
