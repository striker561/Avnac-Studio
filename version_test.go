package main

import (
	"encoding/json"
	"os"
	"strings"
	"testing"
)

// The release workflow stamps a tag into main.go and wails.json before building.
// If the two ever disagree, the app reports one version and the installer /
// release asset another, which is exactly the kind of mix-up that ships quietly.
func TestAppVersionAgreesWithWailsConfig(t *testing.T) {
	raw, err := os.ReadFile("wails.json")
	if err != nil {
		t.Fatalf("read wails.json: %v", err)
	}

	var config struct {
		Info struct {
			ProductVersion string `json:"productVersion"`
		} `json:"info"`
	}
	if err := json.Unmarshal(raw, &config); err != nil {
		t.Fatalf("parse wails.json: %v", err)
	}

	productVersion := strings.TrimSpace(config.Info.ProductVersion)
	if productVersion == "" {
		t.Fatal("wails.json has no info.productVersion")
	}

	// The updater compares appVersion against GitHub release tag names, which
	// carry the v prefix; wails.json feeds exe/dmg/NSIS metadata without it.
	if want := "v" + productVersion; appVersion != want {
		t.Fatalf("main.go appVersion = %q, but wails.json productVersion = %q (want %q). Run `node scripts/set-version.mjs v%s`.", appVersion, productVersion, want, productVersion)
	}
}
