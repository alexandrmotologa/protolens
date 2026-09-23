package tests

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/alexandrmotologa/protolens/pkg/mock"
	"github.com/alexandrmotologa/protolens/pkg/schema"
	"github.com/alexandrmotologa/protolens/pkg/transport"
)

func TestMockServerAndUnaryInvoke(t *testing.T) {
	ctx := context.Background()
	parser := schema.NewParser()

	_, files, err := parser.ParseProtoContent(ctx, "orders.proto", sampleProto)
	if err != nil {
		t.Fatalf("failed to parse proto: %v", err)
	}

	mockSrv := mock.NewServer(mock.MockServerConfig{
		Port: 0, // Random available port
	}, files)

	if err := mockSrv.Start(); err != nil {
		t.Fatalf("failed to start mock server: %v", err)
	}
	defer mockSrv.Stop()

	port := mockSrv.Port()
	if port == 0 {
		t.Fatalf("expected non-zero port")
	}

	pool := transport.NewClientPool()
	defer pool.Close()

	target := fmt.Sprintf("127.0.0.1:%d", port)

	// Test 1: Standard Unary Call
	req := transport.InvocationRequest{
		Target:      target,
		Method:      "/test.orders.v1.OrderService/CreateOrder",
		PayloadJSON: `{"customerId": "cust_999", "items": [{"id": "item_1", "name": "Desk", "price": 150.0}]}`,
		TLS:         transport.TLSConfig{UseTLS: false},
	}

	resp, err := transport.InvokeUnary(ctx, pool, files, req)
	if err != nil {
		t.Fatalf("InvokeUnary failed: %v", err)
	}

	if !resp.Success {
		t.Fatalf("expected success, got error: %s", resp.Error)
	}
	if resp.StatusCode != 0 {
		t.Errorf("expected status code 0 (OK), got %d", resp.StatusCode)
	}
	if resp.ResponseJSON == "" || resp.ResponseJSON == "{}" {
		t.Errorf("expected populated response JSON, got empty")
	}

	// Test 2: Injected fault error
	mockSrv.UpdateConfig(mock.MockServerConfig{
		ErrorCode: 14, // UNAVAILABLE
	})

	faultResp, err := transport.InvokeUnary(ctx, pool, files, req)
	if err != nil {
		t.Fatalf("InvokeUnary error: %v", err)
	}
	if faultResp.Success {
		t.Errorf("expected failure for injected fault")
	}
	if faultResp.StatusCode != 14 {
		t.Errorf("expected status code 14 (UNAVAILABLE), got %d", faultResp.StatusCode)
	}

	// Test 3: Response override
	mockSrv.UpdateConfig(mock.MockServerConfig{
		ErrorCode: 0,
		ResponseOverrides: map[string]string{
			"/test.orders.v1.OrderService/CreateOrder": `{"orderId": "CUSTOM_ORDER_42", "status": "APPROVED", "totalAmount": 999.99}`,
		},
	})

	overrideResp, err := transport.InvokeUnary(ctx, pool, files, req)
	if err != nil {
		t.Fatalf("InvokeUnary error: %v", err)
	}
	if !overrideResp.Success {
		t.Fatalf("expected success, got: %s", overrideResp.Error)
	}
	if !testing.Short() {
		time.Sleep(10 * time.Millisecond)
	}
}
