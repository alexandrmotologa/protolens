package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/alexandrmotologa/protolens/pkg/benchmark"
	"github.com/alexandrmotologa/protolens/server/state"
)

func HandleBenchmark(state *state.AppState) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req benchmark.BenchmarkRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid benchmark request: "+err.Error(), http.StatusBadRequest)
			return
		}

		if req.Target == "" || req.Method == "" {
			http.Error(w, "target and method are required", http.StatusBadRequest)
			return
		}

		files, _ := state.GetSchema()
		if files == nil {
			http.Error(w, "no proto schema loaded to run benchmark", http.StatusBadRequest)
			return
		}

		report, err := benchmark.RunBenchmark(r.Context(), state.ClientPool, files, req)
		if err != nil {
			http.Error(w, "benchmark run error: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(report)
	}
}
