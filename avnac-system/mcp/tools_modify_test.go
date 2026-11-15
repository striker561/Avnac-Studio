package mcp

import "testing"

func TestDecodeModifyTargetAndImageFields(t *testing.T) {
	input, err := decodeModifyElementsInput(map[string]any{
		"modifications": []any{
			map[string]any{
				"targetName": "Hero",
				"newName":    "Headline",
				"url":        "data:image/svg+xml;base64,abc",
				"width":      "420",
			},
		},
	})
	if err != nil {
		t.Fatalf("decodeModifyElementsInput: %v", err)
	}
	if len(input.Modifications) != 1 {
		t.Fatalf("modifications = %d", len(input.Modifications))
	}
	mod := input.Modifications[0]
	if mod.TargetName == nil || *mod.TargetName != "Hero" {
		t.Errorf("targetName = %v", mod.TargetName)
	}
	if mod.NewName == nil || *mod.NewName != "Headline" {
		t.Errorf("newName = %v", mod.NewName)
	}
	if mod.URL == nil || *mod.URL == "" {
		t.Error("url was dropped")
	}
	if mod.Width == nil || *mod.Width != 420 {
		t.Errorf("width = %v", mod.Width)
	}
}
