package state

import (
	"sync"

	"github.com/alexandrmotologa/protolens/pkg/mock"
	"github.com/alexandrmotologa/protolens/pkg/schema"
	"github.com/alexandrmotologa/protolens/pkg/transport"
	"google.golang.org/protobuf/reflect/protoregistry"
)

// AppState manages in-memory descriptors, connections, and mock server state.
type AppState struct {
	mu           sync.RWMutex
	Files        *protoregistry.Files
	Registry     *schema.SchemaRegistry
	ClientPool   *transport.ClientPool
	ConnectCli   *transport.ConnectClient
	MockSrv      *mock.Server
	ActiveTarget string
	ActiveTLS    transport.TLSConfig
}

// NewAppState creates a new application state container.
func NewAppState() *AppState {
	return &AppState{
		Files:      &protoregistry.Files{},
		ClientPool: transport.NewClientPool(),
		ConnectCli: transport.NewConnectClient(),
	}
}

// SetSchema updates the active schema files and registry.
func (s *AppState) SetSchema(files *protoregistry.Files, reg *schema.SchemaRegistry) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.Files = files
	s.Registry = reg
}

// GetSchema returns the active files and registry.
func (s *AppState) GetSchema() (*protoregistry.Files, *schema.SchemaRegistry) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return s.Files, s.Registry
}
