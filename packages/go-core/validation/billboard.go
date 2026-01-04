package validation

import (
	"encoding/json"
	"fmt"
	"strconv"

	"github.com/nbd-wtf/go-nostr"
)

// ValidateBillboardEvent validates Billboard events (kind 38288).
// Validates required tags (d, t, a, p, r, k, u) and JSON content fields.
//
// Required content fields:
//   - name, confirmation_fee_sats
//   - ref_billboard_pubkey, ref_billboard_id, ref_marketplace_pubkey, ref_marketplace_id
//
// Optional content fields:
//   - description
//
// Returns a ValidationResult indicating if the event is valid.
func ValidateBillboardEvent(event *nostr.Event) ValidationResult {
	// Must have d tag (billboard identifier)
	d_tag := getTagValue(event, "d")
	if d_tag == "" {
		return ValidationResult{Valid: false, Message: "Missing 'd' tag (billboard identifier)"}
	}

	// Validate d tag format: org.attnprotocol:billboard:<billboard_id>
	if err := validateDTagFormat(38288, d_tag); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid d tag format: %s", err.Error())}
	}

	// Must have t tag with block height (numeric)
	block_height := getTagValue(event, "t")
	if block_height == "" {
		return ValidationResult{Valid: false, Message: "Missing 't' tag (block height)"}
	}

	if _, err := strconv.Atoi(block_height); err != nil {
		return ValidationResult{Valid: false, Message: "Invalid block height in 't' tag: must be numeric"}
	}

	// Must reference a Marketplace via a tag (format: 38188:pubkey:org.attnprotocol:marketplace:id)
	marketplace_ref := getTagValueByPrefix(event, "a", "38188:")
	if marketplace_ref == "" {
		return ValidationResult{Valid: false, Message: "Must reference a Marketplace via 'a' tag (format: 38188:pubkey:org.attnprotocol:marketplace:id)"}
	}

	if err := validateCoordinateFormat(marketplace_ref, 38188); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid marketplace coordinate format: %s", err.Error())}
	}

	// Must have p tags (billboard_pubkey and marketplace_pubkey)
	p_tags := getTagValues(event, "p")
	if len(p_tags) < 2 {
		return ValidationResult{Valid: false, Message: "Missing required 'p' tags (billboard_pubkey and marketplace_pubkey)"}
	}

	// Must have r tags (relay URLs)
	r_tags := getTagValues(event, "r")
	if len(r_tags) == 0 {
		return ValidationResult{Valid: false, Message: "Missing required 'r' tags (relay URLs)"}
	}

	// Must have k tag (event kind)
	k_tag := getTagValue(event, "k")
	if k_tag == "" {
		return ValidationResult{Valid: false, Message: "Missing required 'k' tag (event kind)"}
	}

	// Must have u tag (URL)
	u_tag := getTagValue(event, "u")
	if u_tag == "" {
		return ValidationResult{Valid: false, Message: "Missing required 'u' tag (URL)"}
	}

	// Content must be valid JSON
	var content_data map[string]interface{}
	if err := json.Unmarshal([]byte(event.Content), &content_data); err != nil {
		return ValidationResult{Valid: false, Message: "Content must be valid JSON"}
	}

	// Check for required fields in content (per ATTN-01.md)
	// description is optional
	required_fields := []string{"name", "confirmation_fee_sats", "ref_billboard_pubkey", "ref_billboard_id", "ref_marketplace_pubkey", "ref_marketplace_id"}
	for _, field := range required_fields {
		if _, ok := content_data[field]; !ok {
			return ValidationResult{Valid: false, Message: fmt.Sprintf("Content must include %s", field)}
		}
	}

	// Validate confirmation_fee_sats is non-negative
	if conf_fee, ok := content_data["confirmation_fee_sats"].(float64); !ok || conf_fee < 0 {
		return ValidationResult{Valid: false, Message: "confirmation_fee_sats must be a non-negative number"}
	}

	return ValidationResult{Valid: true, Message: "Valid billboard event"}
}

