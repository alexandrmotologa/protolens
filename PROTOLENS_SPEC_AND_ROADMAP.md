# Engineering Specification & Implementation Blueprint: ProtoLens
> The Next-Gen gRPC, Connect-RPC & Protobuf Desktop Studio, Dynamic Reflection Explorer & Mock Engine (Reimagining BloomRPC)

---

## 1. Executive Summary & Market Opportunity

### 1.1 The Market Vacuum
In January 2023, **BloomRPC** (10,000+ GitHub stars)—the most popular open-source desktop client for gRPC—was officially archived. Its abandonment left millions of backend, cloud-native, and AI infrastructure engineers without a lightweight, modern, dedicated GUI. 

Existing alternatives suffer from severe friction:
* **Postman:** Monolithic 250MB+ footprint, mandatory cloud login requirements, privacy concerns for internal schemas, and sluggish streaming support.
* **Kreya:** Closed-source, proprietary freemium model.
* **`grpcurl`:** CLI-only, difficult for visual payload crafting, complex streaming management, and multi-file proto imports.

Meanwhile, gRPC and Protobuf have exploded in adoption:
* Microservices and Kubernetes service meshes.
* **AI & LLM Inference Engines:** NVIDIA Triton Inference Server, vLLM, TensorRT-LLM, and Ollama gRPC APIs.
* Modern web APIs adopting the **Connect protocol** (by Buf) for seamless browser-to-backend RPC over HTTP/1.1 and HTTP/2.

### 1.2 The Solution: ProtoLens
**ProtoLens** is a single-binary, local-first management studio and testing workbench for **gRPC, Connect-RPC, and gRPC-Web**.

* **Zero-Proto Setup via Dynamic Server Reflection:** Instantly discovers all services, methods, input schemas, and documentation by connecting to any reflection-enabled endpoint (e.g., `localhost:50051`) without needing local `.proto` files.
* **Multi-Protocol Engine:** First-class support for standard gRPC (HTTP/2), gRPC-Web, and Connect protocol (Buf).
* **Streaming Timeline Studio:** Dedicated UI for Client Streaming, Server Streaming, and Bidirectional Full-Duplex RPCs with live timeline bubble inspection and real-time message dispatching.
* **1-Click Embedded Mock Server:** Spins up a local gRPC mock server directly from imported `.proto` files or reflected schemas, auto-generating randomized, schema-valid response payloads.
* **Instant CLI & Code Export:** One-click conversion of any configured RPC request into `grpcurl` or standard `curl` commands.
* **Single-Binary Distribution:** Built in **Go** with an embedded Vite + React 19 + Monaco Editor UI via `go:embed`. Memory footprint <30MB RAM, zero external runtime dependencies.

---

## 2. Core Architecture & Tech Stack

```
┌────────────────────────────────────────────────────────────────────────┐
│                          ProtoLens Architecture                        │
└────────────────────────────────────────────────────────────────────────┘

[ Web UI / Local Desktop Workbench ] (http://localhost:50050)
              │
              ▼  (HTTP REST / WebSocket / Server-Sent Events)
[ ProtoLens Single Binary ] (Go 1.23+ Engine)
  ├── Static Asset Server: go:embed (Vite + React 19 + Monaco Editor)
  ├── Gateway & Session Manager
  │     ├── Multi-Environment Configuration (Local, Staging, Prod headers/TLS)
  │     └── In-Memory Workspace State
  ├── Protobuf & Schema Engine
  │     ├── gRPC Server Reflection Client (v1 & v1alpha)
  │     ├── Local Proto File Parser & AST Builder (bufbuild/protocompile)
  │     └── Dynamic Message Factory (JSON <-> Protobuf Binary translation)
  ├── RPC Invocation & Transport Layer
  │     ├── Standard gRPC Transport (HTTP/2 with TLS / mTLS / plaintext)
  │     ├── Connect Protocol Client (connectrpc.com/connect)
  │     └── Bidirectional Streaming Multiplexer (WebSocket bridge)
  └── Mock Server Engine
        ├── In-Memory Dynamic gRPC Listener
        └── Faker / Schema-Compliant Response Generator
              │
              ▼ (HTTP/2 / TLS / plaintext)
[ Target gRPC / Connect / AI Inference Service ] (e.g. Triton, vLLM, Backend)
```

### 2.1 Backend Technology
* **Language:** Go 1.23+
* **Protobuf Compilation & AST:** `github.com/bufbuild/protocompile` (fast, modern Go protobuf compiler; replaces deprecated `jhump/protoreflect`).
* **Transport Clients:** 
  * `google.golang.org/grpc` (standard gRPC v1.65+).
  * `connectrpc.com/connect` (Connect-RPC client for Go).
* **Reflection:** `google.golang.org/grpc/reflection/grpc_reflection_v1` & `v1alpha`.
* **Dynamic JSON/Proto Codec:** `google.golang.org/protobuf/encoding/protojson`.
* **HTTP & WebSocket Hub:** `github.com/go-chi/chi/v5` + `nhooyr.io/websocket`.

### 2.2 Frontend Technology
* **Core:** Vite + React 19 + TypeScript.
* **Editor:** Monaco Editor (`@monaco-editor/react`) for JSON payloads and Protobuf schema viewing.
* **Styling:** Tailwind CSS with modern dark/light glassmorphic tokens.
* **Stream Timeline:** Virtualized list for handling thousands of streaming events without UI lag.

---

## 3. Key Feature Specifications

### 3.1 Dynamic Server Reflection & Schema Explorer
* Connect to any target host (`localhost:50051`, `api.staging.internal:443`).
* Query reflection service to resolve full descriptor hierarchy:
  * Packages ➔ Services ➔ Methods.
  * Input / Output message schemas, field types, enumerations, and comments/annotations.
* Fallback to local `.proto` file tree: drag-and-drop `.proto` files or directories with auto-resolution of standard imports (`google/protobuf/timestamp.proto`, etc.).

### 3.2 Universal RPC Invocation
* **Unary Calls:** JSON payload input with auto-generated template based on schema field definitions and defaults.
* **Header & Metadata Management:** Custom gRPC metadata (`authorization: Bearer ...`, request-id, custom binary metadata `-bin`).
* **TLS / mTLS Configuration:** Plaintext, Server TLS, or Mutual TLS with client certificate (`cert.pem`, `key.pem`).

### 3.3 Real-Time Streaming Studio
* **Client Streaming:** Send multiple messages sequentially with custom timing before committing `CloseAndRecv()`.
* **Server Streaming:** Receive continuous stream of messages with live latency metrics between chunks.
* **Bidirectional Duplex:** Live timeline displaying incoming (server) and outgoing (client) messages chronologically with timestamps, byte counters, and JSON payload inspector.

### 3.4 1-Click Embedded Mock Server
* Select any reflected service or parsed proto method.
* Click **"Start Mock Server"** to bind to a local port (e.g., `localhost:50055`).
* Automatically returns randomized or user-overridden mock responses matching the output Protobuf schema.

### 3.5 Code & CLI Exporter
* Generate copy-pasteable:
  * `grpcurl` CLI commands.
  * Standard `curl` commands (for Connect-RPC HTTP/1.1 endpoints).
  * Go / TypeScript client invocation snippets.

---

## 4. CLI Command-Line Specification

```bash
# Launch ProtoLens studio connected to default port (http://localhost:50050)
protolens

# Launch and immediately reflect a target service
protolens -t "localhost:50051"

# Launch loading local proto directory
protolens --proto-dir ./proto -t "api.internal:443" --tls

# Launch standalone mock server for a proto file
protolens mock --proto ./service.proto --port 50055

# Headless schema inspection
protolens reflect "localhost:50051" --json
```

---

## 5. Repository File Structure

```
protolens/
├── go.mod
├── go.sum
├── main.go                       # Entrypoint & CLI bootstrapping
├── Makefile                      # Build scripts (UI compilation + Go embed)
├── README.md
├── LICENSE
├── cmd/
│   ├── root.go                   # Cobra CLI commands & flags
│   ├── serve.go                  # Web server initialization & browser launch
│   └── mock.go                   # Headless mock server command
├── pkg/
│   ├── schema/                   # Protobuf AST & reflection
│   │   ├── reflector.go          # gRPC Server Reflection client
│   │   ├── parser.go             # protocompile local proto loader
│   │   └── dynamic_msg.go        # JSON <-> DynamicMessage converter
│   ├── transport/                # RPC Client execution
│   │   ├── grpc_client.go        # Unary & streaming gRPC client
│   │   ├── connect_client.go     # Connect-RPC client
│   │   ├── metadata.go           # Headers & context metadata builder
│   │   └── tls.go                # TLS / mTLS configuration loader
│   ├── mock/                     # Embedded Mock Server
│   │   ├── server.go             # Dynamic gRPC mock listener
│   │   └── faker.go              # Schema-driven dummy data generator
│   └── exporter/                 # CLI command generators
│       ├── grpcurl.go            # grpcurl command generator
│       └── curl.go               # curl command generator
├── server/
│   ├── router.go                 # Chi router setup
│   ├── handlers/
│   │   ├── schema_handler.go     # /api/schema (reflection, load proto)
│   │   ├── invoke_handler.go     # /api/invoke (unary calls)
│   │   ├── stream_handler.go     # /api/stream (WebSocket bidirectional bridge)
│   │   └── mock_handler.go       # /api/mock (start/stop mock instances)
│   └── static.go                 # go:embed dist/* static file server
├── ui/                           # Frontend Application (Vite + React 19)
│   ├── package.json
│   ├── vite.config.ts
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── ServiceSidebar/   # Package/Service/Method navigation tree
│   │   │   ├── RequestPanel/     # Monaco JSON input & metadata tabs
│   │   │   ├── ResponsePanel/    # Output JSON & response metadata
│   │   │   ├── StreamTimeline/   # Bidirectional streaming bubbles
│   │   │   ├── MockDialog/       # Mock server launcher & rules editor
│   │   │   └── CodeExportModal/  # grpcurl & curl code generator
│   │   └── styles/globals.css
└── tests/
    ├── reflection_test.go        # Dynamic reflection tests
    ├── invoke_test.go            # Unary & streaming execution tests
    └── mock_test.go              # Mock server validation tests
```

---

## 6. Implementation Roadmap (Phases 1 - 6)

* **Phase 1: Foundation & Server Reflection (Go Backend)**
  * Scaffold Go module, Chi router, and `protocompile` integration.
  * Implement `pkg/schema/reflector.go`: connect to a live gRPC server, query reflection v1/v1alpha, and return a clean JSON service tree.
* **Phase 2: Dynamic Execution & JSON Translation**
  * Implement dynamic message construction from JSON using `protojson`.
  * Support unary gRPC execution with custom headers and TLS.
* **Phase 3: Bidirectional Streaming Engine**
  * Implement WebSocket bridge in `server/handlers/stream_handler.go`.
  * Enable multi-message push and real-time streaming consumption with millisecond latency logging.
* **Phase 4: Embedded Mock Server**
  * Build dynamic gRPC mock handler that binds to local ports and fulfills requests matching loaded schemas.
* **Phase 5: Frontend Studio Development**
  * Build responsive React 19 UI with Service Sidebar, Monaco Editor, Stream Timeline, and dark/light modes.
* **Phase 6: Single-Binary Packaging & CI/CD**
  * Configure `go:embed dist/*`, cross-compile single static binaries (`protolens.exe`, `protolens-linux`, `protolens-darwin`), write docs and automated demo GIF.
