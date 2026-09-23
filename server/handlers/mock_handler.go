package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/alexandrmotologa/protolens/pkg/mock"
	"github.com/alexandrmotologa/protolens/server/state"
)

type MockStatusResponse struct {
	Running   bool `json:"running"`
	Port      int  `json:"port"`
	LatencyMs int  `json:"latencyMs"`
	ErrorCode int  `json:"errorCode"`
}

func HandleMockStart(state *state.AppState) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var cfg mock.MockServerConfig
		if err := json.NewDecoder(r.Body).Decode(&cfg); err != nil {
			http.Error(w, "invalid request body", http.StatusBadRequest)
			return
		}

		files, _ := state.GetSchema()
		if files == nil {
			http.Error(w, "no proto schema loaded; reflect or load proto first", http.StatusBadRequest)
			return
		}

		if state.MockSrv != nil && state.MockSrv.IsRunning() {
			state.MockSrv.Stop()
		}

		mockSrv := mock.NewServer(cfg, files)
		if err := mockSrv.Start(); err != nil {
			http.Error(w, "failed to start mock server: "+err.Error(), http.StatusInternalServerError)
			return
		}

		state.MockSrv = mockSrv

		resp := MockStatusResponse{
			Running:   true,
			Port:      mockSrv.Port(),
			LatencyMs: cfg.LatencyMs,
			ErrorCode: cfg.ErrorCode,
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	}
}

func HandleMockStop(state *state.AppState) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if state.MockSrv != nil {
			state.MockSrv.Stop()
			state.MockSrv = nil
		}

		resp := MockStatusResponse{
			Running: false,
			Port:    0,
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	}
}

func HandleMockStatus(state *state.AppState) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		resp := MockStatusResponse{
			Running: false,
		}
		if state.MockSrv != nil && state.MockSrv.IsRunning() {
			resp.Running = true
			resp.Port = state.MockSrv.Port()
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	}
}
