package cmd

import (
	"context"
	"fmt"
	"time"

	"github.com/alexandrmotologa/protolens/pkg/schema"
	"github.com/alexandrmotologa/protolens/pkg/transport"
	"github.com/spf13/cobra"
)

var (
	jsonOutputFlag bool
)

var reflectCmd = &cobra.Command{
	Use:   "reflect <target>",
	Short: "Query gRPC Server Reflection and print discovered services and methods",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		target := args[0]
		tlsConf := transport.TLSConfig{
			UseTLS:             tlsFlag,
			InsecureSkipVerify: insecureFlag,
		}

		pool := transport.NewClientPool()
		defer pool.Close()

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		conn, err := pool.GetConn(ctx, target, tlsConf)
		if err != nil {
			return fmt.Errorf("connection failed: %w", err)
		}

		reflector := schema.NewReflector()
		reg, _, err := reflector.ReflectServices(ctx, conn)
		if err != nil {
			return fmt.Errorf("reflection failed: %w", err)
		}
		reg.Endpoint = target

		if jsonOutputFlag {
			b, err := reg.ToJSON()
			if err != nil {
				return err
			}
			fmt.Println(string(b))
			return nil
		}

		fmt.Printf("Endpoint: %s\n", target)
		fmt.Printf("Discovered %d service(s):\n\n", len(reg.Services))
		for _, s := range reg.Services {
			fmt.Printf("Service: %s (package: %s)\n", s.FullName, s.Package)
			for _, m := range s.Methods {
				fmt.Printf("  • %-20s [%s] -> (%s) returns (%s)\n",
					m.Name, m.Kind, m.Input.Name, m.Output.Name)
			}
			fmt.Println()
		}

		return nil
	},
}

func init() {
	reflectCmd.Flags().BoolVar(&jsonOutputFlag, "json", false, "Output results as formatted JSON")
	rootCmd.AddCommand(reflectCmd)
}
