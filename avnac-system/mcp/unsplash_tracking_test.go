package mcp

import (
	"testing"
	"time"

	avnacserver "Avnac/avnac-system/server"
)

// capturePlacements swaps the tracking seam for the duration of a test and
// returns a channel of the URL batches it was handed.
func capturePlacements(t *testing.T) <-chan []string {
	t.Helper()
	calls := make(chan []string, 4)
	original := trackUnsplashPlacements
	trackUnsplashPlacements = func(_ *avnacserver.UnsplashService, urls []string) int {
		calls <- urls
		return len(urls)
	}
	t.Cleanup(func() { trackUnsplashPlacements = original })
	return calls
}

func strPtr(s string) *string { return &s }

func TestImageURLsFromElementsOnlyTakesImages(t *testing.T) {
	elements := []ElementDefinition{
		{Type: "rect", Fill: strPtr("#ffffff")},
		{Type: "image", URL: strPtr(" https://images.unsplash.com/photo-1?w=1080 ")},
		{Type: "image"}, // no url: skipped
		{Type: "image", URL: strPtr("   ")},
		{Type: "text", Text: strPtr("hello")},
		{Type: "image", URL: strPtr("https://images.unsplash.com/photo-2?w=1080")},
	}

	urls := imageURLsFromElements(elements)
	if len(urls) != 2 {
		t.Fatalf("imageURLsFromElements() = %v, want 2 urls", urls)
	}
	if urls[0] != "https://images.unsplash.com/photo-1?w=1080" {
		t.Fatalf("first url = %q, want the trimmed image url", urls[0])
	}
	if urls[1] != "https://images.unsplash.com/photo-2?w=1080" {
		t.Fatalf("second url = %q", urls[1])
	}
}

func TestTrackRenderedImagesFiresForPlacedImage(t *testing.T) {
	calls := capturePlacements(t)

	trackRenderedImages(nil, []ElementDefinition{
		{Type: "image", URL: strPtr("https://images.unsplash.com/photo-7?w=1080")},
	}, map[string]any{"created": []any{"node-1"}})

	select {
	case urls := <-calls:
		if len(urls) != 1 || urls[0] != "https://images.unsplash.com/photo-7?w=1080" {
			t.Fatalf("tracked urls = %v, want the placed photo", urls)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("expected placement tracking to fire for a rendered image")
	}
}

func TestTrackRenderedImagesSkipsFailedRender(t *testing.T) {
	calls := capturePlacements(t)

	trackRenderedImages(nil, []ElementDefinition{
		{Type: "image", URL: strPtr("https://images.unsplash.com/photo-8?w=1080")},
	}, map[string]any{"error": noSceneMessage})

	select {
	case urls := <-calls:
		t.Fatalf("tracked %v after a failed render, want nothing", urls)
	case <-time.After(150 * time.Millisecond):
	}
}

func TestTrackRenderedImagesIgnoresBatchesWithoutImages(t *testing.T) {
	calls := capturePlacements(t)

	trackRenderedImages(nil, []ElementDefinition{
		{Type: "rect", Fill: strPtr("#000000")},
		{Type: "text", Text: strPtr("hello")},
	}, map[string]any{"created": []any{"node-1"}})

	select {
	case urls := <-calls:
		t.Fatalf("tracked %v for a batch with no images", urls)
	case <-time.After(150 * time.Millisecond):
	}
}
