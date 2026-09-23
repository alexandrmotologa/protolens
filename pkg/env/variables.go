package env

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"regexp"
	"strings"
	"time"
)

var varRegex = regexp.MustCompile(`\{\{([^{}]+)\}\}`)

// Interpolate replaces {{VAR}} placeholders using environment variables and built-in generators.
func Interpolate(text string, envVars map[string]string) string {
	if text == "" {
		return ""
	}

	return varRegex.ReplaceAllStringFunc(text, func(match string) string {
		key := strings.TrimSpace(match[2 : len(match)-2])

		// Check built-in dynamic generators
		switch strings.ToLower(key) {
		case "$guid", "$uuid":
			return generateUUID()
		case "$timestamp":
			return fmt.Sprintf("%d", time.Now().Unix())
		case "$timestampms":
			return fmt.Sprintf("%d", time.Now().UnixNano()/int64(time.Millisecond))
		case "$isotimestamp":
			return time.Now().UTC().Format(time.RFC3339)
		case "$randomint":
			n, _ := rand.Int(rand.Reader, big.NewInt(1000))
			return fmt.Sprintf("%d", n.Int64()+1)
		case "$randomemail":
			n, _ := rand.Int(rand.Reader, big.NewInt(9000))
			return fmt.Sprintf("user_%d@example.com", n.Int64()+1000)
		}

		// Check user environment variables
		if val, exists := envVars[key]; exists {
			return val
		}

		// Keep original placeholder if not resolved
		return match
	})
}

// InterpolateMap returns a new map with all values interpolated.
func InterpolateMap(headers map[string]string, envVars map[string]string) map[string]string {
	if headers == nil {
		return nil
	}
	result := make(map[string]string, len(headers))
	for k, v := range headers {
		result[Interpolate(k, envVars)] = Interpolate(v, envVars)
	}
	return result
}

func generateUUID() string {
	var b [16]byte
	_, _ = rand.Read(b[:])
	b[6] = (b[6] & 0x0f) | 0x40 // Version 4
	b[8] = (b[8] & 0x3f) | 0x80 // Variant RFC4122
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}
