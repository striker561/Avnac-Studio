package skill

import (
	"strconv"
	"strings"
	"testing"
)

// These are eval cases, not unit tests: each one states the routing a real
// request should produce. They exist because the vector section is only useful
// if the router actually reaches it — a rule nobody reads is dead weight.
//
// If a case fails, fix the wording of the description / "Applies when" section
// or the rule titles. Do not delete the case unless the product decision has
// changed.

func rankOf(routes []Route, want string) int {
	for i, r := range routes {
		if r.Skill.Name == want {
			return i
		}
	}
	return -1
}

func TestVectorEvalRouting(t *testing.T) {
	lib := testLibrary(t)

	cases := []struct {
		task string
		want string
		// maxRank 0 means "must be the top route"; 2 means "in the top three".
		maxRank int
		why     string
	}{
		{"draw a geometric fox as clean vectors, editable paths only", "vector", 0, "explicit vector work"},
		{"the curves on this icon look lumpy, fix the bezier handles", "vector", 0, "path repair"},
		{"make a symmetric butterfly from paths and mirror the left wing", "vector", 0, "mirror + path construction"},
		{"vectorize this shape and remove the path overlaps before export", "vector", 0, "boolean/overlap cleanup"},
		{"export an SVG with the right viewBox and no stray paths", "vector", 1, "SVG generation, export may rank first"},
		{"the exported SVG renders wrong: stray paths and a bad viewBox", "vector", 0, "SVG validation"},
		{"draw a tiny rocket illustration as SVG for a favicon", "vector", 1, "draw + SVG, could read as icon work"},
		{"build a radial mandala from one repeated petal", "vector", 1, "symmetry repeat"},
		{"draw a mascot as editable vector paths", "vector", 0, "draw + vector"},
	}
	for _, tc := range cases {
		routes := lib.Route(tc.task, 5)
		rank := rankOf(routes, tc.want)
		if rank < 0 || rank > tc.maxRank {
			names := make([]string, 0, 3)
			for i, r := range routes {
				if i == 3 {
					break
				}
				names = append(names, r.Skill.Name)
			}
			t.Errorf("Route(%q) put %q at rank %d (want <= %d) [%s]; top routes: %v",
				tc.task, tc.want, rank+1, tc.maxRank+1, tc.why, names)
		}
	}
}

// Vector must not steal requests that belong to another workflow. The check is
// deliberately "not the top route" rather than "not present": related skills
// may legitimately appear in the top three.
func TestVectorEvalDoesNotOverTrigger(t *testing.T) {
	lib := testLibrary(t)

	cases := []struct {
		task string
		want string
	}{
		{"design an A2 gig poster for a jazz trio", "poster"},
		{"set up bleed, crop marks and CMYK for the printer", "print"},
		{"pair a serif with a geometric sans for a book cover", "typography"},
		{"my logo disappears when it is 16 pixels wide", "logo"},
		{"build a 12 column grid for a 32 page magazine", "layout"},
		{"the dashboard chart labels are unreadable", "visualize"},
		{"draw up a brand guideline document for a bakery", "brand"},
	}
	for _, tc := range cases {
		routes := lib.Route(tc.task, 5)
		if len(routes) == 0 {
			t.Fatalf("Route(%q) returned nothing", tc.task)
		}
		if rankOf(routes, "vector") == 0 {
			t.Errorf("Route(%q) was captured by vector; want %q first", tc.task, tc.want)
		}
		if got := routes[0].Skill.Name; got != tc.want {
			t.Errorf("Route(%q) top = %q, want %q", tc.task, got, tc.want)
		}
	}
}

// A routed vector task must actually assemble the vector reading list: the
// skill body, most of the eight rules, and the vector reference.
func TestVectorEvalPlanGathersMaterial(t *testing.T) {
	lib := testLibrary(t)

	plan, err := lib.Plan("draw a geometric fox as clean vector paths and export SVG", 8)
	if err != nil {
		t.Fatalf("Plan() error: %v", err)
	}
	if plan.Skill == nil || plan.Skill.Name != "vector" {
		t.Fatalf("Plan().Skill = %v, want vector", plan.Skill)
	}
	if len(plan.Rules) < 8 {
		t.Errorf("plan has %d rules, want at least the 8 the skill links", len(plan.Rules))
	}
	found := 0
	for id := 120; id <= 127; id++ {
		prefix := fmtTwoDigits(id) + "-"
		for _, r := range plan.Rules {
			if strings.HasPrefix(r.ID, prefix) {
				found++
				break
			}
		}
	}
	if found != 8 {
		t.Errorf("plan includes %d of the 8 vector rules", found)
	}
	var haveReference bool
	for _, ref := range plan.References {
		if ref.Name == "vector-graphics" {
			haveReference = true
		}
	}
	if !haveReference {
		t.Error("plan does not include references/vector-graphics.md")
	}
	if !strings.Contains(plan.Markdown, "Magic triangle") && !strings.Contains(plan.Markdown, "magic triangle") {
		t.Error("plan markdown does not contain the path-construction material")
	}
}

func fmtTwoDigits(n int) string {
	return strconv.Itoa(n)
}

// Each vector rule should be the top search hit for the question it answers.
func TestVectorEvalSearchFindsRule(t *testing.T) {
	lib := testLibrary(t)

	cases := []struct {
		query string
		want  string
	}{
		{"magic triangle handles inside the segment", "125-bezier-curves-and-path-construction"},
		{"zero handle hidden in a node", "125-bezier-curves-and-path-construction"},
		{"balanced handles hang through", "125-bezier-curves-and-path-construction"},
		{"path direction winding holes fill rule", "126-vector-boolean-operations-and-composition"},
		{"double overlap white gap", "126-vector-boolean-operations-and-composition"},
		{"viewBox equals artboard validation", "127-svg-generation-and-validation"},
		{"mirror symmetry reverse winding", "124-symmetry-and-transformations"},
		{"left of gap constraint solver", "123-spatial-constraints-and-relationships"},
		{"scene graph layer z order ids", "120-vector-scene-graphs"},
		{"circle four cubics kappa", "122-geometric-primitives-and-construction"},
		{"board units local transform frame", "121-vector-coordinate-systems"},
	}
	for _, tc := range cases {
		hits := lib.Search(tc.query, 8)
		if len(hits) == 0 {
			t.Errorf("Search(%q) returned nothing", tc.query)
			continue
		}
		found := -1
		for i, h := range hits {
			if h.Rule.ID == tc.want {
				found = i
				break
			}
		}
		if found == -1 || found > 2 {
			got := make([]string, 0, 3)
			for i, h := range hits {
				if i == 3 {
					break
				}
				got = append(got, h.Rule.ID)
			}
			t.Errorf("Search(%q) put %q at rank %d; top hits: %v", tc.query, tc.want, found+1, got)
		}
	}
}

// The skill must be readable over the same paths resources.go will serve: every
// rule it links and the reference it names must exist in the embedded library.
func TestVectorSkillLinksResolve(t *testing.T) {
	lib := testLibrary(t)
	s, ok := lib.Skill("vector")
	if !ok {
		t.Fatal("vector skill is not registered")
	}
	if len(s.Rules) < 8 {
		t.Errorf("vector skill links %d rules, want 8", len(s.Rules))
	}
	for _, id := range s.Rules {
		if _, ok := lib.Rule(id); !ok {
			t.Errorf("vector skill links missing rule %q", id)
		}
	}
	var haveVectorReference bool
	for _, name := range s.References {
		if name == "vector-graphics" {
			haveVectorReference = true
		}
	}
	if !haveVectorReference {
		t.Errorf("vector skill references = %v, want vector-graphics included", s.References)
	}
	if _, ok := lib.Reference("vector-graphics"); !ok {
		t.Error("vector-graphics reference is not registered")
	}
}
