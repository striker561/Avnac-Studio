package mcp

import (
	"context"
	"testing"

	"Avnac/internal/skill"
)

// The skill package keeps its own op catalogue so a rule can be tested without
// importing the server (the server imports the skill package, so the reverse
// would be a cycle). This test closes the loop in the only direction that has
// no cycle: every op the rules may cite is compared with the surface a real
// client session sees. A tool renamed in registration, or an op added there and
// not catalogued, fails here.
func TestSkillOpsMatchTheServer(t *testing.T) {
	m := NewAvnacMCP(nil, nil, nil)
	m.RegisterTools(context.Background())

	surface, err := m.ToolSurface()
	if err != nil {
		t.Fatalf("ToolSurface: %v", err)
	}
	served := make(map[string]map[string]bool, len(surface.Tools))
	for _, tool := range surface.Tools {
		ops := make(map[string]bool, len(tool.Ops))
		for _, op := range tool.Ops {
			ops[op.Op] = true
		}
		served[tool.Name] = ops
	}

	catalogued := make(map[string]map[string]bool)
	for _, op := range skill.AvnacOps {
		if catalogued[op.Tool] == nil {
			catalogued[op.Tool] = make(map[string]bool)
		}
		catalogued[op.Tool][op.Op] = true

		ops, ok := served[op.Tool]
		if !ok {
			t.Errorf("catalogue names tool %q, which the server does not publish", op.Tool)
			continue
		}
		if op.Op != "" && !ops[op.Op] {
			t.Errorf("catalogue names %s op=%s, which the server does not publish", op.Tool, op.Op)
		}
	}

	for tool, ops := range served {
		for op := range ops {
			// guide is recorded with a synthetic "task" op so the settings
			// panel can show it; it is not a callable op.
			if tool == "guide" {
				continue
			}
			if !catalogued[tool][op] {
				t.Errorf("server publishes %s op=%s but the catalogue omits it; rules cannot cite it", tool, op)
			}
		}
	}
}
