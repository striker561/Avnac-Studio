package mcp

import (
	"testing"

	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

// A frontend {"error": ...} response must become an MCP tool error. Before this
// helper existed, a rejected render_elements batch arrived as a successful
// result whose text merely mentioned the failure.
func TestToolErrorResultFlagsErrors(t *testing.T) {
	res, data, err := toolErrorResult(map[string]any{"error": "unsupported element type"})
	if err != nil {
		t.Fatalf("toolErrorResult returned an error: %v", err)
	}
	if res == nil {
		t.Fatal("toolErrorResult returned no result for an error payload")
	}
	if !res.IsError {
		t.Fatal("result.IsError = false, want true")
	}
	if data == nil {
		t.Fatal("structured content was dropped")
	}
	if len(res.Content) != 1 {
		t.Fatalf("content = %d items, want 1", len(res.Content))
	}
	text, ok := res.Content[0].(*sdkmcp.TextContent)
	if !ok {
		t.Fatalf("content is %T, want *mcp.TextContent", res.Content[0])
	}
	if text.Text != "unsupported element type" {
		t.Errorf("text = %q, want the frontend message", text.Text)
	}
}

func TestToolErrorResultPassesSuccessThrough(t *testing.T) {
	payload := map[string]any{"created": []any{}}
	res, data, err := toolErrorResult(payload)
	if err != nil {
		t.Fatalf("toolErrorResult returned an error: %v", err)
	}
	if res != nil {
		t.Fatalf("result = %+v, want nil for a success payload", res)
	}
	if data == nil {
		t.Fatal("payload was dropped")
	}
}

func TestToolErrorResultToleratesNonMap(t *testing.T) {
	for _, payload := range []any{nil, "text", 42} {
		res, data, err := toolErrorResult(payload)
		if err != nil {
			t.Fatalf("toolErrorResult(%v) error: %v", payload, err)
		}
		if res != nil {
			t.Errorf("toolErrorResult(%v) = %+v, want nil", payload, res)
		}
		if data != payload {
			t.Errorf("toolErrorResult(%v) data = %v, want the payload back", payload, data)
		}
	}
}
