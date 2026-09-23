package transport

import (
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"os"

	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/credentials/insecure"
)

// TLSConfig defines TLS and mutual TLS options for RPC connections.
type TLSConfig struct {
	UseTLS             bool   `json:"useTls"`
	InsecureSkipVerify bool   `json:"insecureSkipVerify"`
	RootCACert         string `json:"rootCaCert,omitempty"` // PEM content or file path
	ClientCert         string `json:"clientCert,omitempty"` // PEM content or file path
	ClientKey          string `json:"clientKey,omitempty"`  // PEM content or file path
	ServerNameOverride string `json:"serverNameOverride,omitempty"`
}

// BuildTransportCredentials converts TLSConfig into gRPC TransportCredentials.
func BuildTransportCredentials(cfg TLSConfig) (credentials.TransportCredentials, error) {
	if !cfg.UseTLS {
		return insecure.NewCredentials(), nil
	}

	tlsConf := &tls.Config{
		InsecureSkipVerify: cfg.InsecureSkipVerify,
		ServerName:         cfg.ServerNameOverride,
	}

	// Load custom Root CA if provided
	if cfg.RootCACert != "" {
		caCertBytes, err := readOrContent(cfg.RootCACert)
		if err != nil {
			return nil, fmt.Errorf("failed to read root CA: %w", err)
		}
		caPool := x509.NewCertPool()
		if !caPool.AppendCertsFromPEM(caCertBytes) {
			return nil, fmt.Errorf("failed to parse root CA PEM")
		}
		tlsConf.RootCAs = caPool
	}

	// Load Client Certificate & Key for mTLS if provided
	if cfg.ClientCert != "" && cfg.ClientKey != "" {
		certBytes, err := readOrContent(cfg.ClientCert)
		if err != nil {
			return nil, fmt.Errorf("failed to read client cert: %w", err)
		}
		keyBytes, err := readOrContent(cfg.ClientKey)
		if err != nil {
			return nil, fmt.Errorf("failed to read client key: %w", err)
		}

		keyPair, err := tls.X509KeyPair(certBytes, keyBytes)
		if err != nil {
			return nil, fmt.Errorf("failed to load client key pair for mTLS: %w", err)
		}
		tlsConf.Certificates = []tls.Certificate{keyPair}
	}

	return credentials.NewTLS(tlsConf), nil
}

func readOrContent(input string) ([]byte, error) {
	// If it looks like a file path that exists, read it
	if _, err := os.Stat(input); err == nil {
		return os.ReadFile(input)
	}
	// Otherwise treat it as PEM string content
	return []byte(input), nil
}
