package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/alexandrmotologa/protolens/pkg/transport"
	"github.com/alexandrmotologa/protolens/server/state"
)

type FullInvokeRequest struct {
	transport.InvocationRequest
	Protocol string `json:"protocol"` // "grpc" or "connect"
}

func HandleInvoke(state *state.AppState) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req FullInvokeRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid invocation request: "+err.Error(), http.StatusBadRequest)
			return
		}

		if req.Target == "" || req.Method == "" {
			http.Error(w, "target and method are required", http.StatusBadRequest)
			return
		}

		// Handle Connect-RPC
		if req.Protocol == "connect" {
			resp, err := state.ConnectCli.InvokeConnect(r.Context(), req.InvocationRequest)
			if err != nil {
				http.Error(w, "connect invocation failed: "+err.Error(), http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(resp)
			return
		}

		// Handle standard gRPC
		files, _ := state.GetSchema()
		if files == nil {
			http.Error(w, "no proto schema registered; please reflect or load proto first", http.StatusBadRequest)
			return
		}

		resp, err := transport.InvokeUnary(r.Context(), state.ClientPool, files, req.InvocationRequest)
		if err != nil {
			http.Error(w, "gRPC invocation failed: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	}
}
