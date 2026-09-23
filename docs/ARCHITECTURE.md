# ProtoLens Architecture & Internal Design

ProtoLens is designed as a self-contained, single-binary application. It combines a high-performance Go backend with an embedded web client built using React 19, TypeScript, and Monaco Editor.

## Component Overview

### 1. Protobuf Schema & Reflection Engine (`pkg/schema`)

ProtoLens interacts with gRPC services dynamically without requiring pre-compiled `.pb.go` stubs.

* **Server Reflection (`pkg/schema/reflector.go`)**:
  Connects to target endpoints using `google.golang.org/grpc/reflection/grpc_reflection_v1` (with fallback to `v1alpha`). It inspects the remote server, retrieves `FileDescriptorProto` definitions, and constructs a live hierarchy of packages, services, methods, and types.

* **Local Proto Compiler (`pkg/schema/parser.go`)**:
  Uses `github.com/bufbuild/protocompile` to parse `.proto` files on disk. Standard imports such as `google/protobuf/timestamp.proto`, `google/protobuf/empty.proto`, and `google/protobuf/any.proto` resolve through an embedded memory resolver.

* **Dynamic Codec & Message Factory (`pkg/schema/dynamic_msg.go`)**:
  Translates JSON inputs from the UI into Protobuf binary wire format using `google.golang.org/protobuf/types/dynamicpb` and `protojson`. It generates scaffolded JSON request templates with default or example values based on message descriptor field types.

### 2. Transport & Invocation Layer (`pkg/transport`)

* **Standard gRPC Client (`pkg/transport/grpc_client.go`)**:
  Maintains connection pools keyed by target address, TLS settings, and authentication credentials. Unary calls execute through `grpc.Invoke` using dynamic message instances as input and output.

* **Connect-RPC Client (`pkg/transport/connect_client.go`)**:
  Executes RPC calls against Connect endpoints over standard HTTP/1.1 or HTTP/2, passing JSON or Protobuf binary payloads with the `Connect-Protocol-Version: 1` header.

* **Metadata and Security (`pkg/transport/metadata.go`, `pkg/transport/tls.go`)**:
  Constructs outgoing gRPC metadata contexts supporting custom headers, bearer tokens, and binary headers (`-bin` suffix). Handles plaintext connections, system certificate authorities, custom CA roots, and client certificates (mTLS).

### 3. Real-Time Streaming Studio (`pkg/transport/stream_session.go`, `server/handlers/stream_handler.go`)

Handling client, server, and bidirectional streams across a browser interface requires a full-duplex bridge:

1. The frontend establishes a WebSocket connection to `/api/stream`.
2. The Go backend initiates a gRPC client stream (`grpc.NewClientStream`) against the target endpoint.
3. Client messages arriving over WebSocket encode into `dynamicpb.Message` instances and write to the gRPC stream.
4. Server chunks arriving from the gRPC stream convert to JSON and forward across the WebSocket to the browser.
5. Millisecond timestamps and byte counts accompany every message frame for latency analysis.

### 4. Dynamic Mock Server (`pkg/mock`)

ProtoLens can serve mock responses for any reflected or loaded service definition:

* Utilizes `grpc.UnknownServiceHandler` to capture all incoming RPC calls regardless of package or service name.
* Resolves the method descriptor by matching the incoming path (`/package.Service/Method`).
* Evaluates user-defined response rules or invokes `pkg/mock/faker.go` to generate schema-valid dynamic responses.
* Simulates network delays and configured gRPC status codes (`UNAVAILABLE`, `DEADLINE_EXCEEDED`, etc.) to test client resilience.

### 5. Single-Binary Embedding (`server/static.go`)

During release builds, Vite bundles the frontend into `ui/dist/`. The Go binary embeds this directory via `go:embed all:dist` in `server/static.go`. A fallback handler returns `index.html` for unknown routes, enabling client-side routing without external file dependencies.
