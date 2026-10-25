package mcp

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"

	avnacio "Avnac/avnac-system/io"
	"github.com/google/jsonschema-go/jsonschema"
)

func TestDecodeRenderElementsStringifiedArray(t *testing.T) {
	raw := map[string]any{
		"elements":       `[{"type":"ellipse","left":640,"top":640,"width":600,"height":600,"fill":"#7a1e1e","opacity":0.55}]`,
		"includePreview": "true",
	}
	out, err := decodeRenderElementsInput(raw)
	if err != nil {
		t.Fatalf("decode failed: %v", err)
	}
	if len(out.Elements) != 1 {
		t.Fatalf("expected 1 element, got %d", len(out.Elements))
	}
	if out.Elements[0].Type != "ellipse" {
		t.Errorf("expected ellipse, got %q", out.Elements[0].Type)
	}
	if out.IncludePreview == nil || *out.IncludePreview != true {
		t.Errorf("expected includePreview=true, got %v", out.IncludePreview)
	}
}

func TestDecodeRenderElementsNativeArray(t *testing.T) {
	raw := map[string]any{
		"elements": []any{
			map[string]any{"type": "text", "text": "NIGHT", "fontSize": 230},
		},
		"includePreview": true,
	}
	out, err := decodeRenderElementsInput(raw)
	if err != nil {
		t.Fatalf("decode failed: %v", err)
	}
	if len(out.Elements) != 1 || out.Elements[0].Type != "text" {
		t.Fatalf("unexpected elements: %+v", out.Elements)
	}
}

func TestFlexibleStringList(t *testing.T) {
	ids, err := flexibleStringList(`["a","b"]`)
	if err != nil || len(ids) != 2 {
		t.Fatalf("stringified list failed: %v %v", ids, err)
	}
	ids, err = flexibleStringList([]any{"x", "y"})
	if err != nil || len(ids) != 2 {
		t.Fatalf("native list failed: %v %v", ids, err)
	}
	if b, ok := flexibleBool("true"); !ok || !b {
		t.Fatalf("flexibleBool string failed")
	}
}

func TestDecodeCreateCanvasStringInts(t *testing.T) {
	raw := map[string]any{"width": "1080", "height": "1080", "name": "test"}
	out, err := decodeCreateCanvasInput(raw)
	if err != nil {
		t.Fatalf("decode failed: %v", err)
	}
	if out.Width != 1080 || out.Height != 1080 {
		t.Fatalf("unexpected dims: %+v", out)
	}
}

func TestDecodeApplyPresetAlias(t *testing.T) {
	out, err := decodeApplyPresetInput(map[string]any{"preset": "ig-square"})
	if err != nil || out.PresetID != "ig-square" {
		t.Fatalf("preset alias failed: %v %+v", err, out)
	}
	out, err = decodeApplyPresetInput(map[string]any{"presetId": "hd"})
	if err != nil || out.PresetID != "hd" {
		t.Fatalf("presetId failed: %v %+v", err, out)
	}
	if _, err := decodeApplyPresetInput(map[string]any{}); err == nil {
		t.Fatalf("expected error for missing preset")
	}
}

func TestDecodeSetBackgroundAlias(t *testing.T) {
	out, err := decodeSetBackgroundInput(map[string]any{"backgroundColor": "#0f172a"})
	if err != nil || out.Color != "#0f172a" {
		t.Fatalf("backgroundColor alias failed: %v %+v", err, out)
	}
	if _, err := decodeSetBackgroundInput(map[string]any{}); err == nil {
		t.Fatalf("expected error for missing color")
	}
}

func TestDecodeAlignNormalize(t *testing.T) {
	for in, want := range map[string]string{
		"center": "centerH",
		"middle": "centerV",
		"left":   "left",
		"bottom": "bottom",
	} {
		out, err := decodeAlignInput(map[string]any{"type": in})
		if err != nil || out.Type != want {
			t.Fatalf("align %q -> %q, want %q (err %v)", in, out.Type, want, err)
		}
	}
	if _, err := decodeAlignInput(map[string]any{}); err == nil {
		t.Fatalf("expected error for missing type")
	}
}

func TestDecodeDistributeAlias(t *testing.T) {
	out, err := decodeDistributeInput(map[string]any{"type": "horizontal"})
	if err != nil || out.Direction != "horizontal" {
		t.Fatalf("type alias failed: %v %+v", err, out)
	}
	if _, err := decodeDistributeInput(map[string]any{"direction": "diagonal"}); err == nil {
		t.Fatalf("expected error for bad direction")
	}
}

func TestDecodeCreateCanvasColorAlias(t *testing.T) {
	out, err := decodeCreateCanvasInput(map[string]any{"width": 1080, "height": 1080, "color": "#fff"})
	if err != nil {
		t.Fatalf("decode failed: %v", err)
	}
	if out.BackgroundColor != "#fff" {
		t.Fatalf("color alias not forwarded: %+v", out)
	}
}

func TestDecodeRenderElementsTextControls(t *testing.T) {
	raw := map[string]any{
		"elements": []any{
			map[string]any{
				"type": "text", "text": "Hi", "textAlign": "center",
				"fontWeight": "700", "fontStyle": "italic",
				"lineHeight": 1.5, "underline": true,
			},
			map[string]any{
				"type": "line", "x1": 0, "y1": 0, "x2": 100, "y2": 0,
				"stroke": "#fff", "strokeWidth": 4,
			},
		},
	}
	out, err := decodeRenderElementsInput(raw)
	if err != nil {
		t.Fatalf("decode failed: %v", err)
	}
	if len(out.Elements) != 2 {
		t.Fatalf("expected 2 elements, got %d", len(out.Elements))
	}
	tx := out.Elements[0]
	if tx.TextAlign == nil || *tx.TextAlign != "center" {
		t.Errorf("textAlign lost: %+v", tx)
	}
	if tx.FontWeight == nil || *tx.FontWeight != "700" {
		t.Errorf("fontWeight lost: %+v", tx)
	}
	if tx.Underline == nil || !*tx.Underline {
		t.Errorf("underline lost: %+v", tx)
	}
	ln := out.Elements[1]
	if ln.StrokeWidth == nil || *ln.StrokeWidth != 4 {
		t.Errorf("line strokeWidth lost: %+v", ln)
	}
}

func TestDecodeModifyTextControls(t *testing.T) {
	raw := map[string]any{
		"modifications": []any{
			map[string]any{"objectId": "abc", "textAlign": "center", "fontWeight": "700"},
		},
	}
	out, err := decodeModifyElementsInput(raw)
	if err != nil {
		t.Fatalf("decode failed: %v", err)
	}
	if out.Modifications[0].TextAlign == nil || *out.Modifications[0].TextAlign != "center" {
		t.Errorf("modify textAlign lost: %+v", out.Modifications[0])
	}
}

// The review found that fontWeight was documented numerically
// (400|500|600|700|bold) but typed *string, so fontWeight: 700 came back as
// "cannot unmarshal number into ... FontWeight of type string", and that an
// object stroke failed the same way. Both were per-element fields bypassing
// the flexible-input helpers, which only normalized top-level keys.
func TestDecodeRenderElementsNestedScalarForms(t *testing.T) {
	raw := map[string]any{
		"elements": []any{
			map[string]any{
				"type":       "text",
				"text":       "COASTAL",
				"fontWeight": 700, // number, exactly as the description advertises
				"fontSize":   "230",
				"lineHeight": "1.4",
				"underline":  "true",
				"left":       "100",
				"stroke":     map[string]any{"color": "#ff00ff"},
			},
		},
	}
	out, err := decodeRenderElementsInput(raw)
	if err != nil {
		t.Fatalf("decode failed: %v", err)
	}
	el := out.Elements[0]
	if el.FontWeight == nil || *el.FontWeight != "700" {
		t.Errorf("numeric fontWeight not coerced to string: %v", el.FontWeight)
	}
	if el.FontSize == nil || *el.FontSize != 230 {
		t.Errorf("string fontSize not coerced to int: %v", el.FontSize)
	}
	if el.LineHeight == nil || *el.LineHeight != 1.4 {
		t.Errorf("string lineHeight not coerced to float: %v", el.LineHeight)
	}
	if el.Underline == nil || !*el.Underline {
		t.Errorf("string underline not coerced to bool: %v", el.Underline)
	}
	if el.Left == nil || *el.Left != 100 {
		t.Errorf("string left not coerced to float: %v", el.Left)
	}
	if el.Stroke == nil || *el.Stroke != "#ff00ff" {
		t.Errorf("object stroke not reduced to its color: %v", el.Stroke)
	}
}

func TestDecodeModifyElementsNestedScalarForms(t *testing.T) {
	raw := map[string]any{
		"modifications": []any{
			map[string]any{
				"objectId":   "abc",
				"fontWeight": 600,
				"fontSize":   "48",
				"opacity":    "0.5",
				"fill":       map[string]any{"color": "#123456"},
			},
		},
	}
	out, err := decodeModifyElementsInput(raw)
	if err != nil {
		t.Fatalf("decode failed: %v", err)
	}
	mod := out.Modifications[0]
	if mod.FontWeight == nil || *mod.FontWeight != "600" {
		t.Errorf("numeric fontWeight not coerced to string: %v", mod.FontWeight)
	}
	if mod.FontSize == nil || *mod.FontSize != 48 {
		t.Errorf("string fontSize not coerced to int: %v", mod.FontSize)
	}
	if mod.Opacity == nil || *mod.Opacity != 0.5 {
		t.Errorf("string opacity not coerced to float: %v", mod.Opacity)
	}
	if mod.Fill == nil || *mod.Fill != "#123456" {
		t.Errorf("object fill not reduced to its color: %v", mod.Fill)
	}
}

func TestExplicitSchemasDocumented(t *testing.T) {
	if emptyObjSchema().Type != "object" {
		t.Fatalf("empty schema must be object")
	}
	s := objSchema(map[string]*jsonschema.Schema{"elements": desc("x")}, "elements")
	if s.Type != "object" {
		t.Fatalf("object schema must be object")
	}
	if len(s.Required) != 1 || s.Required[0] != "elements" {
		t.Fatalf("required not preserved: %v", s.Required)
	}
	if _, ok := s.Properties["elements"]; !ok {
		t.Fatalf("properties not preserved")
	}
}

func TestDecodeOpenCanvasInput(t *testing.T) {
	out, err := decodeOpenCanvasInput(map[string]any{"fileId": "abc-123"})
	if err != nil {
		t.Fatalf("decode failed: %v", err)
	}
	if out.FileID != "abc-123" {
		t.Errorf("fileId lost: %+v", out)
	}

	// Alias: id.
	out, err = decodeOpenCanvasInput(map[string]any{"id": "xyz"})
	if err != nil {
		t.Fatalf("decode alias failed: %v", err)
	}
	if out.FileID != "xyz" {
		t.Errorf("alias id not honored: %+v", out)
	}

	if _, err := decodeOpenCanvasInput(map[string]any{}); err == nil {
		t.Fatalf("expected error for missing fileId")
	}
}

func TestDecodeRenameFileInput(t *testing.T) {
	out, err := decodeRenameFileInput(map[string]any{"fileId": "abc-123", "name": "Summer Flyer"})
	if err != nil {
		t.Fatalf("decode failed: %v", err)
	}
	if out.FileID != "abc-123" || out.Name != "Summer Flyer" {
		t.Errorf("fields lost: %+v", out)
	}

	// Alias: title for name.
	out, err = decodeRenameFileInput(map[string]any{"id": "xyz", "title": "Poster v2"})
	if err != nil {
		t.Fatalf("decode alias failed: %v", err)
	}
	if out.FileID != "xyz" || out.Name != "Poster v2" {
		t.Errorf("aliases not honored: %+v", out)
	}

	if _, err := decodeRenameFileInput(map[string]any{"fileId": "abc"}); err == nil {
		t.Fatalf("expected error for missing name")
	}
	if _, err := decodeRenameFileInput(map[string]any{"name": "No id"}); err == nil {
		t.Fatalf("expected error for missing fileId")
	}
}

func TestFindWorkspaceMeta(t *testing.T) {
	metas := []workspaceMeta{
		{ID: "aaa", Name: "First"},
		{ID: "bbb", Name: "Second"},
	}
	if findWorkspaceMeta(metas, "bbb") == nil {
		t.Fatalf("expected to find bbb")
	}
	if findWorkspaceMeta(metas, "zzz") != nil {
		t.Fatalf("expected nil for unknown id")
	}
}

func TestListWorkspaceMetasViaIOManager(t *testing.T) {
	appDir := t.TempDir()
	docsDir := filepath.Join(appDir, "documents", "test-canvas")
	if err := os.MkdirAll(docsDir, 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	meta := map[string]any{
		"id":             "test-canvas",
		"name":           "Smoke Test Canvas",
		"updatedAt":      time.Now().UnixMilli(),
		"artboardWidth":  1920,
		"artboardHeight": 1080,
	}
	raw, _ := json.Marshal(meta)
	if err := os.WriteFile(filepath.Join(docsDir, "meta.json"), raw, 0o644); err != nil {
		t.Fatalf("write meta: %v", err)
	}

	io := avnacio.NewIOManager()
	io.Startup(context.Background(), appDir)
	m := NewAvnacMCP(nil, io, nil)

	metas, err := m.listWorkspaceMetas()
	if err != nil {
		t.Fatalf("listWorkspaceMetas failed: %v", err)
	}
	if len(metas) != 1 || metas[0].ID != "test-canvas" || metas[0].Name != "Smoke Test Canvas" {
		t.Fatalf("unexpected metas: %+v", metas)
	}
	if metas[0].ArtboardWidth != 1920 || metas[0].ArtboardHeight != 1080 {
		t.Fatalf("dimensions lost: %+v", metas[0])
	}

	if findWorkspaceMeta(metas, "test-canvas") == nil {
		t.Fatalf("expected open_canvas pre-check to find test-canvas")
	}
}
