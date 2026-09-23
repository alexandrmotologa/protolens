package server

import (
	"embed"
	"io"
	"io/fs"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
)

//go:embed dist/*
var embeddedUI embed.FS

// RegisterStaticRoutes mounts the embedded UI with SPA routing fallback.
func RegisterStaticRoutes(r chi.Router) {
	distFS, err := fs.Sub(embeddedUI, "dist")
	if err != nil {
		return
	}
	fileServer := http.FileServer(http.FS(distFS))

	r.Get("/*", func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/")
		if path != "" && !strings.HasPrefix(path, "api/") {
			if f, err := distFS.Open(path); err == nil {
				_ = f.Close()
				fileServer.ServeHTTP(w, r)
				return
			}
		}

		// Fallback to index.html for SPA
		indexFile, err := distFS.Open("index.html")
		if err != nil {
			http.NotFound(w, r)
			return
		}
		defer indexFile.Close()

		data, err := io.ReadAll(indexFile)
		if err != nil {
			http.Error(w, "failed to read index.html", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		http.ServeContent(w, r, "index.html", time.Now(), strings.NewReader(string(data)))
	})
}
