package vector

import (
	"fmt"
	"strings"
)

// DocumentVersion is the v3 vector-board schema version this package emits.
const DocumentVersion = 3

// Document is the frontend's VectorBoardDocument shape. The field names and
// defaults intentionally match frontend/src/lib/avnac-vector/types.ts so a
// board produced here can be opened, edited and re-exported by the editor.
type Document struct {
	V             int        `json:"v"`
	Size          DocSize    `json:"size"`
	Layers        []DocLayer `json:"layers"`
	ActiveLayerID string     `json:"activeLayerId"`
}

// DocSize is the board size in document units.
type DocSize struct {
	Width  float64 `json:"width"`
	Height float64 `json:"height"`
}

// DocLayer is one layer of strokes.
type DocLayer struct {
	ID      string      `json:"id"`
	Name    string      `json:"name"`
	Visible bool        `json:"visible"`
	Strokes []DocStroke `json:"strokes"`
}

// DocStroke is one drawable stroke.
type DocStroke struct {
	ID          string       `json:"id"`
	Kind        string       `json:"kind"`
	Points      [][2]float64 `json:"points"`
	PenAnchors  []DocAnchor  `json:"penAnchors,omitempty"`
	PenClosed   *bool        `json:"penClosed,omitempty"`
	Stroke      string       `json:"stroke"`
	StrokeWidth float64      `json:"strokeWidth"`
	StrokeOp    float64      `json:"strokeOpacity"`
	Fill        string       `json:"fill"`
	FillOpacity float64      `json:"fillOpacity"`
	FillRule    string       `json:"fillRule"`
	LineCap     string       `json:"lineCap"`
	LineJoin    string       `json:"lineJoin"`
}

// DocAnchor is one on-curve node with absolute handles.
type DocAnchor struct {
	X    float64  `json:"x"`
	Y    float64  `json:"y"`
	InX  *float64 `json:"inX,omitempty"`
	InY  *float64 `json:"inY,omitempty"`
	OutX *float64 `json:"outX,omitempty"`
	OutY *float64 `json:"outY,omitempty"`
	Type string   `json:"type"`
}

// paint is the resolved paint for one object.
type paint struct {
	fill          string
	fillRule      string
	fillOpacity   float64
	stroke        string
	strokeWidth   float64
	strokeOpacity float64
	lineCap       string
	lineJoin      string
}

func paintFor(obj Object, shape Path) (paint, error) {
	p := paint{
		fill:          cleanPaint(obj.Fill),
		stroke:        cleanPaint(obj.Stroke),
		fillRule:      strings.ToLower(strings.TrimSpace(obj.FillRule)),
		fillOpacity:   1,
		strokeOpacity: 1,
		strokeWidth:   obj.StrokeWidth.Float(),
		lineCap:       strings.ToLower(strings.TrimSpace(obj.LineCap)),
		lineJoin:      strings.ToLower(strings.TrimSpace(obj.LineJoin)),
	}
	if obj.FillOpacity != nil {
		p.fillOpacity = obj.FillOpacity.Float()
	}
	if obj.StrokeOpacity != nil {
		p.strokeOpacity = obj.StrokeOpacity.Float()
	}
	if p.fillRule == "" {
		p.fillRule = "nonzero"
	}
	if p.fillRule != "nonzero" && p.fillRule != "evenodd" {
		return p, fmt.Errorf("vector: object %q fillRule %q must be nonzero or evenodd", obj.ID, obj.FillRule)
	}
	if p.lineCap == "" {
		p.lineCap = "round"
	}
	if p.lineJoin == "" {
		p.lineJoin = "round"
	}
	if p.lineCap != "butt" && p.lineCap != "round" && p.lineCap != "square" {
		return p, fmt.Errorf("vector: object %q lineCap %q must be butt, round or square", obj.ID, obj.LineCap)
	}
	if p.lineJoin != "miter" && p.lineJoin != "round" && p.lineJoin != "bevel" {
		return p, fmt.Errorf("vector: object %q lineJoin %q must be miter, round or bevel", obj.ID, obj.LineJoin)
	}
	if p.fillOpacity < 0 || p.fillOpacity > 1 {
		return p, fmt.Errorf("vector: object %q fillOpacity must be 0..1", obj.ID)
	}
	if p.strokeOpacity < 0 || p.strokeOpacity > 1 {
		return p, fmt.Errorf("vector: object %q strokeOpacity must be 0..1", obj.ID)
	}
	if p.stroke != "" && p.strokeWidth < 0 {
		return p, fmt.Errorf("vector: object %q strokeWidth cannot be negative", obj.ID)
	}
	// A stroke without width paints nothing; treat it as no stroke instead of
	// silently emitting stroke-width="0".
	if p.stroke != "" && p.strokeWidth == 0 {
		p.stroke = ""
	}
	// An open path with a fill closes implicitly with a straight chord, which
	// is the most common vector artifact. Refuse the fill; the resolver records
	// a warning so the model can fix the drawing.
	if p.fill != "" && !shape.Closed {
		p.fill = ""
	}
	if p.fill == "" && p.stroke == "" {
		return p, fmt.Errorf("vector: object %q has no paint: set fill or stroke", obj.ID)
	}
	return p, nil
}

func cleanPaint(v string) string {
	v = strings.TrimSpace(v)
	switch strings.ToLower(v) {
	case "", "none", "transparent":
		return ""
	}
	return v
}

// strokeFor converts one resolved object into a v3 stroke. Rotation forces the
// pen representation because the v3 rect/ellipse kinds are axis-aligned.
func strokeFor(res *Resolved, obj Object, p paint) DocStroke {
	shape := res.Shape
	rotated := obj.Rotation.Float() != 0
	stroke := DocStroke{
		ID:          res.ID,
		Stroke:      p.stroke,
		StrokeWidth: round2(p.strokeWidth),
		StrokeOp:    p.strokeOpacity,
		Fill:        p.fill,
		FillOpacity: p.fillOpacity,
		FillRule:    p.fillRule,
		LineCap:     p.lineCap,
		LineJoin:    p.lineJoin,
		Points:      [][2]float64{},
	}

	box := res.Box
	switch {
	case obj.Type == "rect" && !rotated && obj.CornerRadius.Float() <= 0:
		stroke.Kind = "rect"
		stroke.Points = [][2]float64{{round2(box.MinX), round2(box.MinY)}, {round2(box.MaxX), round2(box.MaxY)}}
	case (obj.Type == "ellipse" || obj.Type == "circle") && !rotated:
		stroke.Kind = "ellipse"
		if obj.Type == "circle" {
			d := minFloat(box.Width(), box.Height())
			cx, cy := box.Center().X, box.Center().Y
			box = Box{cx - d/2, cy - d/2, cx + d/2, cy + d/2}
		}
		stroke.Points = [][2]float64{{round2(box.MinX), round2(box.MinY)}, {round2(box.MaxX), round2(box.MaxY)}}
	case (obj.Type == "polygon" || obj.Type == "star") && !rotated && !hasCurves(shape):
		stroke.Kind = "polygon"
		anchors := shape.Anchors()
		stroke.Points = make([][2]float64, 0, len(anchors))
		for _, a := range anchors {
			stroke.Points = append(stroke.Points, [2]float64{round2(a.X), round2(a.Y)})
		}
	case obj.Type == "line" && !rotated && len(shape.Segments) == 1:
		stroke.Kind = "line"
		stroke.Points = [][2]float64{
			{round2(shape.Start.X), round2(shape.Start.Y)},
			{round2(shape.Segments[0].To.X), round2(shape.Segments[0].To.Y)},
		}
	default:
		stroke.Kind = "pen"
	}

	if stroke.Kind == "pen" {
		closed := shape.Closed
		stroke.PenClosed = &closed
		stroke.PenAnchors = make([]DocAnchor, 0, len(shape.Segments)+1)
		for _, a := range shape.Anchors() {
			stroke.PenAnchors = append(stroke.PenAnchors, DocAnchor{
				X: round2(a.X), Y: round2(a.Y),
				InX: roundPtr(a.InX), InY: roundPtr(a.InY),
				OutX: roundPtr(a.OutX), OutY: roundPtr(a.OutY),
				Type: a.Type,
			})
		}
	}
	return stroke
}

func hasCurves(p Path) bool {
	for _, s := range p.Segments {
		if s.Cubic {
			return true
		}
	}
	return false
}

func roundPtr(v *float64) *float64 {
	if v == nil {
		return nil
	}
	r := round2(*v)
	return &r
}

func round2(v float64) float64 {
	return float64(int64(v*100+sign(v)*0.5)) / 100
}

func sign(v float64) float64 {
	if v < 0 {
		return -1
	}
	return 1
}

func minFloat(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}

// strokePath reconstructs a renderable path from a v3 stroke. It mirrors the
// editor's buildStrokePath so an exported board and the on-canvas preview cannot
// disagree.
func strokePath(s DocStroke) Path {
	switch s.Kind {
	case "rect":
		if len(s.Points) < 2 {
			return Path{}
		}
		a, b := s.Points[0], s.Points[1]
		return polylinePath([]Pair{{a[0], a[1]}, {b[0], a[1]}, {b[0], b[1]}, {a[0], b[1]}}, true)
	case "ellipse":
		if len(s.Points) < 2 {
			return Path{}
		}
		a, b := s.Points[0], s.Points[1]
		minX, maxX := minFloat(a[0], b[0]), maxFloat(a[0], b[0])
		minY, maxY := minFloat(a[1], b[1]), maxFloat(a[1], b[1])
		return ellipsePath((minX+maxX)/2, (minY+maxY)/2, (maxX-minX)/2, (maxY-minY)/2)
	case "polygon":
		points := make([]Pair, 0, len(s.Points))
		for _, p := range s.Points {
			points = append(points, Pair{p[0], p[1]})
		}
		return polylinePath(points, true)
	case "line":
		if len(s.Points) < 2 {
			return Path{}
		}
		a, b := s.Points[0], s.Points[1]
		return Path{Start: Point{a[0], a[1]}, Segments: []Segment{{From: Point{a[0], a[1]}, To: Point{b[0], b[1]}}}}
	default:
		closed := s.PenClosed != nil && *s.PenClosed
		if len(s.PenAnchors) >= 2 {
			return anchorsToPath(s.PenAnchors, closed)
		}
		points := make([]Pair, 0, len(s.Points))
		for _, p := range s.Points {
			points = append(points, Pair{p[0], p[1]})
		}
		return polylinePath(points, closed)
	}
}

func anchorsToPath(anchors []DocAnchor, closed bool) Path {
	toAnchor := func(a DocAnchor) Anchor {
		return Anchor{X: a.X, Y: a.Y, InX: a.InX, InY: a.InY, OutX: a.OutX, OutY: a.OutY}
	}
	out := Path{Start: Point{anchors[0].X, anchors[0].Y}, Closed: closed}
	count := len(anchors) - 1
	if closed {
		count = len(anchors)
	}
	for i := 0; i < count; i++ {
		a := toAnchor(anchors[i])
		b := toAnchor(anchors[(i+1)%len(anchors)])
		seg := Segment{From: Point{a.X, a.Y}, To: Point{b.X, b.Y}}
		if a.OutX != nil || b.InX != nil {
			seg.Cubic = true
			if a.OutX != nil {
				seg.C1 = Point{*a.OutX, *a.OutY}
			} else {
				seg.C1 = seg.From
			}
			if b.InX != nil {
				seg.C2 = Point{*b.InX, *b.InY}
			} else {
				seg.C2 = seg.To
			}
		}
		out.Segments = append(out.Segments, seg)
	}
	return out
}

func maxFloat(a, b float64) float64 {
	if a > b {
		return a
	}
	return b
}
