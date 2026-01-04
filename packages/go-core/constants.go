// Package core provides core constants and types for ATTN Protocol.
//
// This package contains event kinds, NIP-51 list types, and shared type
// definitions used across all ATTN Protocol Go packages.
package core

// ATTN Protocol event kinds as defined in ATTN-01 specification.
// These are Nostr event kinds in the 38xxx range for addressable events.
const (
	// KindMarketplace is the event kind for marketplace registration/update (38188).
	KindMarketplace = 38188

	// KindBillboard is the event kind for billboard (ad slot) registration (38288).
	KindBillboard = 38288

	// KindPromotion is the event kind for promotion (ad) submission (38388).
	KindPromotion = 38388

	// KindAttention is the event kind for attention offers from users (38488).
	KindAttention = 38488

	// KindBillboardConfirmation is the event kind for billboard confirming a match (38588).
	KindBillboardConfirmation = 38588

	// KindAttentionConfirmation is the event kind for attention provider confirming a match (38688).
	KindAttentionConfirmation = 38688

	// KindMarketplaceConfirmation is the event kind for marketplace confirming both parties agreed (38788).
	KindMarketplaceConfirmation = 38788

	// KindMatch is the event kind for match pairing promotion with attention (38888).
	KindMatch = 38888

	// KindAttentionPaymentConfirmation is the event kind for payment confirmation from attention provider (38988).
	KindAttentionPaymentConfirmation = 38988
)

// City Protocol event kinds referenced by ATTN Protocol.
// Block events are published by City Protocol's clock service.
const (
	// KindCityBlock is the event kind for City Protocol block events (38808).
	KindCityBlock = 38808
)

// NIP-51 list type identifiers for ATTN Protocol.
// Used for user preference lists (blocked promotions, trusted marketplaces, etc.)
const (
	// NIP51BlockedPromotions is the list type for blocked promotion event IDs.
	NIP51BlockedPromotions = "org.attnprotocol:promotion:blocked"

	// NIP51BlockedPromoters is the list type for blocked promoter pubkeys.
	NIP51BlockedPromoters = "org.attnprotocol:promoter:blocked"

	// NIP51TrustedBillboards is the list type for trusted billboard pubkeys.
	NIP51TrustedBillboards = "org.attnprotocol:billboard:trusted"

	// NIP51TrustedMarketplaces is the list type for trusted marketplace pubkeys.
	NIP51TrustedMarketplaces = "org.attnprotocol:marketplace:trusted"
)

// CityBlockIDPrefix is the City Protocol namespace prefix for block references.
const CityBlockIDPrefix = "org.cityprotocol:block:"

// AllATTNKinds returns all ATTN Protocol event kinds.
func AllATTNKinds() []int {
	return []int{
		KindMarketplace,
		KindBillboard,
		KindPromotion,
		KindAttention,
		KindBillboardConfirmation,
		KindAttentionConfirmation,
		KindMarketplaceConfirmation,
		KindMatch,
		KindAttentionPaymentConfirmation,
	}
}

// IsATTNKind returns true if the given kind is an ATTN Protocol event kind.
func IsATTNKind(kind int) bool {
	switch kind {
	case KindMarketplace, KindBillboard, KindPromotion, KindAttention,
		KindBillboardConfirmation, KindAttentionConfirmation,
		KindMarketplaceConfirmation, KindMatch, KindAttentionPaymentConfirmation:
		return true
	default:
		return false
	}
}
