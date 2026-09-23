package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/alexandrmotologa/protolens/pkg/transport"
	"github.com/alexandrmotologa/protolens/server/state"
	"nhooyr.io/websocket"
)

type WSClientMessage struct {
	Action      string              `json:"action"` // start, send, half_close, cancel
	Target      string              `json:"target,omitempty"`
	Method      string              `json:"method,omitempty"`
	PayloadJSON string              `json:"payloadJson,omitempty"`
	Headers     map[string]string   `json:"headers,omitempty"`
	TLS         transport.TLSConfig `json:"tls,omitempty"`
	TimeoutMs   int64               `json:"timeoutMs,omitempty"`
}

func HandleStream(state *state.AppState) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		wsConn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
			InsecureSkipVerify: true,
			OriginPatterns:     []string{"*"},
		})
		if err != nil {
			return
		}
		defer wsConn.Close(websocket.StatusInternalError, "closing")

		ctx := r.Context()
		var session *transport.StreamSession
		var mu sync.Mutex

		writeJSON := func(v interface{}) error {
			mu.Lock()
			defer mu.Unlock()
			b, err := json.Marshal(v)
			if err != nil {
				return err
			}
			writeCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
			defer cancel()
			return wsConn.Write(writeCtx, websocket.MessageText, b)
		}

		for {
			_, msgBytes, err := wsConn.Read(ctx)
			if err != nil {
				if session != nil {
					session.Cancel()
				}
				break
			}

			var clientMsg WSClientMessage
			if err := json.Unmarshal(msgBytes, &clientMsg); err != nil {
				_ = writeJSON(transport.StreamEvent{
					Event:     "error",
					Timestamp: time.Now().UTC().Format(time.RFC3339Nano),
					Error:     "malformed json message: " + err.Error(),
				})
				continue
			}

			switch clientMsg.Action {
			case "start":
				if session != nil {
					session.Cancel()
					session = nil
				}

				files, _ := state.GetSchema()
				if files == nil {
					_ = writeJSON(transport.StreamEvent{
						Event:     "error",
						Timestamp: time.Now().UTC().Format(time.RFC3339Nano),
						Error:     "no schema loaded to inspect streaming method",
					})
					continue
				}

				req := transport.InvocationRequest{
					Target:      clientMsg.Target,
					Method:      clientMsg.Method,
					Headers:     clientMsg.Headers,
					TLS:         clientMsg.TLS,
					TimeoutMs:   clientMsg.TimeoutMs,
					PayloadJSON: clientMsg.PayloadJSON,
				}

				sess, err := transport.StartStreamSession(ctx, state.ClientPool, files, req)
				if err != nil {
					_ = writeJSON(transport.StreamEvent{
						Event:     "error",
						Timestamp: time.Now().UTC().Format(time.RFC3339Nano),
						Error:     "failed to start stream: " + err.Error(),
					})
					continue
				}

				session = sess

				// Forward stream events to WebSocket
				go func(s *transport.StreamSession) {
					for ev := range s.Events() {
						if err := writeJSON(ev); err != nil {
							break
						}
					}
				}(sess)

				// If initial payload was provided (e.g. server streaming), send it immediately
				if clientMsg.PayloadJSON != "" {
					_ = session.SendMessage(clientMsg.PayloadJSON)
				}

			case "send":
				if session == nil {
					_ = writeJSON(transport.StreamEvent{
						Event:     "error",
						Timestamp: time.Now().UTC().Format(time.RFC3339Nano),
						Error:     "stream session has not been started",
					})
					continue
				}

				if err := session.SendMessage(clientMsg.PayloadJSON); err != nil {
					_ = writeJSON(transport.StreamEvent{
						Event:     "error",
						Timestamp: time.Now().UTC().Format(time.RFC3339Nano),
						Error:     err.Error(),
					})
				}

			case "half_close":
				if session != nil {
					_ = session.HalfClose()
				}

			case "cancel":
				if session != nil {
					session.Cancel()
					session = nil
				}

			default:
				_ = writeJSON(transport.StreamEvent{
					Event:     "error",
					Timestamp: time.Now().UTC().Format(time.RFC3339Nano),
					Error:     "unknown action: " + clientMsg.Action,
				})
			}
		}
	}
}
