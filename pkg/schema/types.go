package schema

import "encoding/json"

// RPCKind represents the invocation kind of an RPC method.
type RPCKind string

const (
	RPCKindUnary         RPCKind = "unary"
	RPCKindServerStream  RPCKind = "server_stream"
	RPCKindClientStream  RPCKind = "client_stream"
	RPCKindBidirectional RPCKind = "bidirectional"
)

// FieldInfo describes a single field inside a Protobuf message.
type FieldInfo struct {
	Name        string      `json:"name"`
	JSONName    string      `json:"jsonName"`
	Number      int32       `json:"number"`
	Type        string      `json:"type"`
	IsRepeated  bool        `json:"isRepeated"`
	IsMap       bool        `json:"isMap"`
	MapKeyType  string      `json:"mapKeyType,omitempty"`
	MapValType  string      `json:"mapValType,omitempty"`
	MessageType string      `json:"messageType,omitempty"`
	EnumValues  []string    `json:"enumValues,omitempty"`
	OneofGroup  string      `json:"oneofGroup,omitempty"`
	Description string      `json:"description,omitempty"`
	DefaultVal  interface{} `json:"defaultVal,omitempty"`
}

// MessageInfo describes a Protobuf message definition.
type MessageInfo struct {
	FullName    string      `json:"fullName"`
	Name        string      `json:"name"`
	Fields      []FieldInfo `json:"fields"`
	Description string      `json:"description,omitempty"`
}

// MethodInfo describes a single gRPC/Connect method.
type MethodInfo struct {
	Name            string      `json:"name"`
	FullName        string      `json:"fullName"` // e.g. /package.Service/Method
	Service         string      `json:"service"`  // e.g. package.Service
	Package         string      `json:"package"`
	Kind            RPCKind     `json:"kind"`
	ClientStreaming bool        `json:"clientStreaming"`
	ServerStreaming bool        `json:"serverStreaming"`
	Input           MessageInfo `json:"input"`
	Output          MessageInfo `json:"output"`
	InputTemplate   string      `json:"inputTemplate"` // Formatted JSON default template
	Description     string      `json:"description,omitempty"`
}

// ServiceInfo represents a gRPC service and its RPC methods.
type ServiceInfo struct {
	Name        string       `json:"name"`
	FullName    string       `json:"fullName"` // e.g. my.package.OrderService
	Package     string       `json:"package"`
	Methods     []MethodInfo `json:"methods"`
	Description string       `json:"description,omitempty"`
}

// SchemaRegistry holds all discovered services and message definitions.
type SchemaRegistry struct {
	Endpoint string        `json:"endpoint,omitempty"`
	Source   string        `json:"source"` // "reflection" or "file"
	Services []ServiceInfo `json:"services"`
}

// ToJSON serializes the registry to indented JSON.
func (r *SchemaRegistry) ToJSON() ([]byte, error) {
	return json.MarshalIndent(r, "", "  ")
}
