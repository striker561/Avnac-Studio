// Package avnacserver — Boreas background-removal client.
//
// RembgService submits images to the Boreas API, streams job progress
// over SSE, and emits Wails runtime events so the frontend can show
// live status without polling.
//
// Wails events emitted:
//
//	rembg:progress  — { nodeId, jobId, status }          while job runs
//	rembg:complete  — { nodeId, jobId, resultDataUrl }   on success
//	rembg:error     — { nodeId, jobId, errorMsg }        on failure
//
// Configuration (environment variables):
//
//	BOREAS_URL    Base URL of the Boreas API (defaults to https://boreas.kageapi.cloud)
//	BOREAS_TOKEN  Optional API key sent as X-API-Key
//
// Boreas is an open-source background-removal microservice:
// https://github.com/striker561/boreas
package avnacserver

import (
	"bufio"
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"strings"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// rembgEventsEmit is the Wails event sink used by RembgService. Tests may
// replace it to capture emitted events without a live Wails runtime.
var rembgEventsEmit = runtime.EventsEmit

// ---------------------------------------------------------------------------
// Event payload types (serialised as JSON by Wails)
// ---------------------------------------------------------------------------

type RembgProgressEvent struct {
	NodeID string `json:"nodeId"`
	JobID  string `json:"jobId"`
	Status string `json:"status"`
}

type RembgCompleteEvent struct {
	NodeID        string `json:"nodeId"`
	JobID         string `json:"jobId"`
	ResultDataURL string `json:"resultDataUrl"`
}

type RembgErrorEvent struct {
	NodeID   string `json:"nodeId"`
	JobID    string `json:"jobId"`
	ErrorMsg string `json:"errorMsg"`
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

// RembgService is an internal helper for background-removal jobs.
// It is NOT directly bound to Wails — use App.StartRemoveBackground instead.
// Configuration is read from environment variables:
//
//	BOREAS_URL    Base URL of the Boreas API (optional; has a hosted default)
type RembgService struct{}

// NewRembgService returns a ready-to-use RembgService.
func NewRembgService() *RembgService {
	return &RembgService{}
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const defaultBoreasURL = "https://boreas.kageapi.cloud"

func (s *RembgService) boreasURL() (string, error) {
	u := strings.TrimRight(strings.TrimSpace(os.Getenv("BOREAS_URL")), "/")
	if u == "" {
		return defaultBoreasURL, nil
	}
	return u, nil
}

// buildRequest creates an http.Request with the Cloudflare-friendly headers
// that prevent the request from being blocked as an automated client.
func (s *RembgService) buildRequest(method, url string, body io.Reader) (*http.Request, error) {
	req, err := http.NewRequest(method, url, body)
	if err != nil {
		return nil, err
	}
	// Mimic a real browser to pass Cloudflare's bot-detection heuristics.
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")
	req.Header.Set("Accept", "application/json")
	// Optional bearer token.
	if token := os.Getenv("BOREAS_TOKEN"); token != "" {
		req.Header.Set("X-API-Key", token)
	}
	return req, nil
}

// decodeBase64Image strips a data-URL prefix and decodes the base64 payload.
func decodeBase64Image(imageBase64 string) ([]byte, error) {
	raw := imageBase64
	if idx := strings.Index(raw, ","); idx >= 0 {
		raw = raw[idx+1:]
	}
	// Normalise URL-safe base64 variants.
	raw = strings.ReplaceAll(raw, "-", "+")
	raw = strings.ReplaceAll(raw, "_", "/")
	switch len(raw) % 4 {
	case 2:
		raw += "=="
	case 3:
		raw += "="
	}
	return base64.StdEncoding.DecodeString(raw)
}

// ---------------------------------------------------------------------------
// Public IPC method
// ---------------------------------------------------------------------------

// StartRemoveBackground accepts the canvas image as a base64 data URL,
// submits it to the Boreas API, and starts a background goroutine that
// streams SSE updates back to the frontend as Wails events.
//
// imageBase64 — data URL or raw base64 string of the image (PNG/JPEG/WEBP).
// nodeId      — Saraswati node ID used to correlate events with the canvas node.
// ctx         — Wails runtime context (passed in from App.startup).
//
// Returns immediately after the job is queued; all further feedback arrives
// via the rembg:progress, rembg:complete, and rembg:error Wails events.
func (s *RembgService) StartRemoveBackground(ctx context.Context, imageBase64 string, nodeId string) error {
	baseURL, err := s.boreasURL()
	if err != nil {
		return err
	}

	imgBytes, err := decodeBase64Image(imageBase64)
	if err != nil {
		return fmt.Errorf("decode image: %w", err)
	}

	// Build multipart/form-data body.
	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	fw, err := mw.CreateFormFile("file", "image.png")
	if err != nil {
		return fmt.Errorf("create form field: %w", err)
	}
	if _, err = fw.Write(imgBytes); err != nil {
		return fmt.Errorf("write image data: %w", err)
	}
	mw.Close()

	req, err := s.buildRequest(http.MethodPost, baseURL+"/v1/media/jobs", &buf)
	if err != nil {
		return fmt.Errorf("build upload request: %w", err)
	}
	req.Header.Set("Content-Type", mw.FormDataContentType())

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("submit job: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("job submission failed (HTTP %d): %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var result struct {
		Data struct {
			JobID  string `json:"job_id"`
			Status string `json:"status"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return fmt.Errorf("decode submit response: %w", err)
	}
	if result.Data.JobID == "" {
		return fmt.Errorf("no job_id in API response")
	}

	// Emit initial queued status immediately so the UI can start showing the overlay.
	rembgEventsEmit(ctx, "rembg:progress", RembgProgressEvent{
		NodeID: nodeId,
		JobID:  result.Data.JobID,
		Status: result.Data.Status,
	})

	// Stream SSE updates in the background.
	go s.streamJobUpdates(ctx, result.Data.JobID, nodeId)

	return nil
}

// ---------------------------------------------------------------------------
// SSE streaming
// ---------------------------------------------------------------------------

func (s *RembgService) streamJobUpdates(ctx context.Context, jobID, nodeId string) {
	baseURL, err := s.boreasURL()
	if err != nil {
		s.emitError(ctx, nodeId, jobID, err.Error())
		return
	}
	sseURL := fmt.Sprintf("%s/v1/media/jobs/%s/stream", baseURL, jobID)

	req, err := s.buildRequest(http.MethodGet, sseURL, nil)
	if err != nil {
		s.emitError(ctx, nodeId, jobID, fmt.Sprintf("build SSE request: %v", err))
		return
	}
	req.Header.Set("Accept", "text/event-stream")
	req.Header.Set("Cache-Control", "no-cache")
	req.Header.Set("Connection", "keep-alive")

	// Use a dedicated client with no response timeout for the long-lived SSE connection.
	sseClient := &http.Client{}
	resp, err := sseClient.Do(req)
	if err != nil {
		s.emitError(ctx, nodeId, jobID, fmt.Sprintf("connect to SSE stream: %v", err))
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		s.emitError(ctx, nodeId, jobID, fmt.Sprintf("SSE stream returned HTTP %d", resp.StatusCode))
		return
	}

	scanner := bufio.NewScanner(resp.Body)
	var dataLine string

	for scanner.Scan() {
		line := scanner.Text()

		if strings.HasPrefix(line, "data:") {
			dataLine = strings.TrimSpace(strings.TrimPrefix(line, "data:"))
			continue
		}

		// An empty line dispatches the accumulated event.
		if line == "" && dataLine != "" {
			if done := s.handleSSEEvent(ctx, nodeId, jobID, dataLine); done {
				return
			}
			dataLine = ""
		}
	}

	if err := scanner.Err(); err != nil {
		s.emitError(ctx, nodeId, jobID, fmt.Sprintf("SSE stream read error: %v", err))
	}
}

// handleSSEEvent processes a single parsed SSE data payload.
// Returns true when a terminal event (complete/failed) has been handled.
func (s *RembgService) handleSSEEvent(ctx context.Context, nodeId, jobID, data string) bool {
	var snapshot struct {
		JobID     string  `json:"job_id"`
		Status    string  `json:"status"`
		ResultURL *string `json:"result_url"`
		Error     *string `json:"error"`
	}
	if err := json.Unmarshal([]byte(data), &snapshot); err != nil {
		return false
	}

	switch snapshot.Status {
	case "complete":
		if snapshot.ResultURL == nil || *snapshot.ResultURL == "" {
			s.emitError(ctx, nodeId, jobID, "job completed but result URL is missing")
			return true
		}
		resultBase64, err := s.downloadResult(*snapshot.ResultURL)
		if err != nil {
			s.emitError(ctx, nodeId, jobID, fmt.Sprintf("download result image: %v", err))
			return true
		}
		rembgEventsEmit(ctx, "rembg:complete", RembgCompleteEvent{
			NodeID:        nodeId,
			JobID:         jobID,
			ResultDataURL: "data:image/png;base64," + resultBase64,
		})
		return true

	case "failed":
		errMsg := "background removal failed"
		if snapshot.Error != nil && *snapshot.Error != "" {
			errMsg = *snapshot.Error
		}
		s.emitError(ctx, nodeId, jobID, errMsg)
		return true

	default:
		// queued / preparing / processing — emit progress and continue.
		rembgEventsEmit(ctx, "rembg:progress", RembgProgressEvent{
			NodeID: nodeId,
			JobID:  jobID,
			Status: snapshot.Status,
		})
		return false
	}
}

// ---------------------------------------------------------------------------
// Result download
// ---------------------------------------------------------------------------

func (s *RembgService) downloadResult(url string) (string, error) {
	req, err := s.buildRequest(http.MethodGet, url, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Accept", "image/*,*/*")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("fetch: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("HTTP %d", resp.StatusCode)
	}

	const maxBytes = 20 << 20 // 20 MiB
	data, err := io.ReadAll(io.LimitReader(resp.Body, maxBytes))
	if err != nil {
		return "", fmt.Errorf("read body: %w", err)
	}

	return base64.StdEncoding.EncodeToString(data), nil
}

// ---------------------------------------------------------------------------
// Event helpers
// ---------------------------------------------------------------------------

func (s *RembgService) emitError(ctx context.Context, nodeId, jobID, msg string) {
	rembgEventsEmit(ctx, "rembg:error", RembgErrorEvent{
		NodeID:   nodeId,
		JobID:    jobID,
		ErrorMsg: msg,
	})
}
