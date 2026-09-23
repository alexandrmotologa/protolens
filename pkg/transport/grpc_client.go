package transport

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/alexandrmotologa/protolens/pkg/schema"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/reflect/protoreflect"
	"google.golang.org/protobuf/reflect/protoregistry"
	"google.golang.org/protobuf/types/dynamicpb"
)

// InvocationRequest represents a request to invoke an RPC method.
type InvocationRequest struct {
	Target      string            `json:"target"`
	Method      string            `json:"method"` // /package.Service/Method
	PayloadJSON string            `json:"payloadJson"`
	Headers     map[string]string `json:"headers,omitempty"`
	TLS         TLSConfig         `json:"tls"`
	TimeoutMs   int64             `json:"timeoutMs,omitempty"`
}

// InvocationResponse represents the output and metrics of an RPC invocation.
type InvocationResponse struct {
	Success       bool                `json:"success"`
	StatusCode    uint32              `json:"statusCode"`
	StatusMessage string              `json:"statusMessage"`
	ResponseJSON  string              `json:"responseJson"`
	DurationMs    float64             `json:"durationMs"`
	Headers       map[string][]string `json:"headers,omitempty"`
	Trailers      map[string][]string `json:"trailers,omitempty"`
	Error         string              `json:"error,omitempty"`
}

// ClientPool manages active gRPC client connections.
type ClientPool struct {
	mu    sync.RWMutex
	conns map[string]*grpc.ClientConn
}

// NewClientPool creates a new connection pool.
func NewClientPool() *ClientPool {
	return &ClientPool{
		conns: make(map[string]*grpc.ClientConn),
	}
}

// GetConn returns or establishes a connection to the target with the given TLS settings.
func (p *ClientPool) GetConn(ctx context.Context, target string, tlsConf TLSConfig) (*grpc.ClientConn, error) {
	key := fmt.Sprintf("%s|tls=%v|skip=%v|ca=%d|cert=%d",
		target, tlsConf.UseTLS, tlsConf.InsecureSkipVerify, len(tlsConf.RootCACert), len(tlsConf.ClientCert))

	p.mu.RLock()
	conn, exists := p.conns[key]
	p.mu.RUnlock()

	if exists {
		return conn, nil
	}

	p.mu.Lock()
	defer p.mu.Unlock()

	// Double check under write lock
	if conn, exists := p.conns[key]; exists {
		return conn, nil
	}

	creds, err := BuildTransportCredentials(tlsConf)
	if err != nil {
		return nil, fmt.Errorf("failed to build transport credentials: %w", err)
	}

	dialOpts := []grpc.DialOption{
		grpc.WithTransportCredentials(creds),
	}

	newConn, err := grpc.NewClient(target, dialOpts...)
	if err != nil {
		return nil, fmt.Errorf("failed to dial target %s: %w", target, err)
	}

	p.conns[key] = newConn
	return newConn, nil
}

// Close closes all pooled connections.
func (p *ClientPool) Close() {
	p.mu.Lock()
	defer p.mu.Unlock()

	for _, conn := range p.conns {
		_ = conn.Close()
	}
	p.conns = make(map[string]*grpc.ClientConn)
}

// FindMethodDescriptor locates a method descriptor in the file registry.
func FindMethodDescriptor(files *protoregistry.Files, methodPath string) (protoreflect.MethodDescriptor, error) {
	cleanPath := strings.TrimPrefix(methodPath, "/")
	parts := strings.Split(cleanPath, "/")
	if len(parts) != 2 {
		return nil, fmt.Errorf("invalid method path format, expected /package.Service/Method, got %s", methodPath)
	}

	serviceFullName := protoreflect.FullName(parts[0])
	methodName := protoreflect.Name(parts[1])

	desc, err := files.FindDescriptorByName(serviceFullName)
	if err != nil {
		return nil, fmt.Errorf("service %s not found in schema registry: %w", serviceFullName, err)
	}

	sd, ok := desc.(protoreflect.ServiceDescriptor)
	if !ok {
		return nil, fmt.Errorf("descriptor %s is not a service", serviceFullName)
	}

	md := sd.Methods().ByName(methodName)
	if md == nil {
		return nil, fmt.Errorf("method %s not found in service %s", methodName, serviceFullName)
	}

	return md, nil
}

// InvokeUnary executes a unary gRPC call against the target service.
func InvokeUnary(ctx context.Context, pool *ClientPool, files *protoregistry.Files, req InvocationRequest) (*InvocationResponse, error) {
	md, err := FindMethodDescriptor(files, req.Method)
	if err != nil {
		return nil, err
	}

	inMsg, err := schema.JSONToDynamicMessage(req.PayloadJSON, md.Input())
	if err != nil {
		return nil, fmt.Errorf("invalid input JSON: %w", err)
	}

	outMsg := dynamicpb.NewMessage(md.Output())

	conn, err := pool.GetConn(ctx, req.Target, req.TLS)
	if err != nil {
		return nil, fmt.Errorf("connection error: %w", err)
	}

	var headerMD metadata.MD
	var trailerMD metadata.MD

	callCtx, cancel := BuildOutgoingContext(ctx, req.Headers, req.TimeoutMs)
	defer cancel()

	start := time.Now()
	invokeErr := conn.Invoke(
		callCtx,
		req.Method,
		inMsg,
		outMsg,
		grpc.Header(&headerMD),
		grpc.Trailer(&trailerMD),
	)
	duration := time.Since(start)

	resp := &InvocationResponse{
		Success:    invokeErr == nil,
		DurationMs: float64(duration.Microseconds()) / 1000.0,
		Headers:    MetadataToMap(headerMD),
		Trailers:   MetadataToMap(trailerMD),
	}

	if invokeErr != nil {
		st, _ := status.FromError(invokeErr)
		resp.StatusCode = uint32(st.Code())
		resp.StatusMessage = st.Code().String()
		resp.Error = st.Message()
		return resp, nil
	}

	resp.StatusCode = 0
	resp.StatusMessage = "OK"

	respJSON, err := schema.DynamicMessageToJSON(outMsg)
	if err != nil {
		resp.ResponseJSON = "{}"
	} else {
		resp.ResponseJSON = respJSON
	}

	return resp, nil
}
