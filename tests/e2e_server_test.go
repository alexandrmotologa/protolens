package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/alexandrmotologa/protolens/server"
	"github.com/alexandrmotologa/protolens/server/handlers"
	"github.com/alexandrmotologa/protolens/server/state"
)

func TestFullServerLifecycle(t *testing.T) {
	appState := state.NewAppState()
	router := server.NewRouter(appState)
	ts := httptest.NewServer(router)
	defer ts.Close()

	// 1. Check health
	res, err := http.Get(ts.URL + "/api/health")
	if err != nil {
		t.Fatalf("health check failed: %v", err)
	}
	if res.StatusCode != http.StatusOK {
		t.Errorf("expected 200 OK, got %d", res.StatusCode)
	}

	// 2. Parse proto schema into state
	parseBody := map[string]string{
		"content":  sampleProto,
		"filename": "orders.proto",
	}
	bodyBytes, _ := json.Marshal(parseBody)
	res, err = http.Post(ts.URL+"/api/schema/parse", "application/json", bytes.NewReader(bodyBytes))
	if err != nil {
		t.Fatalf("parse failed: %v", err)
	}
	if res.StatusCode != http.StatusOK {
		t.Errorf("expected 200 OK on parse, got %d", res.StatusCode)
	}

	// 3. Start mock server
	mockStartBody := map[string]interface{}{
		"port":      0,
		"latencyMs": 0,
		"errorCode": 0,
	}
	bodyBytes, _ = json.Marshal(mockStartBody)
	res, err = http.Post(ts.URL+"/api/mock/start", "application/json", bytes.NewReader(bodyBytes))
	if err != nil {
		t.Fatalf("mock start failed: %v", err)
	}
	var mockStatus handlers.MockStatusResponse
	_ = json.NewDecoder(res.Body).Decode(&mockStatus)
	if !mockStatus.Running || mockStatus.Port == 0 {
		t.Errorf("expected mock running on port, got %+v", mockStatus)
	}

	// 4. Invoke unary method against mock server
	invokeBody := map[string]interface{}{
		"target":      ts.URL, // will be targeted to mock port
		"method":      "/test.orders.v1.OrderService/CreateOrder",
		"payloadJson": `{"customerId": "test_customer"}`,
		"protocol":    "grpc",
	}
	invokeBody["target"] = "127.0.0.1:" + string(rune(mockStatus.Port)) // formatted properly below
	invokeMap := map[string]interface{}{
		"target":      mockStatusPortString(mockStatus.Port),
		"method":      "/test.orders.v1.OrderService/CreateOrder",
		"payloadJson": `{"customerId": "test_customer"}`,
		"protocol":    "grpc",
	}
	bodyBytes, _ = json.Marshal(invokeMap)
	res, err = http.Post(ts.URL+"/api/invoke", "application/json", bytes.NewReader(bodyBytes))
	if err != nil {
		t.Fatalf("invoke failed: %v", err)
	}
	if res.StatusCode != http.StatusOK {
		t.Errorf("expected 200 OK on invoke, got %d", res.StatusCode)
	}

	// 5. Test export
	exportBody := map[string]interface{}{
		"type":        "grpcurl",
		"target":      mockStatusPortString(mockStatus.Port),
		"method":      "/test.orders.v1.OrderService/CreateOrder",
		"payloadJson": `{"customerId": "test_customer"}`,
	}
	bodyBytes, _ = json.Marshal(exportBody)
	res, err = http.Post(ts.URL+"/api/export", "application/json", bytes.NewReader(bodyBytes))
	if err != nil {
		t.Fatalf("export failed: %v", err)
	}
	var exportResp handlers.ExportResponse
	_ = json.NewDecoder(res.Body).Decode(&exportResp)
	if exportResp.Command == "" {
		t.Errorf("expected generated grpcurl command")
	}

	// 6. Stop mock server
	res, err = http.Post(ts.URL+"/api/mock/stop", "application/json", nil)
	if err != nil {
		t.Fatalf("mock stop failed: %v", err)
	}
	if res.StatusCode != http.StatusOK {
		t.Errorf("expected 200 OK on mock stop")
	}
}

func mockStatusPortString(port int) string {
	return "127.0.0.1:" + itoa(port)
}

func itoa(i int) string {
	b, _ := json.Marshal(i)
	return string(b)
}
