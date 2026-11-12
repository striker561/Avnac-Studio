package mcp

import (
	"context"
	"fmt"
	"regexp"
	"sort"
	"strings"

	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"

	"Avnac/internal/skill"
)

// The design library ships twice on purpose, the same way SpriteWare exposes
// its skill tree.
//
//	skill://avnac-design      the entry document: routing table and gates
//	skill://poster            one task workflow
//	references://typography   one lookup note (thresholds, tables, formats)
//	rules://24-typographic-hierarchy  one authoritative principle
//	rules://index             the rule index by domain
//
// A client that installs nothing still reads the whole library on demand. The
// files are embedded in the binary, so every URI is guaranteed to resolve —
// internal/skill's tests enforce that before a build ships.
const (
	designSkillScheme     = "skill://"
	designReferenceScheme = "references://"
	designRuleScheme      = "rules://"

	// designEntryURI is the routing table; agents start here.
	designEntryURI = designSkillScheme + "avnac-design"
	// designRuleIndexURI answers with rules/README.md.
	designRuleIndexURI = designRuleScheme + "index"

	// designMIME is the only media type the library serves.
	designMIME = "text/markdown"

	// designDescriptionLimit keeps resource descriptions to a single readable
	// line in a client's resource list; the full text is in the resource.
	designDescriptionLimit = 150
)

// designResource is one published document, before it becomes an MCP Resource.
type designResource struct {
	URI         string
	Name        string
	Description string
	Body        string
}

// designLinkPatterns rewrite the relative markdown links the library uses on
// disk into MCP URIs. Without this, an agent reading skill://poster would see
// a link to "../rules/24-typographic-hierarchy.md", which means nothing over
// MCP; with it, the link is directly readable. This is the one transformation
// the served copy needs.
var designLinkPatterns = []struct {
	re   *regexp.Regexp
	repl string
}{
	{regexp.MustCompile(`\]\((?:\.\./)?rules/([A-Za-z0-9._-]+)\.md\)`), "](rules://$1)"},
	{regexp.MustCompile(`\]\((?:\.\./)?references/([A-Za-z0-9._-]+)\.md\)`), "](references://$1)"},
	{regexp.MustCompile(`\]\((?:\.\./)?([a-z]+)/SKILL\.md\)`), "](skill://$1)"},
	// rules/README.md links its neighbours by bare file name, e.g. `(24-typographic-hierarchy.md)`.
	{regexp.MustCompile(`\]\((\d{2,3}-[a-z0-9-]+)\.md\)`), "](rules://$1)"},
}

// linkToResource converts the library's relative links to MCP URIs so a served
// document is navigable inside a client.
func linkToResource(markdown string) string {
	for _, p := range designLinkPatterns {
		markdown = p.re.ReplaceAllString(markdown, p.repl)
	}
	// Frontmatter parsing leaves the blank line that separated it from the body,
	// so a skill resource began with an empty line. Trim it: the first line of a
	// markdown resource should be the title a client previews.
	return strings.TrimLeft(markdown, "\n")
}

// designResources builds the published list: the entry document, every task
// skill, every reference, every rule, and the rule index. Order is stable so a
// client's resource list does not shuffle between launches.
func designResources(lib *skill.Library) ([]designResource, error) {
	if lib == nil || lib.Entry() == nil {
		return nil, fmt.Errorf("mcp: design library is empty")
	}

	out := make([]designResource, 0, len(lib.RuleIDs())+len(lib.SkillNames())+len(lib.ReferenceNames())+2)

	entry := lib.Entry()
	out = append(out, designResource{
		URI:         designEntryURI,
		Name:        "avnac-design",
		Description: shorten(entry.Description, designDescriptionLimit),
		Body:        linkToResource(entry.Body),
	})

	for _, name := range lib.SkillNames() {
		s, ok := lib.Skill(name)
		if !ok {
			continue
		}
		out = append(out, designResource{
			URI:         designSkillScheme + s.Name,
			Name:        s.Name,
			Description: shorten(s.Description, designDescriptionLimit),
			Body:        linkToResource(s.Body),
		})
	}

	for _, name := range lib.ReferenceNames() {
		r, ok := lib.Reference(name)
		if !ok {
			continue
		}
		out = append(out, designResource{
			URI:         designReferenceScheme + r.Name,
			Name:        r.Name,
			Description: "Reference: " + r.Title,
			Body:        linkToResource(r.Body),
		})
	}

	for _, id := range lib.RuleIDs() {
		r, ok := lib.Rule(id)
		if !ok {
			continue
		}
		out = append(out, designResource{
			URI:         designRuleScheme + r.ID,
			Name:        r.ID,
			Description: shorten(r.Title+" — "+r.Domain+" rule", designDescriptionLimit),
			Body:        linkToResource(r.Body),
		})
	}

	index, err := lib.RuleIndexBody()
	if err != nil {
		return nil, fmt.Errorf("mcp: rule index: %w", err)
	}
	out = append(out, designResource{
		URI:         designRuleIndexURI,
		Name:        "index",
		Description: "Every rule by domain, with counts and links.",
		Body:        linkToResource(index),
	})

	sort.SliceStable(out, func(i, j int) bool { return out[i].URI < out[j].URI })
	return out, nil
}

// RegisterResources publishes the embedded design library as MCP resources.
// It is called once from Start, after the tools and prompts are registered.
func (m *AvnacMCP) RegisterResources() error {
	lib, err := skill.Default()
	if err != nil {
		return fmt.Errorf("mcp: load design library: %w", err)
	}
	return registerDesignResources(m.server, lib)
}

// registerDesignResources is the testable half: it registers into any SDK
// server, so an in-memory client can list and read the resources end to end.
func registerDesignResources(srv *sdkmcp.Server, lib *skill.Library) error {
	resources, err := designResources(lib)
	if err != nil {
		return err
	}

	bodies := make(map[string]string, len(resources))
	for _, r := range resources {
		uri := r.URI
		bodies[uri] = r.Body

		srv.AddResource(&sdkmcp.Resource{
			URI:         uri,
			Name:        r.Name,
			Description: r.Description,
			MIMEType:    designMIME,
		}, func(_ context.Context, req *sdkmcp.ReadResourceRequest) (*sdkmcp.ReadResourceResult, error) {
			body, ok := bodies[req.Params.URI]
			if !ok {
				return nil, sdkmcp.ResourceNotFoundError(req.Params.URI)
			}
			return &sdkmcp.ReadResourceResult{
				Contents: []*sdkmcp.ResourceContents{{
					URI:      req.Params.URI,
					MIMEType: designMIME,
					Text:     body,
				}},
			}, nil
		})
	}
	return nil
}

// designResourceIndex is appended to the server instructions so an agent knows
// the library exists before its first tool call.
//
// The 112 rules collapse to one line on purpose: instructions are paid for on
// every message, and rules://index names them all without spending that
// context up front. This is the same trade SpriteWare makes with its subject
// chapters.
func designResourceIndex(lib *skill.Library) string {
	var sb strings.Builder
	sb.WriteString("\n\n## On-demand reading (MCP resources)\n\n")
	sb.WriteString("The design library is served as resources. Read the one the task needs rather than guessing:\n")
	sb.WriteString("- `" + designEntryURI + "` — entry point: routing table, always-on gates, how to read a rule.\n")
	sb.WriteString(fmt.Sprintf("- `skill://<task>` — %d task workflows: %s.\n",
		len(lib.SkillNames()), strings.Join(lib.SkillNames(), ", ")))
	sb.WriteString(fmt.Sprintf("- `references://<subject>` — %d lookup notes: %s.\n",
		len(lib.ReferenceNames()), strings.Join(lib.ReferenceNames(), ", ")))
	sb.WriteString(fmt.Sprintf("- `%s` — all %d rules by domain, with links.\n", designRuleIndexURI, len(lib.RuleIDs())))
	sb.WriteString("- `rules://<id>` — one authoritative principle, e.g. `rules://24-typographic-hierarchy`, `rules://82-bleed-trim-and-safe-areas`.\n")
	sb.WriteString("Start at `" + designEntryURI + "`, then the task skill, then the 4–8 rules it links. Cite the rule you followed when you report a design decision.\n")
	return sb.String()
}

// shorten trims a description to a readable line without cutting a word.
func shorten(s string, limit int) string {
	s = strings.Join(strings.Fields(s), " ")
	if len(s) <= limit {
		return s
	}
	cut := strings.LastIndex(s[:limit], " ")
	if cut < limit/2 {
		cut = limit
	}
	return strings.TrimRight(s[:cut], " ,.;:") + "…"
}
