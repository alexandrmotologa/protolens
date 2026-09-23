package transport

import (
	"bytes"
	"context"
	"crypto/tls"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// ConnectClient handles Connect-RPC protocol invocations over HTTP/1.1 and HTTP/2.
type ConnectClient struct {
	httpClient *http.Client
}

// NewConnectClient creates a new Connect client.
func NewConnectClient() *ConnectClient {
	return &ConnectClient{
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// InvokeConnect executes an RPC over the Connect protocol.
func (c *ConnectClient) InvokeConnect(ctx context.Context, req InvocationRequest) (*InvocationResponse, error) {
	baseURL := req.Target
	if !strings.HasPrefix(baseURL, "http://") && !strings.HasPrefix(baseURL, "https://") {
		if req.TLS.UseTLS {
			baseURL = "https://" + baseURL
		} else {
			baseURL = "http://" + baseURL
		}
	}

	cleanMethod := strings.TrimPrefix(req.Method, "/")
	fullURL := fmt.Sprintf("%s/%s", strings.TrimRight(baseURL, "/"), cleanMethod)

	body := []byte(req.PayloadJSON)
	if len(body) == 0 {
		body = []byte("{}")
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, fullURL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to build Connect HTTP request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Connect-Protocol-Version", "1")

	for k, v := range req.Headers {
		httpReq.Header.Set(k, v)
	}

	client := c.httpClient
	if req.TLS.UseTLS || req.TLS.InsecureSkipVerify {
		transport := &http.Transport{
			TLSClientConfig: &tls.Config{
				InsecureSkipVerify: req.TLS.InsecureSkipVerify,
			},
		}
		client = &http.Client{
			Transport: transport,
			Timeout:   client.Timeout,
		}
	}

	start := time.Now()
	resp, err := client.Do(httpReq)
	duration := time.Since(start)

	if err != nil {
		return &InvocationResponse{
			Success:       false,
			StatusCode:    14, // UNAVAILABLE
			StatusMessage: "UNAVAILABLE",
			DurationMs:    float64(duration.Microseconds()) / 1000.0,
			Error:         err.Error(),
		}, nil
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read Connect response body: %w", err)
	}

	respHeaders := make(map[string][]string)
	for k, v := range resp.Header {
		respHeaders[k] = v
	}

	isSuccess := resp.StatusCode == http.StatusOK
	statusMsg := "OK"
	if !isSuccess {
		statusMsg = resp.Status
	}

	return &InvocationResponse{
		Success:       isSuccess,
		StatusCode:    uint32(resp.StatusCode),
		StatusMessage: statusMsg,
		ResponseJSON:  string(respBytes),
		DurationMs:    float64(duration.Microseconds()) / 1000.0,
		Headers:       respHeaders,
	}, nil
}
