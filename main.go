package main

import (
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

var appVersion = "v0.2.4"

func main() {
	// Create an instance of the app structure
	app := NewApp()

	appOptions := &options.App{
		Title:            "Avnac",
		Width:            600,
		Height:           600,
		MinWidth:         600,
		MinHeight:        600,
		WindowStartState: options.Maximised,
		AssetServer: &assetserver.Options{
			Assets:     assets,
			Middleware: app.MediaProxyMiddleware(),
		},
		BackgroundColour:         &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		EnableDefaultContextMenu: false,
		OnStartup:                app.startup,
		OnDomReady:               app.domReady,
		Bind: []interface{}{
			app,
			app.ioManager,
			app.Unsplash,
			app.Config,
			app.Secrets,
		},
	}

	// Create application with options
	err := wails.Run(appOptions)

	if err != nil {
		println("Error:", err.Error())
	}
}
