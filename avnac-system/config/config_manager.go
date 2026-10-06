package avnacconfig

import (
	"fmt"
	"sync"
)

// ConfigManager is a Wails-bound struct that exposes Get/Save to the frontend
// and notifies internal services (UnsplashService, MediaProxy) when the config
// changes. Register services with AddWatcher before calling Startup.
type ConfigManager struct {
	mu       sync.RWMutex
	appDir   string
	current  *AppConfig
	watchers []func(*AppConfig)
}

// NewConfigManager returns a ConfigManager initialised with an empty config.
// Call AddWatcher for each service that needs to react to config changes, then
// call Startup once the app directories are available.
func NewConfigManager() *ConfigManager {
	return &ConfigManager{current: &AppConfig{}}
}

// AddWatcher registers fn to be called with the new config whenever Save is
// called, and once during Startup with the loaded (or empty) config.
func (m *ConfigManager) AddWatcher(fn func(*AppConfig)) {
	m.watchers = append(m.watchers, fn)
}

// Startup loads the persisted config file and notifies all registered
// watchers. It is called from the Wails startup hook after EnsureAppDirs.
func (m *ConfigManager) Startup(appDir string) {
	m.appDir = appDir
	cfg, err := Load(appDir)
	if err != nil {
		cfg = &AppConfig{}
	}
	m.apply(cfg)
}

// Get returns a copy of the current application configuration.
func (m *ConfigManager) Get() *AppConfig {
	m.mu.RLock()
	clone := *m.current
	m.mu.RUnlock()
	return &clone
}

// Save normalises cfg, persists it to disk, and notifies all registered
// watchers so that runtime services pick up the new values immediately.
func (m *ConfigManager) Save(cfg *AppConfig) error {
	if m.appDir == "" {
		return fmt.Errorf("avnac: config not initialised - startup has not run yet")
	}
	next := normalizeConfig(cfg)
	if err := Save(m.appDir, next); err != nil {
		return err
	}
	m.apply(next)
	return nil
}

// apply stores cfg as the current config and calls all registered watchers.
func (m *ConfigManager) apply(cfg *AppConfig) {
	m.mu.Lock()
	m.current = cfg
	m.mu.Unlock()
	for _, w := range m.watchers {
		w(cfg)
	}
}

func normalizeConfig(cfg *AppConfig) *AppConfig {
	if cfg == nil {
		return &AppConfig{SnapIntensity: 1, RotationSensitivity: 0.75}
	}
	// UnsplashAccessKey is intentionally omitted — secrets are stored in the
	// OS keyring via SecretsManager, not in this config file.
	snap := cfg.SnapIntensity
	if snap < 0 {
		snap = 0
	}
	if snap > 1 {
		snap = 1
	}
	// Clamp rotation sensitivity to valid range; default to 0.75 when unset.
	rotSensitivity := cfg.RotationSensitivity
	if rotSensitivity < 0.1 || !isFiniteFloat(rotSensitivity) {
		rotSensitivity = 0.75
	}
	if rotSensitivity > 1.5 {
		rotSensitivity = 1.5
	}
	// If snap is exactly 0 and was never set (zero-value), default to 1.
	// We distinguish "explicitly 0" from "never saved" only when the field
	// is already present on the struct — keep it as-is if it has been set.
	// MCP port 0 means "choose a free port at startup"; explicit values must
	// be unprivileged ports, anything else falls back to dynamic selection.
	mcpPort := cfg.MCPPort
	if mcpPort != 0 && (mcpPort < 1024 || mcpPort > 65535) {
		mcpPort = 0
	}
	return &AppConfig{
		SnapIntensity:       snap,
		DeveloperMode:       cfg.DeveloperMode,
		RotationSensitivity: rotSensitivity,
		MCPEnabled:          cfg.MCPEnabled,
		MCPPort:             mcpPort,
	}
}

func isFiniteFloat(f float64) bool {
	return f == f && f+1 != f // NaN check and infinity check
}
