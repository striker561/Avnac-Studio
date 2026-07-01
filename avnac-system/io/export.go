package avnacio

import (
	"context"
	"encoding/base64"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// IOManager handles file IO operations exposed to the Wails frontend.
// It must be initialised with a context via Startup before any methods
// that call the Wails runtime are invoked.
type IOManager struct {
	ctx    context.Context
	appDir string
}

const (
	documentMetaFileName    = "meta.json"
	documentFileName        = "document.json"
	pagesFileName           = "pages.json"
	vectorBoardsFileName    = "vector-boards.json"
	vectorBoardDocsFileName = "vector-board-docs.json"
)

// NewIOManager returns an uninitialised IOManager. Call Startup once the
// Wails context is available.
func NewIOManager() *IOManager {
	return &IOManager{}
}

// Startup stores the Wails context and the resolved app data directory.
// This should be called from the main App startup hook.
func (m *IOManager) Startup(ctx context.Context, appDir string) {
	m.ctx = ctx
	m.appDir = appDir
}

func validatePersistID(persistId string) error {
	if persistId == "" {
		return fmt.Errorf("persistId is required")
	}
	for _, ch := range persistId {
		if !((ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9') || ch == '-') {
			return fmt.Errorf("invalid persistId")
		}
	}
	return nil
}

func (m *IOManager) documentsRoot() (string, error) {
	if m.appDir == "" {
		return "", fmt.Errorf("io manager not initialised")
	}
	return filepath.Join(m.appDir, "documents"), nil
}

func (m *IOManager) workspaceDir(persistId string) (string, error) {
	if err := validatePersistID(persistId); err != nil {
		return "", err
	}
	root, err := m.documentsRoot()
	if err != nil {
		return "", err
	}
	return filepath.Join(root, persistId), nil
}

func (m *IOManager) workspaceFilePath(persistId string, fileName string) (string, error) {
	dir, err := m.workspaceDir(persistId)
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, fileName), nil
}

func writeWorkspaceFile(path string, data []byte) error {
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("create workspace directories: %w", err)
	}
	// Write to a temp file in the same directory then rename so that a crash
	// mid-write never leaves a partially-written (corrupt) file behind.
	// os.Rename on the same filesystem is O(1) — it is a single metadata op.
	tmp, err := os.CreateTemp(dir, ".avnac-write-*")
	if err != nil {
		return fmt.Errorf("create temp file: %w", err)
	}
	tmpPath := tmp.Name()
	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		os.Remove(tmpPath)
		return fmt.Errorf("write workspace file: %w", err)
	}
	if err := tmp.Close(); err != nil {
		os.Remove(tmpPath)
		return fmt.Errorf("close temp file: %w", err)
	}
	if err := os.Rename(tmpPath, path); err != nil {
		os.Remove(tmpPath)
		return fmt.Errorf("rename workspace file: %w", err)
	}
	return nil
}

// ExportFile opens a native Save File dialog pre-filled with title as the
// suggested filename. The provided data bytes are written to the path the
// user confirms. Returning nil means the operation succeeded; returning nil
// after the user cancels the dialog is also expected behaviour (empty path).
//
// data is received from the frontend as a base64-encoded string which Wails
// automatically deserialises to []byte.
func (m *IOManager) ExportFile(title string, data []byte) error {
	if m.ctx == nil {
		return fmt.Errorf("io manager not initialised")
	}

	path, err := runtime.SaveFileDialog(m.ctx, runtime.SaveDialogOptions{
		Title:           "Export File",
		DefaultFilename: title,
	})
	if err != nil {
		return fmt.Errorf("save dialog: %w", err)
	}

	// User cancelled.
	if path == "" {
		return nil
	}

	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return fmt.Errorf("create parent directories: %w", err)
	}

	if err := os.WriteFile(path, data, 0o644); err != nil {
		return fmt.Errorf("write file: %w", err)
	}

	return nil
}

// ExportTextFile opens a native Save File dialog and writes text content directly.
// Passing a string avoids marshalling a large Array<number> through the Wails JSON IPC
// layer (same rationale as ExportPng's data-URL path).
func (m *IOManager) ExportTextFile(title string, content string) error {
	return m.ExportFile(title, []byte(content))
}

// ExportPng opens a native Save File dialog pre-set for PNG files. The
// dataURL argument should be the string returned by canvas.toDataURL (i.e.
// "data:image/png;base64,...").  The base64 payload is decoded in Go, which
// avoids the overhead of marshalling a large Array<number> through the Wails
// JSON IPC layer.
func (m *IOManager) ExportPng(filename string, dataURL string) error {
	if m.ctx == nil {
		return fmt.Errorf("io manager not initialised")
	}

	// Strip the optional "data:image/png;base64," prefix.
	b64 := dataURL
	if idx := strings.Index(dataURL, ","); idx >= 0 {
		b64 = dataURL[idx+1:]
	}

	decoded, err := base64.StdEncoding.DecodeString(b64)
	if err != nil {
		return fmt.Errorf("decode base64 PNG: %w", err)
	}

	path, err := runtime.SaveFileDialog(m.ctx, runtime.SaveDialogOptions{
		Title:           "Export PNG",
		DefaultFilename: filename,
		Filters: []runtime.FileFilter{
			{DisplayName: "PNG Image (*.png)", Pattern: "*.png"},
		},
	})
	if err != nil {
		return fmt.Errorf("save dialog: %w", err)
	}

	// User cancelled the dialog.
	if path == "" {
		return nil
	}

	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return fmt.Errorf("create parent directories: %w", err)
	}

	if err := os.WriteFile(path, decoded, 0o644); err != nil {
		return fmt.Errorf("write PNG: %w", err)
	}

	return nil
}

// ConfirmDialog shows a native OS confirmation dialog with the given title and
// message and returns true if the user confirmed (clicked "Yes" / the affirmative
// button).
//
// Wails maps runtime.QuestionDialog to the correct native widget on each
// platform:
//   - Windows: MessageBox with Yes/No buttons
//   - macOS:   NSAlert sheet with the two supplied button labels
//   - Linux:   GTK message dialog
func (m *IOManager) ConfirmDialog(title string, message string) (bool, error) {
	if m.ctx == nil {
		return false, fmt.Errorf("io manager not initialised")
	}
	result, err := runtime.MessageDialog(m.ctx, runtime.MessageDialogOptions{
		Type:          runtime.QuestionDialog,
		Title:         title,
		Message:       message,
		Buttons:       []string{"Yes", "No"},
		DefaultButton: "No",
		CancelButton:  "No",
	})
	if err != nil {
		return false, err
	}
	return result == "Yes", nil
}

// pagesPath returns the path for a document's multi-page state file.
func (m *IOManager) pagesPath(persistId string) (string, error) {
	return m.workspaceFilePath(persistId, pagesFileName)
}

// ReadPages reads the stored multi-page JSON for persistId. Returns an empty
// string (not an error) when no file exists yet.
func (m *IOManager) ReadPages(persistId string) (string, error) {
	path, err := m.pagesPath(persistId)
	if err != nil {
		return "", err
	}
	data, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return "", nil
	}
	if err != nil {
		return "", fmt.Errorf("read pages: %w", err)
	}
	return string(data), nil
}

// WritePages persists the multi-page JSON for persistId.
func (m *IOManager) WritePages(persistId string, json string) error {
	path, err := m.pagesPath(persistId)
	if err != nil {
		return err
	}
	if err := writeWorkspaceFile(path, []byte(json)); err != nil {
		return fmt.Errorf("write pages: %w", err)
	}
	return nil
}

// DeletePages removes the multi-page state file for persistId. It is not an
// error if the file does not exist.
func (m *IOManager) DeletePages(persistId string) error {
	path, err := m.pagesPath(persistId)
	if err != nil {
		return err
	}
	err = os.Remove(path)
	if err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("delete pages: %w", err)
	}
	return nil
}

// DuplicatePages copies the multi-page state from sourceId to targetId. It is
// not an error if the source file does not exist.
func (m *IOManager) DuplicatePages(sourceId string, targetId string) error {
	src, err := m.pagesPath(sourceId)
	if err != nil {
		return err
	}
	dst, err := m.pagesPath(targetId)
	if err != nil {
		return err
	}
	data, err := os.ReadFile(src)
	if os.IsNotExist(err) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("duplicate pages read: %w", err)
	}
	if err := writeWorkspaceFile(dst, data); err != nil {
		return fmt.Errorf("duplicate pages write: %w", err)
	}
	return nil
}
