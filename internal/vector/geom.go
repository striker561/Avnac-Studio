package vector

import (
	"fmt"
	"math"
	"strconv"
	"strings"
)

// Point is a board-space coordinate.
type Point struct {
	X, Y float64
}

// Add returns p+o.
func (p Point) Add(o Point) Point { return Point{p.X + o.X, p.Y + o.Y} }

// Sub returns p-o.
func (p Point) Sub(o Point) Point { return Point{p.X - o.X, p.Y - o.Y} }

// Scale multiplies both coordinates.
func (p Point) Scale(f float64) Point { return Point{p.X * f, p.Y * f} }

// Distance returns the Euclidean distance to o.
func (p Point) Distance(o Point) float64 { return math.Hypot(p.X-o.X, p.Y-o.Y) }

// Rotate returns p rotated clockwise by degrees about the origin.
func (p Point) Rotate(degrees float64) Point {
	if degrees == 0 {
		return p
	}
	rad := degrees * math.Pi / 180
	cos, sin := math.Cos(rad), math.Sin(rad)
	return Point{X: p.X*cos - p.Y*sin, Y: p.X*sin + p.Y*cos}
}

// Segment is one path segment: a straight line, or a cubic when Cubic is true.
type Segment struct {
	From  Point
	C1    Point
	C2    Point
	To    Point
	Cubic bool
}

// Path is a chain of segments with a start point. When Closed is true the
// segment list already contains the closing segment, so rendering appends only
// the Z command.
type Path struct {
	Start    Point
	Segments []Segment
	Closed   bool
}

// Box is an axis-aligned rectangle.
type Box struct {
	MinX, MinY, MaxX, MaxY float64
}

// Width returns the box width.
func (b Box) Width() float64 { return b.MaxX - b.MinX }

// Height returns the box height.
func (b Box) Height() float64 { return b.MaxY - b.MinY }

// Center returns the box centre.
func (b Box) Center() Point { return Point{X: (b.MinX + b.MaxX) / 2, Y: (b.MinY + b.MaxY) / 2} }

// Empty reports whether the box has no area.
func (b Box) Empty() bool { return b.Width() <= 0 && b.Height() <= 0 }

// Translate returns the box moved by dx, dy.
func (b Box) Translate(dx, dy float64) Box {
	return Box{b.MinX + dx, b.MinY + dy, b.MaxX + dx, b.MaxY + dy}
}

// Union returns the smallest box containing both.
func (b Box) Union(o Box) Box {
	return Box{
		MinX: math.Min(b.MinX, o.MinX),
		MinY: math.Min(b.MinY, o.MinY),
		MaxX: math.Max(b.MaxX, o.MaxX),
		MaxY: math.Max(b.MaxY, o.MaxY),
	}
}

// Contains reports whether o is inside b with the given tolerance.
func (b Box) Contains(o Box, tol float64) bool {
	return o.MinX >= b.MinX-tol && o.MinY >= b.MinY-tol && o.MaxX <= b.MaxX+tol && o.MaxY <= b.MaxY+tol
}

func boundsFromPoints(points []Point) Box {
	if len(points) == 0 {
		return Box{}
	}
	b := Box{MinX: points[0].X, MinY: points[0].Y, MaxX: points[0].X, MaxY: points[0].Y}
	for _, p := range points[1:] {
		b.MinX = math.Min(b.MinX, p.X)
		b.MinY = math.Min(b.MinY, p.Y)
		b.MaxX = math.Max(b.MaxX, p.X)
		b.MaxY = math.Max(b.MaxY, p.Y)
	}
	return b
}

// cubicBounds returns the tight bounds of one cubic segment.
func cubicBounds(p0, p1, p2, p3 Point) Box {
	points := []Point{p0, p3}
	for _, t := range cubicExtrema(p0.X, p1.X, p2.X, p3.X) {
		points = append(points, cubicPoint(p0, p1, p2, p3, t))
	}
	for _, t := range cubicExtrema(p0.Y, p1.Y, p2.Y, p3.Y) {
		points = append(points, cubicPoint(p0, p1, p2, p3, t))
	}
	return boundsFromPoints(points)
}

// cubicExtrema returns the t values in (0,1) where the cubic derivative is zero.
func cubicExtrema(a, b, c, d float64) []float64 {
	// B'(t)/3 = A t^2 + B t + C
	A := -a + 3*b - 3*c + d
	B := 2 * (a - 2*b + c)
	C := b - a
	var roots []float64
	accept := func(t float64) {
		if t > 1e-9 && t < 1-1e-9 {
			roots = append(roots, t)
		}
	}
	if math.Abs(A) < 1e-12 {
		if math.Abs(B) > 1e-12 {
			accept(-C / B)
		}
		return roots
	}
	disc := B*B - 4*A*C
	if disc < 0 {
		return roots
	}
	sq := math.Sqrt(disc)
	accept((-B + sq) / (2 * A))
	accept((-B - sq) / (2 * A))
	return roots
}

// cubicPoint evaluates a cubic at t.
func cubicPoint(p0, p1, p2, p3 Point, t float64) Point {
	mt := 1 - t
	a := mt * mt * mt
	b := 3 * mt * mt * t
	c := 3 * mt * t * t
	d := t * t * t
	return Point{
		X: a*p0.X + b*p1.X + c*p2.X + d*p3.X,
		Y: a*p0.Y + b*p1.Y + c*p2.Y + d*p3.Y,
	}
}

// Bounds returns the tight bounds of the whole path.
func (p Path) Bounds() Box {
	if len(p.Segments) == 0 {
		return Box{p.Start.X, p.Start.Y, p.Start.X, p.Start.Y}
	}
	b := Box{p.Start.X, p.Start.Y, p.Start.X, p.Start.Y}
	for _, seg := range p.Segments {
		var sb Box
		if seg.Cubic {
			sb = cubicBounds(seg.From, seg.C1, seg.C2, seg.To)
		} else {
			sb = boundsFromPoints([]Point{seg.From, seg.To})
		}
		b = b.Union(sb)
	}
	return b
}

// Translate returns the path moved by dx, dy.
func (p Path) Translate(dx, dy float64) Path {
	out := Path{Start: Point{p.Start.X + dx, p.Start.Y + dy}, Closed: p.Closed, Segments: make([]Segment, len(p.Segments))}
	for i, s := range p.Segments {
		s.From = Point{s.From.X + dx, s.From.Y + dy}
		s.C1 = Point{s.C1.X + dx, s.C1.Y + dy}
		s.C2 = Point{s.C2.X + dx, s.C2.Y + dy}
		s.To = Point{s.To.X + dx, s.To.Y + dy}
		out.Segments[i] = s
	}
	return out
}

// Scale returns the path scaled about the given origin.
func (p Path) Scale(origin Point, sx, sy float64) Path {
	f := func(pt Point) Point {
		return Point{origin.X + (pt.X-origin.X)*sx, origin.Y + (pt.Y-origin.Y)*sy}
	}
	out := Path{Start: f(p.Start), Closed: p.Closed, Segments: make([]Segment, len(p.Segments))}
	for i, s := range p.Segments {
		out.Segments[i] = Segment{From: f(s.From), C1: f(s.C1), C2: f(s.C2), To: f(s.To), Cubic: s.Cubic}
	}
	return out
}

// Rotate returns the path rotated clockwise by degrees about origin.
func (p Path) Rotate(origin Point, degrees float64) Path {
	if degrees == 0 {
		return p
	}
	f := func(pt Point) Point { return origin.Add(pt.Sub(origin).Rotate(degrees)) }
	out := Path{Start: f(p.Start), Closed: p.Closed, Segments: make([]Segment, len(p.Segments))}
	for i, s := range p.Segments {
		out.Segments[i] = Segment{From: f(s.From), C1: f(s.C1), C2: f(s.C2), To: f(s.To), Cubic: s.Cubic}
	}
	return out
}

// Reversed returns the path with reversed direction. Reversing a closed path
// flips its winding, which is required after a mirror: a reflected outer
// contour becomes clockwise and would cancel under a non-zero fill.
func (p Path) Reversed() Path {
	if len(p.Segments) == 0 {
		return Path{Start: p.Start, Closed: p.Closed}
	}
	out := Path{Start: p.Segments[len(p.Segments)-1].To, Closed: p.Closed}
	out.Segments = make([]Segment, 0, len(p.Segments))
	for i := len(p.Segments) - 1; i >= 0; i-- {
		s := p.Segments[i]
		out.Segments = append(out.Segments, Segment{From: s.To, C1: s.C2, C2: s.C1, To: s.From, Cubic: s.Cubic})
	}
	return out
}

// FormatNumber renders a coordinate with at most two decimals and no trailing
// zeros, matching the editor's SVG output.
func FormatNumber(v float64) string {
	if math.IsNaN(v) || math.IsInf(v, 0) {
		return "0"
	}
	rounded := math.Round(v*100) / 100
	if rounded == 0 {
		return "0"
	}
	s := strconv.FormatFloat(rounded, 'f', -1, 64)
	if strings.Contains(s, ".") {
		s = strings.TrimRight(strings.TrimRight(s, "0"), ".")
	}
	return s
}

func fmtPoint(p Point) string {
	return FormatNumber(p.X) + " " + FormatNumber(p.Y)
}

// Data renders the path as SVG path data.
func (p Path) Data() string {
	if len(p.Segments) == 0 {
		return ""
	}
	var b strings.Builder
	b.WriteString("M " + fmtPoint(p.Start))
	for _, s := range p.Segments {
		if s.Cubic {
			b.WriteString(" C " + fmtPoint(s.C1) + " " + fmtPoint(s.C2) + " " + fmtPoint(s.To))
		} else {
			b.WriteString(" L " + fmtPoint(s.To))
		}
	}
	if p.Closed {
		b.WriteString(" Z")
	}
	return b.String()
}

// Anchor is one on-curve node with optional absolute handles, shaped for the
// v3 document's pen anchors.
type Anchor struct {
	X, Y       float64
	InX, InY   *float64
	OutX, OutY *float64
	Type       string
}

// Anchors converts the path's segments into pen anchors. A closed path whose
// last point equals the start collapses the duplicate node and moves its
// incoming handle onto the first anchor.
func (p Path) Anchors() []Anchor {
	if len(p.Segments) == 0 {
		return nil
	}
	anchors := []Anchor{{X: p.Start.X, Y: p.Start.Y}}
	for _, s := range p.Segments {
		last := &anchors[len(anchors)-1]
		if s.Cubic {
			out := s.C1
			last.OutX, last.OutY = &out.X, &out.Y
		}
		next := Anchor{X: s.To.X, Y: s.To.Y}
		if s.Cubic {
			in := s.C2
			next.InX, next.InY = &in.X, &in.Y
		}
		anchors = append(anchors, next)
	}
	if p.Closed && len(anchors) > 1 {
		first, last := anchors[0], anchors[len(anchors)-1]
		if math.Abs(first.X-last.X) < 1e-7 && math.Abs(first.Y-last.Y) < 1e-7 {
			if last.InX != nil {
				first.InX, first.InY = last.InX, last.InY
			}
			anchors = anchors[:len(anchors)-1]
		}
	}
	for i := range anchors {
		anchors[i].Type = inferNodeType(anchors[i])
	}
	return anchors
}

// inferNodeType names the invariant the handles currently satisfy.
func inferNodeType(a Anchor) string {
	if a.InX == nil && a.OutX == nil {
		return "corner"
	}
	if a.InX == nil || a.OutX == nil {
		return "cusp"
	}
	in := Point{*a.InX - a.X, *a.InY - a.Y}
	out := Point{*a.OutX - a.X, *a.OutY - a.Y}
	// Normalise before judging collinearity so long handles do not shrink the
	// sine of the angle artificially.
	li, lo := math.Hypot(in.X, in.Y), math.Hypot(out.X, out.Y)
	if li < 1e-9 || lo < 1e-9 {
		return "cusp"
	}
	cross := (in.X/li)*(out.Y/lo) - (in.Y/li)*(out.X/lo)
	if math.Abs(cross) > 1e-3 {
		return "cusp"
	}
	if math.Abs(li-lo) <= 1e-3*math.Max(li, lo) {
		return "symmetric"
	}
	return "smooth"
}

// clonePath deep-copies a path.
func clonePath(p Path) Path {
	out := Path{Start: p.Start, Closed: p.Closed, Segments: make([]Segment, len(p.Segments))}
	copy(out.Segments, p.Segments)
	return out
}

// ensureFinite rejects NaN/Inf coordinates before they reach the renderer.
func ensureFinite(label string, points ...Point) error {
	for _, p := range points {
		if math.IsNaN(p.X) || math.IsNaN(p.Y) || math.IsInf(p.X, 0) || math.IsInf(p.Y, 0) {
			return fmt.Errorf("vector: %s has a non-finite coordinate", label)
		}
	}
	return nil
}
