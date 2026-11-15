package mcp

import (
	"context"
	"strings"
	"testing"
	"unicode/utf8"

	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"

	"Avnac/internal/skill"
)

// testDesignLibrary loads the embedded library once for the resource tests.
func testDesignLibrary(t *testing.T) *skill.Library {
	t.Helper()
	lib, err := skill.Default()
	if err != nil {
		t.Fatalf("skill.Default(): %v", err)
	}
	return lib
}

func TestDesignResourcesCoverTheLibrary(t *testing.T) {
	lib := testDesignLibrary(t)
	resources, err := designResources(lib)
	if err != nil {
		t.Fatalf("designResources(): %v", err)
	}

	// entry + task skills + references + rules + index
	want := 1 + len(lib.SkillNames()) + len(lib.ReferenceNames()) + len(lib.RuleIDs()) + 1
	if len(resources) != want {
		t.Fatalf("resources = %d, want %d", len(resources), want)
	}
	if len(lib.RuleIDs()) != 125 {
		t.Errorf("library has %d rules, want 125", len(lib.RuleIDs()))
	}

	seen := make(map[string]bool, len(resources))
	for _, r := range resources {
		if r.URI == "" || r.Name == "" {
			t.Errorf("resource %+v has an empty URI or name", r)
		}
		if seen[r.URI] {
			t.Errorf("duplicate resource URI %q", r.URI)
		}
		seen[r.URI] = true
		if strings.TrimSpace(r.Body) == "" {
			t.Errorf("%s has an empty body", r.URI)
		}
		if strings.HasPrefix(r.Body, "\n") {
			t.Errorf("%s starts with a blank line; the first line should be the title", r.URI)
		}
		if strings.TrimSpace(r.Description) == "" {
			t.Errorf("%s has an empty description", r.URI)
		}
		if n := utf8.RuneCountInString(r.Description); n > designDescriptionLimit+1 {
			t.Errorf("%s description is %d runes, want <= %d", r.URI, n, designDescriptionLimit+1)
		}
	}

	for _, uri := range []string{designEntryURI, designRuleIndexURI} {
		if !seen[uri] {
			t.Errorf("missing required resource %q", uri)
		}
	}
}

func TestDesignResourcesRewriteLinksToMCPURIs(t *testing.T) {
	lib := testDesignLibrary(t)
	resources, err := designResources(lib)
	if err != nil {
		t.Fatal(err)
	}

	byURI := make(map[string]designResource, len(resources))
	for _, r := range resources {
		byURI[r.URI] = r
		if strings.Contains(r.Body, "](../rules/") || strings.Contains(r.Body, "](../references/") {
			t.Errorf("%s still contains a relative library link", r.URI)
		}
	}

	poster := byURI[designSkillScheme+"poster"].Body
	if !strings.Contains(poster, "](rules://24-typographic-hierarchy)") {
		t.Error("poster resource does not link rules://24-typographic-hierarchy")
	}
	if !strings.Contains(poster, "](references://") {
		t.Error("poster resource does not link references://")
	}

	entry := byURI[designEntryURI].Body
	if !strings.Contains(entry, "](rules://") {
		t.Error("entry resource does not link rules://")
	}
	if strings.Contains(entry, "](rules/") {
		t.Error("entry resource kept a disk-relative rules/ link")
	}

	index := byURI[designRuleIndexURI].Body
	if !strings.HasPrefix(index, "# Rules index") {
		t.Errorf("rules index starts with %q", firstLine(index))
	}
	if !strings.Contains(index, "](rules://24-typographic-hierarchy)") {
		t.Error("rules index does not link rules://24-typographic-hierarchy")
	}
}

func TestDesignResourceIndexMentionsTheLibrary(t *testing.T) {
	lib := testDesignLibrary(t)
	index := designResourceIndex(lib)
	for _, want := range []string{"On-demand reading", designEntryURI, designRuleIndexURI, "rules://<id>"} {
		if !strings.Contains(index, want) {
			t.Errorf("instruction index does not mention %q", want)
		}
	}
	if !strings.Contains(index, "22 task workflows") {
		t.Errorf("instruction index does not report the skill count:\n%s", index)
	}
	// The instruction index is the only always-on advertisement for the
	// library. If vector is missing here, an agent never learns the skill
	// exists even though every resource resolves.
	if !strings.Contains(index, "vector") {
		t.Error("instruction index does not mention the vector skill")
	}
	if !strings.Contains(index, "125 rules") {
		t.Error("instruction index does not report the rule count")
	}
}

func TestResourcesListAndReadOverMCP(t *testing.T) {
	ctx := context.Background()
	lib := testDesignLibrary(t)

	srv := sdkmcp.NewServer(&sdkmcp.Implementation{Name: "avnac-test", Version: "0.0.0"}, nil)
	if err := registerDesignResources(srv, lib); err != nil {
		t.Fatalf("registerDesignResources(): %v", err)
	}

	client := sdkmcp.NewClient(&sdkmcp.Implementation{Name: "client", Version: "0.0.0"}, nil)
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

	listed, err := session.ListResources(ctx, nil)
	if err != nil {
		t.Fatalf("ListResources: %v", err)
	}
	want := 1 + len(lib.SkillNames()) + len(lib.ReferenceNames()) + len(lib.RuleIDs()) + 1
	if len(listed.Resources) != want {
		t.Errorf("ListResources returned %d, want %d", len(listed.Resources), want)
	}

	cases := []struct {
		uri  string
		want string
	}{
		{designEntryURI, "Avnac Graphic Design Knowledge"},
		{designSkillScheme + "poster", "# Poster Design"},
		{designReferenceScheme + "typography", "# Typography — reference"},
		{designRuleScheme + "82-bleed-trim-and-safe-areas", "# Rule:"},
		{designRuleIndexURI, "# Rules index"},
	}
	for _, tc := range cases {
		res, err := session.ReadResource(ctx, &sdkmcp.ReadResourceParams{URI: tc.uri})
		if err != nil {
			t.Errorf("ReadResource(%q): %v", tc.uri, err)
			continue
		}
		if len(res.Contents) != 1 {
			t.Errorf("ReadResource(%q) returned %d contents, want 1", tc.uri, len(res.Contents))
			continue
		}
		got := res.Contents[0]
		if got.MIMEType != designMIME {
			t.Errorf("ReadResource(%q) mime = %q, want %q", tc.uri, got.MIMEType, designMIME)
		}
		if !strings.Contains(got.Text, tc.want) {
			t.Errorf("ReadResource(%q) does not contain %q", tc.uri, tc.want)
		}
	}

	if _, err := session.ReadResource(ctx, &sdkmcp.ReadResourceParams{URI: "rules://no-such-rule"}); err == nil {
		t.Error("ReadResource(rules://no-such-rule) succeeded, want an error")
	}
}

func firstLine(s string) string {
	if i := strings.IndexByte(s, '\n'); i >= 0 {
		return s[:i]
	}
	return s
}
