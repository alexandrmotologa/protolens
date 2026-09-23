package handlers

import (
	"encoding/json"
	"net/http"
	"sync"
)

// HistoryItem records details of an executed RPC call.
type HistoryItem struct {
	ID            string            `json:"id"`
	Timestamp     string            `json:"timestamp"`
	Target        string            `json:"target"`
	Method        string            `json:"method"`
	Protocol      string            `json:"protocol"`
	PayloadJSON   string            `json:"payloadJson"`
	Headers       map[string]string `json:"headers,omitempty"`
	StatusCode    uint32            `json:"statusCode"`
	StatusMessage string            `json:"statusMessage"`
	DurationMs    float64           `json:"durationMs"`
	ResponseJSON  string            `json:"responseJson,omitempty"`
	Error         string            `json:"error,omitempty"`
}

var (
	historyMu sync.RWMutex
	history   []HistoryItem
	maxSize   = 100
)

// RecordHistory adds an invocation record to the ring buffer.
func RecordHistory(item HistoryItem) {
	historyMu.Lock()
	defer historyMu.Unlock()

	// Prepend to show newest first
	history = append([]HistoryItem{item}, history...)
	if len(history) > maxSize {
		history = history[:maxSize]
	}
}

// ClearHistory empties the in-memory history buffer.
func ClearHistory() {
	historyMu.Lock()
	defer historyMu.Unlock()
	history = []HistoryItem{}
}

// GetHistory returns a copy of the current history items.
func GetHistory() []HistoryItem {
	historyMu.RLock()
	defer historyMu.RUnlock()
	res := make([]HistoryItem, len(history))
	copy(res, history)
	return res
}

// HandleGetHistory returns all recorded invocation logs.
func HandleGetHistory() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		historyMu.RLock()
		defer historyMu.RUnlock()

		if history == nil {
			history = []HistoryItem{}
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(history)
	}
}

// HandleClearHistory clears all history records.
func HandleClearHistory() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ClearHistory()

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]bool{"cleared": true})
	}
}
