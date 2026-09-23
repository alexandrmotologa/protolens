package mock

import (
	"fmt"
	"math/rand"
	"strings"
	"time"

	"google.golang.org/protobuf/reflect/protoreflect"
	"google.golang.org/protobuf/types/dynamicpb"
)

var (
	sampleNames   = []string{"Alex Motologa", "Sarah Connor", "Elena Rostova", "Marcus Vance", "David Chen"}
	sampleEmails  = []string{"alex@example.com", "sarah@example.com", "elena@example.com", "marcus@example.com"}
	sampleWords   = []string{"alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel"}
	sampleCities  = []string{"San Francisco", "Zurich", "Tokyo", "Berlin", "London", "Austin"}
	sampleDomains = []string{"internal.api", "service.mesh", "cloud.local", "inference.engine"}
)

// GenerateMockMessage creates a populated dynamicpb.Message filled with schema-valid mock values.
func GenerateMockMessage(md protoreflect.MessageDescriptor) *dynamicpb.Message {
	msg := dynamicpb.NewMessage(md)
	populateMessage(msg, md, 0)
	return msg
}

func populateMessage(msg *dynamicpb.Message, md protoreflect.MessageDescriptor, depth int) {
	if depth > 4 {
		return
	}

	fields := md.Fields()
	for i := 0; i < fields.Len(); i++ {
		fd := fields.Get(i)
		fieldName := strings.ToLower(string(fd.Name()))

		if fd.IsMap() {
			mapVal := msg.Mutable(fd).Map()
			keyField := fd.MapKey()
			valField := fd.MapValue()

			key := protoreflect.ValueOf("sample_key")
			if keyField.Kind() == protoreflect.Int32Kind || keyField.Kind() == protoreflect.Int64Kind {
				key = protoreflect.ValueOf(int32(1))
			}

			if valField.Kind() == protoreflect.MessageKind {
				nestedMsg := dynamicpb.NewMessage(valField.Message())
				populateMessage(nestedMsg, valField.Message(), depth+1)
				mapVal.Set(key.MapKey(), protoreflect.ValueOfMessage(nestedMsg))
			} else {
				val := fakePrimitive(valField, fieldName)
				mapVal.Set(key.MapKey(), val)
			}
			continue
		}

		if fd.IsList() {
			listVal := msg.Mutable(fd).List()
			if fd.Kind() == protoreflect.MessageKind {
				nestedMsg := dynamicpb.NewMessage(fd.Message())
				populateMessage(nestedMsg, fd.Message(), depth+1)
				listVal.Append(protoreflect.ValueOfMessage(nestedMsg))
			} else {
				listVal.Append(fakePrimitive(fd, fieldName))
			}
			continue
		}

		if fd.Kind() == protoreflect.MessageKind {
			// Well-known types
			wkt := string(fd.Message().FullName())
			switch wkt {
			case "google.protobuf.Timestamp", "google.protobuf.Duration", "google.protobuf.Empty":
				// Empty or default
				continue
			}

			nestedMsg := dynamicpb.NewMessage(fd.Message())
			populateMessage(nestedMsg, fd.Message(), depth+1)
			msg.Set(fd, protoreflect.ValueOfMessage(nestedMsg))
			continue
		}

		val := fakePrimitive(fd, fieldName)
		msg.Set(fd, val)
	}
}

func fakePrimitive(fd protoreflect.FieldDescriptor, fieldName string) protoreflect.Value {
	r := rand.New(rand.NewSource(time.Now().UnixNano()))

	switch fd.Kind() {
	case protoreflect.BoolKind:
		return protoreflect.ValueOfBool(true)

	case protoreflect.Int32Kind, protoreflect.Sint32Kind, protoreflect.Sfixed32Kind:
		if strings.Contains(fieldName, "status") || strings.Contains(fieldName, "code") {
			return protoreflect.ValueOfInt32(200)
		}
		if strings.Contains(fieldName, "age") {
			return protoreflect.ValueOfInt32(int32(20 + r.Intn(40)))
		}
		return protoreflect.ValueOfInt32(int32(1 + r.Intn(100)))

	case protoreflect.Int64Kind, protoreflect.Sint64Kind, protoreflect.Sfixed64Kind:
		if strings.Contains(fieldName, "id") {
			return protoreflect.ValueOfInt64(int64(1000 + r.Intn(9000)))
		}
		return protoreflect.ValueOfInt64(time.Now().Unix())

	case protoreflect.Uint32Kind, protoreflect.Fixed32Kind:
		return protoreflect.ValueOfUint32(uint32(10 + r.Intn(50)))

	case protoreflect.Uint64Kind, protoreflect.Fixed64Kind:
		return protoreflect.ValueOfUint64(uint64(500 + r.Intn(5000)))

	case protoreflect.FloatKind:
		return protoreflect.ValueOfFloat32(float32(9.99 + float64(r.Intn(90))))

	case protoreflect.DoubleKind:
		if strings.Contains(fieldName, "price") || strings.Contains(fieldName, "amount") || strings.Contains(fieldName, "total") {
			return protoreflect.ValueOfFloat64(49.95)
		}
		if strings.Contains(fieldName, "lat") {
			return protoreflect.ValueOfFloat64(37.7749)
		}
		if strings.Contains(fieldName, "lon") || strings.Contains(fieldName, "lng") {
			return protoreflect.ValueOfFloat64(-122.4194)
		}
		return protoreflect.ValueOfFloat64(float64(r.Intn(100)) + 0.5)

	case protoreflect.StringKind:
		if strings.Contains(fieldName, "email") {
			return protoreflect.ValueOfString(sampleEmails[r.Intn(len(sampleEmails))])
		}
		if strings.Contains(fieldName, "name") {
			return protoreflect.ValueOfString(sampleNames[r.Intn(len(sampleNames))])
		}
		if strings.Contains(fieldName, "city") {
			return protoreflect.ValueOfString(sampleCities[r.Intn(len(sampleCities))])
		}
		if strings.Contains(fieldName, "domain") || strings.Contains(fieldName, "host") {
			return protoreflect.ValueOfString(sampleDomains[r.Intn(len(sampleDomains))])
		}
		if strings.Contains(fieldName, "id") {
			return protoreflect.ValueOfString(fmt.Sprintf("%s_%d", sampleWords[r.Intn(len(sampleWords))], 100+r.Intn(900)))
		}
		if strings.Contains(fieldName, "status") {
			return protoreflect.ValueOfString("ACTIVE")
		}
		return protoreflect.ValueOfString(fmt.Sprintf("mock_%s", sampleWords[r.Intn(len(sampleWords))]))

	case protoreflect.BytesKind:
		return protoreflect.ValueOfBytes([]byte("mock_binary_data"))

	case protoreflect.EnumKind:
		ed := fd.Enum()
		if ed.Values().Len() > 0 {
			// Pick the first non-zero enum if possible
			idx := 0
			if ed.Values().Len() > 1 {
				idx = 1
			}
			return protoreflect.ValueOfEnum(ed.Values().Get(idx).Number())
		}
		return protoreflect.ValueOfEnum(0)

	default:
		return protoreflect.ValueOfString("mock_value")
	}
}
