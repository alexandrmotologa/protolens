package schema

import (
	"context"
	"fmt"
	"strings"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	rpb "google.golang.org/grpc/reflection/grpc_reflection_v1"
	rpbAlpha "google.golang.org/grpc/reflection/grpc_reflection_v1alpha"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/reflect/protodesc"
	"google.golang.org/protobuf/reflect/protoreflect"
	"google.golang.org/protobuf/reflect/protoregistry"
	"google.golang.org/protobuf/types/descriptorpb"
)

// Reflector handles gRPC server reflection for v1 and v1alpha protocols.
type Reflector struct{}

// NewReflector creates a new server reflection client.
func NewReflector() *Reflector {
	return &Reflector{}
}

// ReflectServices queries a live gRPC server for all service and method descriptors.
func (r *Reflector) ReflectServices(ctx context.Context, conn *grpc.ClientConn) (*SchemaRegistry, *protoregistry.Files, error) {
	// First attempt reflection v1
	reg, files, err := r.reflectV1(ctx, conn)
	if err == nil {
		return reg, files, nil
	}

	// Fallback to v1alpha if v1 is unimplemented or unavailable
	st, ok := status.FromError(err)
	if ok && (st.Code() == codes.Unimplemented || st.Code() == codes.NotFound) {
		return r.reflectV1Alpha(ctx, conn)
	}

	// Try v1alpha anyway on general failure
	if regAlpha, filesAlpha, errAlpha := r.reflectV1Alpha(ctx, conn); errAlpha == nil {
		return regAlpha, filesAlpha, nil
	}

	return nil, nil, fmt.Errorf("reflection failed (v1: %v)", err)
}

func (r *Reflector) reflectV1(ctx context.Context, conn *grpc.ClientConn) (*SchemaRegistry, *protoregistry.Files, error) {
	client := rpb.NewServerReflectionClient(conn)
	stream, err := client.ServerReflectionInfo(ctx)
	if err != nil {
		return nil, nil, err
	}
	defer stream.CloseSend()

	// List services
	if err := stream.Send(&rpb.ServerReflectionRequest{
		MessageRequest: &rpb.ServerReflectionRequest_ListServices{
			ListServices: "*",
		},
	}); err != nil {
		return nil, nil, err
	}

	resp, err := stream.Recv()
	if err != nil {
		return nil, nil, err
	}

	listResp := resp.GetListServicesResponse()
	if listResp == nil {
		return nil, nil, fmt.Errorf("unexpected reflection response: %T", resp.MessageResponse)
	}

	rawProtos := make(map[string][]byte)

	for _, svc := range listResp.Service {
		sName := svc.Name
		if isReflectionService(sName) {
			continue
		}

		if err := stream.Send(&rpb.ServerReflectionRequest{
			MessageRequest: &rpb.ServerReflectionRequest_FileContainingSymbol{
				FileContainingSymbol: sName,
			},
		}); err != nil {
			return nil, nil, err
		}

		fResp, err := stream.Recv()
		if err != nil {
			return nil, nil, err
		}

		fdResp := fResp.GetFileDescriptorResponse()
		if fdResp == nil {
			continue
		}

		for _, b := range fdResp.FileDescriptorProto {
			var fdp descriptorpb.FileDescriptorProto
			if err := proto.Unmarshal(b, &fdp); err == nil && fdp.Name != nil {
				rawProtos[*fdp.Name] = b
			}
		}
	}

	return buildRegistryFromRawProtos(rawProtos, "reflection")
}

func (r *Reflector) reflectV1Alpha(ctx context.Context, conn *grpc.ClientConn) (*SchemaRegistry, *protoregistry.Files, error) {
	client := rpbAlpha.NewServerReflectionClient(conn)
	stream, err := client.ServerReflectionInfo(ctx)
	if err != nil {
		return nil, nil, err
	}
	defer stream.CloseSend()

	if err := stream.Send(&rpbAlpha.ServerReflectionRequest{
		MessageRequest: &rpbAlpha.ServerReflectionRequest_ListServices{
			ListServices: "*",
		},
	}); err != nil {
		return nil, nil, err
	}

	resp, err := stream.Recv()
	if err != nil {
		return nil, nil, err
	}

	listResp := resp.GetListServicesResponse()
	if listResp == nil {
		return nil, nil, fmt.Errorf("unexpected reflection v1alpha response: %T", resp.MessageResponse)
	}

	rawProtos := make(map[string][]byte)

	for _, svc := range listResp.Service {
		sName := svc.Name
		if isReflectionService(sName) {
			continue
		}

		if err := stream.Send(&rpbAlpha.ServerReflectionRequest{
			MessageRequest: &rpbAlpha.ServerReflectionRequest_FileContainingSymbol{
				FileContainingSymbol: sName,
			},
		}); err != nil {
			return nil, nil, err
		}

		fResp, err := stream.Recv()
		if err != nil {
			return nil, nil, err
		}

		fdResp := fResp.GetFileDescriptorResponse()
		if fdResp == nil {
			continue
		}

		for _, b := range fdResp.FileDescriptorProto {
			var fdp descriptorpb.FileDescriptorProto
			if err := proto.Unmarshal(b, &fdp); err == nil && fdp.Name != nil {
				rawProtos[*fdp.Name] = b
			}
		}
	}

	return buildRegistryFromRawProtos(rawProtos, "reflection")
}

func isReflectionService(name string) bool {
	return strings.HasPrefix(name, "grpc.reflection.")
}

func buildRegistryFromRawProtos(rawProtos map[string][]byte, source string) (*SchemaRegistry, *protoregistry.Files, error) {
	if len(rawProtos) == 0 {
		return &SchemaRegistry{Source: source, Services: []ServiceInfo{}}, &protoregistry.Files{}, nil
	}

	set := &descriptorpb.FileDescriptorSet{}
	for _, b := range rawProtos {
		var fdp descriptorpb.FileDescriptorProto
		if err := proto.Unmarshal(b, &fdp); err != nil {
			return nil, nil, fmt.Errorf("failed to unmarshal file descriptor proto: %w", err)
		}
		set.File = append(set.File, &fdp)
	}

	opts := protodesc.FileOptions{AllowUnresolvable: true}
	files, err := opts.NewFiles(set)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to register file descriptors: %w", err)
	}

	registry := &SchemaRegistry{
		Source:   source,
		Services: make([]ServiceInfo, 0),
	}

	files.RangeFiles(func(fd protoreflect.FileDescriptor) bool {
		for i := 0; i < fd.Services().Len(); i++ {
			sd := fd.Services().Get(i)
			sInfo := ServiceInfo{
				Name:     string(sd.Name()),
				FullName: string(sd.FullName()),
				Package:  string(fd.Package()),
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
					Package:         string(fd.Package()),
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
		return true
	})

	return registry, files, nil
}
