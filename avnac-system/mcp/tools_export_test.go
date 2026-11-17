package mcp

import (
	"context"
	"encoding/base64"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

func TestWritePNGFileAddsExtension(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "preview")
	got, err := writePNGFile(path, []byte("png-bytes"))
	if err != nil {
		t.Fatalf("writePNGFile: %v", err)
	}
	if filepath.Ext(got) != ".png" {
		t.Errorf("path = %q, want a .png extension", got)
	}
	data, err := os.ReadFile(got)
	if err != nil {
		t.Fatalf("read written file: %v", err)
	}
	if string(data) != "png-bytes" {
		t.Errorf("bytes = %q, want png-bytes", data)
	}
}

func TestWritePNGFileRejectsDirectory(t *testing.T) {
	dir := t.TempDir()
	if _, err := writePNGFile(dir, []byte("x")); err == nil {
		t.Fatal("writePNGFile accepted a directory path")
	}
}

func TestExportPngWritesFilePathThroughTheTool(t *testing.T) {
	ctx := context.Background()
	m := NewAvnacMCP(nil, nil, nil)
	m.emitFn = func(_ context.Context, action string, _ any, _ time.Duration) (any, error) {
		if action != "export_png" {
			t.Fatalf("action = %q, want export_png", action)
		}
		return map[string]any{
			"imageData": base64.StdEncoding.EncodeToString([]byte("png-bytes")),
		}, nil
	}
	m.RegisterTools(ctx)

	client := sdkmcp.NewClient(&sdkmcp.Implementation{Name: "export-test", Version: "0"}, nil)
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

	target := filepath.Join(t.TempDir(), "handoff")
	res, err := session.CallTool(ctx, &sdkmcp.CallToolParams{
		Name:      "export",
		Arguments: map[string]any{"op": "png", "filePath": target},
	})
	if err != nil {
		t.Fatalf("export: %v", err)
	}
	if res.IsError {
		t.Fatalf("export returned an error: %v", res.Content)
	}
	data, err := os.ReadFile(target + ".png")
	if err != nil {
		t.Fatalf("read written PNG: %v", err)
	}
	if string(data) != "png-bytes" {
		t.Errorf("bytes = %q, want png-bytes", data)
	}
	var text string
	for _, content := range res.Content {
		if c, ok := content.(*sdkmcp.TextContent); ok {
			text += c.Text
		}
	}
	if !strings.Contains(text, target+".png") {
		t.Errorf("result text = %q, want the written path", text)
	}
}
