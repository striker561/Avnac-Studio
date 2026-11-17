package skill

import (
	"regexp"
	"strings"
)

// Avnac's tool surface, as data. A rule is supposed to name the op that
// performs it, not describe the work in the abstract, and a rule that cites an
// op this build does not publish is worse than one that cites none: the agent
// calls it, gets an unknown-op error, and stops trusting the library.
//
// The catalogue is the single list the tests hold the rules and workflows to.
// It is deliberately hand-kept rather than reflected out of avnac-system/mcp:
// the skill package is imported BY the MCP server, so importing it back would
// be a cycle. TestSkillOpsMatchTheServer in avnac-system/mcp compares this list
// with what the server actually registers, which is the direction that has no
// cycle.
//
// Reads are published one per tool and have no op, so Op is empty for them.
var AvnacOps = []Op{
	// canvas — the project, its pages and the artboard.
	{Tool: "canvas", Op: "create"},
	{Tool: "canvas", Op: "add-page"},
	{Tool: "canvas", Op: "go-page"},
	{Tool: "canvas", Op: "rename-page"},
	{Tool: "canvas", Op: "delete-page"},
	{Tool: "canvas", Op: "clear"},
	{Tool: "canvas", Op: "background"},
	{Tool: "canvas", Op: "preset"},
	{Tool: "canvas", Op: "resize"},
	{Tool: "canvas", Op: "snapshot"},
	{Tool: "canvas", Op: "restore"},
	{Tool: "canvas", Op: "undo"},
	{Tool: "canvas", Op: "redo"},
	{Tool: "canvas", Op: "status"},
	{Tool: "canvas", Op: "validate"},

	// elements — create, change, remove and measure canvas elements.
	{Tool: "elements", Op: "render"},
	{Tool: "elements", Op: "modify"},
	{Tool: "elements", Op: "delete"},
	{Tool: "elements", Op: "measure"},

	// arrange — the current selection.
	{Tool: "arrange", Op: "align"},
	{Tool: "arrange", Op: "distribute"},
	{Tool: "arrange", Op: "group"},
	{Tool: "arrange", Op: "ungroup"},
	{Tool: "arrange", Op: "fit"},
	{Tool: "arrange", Op: "select"},

	// files — saved canvases.
	{Tool: "files", Op: "list"},
	{Tool: "files", Op: "open"},
	{Tool: "files", Op: "rename"},

	// assets — external material.
	{Tool: "assets", Op: "unsplash"},
	{Tool: "assets", Op: "fonts"},
	{Tool: "assets", Op: "stickers"},

	// export — output.
	{Tool: "export", Op: "png"},
	{Tool: "export", Op: "object"},
	{Tool: "export", Op: "svg"},

	// vector — original path artwork.
	{Tool: "vector", Op: "draw"},
	{Tool: "vector", Op: "update"},
	{Tool: "vector", Op: "read"},
	{Tool: "vector", Op: "export"},
	{Tool: "vector", Op: "delete"},
	{Tool: "vector", Op: "list"},
	{Tool: "vector", Op: "status"},
	{Tool: "vector", Op: "recover"},

	// Reads — one tool per operation, no op argument.
	{Tool: "get_canvas_summary"},
	{Tool: "get_canvas_state"},
	{Tool: "get_canvas_image"},
	{Tool: "list_objects"},
	{Tool: "get_object_properties"},
	{Tool: "get_selection"},
	{Tool: "guide"},
}

// Op is one published operation: a tool plus an op (empty for a read tool).
type Op struct {
	Tool string
	Op   string
}

// OpCitation is one `tool` op=value reference found in prose.
type OpCitation struct {
	Tool string
	Op   string
}

// opCitationRe matches the two spellings the library uses: `elements` op=render
// (the form this library standardises on) and `vector` op `draw` (the form
// SpriteWare writes and a reader may copy). It intentionally does not match a
// bare tool name, so "get_canvas_image" stays a read.
var opCitationRe = regexp.MustCompile("\x60([a-z][a-z0-9_]*)\x60\\s+op(?:=|\\s+)\x60?([a-z][a-z0-9-]*)\x60?")

// OpCitations returns every `tool` op value citation in text, in order.
func OpCitations(text string) []OpCitation {
	matches := opCitationRe.FindAllStringSubmatch(text, -1)
	out := make([]OpCitation, 0, len(matches))
	for _, m := range matches {
		out = append(out, OpCitation{Tool: m[1], Op: m[2]})
	}
	return out
}

// HasCommand reports whether text names a callable operation: either a
// `tool` op=value citation, or a read tool named in backticks. A read has no
// op but is still a command the agent runs, so a receipt built on
// `get_canvas_image` is as executable as one built on `canvas` op=validate.
func HasCommand(text string) bool {
	if len(OpCitations(text)) > 0 {
		return true
	}
	for _, candidate := range AvnacOps {
		if candidate.Op != "" {
			continue
		}
		if strings.Contains(text, "`"+candidate.Tool+"`") {
			return true
		}
	}
	return false
}

// CitationError names an op a rule cites that this build does not publish.
func CitationError(c OpCitation) string {
	found := false
	for _, candidate := range AvnacOps {
		if candidate.Tool != c.Tool {
			continue
		}
		found = true
		if candidate.Op == c.Op {
			return ""
		}
	}
	if !found {
		return "unknown tool " + c.Tool
	}
	return c.Tool + " has no op " + c.Op
}
