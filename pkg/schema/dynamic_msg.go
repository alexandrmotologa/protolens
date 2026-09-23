package schema

import (
	"encoding/json"
	"fmt"
	"strings"

	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/reflect/protoreflect"
	"google.golang.org/protobuf/types/dynamicpb"
)

// ExtractMessageInfo converts a protoreflect.MessageDescriptor into a MessageInfo model.
func ExtractMessageInfo(md protoreflect.MessageDescriptor, visited map[string]bool) MessageInfo {
	if visited == nil {
		visited = make(map[string]bool)
	}

	fullName := string(md.FullName())
	info := MessageInfo{
		FullName: fullName,
		Name:     string(md.Name()),
		Fields:   make([]FieldInfo, 0, md.Fields().Len()),
	}

	for i := 0; i < md.Fields().Len(); i++ {
		fd := md.Fields().Get(i)
		fInfo := FieldInfo{
			Name:       string(fd.Name()),
			JSONName:   fd.JSONName(),
			Number:     int32(fd.Number()),
			Type:       fd.Kind().String(),
			IsRepeated: fd.IsList(),
			IsMap:      fd.IsMap(),
		}

		if fd.ContainingOneof() != nil && !fd.ContainingOneof().IsSynthetic() {
			fInfo.OneofGroup = string(fd.ContainingOneof().Name())
		}

		if fd.IsMap() {
			fInfo.MapKeyType = fd.MapKey().Kind().String()
			fInfo.MapValType = fd.MapValue().Kind().String()
			if fd.MapValue().Kind() == protoreflect.MessageKind {
				fInfo.MessageType = string(fd.MapValue().Message().FullName())
			}
		} else if fd.Kind() == protoreflect.MessageKind {
			fInfo.MessageType = string(fd.Message().FullName())
		} else if fd.Kind() == protoreflect.EnumKind {
			ed := fd.Enum()
			enumValues := make([]string, 0, ed.Values().Len())
			for j := 0; j < ed.Values().Len(); j++ {
				enumValues = append(enumValues, string(ed.Values().Get(j).Name()))
			}
			fInfo.EnumValues = enumValues
		}

		info.Fields = append(info.Fields, fInfo)
	}

	return info
}

// GenerateJSONTemplate constructs an indented JSON sample object from a MessageDescriptor.
func GenerateJSONTemplate(md protoreflect.MessageDescriptor) string {
	obj := buildSampleObject(md, 0, make(map[string]int))
	b, err := json.MarshalIndent(obj, "", "  ")
	if err != nil {
		return "{}"
	}
	return string(b)
}

func buildSampleObject(md protoreflect.MessageDescriptor, depth int, depthTracker map[string]int) map[string]interface{} {
	if depth > 4 {
		return map[string]interface{}{}
	}

	fullName := string(md.FullName())
	if depthTracker[fullName] > 1 {
		return map[string]interface{}{}
	}
	depthTracker[fullName]++
	defer func() { depthTracker[fullName]-- }()

	result := make(map[string]interface{})

	fields := md.Fields()
	for i := 0; i < fields.Len(); i++ {
		fd := fields.Get(i)
		jsonKey := fd.JSONName()
		if jsonKey == "" {
			jsonKey = string(fd.Name())
		}

		if fd.IsMap() {
			valField := fd.MapValue()
			var sampleVal interface{}
			if valField.Kind() == protoreflect.MessageKind {
				sampleVal = buildSampleObject(valField.Message(), depth+1, depthTracker)
			} else {
				sampleVal = samplePrimitiveValue(valField)
			}
			result[jsonKey] = map[string]interface{}{
				"example_key": sampleVal,
			}
			continue
		}

		if fd.IsList() {
			if fd.Kind() == protoreflect.MessageKind {
				nestedObj := buildSampleObject(fd.Message(), depth+1, depthTracker)
				result[jsonKey] = []interface{}{nestedObj}
			} else {
				result[jsonKey] = []interface{}{samplePrimitiveValue(fd)}
			}
			continue
		}

		if fd.Kind() == protoreflect.MessageKind {
			// Handle well-known types
			wkt := string(fd.Message().FullName())
			switch wkt {
			case "google.protobuf.Timestamp":
				result[jsonKey] = "2026-01-01T00:00:00Z"
			case "google.protobuf.Duration":
				result[jsonKey] = "1.5s"
			case "google.protobuf.StringValue":
				result[jsonKey] = "sample"
			case "google.protobuf.Int32Value", "google.protobuf.Int64Value":
				result[jsonKey] = 0
			case "google.protobuf.BoolValue":
				result[jsonKey] = false
			case "google.protobuf.Empty":
				result[jsonKey] = map[string]interface{}{}
			case "google.protobuf.Struct":
				result[jsonKey] = map[string]interface{}{"key": "value"}
			default:
				result[jsonKey] = buildSampleObject(fd.Message(), depth+1, depthTracker)
			}
			continue
		}

		result[jsonKey] = samplePrimitiveValue(fd)
	}

	return result
}

func samplePrimitiveValue(fd protoreflect.FieldDescriptor) interface{} {
	switch fd.Kind() {
	case protoreflect.BoolKind:
		return false
	case protoreflect.Int32Kind, protoreflect.Sint32Kind, protoreflect.Sfixed32Kind:
		return 0
	case protoreflect.Int64Kind, protoreflect.Sint64Kind, protoreflect.Sfixed64Kind:
		return 0
	case protoreflect.Uint32Kind, protoreflect.Fixed32Kind:
		return 0
	case protoreflect.Uint64Kind, protoreflect.Fixed64Kind:
		return 0
	case protoreflect.FloatKind, protoreflect.DoubleKind:
		return 0.0
	case protoreflect.StringKind:
		return "sample"
	case protoreflect.BytesKind:
		return ""
	case protoreflect.EnumKind:
		ed := fd.Enum()
		if ed.Values().Len() > 0 {
			return string(ed.Values().Get(0).Name())
		}
		return 0
	default:
		return nil
	}
}

// JSONToDynamicMessage decodes a JSON payload into a dynamicpb.Message based on the MessageDescriptor.
func JSONToDynamicMessage(jsonStr string, md protoreflect.MessageDescriptor) (*dynamicpb.Message, error) {
	msg := dynamicpb.NewMessage(md)
	clean := strings.TrimSpace(jsonStr)
	if clean == "" || clean == "{}" {
		return msg, nil
	}

	unmarshalOpts := protojson.UnmarshalOptions{
		DiscardUnknown: true,
	}

	if err := unmarshalOpts.Unmarshal([]byte(clean), msg); err != nil {
		return nil, fmt.Errorf("failed to parse JSON payload into protobuf %s: %w", md.FullName(), err)
	}

	return msg, nil
}

// DynamicMessageToJSON encodes a proto.Message into a formatted JSON string.
func DynamicMessageToJSON(msg proto.Message) (string, error) {
	if msg == nil {
		return "{}", nil
	}

	marshalOpts := protojson.MarshalOptions{
		Multiline:       true,
		Indent:          "  ",
		EmitUnpopulated: false,
		UseProtoNames:   false,
	}

	b, err := marshalOpts.Marshal(msg)
	if err != nil {
		return "", fmt.Errorf("failed to marshal protobuf message to JSON: %w", err)
	}

	return string(b), nil
}
