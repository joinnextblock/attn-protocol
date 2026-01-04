// Package validation provides event validation for ATTN Protocol events.
// It validates custom event kinds (Marketplace, Billboard, Promotion, Attention, Match, etc.)
// according to the ATTN-01 specification, checking required tags and JSON content fields.
//
// This package is designed to be importable by other relays (e.g., city-protocol/relay)
// and does not have any logging dependencies. Logging should be done at the call site.
package validation

import (
	"fmt"

	"github.com/nbd-wtf/go-nostr"
)

// ValidationResult represents the result of event validation.
// It indicates whether an event is valid and provides an error message if invalid.
type ValidationResult struct {
	Valid   bool
	Message string
}

// AllowedEventKinds defines the set of event kinds accepted by the ATTN Protocol relay.
// This relay only accepts event kinds that enhance the ATTN Protocol.
//
// City Protocol kind:
//   - 38808: Block events (published by City Protocol clock)
//
// ATTN Protocol kinds (38188-38988):
//   - 38188: Marketplace events
//   - 38288: Billboard events
//   - 38388: Promotion events
//   - 38488: Attention events
//   - 38588: Billboard confirmation events
//   - 38688: Attention confirmation events
//   - 38788: Marketplace confirmation events
//   - 38888: Match events
//   - 38988: Attention payment confirmation events
//
// Supporting Nostr kinds - Identity & Infrastructure:
//   - 0: User metadata/profiles (NIP-01) - user identity
//   - 3: Follow lists (NIP-02) - contact list / social graph
//   - 5: Deletion events (NIP-09) - event deletion
//   - 10002: Relay list metadata (NIP-65) - relay hints
//   - 10003: Bookmarks (NIP-51) - simple bookmark list
//   - 22242: Client authentication (NIP-42) - relay auth
//   - 27235: HTTP Auth (NIP-98) - HTTP authentication
//   - 30000: Categorized lists (NIP-51) - blocked/trusted lists required by ATTN-01
//   - 30001: Bookmarks categorized (NIP-51) - organized bookmarks
//   - 31989: Handler recommendation (NIP-89) - user app recommendations
//   - 31990: Handler information (NIP-89) - app capabilities advertisement
//
// Supporting Nostr kinds - Content:
//   - 1063: File metadata (NIP-94) - video file metadata
//   - 30023: Long-form content (NIP-23) - articles/blogs
//   - 30311: Live events (NIP-53) - live streaming
//   - 34236: Video events - content being promoted
//
// Supporting Nostr kinds - Social interactions on promoted content:
//   - 1: Text notes (NIP-01) - comments/replies on videos
//   - 6: Reposts (NIP-18) - reposts of videos
//   - 16: Generic reposts (NIP-18) - reposts of any event
//   - 1111: Comments (NIP-22) - threaded comments
//   - 9734: Zap requests (NIP-57) - zap request before payment
//   - 9735: Zaps (NIP-57) - Lightning payments/tips on videos
//
// Supporting Nostr kinds - Moderation:
//   - 1984: Reports (NIP-56) - reporting spam/abuse
//   - 1985: Labels (NIP-32) - content categorization/tagging
var AllowedEventKinds = map[int]bool{
	// City Protocol kind (block events from City clock)
	38808: true, // Block (City Protocol)

	// ATTN Protocol kinds
	38188: true, // Marketplace
	38288: true, // Billboard
	38388: true, // Promotion
	38488: true, // Attention
	38588: true, // Billboard Confirmation
	38688: true, // Attention Confirmation
	38788: true, // Marketplace Confirmation
	38888: true, // Match
	38988: true, // Attention Payment Confirmation

	// Supporting Nostr kinds - Identity & Infrastructure
	0:     true, // User metadata/profiles (NIP-01)
	3:     true, // Follow lists (NIP-02)
	5:     true, // Deletion events (NIP-09)
	10002: true, // Relay list metadata (NIP-65)
	10003: true, // Bookmarks (NIP-51)
	22242: true, // Client authentication (NIP-42)
	27235: true, // HTTP Auth (NIP-98)
	30000: true, // Categorized lists (NIP-51)
	30001: true, // Bookmarks categorized (NIP-51)
	31989: true, // Handler recommendation (NIP-89)
	31990: true, // Handler information (NIP-89)

	// Supporting Nostr kinds - Content
	1063:  true, // File metadata (NIP-94)
	30023: true, // Long-form content (NIP-23)
	30311: true, // Live events (NIP-53)
	34236: true, // Video events (content being promoted)

	// Supporting Nostr kinds - Social interactions on promoted content
	1:    true, // Text notes (NIP-01) - comments/replies
	6:    true, // Reposts (NIP-18)
	16:   true, // Generic reposts (NIP-18)
	1111: true, // Comments (NIP-22) - threaded comments
	9734: true, // Zap requests (NIP-57)
	9735: true, // Zaps (NIP-57) - Lightning payments

	// Supporting Nostr kinds - Moderation
	1984: true, // Reports (NIP-56)
	1985: true, // Labels (NIP-32)
}

// ATTNProtocolKinds contains all ATTN Protocol event kinds for validation routing.
var ATTNProtocolKinds = map[int]bool{
	38808: true, // City Protocol block
	38188: true, // Marketplace
	38288: true, // Billboard
	38388: true, // Promotion
	38488: true, // Attention
	38588: true, // Billboard Confirmation
	38688: true, // Attention Confirmation
	38788: true, // Marketplace Confirmation
	38888: true, // Match
	38988: true, // Attention Payment Confirmation
}

// IsATTNProtocolKind returns true if the kind is an ATTN Protocol event kind.
func IsATTNProtocolKind(kind int) bool {
	return ATTNProtocolKinds[kind]
}

// ValidateEvent validates an event based on its kind.
// First checks if the event kind is allowed, then routes to specific validation functions.
// See AllowedEventKinds for the complete list of supported event kinds.
//
// Parameters:
//   - event: The Nostr event to validate
//
// Returns a ValidationResult indicating if the event is valid and any error message.
func ValidateEvent(event *nostr.Event) ValidationResult {
	// First, check if event kind is allowed
	if !AllowedEventKinds[event.Kind] {
		return ValidationResult{
			Valid:   false,
			Message: fmt.Sprintf("Event kind %d is not supported by this relay. Only ATTN Protocol kinds (38188-38988), City Protocol block kind (38808), and supporting kinds are accepted. See relay documentation for full list.", event.Kind),
		}
	}

	// For ATTN Protocol events (and City Protocol block events), validate that only official Nostr tags are used
	if ATTNProtocolKinds[event.Kind] {
		if tag_result := validateOfficialTagsOnly(event); !tag_result.Valid {
			return tag_result
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
	case 38808:
		result = ValidateCityBlockEvent(event)
	case 38988:
		result = ValidateAttentionPaymentConfirmationEvent(event)
	default:
		// Supporting Nostr kinds (0, 5, 10002, 30000, 34236) - validated by AllowedEventKinds check above
		result = ValidationResult{Valid: true, Message: "Valid supporting event kind"}
	}

	return result
}

