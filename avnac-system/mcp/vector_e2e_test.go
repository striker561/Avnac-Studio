package mcp

import (
	"context"
	"strings"
	"testing"

	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

// TestVectorEndToEndOverMCP is the protocol-level end-to-end check: a real MCP
// client lists tools and resources, draws a vector through the tool schema,
// edits it, exports it and reads the vector skill — with only the scene-editor
// bridge substituted (it needs a Wails runtime and a browser).
//
// The frontend half is covered separately by
// frontend/tests/features/vector/vector-placement.test.ts, which applies the
// exact commands this bridge would emit through the real scene reducer.
func TestVectorEndToEndOverMCP(t *testing.T) {
	ctx := context.Background()
	m, calls := newVectorTestServer("node-e2e")
	m.RegisterTools(ctx)
	if err := m.RegisterResources(); err != nil {
		t.Fatalf("RegisterResources: %v", err)
	}

	client := sdkmcp.NewClient(&sdkmcp.Implementation{Name: "e2e", Version: "0"}, nil)
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

	call := func(name string, args map[string]any) *sdkmcp.CallToolResult {
		t.Helper()
		res, err := session.CallTool(ctx, &sdkmcp.CallToolParams{Name: name, Arguments: args})
		if err != nil {
			t.Fatalf("CallTool(%s): %v", name, err)
		}
		if res.IsError {
			t.Fatalf("CallTool(%s) returned an error result: %+v", name, res.Content)
		}
		return res
	}

	drawRes := call("vector", drawPayload())
	structured, ok := drawRes.StructuredContent.(map[string]any)
	if !ok {
		t.Fatalf("draw structured content is %T", drawRes.StructuredContent)
	}
	boardID, _ := structured["boardId"].(string)
	if boardID == "" {
		t.Fatal("draw returned no boardId over MCP")
	}
	if structured["objectId"] != "node-e2e" {
		t.Errorf("objectId = %v, want node-e2e", structured["objectId"])
	}

	// The drawing went to the scene bridge with real SVG.
	if len(*calls) != 1 || (*calls)[0].action != "vector_draw" {
		t.Fatalf("bridge calls = %+v", *calls)
	}
	if src, _ := (*calls)[0].payload["src"].(string); !strings.HasPrefix(src, "data:image/svg+xml") {
		t.Errorf("bridge src is not SVG: %.50q", src)
	}

	// Edit through the protocol, then export the result.
	updateRes := call("vector", map[string]any{
		"op":      "update",
		"boardId": boardID,
		"operations": []any{
			map[string]any{"op": "resize", "target": "fin-left", "width": 30, "height": 30},
			map[string]any{"op": "mirror", "target": "fin-right", "of": "fin-left"},
		},
	})
	updated, _ := updateRes.StructuredContent.(map[string]any)
	if got := intOf(updated["objects"]); got != 4 {
		t.Errorf("objects after update = %v, want 4", updated["objects"])
	}

	exportRes := call("vector", map[string]any{"op": "export", "boardId": boardID})
	if len(exportRes.Content) != 1 {
		t.Fatalf("export content = %d blocks, want 1", len(exportRes.Content))
	}
	svg := exportRes.Content[0].(*sdkmcp.TextContent).Text
	if !strings.Contains(svg, "<path ") || !strings.Contains(svg, "data-avnac-vector-board=\"1\"") {
		t.Error("exported SVG is missing paths or the board marker")
	}
	if strings.Contains(svg, "fill=\"none\" stroke=\"none\"") {
		t.Error("exported SVG contains an invisible path")
	}

	// The knowledge base is reachable from the same session.
	res, err := session.ReadResource(ctx, &sdkmcp.ReadResourceParams{URI: "skill://vector"})
	if err != nil {
		t.Fatalf("ReadResource(skill://vector): %v", err)
	}
	if len(res.Contents) != 1 || !strings.Contains(res.Contents[0].Text, "# Drawing Vectors") {
		t.Error("skill://vector did not read back as the drawing skill")
	}

	// Deleting removes the element and the board; a later read is a tool error.
	call("vector", map[string]any{"op": "delete", "boardId": boardID})
	listRes := call("vector", map[string]any{"op": "list"})
	listed, _ := listRes.StructuredContent.(map[string]any)
	if got := intOf(listed["count"]); got != 0 {
		t.Errorf("boards after delete = %v, want 0", listed["count"])
	}
	res2, err := session.CallTool(ctx, &sdkmcp.CallToolParams{
		Name: "vector", Arguments: map[string]any{"op": "read", "boardId": boardID},
	})
	if err != nil {
		t.Fatalf("read after delete transport error: %v", err)
	}
	if !res2.IsError {
		t.Error("read after delete was not reported as a tool error")
	}
}

// intOf normalises a structured-content number: over the wire JSON decodes
// every number as float64, while in-process handlers produce ints.
func intOf(v any) int {
	switch n := v.(type) {
	case int:
		return n
	case int64:
		return int(n)
	case float64:
		return int(n)
	default:
		return -1
	}
}
