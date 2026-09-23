package tests

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/alexandrmotologa/protolens/pkg/benchmark"
	"github.com/alexandrmotologa/protolens/pkg/env"
	"github.com/alexandrmotologa/protolens/pkg/mock"
	"github.com/alexandrmotologa/protolens/pkg/schema"
	"github.com/alexandrmotologa/protolens/pkg/transport"
	"github.com/alexandrmotologa/protolens/server/handlers"
)

func TestEnvironmentVariableInterpolation(t *testing.T) {
	vars := map[string]string{
		"HOST":    "localhost:50051",
		"USER_ID": "usr_9988",
	}

	raw := `{"target": "{{HOST}}", "id": "{{USER_ID}}", "uuid": "{{$guid}}", "num": {{$randomInt}}}`
	res := env.Interpolate(raw, vars)

	if !strings.Contains(res, "localhost:50051") {
		t.Fatalf("expected HOST to be interpolated, got %s", res)
	}
	if !strings.Contains(res, "usr_9988") {
		t.Fatalf("expected USER_ID to be interpolated, got %s", res)
	}
	if strings.Contains(res, "{{$guid}}") {
		t.Fatalf("expected $guid to be evaluated, got %s", res)
	}
	if strings.Contains(res, "{{$randomInt}}") {
		t.Fatalf("expected $randomInt to be evaluated, got %s", res)
	}
}

func TestSchemaDiffBreakingChanges(t *testing.T) {
	ctx := context.Background()
	parser := schema.NewParser()

	baseProto := `
syntax = "proto3";
package test;

service PaymentService {
  rpc Pay (PayRequest) returns (PayResponse);
}

message PayRequest {
  string account_id = 1;
  int64 amount = 2;
}

message PayResponse {
  bool success = 1;
}
`

	targetProto := `
syntax = "proto3";
package test;

service PaymentService {
  rpc Pay (PayRequest) returns (PayResponse);
}

message PayRequest {
  string account_id = 1;
  // amount field was removed! (BREAKING)
  string currency = 3; // new optional field
}

message PayResponse {
  bool success = 1;
}
`

	baseReg, _, err := parser.ParseProtoContent(ctx, "base.proto", baseProto)
	if err != nil {
		t.Fatalf("failed to parse base proto: %v", err)
	}

	targetReg, _, err := parser.ParseProtoContent(ctx, "target.proto", targetProto)
	if err != nil {
		t.Fatalf("failed to parse target proto: %v", err)
	}

	report := schema.CompareRegistries(baseReg, targetReg)
	if !report.HasBreakingChanges {
		t.Fatalf("expected breaking changes to be detected")
	}
	if report.TotalBreaking == 0 {
		t.Fatalf("expected at least 1 breaking change, got %d", report.TotalBreaking)
	}
	if report.TotalAdditions == 0 {
		t.Fatalf("expected at least 1 addition, got %d", report.TotalAdditions)
	}
}

func TestHistoryBuffer(t *testing.T) {
	handlers.ClearHistory()

	handlers.RecordHistory(handlers.HistoryItem{
		Method:        "/test.Service/Method",
		Target:        "localhost:50051",
		Protocol:      "grpc",
		StatusCode:    0,
		StatusMessage: "OK",
		DurationMs:    12.4,
		Timestamp:     time.Now().Format(time.RFC3339),
	})

	entries := handlers.GetHistory()
	if len(entries) != 1 {
		t.Fatalf("expected 1 history entry, got %d", len(entries))
	}
	if entries[0].Method != "/test.Service/Method" {
		t.Fatalf("expected method match, got %s", entries[0].Method)
	}

	handlers.ClearHistory()
	if len(handlers.GetHistory()) != 0 {
		t.Fatalf("expected history to be cleared")
	}
}

func TestBenchmarkRunner(t *testing.T) {
	ctx := context.Background()
	parser := schema.NewParser()

	protoContent := `
syntax = "proto3";
package bench;

service BenchService {
  rpc Ping (PingReq) returns (PingResp);
}

message PingReq {
  string msg = 1;
}

message PingResp {
  string msg = 1;
}
`

	_, files, err := parser.ParseProtoContent(ctx, "bench.proto", protoContent)
	if err != nil {
		t.Fatalf("failed to parse proto: %v", err)
	}

	mockSrv := mock.NewServer(mock.MockServerConfig{Port: 50059}, files)
	if err := mockSrv.Start(); err != nil {
		t.Fatalf("failed to start mock server: %v", err)
	}
	defer mockSrv.Stop()

	time.Sleep(50 * time.Millisecond)

	pool := transport.NewClientPool()
	defer pool.Close()

	req := benchmark.BenchmarkRequest{
		Target:          "localhost:50059",
		Method:          "/bench.BenchService/Ping",
		PayloadJSON:     `{"msg": "benchmark_test"}`,
		Concurrency:     2,
		DurationSeconds: 1,
	}

	report, err := benchmark.RunBenchmark(ctx, pool, files, req)
	if err != nil {
		t.Fatalf("benchmark failed: %v", err)
	}

	if report.TotalRequests == 0 {
		t.Fatalf("expected requests to be processed, got 0")
	}
	if report.SuccessfulRequests == 0 {
		t.Fatalf("expected successful requests, got 0")
	}
	if report.RPS <= 0 {
		t.Fatalf("expected positive RPS, got %f", report.RPS)
	}
}
