package tests

import (
	"context"
	"strings"
	"testing"

	"github.com/alexandrmotologa/protolens/pkg/schema"
	"google.golang.org/protobuf/reflect/protoreflect"
)

const sampleProto = `
syntax = "proto3";

package test.orders.v1;

message Item {
  string id = 1;
  string name = 2;
  double price = 3;
  int32 quantity = 4;
}

message CreateOrderRequest {
  string customer_id = 1;
  repeated Item items = 2;
  map<string, string> metadata = 3;
}

message OrderResponse {
  string order_id = 1;
  string status = 2;
  double total_amount = 3;
}

message StreamRequest {
  string query = 1;
}

message StreamChunk {
  int64 sequence = 1;
  string payload = 2;
}

service OrderService {
  rpc CreateOrder(CreateOrderRequest) returns (OrderResponse);
  rpc WatchOrders(StreamRequest) returns (stream StreamChunk);
  rpc UploadBatch(stream Item) returns (OrderResponse);
  rpc ChatStream(stream StreamRequest) returns (stream StreamChunk);
}
`

func TestParserAndDynamicMessage(t *testing.T) {
	ctx := context.Background()
	parser := schema.NewParser()

	reg, files, err := parser.ParseProtoContent(ctx, "test.proto", sampleProto)
	if err != nil {
		t.Fatalf("expected nil error, got: %v", err)
	}

	if len(reg.Services) != 1 {
		t.Fatalf("expected 1 service, got %d", len(reg.Services))
	}

	svc := reg.Services[0]
	if svc.FullName != "test.orders.v1.OrderService" {
		t.Errorf("expected test.orders.v1.OrderService, got %s", svc.FullName)
	}

	if len(svc.Methods) != 4 {
		t.Fatalf("expected 4 methods, got %d", len(svc.Methods))
	}

	methodMap := make(map[string]schema.MethodInfo)
	for _, m := range svc.Methods {
		methodMap[m.Name] = m
	}

	if m, ok := methodMap["CreateOrder"]; !ok || m.Kind != schema.RPCKindUnary {
		t.Errorf("CreateOrder kind unexpected: %+v", m)
	}
	if m, ok := methodMap["WatchOrders"]; !ok || m.Kind != schema.RPCKindServerStream {
		t.Errorf("WatchOrders kind unexpected: %+v", m)
	}
	if m, ok := methodMap["UploadBatch"]; !ok || m.Kind != schema.RPCKindClientStream {
		t.Errorf("UploadBatch kind unexpected: %+v", m)
	}
	if m, ok := methodMap["ChatStream"]; !ok || m.Kind != schema.RPCKindBidirectional {
		t.Errorf("ChatStream kind unexpected: %+v", m)
	}

	// Verify template generation
	createOrderMethod := methodMap["CreateOrder"]
	if !strings.Contains(createOrderMethod.InputTemplate, "customerId") && !strings.Contains(createOrderMethod.InputTemplate, "customer_id") {
		t.Errorf("expected customer_id in template, got: %s", createOrderMethod.InputTemplate)
	}

	// Test dynamic message conversion
	desc, err := files.FindDescriptorByName("test.orders.v1.CreateOrderRequest")
	if err != nil {
		t.Fatalf("failed to find CreateOrderRequest descriptor: %v", err)
	}

	md := desc.(protoreflect.MessageDescriptor)
	jsonPayload := `{"customerId": "cust_123", "items": [{"id": "item_1", "name": "Keyboard", "price": 99.5, "quantity": 1}]}`

	dynMsg, err := schema.JSONToDynamicMessage(jsonPayload, md)
	if err != nil {
		t.Fatalf("JSONToDynamicMessage failed: %v", err)
	}

	resJSON, err := schema.DynamicMessageToJSON(dynMsg)
	if err != nil {
		t.Fatalf("DynamicMessageToJSON failed: %v", err)
	}

	if !strings.Contains(resJSON, "cust_123") || !strings.Contains(resJSON, "Keyboard") {
		t.Errorf("expected cust_123 and Keyboard in marshaled JSON, got: %s", resJSON)
	}
}
