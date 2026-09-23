package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/alexandrmotologa/protolens/pkg/schema"
	"github.com/alexandrmotologa/protolens/pkg/transport"
	"github.com/alexandrmotologa/protolens/server/state"
	"google.golang.org/protobuf/reflect/protoregistry"
)

type ReflectRequest struct {
	Target string              `json:"target"`
	TLS    transport.TLSConfig `json:"tls"`
}

type ParseRequest struct {
	Files       []string `json:"files,omitempty"`
	ImportPaths []string `json:"importPaths,omitempty"`
	Content     string   `json:"content,omitempty"`
	Filename    string   `json:"filename,omitempty"`
}

func HandleReflect(state *state.AppState) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req ReflectRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid request body", http.StatusBadRequest)
			return
		}

		if req.Target == "" {
			http.Error(w, "target endpoint is required", http.StatusBadRequest)
			return
		}

		conn, err := state.ClientPool.GetConn(r.Context(), req.Target, req.TLS)
		if err != nil {
			http.Error(w, "connection failed: "+err.Error(), http.StatusBadGateway)
			return
		}

		reflector := schema.NewReflector()
		reg, files, err := reflector.ReflectServices(r.Context(), conn)
		if err != nil {
			http.Error(w, "reflection failed: "+err.Error(), http.StatusBadGateway)
			return
		}

		reg.Endpoint = req.Target
		state.SetSchema(files, reg)

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(reg)
	}
}

func HandleParse(state *state.AppState) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req ParseRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid request body", http.StatusBadRequest)
			return
		}

		parser := schema.NewParser()
		var reg *schema.SchemaRegistry
		var files *protoregistry.Files
		var err error

		if req.Content != "" {
			reg, files, err = parser.ParseProtoContent(r.Context(), req.Filename, req.Content)
		} else if len(req.Files) > 0 {
			reg, files, err = parser.ParseProtoFiles(r.Context(), req.Files, req.ImportPaths)
		} else {
			http.Error(w, "either content or files must be provided", http.StatusBadRequest)
			return
		}

		if err != nil {
			http.Error(w, "parse failed: "+err.Error(), http.StatusBadRequest)
			return
		}

		state.SetSchema(files, reg)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(reg)
	}
}

func HandleGetSchema(state *state.AppState) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		_, reg := state.GetSchema()
		if reg == nil {
			reg = &schema.SchemaRegistry{Services: []schema.ServiceInfo{}}
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(reg)
	}
}
