package vector

import (
	"encoding/json"
	"math"
	"net/url"
	"strings"
	"testing"
)

func rocketIR() IR {
	return IR{
		Canvas: Canvas{Width: 256, Height: 256, Background: "#F4F0E8"},
		Layers: []Layer{{ID: "subject", Name: "Subject"}, {ID: "detail", Name: "Detail"}},
		Objects: []Object{
			{
				ID: "body", Type: "capsule", Layer: "subject",
				X: 102, Y: 52, Width: 52, Height: 116, Fill: "#E85D3F",
			},
			{
				ID: "fin-left", Type: "polygon", Layer: "subject",
				Points: []Pair{{96, 118}, {62, 154}, {96, 146}}, Fill: "#D94A36",
			},
			{
				ID: "fin-right", Type: "polygon", Layer: "subject", MirrorOf: "fin-left", Axis: "vertical", Fill: "#D94A36",
			},
			{
				ID: "window", Type: "circle", Layer: "detail",
				X: 112, Y: 78, Width: 32, Height: 32, Fill: "#9FD3E8",
				Constraints: []Constraint{{Relation: "centered_on", Target: "body", Offset: Pair{0, -18}}},
			},
			{
				ID: "flame", Type: "path", Layer: "detail",
				Start: &Pair{116, 172},
				Segments: []SegmentSpec{
					{Type: "cubic", Control1: &Pair{116, 196}, Control2: &Pair{140, 196}, To: Pair{140, 172}},
				},
				Closed: boolPtr(true), Fill: "#F4B23F",
			},
		},
	}
}

func boolPtr(v bool) *bool { return &v }

func num(v float64) *Number { n := Number(v); return &n }

func objectByID(t *testing.T, res *Result, id string) Resolved {
	t.Helper()
	for _, obj := range res.Objects {
		if obj.ID == id {
			return obj
		}
	}
	t.Fatalf("object %q not found", id)
	return Resolved{}
}

func TestDrawProducesValidVectorBoard(t *testing.T) {
	res, err := Draw(rocketIR())
	if err != nil {
		t.Fatalf("Draw() error: %v", err)
	}
	if res.Doc.V != 3 {
		t.Errorf("doc version = %d, want 3", res.Doc.V)
	}
	if res.Doc.Size.Width != 256 || res.Doc.Size.Height != 256 {
		t.Errorf("doc size = %v, want 256x256", res.Doc.Size)
	}
	if len(res.Doc.Layers) != 2 {
		t.Fatalf("layers = %d, want 2", len(res.Doc.Layers))
	}
	if got := len(res.Doc.Layers[0].Strokes) + len(res.Doc.Layers[1].Strokes); got != 5 {
		t.Errorf("strokes = %d, want 5", got)
	}
	if issues := AuditSVG(res.SVG); len(issues) > 0 {
		t.Errorf("generated SVG has issues: %v", issues)
	}
	if !strings.Contains(res.SVG, `data-avnac-vector-board="1"`) {
		t.Error("SVG is missing the vector-board marker")
	}
	if !strings.HasPrefix(res.DataURL, "data:image/svg+xml;charset=utf-8,") {
		t.Errorf("data URL prefix = %q", res.DataURL[:min(40, len(res.DataURL))])
	}
	if !strings.Contains(res.DataURL, "%3Csvg") {
		t.Error("data URL does not percent-encode the SVG")
	}
}

func TestMirrorIsExactAcrossBoardCentre(t *testing.T) {
	res, err := Draw(rocketIR())
	if err != nil {
		t.Fatalf("Draw() error: %v", err)
	}
	left := objectByID(t, res, "fin-left")
	right := objectByID(t, res, "fin-right")
	if !right.Mirrored {
		t.Fatal("fin-right was not resolved as a mirror")
	}
	const eps = 1e-6
	if math.Abs((left.Box.MinX+right.Box.MaxX)-256) > eps ||
		math.Abs((left.Box.MaxX+right.Box.MinX)-256) > eps {
		t.Errorf("mirror bounds are not symmetric: left=%+v right=%+v", left.Box, right.Box)
	}
	if math.Abs(left.Box.MinY-right.Box.MinY) > eps || math.Abs(left.Box.MaxY-right.Box.MaxY) > eps {
		t.Errorf("mirror changed the vertical placement: left=%+v right=%+v", left.Box, right.Box)
	}
	// Reflection flips winding, so the mirrored path must be reversed: its last
	// point is the reflection of the source's first point.
	last := right.Shape.Segments[len(right.Shape.Segments)-1].To
	wantLast := Point{2*128 - left.Shape.Start.X, left.Shape.Start.Y}
	if !nearlyEqualPoint(last, wantLast) {
		t.Errorf("mirrored path end = %+v, want %+v (direction not reversed)", last, wantLast)
	}
}

func TestConstraintsDeriveGeometry(t *testing.T) {
	res, err := Draw(rocketIR())
	if err != nil {
		t.Fatalf("Draw() error: %v", err)
	}
	body := objectByID(t, res, "body")
	window := objectByID(t, res, "window")
	if got, want := window.Box.Center().X, body.Box.Center().X; math.Abs(got-want) > 1e-6 {
		t.Errorf("window x = %v, want %v (centred on body)", got, want)
	}
	if got, want := window.Box.Center().Y, body.Box.Center().Y-18; math.Abs(got-want) > 1e-6 {
		t.Errorf("window y = %v, want %v (centred with offset)", got, want)
	}
}

func TestInsideAndLeftOf(t *testing.T) {
	ir := IR{
		Canvas: Canvas{Width: 400, Height: 300},
		Objects: []Object{
			{ID: "frame", Type: "rect", X: 100, Y: 60, Width: 200, Height: 120, Fill: "#111111"},
			{ID: "inner", Type: "rect", Width: 100, Height: 100, Fill: "#222222",
				Constraints: []Constraint{{Relation: "inside", Target: "frame", Gap: 10}}},
			{ID: "badge", Type: "circle", Width: 20, Height: 20, Fill: "#333333",
				Constraints: []Constraint{{Relation: "left_of", Target: "frame", Gap: 8}}},
		},
	}
	res, err := Draw(ir)
	if err != nil {
		t.Fatalf("Draw() error: %v", err)
	}
	frame := objectByID(t, res, "frame")
	inner := objectByID(t, res, "inner")
	if !frame.Box.Contains(inner.Box, 10.0001) {
		t.Errorf("inner %+v does not fit inside frame %+v", inner.Box, frame.Box)
	}
	if math.Abs(inner.Box.Width()-100) > 1e-6 || math.Abs(inner.Box.Height()-100) > 1e-6 {
		t.Errorf("inside should preserve the 1:1 aspect: %+v", inner.Box)
	}
	badge := objectByID(t, res, "badge")
	if got := frame.Box.MinX - badge.Box.MaxX; math.Abs(got-8) > 1e-6 {
		t.Errorf("left_of gap = %v, want 8", got)
	}
	if got := badge.Box.Center().Y; math.Abs(got-frame.Box.Center().Y) > 1e-6 {
		t.Errorf("left_of should centre vertically: %v vs %v", got, frame.Box.Center().Y)
	}
}

func TestPrimitiveGeometry(t *testing.T) {
	res, err := Draw(IR{
		Canvas: Canvas{Width: 200, Height: 200},
		Objects: []Object{
			{ID: "circle", Type: "circle", X: 50, Y: 50, Width: 100, Height: 100, Fill: "#000000"},
			{ID: "hex", Type: "polygon", X: 50, Y: 50, Width: 100, Height: 100, Sides: 6, Fill: "#111111"},
			{ID: "star", Type: "star", X: 20, Y: 20, Width: 60, Height: 60, Sides: 5, InnerRatio: 0.4, Fill: "#222222"},
		},
	})
	if err != nil {
		t.Fatalf("Draw() error: %v", err)
	}
	circle := objectByID(t, res, "circle")
	if got := len(circle.Shape.Anchors()); got != 4 {
		t.Errorf("circle anchors = %d, want 4", got)
	}
	if got := math.Abs(circle.Box.Width() - 100); got > 1e-6 {
		t.Errorf("circle width = %v, want 100", circle.Box.Width())
	}
	// The first cubic's handle must be kappa * r from the anchor.
	first := circle.Shape.Segments[0]
	if got, want := first.C1.Y-first.From.Y, 0.0; math.Abs(got-want) > 1e-6 {
		t.Errorf("circle top handle y offset = %v, want 0", got)
	}
	if got, want := first.C1.X-first.From.X, 50*EllipseKappa; math.Abs(got-want) > 1e-6 {
		t.Errorf("circle handle length = %v, want %v", got, want)
	}
	hex := objectByID(t, res, "hex")
	if got := len(hex.Shape.Anchors()); got != 6 {
		t.Errorf("hexagon anchors = %d, want 6", got)
	}
	star := objectByID(t, res, "star")
	if got := len(star.Shape.Anchors()); got != 10 {
		t.Errorf("5-point star anchors = %d, want 10", got)
	}
}

func TestPathAnchorsAndNodeTypes(t *testing.T) {
	ir := IR{
		Canvas: Canvas{Width: 300, Height: 300},
		Objects: []Object{{
			ID: "s", Type: "path", Stroke: "#000000", StrokeWidth: 4, Fill: "",
			Start: &Pair{40, 160},
			Segments: []SegmentSpec{
				{Type: "cubic", Control1: &Pair{70, 132}, Control2: &Pair{70, 132}, To: Pair{100, 120}},
				{Type: "cubic", Control1: &Pair{130, 108}, Control2: &Pair{130, 108}, To: Pair{160, 160}},
			},
			Closed: boolPtr(false),
		}},
	}
	res, err := Draw(ir)
	if err != nil {
		t.Fatalf("Draw() error: %v", err)
	}
	obj := objectByID(t, res, "s")
	anchors := obj.Shape.Anchors()
	if len(anchors) != 3 {
		t.Fatalf("anchors = %d, want 3", len(anchors))
	}
	// The middle anchor's in/out handles are collinear and equal, so it is
	// symmetric. This is the invariant the editor enforces while dragging.
	if anchors[1].Type != "symmetric" {
		t.Errorf("middle anchor type = %q, want symmetric", anchors[1].Type)
	}
	if anchors[0].Type != "cusp" {
		t.Errorf("start anchor type = %q, want cusp (one handle)", anchors[0].Type)
	}
}

func TestClosedPathCollapsesDuplicateAnchor(t *testing.T) {
	res, err := Draw(IR{
		Canvas: Canvas{Width: 200, Height: 200},
		Objects: []Object{{
			ID: "tri", Type: "path", Fill: "#000000", Closed: boolPtr(true),
			Start: &Pair{100, 40},
			Segments: []SegmentSpec{
				{Type: "line", To: Pair{160, 160}},
				{Type: "line", To: Pair{40, 160}},
				{Type: "line", To: Pair{100, 40}},
			},
		}},
	})
	if err != nil {
		t.Fatalf("Draw() error: %v", err)
	}
	if got := len(objectByID(t, res, "tri").Shape.Anchors()); got != 3 {
		t.Errorf("closed triangle anchors = %d, want 3", got)
	}
}

func TestOpenFilledPathDropsFillWithWarning(t *testing.T) {
	res, err := Draw(IR{
		Canvas: Canvas{Width: 100, Height: 100},
		Objects: []Object{{
			ID: "line-art", Type: "path", Fill: "#FF0000", Stroke: "#000000", StrokeWidth: 2,
			Start:    &Pair{10, 10},
			Segments: []SegmentSpec{{Type: "line", To: Pair{90, 90}}},
		}},
	})
	if err != nil {
		t.Fatalf("Draw() error: %v", err)
	}
	stroke := res.Doc.Layers[0].Strokes[0]
	if stroke.Fill != "" {
		t.Errorf("open path fill = %q, want dropped", stroke.Fill)
	}
	found := false
	for _, w := range res.Warnings {
		if strings.Contains(w, "open path") {
			found = true
		}
	}
	if !found {
		t.Errorf("warnings = %v, want an open-path warning", res.Warnings)
	}
}

func TestDrawRejectsBadInput(t *testing.T) {
	cases := []struct {
		name string
		ir   IR
		want string
	}{
		{"no canvas", IR{Objects: []Object{{ID: "a", Type: "rect", Width: 10, Height: 10, Fill: "#000"}}}, "canvas"},
		{"no objects", IR{Canvas: Canvas{Width: 10, Height: 10}}, "objects is empty"},
		{"missing id", IR{Canvas: Canvas{Width: 10, Height: 10}, Objects: []Object{{Type: "rect", Width: 10, Height: 10, Fill: "#000"}}}, "no id"},
		{"duplicate id", IR{Canvas: Canvas{Width: 10, Height: 10}, Objects: []Object{
			{ID: "a", Type: "rect", Width: 5, Height: 5, Fill: "#000"},
			{ID: "a", Type: "rect", Width: 5, Height: 5, Fill: "#000"},
		}}, "duplicate"},
		{"unknown type", IR{Canvas: Canvas{Width: 10, Height: 10}, Objects: []Object{{ID: "a", Type: "blob", Fill: "#000"}}}, "unknown type"},
		{"no paint", IR{Canvas: Canvas{Width: 10, Height: 10}, Objects: []Object{{ID: "a", Type: "rect", Width: 10, Height: 10}}}, "no paint"},
		{"missing box", IR{Canvas: Canvas{Width: 10, Height: 10}, Objects: []Object{{ID: "a", Type: "rect", Fill: "#000"}}}, "width and height"},
		{"cycle", IR{Canvas: Canvas{Width: 10, Height: 10}, Objects: []Object{
			{ID: "a", Type: "rect", Width: 5, Height: 5, Fill: "#000", Constraints: []Constraint{{Relation: "left_of", Target: "b"}}},
			{ID: "b", Type: "rect", Width: 5, Height: 5, Fill: "#000", Constraints: []Constraint{{Relation: "left_of", Target: "a"}}},
		}}, "cycle"},
		{"unknown target", IR{Canvas: Canvas{Width: 10, Height: 10}, Objects: []Object{
			{ID: "a", Type: "rect", Width: 5, Height: 5, Fill: "#000", Constraints: []Constraint{{Relation: "left_of", Target: "nope"}}},
		}}, "unknown object"},
		{"unknown mirror", IR{Canvas: Canvas{Width: 10, Height: 10}, Objects: []Object{
			{ID: "a", Type: "rect", Width: 5, Height: 5, Fill: "#000", MirrorOf: "nope"},
		}}, "mirrors unknown"},
	}
	for _, tc := range cases {
		if _, err := Draw(tc.ir); err == nil || !strings.Contains(err.Error(), tc.want) {
			t.Errorf("%s: error = %v, want it to mention %q", tc.name, err, tc.want)
		}
	}
}

func TestDocumentUsesExpectedStrokeKinds(t *testing.T) {
	ir := rocketIR()
	res, err := Draw(ir)
	if err != nil {
		t.Fatalf("Draw() error: %v", err)
	}
	kinds := map[string]string{}
	for _, layer := range res.Doc.Layers {
		for _, s := range layer.Strokes {
			kinds[s.ID] = s.Kind
		}
	}
	want := map[string]string{
		"body":      "pen",
		"fin-left":  "polygon",
		"fin-right": "polygon",
		"window":    "ellipse",
		"flame":     "pen",
	}
	for id, kind := range want {
		if kinds[id] != kind {
			t.Errorf("%s kind = %q, want %q", id, kinds[id], kind)
		}
	}
}

func TestDeterministicOutput(t *testing.T) {
	first, err := Draw(rocketIR())
	if err != nil {
		t.Fatal(err)
	}
	second, err := Draw(rocketIR())
	if err != nil {
		t.Fatal(err)
	}
	if first.SVG != second.SVG {
		t.Error("two Draw calls produced different SVG")
	}
}

func TestIRDecodesStringifiedNumbers(t *testing.T) {
	raw := `{
		"canvas": {"width": "256", "height": 256},
		"objects": [
			{"id": "a", "type": "rect", "x": "10", "y": 10, "width": "20", "height": 20, "fill": "#000000"}
		]
	}`
	var ir IR
	if err := json.Unmarshal([]byte(raw), &ir); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if ir.Canvas.Width.Float() != 256 || ir.Objects[0].Width.Float() != 20 {
		t.Errorf("stringified numbers did not decode: %+v", ir)
	}
	if _, err := Draw(ir); err != nil {
		t.Errorf("Draw() on decoded IR: %v", err)
	}
}

func TestUpdateOperations(t *testing.T) {
	board, err := NewBoard("b1", "Rocket", rocketIR())
	if err != nil {
		t.Fatal(err)
	}
	before := board.Result.Objects
	finBefore := objectByID(t, board.Result, "fin-left")

	err = board.Apply([]Operation{
		{Op: "resize", Target: "fin-left", Width: num(28), Height: num(32)},
		{Op: "mirror", Target: "fin-right", Of: "fin-left"},
		{Op: "move", Target: "window", By: &Pair{0, -2}},
		{Op: "restyle", Target: "body", Fill: stringPtr("#EF6B4A")},
	})
	if err != nil {
		t.Fatalf("Apply() error: %v", err)
	}
	finAfter := objectByID(t, board.Result, "fin-left")
	if finAfter.Box.Width() != 28 || finAfter.Box.Height() != 32 {
		t.Errorf("resize = %vx%v, want 28x32", finAfter.Box.Width(), finAfter.Box.Height())
	}
	if math.Abs(finAfter.Box.Center().X-finBefore.Box.Center().X) > 1e-6 {
		t.Errorf("resize moved the centre: %v -> %v", finBefore.Box.Center().X, finAfter.Box.Center().X)
	}
	rightAfter := objectByID(t, board.Result, "fin-right")
	if math.Abs((finAfter.Box.MinX+rightAfter.Box.MaxX)-256) > 1e-6 {
		t.Error("mirror after resize did not track the new size")
	}
	if len(before) != len(board.Result.Objects) {
		t.Error("update changed the object count")
	}
	if got := board.Result.Doc.Layers[0].Strokes[0].Fill; got != "#EF6B4A" {
		t.Errorf("restyle fill = %q", got)
	}
}

func TestUpdateFailureLeavesBoardUntouched(t *testing.T) {
	board, err := NewBoard("b1", "Rocket", rocketIR())
	if err != nil {
		t.Fatal(err)
	}
	svgBefore := board.Result.SVG
	err = board.Apply([]Operation{{Op: "delete", Target: "nope"}})
	if err == nil {
		t.Fatal("Apply() with an unknown target succeeded")
	}
	if board.Result.SVG != svgBefore {
		t.Error("a failed operation changed the board")
	}
}

func TestReorderAndAddAndDelete(t *testing.T) {
	board, err := NewBoard("b1", "Rocket", rocketIR())
	if err != nil {
		t.Fatal(err)
	}
	if err := board.Apply([]Operation{{Op: "reorder", Target: "flame", Index: intPtr(0)}}); err != nil {
		t.Fatalf("reorder: %v", err)
	}
	if board.IR.Objects[0].ID != "flame" {
		t.Errorf("first object = %q, want flame", board.IR.Objects[0].ID)
	}
	if err := board.Apply([]Operation{{Op: "delete", Target: "flame"}}); err != nil {
		t.Fatalf("delete: %v", err)
	}
	for _, obj := range board.IR.Objects {
		if obj.ID == "flame" {
			t.Fatal("flame was not deleted")
		}
	}
	if err := board.Apply([]Operation{{Op: "add", Object: &Object{ID: "spark", Type: "circle", X: 20, Y: 20, Width: 8, Height: 8, Fill: "#FFFFFF"}}}); err != nil {
		t.Fatalf("add: %v", err)
	}
	objectByID(t, board.Result, "spark")
}

func TestAuditCatchesBadSVG(t *testing.T) {
	bad := []string{
		`<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10"><path d="M0 0 L1 1" fill="#000"/></svg>`,
		`<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 20 20" data-avnac-vector-board="1"><path d="M0 0 L1 1 Z" fill="none"/></svg>`,
		`<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10" data-avnac-vector-board="1"><path d="MNaN 0 L1 1 Z" fill="none"/></svg>`,
		`<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10" data-avnac-vector-board="1"><path d="M0 0 L1 1 Z"/></svg>`,
	}
	for i, svg := range bad {
		if issues := AuditSVG(svg); len(issues) == 0 {
			t.Errorf("bad SVG %d passed the audit", i)
		}
	}
}

func TestRenderSVGRoundTrip(t *testing.T) {
	res, err := Draw(rocketIR())
	if err != nil {
		t.Fatal(err)
	}
	// Every stroke in the document must produce exactly one path element.
	paths := strings.Count(res.SVG, "<path ")
	strokes := 0
	for _, layer := range res.Doc.Layers {
		strokes += len(layer.Strokes)
	}
	if paths != strokes {
		t.Errorf("path elements = %d, want %d", paths, strokes)
	}
}

func stringPtr(s string) *string { return &s }

func intPtr(v int) *int { return &v }

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func TestDocumentJSONHasDistinctAnchorFields(t *testing.T) {
	res, err := Draw(rocketIR())
	if err != nil {
		t.Fatal(err)
	}
	encoded, err := json.Marshal(res.Doc)
	if err != nil {
		t.Fatal(err)
	}
	var decoded struct {
		Layers []struct {
			Strokes []struct {
				PenAnchors []map[string]any `json:"penAnchors"`
			} `json:"strokes"`
		} `json:"layers"`
	}
	if err := json.Unmarshal(encoded, &decoded); err != nil {
		t.Fatal(err)
	}
	anchors := 0
	for _, layer := range decoded.Layers {
		for _, stroke := range layer.Strokes {
			for _, anchor := range stroke.PenAnchors {
				anchors++
				for _, field := range []string{"x", "y", "type"} {
					if _, ok := anchor[field]; !ok {
						t.Errorf("v3 anchor is missing %q: %v", field, anchor)
					}
				}
				if _, ok := anchor["outX"]; ok {
					if _, ok := anchor["outY"]; !ok {
						t.Errorf("v3 anchor has outX without outY: %v", anchor)
					}
				}
			}
		}
	}
	if anchors == 0 {
		t.Fatal("no pen anchors in the document")
	}
}
func TestMirrorCannotCarryConstraints(t *testing.T) {
	_, err := Draw(IR{
		Canvas: Canvas{Width: 100, Height: 100},
		Objects: []Object{
			{ID: "a", Type: "circle", X: 10, Y: 10, Width: 10, Height: 10, Fill: "#000000"},
			{ID: "b", Type: "circle", MirrorOf: "a", Fill: "#000000",
				Constraints: []Constraint{{Relation: "centered_on", Target: "a"}}},
		},
	})
	if err == nil || !strings.Contains(err.Error(), "mirror and cannot also have constraints") {
		t.Errorf("error = %v, want a mirror/constraint conflict", err)
	}
}
func TestSVGDataURLRoundTrips(t *testing.T) {
	res, err := Draw(rocketIR())
	if err != nil {
		t.Fatal(err)
	}
	const prefix = "data:image/svg+xml;charset=utf-8,"
	if !strings.HasPrefix(res.DataURL, prefix) {
		t.Fatalf("data URL prefix = %q", res.DataURL)
	}
	decoded, err := url.PathUnescape(strings.TrimPrefix(res.DataURL, prefix))
	if err != nil {
		t.Fatalf("data URL is not valid percent-encoding: %v", err)
	}
	if decoded != res.SVG {
		t.Error("decoding the data URL did not reproduce the SVG")
	}
}

// The draw example in skill://vector is documentation an agent copies. Keep it
// executable so a schema change cannot leave a dead example behind.
func TestSkillExampleDraws(t *testing.T) {
	const example = `{
	  "canvas": { "width": 256, "height": 256, "background": "#F4F0E8" },
	  "objects": [
	    { "id": "body", "type": "capsule", "x": 102, "y": 52, "width": 52, "height": 116,
	      "fill": "#E85D3F" },
	    { "id": "fin-left", "type": "polygon", "x": 62, "y": 118, "width": 34, "height": 36,
	      "points": [[96, 118], [62, 154], [96, 146]], "fill": "#D94A36" },
	    { "id": "fin-right", "type": "polygon", "mirrorOf": "fin-left", "axis": "vertical",
	      "fill": "#D94A36" },
	    { "id": "window", "type": "circle", "x": 112, "y": 78, "width": 32, "height": 32,
	      "fill": "#9FD3E8",
	      "constraints": [{ "relation": "centered_on", "target": "body", "offset": [0, -18] }] },
	    { "id": "flame", "type": "path", "start": [116, 172],
	      "segments": [
	        { "type": "cubic", "control1": [120, 196], "control2": [136, 196], "to": [140, 172] } ],
	      "closed": true, "fill": "#F4B23F" }
	  ]
	}`
	var ir IR
	if err := json.Unmarshal([]byte(example), &ir); err != nil {
		t.Fatalf("skill example does not decode: %v", err)
	}
	res, err := Draw(ir)
	if err != nil {
		t.Fatalf("skill example does not draw: %v", err)
	}
	if len(res.Objects) != 5 {
		t.Errorf("objects = %d, want 5", len(res.Objects))
	}
	if issues := AuditSVG(res.SVG); len(issues) > 0 {
		t.Errorf("skill example SVG failed audit: %v", issues)
	}
}
