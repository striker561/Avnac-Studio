package mcp

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
	"time"
)

func containsAction(list []string, want string) bool {
	for _, item := range list {
		if item == want {
			return true
		}
	}
	return false
}

func TestToolSurfaceListsPublishedTools(t *testing.T) {
	m := NewAvnacMCP(nil, nil, nil)
	m.RegisterTools(context.Background())

	surface, err := m.ToolSurface()
	if err != nil {
		t.Fatalf("ToolSurface: %v", err)
	}
	if surface.ToolCount != 14 {
		t.Errorf("toolCount = %d, want the 14 published tools", surface.ToolCount)
	}
	if len(surface.Tools) != surface.ToolCount {
		t.Errorf("listed %d tools but reported %d", len(surface.Tools), surface.ToolCount)
	}
	if surface.Fingerprint == "" {
		t.Error("fingerprint is empty")
	}
	for _, want := range []string{
		"client_status", "export_svg", "vector_draw", "vector_update", "vector_delete",
		"get_canvas_summary", "open_workspace", "rename_workspace", "undo", "redo",
		"resize_artboard", "validate_canvas",
	} {
		if !containsAction(surface.ClientActions, want) {
			t.Errorf("client actions are missing %q", want)
		}
	}
	for _, unwanted := range []string{"search_unsplash", "list_files", "list_stickers"} {
		if containsAction(surface.ClientActions, unwanted) {
			t.Errorf("%q is answered in Go and must not be listed as a client action", unwanted)
		}
	}

	var vector *ToolSurfaceTool
	for i := range surface.Tools {
		if surface.Tools[i].Name == "vector" {
			vector = &surface.Tools[i]
			break
		}
	}
	if vector == nil {
		t.Fatal("vector tool missing from the surface")
	}
	if len(vector.Ops) != len(vectorAllOps) {
		t.Errorf("vector ops = %d, want %d", len(vector.Ops), len(vectorAllOps))
	}
	clientOps := map[string]bool{}
	for _, op := range vector.Ops {
		if op.Client {
			clientOps[op.Op] = true
		}
	}
	if !clientOps["draw"] || !clientOps["update"] || !clientOps["delete"] {
		t.Errorf("vector client ops = %v, want draw/update/delete", clientOps)
	}
	if clientOps["read"] || clientOps["list"] {
		t.Errorf("read/list are answered in Go, got client ops %v", clientOps)
	}
}

func TestCheckClientReportsStaleWindowThatCannotNameTheAction(t *testing.T) {
	m := NewAvnacMCP(nil, nil, nil)
	m.RegisterTools(context.Background())
	m.emitFn = func(context.Context, string, any, time.Duration) (any, error) {
		return map[string]any{"error": "Unknown action 'client_status'"}, nil
	}

	report, err := m.CheckClient()
	if err != nil {
		t.Fatalf("CheckClient: %v", err)
	}
	if !report.Answered {
		t.Error("a window that replies with an error still answered")
	}
	if !report.Stale {
		t.Error("a window without client_status must be reported as stale")
	}
	if !strings.Contains(report.Message, "older build") {
		t.Errorf("message = %q, want it to explain the old build", report.Message)
	}
	if report.Error == "" {
		t.Error("the window's error text was dropped")
	}
}

func TestCheckClientReportsMissingActions(t *testing.T) {
	m := NewAvnacMCP(nil, nil, nil)
	m.RegisterTools(context.Background())
	expected := m.expectedClientActions()
	partial := make([]string, 0, len(expected))
	for _, action := range expected {
		if action == "vector_draw" || action == "client_status" {
			continue
		}
		partial = append(partial, action)
	}
	m.emitFn = func(context.Context, string, any, time.Duration) (any, error) {
		return map[string]any{
			"success":         true,
			"clientId":        "client-1",
			"actionHandlerId": "handler-1",
			"revision":        float64(7),
			"actions":         partial,
		}, nil
	}

	report, err := m.CheckClient()
	if err != nil {
		t.Fatalf("CheckClient: %v", err)
	}
	if !report.Answered || report.ClientID != "client-1" || report.Revision != 7 {
		t.Errorf("report = %+v", report)
	}
	if !report.Stale {
		t.Error("a partial action list must be reported as stale")
	}
	if len(report.Missing) != 2 {
		t.Errorf("missing = %v, want client_status and vector_draw", report.Missing)
	}
}

func TestCheckClientPassesACurrentWindow(t *testing.T) {
	m := NewAvnacMCP(nil, nil, nil)
	m.RegisterTools(context.Background())
	expected := m.expectedClientActions()
	m.emitFn = func(context.Context, string, any, time.Duration) (any, error) {
		return map[string]any{
			"success":         true,
			"clientId":        "client-1",
			"actionHandlerId": "handler-1",
			"revision":        float64(3),
			"document":        map[string]any{"name": "Poster"},
			"actions":         expected,
		}, nil
	}

	report, err := m.CheckClient()
	if err != nil {
		t.Fatalf("CheckClient: %v", err)
	}
	if report.Stale || len(report.Missing) != 0 {
		t.Errorf("current window reported stale: %+v", report)
	}
	if report.Document != "Poster" {
		t.Errorf("document = %q", report.Document)
	}
}

func TestCheckClientWithoutAWindow(t *testing.T) {
	m := NewAvnacMCP(nil, nil, nil)
	m.RegisterTools(context.Background())
	m.emitFn = func(context.Context, string, any, time.Duration) (any, error) {
		return nil, errors.New("timeout waiting for mcp action")
	}

	report, err := m.CheckClient()
	if err != nil {
		t.Fatalf("CheckClient: %v", err)
	}
	if report.Answered || !report.Stale {
		t.Errorf("report = %+v, want unanswered and stale", report)
	}
}

// TestFrontendActionListMatchesServer keeps the panel honest: the comparison it
// shows is only meaningful while the Go expectation and the frontend dispatcher
// list the same actions.
func TestFrontendActionListMatchesServer(t *testing.T) {
	path := filepath.Join("..", "..", "frontend", "src", "lib", "mcp", "actions.ts")
	body, err := os.ReadFile(path)
	if err != nil {
		t.Skipf("frontend source unavailable: %v", err)
	}
	src := string(body)
	start := strings.Index(src, "export const MCP_IMPLEMENTED_ACTIONS")
	if start < 0 {
		t.Fatal("MCP_IMPLEMENTED_ACTIONS is missing from lib/mcp/actions.ts")
	}
	block := src[start:]
	if end := strings.Index(block, "];"); end > 0 {
		block = block[:end]
	}
	pattern := regexp.MustCompile(`"([a-z_]+)"`)
	frontend := map[string]bool{}
	for _, match := range pattern.FindAllStringSubmatch(block, -1) {
		frontend[match[1]] = true
	}
	if len(frontend) == 0 {
		t.Fatal("could not read any actions from MCP_IMPLEMENTED_ACTIONS")
	}

	m := NewAvnacMCP(nil, nil, nil)
	m.RegisterTools(context.Background())
	expected := m.expectedClientActions()
	for _, action := range expected {
		if !frontend[action] {
			t.Errorf("server emits %q but MCP_IMPLEMENTED_ACTIONS does not list it", action)
		}
	}
	for action := range frontend {
		if !containsAction(expected, action) {
			t.Errorf("MCP_IMPLEMENTED_ACTIONS lists %q but the server never emits it", action)
		}
	}
}
