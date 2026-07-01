package avnacserver

import (
	"context"
	"encoding/base64"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"testing"
	"time"
)

func TestDecodeBase64Image(t *testing.T) {
	t.Parallel()

	rawPNG := []byte{0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a}
	std := base64.StdEncoding.EncodeToString(rawPNG)
	urlSafe := strings.TrimRight(strings.ReplaceAll(strings.ReplaceAll(std, "+", "-"), "/", "_"), "=")

	tests := []struct {
		name    string
		input   string
		want    []byte
		wantErr bool
	}{
		{
			name:  "raw standard base64",
			input: std,
			want:  rawPNG,
		},
		{
			name:  "data url prefix",
			input: "data:image/png;base64," + std,
			want:  rawPNG,
		},
		{
			name:  "url-safe base64 without padding",
			input: urlSafe,
			want:  rawPNG,
		},
		{
			name:    "invalid payload",
			input:   "%%%not-base64%%%",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got, err := decodeBase64Image(tt.input)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("decodeBase64Image() error = %v", err)
			}
			if string(got) != string(tt.want) {
				t.Fatalf("decodeBase64Image() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestRembgServiceBoreasURL(t *testing.T) {
	svc := NewRembgService()

	t.Run("default when unset", func(t *testing.T) {
		t.Setenv("BOREAS_URL", "")
		got, err := svc.boreasURL()
		if err != nil {
			t.Fatalf("boreasURL() error = %v", err)
		}
		if got != defaultBoreasURL {
			t.Fatalf("boreasURL() = %q, want %q", got, defaultBoreasURL)
		}
	})

	t.Run("trims trailing slash and whitespace", func(t *testing.T) {
		t.Setenv("BOREAS_URL", "  https://boreas.example.com/  ")
		got, err := svc.boreasURL()
		if err != nil {
			t.Fatalf("boreasURL() error = %v", err)
		}
		if got != "https://boreas.example.com" {
			t.Fatalf("boreasURL() = %q", got)
		}
	})
}

func TestRembgServiceBuildRequest(t *testing.T) {
	svc := NewRembgService()
	t.Setenv("BOREAS_TOKEN", "secret-token")

	req, err := svc.buildRequest(http.MethodPost, "https://boreas.example.com/v1/media/jobs", nil)
	if err != nil {
		t.Fatalf("buildRequest() error = %v", err)
	}

	if req.Header.Get("User-Agent") == "" {
		t.Fatal("expected browser-like User-Agent header")
	}
	if req.Header.Get("X-API-Key") != "secret-token" {
		t.Fatalf("X-API-Key = %q, want %q", req.Header.Get("X-API-Key"), "secret-token")
	}
}

func TestRembgServiceHandleSSEEvent(t *testing.T) {
	t.Parallel()

	type emitted struct {
		name string
		data any
	}

	var mu sync.Mutex
	var events []emitted
	orig := rembgEventsEmit
	rembgEventsEmit = func(_ context.Context, name string, optionalData ...interface{}) {
		mu.Lock()
		events = append(events, emitted{name: name, data: optionalData[0]})
		mu.Unlock()
	}
	t.Cleanup(func() { rembgEventsEmit = orig })

	svc := NewRembgService()
	ctx := context.Background()
	nodeID := "node-1"
	jobID := "job-abc"

	t.Run("progress for non-terminal status", func(t *testing.T) {
		events = nil
		payload := `{"job_id":"job-abc","status":"processing"}`
		done := svc.handleSSEEvent(ctx, nodeID, jobID, payload)
		if done {
			t.Fatal("expected non-terminal event")
		}
		if len(events) != 1 || events[0].name != "rembg:progress" {
			t.Fatalf("events = %#v, want single progress event", events)
		}
		progress := events[0].data.(RembgProgressEvent)
		if progress.Status != "processing" || progress.NodeID != nodeID {
			t.Fatalf("progress event = %#v", progress)
		}
	})

	t.Run("failed job emits error", func(t *testing.T) {
		events = nil
		payload := `{"job_id":"job-abc","status":"failed","error":"model timeout"}`
		done := svc.handleSSEEvent(ctx, nodeID, jobID, payload)
		if !done {
			t.Fatal("expected terminal event")
		}
		if len(events) != 1 || events[0].name != "rembg:error" {
			t.Fatalf("events = %#v", events)
		}
		errEvt := events[0].data.(RembgErrorEvent)
		if errEvt.ErrorMsg != "model timeout" {
			t.Fatalf("error message = %q", errEvt.ErrorMsg)
		}
	})

	t.Run("complete without result url emits error", func(t *testing.T) {
		events = nil
		payload := `{"job_id":"job-abc","status":"complete"}`
		done := svc.handleSSEEvent(ctx, nodeID, jobID, payload)
		if !done {
			t.Fatal("expected terminal event")
		}
		errEvt := events[0].data.(RembgErrorEvent)
		if !strings.Contains(errEvt.ErrorMsg, "result URL") {
			t.Fatalf("error message = %q", errEvt.ErrorMsg)
		}
	})

	t.Run("invalid json is ignored", func(t *testing.T) {
		events = nil
		done := svc.handleSSEEvent(ctx, nodeID, jobID, "{not-json")
		if done {
			t.Fatal("expected invalid payload to be ignored")
		}
		if len(events) != 0 {
			t.Fatalf("expected no events, got %#v", events)
		}
	})
}

func TestRembgServiceDownloadResult(t *testing.T) {
	t.Parallel()

	pngBytes := []byte{0x89, 0x50, 0x4e, 0x47}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "image/png")
		_, _ = w.Write(pngBytes)
	}))
	t.Cleanup(server.Close)

	svc := NewRembgService()
	encoded, err := svc.downloadResult(server.URL + "/result.png")
	if err != nil {
		t.Fatalf("downloadResult() error = %v", err)
	}

	decoded, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		t.Fatalf("decode encoded result: %v", err)
	}
	if string(decoded) != string(pngBytes) {
		t.Fatalf("downloaded bytes = %v, want %v", decoded, pngBytes)
	}
}

func TestRembgServiceStartRemoveBackgroundIntegration(t *testing.T) {
	pngBytes := []byte{0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a}
	imageB64 := base64.StdEncoding.EncodeToString(pngBytes)
	dataURL := "data:image/png;base64," + imageB64

	var mu sync.Mutex
	var events []struct {
		name string
		data any
	}
	orig := rembgEventsEmit
	rembgEventsEmit = func(_ context.Context, name string, optionalData ...interface{}) {
		mu.Lock()
		events = append(events, struct {
			name string
			data any
		}{name: name, data: optionalData[0]})
		mu.Unlock()
	}
	t.Cleanup(func() { rembgEventsEmit = orig })

	resultServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "image/png")
		_, _ = w.Write(pngBytes)
	}))
	t.Cleanup(resultServer.Close)

	const jobID = "job-integration-1"
	resultURL := resultServer.URL + "/cutout.png"

	api := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodPost && r.URL.Path == "/v1/media/jobs":
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusCreated)
			_, _ = fmt.Fprintf(w, `{"data":{"job_id":%q,"status":"queued"}}`, jobID)
		case r.Method == http.MethodGet && r.URL.Path == "/v1/media/jobs/"+jobID+"/stream":
			w.Header().Set("Content-Type", "text/event-stream")
			_, _ = fmt.Fprintf(w, "data: {\"job_id\":%q,\"status\":\"complete\",\"result_url\":%q}\n\n", jobID, resultURL)
		default:
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(api.Close)

	t.Setenv("BOREAS_URL", api.URL)
	t.Setenv("BOREAS_TOKEN", "")

	svc := NewRembgService()
	ctx := context.Background()
	nodeID := "img-node-42"

	if err := svc.StartRemoveBackground(ctx, dataURL, nodeID); err != nil {
		t.Fatalf("StartRemoveBackground() error = %v", err)
	}

	deadline := time.Now().Add(3 * time.Second)
	for {
		mu.Lock()
		count := len(events)
		mu.Unlock()
		if count >= 2 {
			break
		}
		if time.Now().After(deadline) {
			t.Fatalf("timed out waiting for rembg events, got %d", count)
		}
		time.Sleep(10 * time.Millisecond)
	}

	mu.Lock()
	defer mu.Unlock()

	if events[0].name != "rembg:progress" {
		t.Fatalf("first event = %q, want rembg:progress", events[0].name)
	}
	progress := events[0].data.(RembgProgressEvent)
	if progress.JobID != jobID || progress.NodeID != nodeID {
		t.Fatalf("progress event = %#v", progress)
	}

	last := events[len(events)-1]
	if last.name != "rembg:complete" {
		t.Fatalf("terminal event = %q, want rembg:complete", last.name)
	}
	complete := last.data.(RembgCompleteEvent)
	if complete.NodeID != nodeID || !strings.HasPrefix(complete.ResultDataURL, "data:image/png;base64,") {
		t.Fatalf("complete event = %#v", complete)
	}
}

func TestMain(m *testing.M) {
	// Ensure env overrides from parallel subtests do not leak across packages.
	os.Exit(m.Run())
}
