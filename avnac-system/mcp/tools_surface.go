package mcp

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"sort"
	"strings"
	"time"

	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

// The settings panel asks two separate questions, and they are different
// failures when the answer is no:
//
//   - ToolSurface: what this build's Go layer publishes. It is read from a real
//     client session over an in-memory transport, so it cannot drift from what
//     an agent sees.
//   - CheckClient: what the connected editor window can actually dispatch. A
//     window running an older frontend bundle answers "Unknown action '…'" for
//     every action added since it loaded, which reads like a broken tool. This
//     compares the two lists and names the gap.

// ToolSurfaceOp is one op of a grouped tool as the panel displays it.
type ToolSurfaceOp struct {
	Op string `json:"op"`
	// Action is the frontend `mcp:action` string the op emits. Empty when the
	// op is answered inside Go.
	Action string `json:"action,omitempty"`
	// Client reports whether the editor window has to implement Action.
	Client bool `json:"client"`
}

// ToolSurfaceTool is one published tool.
type ToolSurfaceTool struct {
	Name        string          `json:"name"`
	Description string          `json:"description"`
	Ops         []ToolSurfaceOp `json:"ops,omitempty"`
	// Action is set for tools published one action per tool (the reads).
	Action string `json:"action,omitempty"`
}

// ToolSurfaceReport is what Settings → MCP tool surface renders.
type ToolSurfaceReport struct {
	Tools       []ToolSurfaceTool `json:"tools"`
	ToolCount   int               `json:"toolCount"`
	OpCount     int               `json:"opCount"`
	GeneratedAt string            `json:"generatedAt"`
	// Fingerprint changes whenever the published tool names or ops change, so
	// two windows can be compared at a glance.
	Fingerprint string `json:"fingerprint"`
	// ClientActions is every action the connected editor must implement.
	ClientActions []string `json:"clientActions"`
}

// ClientCheckReport is the editor window's side of the same check.
type ClientCheckReport struct {
	// Answered is true when some window replied, even if it replied with an
	// error. A stale window does reply; it just cannot name the action.
	Answered  bool     `json:"answered"`
	ClientID  string   `json:"clientId,omitempty"`
	HandlerID string   `json:"actionHandlerId,omitempty"`
	Revision  int      `json:"revision"`
	Document  string   `json:"document,omitempty"`
	Actions   []string `json:"actions"`
	// Missing lists server actions the window does not implement.
	Missing   []string `json:"missing"`
	Expected  []string `json:"expected"`
	LatencyMs int      `json:"latencyMs"`
	// Stale is the headline: the window is not running the current build.
	Stale   bool   `json:"stale"`
	Message string `json:"message"`
	Error   string `json:"error,omitempty"`
}

// readToolActions are published one per tool rather than behind an op, so the
// recorded op table cannot describe them.
var readToolActions = []string{
	"get_canvas_summary",
	"get_canvas_state",
	"get_canvas_image",
	"list_objects",
	"get_object_properties",
	"get_selection",
}

func isReadToolAction(name string) bool {
	for _, action := range readToolActions {
		if action == name {
			return true
		}
	}
	return false
}

// actionAliases maps a legacy handler name to the action it emits. Two names
// were deliberately renamed on the way out.
var actionAliases = map[string]string{
	"open_canvas": "open_workspace",
	"rename_file": "rename_workspace",
	"undo_canvas": "undo",
	"redo_canvas": "redo",
}

// serverOnlyActions are answered inside Go, so no window implements them and
// reporting them as missing would be a false alarm.
var serverOnlyActions = map[string]bool{
	"search_unsplash": true,
	"list_stickers":   true,
	"list_files":      true,
}

// vectorClientOps are the vector ops that round-trip to the editor. read,
// export and list are answered in Go; status and recover only touch the
// frontend when they fall back to a placement retry.
var vectorClientOps = map[string]string{
	"draw":   "vector_draw",
	"update": "vector_update",
	"delete": "vector_delete",
}

// vectorAllOps keeps the panel honest about the ops that exist.
var vectorAllOps = []string{"draw", "update", "read", "export", "delete", "list", "status", "recover"}

// recordToolOps captures a grouped tool's op → action table at registration.
// Registration is the only place that mapping is authoritative, so recording it
// here is cheaper and safer than parsing it back out of a description.
func (m *AvnacMCP) recordToolOps(name string, ops map[string]string) {
	names := make([]string, 0, len(ops))
	for op := range ops {
		names = append(names, op)
	}
	sort.Strings(names)
	recorded := make([]ToolSurfaceOp, 0, len(names))
	for _, op := range names {
		action := ops[op]
		if alias, ok := actionAliases[action]; ok {
			action = alias
		}
		client := action != "" && !serverOnlyActions[action]
		recorded = append(recorded, ToolSurfaceOp{Op: op, Action: action, Client: client})
	}
	m.surfaceMu.Lock()
	defer m.surfaceMu.Unlock()
	if m.surfaceOps == nil {
		m.surfaceOps = make(map[string][]ToolSurfaceOp, 8)
	}
	m.surfaceOps[name] = recorded
}

// recordVectorOps records the vector tool's op table: the three ops that
// round-trip to the editor are client actions, the rest are answered in Go.
func (m *AvnacMCP) recordVectorOps() {
	ops := make([]ToolSurfaceOp, 0, len(vectorAllOps))
	for _, op := range vectorAllOps {
		action := vectorClientOps[op]
		ops = append(ops, ToolSurfaceOp{Op: op, Action: action, Client: action != ""})
	}
	m.surfaceMu.Lock()
	defer m.surfaceMu.Unlock()
	if m.surfaceOps == nil {
		m.surfaceOps = make(map[string][]ToolSurfaceOp, 8)
	}
	m.surfaceOps["vector"] = ops
}

// recordedOps returns a copy so callers cannot mutate the registry.
func (m *AvnacMCP) recordedOps(name string) []ToolSurfaceOp {
	m.surfaceMu.Lock()
	defer m.surfaceMu.Unlock()
	ops := m.surfaceOps[name]
	if len(ops) == 0 {
		return nil
	}
	out := make([]ToolSurfaceOp, len(ops))
	copy(out, ops)
	return out
}

// expectedClientActions is every `mcp:action` a current editor window must
// implement.
func (m *AvnacMCP) expectedClientActions() []string {
	set := make(map[string]bool, 48)
	for _, action := range readToolActions {
		set[action] = true
	}
	m.surfaceMu.Lock()
	for _, ops := range m.surfaceOps {
		for _, op := range ops {
			if op.Client && op.Action != "" {
				set[op.Action] = true
			}
		}
	}
	m.surfaceMu.Unlock()
	out := make([]string, 0, len(set))
	for action := range set {
		out = append(out, action)
	}
	sort.Strings(out)
	return out
}

// ToolSurface lists the published tools by asking the server the way a client
// does, so the panel can never show a hand-maintained list that has drifted.
func (m *AvnacMCP) ToolSurface() (ToolSurfaceReport, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	client := sdkmcp.NewClient(&sdkmcp.Implementation{Name: "avnac-settings", Version: "1"}, nil)
	t1, t2 := sdkmcp.NewInMemoryTransports()
	serverSession, err := m.server.Connect(ctx, t1, nil)
	if err != nil {
		return ToolSurfaceReport{}, fmt.Errorf("read tool surface: %w", err)
	}
	defer serverSession.Close()
	session, err := client.Connect(ctx, t2, nil)
	if err != nil {
		return ToolSurfaceReport{}, fmt.Errorf("read tool surface: %w", err)
	}
	defer session.Close()

	res, err := session.ListTools(ctx, nil)
	if err != nil {
		return ToolSurfaceReport{}, fmt.Errorf("read tool surface: %w", err)
	}

	report := ToolSurfaceReport{
		Tools:         make([]ToolSurfaceTool, 0, len(res.Tools)),
		ToolCount:     len(res.Tools),
		GeneratedAt:   time.Now().UTC().Format(time.RFC3339),
		ClientActions: nonNilStrings(m.expectedClientActions()),
	}
	for _, tool := range res.Tools {
		entry := ToolSurfaceTool{Name: tool.Name, Description: firstSentence(tool.Description)}
		entry.Ops = m.recordedOps(tool.Name)
		if len(entry.Ops) == 0 && isReadToolAction(tool.Name) {
			entry.Action = tool.Name
		}
		report.OpCount += len(entry.Ops)
		report.Tools = append(report.Tools, entry)
	}
	sort.Slice(report.Tools, func(i, j int) bool { return report.Tools[i].Name < report.Tools[j].Name })

	h := sha256.New()
	for _, tool := range report.Tools {
		h.Write([]byte(tool.Name))
		for _, op := range tool.Ops {
			h.Write([]byte(op.Op))
			h.Write([]byte(op.Action))
		}
		h.Write([]byte(tool.Action))
	}
	report.Fingerprint = hex.EncodeToString(h.Sum(nil))[:12]
	return report, nil
}

// CheckClient asks the connected editor window what it can dispatch. A window
// running an older bundle still answers, with "Unknown action 'client_status'",
// which is exactly the case this has to report as stale rather than as an error.
func (m *AvnacMCP) CheckClient() (ClientCheckReport, error) {
	start := time.Now()
	ctx := m.emitContext()
	if ctx == nil {
		return ClientCheckReport{
			Stale:    true,
			Message:  "The MCP server is not registered yet; start it and refresh.",
			Expected: nonNilStrings(m.expectedClientActions()),
			Actions:  []string{},
			Missing:  []string{},
		}, nil
	}

	data, err := m.emitSync(ctx, "client_status", map[string]any{}, 4*time.Second)
	report := ClientCheckReport{
		Expected:  nonNilStrings(m.expectedClientActions()),
		Actions:   []string{},
		Missing:   []string{},
		LatencyMs: int(time.Since(start).Milliseconds()),
	}
	if err != nil {
		report.Stale = true
		report.Message = "No window answered the status check. Open a design in the editor and refresh; if another copy of Avnac is open (a browser tab or a second app window) it may be attached to the bridge and unable to answer, so close it too."
		report.Error = err.Error()
		return report, nil
	}

	payload, _ := data.(map[string]any)
	if message, _ := payload["error"].(string); message != "" {
		report.Answered = true
		report.Error = message
		report.Stale = true
		report.Message = "The window that answered does not implement client_status, so it runs an older build. Reload this window (Ctrl+R); if this one is current, another copy of Avnac is attached to the bridge (a browser tab or a second window) and answered instead, so close it."
		return report, nil
	}

	report.Answered = true
	report.ClientID = stringField(payload, "clientId")
	report.HandlerID = stringField(payload, "actionHandlerId")
	report.Revision = intFromAny(payload["revision"])
	if document, ok := payload["document"].(map[string]any); ok {
		report.Document = stringField(document, "name")
	}
	if actions := stringList(payload["actions"]); len(actions) > 0 {
		report.Actions = actions
	}

	if len(report.Actions) == 0 {
		report.Stale = true
		report.Message = "The editor window does not report its action list, so it predates this check. Reload the window (Ctrl+R) or restart the app."
		return report, nil
	}

	implemented := make(map[string]bool, len(report.Actions))
	for _, action := range report.Actions {
		implemented[action] = true
	}
	for _, action := range report.Expected {
		if !implemented[action] {
			report.Missing = append(report.Missing, action)
		}
	}
	report.Stale = len(report.Missing) > 0
	if report.Stale {
		report.Message = fmt.Sprintf("The editor window is missing %d action(s) this build publishes. Reload the window (Ctrl+R) or restart the app.", len(report.Missing))
	} else {
		report.Message = fmt.Sprintf("Editor window is current: %d actions, revision %d.", len(report.Actions), report.Revision)
	}
	return report, nil
}

// nonNilStrings keeps an empty slice out of the JSON as [] rather than null:
// the settings panel reads .length on these fields directly.
func nonNilStrings(list []string) []string {
	if list == nil {
		return []string{}
	}
	return list
}

// emitContext returns the window context captured at registration.
func (m *AvnacMCP) emitContext() context.Context {
	m.surfaceMu.Lock()
	defer m.surfaceMu.Unlock()
	return m.wailsCtx
}

func setEmitContext(m *AvnacMCP, ctx context.Context) {
	m.surfaceMu.Lock()
	defer m.surfaceMu.Unlock()
	m.wailsCtx = ctx
}

func firstSentence(text string) string {
	trimmed := strings.TrimSpace(text)
	if trimmed == "" {
		return ""
	}
	if idx := strings.Index(trimmed, ". "); idx > 0 && idx < 180 {
		return trimmed[:idx+1]
	}
	if len(trimmed) > 180 {
		return trimmed[:180] + "…"
	}
	return trimmed
}

// intFromAny reads a number out of a JSON round trip, where every number
// arrives as float64.
func intFromAny(value any) int {
	switch typed := value.(type) {
	case int:
		return typed
	case int64:
		return int(typed)
	case float64:
		return int(typed)
	case float32:
		return int(typed)
	default:
		return 0
	}
}

// stringList accepts the []string a Go-built payload carries and the []any a
// JSON round trip produces.
func stringList(value any) []string {
	switch typed := value.(type) {
	case []string:
		out := make([]string, 0, len(typed))
		for _, item := range typed {
			if trimmed := strings.TrimSpace(item); trimmed != "" {
				out = append(out, trimmed)
			}
		}
		return out
	case []any:
		out := make([]string, 0, len(typed))
		for _, item := range typed {
			if text, ok := item.(string); ok && strings.TrimSpace(text) != "" {
				out = append(out, strings.TrimSpace(text))
			}
		}
		return out
	default:
		return nil
	}
}
