// Package vector implements Avnac's vector intermediate representation: a
// small scene graph of shapes, relationships and paint that resolves to cubic
// geometry, a v3 vector-board document, and clean SVG.
//
// The representation exists so a drawing can be described as objects and
// relationships ("the window is centred on the body", "the right fin mirrors
// the left") instead of a single opaque path string. The resolver turns that
// description into geometry once; the drawing tool then places the rendered SVG
// on the canvas and keeps the IR so later edits address objects by id.
//
// The pipeline is:
//
//	IR  ->  shapes (cubic paths)  ->  v3 document  ->  SVG
//
// Every stage is a pure function, which is why the package is testable without
// a frontend: Draw(IR) needs no scene, no Wails runtime and no browser.
package vector

import (
	"encoding/json"
	"fmt"
	"math"
	"strconv"
	"strings"
)

// Number is a float64 that also accepts a numeric string. MCP clients that
// stringify every argument are common, so the IR tolerates "12.5" and 12.5
// alike instead of rejecting an otherwise valid drawing.
type Number float64

// UnmarshalJSON implements json.Unmarshaler.
func (n *Number) UnmarshalJSON(data []byte) error {
	text := strings.TrimSpace(string(data))
	if text == "null" {
		*n = 0
		return nil
	}
	if strings.HasPrefix(text, "\"") {
		var s string
		if err := json.Unmarshal(data, &s); err != nil {
			return err
		}
		text = strings.TrimSpace(s)
	}
	if text == "" {
		*n = 0
		return nil
	}
	f, err := strconv.ParseFloat(text, 64)
	if err != nil {
		return fmt.Errorf("vector: %q is not a number", text)
	}
	if math.IsNaN(f) || math.IsInf(f, 0) {
		return fmt.Errorf("vector: %q is not a finite number", text)
	}
	*n = Number(f)
	return nil
}

// Float returns the value as a float64.
func (n Number) Float() float64 { return float64(n) }

// Pair is an [x, y] coordinate. It accepts [x, y] with numbers or numeric
// strings, and also { "x": .., "y": .. } for clients that prefer objects.
type Pair [2]float64

// UnmarshalJSON implements json.Unmarshaler.
func (p *Pair) UnmarshalJSON(data []byte) error {
	text := strings.TrimSpace(string(data))
	if text == "" || text == "null" {
		*p = Pair{}
		return nil
	}
	if strings.HasPrefix(text, "{") {
		var obj struct {
			X Number `json:"x"`
			Y Number `json:"y"`
		}
		if err := json.Unmarshal(data, &obj); err != nil {
			return err
		}
		*p = Pair{obj.X.Float(), obj.Y.Float()}
		return nil
	}
	var arr []Number
	if err := json.Unmarshal(data, &arr); err != nil {
		return err
	}
	if len(arr) != 2 {
		return fmt.Errorf("vector: point needs 2 numbers, got %d", len(arr))
	}
	*p = Pair{arr[0].Float(), arr[1].Float()}
	return nil
}

// Canvas is the drawing frame. Width and height are board units.
type Canvas struct {
	Width      Number `json:"width"`
	Height     Number `json:"height"`
	Background string `json:"background,omitempty"`
}

// Layer names a paint/visibility band. Order is z-order, bottom first.
type Layer struct {
	ID   string `json:"id"`
	Name string `json:"name,omitempty"`
}

// Constraint derives one object's placement from another resolved object.
type Constraint struct {
	// Relation is one of: centered_on, left_of, right_of, above, below,
	// inside, aligned_with, equal_size.
	Relation string `json:"relation"`
	// Target is an object id, or "canvas" for the board.
	Target string `json:"target"`
	// Gap is the spacing in board units for directional relations and the
	// inset for "inside".
	Gap Number `json:"gap,omitempty"`
	// Offset nudges the solved position after the relation is applied.
	Offset Pair `json:"offset,omitempty"`
	// Axis selects x or y for aligned_with.
	Axis string `json:"axis,omitempty"`
}

// SegmentSpec is one path segment in the IR. Coordinates are absolute board
// units. A "cubic" segment requires control1 and control2; a "line" ignores them.
type SegmentSpec struct {
	Type     string `json:"type"`
	To       Pair   `json:"to"`
	Control1 *Pair  `json:"control1,omitempty"`
	Control2 *Pair  `json:"control2,omitempty"`
}

// Object is one addressable part of the drawing.
type Object struct {
	ID    string `json:"id"`
	Type  string `json:"type"`
	Layer string `json:"layer,omitempty"`
	Name  string `json:"name,omitempty"`

	// Box, in board units, top-left origin. Required for generated shapes;
	// optional for explicit geometry, where it is derived from the points.
	X      Number `json:"x,omitempty"`
	Y      Number `json:"y,omitempty"`
	Width  Number `json:"width,omitempty"`
	Height Number `json:"height,omitempty"`

	// Rotation is clockwise degrees about the box centre.
	Rotation Number `json:"rotation,omitempty"`

	Fill          string  `json:"fill,omitempty"`
	Stroke        string  `json:"stroke,omitempty"`
	StrokeWidth   Number  `json:"strokeWidth,omitempty"`
	FillOpacity   *Number `json:"fillOpacity,omitempty"`
	StrokeOpacity *Number `json:"strokeOpacity,omitempty"`
	FillRule      string  `json:"fillRule,omitempty"`
	LineCap       string  `json:"lineCap,omitempty"`
	LineJoin      string  `json:"lineJoin,omitempty"`

	// CornerRadius applies to rect and capsule (capsule forces half the
	// shorter edge). Sides and InnerRatio apply to polygon and star.
	CornerRadius Number `json:"cornerRadius,omitempty"`
	Sides        int    `json:"sides,omitempty"`
	InnerRatio   Number `json:"innerRatio,omitempty"`

	// Explicit geometry. Points are absolute for polygon/star/path; line uses
	// the x1..y2 fields. When both a box and points are given the box defines
	// the frame and the points are used as authored.
	Points   []Pair        `json:"points,omitempty"`
	Start    *Pair         `json:"start,omitempty"`
	Segments []SegmentSpec `json:"segments,omitempty"`
	Closed   *bool         `json:"closed,omitempty"`

	X1 *Number `json:"x1,omitempty"`
	Y1 *Number `json:"y1,omitempty"`
	X2 *Number `json:"x2,omitempty"`
	Y2 *Number `json:"y2,omitempty"`

	Constraints []Constraint `json:"constraints,omitempty"`

	// MirrorOf copies and reflects another object instead of drawing this one.
	MirrorOf string `json:"mirrorOf,omitempty"`
	// Axis is "vertical" (reflect x) or "horizontal" (reflect y).
	Axis string `json:"axis,omitempty"`
	// AxisValue overrides the mirror line. Defaults to the board centre on
	// that axis, which is what "mirror the left fin" means in practice.
	AxisValue *Number `json:"axisValue,omitempty"`

	Visible *bool `json:"visible,omitempty"`
}

// IR is the whole scene description.
type IR struct {
	Canvas  Canvas   `json:"canvas"`
	Layers  []Layer  `json:"layers,omitempty"`
	Objects []Object `json:"objects"`
}

// Operation is one incremental edit against a stored board.
type Operation struct {
	Op     string `json:"op"`
	Target string `json:"target,omitempty"`
	Of     string `json:"of,omitempty"`
	Axis   string `json:"axis,omitempty"`
	Index  *int   `json:"index,omitempty"`

	X      *Number `json:"x,omitempty"`
	Y      *Number `json:"y,omitempty"`
	By     *Pair   `json:"by,omitempty"`
	Width  *Number `json:"width,omitempty"`
	Height *Number `json:"height,omitempty"`
	Angle  *Number `json:"angle,omitempty"`
	Anchor string  `json:"anchor,omitempty"`

	Fill          *string `json:"fill,omitempty"`
	Stroke        *string `json:"stroke,omitempty"`
	StrokeWidth   *Number `json:"strokeWidth,omitempty"`
	FillOpacity   *Number `json:"fillOpacity,omitempty"`
	StrokeOpacity *Number `json:"strokeOpacity,omitempty"`

	// Object adds an object for op "add".
	Object *Object `json:"object,omitempty"`
}
