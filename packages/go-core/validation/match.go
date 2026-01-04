package validation

import (
	"encoding/json"
	"fmt"
	"strconv"

	"github.com/nbd-wtf/go-nostr"
)

// ValidateMatchEvent validates Match events (kind 38888) per ATTN-01 specification.
// Validates required tags (d, t, a, p, r, k) and JSON content fields.
//
// Required tags:
//   - d: Match identifier (format: org.attnprotocol:match:<match_id>)
//   - t: Block height (numeric)
//   - a: Marketplace, Billboard, Promotion, and Attention coordinates (one each)
//   - p: At least 4 pubkeys (marketplace_pubkey, promotion_pubkey, attention_pubkey, billboard_pubkey)
//   - r: Relay URLs (at least one)
//   - k: Event kinds (at least one)
//
// Required content fields (all ref_* fields):
//   - ref_match_id, ref_promotion_id, ref_attention_id, ref_billboard_id
//   - ref_marketplace_id, ref_marketplace_pubkey, ref_promotion_pubkey
//   - ref_attention_pubkey, ref_billboard_pubkey
//
// Parameters:
//   - event: The Nostr event to validate
//
// Returns a ValidationResult indicating if the event is valid and any error message.
func ValidateMatchEvent(event *nostr.Event) ValidationResult {
	// Must have d tag (match identifier)
	d_tag := getTagValue(event, "d")
	if d_tag == "" {
		return ValidationResult{Valid: false, Message: "Missing 'd' tag (match identifier)"}
	}

	// Validate d tag format: org.attnprotocol:match:<match_id>
	if err := validateDTagFormat(38888, d_tag); err != nil {
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

	// Must reference Marketplace, Billboard, Promotion, Attention via a tags
	marketplace_ref := getTagValueByPrefix(event, "a", "38188:")
	if marketplace_ref == "" {
		return ValidationResult{Valid: false, Message: "Must reference a Marketplace via 'a' tag (format: 38188:pubkey:org.attnprotocol:marketplace:id)"}
	}
	if err := validateCoordinateFormat(marketplace_ref, 38188); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid marketplace coordinate format: %s", err.Error())}
	}

	billboard_ref := getTagValueByPrefix(event, "a", "38288:")
	if billboard_ref == "" {
		return ValidationResult{Valid: false, Message: "Must reference a Billboard via 'a' tag (format: 38288:pubkey:org.attnprotocol:billboard:id)"}
	}
	if err := validateCoordinateFormat(billboard_ref, 38288); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid billboard coordinate format: %s", err.Error())}
	}

	promotion_ref := getTagValueByPrefix(event, "a", "38388:")
	if promotion_ref == "" {
		return ValidationResult{Valid: false, Message: "Must reference a Promotion via 'a' tag (format: 38388:pubkey:org.attnprotocol:promotion:id)"}
	}
	if err := validateCoordinateFormat(promotion_ref, 38388); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid promotion coordinate format: %s", err.Error())}
	}

	attention_ref := getTagValueByPrefix(event, "a", "38488:")
	if attention_ref == "" {
		return ValidationResult{Valid: false, Message: "Must reference an Attention via 'a' tag (format: 38488:pubkey:org.attnprotocol:attention:id)"}
	}
	if err := validateCoordinateFormat(attention_ref, 38488); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid attention coordinate format: %s", err.Error())}
	}

	// Must have p tags (marketplace_pubkey, promotion_pubkey, attention_pubkey, billboard_pubkey)
	p_tags := getTagValues(event, "p")
	if len(p_tags) < 4 {
		return ValidationResult{Valid: false, Message: "Missing required 'p' tags (marketplace_pubkey, promotion_pubkey, attention_pubkey, billboard_pubkey)"}
	}

	// Must have r tags (relay URLs)
	r_tags := getTagValues(event, "r")
	if len(r_tags) == 0 {
		return ValidationResult{Valid: false, Message: "Missing required 'r' tags (relay URLs)"}
	}

	// Must have k tags (event kinds)
	k_tags := getTagValues(event, "k")
	if len(k_tags) == 0 {
		return ValidationResult{Valid: false, Message: "Missing required 'k' tags (event kinds)"}
	}

	// Content must be valid JSON
	var content_data map[string]interface{}
	if err := json.Unmarshal([]byte(event.Content), &content_data); err != nil {
		return ValidationResult{Valid: false, Message: "Content must be valid JSON"}
	}

	// Check for required fields in content (per ATTN-01.md)
	// MATCH events contain only reference fields (ref_ prefix)
	required_fields := []string{"ref_match_id", "ref_promotion_id", "ref_attention_id", "ref_billboard_id", "ref_marketplace_id", "ref_marketplace_pubkey", "ref_promotion_pubkey", "ref_attention_pubkey", "ref_billboard_pubkey"}
	for _, field := range required_fields {
		if _, ok := content_data[field]; !ok {
			return ValidationResult{Valid: false, Message: fmt.Sprintf("Content must include %s", field)}
		}
	}

	return ValidationResult{Valid: true, Message: "Valid match event"}
}

