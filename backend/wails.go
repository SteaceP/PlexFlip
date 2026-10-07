
package main

import (
	"context"
	_ "embed"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"runtime"
	"syscall"
	"time"

	"github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed icon.png
var appIconBytes []byte

type DesktopService struct {
	app *application.App
}

func (s *DesktopService) GetVersion() string {
	return "0.1.0"
}

func (s *DesktopService) IsDesktop() bool {
	return true
}

func (s *DesktopService) ToggleFullscreen() {
	if s.app != nil {
		if win, ok := s.app.Window.GetByName("main"); ok && win != nil {
			win.ToggleFullscreen()
		}
	}
}

func (s *DesktopService) Focus() {
	if s.app != nil {
		if win, ok := s.app.Window.GetByName("main"); ok && win != nil {
			win.UnMinimise()
			win.Restore()
			win.Show()
			win.Focus()
		}
	}
}

func (s *DesktopService) OpenURL(targetURL string) error {
	if s.app != nil && s.app.Browser != nil {
		return s.app.Browser.OpenURL(targetURL)
	}
	return openBrowserOS(targetURL)
}

func openBrowserOS(targetURL string) error {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "linux":
		if _, err := exec.LookPath("xdg-open"); err == nil {
			cmd = exec.Command("xdg-open", targetURL)
		} else if _, err := exec.LookPath("gio"); err == nil {
			cmd = exec.Command("gio", "open", targetURL)
		} else {
			cmd = exec.Command("x-www-browser", targetURL)
		}
	case "darwin":
		cmd = exec.Command("open", targetURL)
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", targetURL)
	default:
		return fmt.Errorf("unsupported platform: %s", runtime.GOOS)
	}
	if err := cmd.Start(); err != nil {
		return err
	}
	go func() {
		_ = cmd.Wait()
	}()
	return nil
}

func isHeadlessMode() bool {
	for _, arg := range os.Args[1:] {
		if arg == "--server" || arg == "-server" || arg == "--headless" || arg == "-headless" {
			return true
		}
	}
	if os.Getenv("HEADLESS") == "true" || os.Getenv("NEVU_HEADLESS") == "true" || os.Getenv("SERVER_MODE") == "true" {
		return true
	}
	// On Linux, check if GUI display server is available
	if runtime.GOOS == "linux" {
		if os.Getenv("DISPLAY") == "" && os.Getenv("WAYLAND_DISPLAY") == "" {
			return true
		}
	}
	return false
}

func (a *ServerApp) runLifecycle(server *http.Server, cancel context.CancelFunc) {
	if isHeadlessMode() {
		log.Println("Nevu running in headless/server mode (GUI disabled)")
		quit := make(chan os.Signal, 1)
		signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
		<-quit
		log.Println("Shutting down Nevu server...")
		cancel()
		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer shutdownCancel()
		server.Shutdown(shutdownCtx)
		log.Println("Server stopped")
		return
	}

	log.Println("Starting Nevu desktop application (Wails v3)...")

	desktopSvc := &DesktopService{}
	wailsApp := application.New(application.Options{
		Name:        "Nevu",
		Description: "Nevu - Plex Web UI Desktop Client",
		Icon:        appIconBytes,
		Services: []application.Service{
			application.NewService(desktopSvc),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})
	desktopSvc.app = wailsApp
	a.setWailsApp(wailsApp)

	windowURL := fmt.Sprintf("http://127.0.0.1:%d", a.listenPort)
	wailsApp.Window.NewWithOptions(application.WebviewWindowOptions{
		Name:             "main",
		Title:            "Nevu",
		Width:            1280,
		Height:           800,
		MinWidth:         900,
		MinHeight:        600,
		BackgroundColour: application.NewRGB(15, 23, 42),
		URL:              windowURL,
		Linux: application.LinuxWindow{
			Icon: appIconBytes,
		},
		Mac: application.MacWindow{
			InvisibleTitleBarHeight: 50,
			Backdrop:                application.MacBackdropTranslucent,
			TitleBar:                application.MacTitleBarHiddenInset,
		},
	})

	// Handle OS interrupt signals gracefully while Wails is running
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-quit
		log.Println("Interrupt signal received, closing desktop window...")
		wailsApp.Quit()
	}()

	// Run Wails event loop (blocks until window is closed or Quit is called)
	if err := wailsApp.Run(); err != nil {
		log.Printf("Wails application exited with error: %v", err)
	}

	log.Println("Shutting down Nevu server...")
	cancel()
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()
	server.Shutdown(shutdownCtx)
	log.Println("Server stopped")
}

func (a *ServerApp) setWailsApp(app *application.App) {
	a.wailsMu.Lock()
	defer a.wailsMu.Unlock()
	a.wailsApp = app
}

func (a *ServerApp) injectAuthAndFocus(accessToken, authToken string) {
	a.wailsMu.RLock()
	app := a.wailsApp
	a.wailsMu.RUnlock()

	if app != nil {
		if win, ok := app.Window.GetByName("main"); ok && win != nil {
			js := fmt.Sprintf(`(function() {
				try {
					localStorage.setItem("accessToken", %q);
					localStorage.setItem("accAccessToken", %q);
					if (window.location.pathname !== "/") {
						window.location.href = "/";
					}
				} catch(e) {
					console.error("Failed to inject auth token:", e);
				}
			})();`, accessToken, authToken)
			win.ExecJS(js)
			win.UnMinimise()
			win.Restore()
			win.Show()
			win.Focus()
		}
	}
}

func (a *ServerApp) focusMainWindow() {
	a.wailsMu.RLock()
	app := a.wailsApp
	a.wailsMu.RUnlock()

	if app != nil {
		if win, ok := app.Window.GetByName("main"); ok && win != nil {
			log.Println("Focusing main desktop window...")
			win.UnMinimise()
			win.Restore()
			win.Show()
			win.Focus()
		}
	}
}
