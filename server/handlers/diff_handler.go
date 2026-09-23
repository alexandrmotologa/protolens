package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/alexandrmotologa/protolens/pkg/schema"
	"github.com/alexandrmotologa/protolens/server/state"
)

// DiffRequest defines the payload for comparing proto schemas.
type DiffRequest struct {
	BaseProto      string `json:"baseProto"`      // optional: if empty, uses active loaded schema
	TargetProto    string `json:"targetProto"`    // required: new proto definition to compare against
	BaseFilename   string `json:"baseFilename"`   // optional
	TargetFilename string `json:"targetFilename"` // optional
}

// HandleSchemaDiff compares two schemas and detects breaking changes and additions.
func HandleSchemaDiff(state *state.AppState) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req DiffRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid diff request body: "+err.Error(), http.StatusBadRequest)
			return
		}

		if req.TargetProto == "" {
			http.Error(w, "targetProto is required to run diff", http.StatusBadRequest)
			return
		}

		parser := schema.NewParser()

		var baseReg *schema.SchemaRegistry
		if req.BaseProto != "" {
			fn := req.BaseFilename
			if fn == "" {
				fn = "base.proto"
			}
			reg, _, err := parser.ParseProtoContent(r.Context(), fn, req.BaseProto)
			if err != nil {
				http.Error(w, "failed to compile base proto: "+err.Error(), http.StatusBadRequest)
				return
			}
			baseReg = reg
		} else {
			_, currentReg := state.GetSchema()
			if currentReg == nil {
				http.Error(w, "no active base schema loaded; please supply baseProto or load schema first", http.StatusBadRequest)
				return
			}
			baseReg = currentReg
		}

		targetFn := req.TargetFilename
		if targetFn == "" {
			targetFn = "target.proto"
		}
		targetReg, _, err := parser.ParseProtoContent(r.Context(), targetFn, req.TargetProto)
		if err != nil {
			http.Error(w, "failed to compile target proto: "+err.Error(), http.StatusBadRequest)
			return
		}

		report := schema.CompareRegistries(baseReg, targetReg)

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(report)
	}
}
