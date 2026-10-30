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

// stubCredits swaps the attribution seam for the duration of a test.
func stubCredits(t *testing.T, byURL map[string]avnacserver.UnsplashCredit) {
	t.Helper()
	original := creditForPlacement
	creditForPlacement = func(_ *avnacserver.UnsplashService, url string) (avnacserver.UnsplashCredit, bool) {
		credit, ok := byURL[url]
		return credit, ok
	}
	t.Cleanup(func() { creditForPlacement = original })
}

func TestWithUnsplashCreditsAttachesSearchCredit(t *testing.T) {
	photoURL := "https://images.unsplash.com/photo-9?w=1080"
	stubCredits(t, map[string]avnacserver.UnsplashCredit{
		photoURL: {
			Source:       "unsplash",
			PhotoID:      "9",
			Photographer: "Ada",
			PhotoURL:     "https://unsplash.com/photos/9?utm_source=avnac",
			Text:         "Photo by Ada on Unsplash",
		},
	})

	elements := withUnsplashCredits(nil, []ElementDefinition{
		{Type: "image", URL: strPtr(photoURL)},
		{Type: "rect", Fill: strPtr("#fff")},
	})

	if elements[0].Credit == nil {
		t.Fatal("expected the image element to carry the photo's credit")
	}
	if elements[0].Credit.Text != "Photo by Ada on Unsplash" {
		t.Fatalf("credit text = %q", elements[0].Credit.Text)
	}
	if elements[1].Credit != nil {
		t.Fatal("expected non-image elements to stay credit-free")
	}
}

func TestWithUnsplashCreditsLeavesUnknownAndExplicitCreditsAlone(t *testing.T) {
	stubCredits(t, map[string]avnacserver.UnsplashCredit{
		"https://images.unsplash.com/photo-10?w=1080": {Text: "Photo by Ada on Unsplash"},
	})
	explicit := &avnacserver.UnsplashCredit{Photographer: "Bob", Text: "Photo by Bob on Unsplash"}
	wrongHost := "https://example.com/not-unsplash.jpg"

	elements := withUnsplashCredits(nil, []ElementDefinition{
		{Type: "image", URL: strPtr("https://images.unsplash.com/photo-11?w=1080")},
		{Type: "image", URL: strPtr(wrongHost)},
		{Type: "image", URL: strPtr("https://images.unsplash.com/photo-10?w=1080"), Credit: explicit},
	})

	if elements[0].Credit != nil {
		t.Fatalf("unknown photo got credit %+v", elements[0].Credit)
	}
	if elements[1].Credit != nil {
		t.Fatalf("non-Unsplash url got credit %+v", elements[1].Credit)
	}
	if elements[2].Credit != explicit {
		t.Fatal("expected an explicitly supplied credit to be preserved")
	}
}
