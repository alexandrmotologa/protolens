package transport

import (
	"context"
	"encoding/base64"
	"strings"
	"time"

	"google.golang.org/grpc/metadata"
)

// BuildOutgoingContext creates a new context with outgoing gRPC metadata and optional timeout.
func BuildOutgoingContext(ctx context.Context, headers map[string]string, timeoutMs int64) (context.Context, context.CancelFunc) {
	md := metadata.MD{}

	for k, v := range headers {
		key := strings.ToLower(strings.TrimSpace(k))
		if key == "" {
			continue
		}

		if strings.HasSuffix(key, "-bin") {
			// If already base64, keep it, otherwise encode
			if _, err := base64.StdEncoding.DecodeString(v); err == nil {
				md.Append(key, v)
			} else {
				encoded := base64.StdEncoding.EncodeToString([]byte(v))
				md.Append(key, encoded)
			}
		} else {
			md.Append(key, v)
		}
	}

	outCtx := metadata.NewOutgoingContext(ctx, md)

	if timeoutMs > 0 {
		return context.WithTimeout(outCtx, time.Duration(timeoutMs)*time.Millisecond)
	}

	return context.WithCancel(outCtx)
}

// MetadataToMap converts gRPC metadata into a map of string arrays.
func MetadataToMap(md metadata.MD) map[string][]string {
	if md == nil {
		return make(map[string][]string)
	}
	result := make(map[string][]string, len(md))
	for k, vals := range md {
		result[k] = vals
	}
	return result
}
