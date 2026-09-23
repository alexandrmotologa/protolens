package cmd

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/alexandrmotologa/protolens/pkg/mock"
	"github.com/alexandrmotologa/protolens/pkg/schema"
	"github.com/spf13/cobra"
)

var (
	mockProtoFlag   string
	mockPortFlag    int
	mockLatencyFlag int
	mockErrorFlag   int
)

var mockCmd = &cobra.Command{
	Use:   "mock",
	Short: "Start a standalone headless gRPC mock server from a proto file",
	RunE: func(cmd *cobra.Command, args []string) error {
		if mockProtoFlag == "" {
			return fmt.Errorf("--proto flag is required")
		}

		parser := schema.NewParser()
		reg, files, err := parser.ParseProtoFiles(context.Background(), []string{mockProtoFlag}, nil)
		if err != nil {
			return fmt.Errorf("failed to parse proto: %w", err)
		}

		cfg := mock.MockServerConfig{
			Port:      mockPortFlag,
			LatencyMs: mockLatencyFlag,
			ErrorCode: mockErrorFlag,
		}

		srv := mock.NewServer(cfg, files)
		if err := srv.Start(); err != nil {
			return fmt.Errorf("failed to start mock server: %w", err)
		}

		fmt.Printf("✓ Dynamic Mock Server listening on 0.0.0.0:%d\n", srv.Port())
		fmt.Printf("  Loaded %d service(s):\n", len(reg.Services))
		for _, svc := range reg.Services {
			fmt.Printf("   • %s (%d methods)\n", svc.FullName, len(svc.Methods))
		}
		fmt.Println("Press Ctrl+C to terminate.")

		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
		<-sigChan

		srv.Stop()
		fmt.Println("\nMock server stopped.")
		return nil
	},
}

func init() {
	mockCmd.Flags().StringVar(&mockProtoFlag, "proto", "", "Path to .proto file")
	mockCmd.Flags().IntVarP(&mockPortFlag, "port", "p", 50055, "Port to listen on")
	mockCmd.Flags().IntVar(&mockLatencyFlag, "latency", 0, "Artificial latency in milliseconds")
	mockCmd.Flags().IntVar(&mockErrorFlag, "error-code", 0, "Inject gRPC error status code")
	rootCmd.AddCommand(mockCmd)
}
