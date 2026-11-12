package mcp

import "testing"

// Image art direction is decoded from the same permissive JSON path as every
// other element field. If these fields stop surviving decode, render_elements
// silently reverts to stretching photos.
func TestDecodeImageFitFields(t *testing.T) {
	raw := map[string]any{"elements": []any{
		map[string]any{
			"type":       "image",
			"url":        "https://example.com/photo.jpg",
			"left":       40,
			"top":        40,
			"width":      300,
			"height":     300,
			"fit":        "cover",
			"focalPoint": map[string]any{"x": 0.5, "y": 0.25},
			"crop":       map[string]any{"x": 0.1, "y": 0.1, "width": 0.5, "height": 0.5},
		},
	}}

	input, err := decodeRenderElementsInput(raw)
	if err != nil {
		t.Fatalf("decodeRenderElementsInput: %v", err)
	}
	if len(input.Elements) != 1 {
		t.Fatalf("elements = %d, want 1", len(input.Elements))
	}
	el := input.Elements[0]
	if el.Fit == nil || *el.Fit != "cover" {
		t.Fatalf("fit = %v, want cover", el.Fit)
	}
	if el.FocalPoint == nil || el.FocalPoint.X == nil || *el.FocalPoint.X != 0.5 {
		t.Fatalf("focalPoint.x = %v, want 0.5", el.FocalPoint)
	}
	if el.FocalPoint.Y == nil || *el.FocalPoint.Y != 0.25 {
		t.Fatalf("focalPoint.y = %v, want 0.25", el.FocalPoint)
	}
	if el.Crop == nil || el.Crop.Width == nil || *el.Crop.Width != 0.5 {
		t.Fatalf("crop.width = %v, want 0.5", el.Crop)
	}
}

func TestDecodeModifyImageFitFields(t *testing.T) {
	raw := map[string]any{"modifications": []any{
		map[string]any{
			"objectId":   "abc",
			"fit":        "cover",
			"focalPoint": map[string]any{"x": 0.25, "y": 0.75},
		},
	}}

	input, err := decodeModifyElementsInput(raw)
	if err != nil {
		t.Fatalf("decodeModifyElementsInput: %v", err)
	}
	if len(input.Modifications) != 1 {
		t.Fatalf("modifications = %d, want 1", len(input.Modifications))
	}
	mod := input.Modifications[0]
	if mod.Fit == nil || *mod.Fit != "cover" {
		t.Fatalf("fit = %v, want cover", mod.Fit)
	}
	if mod.FocalPoint == nil || mod.FocalPoint.Y == nil || *mod.FocalPoint.Y != 0.75 {
		t.Fatalf("focalPoint.y = %v, want 0.75", mod.FocalPoint)
	}
}
