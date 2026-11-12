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

// TestPublishedToolSurface guards the 12-tool contract from a real client: six
// reads plus six op-based tools. If a future change re-registers a legacy tool
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
		"canvas", "elements", "arrange", "files", "assets", "export",
		"get_canvas_summary", "get_canvas_state", "get_canvas_image",
		"list_objects", "get_object_properties", "get_selection",
	}
	if len(got) != len(want) {
		t.Errorf("published %d tools, want %d: %v", len(got), len(want), got)
	}
	for _, name := range want {
		if !got[name] {
			t.Errorf("missing published tool %q", name)
		}
	}
}
