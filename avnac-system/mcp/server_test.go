package mcp

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"Avnac/avnac-system/config"
)

// startTestServer boots the MCP HTTP server with auto port selection
// (fixed default, ephemeral fallback). It returns the server and its base
// URL ("http://127.0.0.1:<resolved port>").
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

func TestStartHTTPPrefersFixedDefaultPort(t *testing.T) {
	// Skip on machines where the default port is already held; the fallback
	// behavior is covered by TestStartHTTPFallsBackWhenDefaultPortTaken.
	probe, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", DefaultMCPPort))
	if err != nil {
		t.Skipf("default port %d already in use on this machine: %v", DefaultMCPPort, err)
	}
	if err := probe.Close(); err != nil {
		t.Skipf("cannot release probe listener: %v", err)
	}

	server := NewAvnacMCP(nil, nil, nil)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	server.Start(ctx)

	if err := server.StartHTTP(HTTPOptions{Port: 0, Token: "t"}); err != nil {
		t.Fatalf("StartHTTP: %v", err)
	}
	t.Cleanup(func() { _ = server.Stop(context.Background()) })

	if got := server.GetMCPInfo().Port; got != DefaultMCPPort {
		t.Fatalf("auto port = %d, want fixed default %d (is something bound to it?)", got, DefaultMCPPort)
	}
}

func TestStartHTTPFallsBackWhenDefaultPortTaken(t *testing.T) {
	blocker, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", DefaultMCPPort))
	if err != nil {
		t.Skipf("cannot hold default port %d: %v", DefaultMCPPort, err)
	}
	t.Cleanup(func() { _ = blocker.Close() })

	server := NewAvnacMCP(nil, nil, nil)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	server.Start(ctx)

	if err := server.StartHTTP(HTTPOptions{Port: 0, Token: "t"}); err != nil {
		t.Fatalf("StartHTTP with default port taken: %v", err)
	}
	t.Cleanup(func() { _ = server.Stop(context.Background()) })

	got := server.GetMCPInfo().Port
	if got <= 0 || got == DefaultMCPPort {
		t.Fatalf("fallback port = %d, want a free ephemeral port different from %d", got, DefaultMCPPort)
	}
}

func TestMCPServerExplicitPortTakenFails(t *testing.T) {
	blocker, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("grab free port: %v", err)
	}
	t.Cleanup(func() { _ = blocker.Close() })
	pinned := blocker.Addr().(*net.TCPAddr).Port

	server := NewAvnacMCP(nil, nil, nil)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	server.Start(ctx)

	if err := server.StartHTTP(HTTPOptions{Port: pinned, Token: "t"}); err == nil {
		t.Fatalf("expected bind error for pinned port %d already in use", pinned)
	}
	t.Cleanup(func() { _ = server.Stop(context.Background()) })

	if info := server.GetMCPInfo(); info.Running {
		t.Fatalf("server must not be running after a failed explicit bind")
	}
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

// ─── request body cap ─────────────────────────────────────────────────────────

// lowerBodyCap shrinks maxRequestBodyBytes for one test so the cap can be
// exercised with a few hundred bytes instead of 32 MiB.
func lowerBodyCap(t *testing.T, limit int64) {
	t.Helper()
	previous := maxRequestBodyBytes
	maxRequestBodyBytes = limit
	t.Cleanup(func() { maxRequestBodyBytes = previous })
}

// readSpy stands in for the transport handlers and reports what it managed to
// read, so the cap can be asserted without the go-sdk in the way.
type readSpy struct {
	called  bool
	readLen int
	err     error
}

func (s *readSpy) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.called = true
	body, err := io.ReadAll(r.Body)
	s.readLen, s.err = len(body), err
	w.WriteHeader(http.StatusOK)
}

func buildHandlerForTest(t *testing.T) (http.Handler, *readSpy) {
	t.Helper()
	server := NewAvnacMCP(nil, nil, nil)
	const token = "test-token"
	server.stMu.Lock()
	server.token = token
	server.stMu.Unlock()
	spy := &readSpy{}
	noop := http.HandlerFunc(func(http.ResponseWriter, *http.Request) {})
	return server.buildHandler(spy, noop), spy
}

func authorizedRequest(body []byte, token string) *http.Request {
	req := httptest.NewRequest(http.MethodPost, "/", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json, text/event-stream")
	req.Header.Set("Authorization", "Bearer "+token)
	return req
}

// A body that declares a length over the cap is refused before anything reads
// it — the check sits after auth, so an unauthorized caller is still free.
func TestBuildHandlerRejectsDeclaredOversizedBody(t *testing.T) {
	lowerBodyCap(t, 1024)
	handler, spy := buildHandlerForTest(t)

	req := authorizedRequest([]byte("{}"), "test-token")
	req.ContentLength = maxRequestBodyBytes + 1
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("expected 413, got %d (body: %s)", rec.Code, rec.Body.String())
	}
	if spy.called {
		t.Fatalf("oversized request reached the transport handler")
	}
}

// A chunked body declares no length, so the guard cannot pre-empt it and
// MaxBytesReader has to bound the read.
func TestBuildHandlerCapsUndeclaredBody(t *testing.T) {
	lowerBodyCap(t, 1024)
	handler, spy := buildHandlerForTest(t)

	body := bytes.Repeat([]byte("x"), int(maxRequestBodyBytes)*4)
	req := authorizedRequest(body, "test-token")
	req.ContentLength = -1
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if !spy.called {
		t.Fatalf("request never reached the transport handler")
	}
	if spy.err == nil {
		t.Fatalf("expected the body read to fail at the cap")
	}
	if int64(spy.readLen) > maxRequestBodyBytes {
		t.Fatalf("read %d bytes past a cap of %d", spy.readLen, maxRequestBodyBytes)
	}
}

// End to end through the real listener: one oversized request must not cost
// ~7x its size in memory, so it is refused rather than buffered.
func TestMCPServerRejectsOversizedRequest(t *testing.T) {
	_, base := startTestServer(t, "test-token")
	lowerBodyCap(t, 256)

	resp := postJSON(t, base, map[string]string{"Authorization": "Bearer test-token"},
		map[string]any{
			"jsonrpc": "2.0", "id": 1, "method": "initialize",
			"params": map[string]any{
				"protocolVersion": "2025-11-25",
				"clientInfo":      map[string]any{"name": strings.Repeat("x", 1024), "version": "1"},
				"capabilities":    map[string]any{},
			},
		})
	if resp.StatusCode != http.StatusRequestEntityTooLarge {
		t.Fatalf("expected 413 for an oversized body, got %d", resp.StatusCode)
	}
}

// The unauthenticated 401 path must stay allocation-free: it is checked before
// the cap, so an oversized body from an unknown caller is rejected as
// unauthorized without reading a byte.
func TestBuildHandlerRejectsUnauthorizedBeforeCapping(t *testing.T) {
	handler, spy := buildHandlerForTest(t)

	req := authorizedRequest([]byte("{}"), "wrong-token")
	req.ContentLength = maxRequestBodyBytes
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
	if spy.called {
		t.Fatalf("unauthorized request reached the transport handler")
	}
}

// The probe only sniffs a bounded prefix now, so a small server/discover must
// still be answered rather than falling through to the SDK.
func TestDiscoverProbeStillAnswered(t *testing.T) {
	_, base := startTestServer(t, "")

	resp := postJSON(t, base, nil, map[string]any{
		"jsonrpc": "2.0", "id": 1, "method": "server/discover",
	})
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 for server/discover, got %d", resp.StatusCode)
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read body: %v", err)
	}
	if !strings.Contains(string(body), "2025-11-25") {
		t.Fatalf("discover response missing protocol version: %s", body)
	}
}
