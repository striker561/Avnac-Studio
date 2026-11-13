package mcp

import (
	"context"
	"strings"
	"testing"

	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

// recorder is a legacy handler that records the arguments it received.
func recorder(got *map[string]any) toolHandler {
	return func(_ context.Context, _ *sdkmcp.CallToolRequest, raw map[string]any) (*sdkmcp.CallToolResult, any, error) {
		*got = raw
		return &sdkmcp.CallToolResult{}, raw, nil
	}
}

func TestOpDispatcherRoutesAndStripsOp(t *testing.T) {
	var got map[string]any
	h := opDispatcher("elements", map[string]string{"render": "render_elements"}, map[string]toolHandler{
		"render_elements": recorder(&got),
	})

	_, _, err := h(context.Background(), nil, map[string]any{
		"op":       "RENDER",
		"elements": []any{map[string]any{"type": "rect"}},
	})
	if err != nil {
		t.Fatalf("dispatch error: %v", err)
	}
	if _, present := got["op"]; present {
		t.Error("op was forwarded to the handler; it should be stripped")
	}
	if got["elements"] == nil {
		t.Error("elements argument was not forwarded")
	}
}

func TestOpDispatcherAcceptsLegacyActionName(t *testing.T) {
	var got map[string]any
	h := opDispatcher("elements", map[string]string{"render": "render_elements"}, map[string]toolHandler{
		"render_elements": recorder(&got),
	})

	if _, _, err := h(context.Background(), nil, map[string]any{"op": "render_elements"}); err != nil {
		t.Fatalf("legacy action name as op failed: %v", err)
	}
	if got == nil {
		t.Fatal("handler was not called")
	}
}

func TestOpDispatcherRejectsUnknownAndMissingOps(t *testing.T) {
	h := opDispatcher("canvas", map[string]string{"create": "create_canvas"}, map[string]toolHandler{
		"create_canvas": recorder(new(map[string]any)),
	})

	_, _, err := h(context.Background(), nil, map[string]any{"op": "explode"})
	if err == nil || !strings.Contains(err.Error(), "unknown canvas op") {
		t.Errorf("unknown op error = %v, want a message naming the allowed ops", err)
	}

	_, _, err = h(context.Background(), nil, map[string]any{})
	if err == nil || !strings.Contains(err.Error(), "requires op") {
		t.Errorf("missing op error = %v, want a message requiring op", err)
	}
}

// TestPublishedToolSurface guards the 14-tool contract from a real client: six
// reads, seven op-based tools and the guide router. If a future change re-registers a legacy tool
// or adds one without updating this list, the eval surface and the docs drift
// apart silently.
func TestPublishedToolSurface(t *testing.T) {
	ctx := context.Background()
	m := NewAvnacMCP(nil, nil, nil)
	m.RegisterTools(ctx)

	srv := m.server
	client := sdkmcp.NewClient(&sdkmcp.Implementation{Name: "surface-test", Version: "0"}, nil)
	t1, t2 := sdkmcp.NewInMemoryTransports()
	serverSession, err := srv.Connect(ctx, t1, nil)
	if err != nil {
		t.Fatalf("server connect: %v", err)
	}
	defer serverSession.Close()
	session, err := client.Connect(ctx, t2, nil)
	if err != nil {
		t.Fatalf("client connect: %v", err)
	}
	defer session.Close()

	res, err := session.ListTools(ctx, nil)
	if err != nil {
		t.Fatalf("ListTools: %v", err)
	}
	got := make(map[string]bool, len(res.Tools))
	for _, tool := range res.Tools {
		got[tool.Name] = true
	}
	want := []string{
		"canvas", "elements", "arrange", "files", "assets", "export", "vector", "guide",
		"get_canvas_summary", "get_canvas_state", "get_canvas_image",
		"list_objects", "get_object_properties", "get_selection",
	}
	if len(got) != len(want) {
		t.Errorf("published %d tools, want %d: %v", len(got), len(want), got)
	}

	// guide is how the library reaches an agent mid-task, so its description must
	// say when to call it and that composition results carry it automatically.
	var guideTool *sdkmcp.Tool
	for _, tool := range res.Tools {
		if tool.Name == "guide" {
			guideTool = tool
			break
		}
	}
	if guideTool == nil {
		t.Fatal("guide tool missing")
	}
	for _, phrase := range []string{"Call this at the start", "even when the user did not ask", "inline=true"} {
		if !strings.Contains(guideTool.Description, phrase) {
			t.Errorf("guide description is missing %q", phrase)
		}
	}

	// The vector tool's discoverability lives in its description and schema: a
	// client that sees the tool must also see that it is op-based and that it
	// takes objects, operations and a boardId.
	var vectorTool *sdkmcp.Tool
	for _, tool := range res.Tools {
		if tool.Name == "vector" {
			vectorTool = tool
			break
		}
	}
	if vectorTool == nil {
		t.Fatal("vector tool missing")
	}
	for _, op := range []string{"draw", "update", "read", "export", "delete", "list"} {
		if !strings.Contains(vectorTool.Description, "op="+op) {
			t.Errorf("vector description is missing op %q", op)
		}
	}
	vectorSchema, ok := vectorTool.InputSchema.(map[string]any)
	if !ok {
		t.Fatalf("vector InputSchema is %T", vectorTool.InputSchema)
	}
	vectorProps, _ := vectorSchema["properties"].(map[string]any)
	for _, field := range []string{"objects", "operations", "boardId", "canvas"} {
		if vectorProps[field] == nil {
			t.Errorf("vector schema is missing the %q property", field)
		}
	}
	for _, name := range want {
		if !got[name] {
			t.Errorf("missing published tool %q", name)
		}
	}

	// Page ops live on `canvas`; if its description or schema loses them the
	// surface still lists the right number of tools but agents can no longer find
	// the page path.
	var canvasTool *sdkmcp.Tool
	for _, tool := range res.Tools {
		if tool.Name == "canvas" {
			canvasTool = tool
			break
		}
	}
	if canvasTool == nil {
		t.Fatal("canvas tool missing")
	}
	for _, op := range []string{"add-page", "go-page", "rename-page", "delete-page"} {
		if !strings.Contains(canvasTool.Description, op) {
			t.Errorf("canvas description is missing page op %q", op)
		}
	}
	schema, ok := canvasTool.InputSchema.(map[string]any)
	if !ok {
		t.Fatalf("canvas InputSchema is %T, want its JSON object form", canvasTool.InputSchema)
	}
	properties, _ := schema["properties"].(map[string]any)
	for _, field := range []string{"page", "index", "name"} {
		if properties[field] == nil {
			t.Errorf("canvas schema is missing the %q page property", field)
		}
	}
}
