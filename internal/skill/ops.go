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
	{Tool: "canvas", Op: "create", Does: "start a new project at an explicit width and height"},
	{Tool: "canvas", Op: "add-page", Does: "add a named blank page to the open project and switch to it"},
	{Tool: "canvas", Op: "go-page", Does: "switch the active page"},
	{Tool: "canvas", Op: "rename-page", Does: "rename a page"},
	{Tool: "canvas", Op: "delete-page", Does: "delete a page, never the last one"},
	{Tool: "canvas", Op: "clear", Does: "remove every object on the current page"},
	{Tool: "canvas", Op: "background", Does: "set the current page background"},
	{Tool: "canvas", Op: "preset", Does: "resize the artboard to a standard preset"},
	{Tool: "canvas", Op: "resize", Does: "change the artboard size in place"},
	{Tool: "canvas", Op: "snapshot", Does: "capture every page and return a restore token"},
	{Tool: "canvas", Op: "restore", Does: "return to a snapshot token"},
	{Tool: "canvas", Op: "undo", Does: "step back through object and page history"},
	{Tool: "canvas", Op: "redo", Does: "step forward through object and page history"},
	{Tool: "canvas", Op: "status", Does: "report the connected client, revision and implemented actions"},
	{Tool: "canvas", Op: "validate", Does: "audit bounds, contrast, type, strokes, tangencies and fonts with measured rule checks"},

	// elements — create, change, remove and measure canvas elements.
	{Tool: "elements", Op: "render", Does: "place a batch of elements in one call, bottom to top"},
	{Tool: "elements", Op: "modify", Does: "update existing objects by id or unique name"},
	{Tool: "elements", Op: "delete", Does: "remove an object, or the current selection"},
	{Tool: "elements", Op: "measure", Does: "measure proposed elements without drawing them"},

	// arrange — the current selection.
	{Tool: "arrange", Op: "align", Does: "align objects to the artboard or each other, including cap-middle"},
	{Tool: "arrange", Op: "distribute", Does: "even the gaps between three or more objects"},
	{Tool: "arrange", Op: "group", Does: "group two or more objects"},
	{Tool: "arrange", Op: "ungroup", Does: "dissolve a group"},
	{Tool: "arrange", Op: "fit", Does: "scale the selection to the artboard with padding"},
	{Tool: "arrange", Op: "select", Does: "select objects by id"},

	// files — saved canvases.
	{Tool: "files", Op: "list", Does: "list saved canvases with id, name, size and updated time"},
	{Tool: "files", Op: "open", Does: "open a saved canvas as the active scene"},
	{Tool: "files", Op: "rename", Does: "rename a saved canvas and the open editor title"},

	// assets — external material.
	{Tool: "assets", Op: "unsplash", Does: "search Unsplash photos and report the remaining quota"},
	{Tool: "assets", Op: "fonts", Does: "list supported Google Fonts and verify requested families"},
	{Tool: "assets", Op: "stickers", Does: "list built-in stickers"},

	// export — output.
	{Tool: "export", Op: "png", Does: "export the artboard as a PNG at a multiplier"},
	{Tool: "export", Op: "object", Does: "export one object or group as PNG or SVG"},
	{Tool: "export", Op: "svg", Does: "export the page or selection as editable SVG"},

	// vector — original path artwork.
	{Tool: "vector", Op: "draw", Does: "resolve a scene-graph IR and place it as editable paths"},
	{Tool: "vector", Op: "update", Does: "edit a stored board by object id"},
	{Tool: "vector", Op: "read", Does: "return the board IR and resolved document"},
	{Tool: "vector", Op: "export", Does: "return the self-contained SVG source"},
	{Tool: "vector", Op: "delete", Does: "remove the placed drawing"},
	{Tool: "vector", Op: "list", Does: "list the boards created this session"},
	{Tool: "vector", Op: "status", Does: "check whether a board's node is actually placed"},
	{Tool: "vector", Op: "recover", Does: "adopt or retry a placement after a lost response"},

	// Reads — one tool per operation, no op argument.
	{Tool: "get_canvas_summary", Does: "document, active page, every page and a semantic object summary"},
	{Tool: "get_canvas_state", Does: "raw scene state"},
	{Tool: "get_canvas_image", Does: "PNG of the artboard or one object, optionally annotated"},
	{Tool: "list_objects", Does: "object ids and types on the canvas"},
	{Tool: "get_object_properties", Does: "one object's bounds and styles, plus text cap metrics"},
	{Tool: "get_selection", Does: "the selected objects and their properties"},
	{Tool: "guide", Does: "route a brief to the workflow and rules that apply"},
}

// Op is one published operation: a tool plus an op (empty for a read tool).
type Op struct {
	Tool string
	Op   string
	Does string
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

// KnownOp reports whether the tool publishes the op. A read tool with an empty
// op matches Op: "".
func KnownOp(tool, op string) bool {
	for _, candidate := range AvnacOps {
		if candidate.Tool == tool && candidate.Op == op {
			return true
		}
	}
	return false
}

// KnownTool reports whether the name is one of Avnac's published tools.
func KnownTool(tool string) bool {
	for _, candidate := range AvnacOps {
		if candidate.Tool == tool {
			return true
		}
	}
	return false
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
	if !KnownTool(c.Tool) {
		return "unknown tool " + c.Tool
	}
	if !KnownOp(c.Tool, c.Op) {
		return c.Tool + " has no op " + c.Op
	}
	return ""
}
