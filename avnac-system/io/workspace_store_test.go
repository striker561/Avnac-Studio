package avnacio

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func newTestIOManager(t *testing.T) *IOManager {
	t.Helper()
	dir := t.TempDir()
	m := NewIOManager()
	m.Startup(context.Background(), dir)
	return m
}

func buildDocumentRecord(t *testing.T, persistID, name string, payloadSize int) string {
	t.Helper()
	document := map[string]any{
		"artboard": map[string]int{"width": 1920, "height": 1080},
		"payload":  strings.Repeat("x", payloadSize),
	}
	documentJSON, err := json.Marshal(document)
	if err != nil {
		t.Fatalf("marshal document: %v", err)
	}
	record := map[string]any{
		"id":        persistID,
		"name":      name,
		"updatedAt": int64(1_700_000_000_000),
		"document":  json.RawMessage(documentJSON),
	}
	data, err := json.Marshal(record)
	if err != nil {
		t.Fatalf("marshal record: %v", err)
	}
	return string(data)
}

func buildPagesJSON(t *testing.T, pageCount, payloadPerPage int) string {
	t.Helper()
	pages := make([]map[string]any, pageCount)
	for i := range pages {
		pages[i] = map[string]any{
			"artboard": map[string]int{"width": 1080, "height": 1080},
			"payload":  strings.Repeat("p", payloadPerPage),
		}
	}
	envelope := map[string]any{
		"v":           1,
		"currentPage": 0,
		"pages":       pages,
	}
	data, err := json.Marshal(envelope)
	if err != nil {
		t.Fatalf("marshal pages: %v", err)
	}
	return string(data)
}

func TestValidatePersistID(t *testing.T) {
	t.Parallel()

	m := NewIOManager()
	m.Startup(context.Background(), t.TempDir())

	tests := []struct {
		id    string
		valid bool
	}{
		{"abc-123", true},
		{"workspace-01", true},
		{"", false},
		{"UPPER", false},
		{"has space", false},
		{"bad_underscore", false},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.id, func(t *testing.T) {
			t.Parallel()
			_, err := m.workspaceDir(tt.id)
			if tt.valid && err != nil {
				t.Fatalf("expected valid id, got %v", err)
			}
			if !tt.valid && err == nil {
				t.Fatal("expected invalid id error")
			}
		})
	}
}

func TestWriteWorkspaceFileAtomic(t *testing.T) {
	dir := t.TempDir()
	target := filepath.Join(dir, "nested", "document.json")
	payload := []byte(strings.Repeat("z", 1<<20)) // 1 MiB

	if err := writeWorkspaceFile(target, payload); err != nil {
		t.Fatalf("writeWorkspaceFile() error = %v", err)
	}

	got, err := os.ReadFile(target)
	if err != nil {
		t.Fatalf("read final file: %v", err)
	}
	if len(got) != len(payload) {
		t.Fatalf("file size = %d, want %d", len(got), len(payload))
	}

	matches, _ := filepath.Glob(filepath.Join(dir, "nested", ".avnac-write-*"))
	if len(matches) != 0 {
		t.Fatalf("expected no temp files left behind, found %v", matches)
	}
}

func TestDocumentRecordRoundTrip(t *testing.T) {
	m := newTestIOManager(t)
	const persistID = "doc-roundtrip"
	record := buildDocumentRecord(t, persistID, "Poster", 256)

	if err := m.WriteDocumentRecord(persistID, record); err != nil {
		t.Fatalf("WriteDocumentRecord() error = %v", err)
	}

	got, err := m.ReadDocumentRecord(persistID)
	if err != nil {
		t.Fatalf("ReadDocumentRecord() error = %v", err)
	}
	if got == "" {
		t.Fatal("expected non-empty record")
	}

	var envelope documentRecordEnvelope
	if err := json.Unmarshal([]byte(got), &envelope); err != nil {
		t.Fatalf("decode envelope: %v", err)
	}
	if envelope.ID != persistID || envelope.Name != "Poster" {
		t.Fatalf("envelope = %#v", envelope)
	}
	if len(envelope.Document) == 0 {
		t.Fatal("expected document payload")
	}
}

func TestHugeDocumentRecordRoundTrip(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping huge document test in short mode")
	}

	m := newTestIOManager(t)
	const persistID = "huge-doc"
	const payloadSize = 8 << 20 // 8 MiB inline JSON payload
	record := buildDocumentRecord(t, persistID, "Huge poster", payloadSize)

	if err := m.WriteDocumentRecord(persistID, record); err != nil {
		t.Fatalf("WriteDocumentRecord() error = %v", err)
	}

	got, err := m.ReadDocumentRecord(persistID)
	if err != nil {
		t.Fatalf("ReadDocumentRecord() error = %v", err)
	}

	var envelope documentRecordEnvelope
	if err := json.Unmarshal([]byte(got), &envelope); err != nil {
		t.Fatalf("decode envelope: %v", err)
	}
	if len(envelope.Document) < payloadSize {
		t.Fatalf("document payload shrunk: got %d bytes", len(envelope.Document))
	}

	listJSON, err := m.ListDocuments()
	if err != nil {
		t.Fatalf("ListDocuments() error = %v", err)
	}
	if !strings.Contains(listJSON, persistID) {
		t.Fatalf("ListDocuments() = %q, want id %q", listJSON, persistID)
	}
}

func TestHugePagesRoundTrip(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping huge pages test in short mode")
	}

	m := newTestIOManager(t)
	const persistID = "huge-pages"
	pagesJSON := buildPagesJSON(t, 3, 3<<20) // ~9 MiB per file

	if err := m.WritePages(persistID, pagesJSON); err != nil {
		t.Fatalf("WritePages() error = %v", err)
	}

	got, err := m.ReadPages(persistID)
	if err != nil {
		t.Fatalf("ReadPages() error = %v", err)
	}
	if len(got) != len(pagesJSON) {
		t.Fatalf("pages size = %d, want %d", len(got), len(pagesJSON))
	}
	if got != pagesJSON {
		t.Fatal("pages payload mismatch after round trip")
	}
}

func TestDuplicateAndDeletePages(t *testing.T) {
	m := newTestIOManager(t)
	sourceID := "source-doc"
	targetID := "target-doc"
	pagesJSON := buildPagesJSON(t, 2, 1024)

	if err := m.WritePages(sourceID, pagesJSON); err != nil {
		t.Fatalf("WritePages(source) error = %v", err)
	}
	if err := m.DuplicatePages(sourceID, targetID); err != nil {
		t.Fatalf("DuplicatePages() error = %v", err)
	}

	got, err := m.ReadPages(targetID)
	if err != nil {
		t.Fatalf("ReadPages(target) error = %v", err)
	}
	if got != pagesJSON {
		t.Fatal("duplicated pages mismatch")
	}

	if err := m.DeletePages(sourceID); err != nil {
		t.Fatalf("DeletePages() error = %v", err)
	}
	remaining, err := m.ReadPages(sourceID)
	if err != nil {
		t.Fatalf("ReadPages after delete error = %v", err)
	}
	if remaining != "" {
		t.Fatalf("expected empty pages after delete, got %d bytes", len(remaining))
	}
}

func TestDeleteDocumentRemovesWorkspace(t *testing.T) {
	m := newTestIOManager(t)
	const persistID = "delete-me"
	record := buildDocumentRecord(t, persistID, "Temp", 32)

	if err := m.WriteDocumentRecord(persistID, record); err != nil {
		t.Fatalf("WriteDocumentRecord() error = %v", err)
	}
	if err := m.DeleteDocument(persistID); err != nil {
		t.Fatalf("DeleteDocument() error = %v", err)
	}

	got, err := m.ReadDocumentRecord(persistID)
	if err != nil {
		t.Fatalf("ReadDocumentRecord() error = %v", err)
	}
	if got != "" {
		t.Fatalf("expected empty record after delete, got %d bytes", len(got))
	}
}

func TestVectorBoardStorageRoundTrip(t *testing.T) {
	m := newTestIOManager(t)
	const persistID = "vector-boards"
	boards := `{"boards":[{"id":"vb-1","name":"Icon"}]}`
	docs := `{"vb-1":{"objects":[]}}`

	if err := m.WriteVectorBoards(persistID, boards); err != nil {
		t.Fatalf("WriteVectorBoards() error = %v", err)
	}
	if err := m.WriteVectorBoardDocs(persistID, docs); err != nil {
		t.Fatalf("WriteVectorBoardDocs() error = %v", err)
	}

	gotBoards, err := m.ReadVectorBoards(persistID)
	if err != nil || gotBoards != boards {
		t.Fatalf("ReadVectorBoards() = %q, err = %v", gotBoards, err)
	}
	gotDocs, err := m.ReadVectorBoardDocs(persistID)
	if err != nil || gotDocs != docs {
		t.Fatalf("ReadVectorBoardDocs() = %q, err = %v", gotDocs, err)
	}
}
