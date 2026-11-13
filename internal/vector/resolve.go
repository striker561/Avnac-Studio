package vector

import (
	"fmt"
	"math"
	"sort"
	"strings"
)

// Resolved is one object after constraints and mirroring: its final box, its
// cubic geometry and the paint that will be emitted.
type Resolved struct {
	ID       string
	Type     string
	Layer    string
	Box      Box
	Shape    Path
	Mirrored bool
	Paint    paint
}

// Result is everything Draw produces.
type Result struct {
	IR       IR
	Doc      *Document
	SVG      string
	DataURL  string
	Objects  []Resolved
	Bounds   Box
	Warnings []string
}

// MaxCanvasUnits bounds a board edge. Larger requests are almost always a unit
// mistake (px vs mm) and would be slow to render.
const MaxCanvasUnits = 20000

// Draw resolves an IR into geometry, a v3 document and SVG. It is pure: no
// frontend, no filesystem, no clock.
func Draw(ir IR) (*Result, error) {
	if err := normalizeIR(&ir); err != nil {
		return nil, err
	}
	resolved, warnings, err := resolveObjects(ir)
	if err != nil {
		return nil, err
	}
	doc, bounds, docWarnings, err := buildDocument(ir, resolved)
	if err != nil {
		return nil, err
	}
	warnings = append(warnings, docWarnings...)
	svg := RenderSVG(doc, ir.Canvas.Background)
	if issues := AuditSVG(svg); len(issues) > 0 {
		return nil, fmt.Errorf("vector: generated SVG failed validation: %s", strings.Join(issues, "; "))
	}
	return &Result{
		IR:       ir,
		Doc:      doc,
		SVG:      svg,
		DataURL:  SVGDataURL(svg),
		Objects:  resolved,
		Bounds:   bounds,
		Warnings: dedupeWarnings(warnings),
	}, nil
}

// normalizeIR validates the frame and fills defaults.
func normalizeIR(ir *IR) error {
	if ir.Canvas.Width.Float() <= 0 || ir.Canvas.Height.Float() <= 0 {
		return fmt.Errorf("vector: canvas.width and canvas.height are required and must be positive")
	}
	if ir.Canvas.Width.Float() > MaxCanvasUnits || ir.Canvas.Height.Float() > MaxCanvasUnits {
		return fmt.Errorf("vector: canvas exceeds %d units on an edge", MaxCanvasUnits)
	}
	if len(ir.Objects) == 0 {
		return fmt.Errorf("vector: objects is empty; nothing to draw")
	}
	if len(ir.Objects) > 500 {
		return fmt.Errorf("vector: %d objects is over the 500-object limit; split the drawing", len(ir.Objects))
	}
	seen := make(map[string]bool, len(ir.Objects))
	for i := range ir.Objects {
		obj := &ir.Objects[i]
		obj.ID = strings.TrimSpace(obj.ID)
		if obj.ID == "" {
			return fmt.Errorf("vector: objects[%d] has no id; every object needs a stable id", i)
		}
		if seen[obj.ID] {
			return fmt.Errorf("vector: duplicate object id %q", obj.ID)
		}
		seen[obj.ID] = true
		obj.Type = strings.ToLower(strings.TrimSpace(obj.Type))
		if obj.Layer == "" && len(ir.Layers) > 0 {
			obj.Layer = ir.Layers[0].ID
		}
		if obj.Layer == "" {
			obj.Layer = "layer-1"
		}
		// A mirror takes its geometry from the source, so it needs no box.
		if obj.MirrorOf == "" && (obj.Type == "rect" || obj.Type == "ellipse" || obj.Type == "circle" || obj.Type == "capsule") {
			if obj.Width.Float() <= 0 || obj.Height.Float() <= 0 {
				return fmt.Errorf("vector: %s %q needs positive width and height", obj.Type, obj.ID)
			}
		}
	}
	layerIDs := make(map[string]bool, len(ir.Layers))
	for i := range ir.Layers {
		ir.Layers[i].ID = strings.TrimSpace(ir.Layers[i].ID)
		if ir.Layers[i].ID == "" {
			return fmt.Errorf("vector: layers[%d] has no id", i)
		}
		if layerIDs[ir.Layers[i].ID] {
			return fmt.Errorf("vector: duplicate layer id %q", ir.Layers[i].ID)
		}
		layerIDs[ir.Layers[i].ID] = true
		if ir.Layers[i].Name == "" {
			ir.Layers[i].Name = titleCase(ir.Layers[i].ID)
		}
	}
	return nil
}

// resolveObjects resolves constraints and mirrors in dependency order. Each
// pass resolves every object whose dependencies are already resolved; a pass
// that makes no progress means a cycle or a missing target.
func resolveObjects(ir IR) ([]Resolved, []string, error) {
	byID := make(map[string]Object, len(ir.Objects))
	for _, obj := range ir.Objects {
		byID[obj.ID] = obj
	}
	for _, obj := range ir.Objects {
		if obj.MirrorOf != "" {
			if _, ok := byID[obj.MirrorOf]; !ok {
				return nil, nil, fmt.Errorf("vector: %q mirrors unknown object %q", obj.ID, obj.MirrorOf)
			}
			if len(obj.Constraints) > 0 {
				// A mirrored object has no geometry of its own, so constraints on
				// it would be silently ignored. Put them on the source instead.
				return nil, nil, fmt.Errorf("vector: %q is a mirror and cannot also have constraints; constrain %q", obj.ID, obj.MirrorOf)
			}
		}
		for _, c := range obj.Constraints {
			target := strings.TrimSpace(c.Target)
			if target == "" {
				return nil, nil, fmt.Errorf("vector: %q has a constraint with no target", obj.ID)
			}
			if target != "canvas" {
				if _, ok := byID[target]; !ok {
					return nil, nil, fmt.Errorf("vector: %q constrains to unknown object %q", obj.ID, target)
				}
			}
		}
	}

	canvasBox := Box{0, 0, ir.Canvas.Width.Float(), ir.Canvas.Height.Float()}
	resolved := make(map[string]*Resolved, len(byID))
	var warnings []string
	for len(resolved) < len(byID) {
		progressed := false
		for _, obj := range ir.Objects {
			if _, done := resolved[obj.ID]; done {
				continue
			}
			ready := true
			for _, c := range obj.Constraints {
				if c.Target == "canvas" {
					continue
				}
				if _, ok := resolved[c.Target]; !ok {
					ready = false
					break
				}
			}
			if !ready {
				continue
			}

			var shape Path
			var box Box
			mirrored := false
			if obj.MirrorOf != "" {
				src, ok := resolved[obj.MirrorOf]
				if !ok {
					continue
				}
				axis, value, err := mirrorAxis(ir, obj)
				if err != nil {
					return nil, nil, err
				}
				shape = reflectPath(src.Shape, axis, value)
				box = shape.Bounds()
				mirrored = true
				// A mirrored object's own box is derived; explicit coordinates
				// are ignored because they would fight the reflection.
			} else {
				built, err := shapeForObject(obj)
				if err != nil {
					return nil, nil, err
				}
				shape = built
				box = objectBox(obj, shape)
				for _, c := range obj.Constraints {
					target := canvasBox
					if c.Target != "canvas" {
						target = resolved[c.Target].Box
					}
					nextBox, nextShape, err := applyConstraint(obj, box, shape, c, target)
					if err != nil {
						return nil, nil, err
					}
					box, shape = nextBox, nextShape
				}
			}

			p, err := paintFor(obj, shape)
			if err != nil {
				return nil, nil, err
			}
			if obj.Fill != "" && p.fill == "" && !shape.Closed {
				if len(p.stroke) == 0 {
					return nil, nil, fmt.Errorf("vector: %q is an open path with no fill and no stroke", obj.ID)
				}
				warnings = append(warnings, fmt.Sprintf("%s: open path, fill ignored (close the path to fill it)", obj.ID))
			}
			if cleanPaint(obj.Stroke) != "" && obj.StrokeWidth.Float() == 0 {
				warnings = append(warnings, fmt.Sprintf("%s: stroke colour set with strokeWidth 0, stroke ignored", obj.ID))
			}
			if box.Empty() {
				return nil, nil, fmt.Errorf("vector: %q resolved to an empty shape", obj.ID)
			}
			if shape.Bounds().Width() > ir.Canvas.Width.Float()*2 || shape.Bounds().Height() > ir.Canvas.Height.Float()*2 {
				warnings = append(warnings, fmt.Sprintf("%s: geometry is more than twice the board; check units and size", obj.ID))
			}
			if !canvasBox.Contains(box, math.Max(ir.Canvas.Width.Float(), ir.Canvas.Height.Float())*0.1) {
				warnings = append(warnings, fmt.Sprintf("%s: lies mostly outside the board", obj.ID))
			}
			if anchors := len(shape.Segments); anchors > 80 {
				warnings = append(warnings, fmt.Sprintf("%s: %d segments; simplify before shipping", obj.ID, anchors))
			}

			resolved[obj.ID] = &Resolved{
				ID: obj.ID, Type: obj.Type, Layer: obj.Layer,
				Box: box, Shape: shape, Mirrored: mirrored, Paint: p,
			}
			progressed = true
		}
		if !progressed {
			var stuck []string
			for _, obj := range ir.Objects {
				if _, done := resolved[obj.ID]; !done {
					stuck = append(stuck, obj.ID)
				}
			}
			sort.Strings(stuck)
			return nil, nil, fmt.Errorf("vector: cannot resolve %s; constraints or mirrors form a cycle", strings.Join(stuck, ", "))
		}
	}

	out := make([]Resolved, 0, len(ir.Objects))
	for _, obj := range ir.Objects {
		out = append(out, *resolved[obj.ID])
	}
	return out, warnings, nil
}

// mirrorAxis returns the reflection axis and its coordinate. The default is the
// board centre, which is what "mirror the left fin" means in practice.
func mirrorAxis(ir IR, obj Object) (string, float64, error) {
	axis := strings.ToLower(strings.TrimSpace(obj.Axis))
	if axis == "" {
		axis = "vertical"
	}
	if axis != "vertical" && axis != "horizontal" {
		return "", 0, fmt.Errorf("vector: %q axis %q must be vertical or horizontal", obj.ID, obj.Axis)
	}
	value := 0.0
	if obj.AxisValue != nil {
		value = obj.AxisValue.Float()
	} else if axis == "vertical" {
		value = ir.Canvas.Width.Float() / 2
	} else {
		value = ir.Canvas.Height.Float() / 2
	}
	return axis, value, nil
}

// reflectPath mirrors geometry across an axis and reverses its direction so the
// winding is preserved. Without the reversal a reflected outer contour becomes
// clockwise and cancels itself under a non-zero fill.
func reflectPath(src Path, axis string, value float64) Path {
	out := clonePath(src)
	f := func(p Point) Point {
		if axis == "vertical" {
			return Point{X: 2*value - p.X, Y: p.Y}
		}
		return Point{X: p.X, Y: 2*value - p.Y}
	}
	out.Start = f(out.Start)
	for i := range out.Segments {
		s := &out.Segments[i]
		s.From = f(s.From)
		s.C1 = f(s.C1)
		s.C2 = f(s.C2)
		s.To = f(s.To)
	}
	return out.Reversed()
}

// applyConstraint moves or resizes a shape from one relation.
func applyConstraint(obj Object, box Box, shape Path, c Constraint, target Box) (Box, Path, error) {
	relation := strings.ToLower(strings.TrimSpace(c.Relation))
	gap := c.Gap.Float()
	offset := Point{c.Offset[0], c.Offset[1]}

	move := func(dx, dy float64) (Box, Path, error) {
		return box.Translate(dx, dy), shape.Translate(dx, dy), nil
	}
	center := box.Center()
	targetCenter := target.Center()

	switch relation {
	case "centered_on", "centre_on", "center_on":
		return move(targetCenter.X+offset.X-center.X, targetCenter.Y+offset.Y-center.Y)
	case "left_of":
		return move(target.MinX-gap-box.MaxX+offset.X, targetCenter.Y+offset.Y-center.Y)
	case "right_of":
		return move(target.MaxX+gap-box.MinX+offset.X, targetCenter.Y+offset.Y-center.Y)
	case "above":
		return move(targetCenter.X+offset.X-center.X, target.MinY-gap-box.MaxY+offset.Y)
	case "below":
		return move(targetCenter.X+offset.X-center.X, target.MaxY+gap-box.MinY+offset.Y)
	case "aligned_with", "aligned":
		axis := strings.ToLower(strings.TrimSpace(c.Axis))
		if axis == "y" {
			return move(offset.X, targetCenter.Y+offset.Y-center.Y)
		}
		return move(targetCenter.X+offset.X-center.X, offset.Y)
	case "inside":
		w, h := box.Width(), box.Height()
		if w <= 0 || h <= 0 {
			return box, shape, fmt.Errorf("vector: %q cannot fit inside %q with zero size", obj.ID, c.Target)
		}
		sx := (target.Width() - 2*gap) / w
		sy := (target.Height() - 2*gap) / h
		s := math.Min(sx, sy)
		if s <= 0 {
			return box, shape, fmt.Errorf("vector: %q is larger than %q minus padding", obj.ID, c.Target)
		}
		scaled := shape.Scale(center, s, s)
		newBox := scaled.Bounds()
		newCenter := newBox.Center()
		dx := targetCenter.X + offset.X - newCenter.X
		dy := targetCenter.Y + offset.Y - newCenter.Y
		return newBox.Translate(dx, dy), scaled.Translate(dx, dy), nil
	case "equal_size":
		w, h := box.Width(), box.Height()
		if w <= 0 || h <= 0 {
			return box, shape, fmt.Errorf("vector: %q cannot copy the size of %q with zero size", obj.ID, c.Target)
		}
		scaled := shape.Scale(center, target.Width()/w, target.Height()/h)
		newBox := scaled.Bounds()
		newCenter := newBox.Center()
		dx := center.X + offset.X - newCenter.X
		dy := center.Y + offset.Y - newCenter.Y
		return newBox.Translate(dx, dy), scaled.Translate(dx, dy), nil
	default:
		return box, shape, fmt.Errorf("vector: %q has unknown relation %q (want centered_on, left_of, right_of, above, below, inside, aligned_with, equal_size)", obj.ID, c.Relation)
	}
}

// buildDocument groups resolved objects into layers and strokes, in scene order.
func buildDocument(ir IR, objects []Resolved) (*Document, Box, []string, error) {
	doc := &Document{V: DocumentVersion, Size: DocSize{Width: round2(ir.Canvas.Width.Float()), Height: round2(ir.Canvas.Height.Float())}}
	layerIndex := make(map[string]int, len(ir.Layers)+1)
	for _, l := range ir.Layers {
		layerIndex[l.ID] = len(doc.Layers)
		doc.Layers = append(doc.Layers, DocLayer{ID: l.ID, Name: l.Name, Visible: true, Strokes: []DocStroke{}})
	}
	if len(doc.Layers) == 0 {
		layerIndex["layer-1"] = 0
		doc.Layers = append(doc.Layers, DocLayer{ID: "layer-1", Name: "Layer 1", Visible: true, Strokes: []DocStroke{}})
	}

	var warnings []string
	bounds := Box{MinX: math.Inf(1), MinY: math.Inf(1), MaxX: math.Inf(-1), MaxY: math.Inf(-1)}
	seenBounds := false
	for i := range objects {
		res := &objects[i]
		obj := ir.Objects[i]
		if obj.Visible != nil && !*obj.Visible {
			continue
		}
		idx, ok := layerIndex[res.Layer]
		if !ok {
			layerIndex[res.Layer] = len(doc.Layers)
			doc.Layers = append(doc.Layers, DocLayer{ID: res.Layer, Name: titleCase(res.Layer), Visible: true, Strokes: []DocStroke{}})
			idx = layerIndex[res.Layer]
		}
		stroke := strokeFor(res, obj, res.Paint)
		if stroke.Kind == "pen" && len(stroke.PenAnchors) < 2 {
			warnings = append(warnings, fmt.Sprintf("%s: fewer than two anchors, skipped", res.ID))
			continue
		}
		doc.Layers[idx].Strokes = append(doc.Layers[idx].Strokes, stroke)
		bounds = bounds.Union(res.Box)
		seenBounds = true
	}
	if !seenBounds {
		bounds = Box{}
	}
	if len(doc.Layers) > 0 {
		doc.ActiveLayerID = doc.Layers[len(doc.Layers)-1].ID
	}
	return doc, bounds, warnings, nil
}

func titleCase(id string) string {
	parts := strings.FieldsFunc(id, func(r rune) bool { return r == '-' || r == '_' || r == '/' })
	for i, p := range parts {
		if p == "" {
			continue
		}
		parts[i] = strings.ToUpper(p[:1]) + p[1:]
	}
	if len(parts) == 0 {
		return id
	}
	return strings.Join(parts, " ")
}

func dedupeWarnings(in []string) []string {
	seen := make(map[string]bool, len(in))
	out := in[:0]
	for _, w := range in {
		if w == "" || seen[w] {
			continue
		}
		seen[w] = true
		out = append(out, w)
	}
	return out
}
