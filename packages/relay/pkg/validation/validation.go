// Package validation provides event validation for ATTN Protocol events.
// This package is a thin wrapper around the go-core/validation package,
// re-exporting its types and functions for relay use.
//
// The actual validation logic lives in go-core/validation for reusability
// across multiple Go packages.
package validation

import (
	"github.com/nbd-wtf/go-nostr"

	core_validation "github.com/joinnextblock/attn-protocol/go-core/validation"
)

// ValidationResult represents the result of event validation.
// Re-exported from go-core/validation.
type ValidationResult = core_validation.ValidationResult

// AllowedEventKinds defines the set of event kinds accepted by the ATTN Protocol relay.
// Re-exported from go-core/validation.
var AllowedEventKinds = core_validation.AllowedEventKinds

// ATTNProtocolKinds contains all ATTN Protocol event kinds.
// Re-exported from go-core/validation.
var ATTNProtocolKinds = core_validation.ATTNProtocolKinds

// IsATTNProtocolKind returns true if the kind is an ATTN Protocol event kind.
// Re-exported from go-core/validation.
func IsATTNProtocolKind(kind int) bool {
	return core_validation.IsATTNProtocolKind(kind)
}

// ValidateEvent validates an event based on its kind.
// Re-exported from go-core/validation.
func ValidateEvent(event *nostr.Event) ValidationResult {
	return core_validation.ValidateEvent(event)
}

// ValidateMarketplaceEvent validates Marketplace events (kind 38188).
// Re-exported from go-core/validation.
func ValidateMarketplaceEvent(event *nostr.Event) ValidationResult {
	return core_validation.ValidateMarketplaceEvent(event)
}

// ValidateBillboardEvent validates Billboard events (kind 38288).
// Re-exported from go-core/validation.
func ValidateBillboardEvent(event *nostr.Event) ValidationResult {
	return core_validation.ValidateBillboardEvent(event)
}

// ValidatePromotionEvent validates Promotion events (kind 38388).
// Re-exported from go-core/validation.
func ValidatePromotionEvent(event *nostr.Event) ValidationResult {
	return core_validation.ValidatePromotionEvent(event)
}

// ValidateAttentionEvent validates Attention events (kind 38488).
// Re-exported from go-core/validation.
func ValidateAttentionEvent(event *nostr.Event) ValidationResult {
	return core_validation.ValidateAttentionEvent(event)
}

// ValidateMatchEvent validates Match events (kind 38888).
// Re-exported from go-core/validation.
func ValidateMatchEvent(event *nostr.Event) ValidationResult {
	return core_validation.ValidateMatchEvent(event)
}

// ValidateBillboardConfirmationEvent validates Billboard Confirmation events (kind 38588).
// Re-exported from go-core/validation.
func ValidateBillboardConfirmationEvent(event *nostr.Event) ValidationResult {
	return core_validation.ValidateBillboardConfirmationEvent(event)
}

// ValidateAttentionConfirmationEvent validates Attention Confirmation events (kind 38688).
// Re-exported from go-core/validation.
func ValidateAttentionConfirmationEvent(event *nostr.Event) ValidationResult {
	return core_validation.ValidateAttentionConfirmationEvent(event)
}

// ValidateMarketplaceConfirmationEvent validates Marketplace Confirmation events (kind 38788).
// Re-exported from go-core/validation.
func ValidateMarketplaceConfirmationEvent(event *nostr.Event) ValidationResult {
	return core_validation.ValidateMarketplaceConfirmationEvent(event)
}

// ValidateAttentionPaymentConfirmationEvent validates Attention Payment Confirmation events (kind 38988).
// Re-exported from go-core/validation.
func ValidateAttentionPaymentConfirmationEvent(event *nostr.Event) ValidationResult {
	return core_validation.ValidateAttentionPaymentConfirmationEvent(event)
}

// ValidateCityBlockEvent validates City Protocol Block events (kind 38808).
// Re-exported from go-core/validation.
func ValidateCityBlockEvent(event *nostr.Event) ValidationResult {
	return core_validation.ValidateCityBlockEvent(event)
}

// ValidateBlockUpdateEvent is deprecated - use ValidateCityBlockEvent instead.
// Re-exported from go-core/validation for backwards compatibility.
//
// Deprecated: Use ValidateCityBlockEvent instead.
func ValidateBlockUpdateEvent(event *nostr.Event) ValidationResult {
	return core_validation.ValidateBlockUpdateEvent(event)
}

