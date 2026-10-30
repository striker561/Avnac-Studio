package avnacserver

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
)

// stubKeys is a keyProvider that never touches the OS keyring.
type stubKeys struct{ key string }

func (s stubKeys) GetKey(string) (string, error) { return s.key, nil }

// unsplashStub is a fake Unsplash API that records what it was asked for.
type unsplashStub struct {
	mu       sync.Mutex
	searches int
	popular  int
	download int
	lastPath []string

	status        int
	limitHeader   string
	remainHeader  string
	searchPhotos  []map[string]any
	totalPages    int
	popularPhotos []map[string]any
}

func (u *unsplashStub) counts() (searches, popular, download int) {
	u.mu.Lock()
	defer u.mu.Unlock()
	return u.searches, u.popular, u.download
}

func (u *unsplashStub) handler(t *testing.T) http.Handler {
	t.Helper()
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		u.mu.Lock()
		u.lastPath = append(u.lastPath, r.URL.Path)
		status := u.status
		u.mu.Unlock()

		if u.limitHeader != "" {
			w.Header().Set("X-Ratelimit-Limit", u.limitHeader)
			w.Header().Set("X-Ratelimit-Remaining", u.remainHeader)
		}
		if status != 0 {
			w.WriteHeader(status)
			_, _ = w.Write([]byte(`{"errors":["stubbed failure"]}`))
			return
		}

		w.Header().Set("Content-Type", "application/json")
		switch {
		case strings.HasPrefix(r.URL.Path, "/search/photos"):
			u.mu.Lock()
			u.searches++
			photos, pages := u.searchPhotos, u.totalPages
			u.mu.Unlock()
			if pages < 1 {
				pages = 1
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"results":     photos,
				"total_pages": pages,
			})
		case r.URL.Path == "/photos":
			u.mu.Lock()
			u.popular++
			photos := u.popularPhotos
			u.mu.Unlock()
			_ = json.NewEncoder(w).Encode(photos)
		case strings.HasPrefix(r.URL.Path, "/photos/") && strings.HasSuffix(r.URL.Path, "/download"):
			u.mu.Lock()
			u.download++
			u.mu.Unlock()
			_ = json.NewEncoder(w).Encode(map[string]any{"url": "https://images.unsplash.com/x.jpg"})
		default:
			http.NotFound(w, r)
		}
	})
}

// stubPhoto builds a search result for photoID with predictable URLs.
func stubPhoto(id, downloadLocation string) map[string]any {
	return map[string]any{
		"id":     id,
		"width":  4000,
		"height": 3000,
		"urls": map[string]string{
			"small":   "https://images.unsplash.com/photo-" + id + "?w=400",
			"regular": "https://images.unsplash.com/photo-" + id + "?ixid=abc&w=1080",
			"full":    "https://images.unsplash.com/photo-" + id + "?w=4000",
		},
		"links": map[string]string{
			"download_location": downloadLocation,
			"html":              "https://unsplash.com/photos/" + id,
		},
		"user": map[string]any{"name": "Ada", "links": map[string]string{"html": "https://unsplash.com/@ada"}},
	}
}

func newStubService(t *testing.T, stub *unsplashStub) *UnsplashService {
	t.Helper()
	server := httptest.NewServer(stub.handler(t))
	t.Cleanup(server.Close)
	return newUnsplashService(stubKeys{key: "test-key"}, server.URL)
}

func TestSearchCachesRepeatedQuery(t *testing.T) {
	stub := &unsplashStub{
		searchPhotos: []map[string]any{stubPhoto("111", "")},
		totalPages:   3,
	}
	svc := newStubService(t, stub)

	first, err := svc.Search("mountains", 1, 10)
	if err != nil {
		t.Fatalf("Search() error = %v", err)
	}
	if len(first.Photos) != 1 || !first.HasMore {
		t.Fatalf("unexpected first result: %+v", first)
	}

	if _, err := svc.Search("mountains", 1, 10); err != nil {
		t.Fatalf("second Search() error = %v", err)
	}
	if searches, _, _ := stub.counts(); searches != 1 {
		t.Fatalf("upstream searches = %d, want 1 (identical query should be cached)", searches)
	}

	// A different page is a different query and must reach the API.
	if _, err := svc.Search("mountains", 2, 10); err != nil {
		t.Fatalf("paged Search() error = %v", err)
	}
	if searches, _, _ := stub.counts(); searches != 2 {
		t.Fatalf("upstream searches = %d, want 2", searches)
	}
}

func TestSearchCachedPhotosStillTrackPlacements(t *testing.T) {
	stub := &unsplashStub{
		searchPhotos: []map[string]any{stubPhoto("222", "")},
		totalPages:   1,
	}
	svc := newStubService(t, stub)
	// Point the photo's download_location at the stub itself.
	location := svc.baseURL + "/photos/222/download"
	stub.searchPhotos = []map[string]any{stubPhoto("222", location)}

	if _, err := svc.Search("cached", 1, 5); err != nil {
		t.Fatalf("Search() error = %v", err)
	}
	// Second call is served from the cache — and must still be placeable.
	if _, err := svc.Search("cached", 1, 5); err != nil {
		t.Fatalf("cached Search() error = %v", err)
	}
	if n := svc.TrackPlacements([]string{"https://images.unsplash.com/photo-222?ixid=abc&w=1080"}); n != 1 {
		t.Fatalf("TrackPlacements fired %d, want 1", n)
	}
	if _, _, downloads := stub.counts(); downloads != 1 {
		t.Fatalf("download calls = %d, want 1", downloads)
	}
}

func TestTrackPlacementsFiresOncePerPhoto(t *testing.T) {
	stub := &unsplashStub{totalPages: 1}
	svc := newStubService(t, stub)
	stub.searchPhotos = []map[string]any{
		stubPhoto("333", svc.baseURL+"/photos/333/download"),
	}

	if _, err := svc.Search("forest", 1, 5); err != nil {
		t.Fatalf("Search() error = %v", err)
	}

	// The same photo placed twice, once verbatim and once with sizing params
	// an agent appended, plus an unrelated URL that must be ignored.
	urls := []string{
		"https://images.unsplash.com/photo-333?ixid=abc&w=1080",
		"https://images.unsplash.com/photo-333?ixid=abc&w=1080&h=720&fit=crop",
		"https://example.com/not-unsplash.jpg",
	}
	if n := svc.TrackPlacements(urls); n != 1 {
		t.Fatalf("TrackPlacements fired %d, want 1", n)
	}
	if _, _, downloads := stub.counts(); downloads != 1 {
		t.Fatalf("download calls = %d, want 1", downloads)
	}

	// Re-rendering the design must not spend another download.
	if n := svc.TrackPlacements(urls); n != 0 {
		t.Fatalf("second TrackPlacements fired %d, want 0", n)
	}
	if _, _, downloads := stub.counts(); downloads != 1 {
		t.Fatalf("download calls after re-place = %d, want 1", downloads)
	}
}

func TestTrackPlacementsIgnoresUnsearchedURLs(t *testing.T) {
	stub := &unsplashStub{totalPages: 1}
	svc := newStubService(t, stub)

	if n := svc.TrackPlacements([]string{"https://images.unsplash.com/photo-999?w=1080"}); n != 0 {
		t.Fatalf("TrackPlacements fired %d, want 0 for an unknown photo", n)
	}
	if _, _, downloads := stub.counts(); downloads != 0 {
		t.Fatalf("download calls = %d, want 0", downloads)
	}
}

func TestDownloadRejectsForeignHost(t *testing.T) {
	svc := newUnsplashService(stubKeys{key: "test-key"}, "https://api.unsplash.com")

	for _, raw := range []string{
		"https://evil.example/photos/1/download",
		"http://api.unsplash.com/photos/1/download",
		"not a url",
	} {
		if err := svc.Download(raw); err == nil {
			t.Fatalf("Download(%q) error = nil, want rejection", raw)
		}
	}
}

func TestDownloadRetriesAfterFailure(t *testing.T) {
	stub := &unsplashStub{status: http.StatusInternalServerError}
	svc := newStubService(t, stub)
	location := svc.baseURL + "/photos/444/download"

	if err := svc.Download(location); err == nil {
		t.Fatal("expected the failing tracking call to report an error")
	}

	// The failure must not be remembered as a completed download.
	stub.mu.Lock()
	stub.status = 0
	stub.mu.Unlock()
	if err := svc.Download(location); err != nil {
		t.Fatalf("retry Download() error = %v", err)
	}
	if _, _, downloads := stub.counts(); downloads != 1 {
		t.Fatalf("download calls = %d, want 1", downloads)
	}
}

func TestSearchQuotaExhaustedIsNotReportedAsInvalidKey(t *testing.T) {
	stub := &unsplashStub{
		status:       http.StatusForbidden,
		limitHeader:  "50",
		remainHeader: "0",
	}
	svc := newStubService(t, stub)

	_, err := svc.Search("cats", 1, 5)
	if err == nil {
		t.Fatal("expected an error for an exhausted quota")
	}
	msg := err.Error()
	if !strings.Contains(msg, "hourly limit reached") {
		t.Fatalf("error = %q, want the quota message", msg)
	}
	if strings.Contains(msg, "invalid") {
		t.Fatalf("error = %q, must not blame the key for a quota hit", msg)
	}
	if !strings.Contains(msg, "0 of 50") {
		t.Fatalf("error = %q, want the remaining/limit numbers", msg)
	}
}

func TestSearchUnauthorizedMentionsKey(t *testing.T) {
	stub := &unsplashStub{status: http.StatusUnauthorized}
	svc := newStubService(t, stub)

	_, err := svc.Search("cats", 1, 5)
	if err == nil {
		t.Fatal("expected an error for a rejected key")
	}
	if !strings.Contains(err.Error(), "invalid Unsplash API key") {
		t.Fatalf("error = %q, want the invalid-key message", err.Error())
	}
}

func TestRateLimitReportsLastReading(t *testing.T) {
	stub := &unsplashStub{
		limitHeader:  "50",
		remainHeader: "42",
		popularPhotos: []map[string]any{
			stubPhoto("555", ""),
		},
	}
	svc := newStubService(t, stub)

	if _, err := svc.RateLimit(); err == nil {
		t.Fatal("expected no quota reading before the first call")
	}
	if _, err := svc.Photos(1, 10); err != nil {
		t.Fatalf("Photos() error = %v", err)
	}
	quota, err := svc.RateLimit()
	if err != nil {
		t.Fatalf("RateLimit() error = %v after a successful call", err)
	}
	if quota.Limit != 50 || quota.Remaining != 42 {
		t.Fatalf("quota = %+v, want limit 50 remaining 42", quota)
	}
}

func TestPhotosClampsPerPage(t *testing.T) {
	stub := &unsplashStub{popularPhotos: []map[string]any{stubPhoto("666", "")}}
	svc := newStubService(t, stub)

	result, err := svc.Photos(1, 500)
	if err != nil {
		t.Fatalf("Photos() error = %v", err)
	}
	// perPage is clamped to 30, so one photo can never mean "more".
	if result.HasMore {
		t.Fatalf("HasMore = true, want false for %d photos under a clamped perPage", len(result.Photos))
	}
}

func TestUnsplashPhotoToken(t *testing.T) {
	cases := map[string]string{
		"https://images.unsplash.com/photo-1500?ixid=x&w=1080": "photo-1500",
		"https://images.unsplash.com/photo-1500/":              "photo-1500",
		"https://images.unsplash.com/photos/some-slug?w=1":     "",
		"https://example.com/photo-1500?w=1":                   "",
		"https://api.unsplash.com/photos/abc/download?ixid=x":  "",
		"": "",
	}
	for raw, want := range cases {
		if got := unsplashPhotoToken(raw); got != want {
			t.Fatalf("unsplashPhotoToken(%q) = %q, want %q", raw, got, want)
		}
	}
}
