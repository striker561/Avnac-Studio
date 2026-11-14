package mcp

import (
	"strings"
	"testing"
)

func TestDecodeAddPageInput(t *testing.T) {
	got := decodeAddPageInput(map[string]any{
		"name": "  Test — poster exploration  ",
	})
	if got["name"] != "Test — poster exploration" {
		t.Fatalf("name = %#v, want trimmed page name", got["name"])
	}

	// Long names are bounded, not rejected: a client should still create the page.
	long := strings.Repeat("x", 140)
	got = decodeAddPageInput(map[string]any{"name": long})
	if name, _ := got["name"].(string); len([]rune(name)) != 120 {
		t.Fatalf("long name length = %d, want 120", len([]rune(name)))
	}
}

func TestDecodeAddPageDimensionsAndBackground(t *testing.T) {
	got := decodeAddPageInput(map[string]any{
		"name":            "  Poster  ",
		"width":           "1200",
		"height":          1600,
		"backgroundColor": "#F4ECDD",
	})
	if got["name"] != "Poster" {
		t.Errorf("name = %#v", got["name"])
	}
	if got["width"] != 1200 || got["height"] != 1600 {
		t.Errorf("dimensions = %#v x %#v, want 1200x1600", got["width"], got["height"])
	}
	if got["backgroundColor"] != "#F4ECDD" {
		t.Errorf("background = %#v", got["backgroundColor"])
	}

	// Invalid dimensions fall back to the current artboard rather than creating
	// a zero/negative page.
	bad := decodeAddPageInput(map[string]any{"width": 5, "height": "nope"})
	if _, present := bad["width"]; present {
		t.Errorf("invalid width was forwarded: %#v", bad)
	}
	if _, present := bad["height"]; present {
		t.Errorf("invalid height was forwarded: %#v", bad)
	}
}

func TestDecodeResizeAndSnapshotInputs(t *testing.T) {
	got, err := decodeResizeArtboardInput(map[string]any{
		"width": "1200", "height": 1600, "backgroundColor": "#173B2C", "page": "2",
	})
	if err != nil {
		t.Fatalf("decodeResizeArtboardInput: %v", err)
	}
	if got["width"] != 1200 || got["height"] != 1600 {
		t.Errorf("resize dimensions = %#v", got)
	}
	if got["backgroundColor"] != "#173B2C" || got["page"] != "2" {
		t.Errorf("resize extras = %#v", got)
	}
	if _, err := decodeResizeArtboardInput(map[string]any{}); err == nil {
		t.Error("resize without size/background succeeded")
	}
	if _, err := decodeResizeArtboardInput(map[string]any{"width": 50}); err == nil {
		t.Error("resize accepted an out-of-range width")
	}
	if _, err := decodeSnapshotTokenInput(map[string]any{"token": "snap-1"}); err != nil {
		t.Errorf("snapshot token: %v", err)
	}
	if _, err := decodeSnapshotTokenInput(map[string]any{}); err == nil {
		t.Error("snapshot restore accepted an empty token")
	}
}

func TestDecodePageTargets(t *testing.T) {
	t.Run("go page by name", func(t *testing.T) {
		got, err := decodeGoToPageInput(map[string]any{"page": "Draft"})
		if err != nil {
			t.Fatalf("decodeGoToPageInput: %v", err)
		}
		if got["page"] != "Draft" {
			t.Fatalf("page = %#v, want Draft", got["page"])
		}
	})

	t.Run("go page by 0-based index", func(t *testing.T) {
		got, err := decodeGoToPageInput(map[string]any{"index": "1"})
		if err != nil {
			t.Fatalf("decodeGoToPageInput: %v", err)
		}
		if got["index"] != 1 {
			t.Fatalf("index = %#v, want 1", got["index"])
		}
	})

	t.Run("go page requires a target", func(t *testing.T) {
		if _, err := decodeGoToPageInput(map[string]any{}); err == nil {
			t.Fatal("expected an error when no page target is supplied")
		}
	})

	t.Run("rename name is not treated as a target", func(t *testing.T) {
		got, err := decodeRenamePageInput(map[string]any{"name": "Cover"})
		if err != nil {
			t.Fatalf("decodeRenamePageInput: %v", err)
		}
		if got["name"] != "Cover" {
			t.Fatalf("name = %#v, want Cover", got["name"])
		}
		if _, present := got["page"]; present {
			t.Fatalf("rename treated its new name as a target: %#v", got)
		}
	})

	t.Run("rename accepts a page target", func(t *testing.T) {
		got, err := decodeRenamePageInput(map[string]any{"page": "2", "name": "Cover"})
		if err != nil {
			t.Fatalf("decodeRenamePageInput: %v", err)
		}
		if got["page"] != "2" || got["name"] != "Cover" {
			t.Fatalf("decoded rename = %#v", got)
		}
	})

	t.Run("rename requires a name", func(t *testing.T) {
		if _, err := decodeRenamePageInput(map[string]any{"page": "1"}); err == nil {
			t.Fatal("expected an error when name is missing")
		}
	})

	t.Run("delete defaults to the current page", func(t *testing.T) {
		got := decodeDeletePageInput(map[string]any{})
		if len(got) != 0 {
			t.Fatalf("delete payload = %#v, want empty payload", got)
		}
	})
}

// TestInstructionsSendDraftsToPages is the trigger guard for the feature: the
// page ops only prevent project-sprawl if the always-on instructions say so.
func TestInstructionsSendDraftsToPages(t *testing.T) {
	for _, want := range []string{
		"ONE PROJECT, MANY PAGES",
		"NEVER create a new canvas",
		"add-page",
		"go-page",
		"delete-page",
		"current page",
	} {
		if !strings.Contains(DesignerInstructions, want) {
			t.Errorf("DesignerInstructions is missing %q", want)
		}
	}
}

func TestPromptsSendDraftsToPages(t *testing.T) {
	for name, text := range map[string]string{
		"design-graphic": designGraphicPrompt("a launch poster", "1080x1350", "bold"),
		"edit-canvas":    editCanvasPrompt("make the headline larger"),
	} {
		if !strings.Contains(text, "op=add-page") {
			t.Errorf("%s prompt does not name the add-page op", name)
		}
	}
	if !strings.Contains(designAuditPrompt(), "page that is currently active") {
		t.Error("design-audit prompt does not anchor the audit to the active page")
	}
}
