package mcp

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"strings"
	"sync"

	avnacconfig "Avnac/avnac-system/config"
	avnacio "Avnac/avnac-system/io"
	avnacsecrets "Avnac/avnac-system/secrets"
	avnacserver "Avnac/avnac-system/server"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// mcpTokenKeyringName is the keyring entry the bearer token is stored under
// via SecretsManager. It never touches config.json.
const mcpTokenKeyringName = "mcp"

// MCPState is the runtime status of the MCP HTTP server, surfaced to the
// Settings page via GetMCPInfo.
type MCPState struct {
	// Enabled reflects the mcp_enabled config value.
	Enabled bool `json:"enabled"`
	// Running is true once the loopback listener is bound and serving.
	Running bool `json:"running"`
	// Port is the resolved loopback port (0 when not running).
	Port int `json:"port"`
	// URL is the Streamable HTTP connect URL, e.g. http://127.0.0.1:54321/.
	URL string `json:"url"`
	// SSEURL is the legacy SSE endpoint URL.
	SSEURL string `json:"sse_url"`
	// Error carries the last start failure (e.g. pinned port already in use).
	Error string `json:"error,omitempty"`
}

type AvnacMCP struct {
	server     *mcp.Server
	httpServer *http.Server
	listener   net.Listener
	Unsplash   *avnacserver.UnsplashService
	Secrets    *avnacsecrets.SecretsManager
	// IO gives file-level tools (list_files) direct access to workspace
	// metadata without a frontend round-trip. The IOManager pointer is
	// initialized by App.startup after NewApp returns, so holders must call
	// its methods lazily (inside handlers), never at construction time.
	IO *avnacio.IOManager

	pendingRequests map[string]chan any
	mu              sync.Mutex

	// startMu serializes StartHTTP/StopHTTP/UpdateConfig.
	startMu sync.Mutex
	// stMu guards state and token; the auth middleware takes a read lock on
	// every request, so keep this lock free of slow operations.
	stMu  sync.RWMutex
	state MCPState
	token string
}

const DesignerInstructions = `You are the Avnac Studio AI Design Director.
Avnac Studio is a modern graphic design canvas (similar to Canva / Figma).

CORE DESIGN WORKFLOW — Brief, then Setup, then Compose, then Verify:

1. DESIGN BRIEF (before ANY tool call):
   - Parse the request and extract known constraints: dimensions, exact copy, brand or shop names, dates/addresses, palette, style, imagery.
   - Identify critical unknowns: real text content, names, dates, addresses, size intent. If any are missing, ask the user up to 3 targeted questions and STOP — do not call tools yet. If nothing critical is missing, state your assumptions explicitly and proceed.
   - Write a compact design plan: layout zones with approximate coordinates, type hierarchy, palette, fonts, asset needs. The later verification step checks the render against this brief.
   - For EDIT requests, write a diff-oriented brief (what changes, what stays). Start from the real canvas: if the target file is not currently open, call list_files then open_canvas — NEVER silently recreate an existing design in a new file.

2. INSPECT / CANVAS SETUP:
   - Call get_canvas_summary to see the active canvas. For a NEW design, call create_canvas with width, height, backgroundColor, and a descriptive name.
   - create_canvas already applies backgroundColor — do not call set_background again with the same value.
   - To edit an existing file that is not open: list_files → open_canvas(fileId). To change its title: rename_file(fileId, name).

3. ASSETS:
   - Call search_unsplash for photography when relevant, and get_font_list if unsure which fonts to use.

4. DECLARATIVE COMPOSITION:
   - Call render_elements once with all elements, layered bottom (background) to top (foreground).
   - Coordinates: top-left origin (0, 0). 'left' (or 'x') and 'top' (or 'y') in pixels.
   - Elements: 'rect', 'ellipse', 'polygon' (sides 3-8), 'star', 'line', 'text', 'image', 'sticker'.
   - Typography: strong hierarchy (Headline 48-72px, Subhead 24-32px, Body 16-20px). Prefer Poppins, Inter, and DM Serif Display — other Google Fonts may fall back if not yet loaded; get_canvas_image now waits for fonts before rendering.
   - Styling: hex colors, cornerRadius, blur, opacity, shadows (blur, offsetX, offsetY, color, opacity), and gradientStops.

5. VERIFY AGAINST THE BRIEF:
   - Call get_canvas_image and compare it to the design brief AND the user's original request, item by item: required content present and spelled correctly, dimensions, hierarchy, palette, style, no unintended placeholder text.
   - If something mismatches, fix it with modify_elements (or align_objects / group_objects), take one more screenshot, then report an honest pass/fail per requirement. Explicitly flag any content you invented.
`

func NewAvnacMCP(unsplash *avnacserver.UnsplashService, io *avnacio.IOManager, secrets *avnacsecrets.SecretsManager) *AvnacMCP {
	return &AvnacMCP{
		server: mcp.NewServer(&mcp.Implementation{
			Name:    "Avnac Studio",
			Version: "1.0.0",
		}, &mcp.ServerOptions{
			Instructions: DesignerInstructions,
		}),
		pendingRequests: make(map[string]chan any),
		Unsplash:        unsplash,
		Secrets:         secrets,
		IO:              io,
	}
}

// Start registers tools and prompts. It does not bind any network resource;
// the HTTP listener is started by UpdateConfig when mcp_enabled is set.
// Called once from App.startup before ConfigManager.Startup fires watchers.
func (m *AvnacMCP) Start(wailsCtx context.Context) {
	m.RegisterTools(wailsCtx)
	m.RegisterPrompts()
}

// HTTPOptions controls StartHTTP. Token is the required bearer token; when
// empty the server runs without auth and must only be reachable on loopback.
type HTTPOptions struct {
	Port  int
	Token string
}

// StartHTTP binds the MCP server to 127.0.0.1 on the requested port (0 picks
// a free ephemeral port) and serves until Stop. SDK handler defaults are kept
// (localhost protection on) and no CORS headers are emitted: browser pages
// must not be able to read or write MCP responses cross-origin.
func (m *AvnacMCP) StartHTTP(opts HTTPOptions) error {
	m.startMu.Lock()
	defer m.startMu.Unlock()

	if m.httpServer != nil {
		return errors.New("mcp: server already running")
	}

	addr := fmt.Sprintf("127.0.0.1:%d", opts.Port)
	ln, err := net.Listen("tcp", addr)
	if err != nil {
		m.setState(MCPState{Enabled: true, Error: fmt.Sprintf("bind %s: %v", addr, err)})
		return fmt.Errorf("mcp: bind %s: %w", addr, err)
	}

	streamable := mcp.NewStreamableHTTPHandler(func(req *http.Request) *mcp.Server {
		return m.server
	}, nil)

	sse := mcp.NewSSEHandler(func(req *http.Request) *mcp.Server {
		return m.server
	}, nil)

	srv := &http.Server{Handler: m.buildHandler(streamable, sse)}
	port := ln.Addr().(*net.TCPAddr).Port
	url := fmt.Sprintf("http://127.0.0.1:%d/", port)

	m.httpServer = srv
	m.listener = ln
	m.stMu.Lock()
	m.token = opts.Token
	m.stMu.Unlock()
	m.setState(MCPState{
		Enabled: true,
		Running: true,
		Port:    port,
		URL:     url,
		SSEURL:  strings.TrimSuffix(url, "/") + "/sse",
	})
	if opts.Token == "" {
		log.Printf("[MCP] WARNING: no bearer token available; server runs on %s without auth (loopback only)", url)
	} else {
		log.Printf("[MCP] listening on %s (bearer token required)", url)
	}

	go func() {
		if err := srv.Serve(ln); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Printf("[MCP] server error: %v", err)
		}
	}()
	return nil
}

// buildHandler returns the root handler: request log, unauthenticated browser
// status page, then bearer-token auth before the transport routing. The token
// is read per request so RegenerateToken takes effect on a running server.
func (m *AvnacMCP) buildHandler(streamable, sse http.Handler) http.Handler {
	route := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Handle server/discover capability negotiation probe.
		if r.Method == http.MethodPost {
			body, err := io.ReadAll(r.Body)
			if err == nil {
				var probe struct {
					JSONRPC string `json:"jsonrpc"`
					ID      any    `json:"id"`
					Method  string `json:"method"`
				}
				if json.Unmarshal(body, &probe) == nil && probe.Method == "server/discover" {
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusOK)
					resp := map[string]any{
						"jsonrpc": "2.0",
						"id":      probe.ID,
						"result": map[string]any{
							"protocolVersion":   "2025-11-25",
							"supportedVersions": []string{"2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"},
							"capabilities": map[string]any{
								"tools": map[string]any{
									"listChanged": true,
								},
								"prompts": map[string]any{
									"listChanged": true,
								},
							},
							"serverInfo": map[string]string{
								"name":    "Avnac Studio",
								"version": "1.0.0",
							},
							"instructions": DesignerInstructions,
						},
					}
					_ = json.NewEncoder(w).Encode(resp)
					return
				}
				r.Body = io.NopCloser(bytes.NewReader(body))
			}
		}

		// Routing logic:
		// 1. If query has "sessionid", it is a legacy SSE message POST -> sse
		// 2. If POST without "sessionid", it is a Streamable HTTP request (initialize or tool call) -> streamable
		// 3. If GET with "Mcp-Session-Id", it is a Streamable HTTP stream -> streamable
		// 4. If GET without "Mcp-Session-Id" (or requesting /sse), it is a legacy SSE connection -> sse
		// 5. If DELETE, it is Streamable HTTP closing session -> streamable
		if r.URL.Query().Has("sessionid") {
			sse.ServeHTTP(w, r)
			return
		}

		if r.Method == http.MethodPost {
			streamable.ServeHTTP(w, r)
			return
		}

		if r.Method == http.MethodGet {
			if r.Header.Get("Mcp-Session-Id") != "" {
				streamable.ServeHTTP(w, r)
				return
			}
			sse.ServeHTTP(w, r)
			return
		}

		if r.Method == http.MethodDelete {
			streamable.ServeHTTP(w, r)
			return
		}

		// Fallback
		streamable.ServeHTTP(w, r)
	})

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Log incoming request (no Authorization header).
		log.Printf("[MCP] %s %s from %s (Accept: %q, Mcp-Session-Id: %q)",
			r.Method, r.URL.String(), r.RemoteAddr, r.Header.Get("Accept"), r.Header.Get("Mcp-Session-Id"))

		// Unauthenticated status page so the user can verify the server is
		// up by opening the URL in a browser. It carries no design data.
		if r.Method == http.MethodGet &&
			strings.Contains(r.Header.Get("Accept"), "text/html") &&
			!strings.Contains(r.Header.Get("Accept"), "text/event-stream") {
			m.writeStatusPage(w)
			return
		}

		if token := m.currentToken(); token != "" && !bearerTokenMatches(r.Header.Get("Authorization"), token) {
			w.Header().Set("WWW-Authenticate", `Bearer realm="avnac-mcp"`)
			http.Error(w, "Unauthorized: missing or invalid bearer token (see Avnac Studio Settings)", http.StatusUnauthorized)
			return
		}

		route.ServeHTTP(w, r)
	})
}

// currentToken returns the active bearer token (empty when auth is off).
func (m *AvnacMCP) currentToken() string {
	m.stMu.RLock()
	defer m.stMu.RUnlock()
	return m.token
}

// bearerTokenMatches checks an "Authorization: Bearer <token>" header value
// against the expected token in constant time.
func bearerTokenMatches(header, token string) bool {
	const prefix = "Bearer "
	if len(header) <= len(prefix) || !strings.EqualFold(header[:len(prefix)], prefix) {
		return false
	}
	got := header[len(prefix):]
	return subtle.ConstantTimeCompare([]byte(got), []byte(token)) == 1
}

func (m *AvnacMCP) writeStatusPage(w http.ResponseWriter) {
	m.stMu.RLock()
	url := m.state.URL
	m.stMu.RUnlock()
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, `<!DOCTYPE html><html><head><title>Avnac MCP Server</title></head><body style="font-family:sans-serif;padding:2rem;line-height:1.6;max-width:42rem;"><h2>Avnac Studio MCP server is running</h2><p>Connect URL: <strong>%s</strong></p><p>Requests require a bearer token. Copy the URL and token from <strong>Avnac Studio → Settings → MCP server</strong> and add them to your MCP client config.</p></body></html>`, url)
}

// UpdateConfig is the ConfigManager watcher entry point. It starts or stops
// the HTTP listener to match mcp_enabled, restarting it when the port changes.
func (m *AvnacMCP) UpdateConfig(cfg *avnacconfig.AppConfig) {
	if cfg == nil {
		return
	}
	m.startMu.Lock()
	defer m.startMu.Unlock()

	alreadyRunning := m.httpServer != nil
	current := m.GetMCPInfo()
	// A dynamic (0) port keeps the already-resolved listener across unrelated
	// config saves; a pinned port restarts only when the pin changes.
	portUnchanged := (alreadyRunning && cfg.MCPPort == 0) || current.Port == cfg.MCPPort

	if !cfg.MCPEnabled {
		if alreadyRunning {
			m.stopHTTPLocked()
		}
		m.setState(MCPState{})
		return
	}

	if alreadyRunning && portUnchanged {
		return
	}
	if alreadyRunning {
		m.stopHTTPLocked()
	}

	token := m.resolveToken()
	if err := m.StartHTTP(HTTPOptions{Port: cfg.MCPPort, Token: token}); err != nil {
		log.Printf("[MCP] could not start server: %v", err)
	}
}

// resolveToken returns the keyring bearer token, generating and persisting a
// fresh one on first use. An empty result means the server must run without
// auth (loopback bind only).
func (m *AvnacMCP) resolveToken() string {
	if m.Secrets == nil {
		return ""
	}
	tok, err := m.Secrets.GetKey(mcpTokenKeyringName)
	if err != nil {
		log.Printf("[MCP] could not read token from keyring: %v", err)
		return ""
	}
	if tok != "" {
		return tok
	}
	tok, err = generateToken()
	if err != nil {
		log.Printf("[MCP] could not generate token: %v", err)
		return ""
	}
	if err := m.Secrets.SetKey(mcpTokenKeyringName, tok); err != nil {
		log.Printf("[MCP] could not store token in keyring: %v", err)
		return ""
	}
	return tok
}

// RegenerateToken replaces the keyring bearer token. It takes effect
// immediately for a running server.
func (m *AvnacMCP) RegenerateToken() error {
	if m.Secrets == nil {
		return errors.New("mcp: keyring unavailable")
	}
	tok, err := generateToken()
	if err != nil {
		return err
	}
	if err := m.Secrets.SetKey(mcpTokenKeyringName, tok); err != nil {
		return err
	}
	m.stMu.Lock()
	m.token = tok
	m.stMu.Unlock()
	return nil
}

func generateToken() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}

// GetMCPInfo reports the current server state for the Settings page.
func (m *AvnacMCP) GetMCPInfo() MCPState {
	m.stMu.RLock()
	defer m.stMu.RUnlock()
	return m.state
}

func (m *AvnacMCP) setState(s MCPState) {
	m.stMu.Lock()
	m.state = s
	m.stMu.Unlock()
}

// SubmitResponse delivers the frontend's result for a pending tool call.
func (m *AvnacMCP) SubmitResponse(requestID string, data any) {
	m.mu.Lock()
	ch, ok := m.pendingRequests[requestID]
	if ok {
		delete(m.pendingRequests, requestID)
	}
	m.mu.Unlock()

	if ok {
		ch <- data
	}
}

// Stop shuts the HTTP server down. Safe to call when never started.
func (m *AvnacMCP) Stop(ctx context.Context) error {
	m.startMu.Lock()
	defer m.startMu.Unlock()
	return m.stopHTTPLocked()
}

func (m *AvnacMCP) stopHTTPLocked() error {
	m.stMu.Lock()
	m.token = ""
	running := m.httpServer != nil
	m.stMu.Unlock()

	if !running {
		return nil
	}

	err := m.httpServer.Shutdown(context.Background())
	closeErr := m.listener.Close()
	m.httpServer = nil
	m.listener = nil
	m.setState(MCPState{Enabled: m.GetMCPInfo().Enabled})
	log.Printf("[MCP] server stopped.")
	if err != nil {
		return err
	}
	return closeErr
}
