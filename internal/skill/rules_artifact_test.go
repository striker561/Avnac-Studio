package skill

import (
	"encoding/json"
	"encoding/xml"
	"math"
	"regexp"
	"strconv"
	"strings"
	"testing"

	"Avnac/internal/vector"
)

// Rule examples are executable documentation. A fence marked "json vector" is
// the payload `vector` op `draw` resolves; a fence marked "svg" is the file rule
// 127 promises a viewer can open. Both go through the same code the tools call,
// so a schema change cannot leave a dead example behind. This is the Avnac
// equivalent of SpriteWare's rule that every grid template compiles.

type ruleFence struct {
	Info string
	Lang string
	Body string
	Line int
}

// fencesInRule returns every fenced code block in a rule, in file order.
func fencesInRule(r *Rule) []ruleFence {
	var out []ruleFence
	var cur *ruleFence
	for i, line := range strings.Split(r.Body, "\n") {
		if strings.HasPrefix(strings.TrimSpace(line), "```") {
			if cur != nil {
				out = append(out, *cur)
				cur = nil
				continue
			}
			info := strings.TrimSpace(strings.TrimPrefix(strings.TrimSpace(line), "```"))
			lang := ""
			if fields := strings.Fields(info); len(fields) > 0 {
				lang = strings.ToLower(fields[0])
			}
			cur = &ruleFence{Info: info, Lang: lang, Line: i + 1}
			continue
		}
		if cur != nil {
			cur.Body += line + "\n"
		}
	}
	return out
}

func isVectorArtifact(f ruleFence) bool {
	return f.Lang == "json" && strings.Contains(strings.ToLower(f.Info), "vector")
}

func isSVGArtifact(f ruleFence) bool { return f.Lang == "svg" }

// decodeRuleIR is deliberately strict: a field the real IR does not know about
// is a documentation bug, not something to ignore.
func decodeRuleIR(body string) (vector.IR, error) {
	var ir vector.IR
	dec := json.NewDecoder(strings.NewReader(body))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&ir); err != nil {
		return ir, err
	}
	return ir, nil
}

func TestRuleVectorArtifactsDraw(t *testing.T) {
	lib := testLibrary(t)
	count := 0
	for _, id := range lib.RuleIDs() {
		r := lib.rules[id]
		for _, f := range fencesInRule(r) {
			if !isVectorArtifact(f) {
				continue
			}
			count++
			ir, err := decodeRuleIR(f.Body)
			if err != nil {
				t.Errorf("%s:%d: example does not decode as IR: %v", r.Path, f.Line, err)
				continue
			}
			if len(ir.Objects) == 0 {
				t.Errorf("%s:%d: example has no objects", r.Path, f.Line)
				continue
			}
			seen := make(map[string]bool, len(ir.Objects))
			for _, obj := range ir.Objects {
				if obj.ID == "" {
					t.Errorf("%s:%d: object without an id", r.Path, f.Line)
				}
				if seen[obj.ID] {
					t.Errorf("%s:%d: duplicate object id %q", r.Path, f.Line, obj.ID)
				}
				seen[obj.ID] = true
			}
			res, err := vector.Draw(ir)
			if err != nil {
				t.Errorf("%s:%d: example does not draw: %v", r.Path, f.Line, err)
				continue
			}
			if len(res.Objects) == 0 {
				t.Errorf("%s:%d: draw resolved no objects", r.Path, f.Line)
				continue
			}
			w, h := res.IR.Canvas.Width.Float(), res.IR.Canvas.Height.Float()
			const tol = 0.5
			b := res.Bounds
			if b.MinX < -tol || b.MinY < -tol || b.MaxX > w+tol || b.MaxY > h+tol {
				t.Errorf("%s:%d: resolved bounds (%.2f, %.2f)-(%.2f, %.2f) leave the %.0fx%.0f board",
					r.Path, f.Line, b.MinX, b.MinY, b.MaxX, b.MaxY, w, h)
			}
		}
	}
	if count < 6 {
		t.Errorf("found %d executable vector examples, want at least 6", count)
	}
}

// Every vector rule has to carry at least one example the engine can run: a
// rule about geometry that cannot demonstrate its geometry is advice, not a
// contract.
func TestVectorRulesShipExecutableExamples(t *testing.T) {
	lib := testLibrary(t)
	for _, r := range lib.Rules() {
		if r.Domain != "vector" {
			continue
		}
		var have bool
		for _, f := range fencesInRule(r) {
			if isVectorArtifact(f) || isSVGArtifact(f) {
				have = true
				break
			}
		}
		if !have {
			t.Errorf("%s: no executable example (tag a fence \"json vector\" or \"svg\")", r.Path)
		}
	}
}

type svgRoot struct {
	XMLName xml.Name `xml:"svg"`
	Width   string   `xml:"width,attr"`
	Height  string   `xml:"height,attr"`
	ViewBox string   `xml:"viewBox,attr"`
	XMLNS   string   `xml:"xmlns,attr"`
}

var (
	svgPathTagRe  = regexp.MustCompile(`(?s)<path\b[^>]*>`)
	svgFillAttr   = regexp.MustCompile(`\sfill="`)
	svgStrokeAttr = regexp.MustCompile(`\sstroke="`)
	svgFillRule   = regexp.MustCompile(`\sfill-rule="`)
	svgDRe        = regexp.MustCompile(`\sd="([^"]*)"`)
)

func TestRuleSVGArtifactsValidate(t *testing.T) {
	lib := testLibrary(t)
	count := 0
	for _, id := range lib.RuleIDs() {
		r := lib.rules[id]
		for _, f := range fencesInRule(r) {
			if !isSVGArtifact(f) {
				continue
			}
			count++
			var root svgRoot
			if err := xml.Unmarshal([]byte(f.Body), &root); err != nil {
				t.Errorf("%s:%d: example is not well-formed XML: %v", r.Path, f.Line, err)
				continue
			}
			if root.XMLNS != "http://www.w3.org/2000/svg" {
				t.Errorf("%s:%d: root missing the SVG namespace", r.Path, f.Line)
			}
			for _, bad := range []string{"style=", "<script", "NaN", "Infinity"} {
				if strings.Contains(f.Body, bad) {
					t.Errorf("%s:%d: example contains %q", r.Path, f.Line, bad)
				}
			}
			w, errW := strconv.ParseFloat(strings.TrimSpace(root.Width), 64)
			h, errH := strconv.ParseFloat(strings.TrimSpace(root.Height), 64)
			if errW != nil || errH != nil {
				t.Errorf("%s:%d: width/height are not plain numbers", r.Path, f.Line)
				continue
			}
			vb := strings.Fields(strings.ReplaceAll(root.ViewBox, ",", " "))
			if len(vb) != 4 {
				t.Errorf("%s:%d: viewBox = %q, want four numbers", r.Path, f.Line, root.ViewBox)
				continue
			}
			nums := make([]float64, 4)
			bad := false
			for i, part := range vb {
				v, err := strconv.ParseFloat(part, 64)
				if err != nil {
					t.Errorf("%s:%d: viewBox has a non-number %q", r.Path, f.Line, part)
					bad = true
					break
				}
				nums[i] = v
			}
			if bad {
				continue
			}
			if nums[0] != 0 || nums[1] != 0 {
				t.Errorf("%s:%d: viewBox origin = %v %v, want 0 0", r.Path, f.Line, nums[0], nums[1])
			}
			if math.Abs(nums[2]-w) > 0.01 || math.Abs(nums[3]-h) > 0.01 {
				t.Errorf("%s:%d: viewBox %.0fx%.0f does not match width/height %.0fx%.0f",
					r.Path, f.Line, nums[2], nums[3], w, h)
			}
			for _, tag := range svgPathTagRe.FindAllString(f.Body, -1) {
				if !svgFillAttr.MatchString(tag) && !svgStrokeAttr.MatchString(tag) {
					t.Errorf("%s:%d: a <path> declares neither fill nor stroke", r.Path, f.Line)
				}
				dm := svgDRe.FindStringSubmatch(tag)
				if dm == nil {
					continue
				}
				subpaths := strings.Count(dm[1], "M") + strings.Count(dm[1], "m")
				if subpaths > 1 && !svgFillRule.MatchString(tag) {
					t.Errorf("%s:%d: compound path with %d subpaths has no fill-rule", r.Path, f.Line, subpaths)
				}
			}
		}
	}
	if count == 0 {
		t.Fatal("no SVG examples found in the rules")
	}
}

// rules/README.md is generated, so it is also generated data with a guard: a
// rule that is missing from the index (or listed twice) is a stale index, which
// is the one weakness SpriteWare's hand-maintained index has.
func TestRuleIndexMatchesTheRules(t *testing.T) {
	lib := testLibrary(t)
	index, err := lib.RuleIndexBody()
	if err != nil {
		t.Fatal(err)
	}
	for _, id := range lib.RuleIDs() {
		link := "[" + "`" + id + "`](" + id + ".md)"
		if got := strings.Count(index, link); got != 1 {
			t.Errorf("rules/README.md lists %s %d times, want 1; run node scripts/gen-rule-index.mjs", id, got)
		}
	}
	if want := strconv.Itoa(len(lib.RuleIDs())) + " rule files"; !strings.Contains(index, want) {
		t.Errorf("rules/README.md does not report %q; run node scripts/gen-rule-index.mjs", want)
	}
}

// Verification is the section that makes a rule testable by the agent applying
// it. Three numbered checks is the floor: fewer means the rule is asserting
// something it never asks anyone to look at.
func TestRuleVerificationIsCheckable(t *testing.T) {
	lib := testLibrary(t)
	checkRe := regexp.MustCompile(`(?m)^\d+\.\s+\*\*`)
	for _, id := range lib.RuleIDs() {
		r := lib.rules[id]
		body := r.Section("Verification")
		if n := len(checkRe.FindAllString(body, -1)); n < 3 {
			t.Errorf("%s: Verification has %d numbered checks, want at least 3", r.Path, n)
		}
	}
}
