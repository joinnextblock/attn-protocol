package validation

import (
	"encoding/json"
	"strings"

	"github.com/nbd-wtf/go-nostr"
)

// ValidateCityBlockEvent validates City Protocol Block events (kind 38808).
// Block events are defined by CITY-01 specification and published by Bitcoin node operators.
//
// Note: This is a minimal validation for ATTN Protocol relays that accept block events.
// For full validation, use city-protocol/packages/relay/pkg/validation.ValidateBlockEvent.
//
// Required tags:
//   - d: Block identifier (format: org.cityprotocol:block:<height>:<hash>)
//   - p: Clock pubkey (at least one)
//
// Required content fields:
//   - block_height: Numeric block height
//   - block_hash: Block hash string
//
// Parameters:
//   - event: The Nostr event to validate
//
// Returns a ValidationResult indicating if the event is valid and any error message.
func ValidateCityBlockEvent(event *nostr.Event) ValidationResult {
	// Must have d tag (block identifier)
	d_tag := getTagValue(event, "d")
	if d_tag == "" {
		return ValidationResult{Valid: false, Message: "Missing 'd' tag (block identifier)"}
	}

	// Validate d tag format: org.cityprotocol:block:<height>:<hash>
	if !strings.HasPrefix(d_tag, "org.cityprotocol:block:") {
		return ValidationResult{Valid: false, Message: "Invalid d tag format: must start with 'org.cityprotocol:block:'"}
	}

	// Must have p tag for clock pubkey
	p_tags := getTagValues(event, "p")
	if len(p_tags) == 0 {
		return ValidationResult{Valid: false, Message: "Missing required 'p' tag (clock_pubkey)"}
	}

	// Content must be valid JSON
	var content_data map[string]interface{}
	if err := json.Unmarshal([]byte(event.Content), &content_data); err != nil {
		return ValidationResult{Valid: false, Message: "Content must be valid JSON"}
	}

	// Must include block_height and block_hash fields (City Protocol format)
	block_height_value, ok := content_data["block_height"]
	if !ok {
		return ValidationResult{Valid: false, Message: "Block content missing 'block_height' field"}
	}
	if _, err := parseHeight(block_height_value); err != nil {
		return ValidationResult{Valid: false, Message: "Block content 'block_height' must be numeric"}
	}

	if _, ok := content_data["block_hash"].(string); !ok {
		return ValidationResult{Valid: false, Message: "Block content missing 'block_hash' field"}
	}

	return ValidationResult{Valid: true, Message: "Valid City Protocol block event"}
}

// ValidateBlockUpdateEvent is deprecated - use ValidateCityBlockEvent instead.
// Block events are now published by City Protocol (Kind 38808).
// Kept for backwards compatibility.
//
// Deprecated: Use ValidateCityBlockEvent instead.
func ValidateBlockUpdateEvent(event *nostr.Event) ValidationResult {
	return ValidateCityBlockEvent(event)
}

