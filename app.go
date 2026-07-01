package main

import (
	"context"
	"log"

	avnacconfig "Avnac/avnac-system/config"
	avnacio "Avnac/avnac-system/io"
	avnacsecrets "Avnac/avnac-system/secrets"
	avnacserver "Avnac/avnac-system/server"

	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx        context.Context
	Config     *avnacconfig.ConfigManager
	Secrets    *avnacsecrets.SecretsManager
	ioManager  *avnacio.IOManager
	Unsplash   *avnacserver.UnsplashService
	Rembg      *avnacserver.RembgService
	mediaProxy *avnacserver.MediaProxy
}

// NewApp creates a new App application struct
func NewApp() *App {
	cfgMgr := avnacconfig.NewConfigManager()
	secrets := avnacsecrets.NewSecretsManager()
	unsplash := avnacserver.NewUnsplashService(secrets)
	rembg := avnacserver.NewRembgService()
	proxy := avnacserver.NewMediaProxy(cfgMgr.Get())
	cfgMgr.AddWatcher(proxy.UpdateConfig)
	return &App{
		Config:     cfgMgr,
		Secrets:    secrets,
		ioManager:  avnacio.NewIOManager(),
		Unsplash:   unsplash,
		Rembg:      rembg,
		mediaProxy: proxy,
	}
}

// MediaProxyMiddleware returns the Wails asset-server middleware that handles
// GET /media/proxy?url=... requests from the webview. This is the only place
// where middleware is used because <img src> and Fabric.js fromURL load images
// by URL — they cannot go through Wails IPC.
func (a *App) MediaProxyMiddleware() assetserver.Middleware {
	return a.mediaProxy.Middleware()
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	appDir, err := avnacio.EnsureAppDirs()
	if err != nil {
		log.Printf("[avnac] could not create app directories: %v", err)
	}

	a.ioManager.Startup(ctx, appDir)
	a.Config.Startup(appDir)

	// One-time migration: move any Unsplash key that was stored in plaintext
	// config.json into the OS keyring, then clear it from the config file.
	if cfg := a.Config.Get(); cfg.UnsplashAccessKey != "" {
		if err := a.Secrets.SetKey("unsplash", cfg.UnsplashAccessKey); err != nil {
			log.Printf("[avnac] migrate unsplash key to keyring: %v", err)
		} else {
			log.Printf("[avnac] migrated Unsplash key from config.json to OS keyring")
			if err := a.Config.Save(&avnacconfig.AppConfig{}); err != nil {
				log.Printf("[avnac] clear legacy unsplash key from config: %v", err)
			}
		}
	}
}

// domReady is called after the frontend DOM is ready and the Wails IPC
// channel is fully connected. We emit "avnac:ready" so the frontend knows
// it is safe to make Go IPC calls. This fires on every page load/reload.
func (a *App) domReady(ctx context.Context) {
	runtime.EventsEmit(ctx, "avnac:ready")
}

// GetVersion returns the current application version string.
func (a *App) GetVersion() string {
	return appVersion
}

// StartRemoveBackground submits the image to the background-removal API
// and starts a background SSE stream. Wails events are emitted for progress,
// completion, and errors so the frontend can update the canvas node.
func (a *App) StartRemoveBackground(imageBase64 string, nodeId string) error {
	return a.Rembg.StartRemoveBackground(a.ctx, imageBase64, nodeId)
}
