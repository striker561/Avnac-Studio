package mcp

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	avnacserver "Avnac/avnac-system/server"

	"github.com/google/jsonschema-go/jsonschema"
	"github.com/google/uuid"
	"github.com/modelcontextprotocol/go-sdk/mcp"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// Standard no-scene error surfaced by the frontend when no canvas is active.
// Backend timeouts preserve the underlying frontend payload when present, so
// keep this copy in sync with frontend/src/lib/mcp/payload.ts NO_SCENE_ERROR.
const noSceneMessage = "No active canvas scene. Call canvas op=create first."

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
	if m.emitFn != nil {
		return m.emitFn(wailsCtx, action, payload, timeout)
	}
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

// toolErrorResult converts a frontend {"error": "..."} response into an MCP tool
// error.
//
// Handlers that run their own event round trip (render_elements,
// modify_elements, the export tools) used to return the response map as a
// successful result: the failure text was in the content, but isError was unset,
// so a client — and the agent reading it — treated a rejected batch as success.
// Routing every soft response through this helper keeps failures visible at the
// protocol level.
func toolErrorResult(data any) (*mcp.CallToolResult, any, error) {
	respMap, ok := data.(map[string]any)
	if !ok || respMap == nil {
		return nil, data, nil
	}
	msg, _ := respMap["error"].(string)
	if msg == "" {
		return nil, data, nil
	}
	return &mcp.CallToolResult{
		IsError: true,
		Content: []mcp.Content{&mcp.TextContent{Text: msg}},
	}, data, nil
}

// writeSVGFile writes a generated SVG and returns its absolute path. A missing
// .svg extension is added rather than silently writing text into a directory or
// a filename the caller cannot reopen as an image.
func writeSVGFile(requestedPath, svg string) (string, error) {
	path := strings.TrimSpace(requestedPath)
	if path == "" {
		return "", fmt.Errorf("filePath is empty")
	}
	abs, err := filepath.Abs(path)
	if err != nil {
		return "", fmt.Errorf("resolve filePath: %w", err)
	}
	if !strings.EqualFold(filepath.Ext(abs), ".svg") {
		abs += ".svg"
	}
	if info, err := os.Stat(abs); err == nil && info.IsDir() {
		return "", fmt.Errorf("filePath %s is a directory", abs)
	}
	if err := os.MkdirAll(filepath.Dir(abs), 0o755); err != nil {
		return "", fmt.Errorf("create SVG directory: %w", err)
	}
	if err := os.WriteFile(abs, []byte(svg), 0o644); err != nil {
		return "", fmt.Errorf("write SVG: %w", err)
	}
	return abs, nil
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

// scalarString renders a JSON scalar as the string form an encoding/json
// string field expects.
func scalarString(v any) (string, bool) {
	switch t := v.(type) {
	case string:
		return t, true
	case bool:
		return strconv.FormatBool(t), true
	case float64:
		return strconv.FormatFloat(t, 'f', -1, 64), true
	case float32:
		return strconv.FormatFloat(float64(t), 'f', -1, 64), true
	case int:
		return strconv.Itoa(t), true
	case int64:
		return strconv.FormatInt(t, 10), true
	case json.Number:
		return t.String(), true
	}
	return "", false
}

// colorFromValue accepts a color string or the {color: "#hex"} object form.
func colorFromValue(v any) (string, bool) {
	if s, ok := v.(string); ok {
		return s, true
	}
	if obj, ok := v.(map[string]any); ok {
		return scalarString(obj["color"])
	}
	return "", false
}

// Fields inside render_elements' elements[] and modify_elements'
// modifications[]. decodeViaJSON only normalizes the top-level keys it is told
// about, so every value inside a batch entry would otherwise reach
// encoding/json untouched — an agent following the tool description and
// sending fontWeight: 700 got "cannot unmarshal number into Go struct field
// ... FontWeight of type string" instead of a rendered element.
var (
	elementNumericFields = []string{
		"left", "top", "x", "y", "width", "height", "fontSize", "lineHeight",
		"blur", "radius", "cornerRadius", "sides", "x1", "y1", "x2", "y2",
		"gradientAngle", "strokeWidth", "angle", "rotation", "opacity",
		"scaleX", "scaleY",
	}
	elementStringFields = []string{
		"id", "name", "type", "text", "fontFamily", "fontStyle", "textAlign",
		"url", "stickerName", "action",
	}
	elementColorFields = []string{"fill", "color", "stroke"}
	elementBoolFields  = []string{"underline", "locked"}
)

// normalizeElementFields applies the flexible-input rules to one batch entry.
func normalizeElementFields(entry any) any {
	obj, ok := entry.(map[string]any)
	if !ok {
		return entry
	}
	out := make(map[string]any, len(obj))
	for k, v := range obj {
		out[k] = v
	}
	for _, k := range elementNumericFields {
		if v, ok := out[k]; ok {
			if f, ok := flexibleFloat(v); ok {
				out[k] = f
			}
		}
	}
	for _, k := range elementStringFields {
		if v, ok := out[k]; ok {
			if s, ok := scalarString(v); ok {
				out[k] = s
			}
		}
	}
	for _, k := range elementColorFields {
		if v, ok := out[k]; ok {
			if s, ok := colorFromValue(v); ok {
				out[k] = s
			}
		}
	}
	for _, k := range elementBoolFields {
		if v, ok := out[k]; ok {
			if b, ok := flexibleBool(v); ok {
				out[k] = b
			}
		}
	}
	// fontWeight is documented numerically (400|500|600|700|bold) but typed as
	// a string, and encoding/json will not coerce a number into one.
	if v, ok := out["fontWeight"]; ok {
		if s, ok := scalarString(v); ok {
			out["fontWeight"] = s
		}
	}
	return out
}

// normalizeElementList normalizes every entry of a batch field.
func normalizeElementList(v any) any {
	list, ok := v.([]any)
	if !ok {
		return v
	}
	out := make([]any, len(list))
	for i, entry := range list {
		out[i] = normalizeElementFields(entry)
	}
	return out
}

// ---- Unsplash download tracking ----
//
// Unsplash's guidelines want the download_location call fired when a photo is
// actually used, not when it is searched. Placement (render_elements) is the
// moment a photo becomes part of a design, so the hook lives there: tracking at
// search time would book every preview and spend quota on images nobody kept.

// imageURLsFromElements returns the URLs of the image elements in a batch.
func imageURLsFromElements(elements []ElementDefinition) []string {
	urls := make([]string, 0, len(elements))
	for _, el := range elements {
		if el.Type != "image" || el.URL == nil {
			continue
		}
		if u := strings.TrimSpace(*el.URL); u != "" {
			urls = append(urls, u)
		}
	}
	return urls
}

// trackUnsplashPlacements is a seam for tests: the real call performs Unsplash
// API requests.
var trackUnsplashPlacements = func(svc *avnacserver.UnsplashService, urls []string) int {
	if svc == nil {
		return 0
	}
	return svc.TrackPlacements(urls)
}

// ---- Unsplash attribution ----
//
// Unsplash requires the photographer and Unsplash to be credited wherever a
// photo is used. The credit is attached to the image element at placement time
// so it travels with the design (node.credit) instead of dying with the search
// results that produced it.

// creditForPlacement is a seam for tests, so the attribution path can be
// exercised without an UnsplashService.
var creditForPlacement = func(svc *avnacserver.UnsplashService, url string) (avnacserver.UnsplashCredit, bool) {
	return avnacserver.CreditFor(svc, url)
}

// withUnsplashCredits attaches the credit of the searched photo each image
// element places. Elements that already carry a credit (or whose URL never came
// from a search) are left alone.
func withUnsplashCredits(svc *avnacserver.UnsplashService, elements []ElementDefinition) []ElementDefinition {
	for i := range elements {
		if elements[i].Type != "image" || elements[i].URL == nil || elements[i].Credit != nil {
			continue
		}
		if credit, ok := creditForPlacement(svc, *elements[i].URL); ok {
			attribution := credit
			elements[i].Credit = &attribution
		}
	}
	return elements
}

// trackRenderedImages reports the images a successful render placed. It runs
// in the background: tracking is a network round-trip that must not delay the
// tool response, and a failure there must never fail the render. A failed
// render reports nothing, so a rejected batch cannot book a download.
func trackRenderedImages(svc *avnacserver.UnsplashService, elements []ElementDefinition, resp any) {
	if respMap, ok := resp.(map[string]any); ok {
		if errStr, _ := respMap["error"].(string); errStr != "" {
			return
		}
	}
	urls := imageURLsFromElements(elements)
	if len(urls) == 0 {
		return
	}
	go trackUnsplashPlacements(svc, urls)
}

// withNormalizedElements copies raw with per-entry normalization applied to
// the named batch field (materializing it first when a client sent it
// stringified).
func withNormalizedElements(raw map[string]any, key string) map[string]any {
	out := make(map[string]any, len(raw))
	for k, v := range raw {
		out[k] = v
	}
	if v, ok := out[key]; ok {
		out[key] = normalizeElementList(normalizeJSONValue(v))
	}
	return out
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
	if err := decodeViaJSON(withNormalizedElements(raw, "elements"), []string{"elements"}, []string{"includePreview"}, &out); err != nil {
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
	if err := decodeViaJSON(withNormalizedElements(raw, "modifications"), []string{"modifications"}, []string{"includePreview"}, &out); err != nil {
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
	case "cap-middle", "capmiddle", "cap_middle", "cap middle", "caps-middle", "optical-middle":
		return "cap-middle"
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
		return out, fmt.Errorf("type is required (left, center, right, top, middle, bottom, cap-middle)")
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
	// Credit is filled in by the server for image URLs that came from
	// search_unsplash, so the attribution is stored with the design.
	Credit *avnacserver.UnsplashCredit `json:"credit,omitempty"`
	// Fit controls how a photo fills its box: "fill" (default, stretches) or
	// "cover" (crops the source to the box aspect, anchored on focalPoint).
	Fit *string `json:"fit,omitempty"`
	// FocalPoint is the normalized (0..1) point kept in frame by fit=cover.
	FocalPoint *FocalPoint `json:"focalPoint,omitempty"`
	// Crop is an explicit normalized (0..1) source rectangle; it wins over fit.
	Crop *NormalizedCrop `json:"crop,omitempty"`
}

// FocalPoint is a normalized point inside an image, used by fit=cover.
type FocalPoint struct {
	X *float64 `json:"x,omitempty"`
	Y *float64 `json:"y,omitempty"`
}

// NormalizedCrop is a source rectangle in 0..1 image coordinates.
type NormalizedCrop struct {
	X      *float64 `json:"x,omitempty"`
	Y      *float64 `json:"y,omitempty"`
	Width  *float64 `json:"width,omitempty"`
	Height *float64 `json:"height,omitempty"`
}

type RenderElementsInput struct {
	Elements       []ElementDefinition `json:"elements"`
	IncludePreview *bool               `json:"includePreview,omitempty"`
}

type ElementModification struct {
	ObjectID      string            `json:"objectId"`
	ID            *string           `json:"id,omitempty"`
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
	NewName       *string           `json:"newName,omitempty"`
	TargetName    *string           `json:"targetName,omitempty"`
	ObjectName    *string           `json:"objectName,omitempty"`
	URL           *string           `json:"url,omitempty"`
	Src           *string           `json:"src,omitempty"`
	Locked        *bool             `json:"locked,omitempty"`
	GradientAngle *float64          `json:"gradientAngle,omitempty"`
	GradientStops []GradientStop    `json:"gradientStops,omitempty"`
	// Image art direction (same semantics as ElementDefinition).
	Fit        *string         `json:"fit,omitempty"`
	FocalPoint *FocalPoint     `json:"focalPoint,omitempty"`
	Crop       *NormalizedCrop `json:"crop,omitempty"`
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
	// The alignment type (left, center, right, top, middle, bottom, cap-middle)
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

// truncatePageName bounds an agent-supplied page name the same way the
// frontend does. Empty names are meaningful: the UI falls back to "Page N".
func truncatePageName(name string) string {
	name = strings.TrimSpace(name)
	runes := []rune(name)
	if len(runes) > 120 {
		runes = runes[:120]
	}
	return string(runes)
}

// decodePageTarget pulls a page selector out of loose agent input. `index` is
// 0-based (the form get_canvas_summary exposes); `page` is 1-based or a name.
// Rename deliberately does not treat `name` as a target: there it is the new name.
func decodePageTarget(raw map[string]any, allowName bool) (map[string]any, bool) {
	if v, ok := raw["index"]; ok {
		if n, ok := flexibleInt(v); ok {
			return map[string]any{"index": n}, true
		}
	}
	keys := []string{"page", "pageNumber", "pageName"}
	if allowName {
		keys = append(keys, "name", "title")
	}
	for _, key := range keys {
		v, ok := raw[key]
		if !ok || v == nil {
			continue
		}
		if s, ok := scalarString(v); ok {
			s = strings.TrimSpace(s)
			if s != "" {
				return map[string]any{"page": s}, true
			}
		}
	}
	return nil, false
}

func decodeAddPageInput(raw map[string]any) map[string]any {
	out := make(map[string]any, 5)
	if name := truncatePageName(stringField(raw, "name", "pageName", "title")); name != "" {
		out["name"] = name
	}
	for _, key := range []string{"width", "height"} {
		if v, ok := raw[key]; ok && v != nil {
			if n, ok := flexibleFloat(v); ok && n >= 100 && n <= 16000 {
				out[key] = int(n)
			}
		}
	}
	if bg := stringField(raw, "backgroundColor", "color", "bg"); bg != "" {
		out["backgroundColor"] = bg
	}
	if target, ok := decodePageTarget(raw, false); ok {
		for key, value := range target {
			out[key] = value
		}
	}
	return out
}

func decodeResizeArtboardInput(raw map[string]any) (map[string]any, error) {
	out := make(map[string]any, 5)
	hasSize := false
	for _, key := range []string{"width", "height"} {
		if v, ok := raw[key]; ok && v != nil {
			n, ok := flexibleFloat(v)
			if !ok || n < 100 || n > 16000 {
				return nil, fmt.Errorf("%s must be between 100 and 16000 pixels", key)
			}
			out[key] = int(n)
			hasSize = true
		}
	}
	if bg := stringField(raw, "backgroundColor", "color", "bg"); bg != "" {
		out["backgroundColor"] = bg
	} else if !hasSize {
		return nil, fmt.Errorf("resize needs width, height, or backgroundColor")
	}
	if target, ok := decodePageTarget(raw, false); ok {
		for key, value := range target {
			out[key] = value
		}
	}
	return out, nil
}

func decodeSnapshotTokenInput(raw map[string]any) (map[string]any, error) {
	token := stringField(raw, "token", "snapshotId", "snapshot")
	if token == "" {
		return nil, fmt.Errorf("token is required (from canvas op=snapshot)")
	}
	return map[string]any{"token": token}, nil
}

func decodeGoToPageInput(raw map[string]any) (map[string]any, error) {
	target, ok := decodePageTarget(raw, true)
	if !ok {
		return nil, fmt.Errorf("page is required: a 1-based page number, a page name, or a 0-based index (from get_canvas_summary)")
	}
	return target, nil
}

func decodeRenamePageInput(raw map[string]any) (map[string]any, error) {
	name := truncatePageName(stringField(raw, "name", "title"))
	if name == "" {
		return nil, fmt.Errorf("name is required (a non-empty page name, max 120 characters)")
	}
	out := map[string]any{"name": name}
	if target, ok := decodePageTarget(raw, false); ok {
		for key, value := range target {
			out[key] = value
		}
	}
	return out, nil
}

func decodeDeletePageInput(raw map[string]any) map[string]any {
	out := make(map[string]any, 1)
	if target, ok := decodePageTarget(raw, true); ok {
		for key, value := range target {
			out[key] = value
		}
	}
	return out
}

func (m *AvnacMCP) RegisterTools(wailsCtx context.Context) {
	// Settings probes the editor through this context, so keep it: the settings
	// route has no MCP request to borrow one from.
	setEmitContext(m, wailsCtx)
	// Every handler keeps its body and its frontend action name; only the
	// published surface changes. Legacy names are collected here so the grouped
	// tools (canvas, elements, arrange, files, assets, export) can dispatch to
	// the same code that used to be registered one tool per action.
	legacy := make(map[string]toolHandler, 27)
	defs := make(map[string]*mcp.Tool, 27)
	addLegacy := func(t *mcp.Tool, h toolHandler) {
		legacy[t.Name] = h
		defs[t.Name] = t
	}
	// Page handlers are published only as `canvas` ops, but they live in the
	// same dispatch table as every other action so op aliases keep working.
	addLegacy(&mcp.Tool{
		Name: "add_page",
		Description: "Add a named blank page to the open document and switch the editor to it live. " +
			"Use this for drafts, tests, variations and explorations instead of creating a new canvas. " +
			"By default the page inherits the current artboard size; pass width/height for a differently sized page.",
		InputSchema: objSchema(map[string]*jsonschema.Schema{
			"name":            desc("Optional page name (max 120 chars), e.g. 'Test — poster exploration'. Defaults to the page number."),
			"width":           desc("Optional page width in pixels (100-16000). Defaults to the current artboard width."),
			"height":          desc("Optional page height in pixels (100-16000). Defaults to the current artboard height."),
			"backgroundColor": desc("Optional page background color hex. Defaults to white."),
			"color":           desc("Alias for backgroundColor."),
		}),
	}, func(ctx context.Context, req *mcp.CallToolRequest, raw map[string]any) (*mcp.CallToolResult, any, error) {
		data, err := m.emitSync(wailsCtx, "add_page", decodeAddPageInput(raw), 15*time.Second)
		if err != nil {
			return nil, nil, err
		}
		return toolErrorResult(data)
	})

	addLegacy(&mcp.Tool{
		Name: "goto_page",
		Description: "Switch the editor to another page in the open document. Page changes are visible in the app immediately. " +
			"Accepts a 1-based page number, a page name, or a 0-based index from get_canvas_summary.",
		InputSchema: objSchema(map[string]*jsonschema.Schema{
			"page":  desc("1-based page number or page name."),
			"index": desc("0-based page index from get_canvas_summary (alternative to page)."),
		}),
	}, func(ctx context.Context, req *mcp.CallToolRequest, raw map[string]any) (*mcp.CallToolResult, any, error) {
		payload, err := decodeGoToPageInput(raw)
		if err != nil {
			return nil, nil, err
		}
		data, err := m.emitSync(wailsCtx, "goto_page", payload, 15*time.Second)
		if err != nil {
			return nil, nil, err
		}
		return toolErrorResult(data)
	})

	addLegacy(&mcp.Tool{
		Name:        "rename_page",
		Description: "Rename a page in the open document. Defaults to the active page when no page target is supplied.",
		InputSchema: objSchema(map[string]*jsonschema.Schema{
			"page":  desc("Optional target: 1-based page number or page name. Defaults to the current page."),
			"index": desc("Optional 0-based page index (alternative to page)."),
			"name":  desc("New page name (required, max 120 chars)."),
		}, "name"),
	}, func(ctx context.Context, req *mcp.CallToolRequest, raw map[string]any) (*mcp.CallToolResult, any, error) {
		payload, err := decodeRenamePageInput(raw)
		if err != nil {
			return nil, nil, err
		}
		data, err := m.emitSync(wailsCtx, "rename_page", payload, 10*time.Second)
		if err != nil {
			return nil, nil, err
		}
		return toolErrorResult(data)
	})

	addLegacy(&mcp.Tool{
		Name: "delete_page",
		Description: "Delete a page from the open document. Defaults to the active page when no page target is supplied; " +
			"never deletes the last remaining page. Use this to clean up a test page after verification.",
		InputSchema: objSchema(map[string]*jsonschema.Schema{
			"page":  desc("Optional target: 1-based page number or page name. Defaults to the current page."),
			"index": desc("Optional 0-based page index (alternative to page)."),
		}),
	}, func(ctx context.Context, req *mcp.CallToolRequest, raw map[string]any) (*mcp.CallToolResult, any, error) {
		data, err := m.emitSync(wailsCtx, "delete_page", decodeDeletePageInput(raw), 15*time.Second)
		if err != nil {
			return nil, nil, err
		}
		return toolErrorResult(data)
	})

	addLegacy(&mcp.Tool{
		Name: "resize_artboard",
		Description: "Resize the active artboard in place, optionally changing its background. " +
			"Use this instead of starting a new project when only the sheet dimensions are wrong.",
		InputSchema: objSchema(map[string]*jsonschema.Schema{
			"width":           desc("New width in pixels (100-16000)."),
			"height":          desc("New height in pixels (100-16000)."),
			"backgroundColor": desc("Optional new background color hex."),
			"color":           desc("Alias for backgroundColor."),
			"page":            desc("Optional active-page guard: 1-based number or page name."),
			"index":           desc("Optional active-page guard: 0-based page index."),
		}),
	}, func(ctx context.Context, req *mcp.CallToolRequest, raw map[string]any) (*mcp.CallToolResult, any, error) {
		input, err := decodeResizeArtboardInput(raw)
		if err != nil {
			return nil, nil, err
		}
		data, err := m.emitSync(wailsCtx, "resize_artboard", input, 15*time.Second)
		if err != nil {
			return nil, nil, err
		}
		return toolErrorResult(data)
	})

	addLegacy(&mcp.Tool{
		Name:        "create_snapshot",
		Description: "Capture every page of the open document and return a session token for canvas op=restore. Use before a risky edit or a page-wide experiment.",
		InputSchema: objSchema(map[string]*jsonschema.Schema{
			"token": desc("Optional caller-chosen token. Defaults to a generated snapshot id."),
		}),
	}, func(ctx context.Context, req *mcp.CallToolRequest, raw map[string]any) (*mcp.CallToolResult, any, error) {
		data, err := m.emitSync(wailsCtx, "create_snapshot", raw, 15*time.Second)
		if err != nil {
			return nil, nil, err
		}
		return toolErrorResult(data)
	})

	addLegacy(&mcp.Tool{
		Name:        "restore_snapshot",
		Description: "Restore a document snapshot captured with canvas op=snapshot. The token is session-scoped.",
		InputSchema: objSchema(map[string]*jsonschema.Schema{
			"token":      desc("Snapshot token from canvas op=snapshot."),
			"snapshotId": desc("Alias for token."),
		}),
	}, func(ctx context.Context, req *mcp.CallToolRequest, raw map[string]any) (*mcp.CallToolResult, any, error) {
		input, err := decodeSnapshotTokenInput(raw)
		if err != nil {
			return nil, nil, err
		}
		data, err := m.emitSync(wailsCtx, "restore_snapshot", input, 20*time.Second)
		if err != nil {
			return nil, nil, err
		}
		return toolErrorResult(data)
	})

	addLegacy(&mcp.Tool{
		Name:        "undo_canvas",
		Description: "Undo the last scene or page operation in the open document.",
		InputSchema: emptyObjSchema(),
	}, func(ctx context.Context, req *mcp.CallToolRequest, raw map[string]any) (*mcp.CallToolResult, any, error) {
		data, err := m.emitSync(wailsCtx, "undo", map[string]any{}, 15*time.Second)
		if err != nil {
			return nil, nil, err
		}
		return toolErrorResult(data)
	})

	addLegacy(&mcp.Tool{
		Name:        "redo_canvas",
		Description: "Redo the last undone scene or page operation in the open document.",
		InputSchema: emptyObjSchema(),
	}, func(ctx context.Context, req *mcp.CallToolRequest, raw map[string]any) (*mcp.CallToolResult, any, error) {
		data, err := m.emitSync(wailsCtx, "redo", map[string]any{}, 15*time.Second)
		if err != nil {
			return nil, nil, err
		}
		return toolErrorResult(data)
	})

	addLegacy(&mcp.Tool{
		Name:        "client_status",
		Description: "Report the connected editor client, document/page, revision, undo state and implemented action capabilities. Use this first when an action is unexpectedly unknown or targets the wrong page.",
		InputSchema: emptyObjSchema(),
	}, func(ctx context.Context, req *mcp.CallToolRequest, raw map[string]any) (*mcp.CallToolResult, any, error) {
		data, err := m.emitSync(wailsCtx, "client_status", map[string]any{}, 10*time.Second)
		if err != nil {
			return nil, nil, err
		}
		return toolErrorResult(data)
	})

	addLegacy(&mcp.Tool{
		Name:        "validate_canvas",
		Description: "Audit the active page and return structured issues: out-of-bounds objects, low text contrast, tiny type, thin strokes, duplicate names, near tangencies and unloaded fonts. Warnings are advisory; errors block a clean pass.",
		InputSchema: objSchema(map[string]*jsonschema.Schema{
			"families":        desc("Optional extra font family names to verify."),
			"tolerance":       desc("Pixel tolerance for bounds/tangency checks (default 0.5)."),
			"checkTangencies": desc("Set false to skip the pairwise near-tangency check."),
			"page":            desc("Optional active-page guard: 1-based number or page name."),
			"index":           desc("Optional active-page guard: 0-based page index."),
			"documentId":      desc("Optional active-document guard."),
		}),
	}, func(ctx context.Context, req *mcp.CallToolRequest, raw map[string]any) (*mcp.CallToolResult, any, error) {
		payload := map[string]any{}
		for _, key := range []string{"families", "tolerance", "checkTangencies", "page", "index", "documentId"} {
			if value, ok := raw[key]; ok && value != nil {
				payload[key] = value
			}
		}
		data, err := m.emitSync(wailsCtx, "validate_canvas", payload, 20*time.Second)
		if err != nil {
			return nil, nil, err
		}
		return toolErrorResult(data)
	})

	// measure_elements is published only as `elements` op=measure; the hidden
	// registration keeps its handler in the same dispatch table as the rest.
	addLegacy(&mcp.Tool{
		Name:        "measure_elements",
		Description: "Measure proposed elements without drawing them: text width/height, line breaks, and vertical metrics.",
		InputSchema: objSchema(map[string]*jsonschema.Schema{
			"elements": desc("Array of element specs, same shape as `elements` op=render, or a JSON-encoded string of that array."),
		}, "elements"),
	}, func(ctx context.Context, req *mcp.CallToolRequest, raw map[string]any) (*mcp.CallToolResult, any, error) {
		input, err := decodeRenderElementsInput(raw)
		if err != nil {
			return nil, nil, err
		}
		data, err := m.emitSync(wailsCtx, "measure_elements", input, 10*time.Second)
		if err != nil {
			return nil, nil, err
		}
		return toolErrorResult(data)
	})
	addLegacy(&mcp.Tool{
		Name:        "render_elements",
		Description: "Declaratively create multiple elements (rect, ellipse, polygon, star, text, image, sticker, line) in a single batch. Supports layout (left/top or x/y, width, height), styling (fill, opacity, angle/rotation, blur, cornerRadius), text controls (textAlign, fontWeight, fontStyle, lineHeight, underline), effects (shadows, gradients), and specialized properties (fontFamily, stickerName, url, sides, x1/y1/x2/y2). Text sent without a width is measured against its real font and auto-sized to its natural width, so use the returned bounds to lay out around it rather than assuming a line count. Returns created element IDs and metadata, plus an optional visual preview if includePreview=true.",
		InputSchema: objSchema(map[string]*jsonschema.Schema{
			"elements":       desc("Array of element objects, or a JSON-encoded string of that array. Each needs type + position/size. Text supports textAlign (left|center|right), fontWeight (400|500|600|700|bold, as a number or a string), fontStyle, lineHeight, underline. Numeric fields also accept their string form, and fill/color/stroke accept either a color string or {color: \"#hex\"}."),
			"includePreview": desc("If true (or \"true\"), return a PNG preview image alongside created IDs."),
		}, "elements"),
	}, func(ctx context.Context, req *mcp.CallToolRequest, raw map[string]any) (*mcp.CallToolResult, any, error) {
		input, err := decodeRenderElementsInput(raw)
		if err != nil {
			return nil, nil, err
		}
		// Attach attribution before the frontend builds the nodes, so each
		// placed photo keeps its credit in the saved document.
		input.Elements = withUnsplashCredits(m.Unsplash, input.Elements)
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
				trackRenderedImages(m.Unsplash, input.Elements, respMap)
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
			return toolErrorResult(data)
		case <-time.After(20 * time.Second):
			m.mu.Lock()
			delete(m.pendingRequests, requestID)
			m.mu.Unlock()
			return nil, nil, fmt.Errorf("timeout waiting for render_elements completion")
		}
	})

	addLegacy(&mcp.Tool{
		Name:        "modify_elements",
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
			return toolErrorResult(data)
		case <-time.After(15 * time.Second):
			m.mu.Lock()
			delete(m.pendingRequests, requestID)
			m.mu.Unlock()
			return nil, nil, fmt.Errorf("timeout waiting for modify_elements completion")
		}
	})

	addLegacy(&mcp.Tool{
		Name:        "search_unsplash",
		Description: "Search for high-quality photos on Unsplash. Returns compact records (id, alt text, size, photographer, credit line, small/regular URLs) plus the remaining hourly quota in rateLimit. Place a photo by passing its regular URL as an image element's url in render_elements — that is when Unsplash download tracking fires and when the photo's credit is stored on the node, so search results you never use cost nothing extra. Each call spends the app's hourly quota: reuse results you already have instead of re-running the same query.",
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

		// Report the hourly quota alongside the results so a caller can reuse
		// what it already has instead of discovering the limit by hitting it.
		rateLimit := map[string]any{}
		if quota, err := m.Unsplash.RateLimit(); err == nil {
			rateLimit["limit"] = quota.Limit
			rateLimit["remaining"] = quota.Remaining
		}

		// Project to the fields agents actually use: id, alt text, native
		// size, photographer, the two render-ready URLs, and the credit line.
		// Dropping long descriptions, download/link blocks, and full-size URLs
		// keeps each query's output small in the caller's context window. The
		// download hook is server-side, so agents never need to carry
		// download_location around.
		photos := make([]map[string]any, 0, len(result.Photos))
		for _, p := range result.Photos {
			alt := ""
			if p.AltDescription != nil {
				alt = *p.AltDescription
			}
			photographer := strings.TrimSpace(p.User.Name)
			credit := ""
			if photographer != "" {
				credit = fmt.Sprintf("Photo by %s on Unsplash", photographer)
			}
			photos = append(photos, map[string]any{
				"id":              p.ID,
				"alt_description": alt,
				"width":           p.Width,
				"height":          p.Height,
				"photographer":    photographer,
				"credit":          credit,
				"urls": map[string]string{
					"small":   p.Urls.Small,
					"regular": p.Urls.Regular,
				},
			})
		}
		out := map[string]any{"photos": photos, "hasMore": result.HasMore}
		if len(rateLimit) > 0 {
			out["rateLimit"] = rateLimit
		}
		return toolErrorResult(out)
	})

	addLegacy(&mcp.Tool{
		Name:        "list_stickers",
		Description: "Get the list of available built-in stickers",
		InputSchema: emptyObjSchema(),
	}, func(ctx context.Context, req *mcp.CallToolRequest, raw map[string]any) (*mcp.CallToolResult, any, error) {
		_ = raw
		stickers := []string{"donut", "leaf", "lollipop", "pineapple", "shooting-star-badge", "sunflower-badge"}
		return nil, map[string]any{"stickers": stickers}, nil
	})

	addLegacy(&mcp.Tool{
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
		return toolErrorResult(data)
	})

	addLegacy(&mcp.Tool{
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
		return toolErrorResult(data)
	})

	// get_object_properties keeps its typed handler and is registered directly:
	// it is a read tool, so it still appears as its own name.
	mcp.AddTool(m.server, &mcp.Tool{
		Name:        "get_object_properties",
		Description: "Get detailed properties of an object by ID or by unique name. Returns the node, text metrics/image natural size, and the current document revision.",
		InputSchema: objSchema(map[string]*jsonschema.Schema{
			"objectId":   desc("ID of the object to inspect."),
			"id":         desc("Alias for objectId."),
			"name":       desc("Unique object name to inspect."),
			"targetName": desc("Alias for name."),
			"documentId": desc("Optional active-document guard."),
			"page":       desc("Optional active-page guard."),
			"index":      desc("Optional 0-based active-page guard."),
		}),
	}, func(ctx context.Context, req *mcp.CallToolRequest, raw map[string]any) (*mcp.CallToolResult, any, error) {
		payload := map[string]any{}
		for _, key := range []string{"objectId", "id", "name", "targetName", "documentId", "page", "index"} {
			if value, ok := raw[key]; ok && value != nil {
				payload[key] = value
			}
		}
		data, err := m.emitSync(wailsCtx, "get_object_properties", payload, 8*time.Second)
		if err != nil {
			return nil, nil, err
		}
		return toolErrorResult(data)
	})

	addLegacy(&mcp.Tool{
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
			return toolErrorResult(data)
		case <-time.After(15 * time.Second):
			m.mu.Lock()
			delete(m.pendingRequests, requestID)
			m.mu.Unlock()
			return nil, nil, fmt.Errorf("timeout waiting for create_canvas completion")
		}
	})

	addLegacy(&mcp.Tool{
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

	addLegacy(&mcp.Tool{
		Name:        "open_canvas",
		Description: "Open a saved canvas file by workspace id (from list_files), navigate the editor to it, and make it the active scene. Returns the opened file's name and dimensions or an unknown-id error.",
		InputSchema: objSchema(map[string]*jsonschema.Schema{
			"fileId":      desc("Workspace id of the file to open, as returned by list_files."),
			"id":          desc("Alias for fileId."),
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
		return toolErrorResult(data)
	})

	addLegacy(&mcp.Tool{
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
		return toolErrorResult(data)
	})

	addLegacy(&mcp.Tool{
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
		return toolErrorResult(data)
	})

	addLegacy(&mcp.Tool{
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
		return toolErrorResult(data)
	})

	addLegacy(&mcp.Tool{
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
		return toolErrorResult(data)
	})

	addLegacy(&mcp.Tool{
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
		return toolErrorResult(data)
	})

	addLegacy(&mcp.Tool{
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
		return toolErrorResult(data)
	})

	addLegacy(&mcp.Tool{
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
		return toolErrorResult(data)
	})

	addLegacy(&mcp.Tool{
		Name:        "get_font_list",
		Description: "Get the list of supported Google Fonts. Pass families/check to also report which of those families are actually loaded in the connected editor; a font can be listed but not yet rendered.",
		InputSchema: objSchema(map[string]*jsonschema.Schema{
			"families":     desc("Optional family names to verify (array or comma-separated string)."),
			"fontFamilies": desc("Alias for families."),
			"check":        desc("Alias for families."),
			"family":       desc("Alias for a single family."),
		}),
	}, func(ctx context.Context, req *mcp.CallToolRequest, raw map[string]any) (*mcp.CallToolResult, any, error) {
		payload := map[string]any{}
		for _, key := range []string{"families", "fontFamilies", "check", "family"} {
			if value, ok := raw[key]; ok && value != nil {
				payload[key] = value
			}
		}
		data, err := m.emitSync(wailsCtx, "get_font_list", payload, 8*time.Second)
		if err != nil {
			return nil, nil, err
		}
		return toolErrorResult(data)
	})

	addLegacy(&mcp.Tool{
		Name:        "clear_canvas",
		Description: "Remove all objects from the canvas. Returns cleared count or a no-scene error.",
		InputSchema: emptyObjSchema(),
	}, func(ctx context.Context, req *mcp.CallToolRequest, raw map[string]any) (*mcp.CallToolResult, any, error) {
		_ = raw
		data, err := m.emitSync(wailsCtx, "clear_canvas", map[string]any{}, 15*time.Second)
		if err != nil {
			return nil, nil, err
		}
		return toolErrorResult(data)
	})

	addLegacy(&mcp.Tool{
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
		return toolErrorResult(data)
	})

	addLegacy(&mcp.Tool{
		Name:        "align_objects",
		Description: "Align the currently selected objects. type: left, center, right, top, middle, bottom, cap-middle (center=centerH, middle=centerV). Single selection aligns to artboard; multiple aligns to each other. cap-middle is optical: it centres the other selected objects on the cap-height band of the first selected text object (the letters, not the text box), which is how a dot or icon lines up with a label. Text metrics come from the real font; if they are unavailable the call fails rather than falling back to box centring.",
		InputSchema: objSchema(map[string]*jsonschema.Schema{
			"type":      desc("Alignment: left, center, right, top, middle, bottom, cap-middle."),
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
		return toolErrorResult(data)
	})

	addLegacy(&mcp.Tool{
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
		return toolErrorResult(data)
	})

	addLegacy(&mcp.Tool{
		Name: "export_svg",
		Description: "Export the current page or a selection as editable SVG markup. " +
			"Pass objectId/objectIds for a cropped selection, or omit them for the full artboard. " +
			"Optionally write the SVG to filePath and return the written path.",
		InputSchema: objSchema(map[string]*jsonschema.Schema{
			"objectId":   desc("Optional single object/group to export as a cropped selection."),
			"objectIds":  desc("Optional array of object/group ids to export as a cropped selection."),
			"scope":      desc("page (default) or selection."),
			"filePath":   desc("Optional absolute or workspace-relative .svg path to write."),
			"documentId": desc("Optional active-document guard."),
			"page":       desc("Optional active-page guard."),
			"index":      desc("Optional 0-based active-page guard."),
		}),
	}, func(ctx context.Context, req *mcp.CallToolRequest, raw map[string]any) (*mcp.CallToolResult, any, error) {
		payload := map[string]any{}
		for _, key := range []string{"objectId", "objectIds", "scope", "page", "index", "documentId"} {
			if value, ok := raw[key]; ok && value != nil {
				payload[key] = value
			}
		}
		data, err := m.emitSync(wailsCtx, "export_svg", payload, 20*time.Second)
		if err != nil {
			return nil, nil, err
		}
		respMap, ok := data.(map[string]any)
		if !ok || respMap == nil {
			return toolErrorResult(data)
		}
		if errStr, _ := respMap["error"].(string); errStr != "" {
			return toolErrorResult(data)
		}
		svg, _ := respMap["svg"].(string)
		if svg == "" {
			return nil, nil, fmt.Errorf("export_svg returned no SVG markup")
		}
		delete(respMap, "svg")
		filePath := stringField(raw, "filePath", "path", "filename")
		if filePath != "" {
			written, err := writeSVGFile(filePath, svg)
			if err != nil {
				return nil, nil, err
			}
			respMap["filePath"] = written
		}
		return &mcp.CallToolResult{
			Content: []mcp.Content{&mcp.TextContent{Text: svg}},
		}, respMap, nil
	})

	addLegacy(&mcp.Tool{
		Name:        "list_objects",
		Description: "List all objects currently on the canvas with their IDs and types",
		InputSchema: emptyObjSchema(),
	}, func(ctx context.Context, req *mcp.CallToolRequest, raw map[string]any) (*mcp.CallToolResult, any, error) {
		_ = raw
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
			return toolErrorResult(data)
		case <-time.After(15 * time.Second):
			m.mu.Lock()
			delete(m.pendingRequests, requestID)
			m.mu.Unlock()
			return nil, nil, fmt.Errorf("timeout waiting for object list")
		}
	})

	addLegacy(&mcp.Tool{
		Name:        "get_selection",
		Description: "Get the IDs and properties of the currently selected objects",
		InputSchema: emptyObjSchema(),
	}, func(ctx context.Context, req *mcp.CallToolRequest, raw map[string]any) (*mcp.CallToolResult, any, error) {
		_ = raw
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
			return toolErrorResult(data)
		case <-time.After(15 * time.Second):
			m.mu.Lock()
			delete(m.pendingRequests, requestID)
			m.mu.Unlock()
			return nil, nil, fmt.Errorf("timeout waiting for selection state")
		}
	})

	addLegacy(&mcp.Tool{
		Name:        "get_canvas_state",
		Description: "Get the current state of the canvas",
		InputSchema: emptyObjSchema(),
	}, func(ctx context.Context, req *mcp.CallToolRequest, raw map[string]any) (*mcp.CallToolResult, any, error) {
		_ = raw
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
			return toolErrorResult(data)
		case <-time.After(15 * time.Second):
			m.mu.Lock()
			delete(m.pendingRequests, requestID)
			m.mu.Unlock()
			return nil, nil, fmt.Errorf("timeout waiting for canvas state")
		}
	})

	addLegacy(&mcp.Tool{
		Name:        "get_canvas_summary",
		Description: "Get a token-efficient semantic summary of the current canvas artboard and objects without raw engine internals",
		InputSchema: emptyObjSchema(),
	}, func(ctx context.Context, req *mcp.CallToolRequest, raw map[string]any) (*mcp.CallToolResult, any, error) {
		_ = raw
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
			return toolErrorResult(data)
		case <-time.After(15 * time.Second):
			m.mu.Lock()
			delete(m.pendingRequests, requestID)
			m.mu.Unlock()
			return nil, nil, fmt.Errorf("timeout waiting for canvas summary")
		}
	})

	addLegacy(&mcp.Tool{
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

	// Six read tools keep one name per operation. Reads are cheap, side-effect
	// free, and return five different shapes; folding them into one `inspect`
	// op would trade clarity for a smaller number.
	for _, name := range []string{
		"get_canvas_summary",
		"get_canvas_state",
		"get_canvas_image",
		"list_objects",
		"get_selection",
	} {
		handler := legacy[name]
		mcp.AddTool(m.server, defs[name], func(ctx context.Context, req *mcp.CallToolRequest, raw map[string]any) (*mcp.CallToolResult, any, error) {
			return handler(ctx, req, raw)
		})
	}

	m.registerGroupedTools(legacy)
	m.registerVectorTool(wailsCtx)
	m.registerGuideTool()
}

// toolHandler is the decoded handler shape the op dispatcher calls. Every tool
// body in this file already has it; the type exists so the grouped tools can
// invoke them without re-registering each one.
type toolHandler func(context.Context, *mcp.CallToolRequest, map[string]any) (*mcp.CallToolResult, any, error)

// addOpTool publishes one noun-shaped tool whose verbs are `op` values.
func (m *AvnacMCP) addOpTool(
	legacy map[string]toolHandler,
	tool *mcp.Tool,
	ops map[string]string,
) {
	// The op → action table is only authoritative here, so record it for the
	// settings panel while the dispatcher is built from the same map.
	m.recordToolOps(tool.Name, ops)
	handler := opDispatcher(tool.Name, ops, legacy)
	mcp.AddTool(m.server, tool, func(ctx context.Context, req *mcp.CallToolRequest, raw map[string]any) (*mcp.CallToolResult, any, error) {
		return handler(ctx, req, raw)
	})
}

// opDispatcher routes {op: ...} to the legacy handler for that action.
//
// Aliases are deliberate: an agent that learned `render_elements` may pass it as
// `op`, and accepting the old action name costs one map entry instead of a
// failed call. Arguments are forwarded unchanged minus the op keys, so every
// existing decoder (including the flexible stringifying ones) keeps working.
func opDispatcher(group string, ops map[string]string, legacy map[string]toolHandler) toolHandler {
	names := make([]string, 0, len(ops))
	for op := range ops {
		names = append(names, op)
	}
	sort.Strings(names)
	allowed := strings.Join(names, ", ")

	return func(ctx context.Context, req *mcp.CallToolRequest, raw map[string]any) (*mcp.CallToolResult, any, error) {
		op := strings.ToLower(strings.TrimSpace(stringField(raw, "op", "operation", "action")))
		if op == "" {
			return nil, nil, fmt.Errorf("%s requires op: one of %s", group, allowed)
		}
		action, ok := ops[op]
		if !ok {
			// Accept the legacy action name as an op so old habits still work.
			if _, isAction := legacy[op]; isAction {
				action, ok = op, true
			}
		}
		if !ok {
			return nil, nil, fmt.Errorf("unknown %s op %q; expected one of %s", group, op, allowed)
		}
		handler, ok := legacy[action]
		if !ok {
			return nil, nil, fmt.Errorf("%s op %q is not available in this build", group, op)
		}

		args := make(map[string]any, len(raw))
		for k, v := range raw {
			switch k {
			case "op", "operation", "action":
				continue
			}
			args[k] = v
		}
		res, data, err := handler(ctx, req, args)
		if err == nil && guideActions[action] {
			attachGuide(data, args)
		}
		return res, data, err
	}
}

// registerGroupedTools publishes the six verb tools. Their schemas are unions:
// per-op required fields are enforced by the existing decoders, which return an
// error naming the missing argument, so a loose object schema is enough and
// avoids six oneOf branches per tool.
func (m *AvnacMCP) registerGroupedTools(legacy map[string]toolHandler) {
	m.addOpTool(legacy, &mcp.Tool{
		Name: "canvas",
		Description: "Manage the project and its artboard. ONE PROJECT, MANY PAGES: op=create starts a NEW project — use it only when the user wants a separate deliverable or nothing suitable is open; NEVER create another canvas for a draft, test, variation or check. " +
			"op=add-page (name) adds a named blank page to the OPEN project, switches the editor to it live, and returns its index/number; compose and verify there, then op=delete-page to clean up a test page or keep it. " +
			"op=go-page (page: 1-based number or name; or index: 0-based) switches pages; op=rename-page (page?, name) renames; op=delete-page (page?, defaults current; never the last page). " +
			"get_canvas_summary lists every page and the active one. op=clear removes every object on the current page; op=background sets the current page background; " +
			"op=resize (width, height, backgroundColor, page?) resizes the active sheet in place; op=preset resizes to a standard preset (ig-square, ig-portrait, ig-story, hd, twitter-post, linkedin, youtube-thumb, a4-300, custom-4000). " +
			"op=snapshot captures all pages and returns a token; op=restore (token) restores it; op=undo/op=redo move through history; op=status reports the connected client, revision and implemented actions; op=validate audits bounds, contrast, type size, strokes, tangencies and fonts.",
		InputSchema: objSchema(map[string]*jsonschema.Schema{
			"op":              desc("Operation: create, add-page, go-page, rename-page, delete-page, clear, background, preset, resize, snapshot, restore, undo, redo, status, validate."),
			"width":           desc("create/resize: canvas width in pixels (100-16000). add-page: page width."),
			"height":          desc("create/resize: canvas height in pixels (100-16000). add-page: page height."),
			"name":            desc("create: workspace name; add-page/rename-page: page name (max 120 chars)."),
			"page":            desc("go-page/rename-page/delete-page: 1-based page number or page name. rename/delete default to the current page."),
			"index":           desc("go-page/rename-page/delete-page: 0-based page index from get_canvas_summary."),
			"documentId":      desc("Optional active-document guard for mutating canvas ops."),
			"backgroundColor": desc("create/background/resize/add-page: background color hex."),
			"color":           desc("Alias for backgroundColor."),
			"token":           desc("restore: snapshot token from op=snapshot."),
			"snapshotId":      desc("restore: alias for token."),
			"families":        desc("validate: optional font families to verify."),
			"tolerance":       desc("validate: pixel tolerance for bounds/tangency checks."),
			"checkTangencies": desc("validate: set false to skip pairwise tangency checks."),
			"presetId":        desc("preset: standard preset id."),
			"preset":          desc("Alias for presetId."),
		}, "op"),
	}, map[string]string{
		"create":      "create_canvas",
		"add-page":    "add_page",
		"go-page":     "goto_page",
		"rename-page": "rename_page",
		"delete-page": "delete_page",
		"clear":       "clear_canvas",
		"background":  "set_background",
		"preset":      "apply_artboard_preset",
		"resize":      "resize_artboard",
		"snapshot":    "create_snapshot",
		"restore":     "restore_snapshot",
		"undo":        "undo_canvas",
		"redo":        "redo_canvas",
		"status":      "client_status",
		"validate":    "validate_canvas",
	})

	m.addOpTool(legacy, &mcp.Tool{
		Name: "elements",
		Description: "Create, change or measure canvas elements. op=render (elements[]) draws a batch in one call, bottom to top; " +
			"op=modify (modifications[]) updates existing objects by objectId, id, or unique name and returns before/after snapshots plus changed fields; op=delete (objectId|id|name, omit to delete the selection) removes an object; " +
			"op=measure (elements[]) returns width/height, line count, line breaks and text vertical metrics for proposed elements WITHOUT drawing them — use it to check wrapping or fit a headline before rendering. " +
			"Elements are rect, ellipse, circle, polygon, star, line, text, image, sticker. Text without a width is measured against its real font " +
			"and auto-sized; when a later modify changes fontSize, pass width too, because the stored auto-measured width is kept and larger type will re-wrap. " +
			"Images take `fit` (fill default, or cover to crop the source to the box aspect), `focalPoint` (normalized 0..1, keeps the subject in frame) " +
			"and `crop` (explicit normalized source rectangle, wins over fit); modify accepts the same fields to re-crop an existing image, or url/src to replace its source without changing its id. " +
			"Unsupported element types and unresolved targets are reported in `skipped`/`issues`, and a batch that changes nothing fails. " +
			"includePreview=true attaches a PNG preview to render/modify.",
		InputSchema: objSchema(map[string]*jsonschema.Schema{
			"op":             desc("Operation: render, modify, delete, measure."),
			"elements":       desc("render/measure: array of element objects, or a JSON-encoded string of that array."),
			"modifications":  desc("modify: array of {objectId|id|targetName|name, ...fields}, or a JSON-encoded string. Use newName to rename a name-targeted object; url/src replaces an image source."),
			"objectId":       desc("delete: id of the object to remove. Omit to delete the current selection."),
			"id":             desc("Alias for objectId."),
			"name":           desc("delete: unique object name to remove."),
			"targetName":     desc("Alias for name."),
			"documentId":     desc("Optional active-document guard for render/modify/delete."),
			"page":           desc("Optional active-page guard: 1-based page number or page name."),
			"index":          desc("Optional active-page guard: 0-based page index."),
			"includePreview": desc("render/modify: attach a PNG preview."),
		}, "op"),
	}, map[string]string{
		"render":  "render_elements",
		"modify":  "modify_elements",
		"delete":  "delete_object",
		"measure": "measure_elements",
	})

	m.addOpTool(legacy, &mcp.Tool{
		Name: "arrange",
		Description: "Arrange the current selection. op=align (type: left, center, right, top, middle, bottom, cap-middle) lines objects up; " +
			"cap-middle is optical and centres other selected objects on the first selected text object's cap-height band (letters, not the text box). " +
			"op=distribute (direction: horizontal|vertical) evens spacing; op=group (objectIds, min 2) groups; op=ungroup (groupId) ungroups; " +
			"op=fit (padding) scales the selection to the artboard; op=select (objectIds) selects by id. " +
			"Single-selection align targets the artboard; multi-selection aligns to each other.",
		InputSchema: objSchema(map[string]*jsonschema.Schema{
			"op":        desc("Operation: align, distribute, group, ungroup, fit, select."),
			"type":      desc("align: alignment kind, including cap-middle."),
			"kind":      desc("Alias for type."),
			"alignment": desc("Alias for type."),
			"direction": desc("distribute: horizontal or vertical."),
			"objectIds": desc("group/select: array of object ids, a JSON-encoded string array, or one id."),
			"groupId":   desc("ungroup: group id."),
			"objectId":  desc("Alias for groupId."),
			"padding":   desc("fit: padding in pixels around the fitted selection."),
		}, "op"),
	}, map[string]string{
		"align":      "align_objects",
		"distribute": "distribute_objects",
		"group":      "group_objects",
		"ungroup":    "ungroup_objects",
		"fit":        "fit_to_artboard",
		"select":     "select_objects",
	})

	m.addOpTool(legacy, &mcp.Tool{
		Name: "files",
		Description: "Saved canvases. op=list returns every saved file with id, name, dimensions and last-updated time; " +
			"op=open (fileId|id|workspaceId) opens a file and makes it the active scene; op=rename (fileId, name) renames a saved file " +
			"and the open editor title when it is current.",
		InputSchema: objSchema(map[string]*jsonschema.Schema{
			"op":          desc("Operation: list, open, rename."),
			"fileId":      desc("open/rename: workspace id from `files` op=list."),
			"id":          desc("Alias for fileId."),
			"workspaceId": desc("Alias for fileId."),
			"name":        desc("rename: new file name."),
		}, "op"),
	}, map[string]string{
		"list":   "list_files",
		"open":   "open_canvas",
		"rename": "rename_file",
	})

	m.addOpTool(legacy, &mcp.Tool{
		Name: "assets",
		Description: "External assets. op=unsplash (query, page, perPage) searches photos and returns compact records plus remaining quota; " +
			"identical queries hit a two-minute cache, and placement via `elements` op=render is what fires Unsplash download tracking and stores the credit. " +
			"op=fonts lists supported Google Fonts and can verify which requested families are loaded; op=stickers lists built-in stickers.",
		InputSchema: objSchema(map[string]*jsonschema.Schema{
			"op":           desc("Operation: unsplash, fonts, stickers."),
			"query":        desc("unsplash: search keywords."),
			"page":         desc("unsplash: page number."),
			"perPage":      desc("unsplash: results per page."),
			"families":     desc("fonts: optional family names to verify (array or comma-separated string)."),
			"fontFamilies": desc("fonts: alias for families."),
			"check":        desc("fonts: alias for families."),
		}, "op"),
	}, map[string]string{
		"unsplash": "search_unsplash",
		"fonts":    "get_font_list",
		"stickers": "list_stickers",
	})

	m.addOpTool(legacy, &mcp.Tool{
		Name: "export",
		Description: "Export the canvas, one object, or a page/selection as SVG. op=png (multiplier, transparent) returns a base64 PNG of the artboard; " +
			"op=object (objectId, multiplier, format=png|svg) returns a cropped export; op=svg (objectId/objectIds or the full page, filePath?) returns editable SVG markup and optionally writes it to disk.",
		InputSchema: objSchema(map[string]*jsonschema.Schema{
			"op":          desc("Operation: png, object, svg."),
			"objectId":    desc("object/svg: id of the object or group to export."),
			"objectIds":   desc("svg: array of object/group ids to export as one cropped selection."),
			"scope":       desc("svg: page (default) or selection."),
			"format":      desc("object: png (default) or svg."),
			"multiplier":  desc("png/object: scale multiplier."),
			"transparent": desc("png: omit the artboard background."),
			"filePath":    desc("svg: optional path to write the SVG to."),
			"documentId":  desc("Optional active-document guard."),
			"page":        desc("Optional active-page guard."),
			"index":       desc("Optional 0-based active-page guard."),
		}, "op"),
	}, map[string]string{
		"png":    "export_png",
		"object": "export_object",
		"svg":    "export_svg",
	})
}
