package schema

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/bufbuild/protocompile"
	"google.golang.org/protobuf/reflect/protoregistry"
)

// Parser loads and parses local .proto files or raw proto definitions.
type Parser struct{}

// NewParser creates a new proto parser.
func NewParser() *Parser {
	return &Parser{}
}

// ParseProtoFiles parses a list of .proto file paths with optional import search paths.
func (p *Parser) ParseProtoFiles(ctx context.Context, filePaths []string, importPaths []string) (*SchemaRegistry, *protoregistry.Files, error) {
	if len(filePaths) == 0 {
		return nil, nil, fmt.Errorf("no proto files specified")
	}

	// Calculate base directories for files to assist relative imports
	uniqueImportDirs := make(map[string]bool)
	for _, ip := range importPaths {
		clean := filepath.Clean(ip)
		uniqueImportDirs[clean] = true
	}

	normalizedFiles := make([]string, len(filePaths))
	for i, fp := range filePaths {
		absPath, err := filepath.Abs(fp)
		if err == nil {
			uniqueImportDirs[filepath.Dir(absPath)] = true
		}
		// protocompile expects forward-slash separated paths
		normalizedFiles[i] = filepath.ToSlash(fp)
	}

	allImportPaths := make([]string, 0, len(uniqueImportDirs))
	for dir := range uniqueImportDirs {
		allImportPaths = append(allImportPaths, dir)
	}

	sourceResolver := &protocompile.SourceResolver{
		ImportPaths: allImportPaths,
	}

	compiler := protocompile.Compiler{
		Resolver:       protocompile.WithStandardImports(sourceResolver),
		SourceInfoMode: protocompile.SourceInfoStandard,
	}

	linkedFiles, err := compiler.Compile(ctx, normalizedFiles...)
	if err != nil {
		return nil, nil, fmt.Errorf("proto compilation error: %w", err)
	}

	files := &protoregistry.Files{}
	for _, lf := range linkedFiles {
		if err := files.RegisterFile(lf); err != nil {
			// Ignore already registered errors if duplicate
			if !strings.Contains(err.Error(), "already registered") {
				return nil, nil, fmt.Errorf("failed to register file %s: %w", lf.Path(), err)
			}
		}
	}

	registry := &SchemaRegistry{
		Source:   "file",
		Services: make([]ServiceInfo, 0),
	}

	for _, lf := range linkedFiles {
		for i := 0; i < lf.Services().Len(); i++ {
			sd := lf.Services().Get(i)
			sInfo := ServiceInfo{
				Name:     string(sd.Name()),
				FullName: string(sd.FullName()),
				Package:  string(lf.Package()),
				Methods:  make([]MethodInfo, 0, sd.Methods().Len()),
			}

			for j := 0; j < sd.Methods().Len(); j++ {
				md := sd.Methods().Get(j)
				kind := RPCKindUnary
				if md.IsStreamingClient() && md.IsStreamingServer() {
					kind = RPCKindBidirectional
				} else if md.IsStreamingClient() {
					kind = RPCKindClientStream
				} else if md.IsStreamingServer() {
					kind = RPCKindServerStream
				}

				mInfo := MethodInfo{
					Name:            string(md.Name()),
					FullName:        fmt.Sprintf("/%s/%s", sd.FullName(), md.Name()),
					Service:         string(sd.FullName()),
					Package:         string(lf.Package()),
					Kind:            kind,
					ClientStreaming: md.IsStreamingClient(),
					ServerStreaming: md.IsStreamingServer(),
					Input:           ExtractMessageInfo(md.Input(), nil),
					Output:          ExtractMessageInfo(md.Output(), nil),
					InputTemplate:   GenerateJSONTemplate(md.Input()),
				}

				sInfo.Methods = append(sInfo.Methods, mInfo)
			}

			registry.Services = append(registry.Services, sInfo)
		}
	}

	return registry, files, nil
}

// ParseProtoContent parses raw .proto string content in-memory.
func (p *Parser) ParseProtoContent(ctx context.Context, filename string, content string) (*SchemaRegistry, *protoregistry.Files, error) {
	if filename == "" {
		filename = "input.proto"
	}
	cleanName := filepath.ToSlash(filename)

	sourceResolver := &protocompile.SourceResolver{
		Accessor: func(path string) (io.ReadCloser, error) {
			if path == cleanName {
				return io.NopCloser(strings.NewReader(content)), nil
			}
			return os.Open(path)
		},
	}

	compiler := protocompile.Compiler{
		Resolver:       protocompile.WithStandardImports(sourceResolver),
		SourceInfoMode: protocompile.SourceInfoStandard,
	}

	linkedFiles, err := compiler.Compile(ctx, cleanName)
	if err != nil {
		return nil, nil, fmt.Errorf("in-memory proto compile failed: %w", err)
	}

	files := &protoregistry.Files{}
	for _, lf := range linkedFiles {
		_ = files.RegisterFile(lf)
	}

	registry := &SchemaRegistry{
		Source:   "memory",
		Services: make([]ServiceInfo, 0),
	}

	for _, lf := range linkedFiles {
		for i := 0; i < lf.Services().Len(); i++ {
			sd := lf.Services().Get(i)
			sInfo := ServiceInfo{
				Name:     string(sd.Name()),
				FullName: string(sd.FullName()),
				Package:  string(lf.Package()),
				Methods:  make([]MethodInfo, 0, sd.Methods().Len()),
			}

			for j := 0; j < sd.Methods().Len(); j++ {
				md := sd.Methods().Get(j)
				kind := RPCKindUnary
				if md.IsStreamingClient() && md.IsStreamingServer() {
					kind = RPCKindBidirectional
				} else if md.IsStreamingClient() {
					kind = RPCKindClientStream
				} else if md.IsStreamingServer() {
					kind = RPCKindServerStream
				}

				mInfo := MethodInfo{
					Name:            string(md.Name()),
					FullName:        fmt.Sprintf("/%s/%s", sd.FullName(), md.Name()),
					Service:         string(sd.FullName()),
					Package:         string(lf.Package()),
					Kind:            kind,
					ClientStreaming: md.IsStreamingClient(),
					ServerStreaming: md.IsStreamingServer(),
					Input:           ExtractMessageInfo(md.Input(), nil),
					Output:          ExtractMessageInfo(md.Output(), nil),
					InputTemplate:   GenerateJSONTemplate(md.Input()),
				}

				sInfo.Methods = append(sInfo.Methods, mInfo)
			}

			registry.Services = append(registry.Services, sInfo)
		}
	}

	return registry, files, nil
}
