package server

import (
	"encoding/json"
	"net/http"

	"github.com/alexandrmotologa/protolens/server/handlers"
	"github.com/alexandrmotologa/protolens/server/state"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

// NewRouter sets up all HTTP routes, middleware, and WebSocket endpoints.
func NewRouter(state *state.AppState) chi.Router {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	r.Route("/api", func(api chi.Router) {
		api.Get("/health", func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]string{
				"status":  "ok",
				"version": "1.0.0",
				"name":    "protolens",
			})
		})

		// Schema routes
		api.Post("/schema/reflect", handlers.HandleReflect(state))
		api.Post("/schema/parse", handlers.HandleParse(state))
		api.Get("/schema", handlers.HandleGetSchema(state))

		// Invocations
		api.Post("/invoke", handlers.HandleInvoke(state))
		api.Get("/stream", handlers.HandleStream(state))

		// Mock server
		api.Post("/mock/start", handlers.HandleMockStart(state))
		api.Post("/mock/stop", handlers.HandleMockStop(state))
		api.Get("/mock/status", handlers.HandleMockStatus(state))

		// CLI & Code Exporter
		api.Post("/export", handlers.HandleExport())
	})

	// Static UI serving
	RegisterStaticRoutes(r)

	return r
}
