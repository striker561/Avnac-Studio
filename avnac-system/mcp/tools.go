package mcp

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/google/jsonschema-go/jsonschema"
	"github.com/google/uuid"
	"github.com/modelcontextprotocol/go-sdk/mcp"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// Standard no-scene error surfaced by the frontend when no canvas is active.
// Backend timeouts preserve the underlying frontend payload when present, so
// keep this copy in sync with frontend/src/lib/mcp-listener.ts NO_SCENE_ERROR.
const noSceneMessage = "No active canvas scene. Call create_canvas first."

// Explicit input schemas.
//
// The batch tools accept map[string]any + flexible decoding so stringified
// bridges (elements="[{...}]", width="1080", includePreview="true") keep
// working. A bare map[string]any would expose {} with no properties, so every
// tool below declares an explicit InputSchema. Flexible fields intentionally
// omit `type` so "1080" and 1080, true and "true", [...] and "[...]" all pass
// SDK validation and are normalized in the decode* helpers.
func desc(s string) *jsonschema.Schema {
	return &jsonschema.Schema{Description: s}
}

func objSchema(props map[string]*jsonschema.Schema, required ...string) *jsonschema.Schema {
	return &jsonschema.Schema{
		Type:       "object",
		Properties: props,
		Required:   required,
	}
}

func emptyObjSchema() *jsonschema.Schema {
	return &jsonschema.Schema{Type: "object"}
}

// emitSync sends an MCP action to the frontend and waits for SubmitResponse.
// All scene-touching tools use this so callers get real success/error instead
// of fire-and-forget {"message":"... requested"} acks.
func (m *AvnacMCP) emitSync(wailsCtx context.Context, action string, payload any, timeout time.Duration) (any, error) {
	requestID := uuid.New().String()
	ch := make(chan any, 1)

	m.mu.Lock()
	m.pendingRequests[requestID] = ch
	m.mu.Unlock()

	msg := map[string]any{
		"action":    action,
		"requestId": requestID,
	}
	if payload != nil {
		msg["payload"] = payload
	}

	runtime.EventsEmit(wailsCtx, "mcp:action", msg)

	select {
	case data := <-ch:
		if respMap, ok := data.(map[string]any); ok && respMap != nil {
			if errStr, ok := respMap["error"].(string); ok && errStr != "" {
				return nil, fmt.Errorf("%s", errStr)
			}
		}
		return data, nil
	case <-time.After(timeout):
		m.mu.Lock()
		delete(m.pendingRequests, requestID)
		m.mu.Unlock()
		return nil, fmt.Errorf("timeout waiting for %s completion (no frontend response — is the /scene editor open?)", action)
	}
}

// Flexible input decoding.
//
// Some MCP clients (notably bridges that transport every tool parameter as a
// string) deliver array / object / bool / number arguments as JSON-encoded
// strings, e.g. elements="[{\"type\":\"ellipse\",...}]" or
// includePreview="true". The go-sdk validates CallToolRequest arguments
// against the input schema derived from the handler's In type *before* the
// handler runs, so a strictly-typed In struct (e.g.
// Elements []ElementDefinition) rejects those stringified payloads with:
//
//	validating /properties/elements: ... has type "string", want null,array
//
// To stay compatible with both well-behaved clients (real arrays/bools) and
// stringifying clients, the batch tools below accept a permissive
// map[string]any input (empty-object schema, no inner validation) and then
// normalize + decode via the helpers that follow.

// normalizeJSONValue parses JSON-encoded strings into their structured value.
// Plain strings (e.g. "NIGHT", "#0a0a0c") are returned unchanged.
func normalizeJSONValue(v any) any {
	s, ok := v.(string)
	if !ok {
		return v
	}
	trimmed := strings.TrimSpace(s)
	if trimmed == "" {
		return v
	}
	first := trimmed[0]
	if first != '[' && first != '{' && first != '"' {
		// Could still be a bare bool/number string; leave to typed parsers.
		return v
	}
	var out any
	if err := json.Unmarshal([]byte(trimmed), &out); err != nil {
		return v
	}
	return out
}

// flexibleBool accepts bool, "true"/"false"/"1"/"0" (any case), and 1/0.
func flexibleBool(v any) (bool, bool) {
	switch t := v.(type) {
	case bool:
		return t, true
	case string:
		switch strings.ToLower(strings.TrimSpace(t)) {
		case "true", "1":
			return true, true
		case "false", "0":
			return false, true
		}
		return false, false
	case float64:
		if t == 1 {
			return true, true
		}
		if t == 0 {
			return false, true
		}
		return false, false
	case json.Number:
		if t.String() == "1" {
			return true, true
		}
		if t.String() == "0" {
			return false, true
		}
		return false, false
	default:
		return false, false
	}
}

func flexibleInt(v any) (int, bool) {
	switch t := v.(type) {
	case int:
		return t, true
	case int64:
		return int(t), true
	case float64:
		return int(t), true
	case json.Number:
		if i, err := t.Int64(); err == nil {
			return int(i), true
		}
		return 0, false
	case string:
		s := strings.TrimSpace(t)
		if i, err := strconv.Atoi(s); err == nil {
			return i, true
		}
		if f, err := strconv.ParseFloat(s, 64); err == nil {
			return int(f), true
		}
		return 0, false
	default:
		return 0, false
	}
}

func flexibleFloat(v any) (float64, bool) {
	switch t := v.(type) {
	case float64:
		return t, true
	case float32:
		return float64(t), true
	case int:
		return float64(t), true
	case int64:
		return float64(t), true
	case json.Number:
		if f, err := t.Float64(); err == nil {
			return f, true
		}
		return 0, false
	case string:
		if f, err := strconv.ParseFloat(strings.TrimSpace(t), 64); err == nil {
			return f, true
		}
		return 0, false
	default:
		return 0, false
	}
}

// flexibleStringList accepts a real string array, an array of mixed scalars,
// a JSON-encoded string array, or a single string (wrapped as one item).
func flexibleStringList(v any) ([]string, error) {
	v = normalizeJSONValue(v)
	switch t := v.(type) {
	case nil:
		return nil, nil
	case []string:
		return t, nil
	case []any:
		out := make([]string, 0, len(t))
		for i, item := range t {
			s, ok := item.(string)
			if !ok {
				return nil, fmt.Errorf("objectIds[%d] must be a string", i)
			}
			out = append(out, s)
		}
		return out, nil
	case string:
		// Single ID passed as a bare string.
		return []string{t}, nil
	default:
		return nil, fmt.Errorf("expected string array, got %T", v)
	}
}

// decodeViaJSON normalizes stringified fields then round-trips through JSON
// into the typed target. Handles top-level stringified arrays/objects and
// stringified bools; inner scalar strings for numbers are handled by the
// typed structs' standard unmarshaling where possible.
func decodeViaJSON(raw map[string]any, stringifiedKeys []string, boolKeys []string, target any) error {
	normalized := make(map[string]any, len(raw))
	for k, v := range raw {
		normalized[k] = v
	}
	for _, k := range stringifiedKeys {
		if v, ok := normalized[k]; ok {
			normalized[k] = normalizeJSONValue(v)
		}
	}
	for _, k := range boolKeys {
		if v, ok := normalized[k]; ok {
			if b, ok := flexibleBool(v); ok {
				normalized[k] = b
			}
		}
	}
	data, err := json.Marshal(normalized)
	if err != nil {
		return fmt.Errorf("re-encoding input: %w", err)
	}
	if err := json.Unmarshal(data, target); err != nil {
		return fmt.Errorf("decoding input: %w", err)
	}
	return nil
}

func decodeRenderElementsInput(raw map[string]any) (RenderElementsInput, error) {
	var out RenderElementsInput
	if raw == nil {
		return out, fmt.Errorf("missing input: expected {elements: [...]}")
	}
	if err := decodeViaJSON(raw, []string{"elements"}, []string{"includePreview"}, &out); err != nil {
		return out, err
	}
	if out.Elements == nil {
		return out, fmt.Errorf("missing required field: elements must be an array")
	}
	return out, nil
}

func decodeModifyElementsInput(raw map[string]any) (ModifyElementsInput, error) {
	var out ModifyElementsInput
	if raw == nil {
		return out, fmt.Errorf("missing input: expected {modifications: [...]}")
	}
	if err := decodeViaJSON(raw, []string{"modifications"}, []string{"includePreview"}, &out); err != nil {
		return out, err
	}
	if out.Modifications == nil {
		return out, fmt.Errorf("missing required field: modifications must be an array")
	}
	return out, nil
}

func decodeCreateCanvasInput(raw map[string]any) (CreateCanvasInput, error) {
	var out CreateCanvasInput
	if raw == nil {
		return out, fmt.Errorf("missing input: expected {width, height}")
	}
	normalized := make(map[string]any, len(raw))
	for k, v := range raw {
		normalized[k] = v
	}
	// Alias: color -> backgroundColor.
	if _, ok := normalized["backgroundColor"]; !ok {
		if c, ok := normalized["color"]; ok {
			normalized["backgroundColor"] = c
		}
	}
	if w, ok := normalized["width"]; ok {
		if i, ok := flexibleInt(w); ok {
			normalized["width"] = i
		}
	}
	if h, ok := normalized["height"]; ok {
		if i, ok := flexibleInt(h); ok {
			normalized["height"] = i
		}
	}
	data, err := json.Marshal(normalized)
	if err != nil {
		return out, err
	}
	if err := json.Unmarshal(data, &out); err != nil {
		return out, err
	}
	if out.Width == 0 || out.Height == 0 {
		return out, fmt.Errorf("width and height are required and must be non-zero")
	}
	return out, nil
}

func decodeSearchUnsplashInput(raw map[string]any) (SearchUnsplashInput, error) {
	var out SearchUnsplashInput
	if raw == nil {
		return out, fmt.Errorf("missing input: expected {query}")
	}
	normalized := make(map[string]any, len(raw))
	for k, v := range raw {
		normalized[k] = v
	}
	if p, ok := normalized["page"]; ok {
		if i, ok := flexibleInt(p); ok {
			normalized["page"] = i
		}
	}
	if pp, ok := normalized["perPage"]; ok {
		if i, ok := flexibleInt(pp); ok {
			normalized["perPage"] = i
		}
	}
	data, err := json.Marshal(normalized)
	if err != nil {
		return out, err
	}
	if err := json.Unmarshal(data, &out); err != nil {
		return out, err
	}
	return out, nil
}

func decodeGetCanvasImageInput(raw map[string]any) GetCanvasImageInput {
	var out GetCanvasImageInput
	if raw == nil {
		return out
	}
	if v, ok := raw["objectId"]; ok {
		if s, ok := v.(string); ok {
			out.ObjectID = s
		}
	}
	if v, ok := raw["annotated"]; ok {
		if b, ok := flexibleBool(v); ok {
			out.Annotated = b
		}
	}
	return out
}

func decodeExportPngInput(raw map[string]any) ExportPngInput {
	var out ExportPngInput
	if raw == nil {
		return out
	}
	if v, ok := raw["multiplier"]; ok {
		if f, ok := flexibleFloat(v); ok {
			out.Multiplier = &f
		}
	}
	if v, ok := raw["transparent"]; ok {
		if b, ok := flexibleBool(v); ok {
			out.Transparent = &b
		}
	}
	return out
}

func stringField(raw map[string]any, keys ...string) string {
	for _, k := range keys {
		if v, ok := raw[k]; ok {
			if s, ok := v.(string); ok && strings.TrimSpace(s) != "" {
				return strings.TrimSpace(s)
			}
		}
	}
	return ""
}

func decodeApplyPresetInput(raw map[string]any) (ApplyArtboardPresetInput, error) {
	var out ApplyArtboardPresetInput
	if raw == nil {
		return out, fmt.Errorf("missing input: expected {presetId}")
	}
	id := stringField(raw, "presetId", "preset", "presetID", "id")
	if id == "" {
		return out, fmt.Errorf("presetId is required (e.g. 'ig-square', 'ig-story', 'hd', 'a4-300') — got keys without presetId/preset")
	}
	out.PresetID = id
	return out, nil
}

func decodeSetBackgroundInput(raw map[string]any) (SetBackgroundInput, error) {
	var out SetBackgroundInput
	if raw == nil {
		return out, fmt.Errorf("missing input: expected {color}")
	}
	c := stringField(raw, "color", "backgroundColor", "fill", "background")
	if c == "" {
		return out, fmt.Errorf("color is required (hex e.g. '#0f172a')")
	}
	out.Color = c
	return out, nil
}

func decodeSelectInput(raw map[string]any) (SelectObjectsInput, error) {
	var out SelectObjectsInput
	if raw == nil {
		return out, fmt.Errorf("missing input: expected {objectIds: [...]}")
	}
	ids, err := flexibleStringList(raw["objectIds"])
	if err != nil || len(ids) == 0 {
		// Also accept singular objectId.
		if s := stringField(raw, "objectId", "id"); s != "" {
			return SelectObjectsInput{ObjectIDs: []string{s}}, nil
		}
		return out, fmt.Errorf("objectIds must be a non-empty string array")
	}
	out.ObjectIDs = ids
	return out, nil
}

func decodeGroupInput(raw map[string]any) (GroupObjectsInput, error) {
	var out GroupObjectsInput
	if raw == nil {
		return out, fmt.Errorf("missing input: expected {objectIds: [...]}")
	}
	ids, err := flexibleStringList(raw["objectIds"])
	if err != nil || len(ids) < 2 {
		return out, fmt.Errorf("objectIds must contain at least 2 ids to group")
	}
	out.ObjectIDs = ids
	return out, nil
}

func decodeUngroupInput(raw map[string]any) (UngroupObjectsInput, error) {
	var out UngroupObjectsInput
	if raw == nil {
		return out, fmt.Errorf("missing input: expected {groupId}")
	}
	id := stringField(raw, "groupId", "groupID", "objectId", "id")
	if id == "" {
		return out, fmt.Errorf("groupId is required")
	}
	out.GroupID = id
	return out, nil
}

func normalizeAlignType(s string) string {
	trimmed := strings.TrimSpace(s)
	lower := strings.ToLower(trimmed)
	switch lower {
	case "left":
		return "left"
	case "center", "centerh", "center-h", "center_h", "center_horizontal", "centerhorizontal":
		return "centerH"
	case "right":
		return "right"
	case "top":
		return "top"
	case "middle", "center vertical", "centerv", "center-v", "center_v", "center_vertical", "centervertical":
		return "centerV"
	case "bottom":
		return "bottom"
	default:
		return trimmed
	}
}

func decodeAlignInput(raw map[string]any) (AlignObjectsInput, error) {
	var out AlignObjectsInput
	if raw == nil {
		return out, fmt.Errorf("missing input: expected {type}")
	}
	t := stringField(raw, "type", "kind", "align", "alignment")
	if t == "" {
		return out, fmt.Errorf("type is required (left, center, right, top, middle, bottom)")
	}
	out.Type = normalizeAlignType(t)
	return out, nil
}

func decodeDistributeInput(raw map[string]any) (DistributeObjectsInput, error) {
	var out DistributeObjectsInput
	if raw == nil {
		return out, fmt.Errorf("missing input: expected {direction}")
	}
	d := stringField(raw, "direction", "type", "axis")
	switch strings.ToLower(strings.TrimSpace(d)) {
	case "horizontal", "h", "x":
		out.Direction = "horizontal"
	case "vertical", "v", "y":
		out.Direction = "vertical"
	default:
		return out, fmt.Errorf("direction must be 'horizontal' or 'vertical' (got %q)", d)
	}
	return out, nil
}

func decodeFitInput(raw map[string]any) FitToArtboardInput {
	var out FitToArtboardInput
	if raw == nil {
		return out
	}
	if v, ok := raw["padding"]; ok {
		if f, ok := flexibleFloat(v); ok {
			out.Padding = f
		}
	}
	return out
}

func decodeDeleteInput(raw map[string]any) DeleteObjectInput {
	var out DeleteObjectInput
	if raw == nil {
		return out
	}
	out.ObjectID = stringField(raw, "objectId", "objectID", "id")
	return out
}

func decodeExportObjectInput(raw map[string]any) (ExportObjectInput, error) {
	var out ExportObjectInput
	if raw == nil {
		return out, fmt.Errorf("missing input: expected {objectId, format}")
	}
	out.ObjectID = stringField(raw, "objectId", "objectID", "id")
	if out.ObjectID == "" {
		return out, fmt.Errorf("objectId is required")
	}
	out.Format = strings.ToLower(stringField(raw, "format"))
	if out.Format == "" {
		out.Format = "png"
	}
	if out.Format != "png" && out.Format != "svg" {
		return out, fmt.Errorf("format must be 'png' or 'svg' (got %q)", out.Format)
	}
	if v, ok := raw["multiplier"]; ok {
		if f, ok := flexibleFloat(v); ok {
			out.Multiplier = &f
		}
	}
	return out, nil
}














type ShadowDefinition struct {
	Blur    float64 `json:"blur"`
	OffsetX float64 `json:"offsetX"`
	OffsetY float64 `json:"offsetY"`
	Color   string  `json:"color"`
	Opacity float64 `json:"opacity"`
}

type ElementDefinition struct {
	ID            *string           `json:"id,omitempty"`
	Name          *string           `json:"name,omitempty"`
	Type          string            `json:"type"`
	Left          *float64          `json:"left,omitempty"`
	Top           *float64          `json:"top,omitempty"`
	X             *float64          `json:"x,omitempty"`
	Y             *float64          `json:"y,omitempty"`
	Width         *float64          `json:"width,omitempty"`
	Height        *float64          `json:"height,omitempty"`
	Fill          *string           `json:"fill,omitempty"`
	Color         *string           `json:"color,omitempty"`
	Text          *string           `json:"text,omitempty"`
	FontSize      *int              `json:"fontSize,omitempty"`
	FontFamily    *string           `json:"fontFamily,omitempty"`
	FontWeight    *string           `json:"fontWeight,omitempty"`
	FontStyle     *string           `json:"fontStyle,omitempty"`
	TextAlign     *string           `json:"textAlign,omitempty"`
	LineHeight    *float64          `json:"lineHeight,omitempty"`
	Underline     *bool             `json:"underline,omitempty"`
	Blur          *float64          `json:"blur,omitempty"`
	Radius        *float64          `json:"radius,omitempty"`
	CornerRadius  *float64          `json:"cornerRadius,omitempty"`
	Shadow        *ShadowDefinition `json:"shadow,omitempty"`
	URL           *string           `json:"url,omitempty"`
	StickerName   *string           `json:"stickerName,omitempty"`
	Sides         *int              `json:"sides,omitempty"`
	X1            *float64          `json:"x1,omitempty"`
	Y1            *float64          `json:"y1,omitempty"`
	X2            *float64          `json:"x2,omitempty"`
	Y2            *float64          `json:"y2,omitempty"`
	GradientAngle *float64          `json:"gradientAngle,omitempty"`
	GradientStops []GradientStop    `json:"gradientStops,omitempty"`
	Stroke        *string           `json:"stroke,omitempty"`
	StrokeWidth   *float64          `json:"strokeWidth,omitempty"`
	Angle         *float64          `json:"angle,omitempty"`
	Rotation      *float64          `json:"rotation,omitempty"`
	Opacity       *float64          `json:"opacity,omitempty"`
}

type RenderElementsInput struct {
	Elements       []ElementDefinition `json:"elements"`
	IncludePreview *bool               `json:"includePreview,omitempty"`
}

type ElementModification struct {
	ObjectID      string            `json:"objectId"`
	Type          *string           `json:"type,omitempty"`
	Left          *float64          `json:"left,omitempty"`
	Top           *float64          `json:"top,omitempty"`
	X             *float64          `json:"x,omitempty"`
	Y             *float64          `json:"y,omitempty"`
	Width         *float64          `json:"width,omitempty"`
	Height        *float64          `json:"height,omitempty"`
	Fill          *string           `json:"fill,omitempty"`
	Color         *string           `json:"color,omitempty"`
	Text          *string           `json:"text,omitempty"`
	FontSize      *int              `json:"fontSize,omitempty"`
	FontFamily    *string           `json:"fontFamily,omitempty"`
	FontWeight    *string           `json:"fontWeight,omitempty"`
	FontStyle     *string           `json:"fontStyle,omitempty"`
	TextAlign     *string           `json:"textAlign,omitempty"`
	LineHeight    *float64          `json:"lineHeight,omitempty"`
	Underline     *bool             `json:"underline,omitempty"`
	Stroke        *string           `json:"stroke,omitempty"`
	StrokeWidth   *float64          `json:"strokeWidth,omitempty"`
	Blur          *float64          `json:"blur,omitempty"`
	Radius        *float64          `json:"radius,omitempty"`
	CornerRadius  *float64          `json:"cornerRadius,omitempty"`
	Shadow        *ShadowDefinition `json:"shadow,omitempty"`
	ScaleX        *float64          `json:"scaleX,omitempty"`
	ScaleY        *float64          `json:"scaleY,omitempty"`
	Angle         *float64          `json:"angle,omitempty"`
	Rotation      *float64          `json:"rotation,omitempty"`
	Opacity       *float64          `json:"opacity,omitempty"`
	Action        *string           `json:"action,omitempty"`
	Name          *string           `json:"name,omitempty"`
	Locked        *bool             `json:"locked,omitempty"`
	GradientAngle *float64          `json:"gradientAngle,omitempty"`
	GradientStops []GradientStop    `json:"gradientStops,omitempty"`
}

type ModifyElementsInput struct {
	Modifications  []ElementModification `json:"modifications"`
	IncludePreview *bool                 `json:"includePreview,omitempty"`
}

type GetCanvasImageInput struct {
	ObjectID  string `json:"objectId,omitempty"`
	Annotated bool   `json:"annotated,omitempty"`
}

type DeleteObjectInput struct {
	// The unique ID of the object to delete. If omitted, deletes the current selection.
	ObjectID string `json:"objectId,omitempty"`
}

type CreateCanvasInput struct {
	// The width of the canvas in pixels
	Width int `json:"width"`
	// The height of the canvas in pixels
	Height int `json:"height"`
	// The name of the workspace
	Name string `json:"name,omitempty"`
	// The background color of the canvas
	BackgroundColor string `json:"backgroundColor,omitempty"`
	// Alias for BackgroundColor (accepted from clients, forwarded as backgroundColor)
	Color string `json:"color,omitempty"`
}

type SetBackgroundInput struct {
	// The background color (hex or name)
	Color string `json:"color"`
}

type AlignObjectsInput struct {
	// The alignment type (left, center, right, top, middle, bottom)
	Type string `json:"type"`
}



type ExportPngInput struct {
	// Scale multiplier (e.g. 1, 2)
	Multiplier *float64 `json:"multiplier,omitempty"`
	// Whether the background should be transparent
	Transparent *bool `json:"transparent,omitempty"`
}

type SelectObjectsInput struct {
	// List of object IDs to select
	ObjectIDs []string `json:"objectIds"`
}









type GroupObjectsInput struct {
	// List of object IDs to group
	ObjectIDs []string `json:"objectIds"`
}

type UngroupObjectsInput struct {
	// The unique ID of the group to ungroup
	GroupID string `json:"groupId"`
}

type DistributeObjectsInput struct {
	// The direction to distribute (horizontal or vertical)
	Direction string `json:"direction"`
}

type FitToArtboardInput struct {
	// Padding around the objects in pixels
	Padding float64 `json:"padding"`
}

type SearchUnsplashInput struct {
	// The search query
	Query string `json:"query"`
	// Page number
	Page int `json:"page,omitempty"`
	// Number of items per page
	PerPage int `json:"perPage,omitempty"`
}





type GradientStop struct {
	// Offset from 0.0 to 1.0
	Offset float64 `json:"offset"`
	// Color (hex or name)
	Color string `json:"color"`
}



type ApplyArtboardPresetInput struct {
	// The preset ID (e.g. 'ig-square', 'a4-300')
	PresetID string `json:"presetId"`
}

type ExportObjectInput struct {
	// The unique ID of the object to export
	ObjectID string `json:"objectId"`
	// The format (png, svg)
	Format string `json:"format"`
	// Scale multiplier (for PNG)
	Multiplier *float64 `json:"multiplier,omitempty"`
}

type GetObjectPropertiesInput struct {
	// The unique ID of the object
	ObjectID string `json:"objectId"`
}

type OpenCanvasInput struct {
	// The workspace id of the saved file to open, as returned by list_files
	FileID string `json:"fileId"`
}

type RenameFileInput struct {
	// The workspace id of the saved file to rename, as returned by list_files
	FileID string `json:"fileId"`
	// The new name for the file
	Name string `json:"name"`
}

// workspaceMeta is the compact file entry surfaced by list_files and used to
// pre-validate open_canvas / rename_file ids without a frontend round-trip.
type workspaceMeta struct {
	ID             string `json:"id"`
	Name           string `json:"name"`
	UpdatedAt      int64  `json:"updatedAt"`
	ArtboardWidth  int    `json:"artboardWidth"`
	ArtboardHeight int    `json:"artboardHeight"`
}

// listWorkspaceMetas reads the saved workspace list from the IOManager.
// Returns an error when the IO layer is not initialized yet (app starting).
func (m *AvnacMCP) listWorkspaceMetas() ([]workspaceMeta, error) {
	if m.IO == nil {
		return nil, fmt.Errorf("workspace storage not initialised yet")
	}
	raw, err := m.IO.ListDocuments()
	if err != nil {
		return nil, err
	}
	var metas []workspaceMeta
	if err := json.Unmarshal([]byte(raw), &metas); err != nil {
		return nil, fmt.Errorf("decode document list: %w", err)
	}
	return metas, nil
}

func findWorkspaceMeta(metas []workspaceMeta, fileID string) *workspaceMeta {
	for i := range metas {
		if metas[i].ID == fileID {
			return &metas[i]
		}
	}
	return nil
}

func decodeOpenCanvasInput(raw map[string]any) (OpenCanvasInput, error) {
	var out OpenCanvasInput
	if raw == nil {
		return out, fmt.Errorf("missing input: expected {fileId}")
	}
	id := stringField(raw, "fileId", "id", "workspaceId", "fileID")
	if id == "" {
		return out, fmt.Errorf("fileId is required (from list_files)")
	}
	out.FileID = id
	return out, nil
}

func decodeRenameFileInput(raw map[string]any) (RenameFileInput, error) {
	var out RenameFileInput
	if raw == nil {
		return out, fmt.Errorf("missing input: expected {fileId, name}")
	}
	id := stringField(raw, "fileId", "id", "workspaceId", "fileID")
	if id == "" {
		return out, fmt.Errorf("fileId is required (from list_files)")
	}
	name := stringField(raw, "name", "title", "filename")
	if name == "" {
		return out, fmt.Errorf("name is required")
	}
	out.FileID = id
	out.Name = name
	return out, nil
}

func (m *AvnacMCP) RegisterTools(wailsCtx context.Context) {
	mcp.AddTool(m.server, &mcp.Tool{
		Name: "render_elements",
		Description: "Declaratively create multiple elements (rect, ellipse, polygon, star, text, image, sticker, line) in a single batch. Supports layout (left/top or x/y, width, height), styling (fill, opacity, angle/rotation, blur, cornerRadius), text controls (textAlign, fontWeight, fontStyle, lineHeight, underline), effects (shadows, gradients), and specialized properties (fontFamily, stickerName, url, sides, x1/y1/x2/y2). Returns created element IDs and metadata, plus an optional visual preview if includePreview=true.",
		InputSchema: objSchema(map[string]*jsonschema.Schema{
			"elements":       desc("Array of element objects, or a JSON-encoded string of that array. Each needs type + position/size. Text supports textAlign (left|center|right), fontWeight (400|500|600|700|bold), fontStyle, lineHeight, underline."),
			"includePreview": desc("If true (or \"true\"), return a PNG preview image alongside created IDs."),
		}, "elements"),
	}, func(ctx context.Context, req *mcp.CallToolRequest, raw map[string]any) (*mcp.CallToolResult, any, error) {
		input, err := decodeRenderElementsInput(raw)
		if err != nil {
			return nil, nil, err
		}
		requestID := uuid.New().String()
		ch := make(chan any, 1)

		m.mu.Lock()
		m.pendingRequests[requestID] = ch
		m.mu.Unlock()

		runtime.EventsEmit(wailsCtx, "mcp:action", map[string]any{
			"action":    "render_elements",
			"requestId": requestID,
			"payload":   input,
		})

		select {
		case data := <-ch:
			respMap, ok := data.(map[string]any)
			if ok && respMap != nil {
				if base64Str, ok := respMap["imageData"].(string); ok && base64Str != "" {
					imgBytes, err := base64.StdEncoding.DecodeString(base64Str)
					if err == nil {
						delete(respMap, "imageData")
						return &mcp.CallToolResult{
							Content: []mcp.Content{
								&mcp.TextContent{
									Text: fmt.Sprintf("Elements rendered successfully. Created: %v", respMap["created"]),
								},
								&mcp.ImageContent{
									Data:     imgBytes,
									MIMEType: "image/png",
								},
							},
						}, respMap, nil
					}
				}
			}
			return nil, data, nil
		case <-time.After(20 * time.Second):
			m.mu.Lock()
			delete(m.pendingRequests, requestID)
			m.mu.Unlock()
			return nil, nil, fmt.Errorf("timeout waiting for render_elements completion")
		}
	})

	mcp.AddTool(m.server, &mcp.Tool{
		Name: "modify_elements",
		Description: "Batch update properties of existing elements by their ObjectID. Supports layout (left/top/x/y/width/height), styling (fill, opacity, rotation), text controls (text, fontSize, fontFamily, fontWeight, fontStyle, textAlign, lineHeight, underline, stroke), effects (shadows, blur, cornerRadius), locking, layer names. Returns modified counts and an optional visual preview if includePreview=true.",
		InputSchema: objSchema(map[string]*jsonschema.Schema{
			"modifications":  desc("Array of {objectId, ...fields} updates, or a JSON-encoded string of that array."),
			"includePreview": desc("If true (or \"true\"), return a PNG preview image alongside modifiedCount."),
		}, "modifications"),
	}, func(ctx context.Context, req *mcp.CallToolRequest, raw map[string]any) (*mcp.CallToolResult, any, error) {
		input, err := decodeModifyElementsInput(raw)
		if err != nil {
			return nil, nil, err
		}
		requestID := uuid.New().String()
		ch := make(chan any, 1)

		m.mu.Lock()
		m.pendingRequests[requestID] = ch
		m.mu.Unlock()

		runtime.EventsEmit(wailsCtx, "mcp:action", map[string]any{
			"action":    "modify_elements",
			"requestId": requestID,
			"payload":   input,
		})

		select {
		case data := <-ch:
			respMap, ok := data.(map[string]any)
			if ok && respMap != nil {
				if base64Str, ok := respMap["imageData"].(string); ok && base64Str != "" {
					imgBytes, err := base64.StdEncoding.DecodeString(base64Str)
					if err == nil {
						delete(respMap, "imageData")
						return &mcp.CallToolResult{
							Content: []mcp.Content{
								&mcp.TextContent{
									Text: "Elements modified successfully.",
								},
								&mcp.ImageContent{
									Data:     imgBytes,
									MIMEType: "image/png",
								},
							},
						}, respMap, nil
					}
				}
			}
			return nil, data, nil
		case <-time.After(15 * time.Second):
			m.mu.Lock()
			delete(m.pendingRequests, requestID)
			m.mu.Unlock()
			return nil, nil, fmt.Errorf("timeout waiting for modify_elements completion")
		}
	})

	mcp.AddTool(m.server, &mcp.Tool{
		Name:        "search_unsplash",
		Description: "Search for high-quality photos on Unsplash",
		InputSchema: objSchema(map[string]*jsonschema.Schema{
			"query":   desc("Search keywords, e.g. 'mountain landscape'."),
			"page":    desc("Page number (default 1). Accepts number or numeric string."),
			"perPage": desc("Results per page (default 10). Accepts number or numeric string."),
		}, "query"),
	}, func(ctx context.Context, req *mcp.CallToolRequest, raw map[string]any) (*mcp.CallToolResult, any, error) {
		input, err := decodeSearchUnsplashInput(raw)
		if err != nil {
			return nil, nil, err
		}
		page := input.Page
		if page < 1 {
			page = 1
		}
		perPage := input.PerPage
		if perPage < 1 {
			perPage = 10
		}

		result, err := m.Unsplash.Search(input.Query, page, perPage)
		if err != nil {
			return nil, nil, err
		}

		// Project to the fields agents actually use: id, alt text, native
		// size, photographer, and the two render-ready URLs. Dropping long
		// descriptions, download/link blocks, and full-size URLs keeps each
		// query's output small in the caller's context window.
		photos := make([]map[string]any, 0, len(result.Photos))
		for _, p := range result.Photos {
			alt := ""
			if p.AltDescription != nil {
				alt = *p.AltDescription
			}
			photos = append(photos, map[string]any{
				"id":             p.ID,
				"alt_description": alt,
				"width":          p.Width,
				"height":         p.Height,
				"photographer":   p.User.Name,
				"urls": map[string]string{
					"small":   p.Urls.Small,
					"regular": p.Urls.Regular,
				},
			})
		}
		return nil, map[string]any{"photos": photos, "hasMore": result.HasMore}, nil
	})

		mcp.AddTool(m.server, &mcp.Tool{
		Name:        "list_stickers",
		Description: "Get the list of available built-in stickers",
		InputSchema: emptyObjSchema(),
	}, func(ctx context.Context, req *mcp.CallToolRequest, input any) (*mcp.CallToolResult, any, error) {
		stickers := []string{"donut", "leaf", "lollipop", "pineapple", "shooting-star-badge", "sunflower-badge"}
		return nil, map[string]any{"stickers": stickers}, nil
	})

			mcp.AddTool(m.server, &mcp.Tool{
		Name:        "apply_artboard_preset",
		Description: "Resize the canvas to a standard preset. Valid presetId: ig-square (1080x1080), ig-portrait (1080x1350), ig-story (1080x1920), hd (1920x1080), twitter-post, linkedin, youtube-thumb, a4-300, custom-4000. Alias 'preset' also accepted. Returns the applied dimensions or a no-scene/unknown-preset error.",
		InputSchema: objSchema(map[string]*jsonschema.Schema{
			"presetId": desc("Preset ID, e.g. 'ig-square', 'ig-story', 'hd', 'a4-300'."),
			"preset":   desc("Alias for presetId (deprecated, kept for compatibility)."),
		}),
	}, func(ctx context.Context, req *mcp.CallToolRequest, raw map[string]any) (*mcp.CallToolResult, any, error) {
		input, err := decodeApplyPresetInput(raw)
		if err != nil {
			return nil, nil, err
		}
		data, err := m.emitSync(wailsCtx, "apply_artboard_preset", input, 15*time.Second)
		if err != nil {
			return nil, nil, err
		}
		return nil, data, nil
	})

	mcp.AddTool(m.server, &mcp.Tool{
		Name:        "export_object",
		Description: "Export a specific object or group as PNG or SVG. Returns imageData (base64 PNG) or SVG markup, or a not-found/no-scene error.",
		InputSchema: objSchema(map[string]*jsonschema.Schema{
			"objectId":   desc("ID of the object or group to export."),
			"format":     desc("Export format: 'png' (default) or 'svg'."),
			"multiplier": desc("PNG scale multiplier, e.g. 1 or 2."),
		}, "objectId"),
	}, func(ctx context.Context, req *mcp.CallToolRequest, raw map[string]any) (*mcp.CallToolResult, any, error) {
		input, err := decodeExportObjectInput(raw)
		if err != nil {
			return nil, nil, err
		}
		data, err := m.emitSync(wailsCtx, "export_object", input, 15*time.Second)
		if err != nil {
			return nil, nil, err
		}
		if respMap, ok := data.(map[string]any); ok && respMap != nil {
			if base64Str, ok := respMap["imageData"].(string); ok && base64Str != "" {
				if imgBytes, err := base64.StdEncoding.DecodeString(base64Str); err == nil {
					delete(respMap, "imageData")
					return &mcp.CallToolResult{
						Content: []mcp.Content{
							&mcp.TextContent{Text: "Object exported successfully."},
							&mcp.ImageContent{Data: imgBytes, MIMEType: "image/png"},
						},
					}, respMap, nil
				}
			}
		}
		return nil, data, nil
	})

	mcp.AddTool(m.server, &mcp.Tool{
		Name:        "get_object_properties",
		Description: "Get detailed properties of a specific object by its ID",
		InputSchema: objSchema(map[string]*jsonschema.Schema{
			"objectId": desc("ID of the object to inspect."),
		}, "objectId"),
	}, func(ctx context.Context, req *mcp.CallToolRequest, input GetObjectPropertiesInput) (*mcp.CallToolResult, any, error) {
		requestID := uuid.New().String()
		ch := make(chan any, 1)

		m.mu.Lock()
		m.pendingRequests[requestID] = ch
		m.mu.Unlock()

		runtime.EventsEmit(wailsCtx, "mcp:action", map[string]any{
			"action":    "get_object_properties",
			"requestId": requestID,
			"payload":   input,
		})

		select {
		case data := <-ch:
			return nil, data, nil
		case <-time.After(5 * time.Second):
			m.mu.Lock()
			delete(m.pendingRequests, requestID)
			m.mu.Unlock()
			return nil, nil, fmt.Errorf("timeout waiting for object properties")
		}
	})

	mcp.AddTool(m.server, &mcp.Tool{
		Name:        "create_canvas",
		Description: "Create a new canvas with the specified dimensions. Navigates to /scene and returns the new workspace id.",
		InputSchema: objSchema(map[string]*jsonschema.Schema{
			"width":           desc("Canvas width in pixels (100-16000). Accepts number or numeric string."),
			"height":          desc("Canvas height in pixels (100-16000). Accepts number or numeric string."),
			"name":            desc("Optional workspace name."),
			"backgroundColor": desc("Optional background color hex, e.g. '#0f172a'."),
			"color":           desc("Alias for backgroundColor."),
		}, "width", "height"),
	}, func(ctx context.Context, req *mcp.CallToolRequest, raw map[string]any) (*mcp.CallToolResult, any, error) {
		input, err := decodeCreateCanvasInput(raw)
		if err != nil {
			return nil, nil, err
		}
		requestID := uuid.New().String()
		ch := make(chan any, 1)

		m.mu.Lock()
		m.pendingRequests[requestID] = ch
		m.mu.Unlock()

		payload := map[string]any{
			"action":    "create_canvas",
			"requestId": requestID,
			"payload":   input,
		}

		runtime.EventsEmit(wailsCtx, "mcp:action", payload)

		select {
		case data := <-ch:
			return nil, data, nil
		case <-time.After(15 * time.Second):
			m.mu.Lock()
			delete(m.pendingRequests, requestID)
			m.mu.Unlock()
			return nil, nil, fmt.Errorf("timeout waiting for create_canvas completion")
		}
	})

	mcp.AddTool(m.server, &mcp.Tool{
		Name:        "list_files",
		Description: "List all saved canvas files with their workspace ids, names, dimensions, and last-updated time. Use before open_canvas when the user references an existing file that is not currently open.",
		InputSchema: emptyObjSchema(),
	}, func(ctx context.Context, req *mcp.CallToolRequest, raw map[string]any) (*mcp.CallToolResult, any, error) {
		metas, err := m.listWorkspaceMetas()
		if err != nil {
			return nil, nil, err
		}
		files := make([]map[string]any, 0, len(metas))
		for _, meta := range metas {
			files = append(files, map[string]any{
				"id":        meta.ID,
				"name":      meta.Name,
				"width":     meta.ArtboardWidth,
				"height":    meta.ArtboardHeight,
				"updatedAt": meta.UpdatedAt,
			})
		}
		return nil, map[string]any{"files": files, "count": len(files)}, nil
	})

	mcp.AddTool(m.server, &mcp.Tool{
		Name:        "open_canvas",
		Description: "Open a saved canvas file by workspace id (from list_files), navigate the editor to it, and make it the active scene. Returns the opened file's name and dimensions or an unknown-id error.",
		InputSchema: objSchema(map[string]*jsonschema.Schema{
			"fileId":     desc("Workspace id of the file to open, as returned by list_files."),
			"id":         desc("Alias for fileId."),
			"workspaceId": desc("Alias for fileId."),
		}),
	}, func(ctx context.Context, req *mcp.CallToolRequest, raw map[string]any) (*mcp.CallToolResult, any, error) {
		input, err := decodeOpenCanvasInput(raw)
		if err != nil {
			return nil, nil, err
		}
		// Pre-validate against storage so unknown ids fail fast with a
		// helpful error instead of the /scene route silently creating a
		// brand-new workspace for the unknown id.
		metas, err := m.listWorkspaceMetas()
		if err != nil {
			return nil, nil, err
		}
		if findWorkspaceMeta(metas, input.FileID) == nil {
			return nil, nil, fmt.Errorf("no saved file with id '%s'. Call list_files to see available canvases", input.FileID)
		}
		data, err := m.emitSync(wailsCtx, "open_workspace", input, 30*time.Second)
		if err != nil {
			return nil, nil, err
		}
		return nil, data, nil
	})

	mcp.AddTool(m.server, &mcp.Tool{
		Name:        "rename_file",
		Description: "Rename a saved canvas file by workspace id (from list_files). Renames the file in storage and, if it is currently open, the live editor title too.",
		InputSchema: objSchema(map[string]*jsonschema.Schema{
			"fileId": desc("Workspace id of the file to rename, as returned by list_files."),
			"id":     desc("Alias for fileId."),
			"name":   desc("New file name."),
		}, "fileId", "name"),
	}, func(ctx context.Context, req *mcp.CallToolRequest, raw map[string]any) (*mcp.CallToolResult, any, error) {
		input, err := decodeRenameFileInput(raw)
		if err != nil {
			return nil, nil, err
		}
		metas, err := m.listWorkspaceMetas()
		if err != nil {
			return nil, nil, err
		}
		if findWorkspaceMeta(metas, input.FileID) == nil {
			return nil, nil, fmt.Errorf("no saved file with id '%s'. Call list_files to see available canvases", input.FileID)
		}
		data, err := m.emitSync(wailsCtx, "rename_workspace", input, 15*time.Second)
		if err != nil {
			return nil, nil, err
		}
		return nil, data, nil
	})

							mcp.AddTool(m.server, &mcp.Tool{
		Name:        "select_objects",
		Description: "Select one or more objects by their IDs. Returns the selected IDs or a no-scene error.",
		InputSchema: objSchema(map[string]*jsonschema.Schema{
			"objectIds": desc("Array of object IDs, a JSON-encoded string array, or a single ID string."),
			"objectId":  desc("Alias for a single ID."),
		}, "objectIds"),
	}, func(ctx context.Context, req *mcp.CallToolRequest, raw map[string]any) (*mcp.CallToolResult, any, error) {
		input, err := decodeSelectInput(raw)
		if err != nil {
			return nil, nil, err
		}
		data, err := m.emitSync(wailsCtx, "select_objects", input, 15*time.Second)
		if err != nil {
			return nil, nil, err
		}
		return nil, data, nil
	})

	mcp.AddTool(m.server, &mcp.Tool{
		Name:        "delete_object",
		Description: "Delete an object from the canvas. If no objectId is provided, deletes the current selection. Returns deleted status or a no-scene error.",
		InputSchema: objSchema(map[string]*jsonschema.Schema{
			"objectId": desc("ID of the object to delete. Omit to delete the current selection."),
			"id":       desc("Alias for objectId."),
		}),
	}, func(ctx context.Context, req *mcp.CallToolRequest, raw map[string]any) (*mcp.CallToolResult, any, error) {
		input := decodeDeleteInput(raw)
		data, err := m.emitSync(wailsCtx, "delete_object", input, 15*time.Second)
		if err != nil {
			return nil, nil, err
		}
		return nil, data, nil
	})

					mcp.AddTool(m.server, &mcp.Tool{
		Name:        "group_objects",
		Description: "Group multiple objects together. Requires at least 2 ids with the same parent. Returns the new groupId or an error.",
		InputSchema: objSchema(map[string]*jsonschema.Schema{
			"objectIds": desc("Array of object IDs to group (min 2), or a JSON-encoded string array."),
		}, "objectIds"),
	}, func(ctx context.Context, req *mcp.CallToolRequest, raw map[string]any) (*mcp.CallToolResult, any, error) {
		input, err := decodeGroupInput(raw)
		if err != nil {
			return nil, nil, err
		}
		data, err := m.emitSync(wailsCtx, "group_objects", input, 15*time.Second)
		if err != nil {
			return nil, nil, err
		}
		return nil, data, nil
	})

	mcp.AddTool(m.server, &mcp.Tool{
		Name:        "ungroup_objects",
		Description: "Ungroup an existing group. Returns the ungrouped children or a not-found error.",
		InputSchema: objSchema(map[string]*jsonschema.Schema{
			"groupId":  desc("ID of the group to ungroup."),
			"objectId": desc("Alias for groupId."),
		}),
	}, func(ctx context.Context, req *mcp.CallToolRequest, raw map[string]any) (*mcp.CallToolResult, any, error) {
		input, err := decodeUngroupInput(raw)
		if err != nil {
			return nil, nil, err
		}
		data, err := m.emitSync(wailsCtx, "ungroup_objects", input, 15*time.Second)
		if err != nil {
			return nil, nil, err
		}
		return nil, data, nil
	})

	mcp.AddTool(m.server, &mcp.Tool{
		Name:        "distribute_objects",
		Description: "Evenly space the selected objects horizontally or vertically. Requires at least 3 selected objects.",
		InputSchema: objSchema(map[string]*jsonschema.Schema{
			"direction": desc("Distribution axis: 'horizontal' or 'vertical'."),
			"type":      desc("Alias for direction."),
		}),
	}, func(ctx context.Context, req *mcp.CallToolRequest, raw map[string]any) (*mcp.CallToolResult, any, error) {
		input, err := decodeDistributeInput(raw)
		if err != nil {
			return nil, nil, err
		}
		data, err := m.emitSync(wailsCtx, "distribute_objects", input, 15*time.Second)
		if err != nil {
			return nil, nil, err
		}
		return nil, data, nil
	})

	mcp.AddTool(m.server, &mcp.Tool{
		Name:        "fit_to_artboard",
		Description: "Scale the current selection to fill the canvas with optional padding.",
		InputSchema: objSchema(map[string]*jsonschema.Schema{
			"padding": desc("Padding in pixels around the fitted selection (default 0). Accepts number or numeric string."),
		}),
	}, func(ctx context.Context, req *mcp.CallToolRequest, raw map[string]any) (*mcp.CallToolResult, any, error) {
		input := decodeFitInput(raw)
		data, err := m.emitSync(wailsCtx, "fit_to_artboard", input, 15*time.Second)
		if err != nil {
			return nil, nil, err
		}
		return nil, data, nil
	})

	mcp.AddTool(m.server, &mcp.Tool{
		Name:        "get_font_list",
		Description: "Get the list of supported Google Fonts",
		InputSchema: emptyObjSchema(),
	}, func(ctx context.Context, req *mcp.CallToolRequest, input any) (*mcp.CallToolResult, any, error) {
		requestID := uuid.New().String()
		ch := make(chan any, 1)

		m.mu.Lock()
		m.pendingRequests[requestID] = ch
		m.mu.Unlock()

		runtime.EventsEmit(wailsCtx, "mcp:action", map[string]any{
			"action":    "get_font_list",
			"requestId": requestID,
		})

		select {
		case data := <-ch:
			return nil, data, nil
		case <-time.After(5 * time.Second):
			m.mu.Lock()
			delete(m.pendingRequests, requestID)
			m.mu.Unlock()
			return nil, nil, fmt.Errorf("timeout waiting for font list")
		}
	})

	mcp.AddTool(m.server, &mcp.Tool{
		Name:        "clear_canvas",
		Description: "Remove all objects from the canvas. Returns cleared count or a no-scene error.",
		InputSchema: emptyObjSchema(),
	}, func(ctx context.Context, req *mcp.CallToolRequest, input any) (*mcp.CallToolResult, any, error) {
		data, err := m.emitSync(wailsCtx, "clear_canvas", map[string]any{}, 15*time.Second)
		if err != nil {
			return nil, nil, err
		}
		return nil, data, nil
	})

	mcp.AddTool(m.server, &mcp.Tool{
		Name:        "set_background",
		Description: "Change the background color of the artboard. Returns the new background or a no-scene error.",
		InputSchema: objSchema(map[string]*jsonschema.Schema{
			"color":           desc("Background color hex or name, e.g. '#0f172a'."),
			"backgroundColor": desc("Alias for color."),
		}),
	}, func(ctx context.Context, req *mcp.CallToolRequest, raw map[string]any) (*mcp.CallToolResult, any, error) {
		input, err := decodeSetBackgroundInput(raw)
		if err != nil {
			return nil, nil, err
		}
		data, err := m.emitSync(wailsCtx, "set_background", input, 15*time.Second)
		if err != nil {
			return nil, nil, err
		}
		return nil, data, nil
	})

	mcp.AddTool(m.server, &mcp.Tool{
		Name:        "align_objects",
		Description: "Align the currently selected objects. type: left, center, right, top, middle, bottom (center=centerH, middle=centerV). Single selection aligns to artboard; multiple aligns to each other.",
		InputSchema: objSchema(map[string]*jsonschema.Schema{
			"type":      desc("Alignment: left, center, right, top, middle, bottom."),
			"kind":      desc("Alias for type."),
			"alignment": desc("Alias for type."),
		}),
	}, func(ctx context.Context, req *mcp.CallToolRequest, raw map[string]any) (*mcp.CallToolResult, any, error) {
		input, err := decodeAlignInput(raw)
		if err != nil {
			return nil, nil, err
		}
		data, err := m.emitSync(wailsCtx, "align_objects", input, 15*time.Second)
		if err != nil {
			return nil, nil, err
		}
		return nil, data, nil
	})

		mcp.AddTool(m.server, &mcp.Tool{
		Name:        "export_png",
		Description: "Export the current canvas as PNG. Returns imageData (base64 PNG) or a no-scene error.",
		InputSchema: objSchema(map[string]*jsonschema.Schema{
			"multiplier":  desc("Scale multiplier, e.g. 1 or 2."),
			"transparent": desc("If true, omit the artboard background."),
		}),
	}, func(ctx context.Context, req *mcp.CallToolRequest, raw map[string]any) (*mcp.CallToolResult, any, error) {
		input := decodeExportPngInput(raw)
		data, err := m.emitSync(wailsCtx, "export_png", input, 15*time.Second)
		if err != nil {
			return nil, nil, err
		}
		if respMap, ok := data.(map[string]any); ok && respMap != nil {
			if base64Str, ok := respMap["imageData"].(string); ok && base64Str != "" {
				if imgBytes, err := base64.StdEncoding.DecodeString(base64Str); err == nil {
					delete(respMap, "imageData")
					return &mcp.CallToolResult{
						Content: []mcp.Content{
							&mcp.TextContent{Text: "Canvas exported successfully."},
							&mcp.ImageContent{Data: imgBytes, MIMEType: "image/png"},
						},
					}, respMap, nil
				}
			}
		}
		return nil, data, nil
	})

	mcp.AddTool(m.server, &mcp.Tool{
		Name:        "list_objects",
		Description: "List all objects currently on the canvas with their IDs and types",
		InputSchema: emptyObjSchema(),
	}, func(ctx context.Context, req *mcp.CallToolRequest, input any) (*mcp.CallToolResult, any, error) {
		requestID := uuid.New().String()
		ch := make(chan any, 1)

		m.mu.Lock()
		m.pendingRequests[requestID] = ch
		m.mu.Unlock()

		runtime.EventsEmit(wailsCtx, "mcp:action", map[string]any{
			"action":    "list_objects",
			"requestId": requestID,
		})

		select {
		case data := <-ch:
			return nil, data, nil
		case <-time.After(15 * time.Second):
			m.mu.Lock()
			delete(m.pendingRequests, requestID)
			m.mu.Unlock()
			return nil, nil, fmt.Errorf("timeout waiting for object list")
		}
	})

	mcp.AddTool(m.server, &mcp.Tool{
		Name:        "get_selection",
		Description: "Get the IDs and properties of the currently selected objects",
		InputSchema: emptyObjSchema(),
	}, func(ctx context.Context, req *mcp.CallToolRequest, input any) (*mcp.CallToolResult, any, error) {
		requestID := uuid.New().String()
		ch := make(chan any, 1)

		m.mu.Lock()
		m.pendingRequests[requestID] = ch
		m.mu.Unlock()

		runtime.EventsEmit(wailsCtx, "mcp:action", map[string]any{
			"action":    "get_selection",
			"requestId": requestID,
		})

		select {
		case data := <-ch:
			return nil, data, nil
		case <-time.After(15 * time.Second):
			m.mu.Lock()
			delete(m.pendingRequests, requestID)
			m.mu.Unlock()
			return nil, nil, fmt.Errorf("timeout waiting for selection state")
		}
	})

	mcp.AddTool(m.server, &mcp.Tool{
		Name:        "get_canvas_state",
		Description: "Get the current state of the canvas",
		InputSchema: emptyObjSchema(),
	}, func(ctx context.Context, req *mcp.CallToolRequest, input any) (*mcp.CallToolResult, any, error) {
		requestID := uuid.New().String()
		ch := make(chan any, 1)

		m.mu.Lock()
		m.pendingRequests[requestID] = ch
		m.mu.Unlock()

		runtime.EventsEmit(wailsCtx, "mcp:action", map[string]any{
			"action":    "get_canvas_state",
			"requestId": requestID,
		})

		select {
		case data := <-ch:
			return nil, data, nil
		case <-time.After(15 * time.Second):
			m.mu.Lock()
			delete(m.pendingRequests, requestID)
			m.mu.Unlock()
			return nil, nil, fmt.Errorf("timeout waiting for canvas state")
		}
	})

	mcp.AddTool(m.server, &mcp.Tool{
		Name:        "get_canvas_summary",
		Description: "Get a token-efficient semantic summary of the current canvas artboard and objects without raw engine internals",
		InputSchema: emptyObjSchema(),
	}, func(ctx context.Context, req *mcp.CallToolRequest, input any) (*mcp.CallToolResult, any, error) {
		requestID := uuid.New().String()
		ch := make(chan any, 1)

		m.mu.Lock()
		m.pendingRequests[requestID] = ch
		m.mu.Unlock()

		runtime.EventsEmit(wailsCtx, "mcp:action", map[string]any{
			"action":    "get_canvas_summary",
			"requestId": requestID,
		})

		select {
		case data := <-ch:
			return nil, data, nil
		case <-time.After(15 * time.Second):
			m.mu.Lock()
			delete(m.pendingRequests, requestID)
			m.mu.Unlock()
			return nil, nil, fmt.Errorf("timeout waiting for canvas summary")
		}
	})

	mcp.AddTool(m.server, &mcp.Tool{
		Name:        "get_canvas_image",
		Description: "Get a visual PNG screenshot of the current canvas or a specific object. Set annotated=true for bounding box debug overlays.",
		InputSchema: objSchema(map[string]*jsonschema.Schema{
			"objectId":  desc("Optional object ID to crop the screenshot to."),
			"annotated": desc("If true (or \"true\"), overlay bounding boxes and labels."),
		}),
	}, func(ctx context.Context, req *mcp.CallToolRequest, raw map[string]any) (*mcp.CallToolResult, any, error) {
		input := decodeGetCanvasImageInput(raw)
		requestID := uuid.New().String()
		ch := make(chan any, 1)

		m.mu.Lock()
		m.pendingRequests[requestID] = ch
		m.mu.Unlock()

		runtime.EventsEmit(wailsCtx, "mcp:action", map[string]any{
			"action":    "get_canvas_image",
			"requestId": requestID,
			"payload":   input,
		})

		select {
		case data := <-ch:
			// data is expected to be a map[string]any with "imageData" (base64)
			respMap, ok := data.(map[string]any)
			if !ok {
				return nil, nil, fmt.Errorf("unexpected response format from frontend")
			}

			base64Str, ok := respMap["imageData"].(string)
			if !ok {
				return nil, nil, fmt.Errorf("missing imageData in frontend response")
			}

			imgBytes, err := base64.StdEncoding.DecodeString(base64Str)
			if err != nil {
				return nil, nil, fmt.Errorf("failed to decode image data: %v", err)
			}

			return &mcp.CallToolResult{
				Content: []mcp.Content{
					&mcp.ImageContent{
						Data:     imgBytes,
						MIMEType: "image/png",
					},
				},
			}, nil, nil
		case <-time.After(10 * time.Second):
			m.mu.Lock()
			delete(m.pendingRequests, requestID)
			m.mu.Unlock()
			return nil, nil, fmt.Errorf("timeout waiting for canvas image")
		}
	})
}
