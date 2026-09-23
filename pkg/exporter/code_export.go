package exporter

import (
	"bytes"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/alexandrmotologa/protolens/pkg/transport"
)

// ExportOptions holds options for generating CLI and code snippets.
type ExportOptions struct {
	Target      string
	Method      string // /package.Service/Method
	PayloadJSON string
	Headers     map[string]string
	TLS         transport.TLSConfig
}

// GenerateGrpcurl formats a copy-pasteable grpcurl command.
func GenerateGrpcurl(opts ExportOptions) string {
	var parts []string
	parts = append(parts, "grpcurl")

	if !opts.TLS.UseTLS {
		parts = append(parts, "-plaintext")
	} else {
		if opts.TLS.InsecureSkipVerify {
			parts = append(parts, "-insecure")
		}
		if opts.TLS.RootCACert != "" {
			parts = append(parts, fmt.Sprintf("-cacert %q", opts.TLS.RootCACert))
		}
		if opts.TLS.ClientCert != "" && opts.TLS.ClientKey != "" {
			parts = append(parts, fmt.Sprintf("-cert %q -key %q", opts.TLS.ClientCert, opts.TLS.ClientKey))
		}
	}

	for k, v := range opts.Headers {
		parts = append(parts, fmt.Sprintf("-H %q", fmt.Sprintf("%s: %s", k, v)))
	}

	payload := strings.TrimSpace(opts.PayloadJSON)
	if payload == "" {
		payload = "{}"
	}
	// Minify payload for single line CLI
	var minified bytes.Buffer
	if err := json.Compact(&minified, []byte(payload)); err == nil {
		payload = minified.String()
	}

	parts = append(parts, fmt.Sprintf("-d '%s'", payload))
	parts = append(parts, opts.Target)

	cleanMethod := strings.TrimPrefix(opts.Method, "/")
	parts = append(parts, cleanMethod)

	return strings.Join(parts, " \\\n  ")
}

// GenerateCurl formats a Connect-RPC curl command.
func GenerateCurl(opts ExportOptions) string {
	proto := "http"
	if opts.TLS.UseTLS {
		proto = "https"
	}

	target := opts.Target
	if !strings.HasPrefix(target, "http://") && !strings.HasPrefix(target, "https://") {
		target = fmt.Sprintf("%s://%s", proto, target)
	}

	cleanMethod := strings.TrimPrefix(opts.Method, "/")
	fullURL := fmt.Sprintf("%s/%s", strings.TrimRight(target, "/"), cleanMethod)

	var parts []string
	parts = append(parts, "curl -X POST")
	parts = append(parts, fmt.Sprintf("  %q", fullURL))
	parts = append(parts, "  -H \"Content-Type: application/json\"")
	parts = append(parts, "  -H \"Connect-Protocol-Version: 1\"")

	if opts.TLS.InsecureSkipVerify {
		parts = append(parts, "  -k")
	}

	for k, v := range opts.Headers {
		parts = append(parts, fmt.Sprintf("  -H %q", fmt.Sprintf("%s: %s", k, v)))
	}

	payload := strings.TrimSpace(opts.PayloadJSON)
	if payload == "" {
		payload = "{}"
	}
	var minified bytes.Buffer
	if err := json.Compact(&minified, []byte(payload)); err == nil {
		payload = minified.String()
	}

	parts = append(parts, fmt.Sprintf("  -d '%s'", payload))

	return strings.Join(parts, " \\\n")
}
