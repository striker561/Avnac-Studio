package avnacconfig

import "testing"

func TestNormalizeConfigClampsMCPPort(t *testing.T) {
	cases := []struct {
		in   int
		want int
	}{
		{0, 0}, // dynamic is the default and must survive
		{12345, 12345},
		{1024, 1024},
		{65535, 65535},
		{80, 0},    // privileged ports fall back to dynamic
		{70000, 0}, // out of range
		{-5, 0},    // out of range
	}
	for _, c := range cases {
		got := normalizeConfig(&AppConfig{MCPPort: c.in}).MCPPort
		if got != c.want {
			t.Errorf("MCPPort %d normalized to %d, want %d", c.in, got, c.want)
		}
	}
}

func TestNormalizeConfigPreservesMCPEnabled(t *testing.T) {
	if !normalizeConfig(&AppConfig{MCPEnabled: true}).MCPEnabled {
		t.Error("MCPEnabled=true must survive normalization")
	}
	if normalizeConfig(&AppConfig{}).MCPEnabled {
		t.Error("MCPEnabled must default to false")
	}
	if n := normalizeConfig(nil); n.MCPEnabled || n.MCPPort != 0 {
		t.Error("nil config must normalize to MCP disabled with dynamic port")
	}
}
