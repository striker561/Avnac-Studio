package mcp

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"

	avnacio "Avnac/avnac-system/io"
)

// The Go-side file tools answer without the frontend bridge. These tests drive
// the published `files` tool through a real MCP client against a real IOManager,
// so the shape the agent sees (and the workspace lookup behind it) is covered.

func newBackendMCP(t *testing.T) (*AvnacMCP, *avnacio.IOManager) {
	t.Helper()
	dir := t.TempDir()
	ioManager := avnacio.NewIOManager()
	ioManager.Startup(context.Background(), dir)

	mcpServer := NewAvnacMCP(nil, ioManager, nil)
	mcpServer.RegisterTools(context.Background())
	return mcpServer, ioManager
}

func documentRecord(t *testing.T, id, name string, width, height int, updatedAt int64) string {
	t.Helper()
	record := map[string]any{
		"id":        id,
		"name":      name,
		"updatedAt": updatedAt,
		"document": map[string]any{
			"artboard": map[string]int{"width": width, "height": height},
			"fabric":   map[string]any{"objects": []any{}},
		},
	}
	data, err := json.Marshal(record)
	if err != nil {
		t.Fatalf("marshal record: %v", err)
	}
	return string(data)
}

func connectClient(t *testing.T, m *AvnacMCP) *sdkmcp.ClientSession {
	t.Helper()
	ctx := context.Background()
	client := sdkmcp.NewClient(&sdkmcp.Implementation{Name: "backend-test", Version: "0"}, nil)
	t1, t2 := sdkmcp.NewInMemoryTransports()
	serverSession, err := m.server.Connect(ctx, t1, nil)
	if err != nil {
		t.Fatalf("server connect: %v", err)
	}
	t.Cleanup(func() { _ = serverSession.Close() })
	session, err := client.Connect(ctx, t2, nil)
	if err != nil {
		t.Fatalf("client connect: %v", err)
	}
	t.Cleanup(func() { _ = session.Close() })
	return session
}

func TestFilesToolListsSavedCanvases(t *testing.T) {
	m, ioManager := newBackendMCP(t)
	ctx := context.Background()

	if err := ioManager.WriteDocumentRecord("doc-alpha",
		documentRecord(t, "doc-alpha", "Alpha", 1200, 800, 1_700_000_000_000)); err != nil {
		t.Fatalf("write alpha: %v", err)
	}
	if err := ioManager.WriteDocumentRecord("doc-beta",
		documentRecord(t, "doc-beta", "Beta", 1080, 1080, 1_700_000_100_000)); err != nil {
		t.Fatalf("write beta: %v", err)
	}

	session := connectClient(t, m)
	result, err := session.CallTool(ctx, &sdkmcp.CallToolParams{
		Name:      "files",
		Arguments: map[string]any{"op": "list"},
	})
	if err != nil {
		t.Fatalf("files op=list: %v", err)
	}
	if result.IsError {
		t.Fatalf("files op=list returned error: %+v", result.Content)
	}

	var payload struct {
		Files []struct {
			ID        string `json:"id"`
			Name      string `json:"name"`
			Width     int    `json:"width"`
			Height    int    `json:"height"`
			UpdatedAt int64  `json:"updatedAt"`
		} `json:"files"`
		Count int `json:"count"`
	}
	raw, err := json.Marshal(result.StructuredContent)
	if err != nil {
		t.Fatalf("marshal structured content: %v", err)
	}
	if err := json.Unmarshal(raw, &payload); err != nil {
		t.Fatalf("decode structured content: %v", err)
	}

	if payload.Count != 2 || len(payload.Files) != 2 {
		t.Fatalf("count = %d files = %d, want 2", payload.Count, len(payload.Files))
	}
	// Newest first: the Files page relies on this order.
	if payload.Files[0].ID != "doc-beta" || payload.Files[1].ID != "doc-alpha" {
		t.Fatalf("wrong order: %+v", payload.Files)
	}

	alpha := payload.Files[1]
	if alpha.Name != "Alpha" || alpha.Width != 1200 || alpha.Height != 800 {
		t.Fatalf("alpha metadata wrong: %+v", alpha)
	}
	if alpha.UpdatedAt != 1_700_000_000_000 {
		t.Fatalf("alpha updatedAt = %d", alpha.UpdatedAt)
	}
}

func TestFilesToolEmptyStoreReturnsEmptyArray(t *testing.T) {
	m, _ := newBackendMCP(t)
	session := connectClient(t, m)

	result, err := session.CallTool(context.Background(), &sdkmcp.CallToolParams{
		Name:      "files",
		Arguments: map[string]any{"op": "list"},
	})
	if err != nil {
		t.Fatalf("files op=list: %v", err)
	}
	raw, _ := json.Marshal(result.StructuredContent)
	if !strings.Contains(string(raw), `"files":[]`) {
		t.Fatalf("expected an empty files array, got %s", raw)
	}
	if !strings.Contains(string(raw), `"count":0`) {
		t.Fatalf("expected count 0, got %s", raw)
	}
}

func TestFilesOpenRejectsUnknownIDBeforeBridge(t *testing.T) {
	m, ioManager := newBackendMCP(t)
	if err := ioManager.WriteDocumentRecord("doc-alpha",
		documentRecord(t, "doc-alpha", "Alpha", 1200, 800, 1_700_000_000_000)); err != nil {
		t.Fatalf("write alpha: %v", err)
	}
	session := connectClient(t, m)

	result, err := session.CallTool(context.Background(), &sdkmcp.CallToolParams{
		Name:      "files",
		Arguments: map[string]any{"op": "open", "fileId": "missing"},
	})
	if err == nil && (result == nil || !result.IsError) {
		t.Fatal("opening an unknown file id should fail")
	}
	message := ""
	if err != nil {
		message = err.Error()
	} else if len(result.Content) > 0 {
		if text, ok := result.Content[0].(*sdkmcp.TextContent); ok {
			message = text.Text
		}
	}
	if !strings.Contains(message, "no saved file with id 'missing'") {
		t.Fatalf("unexpected error message: %q", message)
	}
}

func TestStickersToolReturnsBuiltIns(t *testing.T) {
	m, _ := newBackendMCP(t)
	session := connectClient(t, m)

	result, err := session.CallTool(context.Background(), &sdkmcp.CallToolParams{
		Name:      "assets",
		Arguments: map[string]any{"op": "stickers"},
	})
	if err != nil {
		t.Fatalf("assets op=stickers: %v", err)
	}
	raw, _ := json.Marshal(result.StructuredContent)
	want := []string{"donut", "leaf", "lollipop", "pineapple",
		"shooting-star-badge", "sunflower-badge"}
	for _, sticker := range want {
		if !strings.Contains(string(raw), `"`+sticker+`"`) {
			t.Fatalf("missing sticker %q in %s", sticker, raw)
		}
	}
}

func TestFilesRenameRejectsUnknownIDBeforeBridge(t *testing.T) {
	m, ioManager := newBackendMCP(t)
	if err := ioManager.WriteDocumentRecord("doc-alpha",
		documentRecord(t, "doc-alpha", "Alpha", 1200, 800, 1_700_000_000_000)); err != nil {
		t.Fatalf("write alpha: %v", err)
	}
	session := connectClient(t, m)

	result, err := session.CallTool(context.Background(), &sdkmcp.CallToolParams{
		Name:      "files",
		Arguments: map[string]any{"op": "rename", "fileId": "missing", "name": "New"},
	})
	if err == nil && (result == nil || !result.IsError) {
		t.Fatal("renaming an unknown file id should fail")
	}
	message := ""
	if err != nil {
		message = err.Error()
	} else if len(result.Content) > 0 {
		if text, ok := result.Content[0].(*sdkmcp.TextContent); ok {
			message = text.Text
		}
	}
	if !strings.Contains(message, "no saved file with id 'missing'") {
		t.Fatalf("unexpected error message: %q", message)
	}
}

func TestListWorkspaceMetasRequiresIO(t *testing.T) {
	m := NewAvnacMCP(nil, nil, nil)
	if _, err := m.listWorkspaceMetas(); err == nil {
		t.Fatal("expected an error when workspace storage is not initialised")
	}
}
