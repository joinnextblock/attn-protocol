package validation

import (
	"encoding/json"
	"fmt"
	"strconv"

	"github.com/nbd-wtf/go-nostr"
)

// ValidateAttentionEvent validates Attention events (kind 38488).
// Validates required tags (d, t, a, p, r, k) and JSON content fields.
//
// Required content fields:
//   - ask, min_duration, max_duration
//   - ref_attention_pubkey, ref_attention_id, ref_marketplace_pubkey, ref_marketplace_id
//   - blocked_promotions_id, blocked_promoters_id
//
// Optional content fields:
//   - trusted_marketplaces_id, trusted_billboards_id
//
// Note: kind_list and relay_list are stored in k and r tags only, not in content.
//
// Returns a ValidationResult indicating if the event is valid.
func ValidateAttentionEvent(event *nostr.Event) ValidationResult {
	// Must have d tag (attention identifier)
	d_tag := getTagValue(event, "d")
	if d_tag == "" {
		return ValidationResult{Valid: false, Message: "Missing 'd' tag (attention identifier)"}
	}

	// Validate d tag format: org.attnprotocol:attention:<attention_id>
	if err := validateDTagFormat(38488, d_tag); err != nil {
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

	// Must have marketplace coordinate via a tag (format: 38188:pubkey:org.attnprotocol:marketplace:id)
	marketplace_coord := getTagValueByPrefix(event, "a", "38188:")
	if marketplace_coord == "" {
		return ValidationResult{Valid: false, Message: "Missing marketplace coordinate 'a' tag (format: 38188:pubkey:org.attnprotocol:marketplace:id)"}
	}

	if err := validateCoordinateFormat(marketplace_coord, 38188); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid marketplace coordinate format: %s", err.Error())}
	}

	// Must include blocked promotions and blocked promoters list coordinates
	if !hasListCoordinate(event, "org.attnprotocol:promotion:blocked") {
		return ValidationResult{Valid: false, Message: "Missing blocked promotions coordinate 'a' tag (format: 30000:<pubkey>:org.attnprotocol:promotion:blocked)"}
	}
	if !hasListCoordinate(event, "org.attnprotocol:promoter:blocked") {
		return ValidationResult{Valid: false, Message: "Missing blocked promoters coordinate 'a' tag (format: 30000:<pubkey>:org.attnprotocol:promoter:blocked)"}
	}

	// Optional: trusted marketplaces and trusted billboards list coordinates
	// These are optional per spec - if present, validate format
	has_trusted_marketplaces := hasListCoordinate(event, "org.attnprotocol:marketplace:trusted")
	has_trusted_billboards := hasListCoordinate(event, "org.attnprotocol:billboard:trusted")

	// Must have p tags (attention_pubkey and marketplace_pubkey)
	p_tags := getTagValues(event, "p")
	if len(p_tags) < 2 {
		return ValidationResult{Valid: false, Message: "Missing required 'p' tags (attention_pubkey and marketplace_pubkey)"}
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
	required_fields := []string{"ask", "min_duration", "max_duration", "ref_attention_pubkey", "ref_attention_id", "ref_marketplace_pubkey", "ref_marketplace_id", "blocked_promotions_id", "blocked_promoters_id"}
	for _, field := range required_fields {
		if _, ok := content_data[field]; !ok {
			return ValidationResult{Valid: false, Message: fmt.Sprintf("Content must include %s", field)}
		}
	}

	// If trusted lists are present in tags, they should be in content
	if has_trusted_marketplaces {
		if _, ok := content_data["trusted_marketplaces_id"]; !ok {
			return ValidationResult{Valid: false, Message: "trusted_marketplaces_id must be present in content if trusted marketplaces coordinate is in tags"}
		}
	}
	if has_trusted_billboards {
		if _, ok := content_data["trusted_billboards_id"]; !ok {
			return ValidationResult{Valid: false, Message: "trusted_billboards_id must be present in content if trusted billboards coordinate is in tags"}
		}
	}

	// Validate ask is positive number
	if ask, ok := content_data["ask"].(float64); !ok || ask <= 0 {
		return ValidationResult{Valid: false, Message: "ask must be a positive number"}
	}

	// Validate durations are positive numbers
	if min_dur, ok := content_data["min_duration"].(float64); !ok || min_dur <= 0 {
		return ValidationResult{Valid: false, Message: "min_duration must be a positive number"}
	}
	if max_dur, ok := content_data["max_duration"].(float64); !ok || max_dur <= 0 {
		return ValidationResult{Valid: false, Message: "max_duration must be a positive number"}
	}
	if min_dur, max_dur := content_data["min_duration"].(float64), content_data["max_duration"].(float64); min_dur > max_dur {
		return ValidationResult{Valid: false, Message: "min_duration must be <= max_duration"}
	}

	return ValidationResult{Valid: true, Message: "Valid attention event"}
}

