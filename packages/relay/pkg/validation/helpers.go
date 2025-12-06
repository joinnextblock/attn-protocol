// Package validation provides event validation for ATTN Protocol events.
// It validates custom event kinds (Marketplace, Billboard, Promotion, Attention, Match, etc.)
// according to the ATTN-01 specification, checking required tags and JSON content fields.
package validation

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"github.com/nbd-wtf/go-nostr"

	"github.com/joinnextblock/attn-protocol/relay/pkg/logger"
)

// ValidationResult represents the result of event validation.
// It indicates whether an event is valid and provides an error message if invalid.
type ValidationResult struct {
	Valid   bool
	Message string
}

// ValidateEvent validates an event based on its kind.
// Routes to specific validation functions for custom event kinds:
//   - 38188: Marketplace events
//   - 38288: Billboard events
//   - 38388: Promotion events
//   - 38488: Attention events
//   - 38588: Billboard confirmation events
//   - 38688: Viewer confirmation events
//   - 38788: Marketplace confirmation events
//   - 38888: Match events
//   - 38088: Block events
//   - Other: Standard Nostr events (always valid)
//
// Parameters:
//   - event: The Nostr event to validate
//
// Returns a ValidationResult indicating if the event is valid and any error message.
func ValidateEvent(event *nostr.Event) ValidationResult {
	logger.Debug().
		Str("event_id", event.ID).
		Int("kind", event.Kind).
		Str("pubkey", event.PubKey).
		Msg("Validating event")

	// For ATTN Protocol events, validate that only official Nostr tags are used
	attnProtocolKinds := map[int]bool{
		38088: true, 38188: true, 38288: true, 38388: true, 38488: true,
		38588: true, 38688: true, 38788: true, 38888: true, 38988: true,
	}
	if attnProtocolKinds[event.Kind] {
		if tagResult := validateOfficialTagsOnly(event); !tagResult.Valid {
			return tagResult
		}
	}

	var result ValidationResult
	switch event.Kind {
	case 38188:
		result = ValidateMarketplaceEvent(event)
	case 38288:
		result = ValidateBillboardEvent(event)
	case 38388:
		result = ValidatePromotionEvent(event)
	case 38488:
		result = ValidateAttentionEvent(event)
	case 38588:
		result = ValidateBillboardConfirmationEvent(event)
	case 38688:
		result = ValidateAttentionConfirmationEvent(event)
	case 38788:
		result = ValidateMarketplaceConfirmationEvent(event)
	case 38888:
		result = ValidateMatchEvent(event)
	case 38088:
		result = ValidateBlockUpdateEvent(event)
	case 38988:
		result = ValidateAttentionPaymentConfirmationEvent(event)
	default:
		result = ValidationResult{Valid: true, Message: "Standard event kind"}
	}

	logger.Debug().
		Str("event_id", event.ID).
		Int("kind", event.Kind).
		Bool("valid", result.Valid).
		Str("message", result.Message).
		Msg("Event validation completed")

	return result
}

// ValidateAttentionEvent validates Attention events (kind 38488).
// Validates required tags (d, t, a, p, r, k) and JSON content fields.
//
// Required content fields:
//   - ask, min_duration, max_duration
//   - ref_attention_pubkey, ref_attention_id, ref_marketplace_pubkey, ref_marketplace_id
//   - blocked_promotions_id, blocked_promoters_id
// Optional content fields:
//   - trusted_marketplaces_id, trusted_billboards_id
// Note: kind_list and relay_list are stored in k and r tags only, not in content.
//
// Returns a ValidationResult indicating if the event is valid.
func ValidateAttentionEvent(event *nostr.Event) ValidationResult {
	// Must have d tag (attention identifier)
	dTag := getTagValue(event, "d")
	if dTag == "" {
		return ValidationResult{Valid: false, Message: "Missing 'd' tag (attention identifier)"}
	}

	// Validate d tag format: org.attnprotocol:attention:<attention_id>
	if err := validateDTagFormat(38488, dTag); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid d tag format: %s", err.Error())}
	}

	// Must have t tag with block height (numeric)
	blockHeight := getTagValue(event, "t")
	if blockHeight == "" {
		return ValidationResult{Valid: false, Message: "Missing 't' tag (block height)"}
	}

	if _, err := strconv.Atoi(blockHeight); err != nil {
		return ValidationResult{Valid: false, Message: "Invalid block height in 't' tag: must be numeric"}
	}

	// Must have marketplace coordinate via a tag (format: 38188:pubkey:org.attnprotocol:marketplace:id)
	marketplaceCoord := getTagValueByPrefix(event, "a", "38188:")
	if marketplaceCoord == "" {
		return ValidationResult{Valid: false, Message: "Missing marketplace coordinate 'a' tag (format: 38188:pubkey:org.attnprotocol:marketplace:id)"}
	}

	if err := validateCoordinateFormat(marketplaceCoord, 38188); err != nil {
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
	hasTrustedMarketplaces := hasListCoordinate(event, "org.attnprotocol:marketplace:trusted")
	hasTrustedBillboards := hasListCoordinate(event, "org.attnprotocol:billboard:trusted")

	// Must have p tags (attention_pubkey and marketplace_pubkey)
	pTags := getTagValues(event, "p")
	if len(pTags) < 2 {
		return ValidationResult{Valid: false, Message: "Missing required 'p' tags (attention_pubkey and marketplace_pubkey)"}
	}

	// Must have r tags (relay URLs)
	rTags := getTagValues(event, "r")
	if len(rTags) == 0 {
		return ValidationResult{Valid: false, Message: "Missing required 'r' tags (relay URLs)"}
	}

	// Must have k tags (event kinds)
	kTags := getTagValues(event, "k")
	if len(kTags) == 0 {
		return ValidationResult{Valid: false, Message: "Missing required 'k' tags (event kinds)"}
	}

	// Content must be valid JSON
	var contentData map[string]interface{}
	if err := json.Unmarshal([]byte(event.Content), &contentData); err != nil {
		return ValidationResult{Valid: false, Message: "Content must be valid JSON"}
	}

	// Check for required fields in content (per ATTN-01.md)
	requiredFields := []string{"ask", "min_duration", "max_duration", "ref_attention_pubkey", "ref_attention_id", "ref_marketplace_pubkey", "ref_marketplace_id", "blocked_promotions_id", "blocked_promoters_id"}
	for _, field := range requiredFields {
		if _, ok := contentData[field]; !ok {
			return ValidationResult{Valid: false, Message: fmt.Sprintf("Content must include %s", field)}
		}
	}

	// If trusted lists are present in tags, they should be in content
	if hasTrustedMarketplaces {
		if _, ok := contentData["trusted_marketplaces_id"]; !ok {
			return ValidationResult{Valid: false, Message: "trusted_marketplaces_id must be present in content if trusted marketplaces coordinate is in tags"}
		}
	}
	if hasTrustedBillboards {
		if _, ok := contentData["trusted_billboards_id"]; !ok {
			return ValidationResult{Valid: false, Message: "trusted_billboards_id must be present in content if trusted billboards coordinate is in tags"}
		}
	}

	// Validate ask is positive number
	if ask, ok := contentData["ask"].(float64); !ok || ask <= 0 {
		return ValidationResult{Valid: false, Message: "ask must be a positive number"}
	}

	// Validate durations are positive numbers
	if minDur, ok := contentData["min_duration"].(float64); !ok || minDur <= 0 {
		return ValidationResult{Valid: false, Message: "min_duration must be a positive number"}
	}
	if maxDur, ok := contentData["max_duration"].(float64); !ok || maxDur <= 0 {
		return ValidationResult{Valid: false, Message: "max_duration must be a positive number"}
	}
	if minDur, maxDur := contentData["min_duration"].(float64), contentData["max_duration"].(float64); minDur > maxDur {
		return ValidationResult{Valid: false, Message: "min_duration must be <= max_duration"}
	}

	return ValidationResult{Valid: true, Message: "Valid attention event"}
}

// ValidateMarketplaceEvent validates Marketplace events (kind 38188).
// Validates required tags (d, t, a, k, p, r) and JSON content fields.
//
// Required content fields:
//   - name, description, admin_pubkey, min_duration, max_duration, match_fee_sats, confirmation_fee_sats
//   - ref_marketplace_pubkey, ref_marketplace_id, ref_node_pubkey, ref_block_id
// Note: kind_list and relay_list are stored in k and r tags only, not in content.
//
// Returns a ValidationResult indicating if the event is valid.
func ValidateMarketplaceEvent(event *nostr.Event) ValidationResult {
	// Must have d tag (marketplace identifier)
	dTag := getTagValue(event, "d")
	if dTag == "" {
		return ValidationResult{Valid: false, Message: "Missing 'd' tag (marketplace identifier)"}
	}

	// Validate d tag format: org.attnprotocol:marketplace:<marketplace_id>
	if err := validateDTagFormat(38188, dTag); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid d tag format: %s", err.Error())}
	}

	// Must have t tag with block height (numeric)
	blockHeight := getTagValue(event, "t")
	if blockHeight == "" {
		return ValidationResult{Valid: false, Message: "Missing 't' tag (block height)"}
	}

	if _, err := strconv.Atoi(blockHeight); err != nil {
		return ValidationResult{Valid: false, Message: "Invalid block height in 't' tag: must be numeric"}
	}

	// Must have block coordinate a tag (format: 38088:node_pubkey:org.attnprotocol:block:<height>:<hash>)
	blockCoord := getTagValueByPrefix(event, "a", "38088:")
	if blockCoord == "" {
		return ValidationResult{Valid: false, Message: "Missing block coordinate 'a' tag (format: 38088:node_pubkey:org.attnprotocol:block:<height>:<hash>)"}
	}

	if err := validateCoordinateFormat(blockCoord, 38088); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid block coordinate format: %s", err.Error())}
	}

	// Must have k tags (event kinds)
	kTags := getTagValues(event, "k")
	if len(kTags) == 0 {
		return ValidationResult{Valid: false, Message: "Missing required 'k' tags (event kinds)"}
	}

	// Must have p tags (marketplace_pubkey and node_pubkey)
	pTags := getTagValues(event, "p")
	if len(pTags) < 2 {
		return ValidationResult{Valid: false, Message: "Missing required 'p' tags (marketplace_pubkey and node_pubkey)"}
	}

	// Must have r tags (relay URLs)
	rTags := getTagValues(event, "r")
	if len(rTags) == 0 {
		return ValidationResult{Valid: false, Message: "Missing required 'r' tags (relay URLs)"}
	}

	// Content must be valid JSON
	var contentData map[string]interface{}
	if err := json.Unmarshal([]byte(event.Content), &contentData); err != nil {
		return ValidationResult{Valid: false, Message: "Content must be valid JSON"}
	}

	// Check for required fields in content (per ATTN-01.md)
	requiredFields := []string{"name", "description", "admin_pubkey", "min_duration", "max_duration", "match_fee_sats", "confirmation_fee_sats", "ref_marketplace_pubkey", "ref_marketplace_id", "ref_node_pubkey", "ref_block_id"}
	for _, field := range requiredFields {
		if _, ok := contentData[field]; !ok {
			return ValidationResult{Valid: false, Message: fmt.Sprintf("Content must include %s", field)}
		}
	}

	// Validate min_duration and max_duration
	if minDur, ok := contentData["min_duration"].(float64); !ok || minDur <= 0 {
		return ValidationResult{Valid: false, Message: "min_duration must be a positive number"}
	}
	if maxDur, ok := contentData["max_duration"].(float64); !ok || maxDur <= 0 {
		return ValidationResult{Valid: false, Message: "max_duration must be a positive number"}
	}
	if minDur, maxDur := contentData["min_duration"].(float64), contentData["max_duration"].(float64); minDur > maxDur {
		return ValidationResult{Valid: false, Message: "min_duration must be <= max_duration"}
	}

	// Validate fees are non-negative
	if matchFee, ok := contentData["match_fee_sats"].(float64); !ok || matchFee < 0 {
		return ValidationResult{Valid: false, Message: "match_fee_sats must be a non-negative number"}
	}
	if confFee, ok := contentData["confirmation_fee_sats"].(float64); !ok || confFee < 0 {
		return ValidationResult{Valid: false, Message: "confirmation_fee_sats must be a non-negative number"}
	}

	return ValidationResult{Valid: true, Message: "Valid marketplace event"}
}

// ValidateBillboardEvent validates Billboard events (kind 38288).
// Validates required tags (d, t, a, p, r, k, u) and JSON content fields.
//
// Required content fields:
//   - name, confirmation_fee_sats
//   - ref_billboard_pubkey, ref_billboard_id, ref_marketplace_pubkey, ref_marketplace_id
// Optional content fields:
//   - description
//
// Returns a ValidationResult indicating if the event is valid.
func ValidateBillboardEvent(event *nostr.Event) ValidationResult {
	// Must have d tag (billboard identifier)
	dTag := getTagValue(event, "d")
	if dTag == "" {
		return ValidationResult{Valid: false, Message: "Missing 'd' tag (billboard identifier)"}
	}

	// Validate d tag format: org.attnprotocol:billboard:<billboard_id>
	if err := validateDTagFormat(38288, dTag); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid d tag format: %s", err.Error())}
	}

	// Must have t tag with block height (numeric)
	blockHeight := getTagValue(event, "t")
	if blockHeight == "" {
		return ValidationResult{Valid: false, Message: "Missing 't' tag (block height)"}
	}

	if _, err := strconv.Atoi(blockHeight); err != nil {
		return ValidationResult{Valid: false, Message: "Invalid block height in 't' tag: must be numeric"}
	}

	// Must reference a Marketplace via a tag (format: 38188:pubkey:org.attnprotocol:marketplace:id)
	marketplaceRef := getTagValueByPrefix(event, "a", "38188:")
	if marketplaceRef == "" {
		return ValidationResult{Valid: false, Message: "Must reference a Marketplace via 'a' tag (format: 38188:pubkey:org.attnprotocol:marketplace:id)"}
	}

	if err := validateCoordinateFormat(marketplaceRef, 38188); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid marketplace coordinate format: %s", err.Error())}
	}

	// Must have p tags (billboard_pubkey and marketplace_pubkey)
	pTags := getTagValues(event, "p")
	if len(pTags) < 2 {
		return ValidationResult{Valid: false, Message: "Missing required 'p' tags (billboard_pubkey and marketplace_pubkey)"}
	}

	// Must have r tags (relay URLs)
	rTags := getTagValues(event, "r")
	if len(rTags) == 0 {
		return ValidationResult{Valid: false, Message: "Missing required 'r' tags (relay URLs)"}
	}

	// Must have k tag (event kind)
	kTag := getTagValue(event, "k")
	if kTag == "" {
		return ValidationResult{Valid: false, Message: "Missing required 'k' tag (event kind)"}
	}

	// Must have u tag (URL)
	uTag := getTagValue(event, "u")
	if uTag == "" {
		return ValidationResult{Valid: false, Message: "Missing required 'u' tag (URL)"}
	}

	// Content must be valid JSON
	var contentData map[string]interface{}
	if err := json.Unmarshal([]byte(event.Content), &contentData); err != nil {
		return ValidationResult{Valid: false, Message: "Content must be valid JSON"}
	}

	// Check for required fields in content (per ATTN-01.md)
	// description is optional
	requiredFields := []string{"name", "confirmation_fee_sats", "ref_billboard_pubkey", "ref_billboard_id", "ref_marketplace_pubkey", "ref_marketplace_id"}
	for _, field := range requiredFields {
		if _, ok := contentData[field]; !ok {
			return ValidationResult{Valid: false, Message: fmt.Sprintf("Content must include %s", field)}
		}
	}

	// Validate confirmation_fee_sats is non-negative
	if confFee, ok := contentData["confirmation_fee_sats"].(float64); !ok || confFee < 0 {
		return ValidationResult{Valid: false, Message: "confirmation_fee_sats must be a non-negative number"}
	}

	return ValidationResult{Valid: true, Message: "Valid billboard event"}
}

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
	dTag := getTagValue(event, "d")
	if dTag == "" {
		return ValidationResult{Valid: false, Message: "Missing 'd' tag (promotion identifier)"}
	}

	// Validate d tag format: org.attnprotocol:promotion:<promotion_id>
	if err := validateDTagFormat(38388, dTag); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid d tag format: %s", err.Error())}
	}

	// Must have t tag with block height (numeric)
	blockHeight := getTagValue(event, "t")
	if blockHeight == "" {
		return ValidationResult{Valid: false, Message: "Missing 't' tag (block height)"}
	}

	if _, err := strconv.Atoi(blockHeight); err != nil {
		return ValidationResult{Valid: false, Message: "Invalid block height in 't' tag: must be numeric"}
	}

	// Must reference a Marketplace via a tag (format: 38188:pubkey:org.attnprotocol:marketplace:id)
	marketplaceRef := getTagValueByPrefix(event, "a", "38188:")
	if marketplaceRef == "" {
		return ValidationResult{Valid: false, Message: "Must reference a Marketplace via 'a' tag (format: 38188:pubkey:org.attnprotocol:marketplace:id)"}
	}

	if err := validateCoordinateFormat(marketplaceRef, 38188); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid marketplace coordinate format: %s", err.Error())}
	}

	// Must reference a Video via a tag (format: 34236:pubkey:d_tag - no org.attnprotocol: prefix)
	videoRef := getTagValueByPrefix(event, "a", "34236:")
	if videoRef == "" {
		return ValidationResult{Valid: false, Message: "Must reference a Video via 'a' tag (format: 34236:pubkey:d_tag)"}
	}

	// Video coordinate should NOT have org.attnprotocol: prefix (it's not a protocol event)
	if strings.Contains(videoRef, "org.attnprotocol:") {
		return ValidationResult{Valid: false, Message: "Video coordinate should not include 'org.attnprotocol:' prefix (format: 34236:pubkey:d_tag)"}
	}

	// Must reference a Billboard via a tag (format: 38288:pubkey:org.attnprotocol:billboard:id)
	billboardRef := getTagValueByPrefix(event, "a", "38288:")
	if billboardRef == "" {
		return ValidationResult{Valid: false, Message: "Must reference a Billboard via 'a' tag (format: 38288:pubkey:org.attnprotocol:billboard:id)"}
	}

	if err := validateCoordinateFormat(billboardRef, 38288); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid billboard coordinate format: %s", err.Error())}
	}

	// Must have p tags (marketplace_pubkey, billboard_pubkey, and promotion_pubkey)
	pTags := getTagValues(event, "p")
	if len(pTags) < 3 {
		return ValidationResult{Valid: false, Message: "Missing required 'p' tags (marketplace_pubkey, billboard_pubkey, and promotion_pubkey)"}
	}

	// Must have r tags (relay URLs)
	rTags := getTagValues(event, "r")
	if len(rTags) == 0 {
		return ValidationResult{Valid: false, Message: "Missing required 'r' tags (relay URLs)"}
	}

	// Must have k tag (event kind)
	kTag := getTagValue(event, "k")
	if kTag == "" {
		return ValidationResult{Valid: false, Message: "Missing required 'k' tag (event kind)"}
	}

	// Must have u tag (URL)
	uTag := getTagValue(event, "u")
	if uTag == "" {
		return ValidationResult{Valid: false, Message: "Missing required 'u' tag (URL)"}
	}

	// Content must be valid JSON
	var contentData map[string]interface{}
	if err := json.Unmarshal([]byte(event.Content), &contentData); err != nil {
		return ValidationResult{Valid: false, Message: "Content must be valid JSON"}
	}

	// Check for required fields in content (per ATTN-01.md)
	requiredFields := []string{"duration", "bid", "event_id", "call_to_action", "call_to_action_url", "escrow_id_list", "ref_promotion_pubkey", "ref_promotion_id", "ref_marketplace_pubkey", "ref_marketplace_id", "ref_billboard_pubkey", "ref_billboard_id"}
	for _, field := range requiredFields {
		if _, ok := contentData[field]; !ok {
			return ValidationResult{Valid: false, Message: fmt.Sprintf("Content must include %s", field)}
		}
	}

	// Validate escrow_id_list is an array
	escrowList, ok := contentData["escrow_id_list"]
	if !ok {
		return ValidationResult{Valid: false, Message: "escrow_id_list must be an array"}
	}
	if _, ok := escrowList.([]interface{}); !ok {
		return ValidationResult{Valid: false, Message: "escrow_id_list must be an array"}
	}

	// Validate bid is positive number
	if bid, ok := contentData["bid"].(float64); !ok || bid <= 0 {
		return ValidationResult{Valid: false, Message: "bid must be a positive number"}
	}

	// Validate duration is positive number
	if duration, ok := contentData["duration"].(float64); !ok || duration <= 0 {
		return ValidationResult{Valid: false, Message: "duration must be a positive number"}
	}

	return ValidationResult{Valid: true, Message: "Valid promotion event"}
}

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
	dTag := getTagValue(event, "d")
	if dTag == "" {
		return ValidationResult{Valid: false, Message: "Missing 'd' tag (match identifier)"}
	}

	// Validate d tag format: org.attnprotocol:match:<match_id>
	if err := validateDTagFormat(38888, dTag); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid d tag format: %s", err.Error())}
	}

	// Must have t tag with block height (numeric)
	blockHeight := getTagValue(event, "t")
	if blockHeight == "" {
		return ValidationResult{Valid: false, Message: "Missing 't' tag (block height)"}
	}

	if _, err := strconv.Atoi(blockHeight); err != nil {
		return ValidationResult{Valid: false, Message: "Invalid block height in 't' tag: must be numeric"}
	}

	// Must reference Marketplace, Billboard, Promotion, Attention via a tags
	marketplaceRef := getTagValueByPrefix(event, "a", "38188:")
	if marketplaceRef == "" {
		return ValidationResult{Valid: false, Message: "Must reference a Marketplace via 'a' tag (format: 38188:pubkey:org.attnprotocol:marketplace:id)"}
	}
	if err := validateCoordinateFormat(marketplaceRef, 38188); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid marketplace coordinate format: %s", err.Error())}
	}

	billboardRef := getTagValueByPrefix(event, "a", "38288:")
	if billboardRef == "" {
		return ValidationResult{Valid: false, Message: "Must reference a Billboard via 'a' tag (format: 38288:pubkey:org.attnprotocol:billboard:id)"}
	}
	if err := validateCoordinateFormat(billboardRef, 38288); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid billboard coordinate format: %s", err.Error())}
	}

	promotionRef := getTagValueByPrefix(event, "a", "38388:")
	if promotionRef == "" {
		return ValidationResult{Valid: false, Message: "Must reference a Promotion via 'a' tag (format: 38388:pubkey:org.attnprotocol:promotion:id)"}
	}
	if err := validateCoordinateFormat(promotionRef, 38388); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid promotion coordinate format: %s", err.Error())}
	}

	attentionRef := getTagValueByPrefix(event, "a", "38488:")
	if attentionRef == "" {
		return ValidationResult{Valid: false, Message: "Must reference an Attention via 'a' tag (format: 38488:pubkey:org.attnprotocol:attention:id)"}
	}
	if err := validateCoordinateFormat(attentionRef, 38488); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid attention coordinate format: %s", err.Error())}
	}

	// Must have p tags (marketplace_pubkey, promotion_pubkey, attention_pubkey, billboard_pubkey)
	pTags := getTagValues(event, "p")
	if len(pTags) < 4 {
		return ValidationResult{Valid: false, Message: "Missing required 'p' tags (marketplace_pubkey, promotion_pubkey, attention_pubkey, billboard_pubkey)"}
	}

	// Must have r tags (relay URLs)
	rTags := getTagValues(event, "r")
	if len(rTags) == 0 {
		return ValidationResult{Valid: false, Message: "Missing required 'r' tags (relay URLs)"}
	}

	// Must have k tags (event kinds)
	kTags := getTagValues(event, "k")
	if len(kTags) == 0 {
		return ValidationResult{Valid: false, Message: "Missing required 'k' tags (event kinds)"}
	}

	// Content must be valid JSON
	var contentData map[string]interface{}
	if err := json.Unmarshal([]byte(event.Content), &contentData); err != nil {
		return ValidationResult{Valid: false, Message: "Content must be valid JSON"}
	}

	// Check for required fields in content (per ATTN-01.md)
	// MATCH events contain only reference fields (ref_ prefix)
	requiredFields := []string{"ref_match_id", "ref_promotion_id", "ref_attention_id", "ref_billboard_id", "ref_marketplace_id", "ref_marketplace_pubkey", "ref_promotion_pubkey", "ref_attention_pubkey", "ref_billboard_pubkey"}
	for _, field := range requiredFields {
		if _, ok := contentData[field]; !ok {
			return ValidationResult{Valid: false, Message: fmt.Sprintf("Content must include %s", field)}
		}
	}

	return ValidationResult{Valid: true, Message: "Valid match event"}
}

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
	dTag := getTagValue(event, "d")
	if dTag == "" {
		return ValidationResult{Valid: false, Message: "Missing 'd' tag (confirmation identifier)"}
	}

	// Validate d tag format: org.attnprotocol:billboard-confirmation:<confirmation_id>
	if err := validateDTagFormat(38588, dTag); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid d tag format: %s", err.Error())}
	}

	// Must have t tag with block height (numeric)
	blockHeight := getTagValue(event, "t")
	if blockHeight == "" {
		return ValidationResult{Valid: false, Message: "Missing 't' tag (block height)"}
	}

	if _, err := strconv.Atoi(blockHeight); err != nil {
		return ValidationResult{Valid: false, Message: "Invalid block height in 't' tag: must be numeric"}
	}

	// Must have a tags for marketplace, billboard, promotion, attention, and match coordinates
	marketplaceCoord := getTagValueByPrefix(event, "a", "38188:")
	if marketplaceCoord == "" {
		return ValidationResult{Valid: false, Message: "Missing marketplace coordinate 'a' tag (format: 38188:pubkey:org.attnprotocol:marketplace:id)"}
	}
	if err := validateCoordinateFormat(marketplaceCoord, 38188); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid marketplace coordinate format: %s", err.Error())}
	}

	billboardCoord := getTagValueByPrefix(event, "a", "38288:")
	if billboardCoord == "" {
		return ValidationResult{Valid: false, Message: "Missing billboard coordinate 'a' tag (format: 38288:pubkey:org.attnprotocol:billboard:id)"}
	}
	if err := validateCoordinateFormat(billboardCoord, 38288); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid billboard coordinate format: %s", err.Error())}
	}

	promotionCoord := getTagValueByPrefix(event, "a", "38388:")
	if promotionCoord == "" {
		return ValidationResult{Valid: false, Message: "Missing promotion coordinate 'a' tag (format: 38388:pubkey:org.attnprotocol:promotion:id)"}
	}
	if err := validateCoordinateFormat(promotionCoord, 38388); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid promotion coordinate format: %s", err.Error())}
	}

	attentionCoord := getTagValueByPrefix(event, "a", "38488:")
	if attentionCoord == "" {
		return ValidationResult{Valid: false, Message: "Missing attention coordinate 'a' tag (format: 38488:pubkey:org.attnprotocol:attention:id)"}
	}
	if err := validateCoordinateFormat(attentionCoord, 38488); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid attention coordinate format: %s", err.Error())}
	}

	matchCoord := getTagValueByPrefix(event, "a", "38888:")
	if matchCoord == "" {
		return ValidationResult{Valid: false, Message: "Missing match coordinate 'a' tag (format: 38888:pubkey:org.attnprotocol:match:id)"}
	}
	if err := validateCoordinateFormat(matchCoord, 38888); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid match coordinate format: %s", err.Error())}
	}

	// Must have e tag with "match" marker
	if !validateETagWithMarker(event, "match") {
		return ValidationResult{Valid: false, Message: "Missing 'e' tag with 'match' marker"}
	}

	// Must have e tags referencing marketplace, billboard, promotion, attention, and match events
	eTags := getTagValues(event, "e")
	if len(eTags) < 5 {
		return ValidationResult{Valid: false, Message: "Missing required 'e' tags (must reference marketplace, billboard, promotion, attention, and match events)"}
	}

	// Must have p tags for all pubkeys (marketplace, promotion, attention, billboard)
	pTags := getTagValues(event, "p")
	if len(pTags) < 4 {
		return ValidationResult{Valid: false, Message: "Missing required 'p' tags (marketplace_pubkey, promotion_pubkey, attention_pubkey, billboard_pubkey)"}
	}

	// Must have r tags (relay URLs)
	rTags := getTagValues(event, "r")
	if len(rTags) == 0 {
		return ValidationResult{Valid: false, Message: "Missing required 'r' tags (relay URLs)"}
	}

	// Content must be valid JSON
	var contentData map[string]interface{}
	if err := json.Unmarshal([]byte(event.Content), &contentData); err != nil {
		return ValidationResult{Valid: false, Message: "Content must be valid JSON"}
	}

	// Check for required fields in content (per ATTN-01.md) - all ref_ fields
	requiredFields := []string{"ref_match_event_id", "ref_match_id", "ref_marketplace_pubkey", "ref_billboard_pubkey", "ref_promotion_pubkey", "ref_attention_pubkey", "ref_marketplace_id", "ref_billboard_id", "ref_promotion_id", "ref_attention_id"}
	for _, field := range requiredFields {
		if _, ok := contentData[field]; !ok {
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
	dTag := getTagValue(event, "d")
	if dTag == "" {
		return ValidationResult{Valid: false, Message: "Missing 'd' tag (confirmation identifier)"}
	}

	// Validate d tag format: org.attnprotocol:attention-confirmation:<confirmation_id>
	if err := validateDTagFormat(38688, dTag); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid d tag format: %s", err.Error())}
	}

	// Must have t tag with block height (numeric)
	blockHeight := getTagValue(event, "t")
	if blockHeight == "" {
		return ValidationResult{Valid: false, Message: "Missing 't' tag (block height)"}
	}

	if _, err := strconv.Atoi(blockHeight); err != nil {
		return ValidationResult{Valid: false, Message: "Invalid block height in 't' tag: must be numeric"}
	}

	// Must have a tags for marketplace, billboard, promotion, attention, and match coordinates
	marketplaceCoord := getTagValueByPrefix(event, "a", "38188:")
	if marketplaceCoord == "" {
		return ValidationResult{Valid: false, Message: "Missing marketplace coordinate 'a' tag (format: 38188:pubkey:org.attnprotocol:marketplace:id)"}
	}
	if err := validateCoordinateFormat(marketplaceCoord, 38188); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid marketplace coordinate format: %s", err.Error())}
	}

	billboardCoord := getTagValueByPrefix(event, "a", "38288:")
	if billboardCoord == "" {
		return ValidationResult{Valid: false, Message: "Missing billboard coordinate 'a' tag (format: 38288:pubkey:org.attnprotocol:billboard:id)"}
	}
	if err := validateCoordinateFormat(billboardCoord, 38288); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid billboard coordinate format: %s", err.Error())}
	}

	promotionCoord := getTagValueByPrefix(event, "a", "38388:")
	if promotionCoord == "" {
		return ValidationResult{Valid: false, Message: "Missing promotion coordinate 'a' tag (format: 38388:pubkey:org.attnprotocol:promotion:id)"}
	}
	if err := validateCoordinateFormat(promotionCoord, 38388); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid promotion coordinate format: %s", err.Error())}
	}

	attentionCoord := getTagValueByPrefix(event, "a", "38488:")
	if attentionCoord == "" {
		return ValidationResult{Valid: false, Message: "Missing attention coordinate 'a' tag (format: 38488:pubkey:org.attnprotocol:attention:id)"}
	}
	if err := validateCoordinateFormat(attentionCoord, 38488); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid attention coordinate format: %s", err.Error())}
	}

	matchCoord := getTagValueByPrefix(event, "a", "38888:")
	if matchCoord == "" {
		return ValidationResult{Valid: false, Message: "Missing match coordinate 'a' tag (format: 38888:pubkey:org.attnprotocol:match:id)"}
	}
	if err := validateCoordinateFormat(matchCoord, 38888); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid match coordinate format: %s", err.Error())}
	}

	// Must have e tag with "match" marker
	if !validateETagWithMarker(event, "match") {
		return ValidationResult{Valid: false, Message: "Missing 'e' tag with 'match' marker"}
	}

	// Must have e tags referencing marketplace, billboard, promotion, attention, and match events
	eTags := getTagValues(event, "e")
	if len(eTags) < 5 {
		return ValidationResult{Valid: false, Message: "Missing required 'e' tags (must reference marketplace, billboard, promotion, attention, and match events)"}
	}

	// Must have p tags for all pubkeys (marketplace, promotion, attention, billboard)
	pTags := getTagValues(event, "p")
	if len(pTags) < 4 {
		return ValidationResult{Valid: false, Message: "Missing required 'p' tags (marketplace_pubkey, promotion_pubkey, attention_pubkey, billboard_pubkey)"}
	}

	// Must have r tags (relay URLs)
	rTags := getTagValues(event, "r")
	if len(rTags) == 0 {
		return ValidationResult{Valid: false, Message: "Missing required 'r' tags (relay URLs)"}
	}

	// Content must be valid JSON
	var contentData map[string]interface{}
	if err := json.Unmarshal([]byte(event.Content), &contentData); err != nil {
		return ValidationResult{Valid: false, Message: "Content must be valid JSON"}
	}

	// Check for required fields in content (per ATTN-01.md) - all ref_ fields
	requiredFields := []string{"ref_match_event_id", "ref_match_id", "ref_marketplace_pubkey", "ref_billboard_pubkey", "ref_promotion_pubkey", "ref_attention_pubkey", "ref_marketplace_id", "ref_billboard_id", "ref_promotion_id", "ref_attention_id"}
	for _, field := range requiredFields {
		if _, ok := contentData[field]; !ok {
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
//     * "match" marker
//     * "billboard_confirmation" marker
//     * "attention_confirmation" marker
//     * References to marketplace, billboard, promotion, attention, match, billboard_confirmation, and attention_confirmation events
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
	dTag := getTagValue(event, "d")
	if dTag == "" {
		return ValidationResult{Valid: false, Message: "Missing 'd' tag (confirmation identifier)"}
	}

	// Validate d tag format: org.attnprotocol:marketplace-confirmation:<confirmation_id>
	if err := validateDTagFormat(38788, dTag); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid d tag format: %s", err.Error())}
	}

	// Must have t tag with block height (numeric)
	blockHeight := getTagValue(event, "t")
	if blockHeight == "" {
		return ValidationResult{Valid: false, Message: "Missing 't' tag (block height)"}
	}

	if _, err := strconv.Atoi(blockHeight); err != nil {
		return ValidationResult{Valid: false, Message: "Invalid block height in 't' tag: must be numeric"}
	}

	// Must have a tags for marketplace, billboard, promotion, attention, and match coordinates
	marketplaceCoord := getTagValueByPrefix(event, "a", "38188:")
	if marketplaceCoord == "" {
		return ValidationResult{Valid: false, Message: "Missing marketplace coordinate 'a' tag (format: 38188:pubkey:org.attnprotocol:marketplace:id)"}
	}
	if err := validateCoordinateFormat(marketplaceCoord, 38188); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid marketplace coordinate format: %s", err.Error())}
	}

	billboardCoord := getTagValueByPrefix(event, "a", "38288:")
	if billboardCoord == "" {
		return ValidationResult{Valid: false, Message: "Missing billboard coordinate 'a' tag (format: 38288:pubkey:org.attnprotocol:billboard:id)"}
	}
	if err := validateCoordinateFormat(billboardCoord, 38288); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid billboard coordinate format: %s", err.Error())}
	}

	promotionCoord := getTagValueByPrefix(event, "a", "38388:")
	if promotionCoord == "" {
		return ValidationResult{Valid: false, Message: "Missing promotion coordinate 'a' tag (format: 38388:pubkey:org.attnprotocol:promotion:id)"}
	}
	if err := validateCoordinateFormat(promotionCoord, 38388); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid promotion coordinate format: %s", err.Error())}
	}

	attentionCoord := getTagValueByPrefix(event, "a", "38488:")
	if attentionCoord == "" {
		return ValidationResult{Valid: false, Message: "Missing attention coordinate 'a' tag (format: 38488:pubkey:org.attnprotocol:attention:id)"}
	}
	if err := validateCoordinateFormat(attentionCoord, 38488); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid attention coordinate format: %s", err.Error())}
	}

	matchCoord := getTagValueByPrefix(event, "a", "38888:")
	if matchCoord == "" {
		return ValidationResult{Valid: false, Message: "Missing match coordinate 'a' tag (format: 38888:pubkey:org.attnprotocol:match:id)"}
	}
	if err := validateCoordinateFormat(matchCoord, 38888); err != nil {
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
	eTags := getTagValues(event, "e")
	if len(eTags) < 7 {
		return ValidationResult{Valid: false, Message: "Missing required 'e' tags (must reference marketplace, billboard, promotion, attention, match, billboard_confirmation, and attention_confirmation events)"}
	}

	// Must have p tags for all pubkeys (marketplace, promotion, attention, billboard)
	pTags := getTagValues(event, "p")
	if len(pTags) < 4 {
		return ValidationResult{Valid: false, Message: "Missing required 'p' tags (marketplace_pubkey, promotion_pubkey, attention_pubkey, billboard_pubkey)"}
	}

	// Must have r tags (relay URLs)
	rTags := getTagValues(event, "r")
	if len(rTags) == 0 {
		return ValidationResult{Valid: false, Message: "Missing required 'r' tags (relay URLs)"}
	}

	// Content must be valid JSON
	var contentData map[string]interface{}
	if err := json.Unmarshal([]byte(event.Content), &contentData); err != nil {
		return ValidationResult{Valid: false, Message: "Content must be valid JSON"}
	}

	// Check for required fields in content (per ATTN-01.md) - all ref_ fields
	requiredFields := []string{"ref_match_event_id", "ref_match_id", "ref_billboard_confirmation_event_id", "ref_attention_confirmation_event_id", "ref_marketplace_pubkey", "ref_billboard_pubkey", "ref_promotion_pubkey", "ref_attention_pubkey", "ref_marketplace_id", "ref_billboard_id", "ref_promotion_id", "ref_attention_id"}
	for _, field := range requiredFields {
		if _, ok := contentData[field]; !ok {
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
	dTag := getTagValue(event, "d")
	if dTag == "" {
		return ValidationResult{Valid: false, Message: "Missing 'd' tag (confirmation identifier)"}
	}

	// Validate d tag format: org.attnprotocol:attention-payment-confirmation:<confirmation_id>
	if err := validateDTagFormat(38988, dTag); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid d tag format: %s", err.Error())}
	}

	// Must have t tag with block height (numeric)
	blockHeight := getTagValue(event, "t")
	if blockHeight == "" {
		return ValidationResult{Valid: false, Message: "Missing 't' tag (block height)"}
	}

	if _, err := strconv.Atoi(blockHeight); err != nil {
		return ValidationResult{Valid: false, Message: "Invalid block height in 't' tag: must be numeric"}
	}

	// Must have e tag with "marketplace_confirmation" marker
	if !validateETagWithMarker(event, "marketplace_confirmation") {
		return ValidationResult{Valid: false, Message: "Missing 'e' tag with 'marketplace_confirmation' marker"}
	}

	// Must have a tags for marketplace, billboard, promotion, attention, and match coordinates
	marketplaceCoord := getTagValueByPrefix(event, "a", "38188:")
	if marketplaceCoord == "" {
		return ValidationResult{Valid: false, Message: "Missing marketplace coordinate 'a' tag (format: 38188:pubkey:org.attnprotocol:marketplace:id)"}
	}
	if err := validateCoordinateFormat(marketplaceCoord, 38188); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid marketplace coordinate format: %s", err.Error())}
	}

	billboardCoord := getTagValueByPrefix(event, "a", "38288:")
	if billboardCoord == "" {
		return ValidationResult{Valid: false, Message: "Missing billboard coordinate 'a' tag (format: 38288:pubkey:org.attnprotocol:billboard:id)"}
	}
	if err := validateCoordinateFormat(billboardCoord, 38288); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid billboard coordinate format: %s", err.Error())}
	}

	promotionCoord := getTagValueByPrefix(event, "a", "38388:")
	if promotionCoord == "" {
		return ValidationResult{Valid: false, Message: "Missing promotion coordinate 'a' tag (format: 38388:pubkey:org.attnprotocol:promotion:id)"}
	}
	if err := validateCoordinateFormat(promotionCoord, 38388); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid promotion coordinate format: %s", err.Error())}
	}

	attentionCoord := getTagValueByPrefix(event, "a", "38488:")
	if attentionCoord == "" {
		return ValidationResult{Valid: false, Message: "Missing attention coordinate 'a' tag (format: 38488:pubkey:org.attnprotocol:attention:id)"}
	}
	if err := validateCoordinateFormat(attentionCoord, 38488); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid attention coordinate format: %s", err.Error())}
	}

	matchCoord := getTagValueByPrefix(event, "a", "38888:")
	if matchCoord == "" {
		return ValidationResult{Valid: false, Message: "Missing match coordinate 'a' tag (format: 38888:pubkey:org.attnprotocol:match:id)"}
	}
	if err := validateCoordinateFormat(matchCoord, 38888); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid match coordinate format: %s", err.Error())}
	}

	// Must have p tags for all pubkeys (marketplace, promotion, attention, billboard)
	pTags := getTagValues(event, "p")
	if len(pTags) < 4 {
		return ValidationResult{Valid: false, Message: "Missing required 'p' tags (marketplace_pubkey, promotion_pubkey, attention_pubkey, billboard_pubkey)"}
	}

	// Must have r tags (relay URLs)
	rTags := getTagValues(event, "r")
	if len(rTags) == 0 {
		return ValidationResult{Valid: false, Message: "Missing required 'r' tags (relay URLs)"}
	}

	// Content must be valid JSON
	var contentData map[string]interface{}
	if err := json.Unmarshal([]byte(event.Content), &contentData); err != nil {
		return ValidationResult{Valid: false, Message: "Content must be valid JSON"}
	}

	// Check for required fields in content (per ATTN-01.md)
	// Payment fields (no prefix): sats_received, payment_proof (optional)
	// Reference fields (ref_ prefix): all ref_* fields
	requiredFields := []string{"sats_received", "ref_match_event_id", "ref_match_id", "ref_marketplace_confirmation_event_id", "ref_marketplace_pubkey", "ref_billboard_pubkey", "ref_promotion_pubkey", "ref_attention_pubkey", "ref_marketplace_id", "ref_billboard_id", "ref_promotion_id", "ref_attention_id"}
	for _, field := range requiredFields {
		if _, ok := contentData[field]; !ok {
			return ValidationResult{Valid: false, Message: fmt.Sprintf("Content must include %s", field)}
		}
	}

	// Validate sats_received is positive number
	if satsReceived, ok := contentData["sats_received"].(float64); !ok || satsReceived <= 0 {
		return ValidationResult{Valid: false, Message: "sats_received must be a positive number"}
	}

	return ValidationResult{Valid: true, Message: "Valid attention payment confirmation event"}
}

// ValidateBlockUpdateEvent validates Block events (kind 38088) per ATTN-01 specification.
// Validates required tags (d, t, p, r) and JSON content fields.
//
// Required tags:
//   - d: Block identifier (format: org.attnprotocol:block:<height>:<hash>)
//   - t: Block height (numeric, must match height in d tag and content)
//   - p: Node pubkey (at least one)
//   - r: Relay URLs (at least one)
//
// Required content fields:
//   - height: Numeric block height (must match t tag and d tag)
//   - hash: Block hash string (must match d tag)
//   - ref_node_pubkey: Must match event pubkey
//   - ref_block_id: Must match d tag
//
// Parameters:
//   - event: The Nostr event to validate
//
// Returns a ValidationResult indicating if the event is valid and any error message.
func ValidateBlockUpdateEvent(event *nostr.Event) ValidationResult {
	// Must have d tag (block identifier)
	dTag := getTagValue(event, "d")
	if dTag == "" {
		return ValidationResult{Valid: false, Message: "Missing 'd' tag (block identifier)"}
	}

	// Validate d tag format: org.attnprotocol:block:<height>:<hash>
	if err := validateDTagFormat(38088, dTag); err != nil {
		return ValidationResult{Valid: false, Message: fmt.Sprintf("Invalid d tag format: %s", err.Error())}
	}

	// Must have t tag with numeric height
	blockHeight := getTagValue(event, "t")
	if blockHeight == "" {
		return ValidationResult{Valid: false, Message: "Missing 't' tag (block height)"}
	}
	if _, err := strconv.Atoi(blockHeight); err != nil {
		return ValidationResult{Valid: false, Message: "Invalid block height in 't' tag: must be numeric"}
	}

	// Must have p tag for node pubkey
	pTags := getTagValues(event, "p")
	if len(pTags) == 0 {
		return ValidationResult{Valid: false, Message: "Missing required 'p' tag (node_pubkey)"}
	}

	// Must have r tags (relay URLs)
	rTags := getTagValues(event, "r")
	if len(rTags) == 0 {
		return ValidationResult{Valid: false, Message: "Missing required 'r' tags (relay URLs)"}
	}

	// Content must be valid JSON
	var contentData map[string]interface{}
	if err := json.Unmarshal([]byte(event.Content), &contentData); err != nil {
		return ValidationResult{Valid: false, Message: "Content must be valid JSON"}
	}

	// Must include height and hash fields
	heightValue, ok := contentData["height"]
	if !ok {
		return ValidationResult{Valid: false, Message: "Block content missing 'height' field"}
	}
	if _, err := parseHeight(heightValue); err != nil {
		return ValidationResult{Valid: false, Message: "Block content 'height' must be numeric"}
	}

	if _, ok := contentData["hash"].(string); !ok {
		return ValidationResult{Valid: false, Message: "Block content missing 'hash' field"}
	}

	// Must include ref_node_pubkey and ref_block_id
	if _, ok := contentData["ref_node_pubkey"].(string); !ok {
		return ValidationResult{Valid: false, Message: "Block content missing 'ref_node_pubkey' field"}
	}

	if _, ok := contentData["ref_block_id"].(string); !ok {
		return ValidationResult{Valid: false, Message: "Block content missing 'ref_block_id' field"}
	}

	// ref_node_pubkey must match event pubkey
	refNodePubkey, ok := contentData["ref_node_pubkey"].(string)
	if !ok || !strings.EqualFold(refNodePubkey, event.PubKey) {
		return ValidationResult{Valid: false, Message: "ref_node_pubkey must match event pubkey"}
	}

	// ref_block_id must match d tag
	refBlockID, ok := contentData["ref_block_id"].(string)
	if !ok || refBlockID != dTag {
		return ValidationResult{Valid: false, Message: "ref_block_id must match d tag"}
	}

	return ValidationResult{Valid: true, Message: "Valid block event"}
}

// Helper functions

// validateDTagFormat validates that d tag follows org.attnprotocol:<event_type>:<identifier> format
func validateDTagFormat(kind int, dTag string) error {
	expectedPrefix := "org.attnprotocol:"
	if !strings.HasPrefix(dTag, expectedPrefix) {
		return fmt.Errorf("d tag must start with '%s'", expectedPrefix)
	}

	// Map of event kinds to expected event type in d tag
	eventTypeMap := map[int]string{
		38088: "block",
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

	expectedType, ok := eventTypeMap[kind]
	if !ok {
		return fmt.Errorf("unknown event kind: %d", kind)
	}

	// Remove the prefix to get the remaining parts: <event_type>:<identifier>
	remaining := strings.TrimPrefix(dTag, expectedPrefix)
	if remaining == dTag {
		// This shouldn't happen since we checked HasPrefix above, but be safe
		return fmt.Errorf("d tag must start with 'org.attnprotocol:'")
	}

	// Split the remaining part by ':' to get event_type and identifier
	// Format: <event_type>:<identifier> (identifier may contain colons)
	parts := strings.SplitN(remaining, ":", 2)
	if len(parts) < 2 {
		return fmt.Errorf("d tag format invalid: expected org.attnprotocol:<event_type>:<identifier>, got '%s'", dTag)
	}

	eventType := parts[0]
	identifier := parts[1]

	if eventType != expectedType {
		return fmt.Errorf("d tag event type mismatch: expected '%s', got '%s'", expectedType, eventType)
	}

	if identifier == "" {
		return fmt.Errorf("d tag identifier is empty")
	}

	return nil
}

// validateCoordinateFormat validates that coordinate follows format: kind:pubkey:org.attnprotocol:event_type:identifier
// For non-protocol events (e.g., video kind 34236), format is: kind:pubkey:d_tag (without org.attnprotocol:)
func validateCoordinateFormat(coordinate string, expectedKind int) error {
	parts := strings.Split(coordinate, ":")
	if len(parts) < 3 {
		return fmt.Errorf("coordinate format invalid: expected kind:pubkey:identifier")
	}

	// Parse kind from coordinate
	coordKind, err := strconv.Atoi(parts[0])
	if err != nil {
		return fmt.Errorf("coordinate kind must be numeric: %s", parts[0])
	}

	if coordKind != expectedKind {
		return fmt.Errorf("coordinate kind mismatch: expected %d, got %d", expectedKind, coordKind)
	}

	// For protocol events (38088-38988), validate org.attnprotocol: prefix
	if coordKind >= 38088 && coordKind <= 38988 {
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
		// parts[3] should be the event type (block, marketplace, etc.)
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

func getTagValue(event *nostr.Event, tagName string) string {
	for _, tag := range event.Tags {
		if len(tag) >= 2 && tag[0] == tagName {
			return tag[1]
		}
	}
	return ""
}

func getTagValueByPrefix(event *nostr.Event, tagName, prefix string) string {
	for _, tag := range event.Tags {
		if len(tag) >= 2 && tag[0] == tagName && strings.HasPrefix(tag[1], prefix) {
			return tag[1]
		}
	}
	return ""
}

func getTagValues(event *nostr.Event, tagName string) []string {
	var values []string
	for _, tag := range event.Tags {
		if len(tag) >= 2 && tag[0] == tagName {
			values = append(values, tag[1])
		}
	}
	return values
}

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
func validateOfficialTagsOnly(event *nostr.Event) ValidationResult {
	allowedTags := map[string]bool{
		"d": true, "t": true, "a": true, "e": true,
		"p": true, "r": true, "k": true, "u": true,
	}

	for _, tag := range event.Tags {
		if len(tag) > 0 {
			tagName := tag[0]
			if !allowedTags[tagName] {
				return ValidationResult{
					Valid:   false,
					Message: fmt.Sprintf("Non-standard tag '%s' not allowed. Only official Nostr tags are permitted: d, t, a, e, p, r, k, u", tagName),
				}
			}
		}
	}

	return ValidationResult{Valid: true, Message: "All tags are official Nostr tags"}
}
