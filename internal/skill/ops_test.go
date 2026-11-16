package skill

import (
	"strings"
	"testing"
)

// The library's contract with the tools: a rule names the op that performs the
// work, and the op exists. SpriteWare holds each grid template to the format
// draw accepts; this holds each cited op to the surface this build publishes.
// Without it the rules drift into mentioning a tool that was renamed or an op
// that was never added, and an agent that follows one learns to stop following
// the library.

// TestOpCitationsParseBothSpellings pins the parser the other tests trust.
func TestOpCitationsParseBothSpellings(t *testing.T) {
	text := "Set it with `elements` op=render, then `vector` op `update`, and read `get_canvas_image`."
	got := OpCitations(text)
	if len(got) != 2 {
		t.Fatalf("citations = %v, want 2", got)
	}
	if got[0] != (OpCitation{Tool: "elements", Op: "render"}) {
		t.Errorf("first = %v, want elements/render", got[0])
	}
	if got[1] != (OpCitation{Tool: "vector", Op: "update"}) {
		t.Errorf("second = %v", got[1])
	}
}

// TestRulesCiteKnownOps is the rule contract: the Techniques section opens with
// an ops paragraph, every citation is a real op, and the first Verification
// item is the receipt that runs one. The order matters: guide digests print
// the first two Verification items, so a command buried at the bottom is a
// command that never reaches the agent.
func TestRulesCiteKnownOps(t *testing.T) {
	lib := testLibrary(t)
	for _, id := range lib.RuleIDs() {
		r := lib.rules[id]
		techniques := r.Section("Techniques")
		if !strings.HasPrefix(strings.TrimSpace(techniques), "**Avnac ops:**") {
			t.Errorf("%s: Techniques does not open with '**Avnac ops:**'", r.Path)
		}
		citations := OpCitations(r.Body)
		if len(citations) == 0 {
			t.Errorf("%s: cites no tool op", r.Path)
		}
		for _, citation := range citations {
			if reason := CitationError(citation); reason != "" {
				t.Errorf("%s: %s", r.Path, reason)
			}
		}
		checks := r.Checks()
		if len(checks) == 0 {
			t.Errorf("%s: has no Verification checks", r.Path)
			continue
		}
		if !HasCommand(checks[0]) {
			t.Errorf("%s: first Verification item is not an ops receipt: %q", r.Path, checks[0])
		}
	}
}

// TestEveryWorkflowNamesItsOps is the workflow half: a task procedure that does
// not say which tool performs each step is an essay, and the entry document
// tells the agent to read it as a procedure.
func TestEveryWorkflowNamesItsOps(t *testing.T) {
	lib := testLibrary(t)
	for _, name := range lib.SkillNames() {
		s := lib.skills[name]
		body := s.Body
		if !strings.Contains(body, "## Avnac ops") {
			t.Errorf("%s: has no '## Avnac ops' section", s.Path)
		}
		citations := OpCitations(body)
		if len(citations) < 2 {
			t.Errorf("%s: cites %d ops, want at least 2", s.Path, len(citations))
		}
		for _, citation := range citations {
			if reason := CitationError(citation); reason != "" {
				t.Errorf("%s: %s", s.Path, reason)
			}
		}
	}
}

// TestOpsReferenceListsEveryOp keeps references/avnac-ops.md complete: the
// catalogue is the page an agent reads before writing a rule, so an op missing
// from it is an op the next rule will not cite. It also catches the opposite
// drift — a reference advertising an op the build dropped.
func TestOpsReferenceListsEveryOp(t *testing.T) {
	lib := testLibrary(t)
	ref, ok := lib.Reference("avnac-ops")
	if !ok {
		t.Fatal("references/avnac-ops.md is missing")
	}
	for _, op := range AvnacOps {
		if !strings.Contains(ref.Body, "`"+op.Tool+"`") {
			t.Errorf("avnac-ops does not name tool %q", op.Tool)
		}
		if op.Op != "" && !strings.Contains(ref.Body, "op="+op.Op) {
			t.Errorf("avnac-ops does not list %s op=%s", op.Tool, op.Op)
		}
	}
	for _, citation := range OpCitations(ref.Body) {
		if reason := CitationError(citation); reason != "" {
			t.Errorf("avnac-ops: %s", reason)
		}
	}
}

// TestReferencesNameTheirOps is the lookup half of the same contract. A
// reference is where an agent goes for a number, and a number without the call
// that applies it is the page that sends it back to the rules. The catalogue
// itself is exempt: it is the list.
func TestReferencesNameTheirOps(t *testing.T) {
	lib := testLibrary(t)
	for _, name := range lib.ReferenceNames() {
		if name == "avnac-ops" {
			continue
		}
		ref := lib.refs[name]
		if !strings.Contains(ref.Body, "**Avnac ops:**") {
			t.Errorf("%s: has no '**Avnac ops:**' paragraph", ref.Path)
		}
		if !HasCommand(ref.Body) {
			t.Errorf("%s: names no callable operation", ref.Path)
		}
		for _, citation := range OpCitations(ref.Body) {
			if reason := CitationError(citation); reason != "" {
				t.Errorf("%s: %s", ref.Path, reason)
			}
		}
	}
}

// TestOpsHaveDescriptions keeps the catalogue useful as reference prose rather
// than a bare list: an op without a sentence is one the rules cannot explain.
func TestOpsHaveDescriptions(t *testing.T) {
	for _, op := range AvnacOps {
		if strings.TrimSpace(op.Does) == "" {
			t.Errorf("%s op=%s has no description", op.Tool, op.Op)
		}
	}
}
