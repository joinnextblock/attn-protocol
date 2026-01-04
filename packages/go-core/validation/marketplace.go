package validation

import (
	"encoding/json"
	"fmt"
	"strconv"

	"github.com/nbd-wtf/go-nostr"
)

// ValidateMarketplaceEvent validates Marketplace events (kind 38188).
// Validates required tags (d, t, a, k, p, r) and JSON content fields.
//
// Required content fields:
//   - name, description, admin_pubkey, min_duration, max_duration, match_fee_sats, confirmation_fee_sats
//   - ref_marketplace_pubkey, ref_marketplace_id, ref_clock_pubkey, ref_block_id
//
// Note: kind_list and relay_list are stored in k and r tags only, not in content.
//
// Returns a ValidationResult indicating if the event is valid.
func ValidateMarketplaceEvent(event *nostr.Event) ValidationResult {
	// Must have d tag (marketplace identifier)
	d_tag := getTagValue(event, "d")
	if d_tag == "" {
		return ValidationResult{Valid: false, Message: "Missing 'd' tag (marketplace identifier)"}
	}

	// Validate d tag format: org.attnprotocol:marketplace:<marketplace_id>
	if err := validateDTagFormat(38188, d_tag); err != nil {
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

	// Must have block coordinate a tag (format: 38808:clock_pubkey:org.cityprotocol:block:<height>:<hash>)
	block_coord := getTagValueByPrefix(event, "a", "38808:")
	if block_coord == "" {
		return ValidationResult{Valid: false, Message: "Missing block coordinate 'a' tag (format: 38808:clock_pubkey:org.cityprotocol:block:<height>:<hash>)"}
	}

	if err := validateCoordinateFormat(block_coord, 38808); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid block coordinate format: %s", err.Error())}
	}

	// Must have k tags (event kinds)
	k_tags := getTagValues(event, "k")
	if len(k_tags) == 0 {
		return ValidationResult{Valid: false, Message: "Missing required 'k' tags (event kinds)"}
	}

	// Must have p tags (marketplace_pubkey and clock_pubkey)
	p_tags := getTagValues(event, "p")
	if len(p_tags) < 2 {
		return ValidationResult{Valid: false, Message: "Missing required 'p' tags (marketplace_pubkey and clock_pubkey)"}
	}

	// Must have r tags (relay URLs)
	r_tags := getTagValues(event, "r")
	if len(r_tags) == 0 {
		return ValidationResult{Valid: false, Message: "Missing required 'r' tags (relay URLs)"}
	}

	// Content must be valid JSON
	var content_data map[string]interface{}
	if err := json.Unmarshal([]byte(event.Content), &content_data); err != nil {
		return ValidationResult{Valid: false, Message: "Content must be valid JSON"}
	}

	// Check for required fields in content (per ATTN-01.md)
	// Note: ref_clock_pubkey replaces ref_node_pubkey (block events now from City Protocol)
	required_fields := []string{"name", "description", "admin_pubkey", "min_duration", "max_duration", "match_fee_sats", "confirmation_fee_sats", "ref_marketplace_pubkey", "ref_marketplace_id", "ref_clock_pubkey", "ref_block_id"}
	for _, field := range required_fields {
		if _, ok := content_data[field]; !ok {
			return ValidationResult{Valid: false, Message: fmt.Sprintf("Content must include %s", field)}
		}
	}

	// Validate min_duration and max_duration
	if min_dur, ok := content_data["min_duration"].(float64); !ok || min_dur <= 0 {
		return ValidationResult{Valid: false, Message: "min_duration must be a positive number"}
	}
	if max_dur, ok := content_data["max_duration"].(float64); !ok || max_dur <= 0 {
		return ValidationResult{Valid: false, Message: "max_duration must be a positive number"}
	}
	if min_dur, max_dur := content_data["min_duration"].(float64), content_data["max_duration"].(float64); min_dur > max_dur {
		return ValidationResult{Valid: false, Message: "min_duration must be <= max_duration"}
	}

	// Validate fees are non-negative
	if match_fee, ok := content_data["match_fee_sats"].(float64); !ok || match_fee < 0 {
		return ValidationResult{Valid: false, Message: "match_fee_sats must be a non-negative number"}
	}
	if conf_fee, ok := content_data["confirmation_fee_sats"].(float64); !ok || conf_fee < 0 {
		return ValidationResult{Valid: false, Message: "confirmation_fee_sats must be a non-negative number"}
	}

	return ValidationResult{Valid: true, Message: "Valid marketplace event"}
}

