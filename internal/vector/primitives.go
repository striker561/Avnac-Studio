package vector

import (
	"fmt"
	"math"
)

// EllipseKappa is the handle length that makes four cubics describe a circle
// (0.5522847498 x radius).
const EllipseKappa = 0.5522847498307936

// ellipsePath builds an ellipse from four cubic arcs.
func ellipsePath(cx, cy, rx, ry float64) Path {
	kx, ky := rx*EllipseKappa, ry*EllipseKappa
	top := Point{cx, cy - ry}
	right := Point{cx + rx, cy}
	bottom := Point{cx, cy + ry}
	left := Point{cx - rx, cy}
	return Path{
		Start:  top,
		Closed: true,
		Segments: []Segment{
			{From: top, C1: Point{cx + kx, cy - ry}, C2: Point{cx + rx, cy - ky}, To: right, Cubic: true},
			{From: right, C1: Point{cx + rx, cy + ky}, C2: Point{cx + kx, cy + ry}, To: bottom, Cubic: true},
			{From: bottom, C1: Point{cx - kx, cy + ry}, C2: Point{cx - rx, cy + ky}, To: left, Cubic: true},
			{From: left, C1: Point{cx - rx, cy - ky}, C2: Point{cx - kx, cy - ry}, To: top, Cubic: true},
		},
	}
}

// roundedRectPath builds a rectangle with four quarter-arc corners. A radius of
// half the shorter edge produces a capsule.
func roundedRectPath(x, y, w, h, r float64) Path {
	maxR := math.Min(w, h) / 2
	if r > maxR {
		r = maxR
	}
	if r < 0 {
		r = 0
	}
	if r == 0 {
		return polylinePath([]Pair{{x, y}, {x + w, y}, {x + w, y + h}, {x, y + h}}, true)
	}
	k := r * EllipseKappa
	p := Path{Start: Point{x + r, y}, Closed: true}
	line := func(to Point) { p.Segments = append(p.Segments, Segment{From: p.last(), To: to}) }
	curve := func(c1, c2, to Point) {
		p.Segments = append(p.Segments, Segment{From: p.last(), C1: c1, C2: c2, To: to, Cubic: true})
	}
	line(Point{x + w - r, y})
	curve(Point{x + w - r + k, y}, Point{x + w, y + r - k}, Point{x + w, y + r})
	line(Point{x + w, y + h - r})
	curve(Point{x + w, y + h - r + k}, Point{x + w - r + k, y + h}, Point{x + w - r, y + h})
	line(Point{x + r, y + h})
	curve(Point{x + r - k, y + h}, Point{x, y + h - r + k}, Point{x, y + h - r})
	line(Point{x, y + r})
	curve(Point{x, y + r - k}, Point{x + r - k, y}, Point{x + r, y})
	return p
}

func (p Path) last() Point {
	if len(p.Segments) == 0 {
		return p.Start
	}
	return p.Segments[len(p.Segments)-1].To
}

// polygonPath builds a regular polygon inscribed in the box, first vertex at
// the top.
func polygonPath(cx, cy, rx, ry float64, sides int, startDeg float64) Path {
	if sides < 3 {
		sides = 3
	}
	points := make([]Pair, 0, sides)
	for i := 0; i < sides; i++ {
		angle := (startDeg - 90 + float64(i)*360/float64(sides)) * math.Pi / 180
		points = append(points, Pair{cx + rx*math.Cos(angle), cy + ry*math.Sin(angle)})
	}
	return polylinePath(points, true)
}

// starPath builds an N-point star from alternating outer and inner radii.
func starPath(cx, cy, rx, ry float64, points int, innerRatio float64) Path {
	if points < 3 {
		points = 5
	}
	if innerRatio <= 0 || innerRatio >= 1 {
		innerRatio = 0.4
	}
	vertices := make([]Pair, 0, points*2)
	for i := 0; i < points*2; i++ {
		angle := (-90 + float64(i)*180/float64(points)) * math.Pi / 180
		scale := 1.0
		if i%2 == 1 {
			scale = innerRatio
		}
		vertices = append(vertices, Pair{cx + rx*scale*math.Cos(angle), cy + ry*scale*math.Sin(angle)})
	}
	return polylinePath(vertices, true)
}

// polylinePath builds a closed or open polyline.
func polylinePath(points []Pair, closed bool) Path {
	if len(points) < 2 {
		return Path{}
	}
	p := Path{Start: Point{points[0][0], points[0][1]}, Closed: closed}
	for i := 1; i < len(points); i++ {
		to := Point{points[i][0], points[i][1]}
		p.Segments = append(p.Segments, Segment{From: p.last(), To: to})
	}
	if closed {
		first := p.Start
		if !nearlyEqualPoint(p.last(), first) {
			p.Segments = append(p.Segments, Segment{From: p.last(), To: first})
		}
	}
	return p
}

func nearlyEqualPoint(a, b Point) bool {
	return math.Abs(a.X-b.X) < 1e-9 && math.Abs(a.Y-b.Y) < 1e-9
}

// pathFromSpec builds a path from IR start/segments.
func pathFromSpec(start Pair, specs []SegmentSpec, closed bool) (Path, error) {
	p := Path{Start: Point{start[0], start[1]}, Closed: closed}
	cursor := p.Start
	for i, spec := range specs {
		to := Point{spec.To[0], spec.To[1]}
		kind := spec.Type
		if kind == "" {
			kind = "line"
		}
		switch kind {
		case "line":
			p.Segments = append(p.Segments, Segment{From: cursor, To: to})
		case "cubic", "curve":
			if spec.Control1 == nil || spec.Control2 == nil {
				return Path{}, fmt.Errorf("vector: segment %d is cubic but is missing control1/control2", i)
			}
			p.Segments = append(p.Segments, Segment{
				From:  cursor,
				C1:    Point{spec.Control1[0], spec.Control1[1]},
				C2:    Point{spec.Control2[0], spec.Control2[1]},
				To:    to,
				Cubic: true,
			})
		default:
			return Path{}, fmt.Errorf("vector: segment %d has unknown type %q (want line or cubic)", i, spec.Type)
		}
		cursor = to
	}
	if closed && len(p.Segments) > 0 {
		if !nearlyEqualPoint(cursor, p.Start) {
			p.Segments = append(p.Segments, Segment{From: cursor, To: p.Start})
		}
	}
	return p, nil
}

// objectBox returns the object's authored box, or the shape bounds when the box
// is omitted.
func objectBox(obj Object, shape Path) Box {
	if obj.Width.Float() > 0 || obj.Height.Float() > 0 {
		return Box{
			MinX: obj.X.Float(),
			MinY: obj.Y.Float(),
			MaxX: obj.X.Float() + obj.Width.Float(),
			MaxY: obj.Y.Float() + obj.Height.Float(),
		}
	}
	return shape.Bounds()
}

// shapeForObject builds the object's base geometry (no constraints, no mirror).
func shapeForObject(obj Object) (Path, error) {
	typ := obj.Type
	if typ == "" {
		return Path{}, fmt.Errorf("vector: object %q has no type", obj.ID)
	}
	w, h := obj.Width.Float(), obj.Height.Float()
	x, y := obj.X.Float(), obj.Y.Float()

	hasBox := w > 0 && h > 0
	needBox := func() error {
		if !hasBox {
			return fmt.Errorf("vector: object %q (%s) needs width and height", obj.ID, typ)
		}
		return nil
	}

	var shape Path
	switch typ {
	case "rect":
		if err := needBox(); err != nil {
			return Path{}, err
		}
		shape = roundedRectPath(x, y, w, h, obj.CornerRadius.Float())
	case "ellipse":
		if err := needBox(); err != nil {
			return Path{}, err
		}
		shape = ellipsePath(x+w/2, y+h/2, w/2, h/2)
	case "circle":
		if err := needBox(); err != nil {
			return Path{}, err
		}
		d := math.Min(w, h)
		shape = ellipsePath(x+w/2, y+h/2, d/2, d/2)
	case "capsule":
		if err := needBox(); err != nil {
			return Path{}, err
		}
		radius := math.Min(w, h) / 2
		if r := obj.CornerRadius.Float(); r > 0 && r < radius {
			radius = r
		}
		shape = roundedRectPath(x, y, w, h, radius)
	case "polygon":
		if len(obj.Points) >= 3 {
			shape = polylinePath(obj.Points, true)
		} else {
			if err := needBox(); err != nil {
				return Path{}, err
			}
			sides := obj.Sides
			if sides == 0 {
				sides = 6
			}
			shape = polygonPath(x+w/2, y+h/2, w/2, h/2, sides, 0)
		}
	case "star":
		if len(obj.Points) >= 6 {
			shape = polylinePath(obj.Points, true)
		} else {
			if err := needBox(); err != nil {
				return Path{}, err
			}
			points := obj.Sides
			if points == 0 {
				points = 5
			}
			shape = starPath(x+w/2, y+h/2, w/2, h/2, points, obj.InnerRatio.Float())
		}
	case "line":
		x1, y1, x2, y2 := x, y+h/2, x+w, y+h/2
		if obj.X1 != nil {
			x1 = obj.X1.Float()
		}
		if obj.Y1 != nil {
			y1 = obj.Y1.Float()
		}
		if obj.X2 != nil {
			x2 = obj.X2.Float()
		}
		if obj.Y2 != nil {
			y2 = obj.Y2.Float()
		}
		shape = Path{Start: Point{x1, y1}, Segments: []Segment{{From: Point{x1, y1}, To: Point{x2, y2}}}}
	case "path":
		switch {
		case obj.Start != nil && len(obj.Segments) > 0:
			closed := obj.Closed != nil && *obj.Closed
			built, err := pathFromSpec(*obj.Start, obj.Segments, closed)
			if err != nil {
				return Path{}, err
			}
			shape = built
		case len(obj.Points) >= 2:
			closed := obj.Closed == nil || *obj.Closed
			shape = polylinePath(obj.Points, closed)
		default:
			return Path{}, fmt.Errorf("vector: path %q needs start+segments or points", obj.ID)
		}
	default:
		return Path{}, fmt.Errorf("vector: object %q has unknown type %q (want rect, ellipse, circle, capsule, polygon, star, line, path)", obj.ID, typ)
	}

	if len(shape.Segments) == 0 {
		return Path{}, fmt.Errorf("vector: object %q produced no geometry", obj.ID)
	}
	box := objectBox(obj, shape)
	for _, seg := range shape.Segments {
		if err := ensureFinite(obj.ID, seg.From, seg.C1, seg.C2, seg.To); err != nil {
			return Path{}, err
		}
	}
	if obj.Rotation.Float() != 0 {
		shape = shape.Rotate(box.Center(), obj.Rotation.Float())
	}
	return shape, nil
}
