package validation

import (
	"encoding/json"
	"fmt"
	"strconv"

	"github.com/nbd-wtf/go-nostr"
)

// ValidateBillboardConfirmationEvent validates Billboard Confirmation events (kind 38588) per ATTN-01 specification.
// Validates required tags (d, t, a, e, p, r) and JSON content fields.
//
// Required tags:
//   - d: Confirmation identifier (format: org.attnprotocol:billboard-confirmation:<confirmation_id>)
//   - t: Block height (numeric)
//   - a: Marketplace, Billboard, Promotion, Attention, and Match coordinates (one each)
//   - e: At least 5 event references (marketplace, billboard, promotion, attention, match events) with "match" marker
//   - p: At least 4 pubkeys (marketplace_pubkey, promotion_pubkey, attention_pubkey, billboard_pubkey)
//   - r: Relay URLs (at least one)
//
// Required content fields (all ref_* fields):
//   - ref_match_event_id, ref_match_id
//   - ref_marketplace_pubkey, ref_billboard_pubkey, ref_promotion_pubkey, ref_attention_pubkey
//   - ref_marketplace_id, ref_billboard_id, ref_promotion_id, ref_attention_id
//
// Parameters:
//   - event: The Nostr event to validate
//
// Returns a ValidationResult indicating if the event is valid and any error message.
func ValidateBillboardConfirmationEvent(event *nostr.Event) ValidationResult {
	// Must have d tag (confirmation identifier)
	d_tag := getTagValue(event, "d")
	if d_tag == "" {
		return ValidationResult{Valid: false, Message: "Missing 'd' tag (confirmation identifier)"}
	}

	// Validate d tag format: org.attnprotocol:billboard-confirmation:<confirmation_id>
	if err := validateDTagFormat(38588, d_tag); err != nil {
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

	// Must have a tags for marketplace, billboard, promotion, attention, and match coordinates
	marketplace_coord := getTagValueByPrefix(event, "a", "38188:")
	if marketplace_coord == "" {
		return ValidationResult{Valid: false, Message: "Missing marketplace coordinate 'a' tag (format: 38188:pubkey:org.attnprotocol:marketplace:id)"}
	}
	if err := validateCoordinateFormat(marketplace_coord, 38188); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid marketplace coordinate format: %s", err.Error())}
	}

	billboard_coord := getTagValueByPrefix(event, "a", "38288:")
	if billboard_coord == "" {
		return ValidationResult{Valid: false, Message: "Missing billboard coordinate 'a' tag (format: 38288:pubkey:org.attnprotocol:billboard:id)"}
	}
	if err := validateCoordinateFormat(billboard_coord, 38288); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid billboard coordinate format: %s", err.Error())}
	}

	promotion_coord := getTagValueByPrefix(event, "a", "38388:")
	if promotion_coord == "" {
		return ValidationResult{Valid: false, Message: "Missing promotion coordinate 'a' tag (format: 38388:pubkey:org.attnprotocol:promotion:id)"}
	}
	if err := validateCoordinateFormat(promotion_coord, 38388); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid promotion coordinate format: %s", err.Error())}
	}

	attention_coord := getTagValueByPrefix(event, "a", "38488:")
	if attention_coord == "" {
		return ValidationResult{Valid: false, Message: "Missing attention coordinate 'a' tag (format: 38488:pubkey:org.attnprotocol:attention:id)"}
	}
	if err := validateCoordinateFormat(attention_coord, 38488); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid attention coordinate format: %s", err.Error())}
	}

	match_coord := getTagValueByPrefix(event, "a", "38888:")
	if match_coord == "" {
		return ValidationResult{Valid: false, Message: "Missing match coordinate 'a' tag (format: 38888:pubkey:org.attnprotocol:match:id)"}
	}
	if err := validateCoordinateFormat(match_coord, 38888); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid match coordinate format: %s", err.Error())}
	}

	// Must have e tag with "match" marker
	if !validateETagWithMarker(event, "match") {
		return ValidationResult{Valid: false, Message: "Missing 'e' tag with 'match' marker"}
	}

	// Must have e tags referencing marketplace, billboard, promotion, attention, and match events
	e_tags := getTagValues(event, "e")
	if len(e_tags) < 5 {
		return ValidationResult{Valid: false, Message: "Missing required 'e' tags (must reference marketplace, billboard, promotion, attention, and match events)"}
	}

	// Must have p tags for all pubkeys (marketplace, promotion, attention, billboard)
	p_tags := getTagValues(event, "p")
	if len(p_tags) < 4 {
		return ValidationResult{Valid: false, Message: "Missing required 'p' tags (marketplace_pubkey, promotion_pubkey, attention_pubkey, billboard_pubkey)"}
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

	// Check for required fields in content (per ATTN-01.md) - all ref_ fields
	required_fields := []string{"ref_match_event_id", "ref_match_id", "ref_marketplace_pubkey", "ref_billboard_pubkey", "ref_promotion_pubkey", "ref_attention_pubkey", "ref_marketplace_id", "ref_billboard_id", "ref_promotion_id", "ref_attention_id"}
	for _, field := range required_fields {
		if _, ok := content_data[field]; !ok {
			return ValidationResult{Valid: false, Message: fmt.Sprintf("Content must include %s", field)}
		}
	}

	return ValidationResult{Valid: true, Message: "Valid billboard confirmation event"}
}

// ValidateAttentionConfirmationEvent validates Attention Confirmation events (kind 38688) per ATTN-01 specification.
// Validates required tags (d, t, a, e, p, r) and JSON content fields.
//
// Required tags:
//   - d: Confirmation identifier (format: org.attnprotocol:attention-confirmation:<confirmation_id>)
//   - t: Block height (numeric)
//   - a: Marketplace, Billboard, Promotion, Attention, and Match coordinates (one each)
//   - e: At least 5 event references (marketplace, billboard, promotion, attention, match events) with "match" marker
//   - p: At least 4 pubkeys (marketplace_pubkey, promotion_pubkey, attention_pubkey, billboard_pubkey)
//   - r: Relay URLs (at least one)
//
// Required content fields (all ref_* fields):
//   - ref_match_event_id, ref_match_id
//   - ref_marketplace_pubkey, ref_billboard_pubkey, ref_promotion_pubkey, ref_attention_pubkey
//   - ref_marketplace_id, ref_billboard_id, ref_promotion_id, ref_attention_id
//
// Parameters:
//   - event: The Nostr event to validate
//
// Returns a ValidationResult indicating if the event is valid and any error message.
func ValidateAttentionConfirmationEvent(event *nostr.Event) ValidationResult {
	// Must have d tag (confirmation identifier)
	d_tag := getTagValue(event, "d")
	if d_tag == "" {
		return ValidationResult{Valid: false, Message: "Missing 'd' tag (confirmation identifier)"}
	}

	// Validate d tag format: org.attnprotocol:attention-confirmation:<confirmation_id>
	if err := validateDTagFormat(38688, d_tag); err != nil {
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

	// Must have a tags for marketplace, billboard, promotion, attention, and match coordinates
	marketplace_coord := getTagValueByPrefix(event, "a", "38188:")
	if marketplace_coord == "" {
		return ValidationResult{Valid: false, Message: "Missing marketplace coordinate 'a' tag (format: 38188:pubkey:org.attnprotocol:marketplace:id)"}
	}
	if err := validateCoordinateFormat(marketplace_coord, 38188); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid marketplace coordinate format: %s", err.Error())}
	}

	billboard_coord := getTagValueByPrefix(event, "a", "38288:")
	if billboard_coord == "" {
		return ValidationResult{Valid: false, Message: "Missing billboard coordinate 'a' tag (format: 38288:pubkey:org.attnprotocol:billboard:id)"}
	}
	if err := validateCoordinateFormat(billboard_coord, 38288); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid billboard coordinate format: %s", err.Error())}
	}

	promotion_coord := getTagValueByPrefix(event, "a", "38388:")
	if promotion_coord == "" {
		return ValidationResult{Valid: false, Message: "Missing promotion coordinate 'a' tag (format: 38388:pubkey:org.attnprotocol:promotion:id)"}
	}
	if err := validateCoordinateFormat(promotion_coord, 38388); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid promotion coordinate format: %s", err.Error())}
	}

	attention_coord := getTagValueByPrefix(event, "a", "38488:")
	if attention_coord == "" {
		return ValidationResult{Valid: false, Message: "Missing attention coordinate 'a' tag (format: 38488:pubkey:org.attnprotocol:attention:id)"}
	}
	if err := validateCoordinateFormat(attention_coord, 38488); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid attention coordinate format: %s", err.Error())}
	}

	match_coord := getTagValueByPrefix(event, "a", "38888:")
	if match_coord == "" {
		return ValidationResult{Valid: false, Message: "Missing match coordinate 'a' tag (format: 38888:pubkey:org.attnprotocol:match:id)"}
	}
	if err := validateCoordinateFormat(match_coord, 38888); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid match coordinate format: %s", err.Error())}
	}

	// Must have e tag with "match" marker
	if !validateETagWithMarker(event, "match") {
		return ValidationResult{Valid: false, Message: "Missing 'e' tag with 'match' marker"}
	}

	// Must have e tags referencing marketplace, billboard, promotion, attention, and match events
	e_tags := getTagValues(event, "e")
	if len(e_tags) < 5 {
		return ValidationResult{Valid: false, Message: "Missing required 'e' tags (must reference marketplace, billboard, promotion, attention, and match events)"}
	}

	// Must have p tags for all pubkeys (marketplace, promotion, attention, billboard)
	p_tags := getTagValues(event, "p")
	if len(p_tags) < 4 {
		return ValidationResult{Valid: false, Message: "Missing required 'p' tags (marketplace_pubkey, promotion_pubkey, attention_pubkey, billboard_pubkey)"}
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

	// Check for required fields in content (per ATTN-01.md) - all ref_ fields
	required_fields := []string{"ref_match_event_id", "ref_match_id", "ref_marketplace_pubkey", "ref_billboard_pubkey", "ref_promotion_pubkey", "ref_attention_pubkey", "ref_marketplace_id", "ref_billboard_id", "ref_promotion_id", "ref_attention_id"}
	for _, field := range required_fields {
		if _, ok := content_data[field]; !ok {
			return ValidationResult{Valid: false, Message: fmt.Sprintf("Content must include %s", field)}
		}
	}

	return ValidationResult{Valid: true, Message: "Valid attention confirmation event"}
}

// ValidateMarketplaceConfirmationEvent validates Marketplace Confirmation events (kind 38788) per ATTN-01 specification.
// Validates required tags (d, t, a, e, p, r) and JSON content fields.
//
// Required tags:
//   - d: Confirmation identifier (format: org.attnprotocol:marketplace-confirmation:<confirmation_id>)
//   - t: Block height (numeric)
//   - a: Marketplace, Billboard, Promotion, Attention, and Match coordinates (one each)
//   - e: At least 7 event references with markers:
//   - "match" marker
//   - "billboard_confirmation" marker
//   - "attention_confirmation" marker
//   - References to marketplace, billboard, promotion, attention, match, billboard_confirmation, and attention_confirmation events
//   - p: At least 4 pubkeys (marketplace_pubkey, promotion_pubkey, attention_pubkey, billboard_pubkey)
//   - r: Relay URLs (at least one)
//
// Required content fields (all ref_* fields):
//   - ref_match_event_id, ref_match_id
//   - ref_billboard_confirmation_event_id, ref_attention_confirmation_event_id
//   - ref_marketplace_pubkey, ref_billboard_pubkey, ref_promotion_pubkey, ref_attention_pubkey
//   - ref_marketplace_id, ref_billboard_id, ref_promotion_id, ref_attention_id
//
// Parameters:
//   - event: The Nostr event to validate
//
// Returns a ValidationResult indicating if the event is valid and any error message.
func ValidateMarketplaceConfirmationEvent(event *nostr.Event) ValidationResult {
	// Must have d tag (confirmation identifier)
	d_tag := getTagValue(event, "d")
	if d_tag == "" {
		return ValidationResult{Valid: false, Message: "Missing 'd' tag (confirmation identifier)"}
	}

	// Validate d tag format: org.attnprotocol:marketplace-confirmation:<confirmation_id>
	if err := validateDTagFormat(38788, d_tag); err != nil {
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

	// Must have a tags for marketplace, billboard, promotion, attention, and match coordinates
	marketplace_coord := getTagValueByPrefix(event, "a", "38188:")
	if marketplace_coord == "" {
		return ValidationResult{Valid: false, Message: "Missing marketplace coordinate 'a' tag (format: 38188:pubkey:org.attnprotocol:marketplace:id)"}
	}
	if err := validateCoordinateFormat(marketplace_coord, 38188); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid marketplace coordinate format: %s", err.Error())}
	}

	billboard_coord := getTagValueByPrefix(event, "a", "38288:")
	if billboard_coord == "" {
		return ValidationResult{Valid: false, Message: "Missing billboard coordinate 'a' tag (format: 38288:pubkey:org.attnprotocol:billboard:id)"}
	}
	if err := validateCoordinateFormat(billboard_coord, 38288); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid billboard coordinate format: %s", err.Error())}
	}

	promotion_coord := getTagValueByPrefix(event, "a", "38388:")
	if promotion_coord == "" {
		return ValidationResult{Valid: false, Message: "Missing promotion coordinate 'a' tag (format: 38388:pubkey:org.attnprotocol:promotion:id)"}
	}
	if err := validateCoordinateFormat(promotion_coord, 38388); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid promotion coordinate format: %s", err.Error())}
	}

	attention_coord := getTagValueByPrefix(event, "a", "38488:")
	if attention_coord == "" {
		return ValidationResult{Valid: false, Message: "Missing attention coordinate 'a' tag (format: 38488:pubkey:org.attnprotocol:attention:id)"}
	}
	if err := validateCoordinateFormat(attention_coord, 38488); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid attention coordinate format: %s", err.Error())}
	}

	match_coord := getTagValueByPrefix(event, "a", "38888:")
	if match_coord == "" {
		return ValidationResult{Valid: false, Message: "Missing match coordinate 'a' tag (format: 38888:pubkey:org.attnprotocol:match:id)"}
	}
	if err := validateCoordinateFormat(match_coord, 38888); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid match coordinate format: %s", err.Error())}
	}

	// Must have e tag with "match" marker
	if !validateETagWithMarker(event, "match") {
		return ValidationResult{Valid: false, Message: "Missing 'e' tag with 'match' marker"}
	}

	// Must have e tag with "billboard_confirmation" marker
	if !validateETagWithMarker(event, "billboard_confirmation") {
		return ValidationResult{Valid: false, Message: "Missing 'e' tag with 'billboard_confirmation' marker"}
	}

	// Must have e tag with "attention_confirmation" marker
	if !validateETagWithMarker(event, "attention_confirmation") {
		return ValidationResult{Valid: false, Message: "Missing 'e' tag with 'attention_confirmation' marker"}
	}

	// Must have e tags referencing marketplace, billboard, promotion, attention, match, billboard_confirmation, and attention_confirmation events
	e_tags := getTagValues(event, "e")
	if len(e_tags) < 7 {
		return ValidationResult{Valid: false, Message: "Missing required 'e' tags (must reference marketplace, billboard, promotion, attention, match, billboard_confirmation, and attention_confirmation events)"}
	}

	// Must have p tags for all pubkeys (marketplace, promotion, attention, billboard)
	p_tags := getTagValues(event, "p")
	if len(p_tags) < 4 {
		return ValidationResult{Valid: false, Message: "Missing required 'p' tags (marketplace_pubkey, promotion_pubkey, attention_pubkey, billboard_pubkey)"}
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

	// Check for required fields in content (per ATTN-01.md) - all ref_ fields
	required_fields := []string{"ref_match_event_id", "ref_match_id", "ref_billboard_confirmation_event_id", "ref_attention_confirmation_event_id", "ref_marketplace_pubkey", "ref_billboard_pubkey", "ref_promotion_pubkey", "ref_attention_pubkey", "ref_marketplace_id", "ref_billboard_id", "ref_promotion_id", "ref_attention_id"}
	for _, field := range required_fields {
		if _, ok := content_data[field]; !ok {
			return ValidationResult{Valid: false, Message: fmt.Sprintf("Content must include %s", field)}
		}
	}

	return ValidationResult{Valid: true, Message: "Valid marketplace confirmation event"}
}

// ValidateAttentionPaymentConfirmationEvent validates Attention Payment Confirmation events (kind 38988) per ATTN-01 specification.
// Validates required tags (d, t, a, e, p, r) and JSON content fields.
//
// Required tags:
//   - d: Confirmation identifier (format: org.attnprotocol:attention-payment-confirmation:<confirmation_id>)
//   - t: Block height (numeric)
//   - a: Marketplace, Billboard, Promotion, Attention, and Match coordinates (one each)
//   - e: Event reference with "marketplace_confirmation" marker
//   - p: At least 4 pubkeys (marketplace_pubkey, promotion_pubkey, attention_pubkey, billboard_pubkey)
//   - r: Relay URLs (at least one)
//
// Required content fields:
//   - sats_received: Positive number (payment amount)
//   - ref_match_event_id, ref_match_id
//   - ref_marketplace_confirmation_event_id
//   - ref_marketplace_pubkey, ref_billboard_pubkey, ref_promotion_pubkey, ref_attention_pubkey
//   - ref_marketplace_id, ref_billboard_id, ref_promotion_id, ref_attention_id
//   - payment_proof: Optional payment proof field
//
// Parameters:
//   - event: The Nostr event to validate
//
// Returns a ValidationResult indicating if the event is valid and any error message.
func ValidateAttentionPaymentConfirmationEvent(event *nostr.Event) ValidationResult {
	// Must have d tag (confirmation identifier)
	d_tag := getTagValue(event, "d")
	if d_tag == "" {
		return ValidationResult{Valid: false, Message: "Missing 'd' tag (confirmation identifier)"}
	}

	// Validate d tag format: org.attnprotocol:attention-payment-confirmation:<confirmation_id>
	if err := validateDTagFormat(38988, d_tag); err != nil {
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

	// Must have e tag with "marketplace_confirmation" marker
	if !validateETagWithMarker(event, "marketplace_confirmation") {
		return ValidationResult{Valid: false, Message: "Missing 'e' tag with 'marketplace_confirmation' marker"}
	}

	// Must have a tags for marketplace, billboard, promotion, attention, and match coordinates
	marketplace_coord := getTagValueByPrefix(event, "a", "38188:")
	if marketplace_coord == "" {
		return ValidationResult{Valid: false, Message: "Missing marketplace coordinate 'a' tag (format: 38188:pubkey:org.attnprotocol:marketplace:id)"}
	}
	if err := validateCoordinateFormat(marketplace_coord, 38188); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid marketplace coordinate format: %s", err.Error())}
	}

	billboard_coord := getTagValueByPrefix(event, "a", "38288:")
	if billboard_coord == "" {
		return ValidationResult{Valid: false, Message: "Missing billboard coordinate 'a' tag (format: 38288:pubkey:org.attnprotocol:billboard:id)"}
	}
	if err := validateCoordinateFormat(billboard_coord, 38288); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid billboard coordinate format: %s", err.Error())}
	}

	promotion_coord := getTagValueByPrefix(event, "a", "38388:")
	if promotion_coord == "" {
		return ValidationResult{Valid: false, Message: "Missing promotion coordinate 'a' tag (format: 38388:pubkey:org.attnprotocol:promotion:id)"}
	}
	if err := validateCoordinateFormat(promotion_coord, 38388); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid promotion coordinate format: %s", err.Error())}
	}

	attention_coord := getTagValueByPrefix(event, "a", "38488:")
	if attention_coord == "" {
		return ValidationResult{Valid: false, Message: "Missing attention coordinate 'a' tag (format: 38488:pubkey:org.attnprotocol:attention:id)"}
	}
	if err := validateCoordinateFormat(attention_coord, 38488); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid attention coordinate format: %s", err.Error())}
	}

	match_coord := getTagValueByPrefix(event, "a", "38888:")
	if match_coord == "" {
		return ValidationResult{Valid: false, Message: "Missing match coordinate 'a' tag (format: 38888:pubkey:org.attnprotocol:match:id)"}
	}
	if err := validateCoordinateFormat(match_coord, 38888); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid match coordinate format: %s", err.Error())}
	}

	// Must have p tags for all pubkeys (marketplace, promotion, attention, billboard)
	p_tags := getTagValues(event, "p")
	if len(p_tags) < 4 {
		return ValidationResult{Valid: false, Message: "Missing required 'p' tags (marketplace_pubkey, promotion_pubkey, attention_pubkey, billboard_pubkey)"}
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
	// Payment fields (no prefix): sats_received, payment_proof (optional)
	// Reference fields (ref_ prefix): all ref_* fields
	required_fields := []string{"sats_received", "ref_match_event_id", "ref_match_id", "ref_marketplace_confirmation_event_id", "ref_marketplace_pubkey", "ref_billboard_pubkey", "ref_promotion_pubkey", "ref_attention_pubkey", "ref_marketplace_id", "ref_billboard_id", "ref_promotion_id", "ref_attention_id"}
	for _, field := range required_fields {
		if _, ok := content_data[field]; !ok {
			return ValidationResult{Valid: false, Message: fmt.Sprintf("Content must include %s", field)}
		}
	}

	// Validate sats_received is positive number
	if sats_received, ok := content_data["sats_received"].(float64); !ok || sats_received <= 0 {
		return ValidationResult{Valid: false, Message: "sats_received must be a positive number"}
	}

	return ValidationResult{Valid: true, Message: "Valid attention payment confirmation event"}
}

