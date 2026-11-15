package mcp

import (
	"context"
	"strings"
	"testing"

	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

// The vector knowledge base is only useful if it is reachable over MCP: the
// task skill, the eight rules and the reference must all be listed by a real
// client and readable without a disk path. This is the resource half of the
// eval; internal/skill covers routing and search.
func TestVectorResourcesAreServed(t *testing.T) {
	srv := sdkmcp.NewServer(&sdkmcp.Implementation{Name: "vector-resource-test", Version: "0"}, nil)
	if err := registerDesignResources(srv, testDesignLibrary(t)); err != nil {
		t.Fatalf("registerDesignResources: %v", err)
	}

	ctx := context.Background()
	client := sdkmcp.NewClient(&sdkmcp.Implementation{Name: "client", Version: "0"}, nil)
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

	listed := make(map[string]bool)
	var cursor *sdkmcp.ListResourcesParams
	for {
		params := &sdkmcp.ListResourcesParams{}
		if cursor != nil {
			params.Cursor = cursor.Cursor
		}
		res, err := session.ListResources(ctx, params)
		if err != nil {
			t.Fatalf("ListResources: %v", err)
		}
		for _, r := range res.Resources {
			listed[r.URI] = true
		}
		if res.NextCursor == "" {
			break
		}
		cursor = &sdkmcp.ListResourcesParams{Cursor: res.NextCursor}
	}

	want := []string{"skill://vector", "references://vector-graphics"}
	for i := 120; i <= 127; i++ {
		id := "rules://" + itoa(i) + "-"
		found := false
		for uri := range listed {
			if strings.HasPrefix(uri, id) {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("no rules:// resource for rule %d", i)
		}
	}
	for _, uri := range want {
		if !listed[uri] {
			t.Errorf("missing resource %q", uri)
		}
	}

	read := func(uri string) string {
		t.Helper()
		res, err := session.ReadResource(ctx, &sdkmcp.ReadResourceParams{URI: uri})
		if err != nil {
			t.Fatalf("ReadResource(%s): %v", uri, err)
		}
		if len(res.Contents) != 1 || res.Contents[0].Text == "" {
			t.Fatalf("ReadResource(%s) returned no text", uri)
		}
		return res.Contents[0].Text
	}

	skill := read("skill://vector")
	for _, marker := range []string{"# Drawing Vectors", "op=draw", "125-bezier-curves-and-path-construction"} {
		if !strings.Contains(skill, marker) {
			t.Errorf("skill://vector is missing %q", marker)
		}
	}
	if !strings.Contains(skill, "](rules://125-bezier-curves-and-path-construction)") {
		t.Error("skill://vector does not link rules:// URIs")
	}
	if strings.Contains(skill, "](../rules/") {
		t.Error("skill://vector kept a disk-relative rules link")
	}

	reference := read("references://vector-graphics")
	for _, marker := range []string{"# Vector Graphics Reference", "0.5522847498", "viewBox"} {
		if !strings.Contains(reference, marker) {
			t.Errorf("references://vector-graphics is missing %q", marker)
		}
	}

	rule := read("rules://125-bezier-curves-and-path-construction")
	for _, marker := range []string{"# Rule: Bézier Curves and Path Construction", "magic triangle", "55.6%"} {
		if !strings.Contains(rule, marker) {
			t.Errorf("rules://125 is missing %q", marker)
		}
	}

	index := read("rules://index")
	if !strings.Contains(index, "## Vector drawing") {
		t.Error("rules://index has no Vector drawing section")
	}
	if !strings.Contains(index, "125 rule files") {
		t.Error("rules://index does not report 125 rule files")
	}
}

func itoa(n int) string {
	if n < 10 {
		return string(rune('0' + n))
	}
	return string(rune('0'+n/100)) + string(rune('0'+(n/10)%10)) + string(rune('0'+n%10))
}
