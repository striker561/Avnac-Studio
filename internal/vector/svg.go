package vector

import (
	"fmt"
	"math"
	"regexp"
	"strconv"
	"strings"
)

// RenderSVG serialises a v3 document to standalone SVG, matching the editor's
// exporter: one <path> per stroke, one <g> per layer, and the vector-board
// marker that lets Avnac's own exporter inline the paths instead of an image.
func RenderSVG(doc *Document, background string) string {
	width := math.Max(1, doc.Size.Width)
	height := math.Max(1, doc.Size.Height)
	var b strings.Builder
	b.WriteString(`<?xml version="1.0" encoding="UTF-8"?>`)
	b.WriteString(`<svg xmlns="http://www.w3.org/2000/svg"`)
	b.WriteString(` width="` + FormatNumber(width) + `"`)
	b.WriteString(` height="` + FormatNumber(height) + `"`)
	b.WriteString(` viewBox="0 0 ` + FormatNumber(width) + " " + FormatNumber(height) + `"`)
	b.WriteString(` data-avnac-vector-board="1">`)
	if bg := cleanPaint(background); bg != "" {
		b.WriteString(`<rect x="0" y="0" width="` + FormatNumber(width) + `" height="` + FormatNumber(height) + `" fill="` + escapeAttr(bg) + `"/>`)
	}
	for _, layer := range doc.Layers {
		if !layer.Visible {
			continue
		}
		b.WriteString(`<g data-layer-id="` + escapeAttr(layer.ID) + `" data-layer-name="` + escapeAttr(layer.Name) + `">`)
		for _, stroke := range layer.Strokes {
			if markup := strokeSVG(stroke); markup != "" {
				b.WriteString(markup)
			}
		}
		b.WriteString(`</g>`)
	}
	b.WriteString(`</svg>`)
	return b.String()
}

// strokeSVG renders one stroke as a path element.
func strokeSVG(s DocStroke) string {
	path := strokePath(s)
	if len(path.Segments) == 0 {
		return ""
	}
	d := path.Data()
	if d == "" {
		return ""
	}
	attrs := []string{`d="` + d + `"`}
	fillVisible := cleanPaint(s.Fill) != "" && s.FillOpacity > 0 && path.Closed
	if fillVisible {
		attrs = append(attrs, `fill="`+escapeAttr(s.Fill)+`"`)
		if s.FillOpacity != 1 {
			attrs = append(attrs, `fill-opacity="`+FormatNumber(s.FillOpacity)+`"`)
		}
		if s.FillRule == "evenodd" {
			attrs = append(attrs, `fill-rule="evenodd"`)
		}
	} else {
		attrs = append(attrs, `fill="none"`)
	}
	strokeVisible := cleanPaint(s.Stroke) != "" && s.StrokeWidth > 0 && s.StrokeOp > 0
	if strokeVisible {
		attrs = append(attrs,
			`stroke="`+escapeAttr(s.Stroke)+`"`,
			`stroke-width="`+FormatNumber(s.StrokeWidth)+`"`,
		)
		if s.StrokeOp != 1 {
			attrs = append(attrs, `stroke-opacity="`+FormatNumber(s.StrokeOp)+`"`)
		}
		cap := s.LineCap
		if cap == "" {
			cap = "round"
		}
		join := s.LineJoin
		if join == "" {
			join = "round"
		}
		attrs = append(attrs, `stroke-linecap="`+cap+`"`, `stroke-linejoin="`+join+`"`)
	} else {
		attrs = append(attrs, `stroke="none"`)
	}
	return `<path ` + strings.Join(attrs, " ") + `/>`
}

// SVGDataURL encodes SVG for an image source. The result is a JS-compatible
// encodeURIComponent payload, which is what the frontend's decoder expects.
func SVGDataURL(svg string) string {
	return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg)
}

// encodeURIComponent percent-encodes everything except the JS unreserved set.
func encodeURIComponent(s string) string {
	var b strings.Builder
	for _, r := range s {
		switch {
		case r >= 'a' && r <= 'z', r >= 'A' && r <= 'Z', r >= '0' && r <= '9':
			b.WriteRune(r)
		case strings.ContainsRune("-_.!~*'()", r):
			b.WriteRune(r)
		case r < 0x80:
			b.WriteString(fmt.Sprintf("%%%02X", r))
		default:
			for _, by := range []byte(string(r)) {
				b.WriteString(fmt.Sprintf("%%%02X", by))
			}
		}
	}
	return b.String()
}

func escapeAttr(s string) string {
	replacer := strings.NewReplacer("&", "&amp;", "\"", "&quot;", "<", "&lt;", ">", "&gt;")
	return replacer.Replace(s)
}

var (
	svgWidthRe   = regexp.MustCompile(`<svg[^>]*\swidth="([0-9.]+)"`)
	svgHeightRe  = regexp.MustCompile(`<svg[^>]*\sheight="([0-9.]+)"`)
	svgViewBoxRe = regexp.MustCompile(`viewBox="([^"]+)"`)
	svgPathRe    = regexp.MustCompile(`<path\b[^>]*>`)
	svgFillRe    = regexp.MustCompile(`\sfill="([^"]*)"`)
	svgDRe       = regexp.MustCompile(`\sd="([^"]*)"`)
)

// AuditSVG checks the structural promises in rule 127. It returns human-readable
// issues; an empty slice means the document is safe to place and export.
func AuditSVG(svg string) []string {
	var issues []string
	if !strings.HasPrefix(svg, `<?xml`) {
		issues = append(issues, "missing XML declaration")
	}
	if !strings.Contains(svg, `xmlns="http://www.w3.org/2000/svg"`) {
		issues = append(issues, "missing SVG namespace")
	}
	if !strings.Contains(svg, `data-avnac-vector-board="1"`) {
		issues = append(issues, "missing vector-board marker")
	}
	for _, bad := range []string{"NaN", "Infinity", "style=", "<script"} {
		if strings.Contains(svg, bad) {
			issues = append(issues, fmt.Sprintf("contains %q", bad))
		}
	}
	wm := svgWidthRe.FindStringSubmatch(svg)
	hm := svgHeightRe.FindStringSubmatch(svg)
	vm := svgViewBoxRe.FindStringSubmatch(svg)
	if wm == nil || hm == nil || vm == nil {
		issues = append(issues, "root is missing width, height or viewBox")
		return issues
	}
	width, _ := strconv.ParseFloat(wm[1], 64)
	height, _ := strconv.ParseFloat(hm[1], 64)
	parts := strings.Fields(strings.ReplaceAll(vm[1], ",", " "))
	if len(parts) != 4 {
		issues = append(issues, "viewBox does not have four numbers")
		return issues
	}
	nums := make([]float64, 4)
	for i, p := range parts {
		v, err := strconv.ParseFloat(p, 64)
		if err != nil {
			issues = append(issues, "viewBox has a non-numeric value")
			return issues
		}
		nums[i] = v
	}
	if math.Abs(nums[2]-width) > 0.01 || math.Abs(nums[3]-height) > 0.01 {
		issues = append(issues, "viewBox does not match width/height")
	}
	if nums[0] != 0 || nums[1] != 0 {
		issues = append(issues, "viewBox origin is not 0 0")
	}
	for _, tag := range svgPathRe.FindAllString(svg, -1) {
		fill := svgFillRe.FindStringSubmatch(tag)
		if fill == nil {
			issues = append(issues, "a path does not declare fill")
			continue
		}
		d := svgDRe.FindStringSubmatch(tag)
		if d == nil {
			issues = append(issues, "a path has no d attribute")
			continue
		}
		if fill[1] != "none" && !strings.Contains(d[1], "Z") {
			issues = append(issues, "an open path carries a fill")
		}
	}
	return issues
}
