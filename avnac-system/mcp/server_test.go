package mcp

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"

	"Avnac/avnac-system/config"
)

// startTestServer boots the MCP HTTP server on an ephemeral loopback port.
// It returns the server and its base URL ("http://127.0.0.1:<port>").
func startTestServer(t *testing.T, token string) (*AvnacMCP, string) {
	t.Helper()
	server := NewAvnacMCP(nil, nil, nil)
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)

	server.Start(ctx)
	if err := server.StartHTTP(HTTPOptions{Port: 0, Token: token}); err != nil {
		t.Fatalf("StartHTTP: %v", err)
	}
	t.Cleanup(func() {
		_ = server.Stop(context.Background())
	})

	info := server.GetMCPInfo()
	if !info.Running {
		t.Fatalf("expected server running after StartHTTP")
	}
	if info.Port <= 0 {
		t.Fatalf("expected resolved ephemeral port, got %d", info.Port)
	}
	return server, fmt.Sprintf("http://127.0.0.1:%d", info.Port)
}

func postJSON(t *testing.T, url string, headers map[string]string, payload map[string]any) *http.Response {
	t.Helper()
	data, _ := json.Marshal(payload)
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(data))
	if err != nil {
		t.Fatalf("build request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json, text/event-stream")
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("POST %s: %v", url, err)
	}
	t.Cleanup(func() { resp.Body.Close() })
	return resp
}

func TestMCPServerRejectsRequestsWithoutBearerToken(t *testing.T) {
	_, base := startTestServer(t, "test-token")

	t.Run("missing_token", func(t *testing.T) {
		resp := postJSON(t, base+"/", nil, map[string]any{
			"jsonrpc": "2.0", "id": 1, "method": "initialize",
			"params": map[string]any{
				"protocolVersion": "2024-11-05",
				"clientInfo":      map[string]any{"name": "test-client", "version": "1.0.0"},
			},
		})
		if resp.StatusCode != http.StatusUnauthorized {
			t.Fatalf("expected 401 for request without token, got %d", resp.StatusCode)
		}
		if resp.Header.Get("WWW-Authenticate") == "" {
			t.Errorf("expected WWW-Authenticate challenge header")
		}
	})

	t.Run("wrong_token", func(t *testing.T) {
		resp := postJSON(t, base+"/", map[string]string{"Authorization": "Bearer nope"},
			map[string]any{"jsonrpc": "2.0", "id": 1, "method": "prompts/list", "params": map[string]any{}})
		if resp.StatusCode != http.StatusUnauthorized {
			t.Fatalf("expected 401 for wrong token, got %d", resp.StatusCode)
		}
	})

	t.Run("non_bearer_scheme", func(t *testing.T) {
		resp := postJSON(t, base+"/", map[string]string{"Authorization": "Basic dXNlcjpwYXNz"},
			map[string]any{"jsonrpc": "2.0", "id": 1, "method": "prompts/list", "params": map[string]any{}})
		if resp.StatusCode != http.StatusUnauthorized {
			t.Fatalf("expected 401 for non-bearer scheme, got %d", resp.StatusCode)
		}
	})
}

func TestMCPServerTransportsWithBearerToken(t *testing.T) {
	_, base := startTestServer(t, "test-token")
	auth := map[string]string{"Authorization": "Bearer test-token"}

	t.Run("server_discover_probe", func(t *testing.T) {
		resp := postJSON(t, base+"/sse", auth, map[string]any{
			"jsonrpc": "2.0", "id": 0, "method": "server/discover",
		})
		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			t.Fatalf("expected 200 for server/discover, got %d (body: %s)", resp.StatusCode, string(body))
		}
		body, _ := io.ReadAll(resp.Body)
		var probeResp struct {
			JSONRPC string         `json:"jsonrpc"`
			ID      any            `json:"id"`
			Result  map[string]any `json:"result"`
		}
		if err := json.Unmarshal(body, &probeResp); err != nil {
			t.Fatalf("parse probe response: %v", err)
		}
		if probeResp.Result == nil {
			t.Fatalf("expected non-nil result")
		}
		serverInfo, ok := probeResp.Result["serverInfo"].(map[string]any)
		if !ok || serverInfo["name"] != "Avnac Studio" {
			t.Errorf("expected serverInfo.name == 'Avnac Studio', got %v", serverInfo)
		}
	})

	t.Run("sse_connect", func(t *testing.T) {
		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, base+"/sse", nil)
		if err != nil {
			t.Fatalf("build SSE request: %v", err)
		}
		req.Header.Set("Accept", "text/event-stream")
		for k, v := range auth {
			req.Header.Set(k, v)
		}
		client := &http.Client{Timeout: 5 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			t.Fatalf("SSE connect: %v", err)
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("expected 200 for SSE, got %d", resp.StatusCode)
		}
		if ct := resp.Header.Get("Content-Type"); !strings.HasPrefix(ct, "text/event-stream") {
			t.Errorf("expected text/event-stream, got %s", ct)
		}
	})

	t.Run("streamable_initialize", func(t *testing.T) {
		resp := postJSON(t, base+"/", auth, map[string]any{
			"jsonrpc": "2.0", "id": 1, "method": "initialize",
			"params": map[string]any{
				"protocolVersion": "2024-11-05",
				"clientInfo":      map[string]any{"name": "test-client", "version": "1.0.0"},
			},
		})
		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			t.Fatalf("expected 200 for initialize, got %d (body: %s)", resp.StatusCode, string(body))
		}
		if resp.Header.Get("Mcp-Session-Id") == "" {
			t.Errorf("expected non-empty Mcp-Session-Id header")
		}
	})

	t.Run("prompts_list", func(t *testing.T) {
		resp := postJSON(t, base+"/", auth, map[string]any{
			"jsonrpc": "2.0", "id": 2, "method": "prompts/list", "params": map[string]any{},
		})
		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			t.Fatalf("expected 200 for prompts/list, got %d (body: %s)", resp.StatusCode, string(body))
		}
	})
}

func TestMCPServerStatusPageIsUnauthenticated(t *testing.T) {
	_, base := startTestServer(t, "test-token")

	req, err := http.NewRequest(http.MethodGet, base+"/", nil)
	if err != nil {
		t.Fatalf("build request: %v", err)
	}
	req.Header.Set("Accept", "text/html,application/xhtml+xml")
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("status page request: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 for browser status page, got %d", resp.StatusCode)
	}
	body, _ := io.ReadAll(resp.Body)
	if !strings.Contains(string(body), "MCP server is running") {
		t.Errorf("expected status page body, got %s", string(body))
	}
}

func TestMCPServerRunsUnauthenticatedWithoutToken(t *testing.T) {
	_, base := startTestServer(t, "")

	resp := postJSON(t, base+"/", nil, map[string]any{
		"jsonrpc": "2.0", "id": 1, "method": "initialize",
		"params": map[string]any{
			"protocolVersion": "2024-11-05",
			"clientInfo":      map[string]any{"name": "test-client", "version": "1.0.0"},
		},
	})
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected 200 without token configured, got %d (body: %s)", resp.StatusCode, string(body))
	}
}

func TestMCPServerBindsLoopbackOnly(t *testing.T) {
	server, _ := startTestServer(t, "")
	info := server.GetMCPInfo()
	if info.URL == "" || !strings.HasPrefix(info.URL, "http://127.0.0.1:") {
		t.Fatalf("expected loopback URL, got %q", info.URL)
	}
}

// TestUpdateConfigLifecycle guards against UpdateConfig deadlocking on
// startMu (it previously called StartHTTP, which re-acquired the mutex, and
// blocked app startup forever with no visible error).
func TestUpdateConfigLifecycle(t *testing.T) {
	done := make(chan struct{})
	go func() {
		defer close(done)
		server := NewAvnacMCP(nil, nil, nil)
		server.Start(context.Background())
		server.UpdateConfig(&avnacconfig.AppConfig{MCPEnabled: true})
		if info := server.GetMCPInfo(); !info.Running {
			t.Errorf("expected server running after UpdateConfig(enabled), got %+v", info)
		}
		server.UpdateConfig(&avnacconfig.AppConfig{})
		if info := server.GetMCPInfo(); info.Running {
			t.Errorf("expected server stopped after UpdateConfig(disabled), got %+v", info)
		}
	}()
	select {
	case <-done:
	case <-time.After(10 * time.Second):
		t.Fatal("UpdateConfig did not return within 10s — deadlock on startMu")
	}
}
