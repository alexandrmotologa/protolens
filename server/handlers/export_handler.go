package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/alexandrmotologa/protolens/pkg/exporter"
	"github.com/alexandrmotologa/protolens/pkg/transport"
)

type ExportRequest struct {
	Type        string              `json:"type"` // "grpcurl", "curl"
	Target      string              `json:"target"`
	Method      string              `json:"method"`
	PayloadJSON string              `json:"payloadJson"`
	Headers     map[string]string   `json:"headers"`
	TLS         transport.TLSConfig `json:"tls"`
}

type ExportResponse struct {
	Command string `json:"command"`
}

func HandleExport() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req ExportRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid request body", http.StatusBadRequest)
			return
		}

		opts := exporter.ExportOptions{
			Target:      req.Target,
			Method:      req.Method,
			PayloadJSON: req.PayloadJSON,
			Headers:     req.Headers,
			TLS:         req.TLS,
		}

		var cmd string
		if req.Type == "curl" {
			cmd = exporter.GenerateCurl(opts)
		} else {
			cmd = exporter.GenerateGrpcurl(opts)
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(ExportResponse{Command: cmd})
	}
}
