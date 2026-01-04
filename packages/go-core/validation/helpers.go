// Package validation provides event validation for ATTN Protocol events.
// It validates custom event kinds (Marketplace, Billboard, Promotion, Attention, Match, etc.)
// according to the ATTN-01 specification, checking required tags and JSON content fields.
//
// This package is designed to be importable by other relays (e.g., city-protocol/relay)
// and does not have any logging dependencies. Logging should be done at the call site.
package validation

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/nbd-wtf/go-nostr"
)

// validateDTagFormat validates that d tag follows the appropriate namespace format.
// ATTN Protocol events use: org.attnprotocol:<event_type>:<identifier>
// City Protocol events use: org.cityprotocol:<event_type>:<identifier>
func validateDTagFormat(kind int, d_tag string) error {
	// City Protocol block events use org.cityprotocol: prefix
	if kind == 38808 {
		expected_prefix := "org.cityprotocol:"
		if !strings.HasPrefix(d_tag, expected_prefix) {
			return fmt.Errorf("d tag must start with '%s' for City Protocol events", expected_prefix)
		}
		// Validate format: org.cityprotocol:block:<height>:<hash>
		if !strings.HasPrefix(d_tag, "org.cityprotocol:block:") {
			return fmt.Errorf("d tag must be in format 'org.cityprotocol:block:<height>:<hash>'")
		}
		return nil
	}

	// ATTN Protocol events use org.attnprotocol: prefix
	expected_prefix := "org.attnprotocol:"
	if !strings.HasPrefix(d_tag, expected_prefix) {
		return fmt.Errorf("d tag must start with '%s'", expected_prefix)
	}

	// Map of event kinds to expected event type in d tag
	event_type_map := map[int]string{
		38188: "marketplace",
		38288: "billboard",
		38388: "promotion",
		38488: "attention",
		38588: "billboard-confirmation",
		38688: "attention-confirmation",
		38788: "marketplace-confirmation",
		38888: "match",
		38988: "attention-payment-confirmation",
	}

	expected_type, ok := event_type_map[kind]
	if !ok {
		return fmt.Errorf("unknown event kind: %d", kind)
	}

	// Remove the prefix to get the remaining parts: <event_type>:<identifier>
	remaining := strings.TrimPrefix(d_tag, expected_prefix)
	if remaining == d_tag {
		// This shouldn't happen since we checked HasPrefix above, but be safe
		return fmt.Errorf("d tag must start with 'org.attnprotocol:'")
	}

	// Split the remaining part by ':' to get event_type and identifier
	// Format: <event_type>:<identifier> (identifier may contain colons)
	parts := strings.SplitN(remaining, ":", 2)
	if len(parts) < 2 {
		return fmt.Errorf("d tag format invalid: expected org.attnprotocol:<event_type>:<identifier>, got '%s'", d_tag)
	}

	event_type := parts[0]
	identifier := parts[1]

	if event_type != expected_type {
		return fmt.Errorf("d tag event type mismatch: expected '%s', got '%s'", expected_type, event_type)
	}

	if identifier == "" {
		return fmt.Errorf("d tag identifier is empty")
	}

	return nil
}

// validateCoordinateFormat validates that coordinate follows format: kind:pubkey:org.attnprotocol:event_type:identifier
// For City Protocol events (38808), format is: kind:pubkey:org.cityprotocol:event_type:identifier
// For non-protocol events (e.g., video kind 34236), format is: kind:pubkey:d_tag (without org.attnprotocol:)
func validateCoordinateFormat(coordinate string, expected_kind int) error {
	parts := strings.Split(coordinate, ":")
	if len(parts) < 3 {
		return fmt.Errorf("coordinate format invalid: expected kind:pubkey:identifier")
	}

	// Parse kind from coordinate
	coord_kind, err := strconv.Atoi(parts[0])
	if err != nil {
		return fmt.Errorf("coordinate kind must be numeric: %s", parts[0])
	}

	if coord_kind != expected_kind {
		return fmt.Errorf("coordinate kind mismatch: expected %d, got %d", expected_kind, coord_kind)
	}

	// For City Protocol block events (38808), validate org.cityprotocol: prefix
	if coord_kind == 38808 {
		if len(parts) < 4 {
			return fmt.Errorf("City Protocol coordinate format invalid: expected kind:pubkey:org.cityprotocol:event_type:identifier")
		}
		if parts[2] != "org.cityprotocol" {
			return fmt.Errorf("City Protocol coordinate must include 'org.cityprotocol:' prefix")
		}
		if len(parts) < 5 {
			return fmt.Errorf("City Protocol coordinate format invalid: expected kind:pubkey:org.cityprotocol:event_type:identifier")
		}
		if parts[3] == "" {
			return fmt.Errorf("City Protocol coordinate event type is empty")
		}
		return nil
	}

	// For ATTN Protocol events (38188-38988), validate org.attnprotocol: prefix
	if coord_kind >= 38188 && coord_kind <= 38988 {
		if len(parts) < 4 {
			return fmt.Errorf("protocol coordinate format invalid: expected kind:pubkey:org.attnprotocol:event_type:identifier")
		}
		// parts[0] = kind, parts[1] = pubkey, parts[2] = org.attnprotocol, parts[3] = event_type, parts[4+] = identifier
		if parts[2] != "org.attnprotocol" {
			return fmt.Errorf("protocol coordinate must include 'org.attnprotocol:' prefix")
		}
		if len(parts) < 5 {
			return fmt.Errorf("protocol coordinate format invalid: expected kind:pubkey:org.attnprotocol:event_type:identifier")
		}
		// parts[3] should be the event type (marketplace, etc.)
		if parts[3] == "" {
			return fmt.Errorf("protocol coordinate event type is empty")
		}
	}

	return nil
}

// validateETagWithMarker validates that an e tag with the specified marker exists
func validateETagWithMarker(event *nostr.Event, marker string) bool {
	for _, tag := range event.Tags {
		if len(tag) >= 4 && tag[0] == "e" && tag[3] == marker {
			return true
		}
	}
	return false
}

// getETagByMarker gets the e tag value with the specified marker
func getETagByMarker(event *nostr.Event, marker string) string {
	for _, tag := range event.Tags {
		if len(tag) >= 4 && tag[0] == "e" && tag[3] == marker {
			return tag[1]
		}
	}
	return ""
}

// getTagValue gets the first value for a tag with the given name
func getTagValue(event *nostr.Event, tag_name string) string {
	for _, tag := range event.Tags {
		if len(tag) >= 2 && tag[0] == tag_name {
			return tag[1]
		}
	}
	return ""
}

// getTagValueByPrefix gets the first tag value that starts with the given prefix
func getTagValueByPrefix(event *nostr.Event, tag_name, prefix string) string {
	for _, tag := range event.Tags {
		if len(tag) >= 2 && tag[0] == tag_name && strings.HasPrefix(tag[1], prefix) {
			return tag[1]
		}
	}
	return ""
}

// getTagValues gets all values for tags with the given name
func getTagValues(event *nostr.Event, tag_name string) []string {
	var values []string
	for _, tag := range event.Tags {
		if len(tag) >= 2 && tag[0] == tag_name {
			values = append(values, tag[1])
		}
	}
	return values
}

// parseHeight parses a block height from various types
func parseHeight(value interface{}) (int64, error) {
	switch v := value.(type) {
	case float64:
		return int64(v), nil
	case string:
		return strconv.ParseInt(v, 10, 64)
	default:
		return 0, fmt.Errorf("unsupported height type")
	}
}

// hasListCoordinate checks if the event has an 'a' tag with a NIP-51 list coordinate
func hasListCoordinate(event *nostr.Event, suffix string) bool {
	for _, tag := range event.Tags {
		if len(tag) >= 2 && tag[0] == "a" && strings.HasPrefix(tag[1], "30000:") && strings.HasSuffix(tag[1], suffix) {
			return true
		}
	}
	return false
}

// validateOfficialTagsOnly validates that only official Nostr tags are used.
// ATTN-01 limits tags to official Nostr tags: d, t, a, e, p, r, k, u
// Block events (38808) only use d and p tags per CITY-01 specification.
func validateOfficialTagsOnly(event *nostr.Event) ValidationResult {
	allowed_tags := map[string]bool{
		"d": true, "t": true, "a": true, "e": true,
		"p": true, "r": true, "k": true, "u": true,
	}

	for _, tag := range event.Tags {
		if len(tag) > 0 {
			tag_name := tag[0]
			if !allowed_tags[tag_name] {
				return ValidationResult{
					Valid:   false,
					Message: fmt.Sprintf("Non-standard tag '%s' not allowed. Only official Nostr tags are permitted: d, t, a, e, p, r, k, u", tag_name),
				}
			}
		}
	}

	return ValidationResult{Valid: true, Message: "All tags are official Nostr tags"}
}

