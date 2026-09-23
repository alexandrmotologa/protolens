package benchmark

import (
	"context"
	"fmt"
	"math"
	"sort"
	"sync"
	"sync/atomic"
	"time"

	"github.com/alexandrmotologa/protolens/pkg/schema"
	"github.com/alexandrmotologa/protolens/pkg/transport"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/reflect/protoregistry"
	"google.golang.org/protobuf/types/dynamicpb"
)

// BenchmarkRequest configures a gRPC micro-benchmark run.
type BenchmarkRequest struct {
	Target          string              `json:"target"`
	Method          string              `json:"method"`
	PayloadJSON     string              `json:"payloadJson"`
	Headers         map[string]string   `json:"headers,omitempty"`
	TLS             transport.TLSConfig `json:"tls"`
	Concurrency     int                 `json:"concurrency"`     // default 5
	DurationSeconds int                 `json:"durationSeconds"` // default 5s
	TotalRequests   int64               `json:"totalRequests,omitempty"`
}

// BenchmarkReport details the latency percentiles and throughput.
type BenchmarkReport struct {
	TotalRequests      int64            `json:"totalRequests"`
	SuccessfulRequests int64            `json:"successfulRequests"`
	FailedRequests     int64            `json:"failedRequests"`
	ElapsedSeconds     float64          `json:"elapsedSeconds"`
	RPS                float64          `json:"rps"`
	LatencyMinMs       float64          `json:"latencyMinMs"`
	LatencyAvgMs       float64          `json:"latencyAvgMs"`
	LatencyMaxMs       float64          `json:"latencyMaxMs"`
	LatencyP50Ms       float64          `json:"latencyP50Ms"`
	LatencyP90Ms       float64          `json:"latencyP90Ms"`
	LatencyP95Ms       float64          `json:"latencyP95Ms"`
	LatencyP99Ms       float64          `json:"latencyP99Ms"`
	StatusCodes        map[string]int64 `json:"statusCodes"`
}

// RunBenchmark executes concurrent invocations against the target and computes metrics.
func RunBenchmark(ctx context.Context, pool *transport.ClientPool, files *protoregistry.Files, req BenchmarkRequest) (*BenchmarkReport, error) {
	if req.Concurrency <= 0 {
		req.Concurrency = 5
	}
	if req.Concurrency > 50 {
		req.Concurrency = 50
	}
	if req.DurationSeconds <= 0 && req.TotalRequests <= 0 {
		req.DurationSeconds = 5
	}
	if req.DurationSeconds > 60 {
		req.DurationSeconds = 60
	}

	md, err := transport.FindMethodDescriptor(files, req.Method)
	if err != nil {
		return nil, err
	}

	inMsg, err := schema.JSONToDynamicMessage(req.PayloadJSON, md.Input())
	if err != nil {
		return nil, fmt.Errorf("invalid payload: %w", err)
	}

	conn, err := pool.GetConn(ctx, req.Target, req.TLS)
	if err != nil {
		return nil, fmt.Errorf("connection failed: %w", err)
	}

	var totalCompleted int64
	var totalSuccess int64
	var totalFailed int64

	statusCodesMu := sync.Mutex{}
	statusCodes := make(map[string]int64)

	latenciesMu := sync.Mutex{}
	latencies := make([]float64, 0, 1000)

	var runCtx context.Context
	var cancel context.CancelFunc

	if req.DurationSeconds > 0 {
		runCtx, cancel = context.WithTimeout(ctx, time.Duration(req.DurationSeconds)*time.Second)
	} else {
		runCtx, cancel = context.WithCancel(ctx)
	}
	defer cancel()

	var wg sync.WaitGroup
	startTime := time.Now()

	for i := 0; i < req.Concurrency; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()

			for {
				select {
				case <-runCtx.Done():
					return
				default:
				}

				if req.TotalRequests > 0 && atomic.LoadInt64(&totalCompleted) >= req.TotalRequests {
					cancel()
					return
				}

				callCtx, callCancel := transport.BuildOutgoingContext(runCtx, req.Headers, 5000)
				outMsg := dynamicpb.NewMessage(md.Output())

				callStart := time.Now()
				callErr := conn.Invoke(callCtx, req.Method, inMsg, outMsg, grpc.Header(&metadata.MD{}))
				callDuration := float64(time.Since(callStart).Microseconds()) / 1000.0
				callCancel()

				atomic.AddInt64(&totalCompleted, 1)

				latenciesMu.Lock()
				latencies = append(latencies, callDuration)
				latenciesMu.Unlock()

				codeStr := "0 OK"
				if callErr != nil {
					atomic.AddInt64(&totalFailed, 1)
					st, _ := status.FromError(callErr)
					codeStr = fmt.Sprintf("%d %s", st.Code(), st.Code().String())
				} else {
					atomic.AddInt64(&totalSuccess, 1)
				}

				statusCodesMu.Lock()
				statusCodes[codeStr]++
				statusCodesMu.Unlock()
			}
		}()
	}

	wg.Wait()
	elapsed := time.Since(startTime).Seconds()
	if elapsed == 0 {
		elapsed = 0.001
	}

	report := &BenchmarkReport{
		TotalRequests:      atomic.LoadInt64(&totalCompleted),
		SuccessfulRequests: atomic.LoadInt64(&totalSuccess),
		FailedRequests:     atomic.LoadInt64(&totalFailed),
		ElapsedSeconds:     math.Round(elapsed*100) / 100,
		RPS:                math.Round((float64(totalCompleted)/elapsed)*10) / 10,
		StatusCodes:        statusCodes,
	}

	if len(latencies) > 0 {
		sort.Float64s(latencies)
		var sum float64
		for _, l := range latencies {
			sum += l
		}

		report.LatencyMinMs = math.Round(latencies[0]*100) / 100
		report.LatencyMaxMs = math.Round(latencies[len(latencies)-1]*100) / 100
		report.LatencyAvgMs = math.Round((sum/float64(len(latencies)))*100) / 100
		report.LatencyP50Ms = math.Round(percentile(latencies, 0.50)*100) / 100
		report.LatencyP90Ms = math.Round(percentile(latencies, 0.90)*100) / 100
		report.LatencyP95Ms = math.Round(percentile(latencies, 0.95)*100) / 100
		report.LatencyP99Ms = math.Round(percentile(latencies, 0.99)*100) / 100
	}

	return report, nil
}

func percentile(sorted []float64, p float64) float64 {
	if len(sorted) == 0 {
		return 0
	}
	idx := int(float64(len(sorted)-1) * p)
	return sorted[idx]
}
