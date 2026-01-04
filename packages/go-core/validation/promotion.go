package validation

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"github.com/nbd-wtf/go-nostr"
)

// ValidatePromotionEvent validates Promotion events (kind 38388).
// Validates required tags (d, t, a, p, r, k, u) and JSON content fields.
//
// Required content fields:
//   - duration, bid, event_id, call_to_action, call_to_action_url, escrow_id_list
//   - ref_promotion_pubkey, ref_promotion_id, ref_marketplace_pubkey, ref_marketplace_id, ref_billboard_pubkey, ref_billboard_id
//
// Returns a ValidationResult indicating if the event is valid.
func ValidatePromotionEvent(event *nostr.Event) ValidationResult {
	// Must have d tag (promotion identifier)
	d_tag := getTagValue(event, "d")
	if d_tag == "" {
		return ValidationResult{Valid: false, Message: "Missing 'd' tag (promotion identifier)"}
	}

	// Validate d tag format: org.attnprotocol:promotion:<promotion_id>
	if err := validateDTagFormat(38388, d_tag); err != nil {
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

	// Must reference a Video via a tag (format: 34236:pubkey:d_tag - no org.attnprotocol: prefix)
	video_ref := getTagValueByPrefix(event, "a", "34236:")
	if video_ref == "" {
		return ValidationResult{Valid: false, Message: "Must reference a Video via 'a' tag (format: 34236:pubkey:d_tag)"}
	}

	// Video coordinate should NOT have org.attnprotocol: prefix (it's not a protocol event)
	if strings.Contains(video_ref, "org.attnprotocol:") {
		return ValidationResult{Valid: false, Message: "Video coordinate should not include 'org.attnprotocol:' prefix (format: 34236:pubkey:d_tag)"}
	}

	// Must reference a Billboard via a tag (format: 38288:pubkey:org.attnprotocol:billboard:id)
	billboard_ref := getTagValueByPrefix(event, "a", "38288:")
	if billboard_ref == "" {
		return ValidationResult{Valid: false, Message: "Must reference a Billboard via 'a' tag (format: 38288:pubkey:org.attnprotocol:billboard:id)"}
	}

	if err := validateCoordinateFormat(billboard_ref, 38288); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid billboard coordinate format: %s", err.Error())}
	}

	// Must have p tags (marketplace_pubkey, billboard_pubkey, and promotion_pubkey)
	p_tags := getTagValues(event, "p")
	if len(p_tags) < 3 {
		return ValidationResult{Valid: false, Message: "Missing required 'p' tags (marketplace_pubkey, billboard_pubkey, and promotion_pubkey)"}
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
	required_fields := []string{"duration", "bid", "event_id", "call_to_action", "call_to_action_url", "escrow_id_list", "ref_promotion_pubkey", "ref_promotion_id", "ref_marketplace_pubkey", "ref_marketplace_id", "ref_billboard_pubkey", "ref_billboard_id"}
	for _, field := range required_fields {
		if _, ok := content_data[field]; !ok {
			return ValidationResult{Valid: false, Message: fmt.Sprintf("Content must include %s", field)}
		}
	}

	// Validate escrow_id_list is an array
	escrow_list, ok := content_data["escrow_id_list"]
	if !ok {
		return ValidationResult{Valid: false, Message: "escrow_id_list must be an array"}
	}
	if _, ok := escrow_list.([]interface{}); !ok {
		return ValidationResult{Valid: false, Message: "escrow_id_list must be an array"}
	}

	// Validate bid is positive number
	if bid, ok := content_data["bid"].(float64); !ok || bid <= 0 {
		return ValidationResult{Valid: false, Message: "bid must be a positive number"}
	}

	// Validate duration is positive number
	if duration, ok := content_data["duration"].(float64); !ok || duration <= 0 {
		return ValidationResult{Valid: false, Message: "duration must be a positive number"}
	}

	return ValidationResult{Valid: true, Message: "Valid promotion event"}
}

