package hooks

import (
	"github.com/joinnextblock/attn-protocol/go-core"
	"github.com/nbd-wtf/go-nostr"
)

// Hook names for ATTN Protocol events.
const (
	// Infrastructure hooks
	HookRelayConnect    = "relay_connect"
	HookRelayDisconnect = "relay_disconnect"
	HookSubscription    = "subscription"
	HookRateLimit       = "rate_limit"
	HookHealthChange    = "health_change"

	// Block event hooks
	HookBeforeBlockEvent = "before_block_event"
	HookBlockEvent       = "block_event"
	HookAfterBlockEvent  = "after_block_event"
	HookBlockGapDetected = "block_gap_detected"

	// Marketplace event hooks
	HookBeforeMarketplaceEvent = "before_marketplace_event"
	HookMarketplaceEvent       = "marketplace_event"
	HookAfterMarketplaceEvent  = "after_marketplace_event"

	// Billboard event hooks
	HookBeforeBillboardEvent = "before_billboard_event"
	HookBillboardEvent       = "billboard_event"
	HookAfterBillboardEvent  = "after_billboard_event"

	// Promotion event hooks
	HookBeforePromotionEvent = "before_promotion_event"
	HookPromotionEvent       = "promotion_event"
	HookAfterPromotionEvent  = "after_promotion_event"

	// Attention event hooks
	HookBeforeAttentionEvent = "before_attention_event"
	HookAttentionEvent       = "attention_event"
	HookAfterAttentionEvent  = "after_attention_event"

	// Match event hooks
	HookBeforeMatchEvent = "before_match_event"
	HookMatchEvent       = "match_event"
	HookAfterMatchEvent  = "after_match_event"
	HookMatchPublished   = "match_published"

	// Confirmation event hooks
	HookBeforeBillboardConfirmationEvent = "before_billboard_confirmation_event"
	HookBillboardConfirmationEvent       = "billboard_confirmation_event"
	HookAfterBillboardConfirmationEvent  = "after_billboard_confirmation_event"

	HookBeforeAttentionConfirmationEvent = "before_attention_confirmation_event"
	HookAttentionConfirmationEvent       = "attention_confirmation_event"
	HookAfterAttentionConfirmationEvent  = "after_attention_confirmation_event"

	HookBeforeMarketplaceConfirmationEvent = "before_marketplace_confirmation_event"
	HookMarketplaceConfirmationEvent       = "marketplace_confirmation_event"
	HookAfterMarketplaceConfirmationEvent  = "after_marketplace_confirmation_event"

	HookBeforeAttentionPaymentConfirmationEvent = "before_attention_payment_confirmation_event"
	HookAttentionPaymentConfirmationEvent       = "attention_payment_confirmation_event"
	HookAfterAttentionPaymentConfirmationEvent  = "after_attention_payment_confirmation_event"

	// Identity publishing hooks
	HookProfilePublished = "profile_published"

	// Standard Nostr event hooks
	HookBeforeProfileEvent   = "before_profile_event"
	HookProfileEvent         = "profile_event"
	HookAfterProfileEvent    = "after_profile_event"
	HookBeforeRelayListEvent = "before_relay_list_event"
	HookRelayListEvent       = "relay_list_event"
	HookAfterRelayListEvent  = "after_relay_list_event"
	HookBeforeNIP51ListEvent = "before_nip51_list_event"
	HookNIP51ListEvent       = "nip51_list_event"
	HookAfterNIP51ListEvent  = "after_nip51_list_event"
)

// BaseContext is the base context for all hooks.
type BaseContext struct {
	Event    *nostr.Event
	RelayURL string
}

// RelayConnectContext contains context for relay connection events.
type RelayConnectContext struct {
	RelayURL string
}

// RelayDisconnectContext contains context for relay disconnection events.
type RelayDisconnectContext struct {
	RelayURL string
	Reason   string
}

// SubscriptionContext contains context for subscription events.
type SubscriptionContext struct {
	RelayURL       string
	SubscriptionID string
	Filters        nostr.Filters
}

// RateLimitContext contains context for rate limit events.
type RateLimitContext struct {
	RelayURL string
}

// HealthChangeContext contains context for health change events.
type HealthChangeContext struct {
	HealthStatus string
}

// BlockEventContext contains context for block events.
type BlockEventContext struct {
	BaseContext
	BlockHeight int64
	BlockHash   string
	BlockData   *core.CityBlockData
}

// BlockGapDetectedContext contains context for block gap detection events.
type BlockGapDetectedContext struct {
	ExpectedHeight int64
	ActualHeight   int64
	Gap            int64
}

// MarketplaceEventContext contains context for marketplace events.
type MarketplaceEventContext struct {
	BaseContext
	EventID         string
	Pubkey          string
	MarketplaceData *core.MarketplaceData
}

// BillboardEventContext contains context for billboard events.
type BillboardEventContext struct {
	BaseContext
	EventID       string
	Pubkey        string
	BillboardData *core.BillboardData
}

// PromotionEventContext contains context for promotion events.
type PromotionEventContext struct {
	BaseContext
	EventID       string
	Pubkey        string
	PromotionData *core.PromotionData
}

// AttentionEventContext contains context for attention events.
type AttentionEventContext struct {
	BaseContext
	EventID       string
	Pubkey        string
	AttentionData *core.AttentionData
}

// MatchEventContext contains context for match events.
type MatchEventContext struct {
	BaseContext
	EventID   string
	Pubkey    string
	MatchData *core.MatchData
}

// MatchPublishedContext contains context for match published events.
type MatchPublishedContext struct {
	MatchEventID  string
	PromotionID   string
	AttentionID   string
	PublishResult *PublishResult
}

// BillboardConfirmationEventContext contains context for billboard confirmation events.
type BillboardConfirmationEventContext struct {
	BaseContext
	EventID          string
	Pubkey           string
	ConfirmationData *core.BillboardConfirmationData
}

// AttentionConfirmationEventContext contains context for attention confirmation events.
type AttentionConfirmationEventContext struct {
	BaseContext
	EventID          string
	Pubkey           string
	ConfirmationData *core.AttentionConfirmationData
}

// MarketplaceConfirmationEventContext contains context for marketplace confirmation events.
type MarketplaceConfirmationEventContext struct {
	BaseContext
	EventID        string
	Pubkey         string
	SettlementData *core.MarketplaceConfirmationData
}

// AttentionPaymentConfirmationEventContext contains context for attention payment confirmation events.
type AttentionPaymentConfirmationEventContext struct {
	BaseContext
	EventID     string
	Pubkey      string
	PaymentData *core.AttentionPaymentConfirmationData
}

// ProfilePublishedContext contains context for profile published events.
type ProfilePublishedContext struct {
	ProfileEventID    string
	RelayListEventID  string
	FollowListEventID string
	Results           []PublishResult
	SuccessCount      int
	FailureCount      int
}

// PublishResult represents the result of publishing an event to a relay.
type PublishResult struct {
	RelayURL string
	Success  bool
	Error    error
}

// ProfileEventContext contains context for profile events (kind 0).
type ProfileEventContext struct {
	BaseContext
	EventID string
	Pubkey  string
	Profile map[string]any
}

// RelayListEventContext contains context for relay list events (kind 10002).
type RelayListEventContext struct {
	BaseContext
	EventID string
	Pubkey  string
	Relays  []RelayInfo
}

// RelayInfo represents a relay in a relay list.
type RelayInfo struct {
	URL   string
	Read  bool
	Write bool
}

// NIP51ListEventContext contains context for NIP-51 list events (kind 30000).
type NIP51ListEventContext struct {
	BaseContext
	EventID  string
	Pubkey   string
	ListType string
	Items    []string
}
