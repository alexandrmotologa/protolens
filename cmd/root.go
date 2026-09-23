package cmd

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"time"

	"github.com/alexandrmotologa/protolens/pkg/schema"
	"github.com/alexandrmotologa/protolens/pkg/transport"
	"github.com/alexandrmotologa/protolens/server"
	"github.com/alexandrmotologa/protolens/server/state"
	"github.com/spf13/cobra"
)

var (
	portFlag       int
	targetFlag     string
	protoFileFlag  string
	protoDirFlag   string
	tlsFlag        bool
	insecureFlag   bool
	noBrowserFlag  bool
)

var rootCmd = &cobra.Command{
	Use:   "protolens",
	Short: "ProtoLens is a desktop studio, reflection explorer, and mock engine for gRPC and Connect-RPC.",
	RunE: func(cmd *cobra.Command, args []string) error {
		appState := state.NewAppState()

		// Preload target reflection if specified
		if targetFlag != "" {
			tlsConf := transport.TLSConfig{
				UseTLS:             tlsFlag,
				InsecureSkipVerify: insecureFlag,
			}
			appState.ActiveTarget = targetFlag
			appState.ActiveTLS = tlsConf

			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()

			conn, err := appState.ClientPool.GetConn(ctx, targetFlag, tlsConf)
			if err == nil {
				reflector := schema.NewReflector()
				reg, files, err := reflector.ReflectServices(ctx, conn)
				if err == nil {
					reg.Endpoint = targetFlag
					appState.SetSchema(files, reg)
					fmt.Printf("✓ Discovered %d service(s) from %s via reflection\n", len(reg.Services), targetFlag)
				}
			}
		}

		// Preload local proto files if specified
		if protoFileFlag != "" || protoDirFlag != "" {
			var filesToLoad []string
			if protoFileFlag != "" {
				filesToLoad = append(filesToLoad, protoFileFlag)
			}
			if protoDirFlag != "" {
				_ = filepath.Walk(protoDirFlag, func(path string, info os.FileInfo, err error) error {
					if err == nil && !info.IsDir() && filepath.Ext(path) == ".proto" {
						filesToLoad = append(filesToLoad, path)
					}
					return nil
				})
			}

			if len(filesToLoad) > 0 {
				parser := schema.NewParser()
				reg, files, err := parser.ParseProtoFiles(context.Background(), filesToLoad, []string{protoDirFlag})
				if err == nil {
					appState.SetSchema(files, reg)
					fmt.Printf("✓ Loaded %d service(s) from %d local proto file(s)\n", len(reg.Services), len(filesToLoad))
				}
			}
		}

		router := server.NewRouter(appState)
		addr := fmt.Sprintf("127.0.0.1:%d", portFlag)
		studioURL := fmt.Sprintf("http://localhost:%d", portFlag)

		fmt.Println("==================================================================")
		fmt.Printf("  ProtoLens Studio running at: %s\n", studioURL)
		fmt.Printf("  Multi-Protocol: gRPC (HTTP/2), Connect-RPC, Dynamic Mock Engine\n")
		fmt.Println("==================================================================")

		if !noBrowserFlag {
			go func() {
				time.Sleep(300 * time.Millisecond)
				OpenBrowser(studioURL)
			}()
		}

		srv := &http.Server{
			Addr:    addr,
			Handler: router,
		}

		return srv.ListenAndServe()
	},
}

func init() {
	rootCmd.PersistentFlags().IntVarP(&portFlag, "port", "p", 50050, "Port for ProtoLens web studio")
	rootCmd.PersistentFlags().StringVarP(&targetFlag, "target", "t", "", "Target gRPC or Connect host to connect to (e.g. localhost:50051)")
	rootCmd.PersistentFlags().StringVar(&protoFileFlag, "proto", "", "Path to a .proto file to preload")
	rootCmd.PersistentFlags().StringVar(&protoDirFlag, "proto-dir", "", "Directory containing .proto files")
	rootCmd.PersistentFlags().BoolVar(&tlsFlag, "tls", false, "Use TLS for RPC connections")
	rootCmd.PersistentFlags().BoolVar(&insecureFlag, "insecure", false, "Skip TLS verification")
	rootCmd.PersistentFlags().BoolVar(&noBrowserFlag, "no-browser", false, "Do not launch the browser automatically")
}

// Execute runs the root CLI command.
func Execute() error {
	return rootCmd.Execute()
}

// OpenBrowser opens the specified URL in the user's default browser.
func OpenBrowser(url string) {
	var cmd string
	var args []string

	switch runtime.GOOS {
	case "windows":
		cmd = "rundll32"
		args = []string{"url.dll,FileProtocolHandler", url}
	case "darwin":
		cmd = "open"
		args = []string{url}
	default:
		cmd = "xdg-open"
		args = []string{url}
	}

	_ = exec.Command(cmd, args...).Start()
}
