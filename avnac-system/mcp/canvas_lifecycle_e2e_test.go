package mcp

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

// TestCanvasLifecycleProtocol exercises the real MCP tool surface with only the
// Wails bridge substituted. It guards the op names, schema fields and payload
// shapes that the frontend and docs depend on.
func TestCanvasLifecycleProtocol(t *testing.T) {
	ctx := context.Background()
	m := NewAvnacMCP(nil, nil, nil)
	m.RegisterTools(ctx)

	var calls []string
	var lastPayload map[string]any
	m.emitFn = func(_ context.Context, action string, payload any, _ time.Duration) (any, error) {
		calls = append(calls, action)
		if p, ok := payload.(map[string]any); ok {
			lastPayload = p
		}
		switch action {
		case "export_svg":
			return map[string]any{
				"success": true,
				"scope":   "page",
				"svg":     "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"10\" height=\"10\"></svg>",
				"width":   10,
				"height":  10,
			}, nil
		case "get_font_list":
			return map[string]any{
				"fonts":     []string{"Inter", "Archivo"},
				"requested": []string{"Archivo"},
				"loaded":    map[string]any{"Archivo": true},
			}, nil
		case "validate_canvas":
			return map[string]any{
				"success":  true,
				"ok":       false,
				"errors":   1,
				"warnings": 2,
				"issues":   []any{map[string]any{"code": "out_of_bounds"}},
			}, nil
		case "modify_elements":
			return map[string]any{
				"success":       true,
				"modifiedCount": 1,
				"modified":      []any{map[string]any{"objectId": "card"}},
			}, nil
		case "client_status":
			return map[string]any{"success": true, "clientId": "client-1", "revision": 7}, nil
		case "create_snapshot":
			return map[string]any{"success": true, "token": "snap-1", "pageCount": 2}, nil
		case "add_page":
			return map[string]any{"success": true, "pageCount": 2}, nil
		case "resize_artboard":
			return map[string]any{"success": true, "width": 900, "height": 1200}, nil
		default:
			return map[string]any{"success": true}, nil
		}
	}

	client := sdkmcp.NewClient(&sdkmcp.Implementation{Name: "lifecycle-e2e", Version: "0"}, nil)
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

	call := func(name string, args map[string]any) (*sdkmcp.CallToolResult, map[string]any) {
		t.Helper()
		res, err := session.CallTool(ctx, &sdkmcp.CallToolParams{Name: name, Arguments: args})
		if err != nil {
			t.Fatalf("CallTool(%s): %v", name, err)
		}
		if res.IsError {
			t.Fatalf("CallTool(%s) returned an error result: %+v", name, res.Content)
		}
		structured, _ := res.StructuredContent.(map[string]any)
		return res, structured
	}

	_, added := call("canvas", map[string]any{
		"op": "add-page", "name": "Poster", "width": 1200, "height": 1600, "backgroundColor": "#F4ECDD",
	})
	if intOf(added["pageCount"]) != 2 {
		t.Errorf("add-page response = %+v", added)
	}
	if lastPayload["width"] != 1200 || lastPayload["height"] != 1600 || lastPayload["backgroundColor"] != "#F4ECDD" {
		t.Errorf("add-page payload = %+v", lastPayload)
	}

	_, resized := call("canvas", map[string]any{
		"op": "resize", "width": 900, "height": 1200, "backgroundColor": "#173B2C",
	})
	if intOf(resized["width"]) != 900 || intOf(resized["height"]) != 1200 {
		t.Errorf("resize response = %+v", resized)
	}
	if lastPayload["width"] != 900 || lastPayload["backgroundColor"] != "#173B2C" {
		t.Errorf("resize payload = %+v", lastPayload)
	}

	_, snap := call("canvas", map[string]any{"op": "snapshot", "token": "snap-1"})
	if snap["token"] != "snap-1" {
		t.Errorf("snapshot response = %+v", snap)
	}
	call("canvas", map[string]any{"op": "restore", "token": "snap-1"})
	call("canvas", map[string]any{"op": "undo"})
	call("canvas", map[string]any{"op": "redo"})
	_, status := call("canvas", map[string]any{"op": "status"})
	if status["clientId"] != "client-1" || intOf(status["revision"]) != 7 {
		t.Errorf("status response = %+v", status)
	}

	_, validation := call("canvas", map[string]any{
		"op": "validate", "tolerance": 1, "checkTangencies": false,
	})
	if intOf(validation["errors"]) != 1 {
		t.Errorf("validate response = %+v", validation)
	}
	if intOf(lastPayload["tolerance"]) != 1 || lastPayload["checkTangencies"] != false {
		t.Errorf("validate payload = %+v", lastPayload)
	}

	_, fonts := call("assets", map[string]any{"op": "fonts", "families": []any{"Archivo"}})
	if fonts["loaded"] == nil {
		t.Errorf("font response = %+v", fonts)
	}
	if lastPayload["families"] == nil {
		t.Errorf("font payload = %+v", lastPayload)
	}

	path := filepath.Join(t.TempDir(), "page")
	exportRes, exported := call("export", map[string]any{"op": "svg", "filePath": path})
	if exported["filePath"] == "" {
		t.Fatalf("export filePath missing: %+v", exported)
	}
	if len(exportRes.Content) == 0 || !strings.Contains(exportRes.Content[0].(*sdkmcp.TextContent).Text, "<svg") {
		t.Error("export returned no SVG text")
	}
	written, _ := exported["filePath"].(string)
	body, err := os.ReadFile(written)
	if err != nil {
		t.Fatalf("read exported page: %v", err)
	}
	if !strings.Contains(string(body), "<svg") {
		t.Error("exported page file is empty")
	}

	want := []string{
		"add_page", "resize_artboard", "create_snapshot", "restore_snapshot",
		"undo", "redo", "client_status", "validate_canvas", "get_font_list",
		"export_svg",
	}
	for _, action := range want {
		found := false
		for _, got := range calls {
			if got == action {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("action %q was not emitted; calls=%v", action, calls)
		}
	}
}
