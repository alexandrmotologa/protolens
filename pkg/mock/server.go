package mock

import (
	"encoding/json"
	"fmt"
	"net"
	"strings"
	"sync"
	"time"

	"github.com/alexandrmotologa/protolens/pkg/schema"
	"github.com/alexandrmotologa/protolens/pkg/transport"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/reflection"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/reflect/protoregistry"
	"google.golang.org/protobuf/types/dynamicpb"
)

// MockRule defines a conditional response rule based on incoming request fields.
type MockRule struct {
	ID             string `json:"id"`
	Method         string `json:"method"`         // e.g. "/package.Service/Method"
	ConditionField string `json:"conditionField"` // field name in JSON, e.g. "customerId"
	ConditionOp    string `json:"conditionOp"`    // "equals", "contains", "exists"
	ConditionVal   string `json:"conditionVal"`   // value to compare
	ResponseJSON   string `json:"responseJson"`   // custom response payload
	StatusCode     int    `json:"statusCode"`     // 0=OK, 14=UNAVAILABLE, etc.
	LatencyMs      int    `json:"latencyMs"`      // custom latency override
}

// MockServerConfig configures the dynamic gRPC mock engine.
type MockServerConfig struct {
	Port              int               `json:"port"`
	LatencyMs         int               `json:"latencyMs"`
	ErrorCode         int               `json:"errorCode"` // 0=OK, 14=UNAVAILABLE, etc.
	ResponseOverrides map[string]string `json:"responseOverrides"`
	Rules             []MockRule        `json:"rules,omitempty"`
}

// Server is a dynamic gRPC mock server that satisfies requests for loaded schemas.
type Server struct {
	mu         sync.RWMutex
	cfg        MockServerConfig
	files      *protoregistry.Files
	listener   net.Listener
	grpcSrv    *grpc.Server
	running    bool
	actualPort int
}

// NewServer creates a new mock server instance.
func NewServer(cfg MockServerConfig, files *protoregistry.Files) *Server {
	if cfg.Port == 0 {
		cfg.Port = 50055
	}
	if cfg.ResponseOverrides == nil {
		cfg.ResponseOverrides = make(map[string]string)
	}
	return &Server{
		cfg:   cfg,
		files: files,
	}
}

// Start spins up the mock server on the configured port.
func (s *Server) Start() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.running {
		return fmt.Errorf("mock server is already running on port %d", s.actualPort)
	}

	addr := fmt.Sprintf("0.0.0.0:%d", s.cfg.Port)
	lis, err := net.Listen("tcp", addr)
	if err != nil {
		return fmt.Errorf("failed to bind mock server to %s: %w", addr, err)
	}

	s.listener = lis
	s.actualPort = lis.Addr().(*net.TCPAddr).Port

	srvOpts := []grpc.ServerOption{
		grpc.UnknownServiceHandler(s.handleUnknownRPC),
	}

	s.grpcSrv = grpc.NewServer(srvOpts...)
	reflection.Register(s.grpcSrv)

	s.running = true

	go func() {
		_ = s.grpcSrv.Serve(lis)
	}()

	return nil
}

// Stop terminates the mock server.
func (s *Server) Stop() {
	s.mu.Lock()
	defer s.mu.Unlock()

	if !s.running {
		return
	}

	s.grpcSrv.Stop()
	if s.listener != nil {
		_ = s.listener.Close()
	}
	s.running = false
}

// Port returns the bound port.
func (s *Server) Port() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.actualPort
}

// IsRunning reports whether the server is actively serving.
func (s *Server) IsRunning() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.running
}

// UpdateConfig dynamically modifies latency, error codes, and rules.
func (s *Server) UpdateConfig(cfg MockServerConfig) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.cfg.LatencyMs = cfg.LatencyMs
	s.cfg.ErrorCode = cfg.ErrorCode
	if cfg.ResponseOverrides != nil {
		s.cfg.ResponseOverrides = cfg.ResponseOverrides
	}
	if cfg.Rules != nil {
		s.cfg.Rules = cfg.Rules
	}
}

// GetRules returns the active conditional mock rules.
func (s *Server) GetRules() []MockRule {
	s.mu.RLock()
	defer s.mu.RUnlock()
	res := make([]MockRule, len(s.cfg.Rules))
	copy(res, s.cfg.Rules)
	return res
}

// AddRule appends a new conditional mock rule to the running server.
func (s *Server) AddRule(rule MockRule) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.cfg.Rules = append(s.cfg.Rules, rule)
}

func (s *Server) handleUnknownRPC(_ interface{}, stream grpc.ServerStream) error {
	methodName, ok := grpc.MethodFromServerStream(stream)
	if !ok {
		return status.Errorf(codes.Internal, "failed to get method name from stream")
	}

	s.mu.RLock()
	latency := s.cfg.LatencyMs
	errCode := s.cfg.ErrorCode
	overrideJSON := s.cfg.ResponseOverrides[methodName]
	rules := s.cfg.Rules
	files := s.files
	s.mu.RUnlock()

	if latency > 0 {
		time.Sleep(time.Duration(latency) * time.Millisecond)
	}

	if errCode > 0 {
		return status.Errorf(codes.Code(errCode), "Injected mock fault (%s) for %s", codes.Code(errCode).String(), methodName)
	}

	if files == nil {
		return status.Errorf(codes.NotFound, "no proto schema registered for mock server")
	}

	md, err := transport.FindMethodDescriptor(files, methodName)
	if err != nil {
		return status.Errorf(codes.NotFound, "mock method not found in schema: %v", err)
	}

	// Consume client message(s)
	inMsg := dynamicpb.NewMessage(md.Input())
	_ = stream.RecvMsg(inMsg)

	// Check conditional mock rules
	inJSON, _ := schema.DynamicMessageToJSON(inMsg)
	var inMap map[string]interface{}
	_ = json.Unmarshal([]byte(inJSON), &inMap)

	for _, rule := range rules {
		if rule.Method == methodName || rule.Method == string(md.FullName()) || strings.HasSuffix(methodName, rule.Method) {
			if matchRuleCondition(inMap, rule) {
				if rule.LatencyMs > 0 {
					time.Sleep(time.Duration(rule.LatencyMs) * time.Millisecond)
				}
				if rule.StatusCode > 0 {
					return status.Errorf(codes.Code(rule.StatusCode), "Mock rule triggered error (%s)", codes.Code(rule.StatusCode).String())
				}
				if rule.ResponseJSON != "" {
					ruleMsg, err := schema.JSONToDynamicMessage(rule.ResponseJSON, md.Output())
					if err == nil {
						return stream.SendMsg(ruleMsg)
					}
				}
			}
		}
	}

	// Determine standard response message
	var respMsg proto.Message
	if overrideJSON != "" {
		customMsg, err := schema.JSONToDynamicMessage(overrideJSON, md.Output())
		if err == nil {
			respMsg = customMsg
		}
	}

	if respMsg == nil {
		respMsg = GenerateMockMessage(md.Output())
	}

	// If streaming server, send multiple sample chunks
	if md.IsStreamingServer() {
		for i := 0; i < 3; i++ {
			if err := stream.SendMsg(respMsg); err != nil {
				return err
			}
			time.Sleep(50 * time.Millisecond)
		}
		return nil
	}

	// Unary or client streaming
	return stream.SendMsg(respMsg)
}

func matchRuleCondition(inMap map[string]interface{}, rule MockRule) bool {
	if rule.ConditionField == "" {
		return true
	}

	val, exists := inMap[rule.ConditionField]
	if !exists {
		// Try case-insensitive or camelCase / snake_case matching
		for k, v := range inMap {
			if strings.EqualFold(k, rule.ConditionField) || strings.ReplaceAll(k, "_", "") == strings.ReplaceAll(rule.ConditionField, "_", "") {
				val = v
				exists = true
				break
			}
		}
	}

	if !exists {
		return false
	}

	strVal := fmt.Sprintf("%v", val)

	switch strings.ToLower(rule.ConditionOp) {
	case "contains":
		return strings.Contains(strVal, rule.ConditionVal)
	case "exists":
		return true
	case "equals", "==":
		return strVal == rule.ConditionVal
	default:
		return strVal == rule.ConditionVal
	}
}
