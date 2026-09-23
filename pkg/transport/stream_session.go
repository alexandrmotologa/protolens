package transport

import (
	"context"
	"fmt"
	"io"
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

// StreamEvent represents an event occurring during a streaming RPC session.
type StreamEvent struct {
	Event           string              `json:"event"` // started, sent, received, headers, trailers, closed, error
	Timestamp       string              `json:"timestamp"`
	Sequence        int64               `json:"sequence,omitempty"`
	PayloadJSON     string              `json:"payloadJson,omitempty"`
	Bytes           int                 `json:"bytes,omitempty"`
	LatencyMs       float64             `json:"latencyMs,omitempty"`
	Headers         map[string][]string `json:"headers,omitempty"`
	Trailers        map[string][]string `json:"trailers,omitempty"`
	StatusCode      uint32              `json:"statusCode,omitempty"`
	StatusMessage   string              `json:"statusMessage,omitempty"`
	Error           string              `json:"error,omitempty"`
	TotalDurationMs float64             `json:"totalDurationMs,omitempty"`
}

// StreamSession manages an active streaming RPC connection.
type StreamSession struct {
	ID        string
	req       InvocationRequest
	files     *protoregistry.Files
	pool      *ClientPool
	md        protoreflect.MethodDescriptor
	stream    grpc.ClientStream
	cancel    context.CancelFunc
	ctx       context.Context
	events    chan StreamEvent
	startTime time.Time
	sendSeq   int64
	recvSeq   int64
	lastSend  time.Time
	mu        sync.Mutex
	closed    bool
}

// StartStreamSession initializes a new gRPC streaming session.
func StartStreamSession(ctx context.Context, pool *ClientPool, files *protoregistry.Files, req InvocationRequest) (*StreamSession, error) {
	md, err := FindMethodDescriptor(files, req.Method)
	if err != nil {
		return nil, err
	}

	callCtx, cancel := BuildOutgoingContext(ctx, req.Headers, req.TimeoutMs)

	conn, err := pool.GetConn(callCtx, req.Target, req.TLS)
	if err != nil {
		cancel()
		return nil, fmt.Errorf("failed to get connection: %w", err)
	}

	streamDesc := &grpc.StreamDesc{
		StreamName:    string(md.Name()),
		ServerStreams: md.IsStreamingServer(),
		ClientStreams: md.IsStreamingClient(),
	}

	var headerMD metadata.MD
	stream, err := conn.NewStream(callCtx, streamDesc, req.Method, grpc.Header(&headerMD))
	if err != nil {
		cancel()
		return nil, fmt.Errorf("failed to create client stream: %w", err)
	}

	session := &StreamSession{
		ID:        fmt.Sprintf("stream-%d", time.Now().UnixNano()),
		req:       req,
		files:     files,
		pool:      pool,
		md:        md,
		stream:    stream,
		cancel:    cancel,
		ctx:       callCtx,
		events:    make(chan StreamEvent, 64),
		startTime: time.Now(),
		lastSend:  time.Now(),
	}

	// Dispatch started event
	session.emit(StreamEvent{
		Event:     "started",
		Timestamp: time.Now().UTC().Format(time.RFC3339Nano),
	})

	// Start background reader
	go session.readLoop()

	return session, nil
}

// Events returns the channel receiving stream events.
func (s *StreamSession) Events() <-chan StreamEvent {
	return s.events
}

// SendMessage dispatches a JSON message into the active stream.
func (s *StreamSession) SendMessage(jsonPayload string) error {
	s.mu.Lock()
	if s.closed {
		s.mu.Unlock()
		return fmt.Errorf("stream session is closed")
	}
	s.sendSeq++
	seq := s.sendSeq
	s.lastSend = time.Now()
	s.mu.Unlock()

	inMsg, err := schema.JSONToDynamicMessage(jsonPayload, s.md.Input())
	if err != nil {
		return fmt.Errorf("invalid stream input message: %w", err)
	}

	if err := s.stream.SendMsg(inMsg); err != nil {
		return fmt.Errorf("failed to send message over stream: %w", err)
	}

	s.emit(StreamEvent{
		Event:       "sent",
		Timestamp:   time.Now().UTC().Format(time.RFC3339Nano),
		Sequence:    seq,
		PayloadJSON: jsonPayload,
		Bytes:       len(jsonPayload),
	})

	return nil
}

// HalfClose closes the send side of the stream (CloseSend).
func (s *StreamSession) HalfClose() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.closed {
		return nil
	}

	return s.stream.CloseSend()
}

// Cancel terminates the stream.
func (s *StreamSession) Cancel() {
	s.mu.Lock()
	defer s.mu.Unlock()

	if !s.closed {
		s.closed = true
		s.cancel()
	}
}

func (s *StreamSession) emit(ev StreamEvent) {
	select {
	case s.events <- ev:
	default:
		// Drop or non-blocking in case of full buffer
	}
}

func (s *StreamSession) readLoop() {
	defer func() {
		s.mu.Lock()
		s.closed = true
		s.mu.Unlock()
		s.cancel()
		close(s.events)
	}()

	// Read headers when available
	headerMD, err := s.stream.Header()
	if err == nil && len(headerMD) > 0 {
		s.emit(StreamEvent{
			Event:     "headers",
			Timestamp: time.Now().UTC().Format(time.RFC3339Nano),
			Headers:   MetadataToMap(headerMD),
		})
	}

	for {
		outMsg := dynamicpb.NewMessage(s.md.Output())
		recvErr := s.stream.RecvMsg(outMsg)

		if recvErr == io.EOF {
			// Stream completed normally
			trailers := MetadataToMap(s.stream.Trailer())
			duration := time.Since(s.startTime)

			s.emit(StreamEvent{
				Event:           "closed",
				Timestamp:       time.Now().UTC().Format(time.RFC3339Nano),
				StatusCode:      0,
				StatusMessage:   "OK",
				Trailers:        trailers,
				TotalDurationMs: float64(duration.Microseconds()) / 1000.0,
			})
			return
		}

		if recvErr != nil {
			st, _ := status.FromError(recvErr)
			trailers := MetadataToMap(s.stream.Trailer())
			duration := time.Since(s.startTime)

			s.emit(StreamEvent{
				Event:           "closed",
				Timestamp:       time.Now().UTC().Format(time.RFC3339Nano),
				StatusCode:      uint32(st.Code()),
				StatusMessage:   st.Code().String(),
				Error:           st.Message(),
				Trailers:        trailers,
				TotalDurationMs: float64(duration.Microseconds()) / 1000.0,
			})
			return
		}

		s.mu.Lock()
		s.recvSeq++
		seq := s.recvSeq
		latency := time.Since(s.lastSend)
		s.mu.Unlock()

		respJSON, err := schema.DynamicMessageToJSON(outMsg)
		if err != nil {
			respJSON = "{}"
		}

		s.emit(StreamEvent{
			Event:       "received",
			Timestamp:   time.Now().UTC().Format(time.RFC3339Nano),
			Sequence:    seq,
			PayloadJSON: respJSON,
			Bytes:       len(respJSON),
			LatencyMs:   float64(latency.Microseconds()) / 1000.0,
		})
	}
}
