package vector

import (
	"fmt"
	"strings"
	"time"
)

// Board is a stored drawing: the IR plus its latest resolved render. The MCP
// tool keeps one per session so edits can address objects by id.
type Board struct {
	ID        string
	Name      string
	IR        IR
	Result    *Result
	NodeID    string
	CreatedAt time.Time
	UpdatedAt time.Time
}

// NewBoard resolves an IR and returns a ready board.
func NewBoard(id, name string, ir IR) (*Board, error) {
	result, err := Draw(ir)
	if err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	if strings.TrimSpace(name) == "" {
		name = "Vector board"
	}
	return &Board{ID: id, Name: name, IR: result.IR, Result: result, CreatedAt: now, UpdatedAt: now}, nil
}

// Apply runs operations against the stored IR and re-renders once. A failed
// operation leaves the board untouched: the IR is edited on a copy and swapped
// in only after Draw succeeds, so a bad edit cannot corrupt the session.
func (b *Board) Apply(ops []Operation) error {
	next := cloneIR(b.IR)
	if err := ApplyOperations(&next, ops); err != nil {
		return err
	}
	result, err := Draw(next)
	if err != nil {
		return err
	}
	b.IR = result.IR
	b.Result = result
	b.UpdatedAt = time.Now().UTC()
	return nil
}

// ApplyOperations mutates an IR with object-level edits.
func ApplyOperations(ir *IR, ops []Operation) error {
	for i, op := range ops {
		name := strings.ToLower(strings.TrimSpace(op.Op))
		if name == "" {
			return fmt.Errorf("vector: operations[%d] has no op", i)
		}
		if name == "add" {
			if op.Object == nil {
				return fmt.Errorf("vector: operations[%d] add needs an object", i)
			}
			if strings.TrimSpace(op.Object.ID) == "" {
				return fmt.Errorf("vector: operations[%d] add needs object.id", i)
			}
			for _, existing := range ir.Objects {
				if existing.ID == op.Object.ID {
					return fmt.Errorf("vector: operations[%d] add reuses id %q", i, op.Object.ID)
				}
			}
			ir.Objects = append(ir.Objects, *op.Object)
			continue
		}

		idx := -1
		for j := range ir.Objects {
			if ir.Objects[j].ID == op.Target {
				idx = j
				break
			}
		}
		if idx < 0 {
			return fmt.Errorf("vector: operations[%d] target %q not found", i, op.Target)
		}
		obj := &ir.Objects[idx]

		// A mirrored object has no geometry of its own: its shape is the
		// source's reflection. Editing it silently would do nothing, so say so.
		if obj.MirrorOf != "" && (name == "resize" || name == "move" || name == "rotate") {
			return fmt.Errorf("vector: %q is a mirror of %q; edit the source or drop the mirror", obj.ID, obj.MirrorOf)
		}

		switch name {
		case "resize":
			if op.Width == nil && op.Height == nil {
				return fmt.Errorf("vector: operations[%d] resize needs width and/or height", i)
			}
			if err := resizeObject(obj, op); err != nil {
				return fmt.Errorf("vector: operations[%d]: %w", i, err)
			}
		case "move":
			if op.By != nil {
				obj.X = Number(obj.X.Float() + op.By[0])
				obj.Y = Number(obj.Y.Float() + op.By[1])
			}
			if op.X != nil {
				obj.X = *op.X
			}
			if op.Y != nil {
				obj.Y = *op.Y
			}
		case "rotate":
			if op.Angle == nil {
				return fmt.Errorf("vector: operations[%d] rotate needs angle", i)
			}
			obj.Rotation = *op.Angle
		case "mirror":
			source := op.Of
			if source == "" {
				return fmt.Errorf("vector: operations[%d] mirror needs of (the source object)", i)
			}
			found := false
			for _, candidate := range ir.Objects {
				if candidate.ID == source {
					found = true
					break
				}
			}
			if !found {
				return fmt.Errorf("vector: operations[%d] mirror source %q not found", i, source)
			}
			if source == obj.ID {
				return fmt.Errorf("vector: operations[%d] cannot mirror %q onto itself", i, source)
			}
			obj.MirrorOf = source
			obj.Constraints = nil
			if op.Axis != "" {
				obj.Axis = strings.ToLower(strings.TrimSpace(op.Axis))
			}
		case "restyle":
			if op.Fill != nil {
				obj.Fill = *op.Fill
			}
			if op.Stroke != nil {
				obj.Stroke = *op.Stroke
			}
			if op.StrokeWidth != nil {
				obj.StrokeWidth = *op.StrokeWidth
			}
			if op.FillOpacity != nil {
				obj.FillOpacity = op.FillOpacity
			}
			if op.StrokeOpacity != nil {
				obj.StrokeOpacity = op.StrokeOpacity
			}
		case "reorder":
			if op.Index == nil {
				return fmt.Errorf("vector: operations[%d] reorder needs index", i)
			}
			to := *op.Index
			if to < 0 || to >= len(ir.Objects) {
				return fmt.Errorf("vector: operations[%d] reorder index %d out of range 0..%d", i, to, len(ir.Objects)-1)
			}
			moved := *obj
			ir.Objects = append(ir.Objects[:idx], ir.Objects[idx+1:]...)
			rest := make([]Object, 0, len(ir.Objects)+1)
			rest = append(rest, ir.Objects[:to]...)
			rest = append(rest, moved)
			rest = append(rest, ir.Objects[to:]...)
			ir.Objects = rest
		case "delete":
			ir.Objects = append(ir.Objects[:idx], ir.Objects[idx+1:]...)
		default:
			return fmt.Errorf("vector: operations[%d] has unknown op %q (want resize, move, rotate, mirror, restyle, reorder, delete, add)", i, op.Op)
		}
	}
	return nil
}

// resizeObject resizes an object about its centre (default) or top-left corner.
// One explicit dimension scales the other proportionally, which keeps a leaf,
// fin or icon from being stretched by accident.
func resizeObject(obj *Object, op Operation) error {
	shape, err := shapeForObject(*obj)
	if err != nil {
		return err
	}
	old := objectBox(*obj, shape)
	if old.Width() <= 0 || old.Height() <= 0 {
		return fmt.Errorf("%q has no measurable size", obj.ID)
	}
	targetW, targetH := old.Width(), old.Height()
	if op.Width != nil && op.Height != nil {
		targetW, targetH = op.Width.Float(), op.Height.Float()
	} else if op.Width != nil {
		targetW = op.Width.Float()
		targetH = old.Height() * (targetW / old.Width())
	} else {
		targetH = op.Height.Float()
		targetW = old.Width() * (targetH / old.Height())
	}
	if targetW <= 0 || targetH <= 0 {
		return fmt.Errorf("%q needs positive width and height", obj.ID)
	}
	sx, sy := targetW/old.Width(), targetH/old.Height()
	origin := old.Center()
	if op.Anchor == "top-left" || op.Anchor == "topleft" {
		origin = Point{old.MinX, old.MinY}
	}

	// Box-generated primitives are regenerated from the new box. Explicit
	// geometry (points, path segments, line endpoints) must be scaled in place,
	// or the new width/height would be ignored by the shape generator.
	if len(obj.Points) > 0 {
		for k, p := range obj.Points {
			obj.Points[k] = Pair{
				origin.X + (p[0]-origin.X)*sx,
				origin.Y + (p[1]-origin.Y)*sy,
			}
		}
	}
	if obj.Start != nil {
		obj.Start = &Pair{
			origin.X + (obj.Start[0]-origin.X)*sx,
			origin.Y + (obj.Start[1]-origin.Y)*sy,
		}
	}
	for k := range obj.Segments {
		scalePair := func(p *Pair) {
			if p == nil {
				return
			}
			*p = Pair{origin.X + ((*p)[0]-origin.X)*sx, origin.Y + ((*p)[1]-origin.Y)*sy}
		}
		scalePair(&obj.Segments[k].To)
		scalePair(obj.Segments[k].Control1)
		scalePair(obj.Segments[k].Control2)
	}
	if obj.X1 != nil && obj.Y1 != nil && obj.X2 != nil && obj.Y2 != nil {
		scaleNum := func(v *Number, originAxis float64, factor float64) {
			*v = Number(originAxis + (v.Float()-originAxis)*factor)
		}
		scaleNum(obj.X1, origin.X, sx)
		scaleNum(obj.X2, origin.X, sx)
		scaleNum(obj.Y1, origin.Y, sy)
		scaleNum(obj.Y2, origin.Y, sy)
	}

	newX, newY := origin.X, origin.Y
	if op.Anchor == "top-left" || op.Anchor == "topleft" {
		newX, newY = old.MinX, old.MinY
	} else {
		newX -= targetW / 2
		newY -= targetH / 2
	}
	obj.X = Number(newX)
	obj.Y = Number(newY)
	obj.Width = Number(targetW)
	obj.Height = Number(targetH)
	return nil
}

// cloneIR deep-copies the parts operations mutate.
func cloneIR(ir IR) IR {
	out := ir
	out.Layers = append([]Layer(nil), ir.Layers...)
	out.Objects = make([]Object, len(ir.Objects))
	for i, obj := range ir.Objects {
		obj.Constraints = append([]Constraint(nil), obj.Constraints...)
		obj.Points = append([]Pair(nil), obj.Points...)
		obj.Segments = append([]SegmentSpec(nil), obj.Segments...)
		out.Objects[i] = obj
	}
	return out
}
