package avnacserver

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"path"
	"strconv"
	"strings"
	"sync"
	"time"

	avnacsecrets "Avnac/avnac-system/secrets"
)

const unsplashAPIBase = "https://api.unsplash.com"

// unsplashSearchCacheTTL dedupes identical lookups inside one session.
//
// Search and popular are the calls an iteration loop repeats (the same query
// after an edit, the same page when a panel reopens). Unsplash meters them by
// an hourly window that resets on the clock, not on usage, so a few minutes of
// caching is what stops a design loop from spending the whole budget on
// identical queries.
const unsplashSearchCacheTTL = 2 * time.Minute

// maxUnsplashCacheEntries bounds the response cache. Agents generate unbounded
// query strings, so the whole cache is dropped once it grows past this.
const maxUnsplashCacheEntries = 64

// unsplashHTTPTimeout bounds one API call. Nothing here is interactive enough
// to leave a tool call hanging on a stalled connection.
const unsplashHTTPTimeout = 20 * time.Second

// ---- Types returned directly to the Wails frontend ----

// UnsplashUrls holds the size variants for an Unsplash photo.
type UnsplashUrls struct {
	Small   string `json:"small"`
	Regular string `json:"regular"`
	Full    string `json:"full"`
}

// UnsplashLinks holds relevant links for a photo.
type UnsplashLinks struct {
	DownloadLocation string `json:"download_location"`
	Html             string `json:"html"`
}

// UnsplashUserLinks holds a user's profile link.
type UnsplashUserLinks struct {
	Html string `json:"html"`
}

// UnsplashUser is a minimal representation of an Unsplash user.
type UnsplashUser struct {
	Name  string            `json:"name"`
	Links UnsplashUserLinks `json:"links"`
}

// UnsplashPhoto is a single photo as returned by the Unsplash API.
// Only fields used by the frontend are declared; the rest are ignored.
type UnsplashPhoto struct {
	ID             string        `json:"id"`
	Width          int           `json:"width"`
	Height         int           `json:"height"`
	Description    *string       `json:"description"`
	AltDescription *string       `json:"alt_description"`
	Urls           UnsplashUrls  `json:"urls"`
	Links          UnsplashLinks `json:"links"`
	User           UnsplashUser  `json:"user"`
}

// UnsplashFeedResult is returned by Photos and Search.
type UnsplashFeedResult struct {
	Photos  []UnsplashPhoto `json:"photos"`
	HasMore bool            `json:"hasMore"`
}

// UnsplashRateLimit is the API quota reading from the most recent response.
// Unsplash reports it on every reply via X-Ratelimit-Limit/Remaining.
type UnsplashRateLimit struct {
	Limit     int `json:"limit"`
	Remaining int `json:"remaining"`
}

// ---- Service ----

// keyProvider is the slice of SecretsManager this service needs. Keeping it an
// interface leaves tests off the OS keychain.
type keyProvider interface {
	GetKey(name string) (string, error)
}

// UnsplashService exposes Unsplash operations as Wails-bound methods.
//
// The frontend calls these directly via the Wails IPC bridge:
//
//	window.go.UnsplashService.Photos(page, perPage)
//	window.go.UnsplashService.Search(query, page, perPage)
//	window.go.UnsplashService.Download(downloadLocation)
//	window.go.UnsplashService.RateLimit()
//
// No HTTP fetch or JSON-over-wire is involved on the JS side.
type UnsplashService struct {
	keys    keyProvider
	baseURL string
	client  *http.Client

	mu sync.Mutex
	// cache keeps identical feeds from costing a second request.
	cache map[string]unsplashCacheEntry
	// known maps a photo's image URLs (and its stable "photo-..." token) to
	// the download_location of the same photo, so a later placement can find
	// it without the caller carrying it around.
	known map[string]string
	// tracked records download_locations already reported to Unsplash.
	tracked map[string]struct{}
	// rate is the quota reading from the last response.
	rate    UnsplashRateLimit
	hasRate bool
}

type unsplashCacheEntry struct {
	photos  []UnsplashPhoto
	hasMore bool
	expires time.Time
}

// NewUnsplashService creates an UnsplashService backed by the OS keyring.
func NewUnsplashService(secrets *avnacsecrets.SecretsManager) *UnsplashService {
	if secrets == nil {
		return newUnsplashService(nil, unsplashAPIBase)
	}
	return newUnsplashService(secrets, unsplashAPIBase)
}

// newUnsplashService builds a service against an explicit key source and API
// base URL. The base URL is a parameter so tests can point it at a local
// server instead of the live API.
func newUnsplashService(keys keyProvider, baseURL string) *UnsplashService {
	return &UnsplashService{
		keys:    keys,
		baseURL: strings.TrimRight(baseURL, "/"),
		client:  &http.Client{Timeout: unsplashHTTPTimeout},
		cache:   make(map[string]unsplashCacheEntry),
		known:   make(map[string]string),
		tracked: make(map[string]struct{}),
	}
}

func (s *UnsplashService) accessKey() (string, error) {
	if s.keys == nil {
		return "", fmt.Errorf("no Unsplash API key found — add one in Settings to enable image search")
	}
	key, err := s.keys.GetKey("unsplash")
	if err != nil {
		return "", fmt.Errorf("could not read Unsplash API key: %w", err)
	}
	if strings.TrimSpace(key) == "" {
		return "", fmt.Errorf("no Unsplash API key found — add one in Settings to enable image search")
	}
	return key, nil
}

func (s *UnsplashService) get(endpoint, key string) (*http.Response, error) {
	req, err := http.NewRequest(http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Client-ID "+key)

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}

	limit, remaining, haveLimit := s.recordRateLimit(resp)

	switch {
	case resp.StatusCode == http.StatusUnauthorized:
		_ = resp.Body.Close()
		return nil, fmt.Errorf("invalid Unsplash API key — update it in Settings and try again")
	case resp.StatusCode == http.StatusForbidden || resp.StatusCode == http.StatusTooManyRequests:
		_ = resp.Body.Close()
		return nil, rateLimitError(resp.StatusCode, limit, remaining, haveLimit)
	case resp.StatusCode < 200 || resp.StatusCode >= 300:
		_ = resp.Body.Close()
		return nil, fmt.Errorf("Unsplash is temporarily unavailable (status %d) — try again in a moment", resp.StatusCode)
	}
	return resp, nil
}

// rateLimitError explains a 403/429. Unsplash answers 403 both for an
// unapproved app and for an exhausted hourly quota, and calling a quota hit an
// invalid key sends the user looking for a new one for no reason — so the
// remaining count decides which story is told.
func rateLimitError(status, limit, remaining int, haveLimit bool) error {
	switch {
	case haveLimit && remaining <= 0:
		return fmt.Errorf("Unsplash hourly limit reached (0 of %d requests left) — wait for the reset, or use a different access key in Settings", limit)
	case haveLimit:
		return fmt.Errorf("Unsplash refused the request (status %d, %d of %d requests left) — retry shortly or check the key's app status", status, remaining, limit)
	default:
		return fmt.Errorf("Unsplash refused the request (status %d) — the access key may be rate limited or not yet approved for production", status)
	}
}

// recordRateLimit stores the X-Ratelimit-* headers Unsplash sends on every
// reply. Absent headers (proxies, errors) leave the previous reading alone.
func (s *UnsplashService) recordRateLimit(resp *http.Response) (limit, remaining int, ok bool) {
	limit, errLimit := strconv.Atoi(strings.TrimSpace(resp.Header.Get("X-Ratelimit-Limit")))
	remaining, errRemaining := strconv.Atoi(strings.TrimSpace(resp.Header.Get("X-Ratelimit-Remaining")))
	if errLimit != nil || errRemaining != nil {
		return 0, 0, false
	}
	s.mu.Lock()
	s.rate = UnsplashRateLimit{Limit: limit, Remaining: remaining}
	s.hasRate = true
	s.mu.Unlock()
	return limit, remaining, true
}

// RateLimit reports the quota reading from the last API response. It returns
// an error until a call has been made.
//
// The signature is service-style (value, error) because UnsplashService is
// bound to the frontend, and Wails only accepts that shape.
func (s *UnsplashService) RateLimit() (UnsplashRateLimit, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if !s.hasRate {
		return UnsplashRateLimit{}, fmt.Errorf("no Unsplash request has been made yet")
	}
	return s.rate, nil
}

func clamp(v, lo, hi int) int {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}

// Photos returns the most popular Unsplash photos for the given page.
func (s *UnsplashService) Photos(page, perPage int) (UnsplashFeedResult, error) {
	page = clamp(page, 1, 1<<30)
	perPage = clamp(perPage, 1, 30)

	cacheKey := fmt.Sprintf("popular|%d|%d", page, perPage)
	if cached, ok := s.cachedFeed(cacheKey); ok {
		return cached, nil
	}

	key, err := s.accessKey()
	if err != nil {
		return UnsplashFeedResult{}, err
	}

	endpoint := fmt.Sprintf("%s/photos?page=%d&per_page=%d&order_by=popular",
		s.baseURL, page, perPage)

	resp, err := s.get(endpoint, key)
	if err != nil {
		return UnsplashFeedResult{}, err
	}
	defer resp.Body.Close()

	var photos []UnsplashPhoto
	if err := json.NewDecoder(resp.Body).Decode(&photos); err != nil {
		return UnsplashFeedResult{}, fmt.Errorf("decode response: %w", err)
	}

	result := UnsplashFeedResult{
		Photos:  photos,
		HasMore: len(photos) >= perPage,
	}
	s.rememberFeed(cacheKey, photos, result.HasMore)
	return result, nil
}

// Search returns Unsplash photos matching query.
func (s *UnsplashService) Search(query string, page, perPage int) (UnsplashFeedResult, error) {
	if query == "" {
		return UnsplashFeedResult{Photos: []UnsplashPhoto{}}, nil
	}
	page = clamp(page, 1, 1<<30)
	perPage = clamp(perPage, 1, 30)

	cacheKey := fmt.Sprintf("search|%s|%d|%d", query, page, perPage)
	if cached, ok := s.cachedFeed(cacheKey); ok {
		return cached, nil
	}

	key, err := s.accessKey()
	if err != nil {
		return UnsplashFeedResult{}, err
	}

	endpoint := fmt.Sprintf("%s/search/photos?query=%s&page=%d&per_page=%d",
		s.baseURL, url.QueryEscape(query), page, perPage)

	resp, err := s.get(endpoint, key)
	if err != nil {
		return UnsplashFeedResult{}, err
	}
	defer resp.Body.Close()

	var body struct {
		Results    []UnsplashPhoto `json:"results"`
		TotalPages int             `json:"total_pages"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return UnsplashFeedResult{}, fmt.Errorf("decode response: %w", err)
	}

	totalPages := body.TotalPages
	if totalPages < 1 {
		totalPages = 1
	}

	photos := body.Results
	if photos == nil {
		photos = []UnsplashPhoto{}
	}

	result := UnsplashFeedResult{
		Photos:  photos,
		HasMore: page < totalPages,
	}
	s.rememberFeed(cacheKey, photos, result.HasMore)
	return result, nil
}

func (s *UnsplashService) cachedFeed(key string) (UnsplashFeedResult, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	entry, ok := s.cache[key]
	if !ok || !time.Now().Before(entry.expires) {
		return UnsplashFeedResult{}, false
	}

	// Copy so a caller cannot mutate the cached records.
	photos := make([]UnsplashPhoto, len(entry.photos))
	copy(photos, entry.photos)
	return UnsplashFeedResult{Photos: photos, HasMore: entry.hasMore}, true
}

// rememberFeed caches a decoded feed and indexes its photos so placements can
// resolve back to a download_location.
func (s *UnsplashService) rememberFeed(key string, photos []UnsplashPhoto, hasMore bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if len(s.cache) >= maxUnsplashCacheEntries {
		s.cache = make(map[string]unsplashCacheEntry)
	}
	s.cache[key] = unsplashCacheEntry{
		photos:  photos,
		hasMore: hasMore,
		expires: time.Now().Add(unsplashSearchCacheTTL),
	}
	for _, photo := range photos {
		s.rememberPhotoLocked(photo)
	}
}

// rememberPhotoLocked indexes one photo's URLs (and its stable image token) to
// its download_location. Callers must hold s.mu.
func (s *UnsplashService) rememberPhotoLocked(p UnsplashPhoto) {
	location := strings.TrimSpace(p.Links.DownloadLocation)
	if location == "" {
		return
	}
	for _, u := range []string{p.Urls.Small, p.Urls.Regular, p.Urls.Full, p.Links.Html} {
		if u = strings.TrimSpace(u); u != "" {
			s.known[u] = location
		}
	}
	for _, u := range []string{p.Urls.Regular, p.Urls.Small, p.Urls.Full} {
		if token := unsplashPhotoToken(u); token != "" {
			s.known[token] = location
			break
		}
	}
}

// Download fires the Unsplash download-tracking endpoint as required by the
// Unsplash API guidelines. downloadLocation must be an API URL on this
// service's own host.
//
// Each photo is reported once: Unsplash wants the call when a photo is used,
// not once per placement, and every call spends quota. A repeat is a no-op.
func (s *UnsplashService) Download(downloadLocation string) error {
	_, err := s.trackDownload(downloadLocation)
	return err
}

// trackDownload performs the tracking request and reports whether this call
// was the one that actually reached Unsplash (false when the photo had already
// been reported).
func (s *UnsplashService) trackDownload(downloadLocation string) (bool, error) {
	downloadLocation = strings.TrimSpace(downloadLocation)
	if !s.isDownloadLocation(downloadLocation) {
		return false, fmt.Errorf("invalid download URL")
	}

	key, err := s.accessKey()
	if err != nil {
		return false, err
	}

	s.mu.Lock()
	if _, done := s.tracked[downloadLocation]; done {
		s.mu.Unlock()
		return false, nil
	}
	s.tracked[downloadLocation] = struct{}{}
	s.mu.Unlock()

	resp, err := s.get(downloadLocation, key)
	if err != nil {
		// A failed call was not a download, so let a later placement retry.
		s.mu.Lock()
		delete(s.tracked, downloadLocation)
		s.mu.Unlock()
		return false, err
	}
	_, _ = io.Copy(io.Discard, resp.Body)
	_ = resp.Body.Close()
	return true, nil
}

// TrackPlacements reports every photo a placement actually used and returns
// how many tracking calls went out.
//
// The hook belongs here rather than in search: Unsplash counts a download when
// this call is made, so tracking at search time would book every photo an
// agent merely previewed and spend quota on images nobody placed. URLs that do
// not match a photo returned by this process's searches are ignored.
func (s *UnsplashService) TrackPlacements(urls []string) int {
	fired := 0
	seen := make(map[string]struct{}, len(urls))
	for _, raw := range urls {
		location := s.downloadLocationFor(raw)
		if location == "" {
			continue
		}
		if _, dup := seen[location]; dup {
			continue
		}
		seen[location] = struct{}{}
		firedNow, err := s.trackDownload(location)
		if err != nil {
			log.Printf("[unsplash] download tracking failed: %v", err)
			continue
		}
		if firedNow {
			fired++
		}
	}
	return fired
}

// downloadLocationFor resolves a placement URL to its photo's
// download_location, by exact URL first and then by the stable "photo-..."
// token, because agents routinely re-append sizing parameters to image URLs.
func (s *UnsplashService) downloadLocationFor(raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return ""
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if location, ok := s.known[trimmed]; ok {
		return location
	}
	if token := unsplashPhotoToken(trimmed); token != "" {
		if location, ok := s.known[token]; ok {
			return location
		}
	}
	return ""
}

// isDownloadLocation reports whether raw is an API URL on this service's own
// host. Without it a placement URL could turn into an arbitrary server-side
// fetch.
func (s *UnsplashService) isDownloadLocation(raw string) bool {
	parsed, err := url.Parse(raw)
	if err != nil {
		return false
	}
	base, err := url.Parse(s.baseURL)
	if err != nil {
		return false
	}
	return parsed.Scheme == base.Scheme && parsed.Host == base.Host
}

// unsplashPhotoToken returns the stable "photo-<id>" path segment of an
// images.unsplash.com URL, which survives resizing parameters and other
// variants of the same photo. Returns "" for anything else.
func unsplashPhotoToken(raw string) string {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil {
		return ""
	}
	if !strings.EqualFold(parsed.Hostname(), "images.unsplash.com") {
		return ""
	}
	token := path.Base(parsed.Path)
	if !strings.HasPrefix(token, "photo-") {
		return ""
	}
	return token
}
