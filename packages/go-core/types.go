package core

// BlockHeight represents a Bitcoin block height as a positive integer.
// Used throughout ATTN Protocol for time-based coordination.
type BlockHeight int64

// Pubkey represents a Nostr public key as a 64-character hex string.
type Pubkey string

// EventID represents a Nostr event ID as a 64-character hex string (SHA-256 hash).
type EventID string

// RelayURL represents a WebSocket URL for a Nostr relay.
type RelayURL string

// CityBlockReference represents a City Protocol block reference.
// ATTN Protocol events reference City Protocol block events for timing.
type CityBlockReference struct {
	// RefClockPubkey is the City clock pubkey that published the block event.
	RefClockPubkey string `json:"ref_clock_pubkey,omitempty"`

	// RefBlockID is the City Protocol block identifier: org.cityprotocol:block:<height>:<hash>
	RefBlockID string `json:"ref_block_id,omitempty"`
}

// CityBlockData represents City Protocol BLOCK event content (kind 38808).
// Block events are now published by City Protocol, not ATTN Protocol.
type CityBlockData struct {
	BlockHeight    int64  `json:"block_height"`
	BlockHash      string `json:"block_hash"`
	BlockTime      int64  `json:"block_time"`
	PreviousHash   string `json:"previous_hash"`
	Difficulty     string `json:"difficulty,omitempty"`
	TxCount        int64  `json:"tx_count,omitempty"`
	Size           int64  `json:"size,omitempty"`
	Weight         int64  `json:"weight,omitempty"`
	Version        int64  `json:"version,omitempty"`
	MerkleRoot     string `json:"merkle_root,omitempty"`
	Nonce          int64  `json:"nonce,omitempty"`
	RefClockPubkey string `json:"ref_clock_pubkey,omitempty"`
	RefBlockID     string `json:"ref_block_id,omitempty"`
}

// MarketplaceData represents MARKETPLACE event content (kind 38188).
type MarketplaceData struct {
	Name                 string `json:"name,omitempty"`
	Description          string `json:"description,omitempty"`
	AdminPubkey          string `json:"admin_pubkey,omitempty"`
	MinDuration          int64  `json:"min_duration,omitempty"`
	MaxDuration          int64  `json:"max_duration,omitempty"`
	MatchFeeSats         int64  `json:"match_fee_sats,omitempty"`
	ConfirmationFeeSats  int64  `json:"confirmation_fee_sats,omitempty"`
	RefMarketplacePubkey string `json:"ref_marketplace_pubkey,omitempty"`
	RefMarketplaceID     string `json:"ref_marketplace_id,omitempty"`
	RefClockPubkey       string `json:"ref_clock_pubkey,omitempty"`
	RefBlockID           string `json:"ref_block_id,omitempty"`
	BillboardCount       int64  `json:"billboard_count,omitempty"`
	PromotionCount       int64  `json:"promotion_count,omitempty"`
	AttentionCount       int64  `json:"attention_count,omitempty"`
	MatchCount           int64  `json:"match_count,omitempty"`
}

// BillboardData represents BILLBOARD event content (kind 38288).
type BillboardData struct {
	Name                 string `json:"name,omitempty"`
	Description          string `json:"description,omitempty"`
	ConfirmationFeeSats  int64  `json:"confirmation_fee_sats,omitempty"`
	RefBillboardPubkey   string `json:"ref_billboard_pubkey,omitempty"`
	RefBillboardID       string `json:"ref_billboard_id,omitempty"`
	RefMarketplacePubkey string `json:"ref_marketplace_pubkey,omitempty"`
	RefMarketplaceID     string `json:"ref_marketplace_id,omitempty"`
}

// PromotionData represents PROMOTION event content (kind 38388).
type PromotionData struct {
	Duration             int64    `json:"duration,omitempty"`
	Bid                  int64    `json:"bid,omitempty"`
	EventID              string   `json:"event_id,omitempty"`
	CallToAction         string   `json:"call_to_action,omitempty"`
	CallToActionURL      string   `json:"call_to_action_url,omitempty"`
	EscrowIDList         []string `json:"escrow_id_list,omitempty"`
	RefPromotionPubkey   string   `json:"ref_promotion_pubkey,omitempty"`
	RefPromotionID       string   `json:"ref_promotion_id,omitempty"`
	RefMarketplacePubkey string   `json:"ref_marketplace_pubkey,omitempty"`
	RefMarketplaceID     string   `json:"ref_marketplace_id,omitempty"`
	RefBillboardPubkey   string   `json:"ref_billboard_pubkey,omitempty"`
	RefBillboardID       string   `json:"ref_billboard_id,omitempty"`
}

// AttentionData represents ATTENTION event content (kind 38488).
type AttentionData struct {
	Ask                   int64  `json:"ask,omitempty"`
	MinDuration           int64  `json:"min_duration,omitempty"`
	MaxDuration           int64  `json:"max_duration,omitempty"`
	BlockedPromotionsID   string `json:"blocked_promotions_id,omitempty"`
	BlockedPromotersID    string `json:"blocked_promoters_id,omitempty"`
	TrustedMarketplacesID string `json:"trusted_marketplaces_id,omitempty"`
	TrustedBillboardsID   string `json:"trusted_billboards_id,omitempty"`
	RefAttentionPubkey    string `json:"ref_attention_pubkey,omitempty"`
	RefAttentionID        string `json:"ref_attention_id,omitempty"`
	RefMarketplacePubkey  string `json:"ref_marketplace_pubkey,omitempty"`
	RefMarketplaceID      string `json:"ref_marketplace_id,omitempty"`
}

// MatchData represents MATCH event content (kind 38888).
// Per ATTN-01, MATCH events contain ONLY ref_* fields.
// Values like ask, bid, duration are calculated at ingestion by fetching referenced events.
type MatchData struct {
	RefMatchID           string `json:"ref_match_id,omitempty"`
	RefMarketplaceID     string `json:"ref_marketplace_id,omitempty"`
	RefBillboardID       string `json:"ref_billboard_id,omitempty"`
	RefPromotionID       string `json:"ref_promotion_id,omitempty"`
	RefAttentionID       string `json:"ref_attention_id,omitempty"`
	RefMarketplacePubkey string `json:"ref_marketplace_pubkey,omitempty"`
	RefPromotionPubkey   string `json:"ref_promotion_pubkey,omitempty"`
	RefAttentionPubkey   string `json:"ref_attention_pubkey,omitempty"`
	RefBillboardPubkey   string `json:"ref_billboard_pubkey,omitempty"`
}

// BillboardConfirmationData represents BILLBOARD_CONFIRMATION event content (kind 38588).
// Per ATTN-01, contains ONLY ref_* fields.
type BillboardConfirmationData struct {
	RefMatchEventID      string `json:"ref_match_event_id,omitempty"`
	RefMatchID           string `json:"ref_match_id,omitempty"`
	RefMarketplacePubkey string `json:"ref_marketplace_pubkey,omitempty"`
	RefBillboardPubkey   string `json:"ref_billboard_pubkey,omitempty"`
	RefPromotionPubkey   string `json:"ref_promotion_pubkey,omitempty"`
	RefAttentionPubkey   string `json:"ref_attention_pubkey,omitempty"`
	RefMarketplaceID     string `json:"ref_marketplace_id,omitempty"`
	RefBillboardID       string `json:"ref_billboard_id,omitempty"`
	RefPromotionID       string `json:"ref_promotion_id,omitempty"`
	RefAttentionID       string `json:"ref_attention_id,omitempty"`
}

// AttentionConfirmationData represents ATTENTION_CONFIRMATION event content (kind 38688).
// Per ATTN-01, contains ONLY ref_* fields.
type AttentionConfirmationData struct {
	RefMatchEventID      string `json:"ref_match_event_id,omitempty"`
	RefMatchID           string `json:"ref_match_id,omitempty"`
	RefMarketplacePubkey string `json:"ref_marketplace_pubkey,omitempty"`
	RefBillboardPubkey   string `json:"ref_billboard_pubkey,omitempty"`
	RefPromotionPubkey   string `json:"ref_promotion_pubkey,omitempty"`
	RefAttentionPubkey   string `json:"ref_attention_pubkey,omitempty"`
	RefMarketplaceID     string `json:"ref_marketplace_id,omitempty"`
	RefBillboardID       string `json:"ref_billboard_id,omitempty"`
	RefPromotionID       string `json:"ref_promotion_id,omitempty"`
	RefAttentionID       string `json:"ref_attention_id,omitempty"`
}

// MarketplaceConfirmationData represents MARKETPLACE_CONFIRMATION event content (kind 38788).
// Per ATTN-01, contains ONLY ref_* fields.
type MarketplaceConfirmationData struct {
	RefMatchEventID                 string `json:"ref_match_event_id,omitempty"`
	RefMatchID                      string `json:"ref_match_id,omitempty"`
	RefBillboardConfirmationEventID string `json:"ref_billboard_confirmation_event_id,omitempty"`
	RefAttentionConfirmationEventID string `json:"ref_attention_confirmation_event_id,omitempty"`
	RefMarketplacePubkey            string `json:"ref_marketplace_pubkey,omitempty"`
	RefBillboardPubkey              string `json:"ref_billboard_pubkey,omitempty"`
	RefPromotionPubkey              string `json:"ref_promotion_pubkey,omitempty"`
	RefAttentionPubkey              string `json:"ref_attention_pubkey,omitempty"`
	RefMarketplaceID                string `json:"ref_marketplace_id,omitempty"`
	RefBillboardID                  string `json:"ref_billboard_id,omitempty"`
	RefPromotionID                  string `json:"ref_promotion_id,omitempty"`
	RefAttentionID                  string `json:"ref_attention_id,omitempty"`
}

// AttentionPaymentConfirmationData represents ATTENTION_PAYMENT_CONFIRMATION event content (kind 38988).
// Per ATTN-01, contains sats_received, payment_proof, and ref_* fields.
type AttentionPaymentConfirmationData struct {
	SatsReceived                      int64  `json:"sats_received,omitempty"`
	PaymentProof                      string `json:"payment_proof,omitempty"`
	RefMatchEventID                   string `json:"ref_match_event_id,omitempty"`
	RefMatchID                        string `json:"ref_match_id,omitempty"`
	RefMarketplaceConfirmationEventID string `json:"ref_marketplace_confirmation_event_id,omitempty"`
	RefMarketplacePubkey              string `json:"ref_marketplace_pubkey,omitempty"`
	RefBillboardPubkey                string `json:"ref_billboard_pubkey,omitempty"`
	RefPromotionPubkey                string `json:"ref_promotion_pubkey,omitempty"`
	RefAttentionPubkey                string `json:"ref_attention_pubkey,omitempty"`
	RefMarketplaceID                  string `json:"ref_marketplace_id,omitempty"`
	RefBillboardID                    string `json:"ref_billboard_id,omitempty"`
	RefPromotionID                    string `json:"ref_promotion_id,omitempty"`
	RefAttentionID                    string `json:"ref_attention_id,omitempty"`
}
