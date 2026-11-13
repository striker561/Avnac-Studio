package mcp

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"time"

	"Avnac/internal/vector"

	"github.com/google/jsonschema-go/jsonschema"
	"github.com/google/uuid"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// The vector tool is a noun with op verbs, like the other mutation tools. It is
// separate from `elements` because a vector drawing is a different document
// model: layers of strokes with node geometry, an IR that survives edits, and
// SVG output. Folding it into `elements` would put two document models behind
// one schema without sharing a transaction.
//
// State: each draw creates a board held for the session. The placed element is
// the durable artifact (its src is a data URL containing real <path> markup),
// so losing the session does not lose the drawing — only the ability to edit it
// by id.

const vectorOpsHelp = "draw, update, read, export, delete, list"

func (m *AvnacMCP) registerVectorTool(wailsCtx context.Context) {
	mcp.AddTool(m.server, &mcp.Tool{
		Name: "vector",
		Description: "Draw and edit original vector artwork as editable cubic paths. " +
			"op=draw resolves a small scene-graph IR (objects with type/box/paint, constraints, mirrors) " +
			"and places it on the active page as real SVG; objects are rect, ellipse, circle, capsule, polygon, star, line, path. " +
			"Use it for logos, icons, characters, badges, patterns and diagram figures — anything that should scale cleanly and be editable by object id. " +
			"op=update (boardId, operations[]) edits the stored drawing by id (resize, move, rotate, mirror, restyle, reorder, delete, add) without redrawing the scene; " +
			"op=read returns the IR and v3 document; op=export returns the SVG source; op=delete removes the placed element; op=list lists boards from this session. " +
			"Relations: constraints [{relation: centered_on|left_of|right_of|above|below|inside|aligned_with|equal_size, target}] and mirrorOf+axis. " +
			"Read skill://vector and rules://125-bezier-curves-and-path-construction before complex work.",
		InputSchema: objSchema(map[string]*jsonschema.Schema{
			"op":         desc("Operation: " + vectorOpsHelp + "."),
			"objects":    desc("draw: array of object specs, or a JSON-encoded string of that array. Each object needs id and type."),
			"object":     desc("draw: a single object spec, accepted instead of objects."),
			"canvas":     desc("draw: {width, height, background}. Defaults to 1200x900. Must match the intended board."),
			"layers":     desc("draw: optional [{id, name}] paint/visibility bands, bottom first. Objects name a layer by id."),
			"name":       desc("draw: board name, also the placed element's name."),
			"x":          desc("draw: page position (top-left, page pixels) for the placed element. Defaults to the page centre."),
			"y":          desc("draw: page position (top-left, page pixels) for the placed element."),
			"scale":      desc("draw: display scale for the placed element. 0/omitted fits the board within 640 px."),
			"boardId":    desc("update/read/export/delete: id returned by draw."),
			"operations": desc("update: array of {op, target, ...}, or a JSON-encoded string. Ops: resize, move, rotate, mirror, restyle, reorder, delete, add."),
			"includeSVG": desc("read/update: include the full SVG text in the response (off by default; it can be large)."),
		}, "op"),
	}, func(ctx context.Context, req *mcp.CallToolRequest, raw map[string]any) (*mcp.CallToolResult, any, error) {
		return m.handleVectorTool(wailsCtx, raw)
	})
}

func (m *AvnacMCP) handleVectorTool(wailsCtx context.Context, raw map[string]any) (*mcp.CallToolResult, any, error) {
	op := strings.ToLower(stringField(raw, "op", "operation", "action"))
	switch op {
	case "":
		return nil, nil, fmt.Errorf("vector requires op: one of %s", vectorOpsHelp)
	case "draw":
		return m.vectorDraw(wailsCtx, raw)
	case "update":
		return m.vectorUpdate(wailsCtx, raw)
	case "read":
		return m.vectorRead(raw)
	case "export":
		return m.vectorExport(raw)
	case "delete":
		return m.vectorDelete(wailsCtx, raw)
	case "list":
		return m.vectorList()
	default:
		return nil, nil, fmt.Errorf("unknown vector op %q; expected one of %s", op, vectorOpsHelp)
	}
}

// decodeVectorIR accepts the draw payload in its loose MCP form: nested JSON may
// arrive as real values or JSON-encoded strings, and a single object may stand
// in for the array.
func decodeVectorIR(raw map[string]any) (vector.IR, error) {
	var ir vector.IR
	canvas := normalizeJSONValue(raw["canvas"])
	objects := normalizeJSONValue(raw["objects"])
	layers := normalizeJSONValue(raw["layers"])
	if objects == nil {
		if single := normalizeJSONValue(raw["object"]); single != nil {
			objects = []any{single}
		}
	}
	// A single object map is a common shorthand; accept it instead of failing
	// with a decode error.
	if single, ok := objects.(map[string]any); ok {
		objects = []any{single}
	}
	if objects == nil {
		return ir, fmt.Errorf("objects is required: an array of objects with id and type (see skill://vector)")
	}
	payload := map[string]any{"objects": objects}
	if canvas != nil {
		payload["canvas"] = canvas
	}
	if layers != nil {
		payload["layers"] = layers
	}
	buf, err := json.Marshal(payload)
	if err != nil {
		return ir, fmt.Errorf("objects is not valid JSON: %w", err)
	}
	if err := json.Unmarshal(buf, &ir); err != nil {
		return ir, fmt.Errorf("objects could not be decoded: %w", err)
	}
	if ir.Canvas.Width.Float() <= 0 || ir.Canvas.Height.Float() <= 0 {
		if canvas != nil {
			return ir, fmt.Errorf("canvas needs positive width and height")
		}
		ir.Canvas.Width = 1200
		ir.Canvas.Height = 900
	}
	return ir, nil
}

func decodeVectorOperations(raw map[string]any) ([]vector.Operation, error) {
	value := normalizeJSONValue(raw["operations"])
	if value == nil {
		return nil, fmt.Errorf("operations is required: an array of {op, target, ...}")
	}
	items, ok := value.([]any)
	if !ok {
		return nil, fmt.Errorf("operations must be an array")
	}
	normalized := make([]any, 0, len(items))
	for _, item := range items {
		normalized = append(normalized, normalizeJSONValue(item))
	}
	buf, err := json.Marshal(normalized)
	if err != nil {
		return nil, err
	}
	var ops []vector.Operation
	if err := json.Unmarshal(buf, &ops); err != nil {
		return nil, fmt.Errorf("operations could not be decoded: %w", err)
	}
	if len(ops) == 0 {
		return nil, fmt.Errorf("operations is empty")
	}
	return ops, nil
}

func (m *AvnacMCP) vectorDraw(wailsCtx context.Context, raw map[string]any) (*mcp.CallToolResult, any, error) {
	ir, err := decodeVectorIR(raw)
	if err != nil {
		return nil, nil, err
	}
	boardID := uuid.New().String()
	name := stringField(raw, "name")
	board, err := vector.NewBoard(boardID, name, ir)
	if err != nil {
		return nil, nil, err
	}
	board.Name = name
	if board.Name == "" {
		board.Name = "Vector drawing"
	}

	placement := map[string]any{
		"boardId": boardID,
		"name":    board.Name,
		"src":     board.Result.DataURL,
		"width":   board.Result.Doc.Size.Width,
		"height":  board.Result.Doc.Size.Height,
	}
	// Only forward coordinates the caller actually gave: zero is a valid
	// top-left position, so filling it in would override the editor's centring.
	for key, aliases := range map[string][]string{
		"x": {"x", "left"}, "y": {"y", "top"}, "scale": {"scale", "multiplier"},
	} {
		for _, alias := range aliases {
			if value, ok := raw[alias]; ok && value != nil {
				if f, ok := flexibleFloat(value); ok {
					placement[key] = f
				}
				break
			}
		}
	}
	resp, err := m.emitVectorAction(wailsCtx, "vector_draw", placement)
	if err != nil {
		return nil, nil, err
	}
	board.NodeID = stringField(resp, "objectId", "nodeId", "id")
	if board.NodeID == "" {
		return nil, nil, fmt.Errorf("vector_draw: the editor did not return the placed object id")
	}

	m.vectorMu.Lock()
	m.vectorBoards[boardID] = board
	m.vectorMu.Unlock()

	data := map[string]any{
		"boardId":  boardID,
		"objectId": board.NodeID,
		"name":     board.Name,
		"canvas":   map[string]any{"width": board.Result.Doc.Size.Width, "height": board.Result.Doc.Size.Height},
		"objects":  len(board.Result.Objects),
		"layers":   len(board.Result.Doc.Layers),
		"segments": totalSegments(board.Result.Doc),
		"bytes":    len(board.Result.SVG),
		"bounds":   boundsMap(board.Result.Bounds),
		"message": fmt.Sprintf("Drew %q: %d objects on a %.0fx%.0f board, placed as %s. Edit it with vector op=update boardId=%s.",
			board.Name, len(board.Result.Objects), board.Result.Doc.Size.Width, board.Result.Doc.Size.Height, board.NodeID, boardID),
	}
	if len(board.Result.Warnings) > 0 {
		data["warnings"] = board.Result.Warnings
	}
	// The drawing itself is a design task: route it to the library so the next
	// turn can cite the geometry rules it is following.
	attachGuide(data, raw)
	return nil, data, nil
}

func (m *AvnacMCP) vectorUpdate(wailsCtx context.Context, raw map[string]any) (*mcp.CallToolResult, any, error) {
	board, err := m.mustBoard(raw)
	if err != nil {
		return nil, nil, err
	}
	ops, err := decodeVectorOperations(raw)
	if err != nil {
		return nil, nil, err
	}
	m.vectorMu.Lock()
	err = board.Apply(ops)
	m.vectorMu.Unlock()
	if err != nil {
		return nil, nil, err
	}
	includeSVG, _ := flexibleBool(raw["includeSVG"])
	if board.NodeID == "" {
		return nil, nil, fmt.Errorf("vector_update: %q was not placed on the scene", board.ID)
	}

	if _, err := m.emitVectorAction(wailsCtx, "vector_update", map[string]any{
		"boardId":  board.ID,
		"objectId": board.NodeID,
		"src":      board.Result.DataURL,
		"width":    board.Result.Doc.Size.Width,
		"height":   board.Result.Doc.Size.Height,
		"name":     board.Name,
	}); err != nil {
		return nil, nil, err
	}

	data := map[string]any{
		"boardId":  board.ID,
		"objectId": board.NodeID,
		"objects":  len(board.Result.Objects),
		"segments": totalSegments(board.Result.Doc),
		"bytes":    len(board.Result.SVG),
		"bounds":   boundsMap(board.Result.Bounds),
		"message":  fmt.Sprintf("Applied %d operation(s) to %q.", len(ops), board.Name),
	}
	if len(board.Result.Warnings) > 0 {
		data["warnings"] = board.Result.Warnings
	}
	if includeSVG {
		data["svg"] = board.Result.SVG
	}
	return nil, data, nil
}

func (m *AvnacMCP) vectorRead(raw map[string]any) (*mcp.CallToolResult, any, error) {
	board, err := m.mustBoard(raw)
	if err != nil {
		return nil, nil, err
	}
	includeSVG, _ := flexibleBool(raw["includeSVG"])
	m.vectorMu.Lock()
	ir := board.IR
	doc := board.Result.Doc
	summary := objectSummaries(board.Result)
	svg := board.Result.SVG
	m.vectorMu.Unlock()

	data := map[string]any{
		"boardId":  board.ID,
		"name":     board.Name,
		"objectId": board.NodeID,
		"ir":       ir,
		"doc":      doc,
		"objects":  summary,
	}
	if includeSVG {
		data["svg"] = svg
	}
	return nil, data, nil
}

func (m *AvnacMCP) vectorExport(raw map[string]any) (*mcp.CallToolResult, any, error) {
	board, err := m.mustBoard(raw)
	if err != nil {
		return nil, nil, err
	}
	m.vectorMu.Lock()
	svg := board.Result.SVG
	size := board.Result.Doc.Size
	name := board.Name
	m.vectorMu.Unlock()

	if issues := vector.AuditSVG(svg); len(issues) > 0 {
		return nil, nil, fmt.Errorf("exported SVG failed validation: %s", strings.Join(issues, "; "))
	}
	result := &mcp.CallToolResult{
		Content: []mcp.Content{&mcp.TextContent{Text: svg}},
	}
	return result, map[string]any{
		"boardId": board.ID,
		"name":    name,
		"width":   size.Width,
		"height":  size.Height,
		"bytes":   len(svg),
		"message": "SVG is in the text content. It is self-contained and carries the Avnac vector-board marker.",
	}, nil
}

func (m *AvnacMCP) vectorDelete(wailsCtx context.Context, raw map[string]any) (*mcp.CallToolResult, any, error) {
	board, err := m.mustBoard(raw)
	if err != nil {
		return nil, nil, err
	}
	if board.NodeID == "" {
		return nil, nil, fmt.Errorf("vector_delete: %q was not placed on the scene", board.ID)
	}
	if _, err := m.emitVectorAction(wailsCtx, "vector_delete", map[string]any{
		"boardId":  board.ID,
		"objectId": board.NodeID,
	}); err != nil {
		return nil, nil, err
	}
	m.vectorMu.Lock()
	delete(m.vectorBoards, board.ID)
	m.vectorMu.Unlock()
	return nil, map[string]any{
		"boardId":  board.ID,
		"objectId": board.NodeID,
		"deleted":  true,
		"message":  "Removed the placed drawing and forgot the board.",
	}, nil
}

func (m *AvnacMCP) vectorList() (*mcp.CallToolResult, any, error) {
	type row struct {
		id, name, nodeID string
		objects          int
		created, updated time.Time
	}
	m.vectorMu.Lock()
	rows := make([]row, 0, len(m.vectorBoards))
	for _, b := range m.vectorBoards {
		rows = append(rows, row{b.ID, b.Name, b.NodeID, len(b.Result.Objects), b.CreatedAt, b.UpdatedAt})
	}
	m.vectorMu.Unlock()
	sort.Slice(rows, func(i, j int) bool { return rows[i].created.Before(rows[j].created) })

	items := make([]map[string]any, 0, len(rows))
	for _, b := range rows {
		items = append(items, map[string]any{
			"boardId":   b.id,
			"name":      b.name,
			"objectId":  b.nodeID,
			"objects":   b.objects,
			"updatedAt": b.updated.Format(time.RFC3339),
		})
	}
	return nil, map[string]any{"boards": items, "count": len(items)}, nil
}

func (m *AvnacMCP) mustBoard(raw map[string]any) (*vector.Board, error) {
	id := stringField(raw, "boardId", "board", "id")
	if id == "" {
		return nil, fmt.Errorf("boardId is required: the id returned by vector op=draw (or op=list)")
	}
	m.vectorMu.Lock()
	board, ok := m.vectorBoards[id]
	m.vectorMu.Unlock()
	if !ok {
		return nil, fmt.Errorf("no vector board with id %q in this session; call vector op=list or draw it again", id)
	}
	return board, nil
}

func (m *AvnacMCP) emitVectorAction(ctx context.Context, action string, payload map[string]any) (map[string]any, error) {
	if m.vectorEmit == nil {
		return nil, fmt.Errorf("vector: frontend bridge is not available in this build")
	}
	data, err := m.vectorEmit(ctx, action, payload, 15*time.Second)
	if err != nil {
		return nil, err
	}
	resp, _ := data.(map[string]any)
	if resp == nil {
		return nil, fmt.Errorf("%s returned no response", action)
	}
	if msg, _ := resp["error"].(string); msg != "" {
		return nil, fmt.Errorf("%s", msg)
	}
	return resp, nil
}

func totalSegments(doc *vector.Document) int {
	if doc == nil {
		return 0
	}
	total := 0
	for _, layer := range doc.Layers {
		for _, s := range layer.Strokes {
			if len(s.PenAnchors) > 0 {
				total += len(s.PenAnchors)
			} else {
				total += len(s.Points)
			}
		}
	}
	return total
}

func boundsMap(b vector.Box) map[string]any {
	return map[string]any{
		"left":   round2(b.MinX),
		"top":    round2(b.MinY),
		"width":  round2(b.Width()),
		"height": round2(b.Height()),
	}
}

func objectSummaries(res *vector.Result) []map[string]any {
	out := make([]map[string]any, 0, len(res.Objects))
	for _, obj := range res.Objects {
		out = append(out, map[string]any{
			"id":       obj.ID,
			"type":     obj.Type,
			"layer":    obj.Layer,
			"bounds":   boundsMap(obj.Box),
			"mirrored": obj.Mirrored,
			"segments": len(obj.Shape.Segments),
		})
	}
	return out
}

func round2(v float64) float64 {
	return float64(int64(v*100+0.5*signFloat(v))) / 100
}

func signFloat(v float64) float64 {
	if v < 0 {
		return -1
	}
	return 1
}
