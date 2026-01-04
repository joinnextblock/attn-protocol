package marketplace

import (
	"context"

	"github.com/joinnextblock/attn-protocol/go-core"
	"github.com/nbd-wtf/go-nostr"
)

// Storage defines the interface for storage operations.
// Implementers bring their own storage backend.
type Storage interface {
	// StoreBillboard stores a billboard event.
	StoreBillboard(ctx context.Context, event *nostr.Event, data *core.BillboardData, block_height int64, d_tag, coordinate string) error

	// StorePromotion stores a promotion event.
	StorePromotion(ctx context.Context, event *nostr.Event, data *core.PromotionData, block_height int64, d_tag, coordinate string) error

	// StoreAttention stores an attention event.
	StoreAttention(ctx context.Context, event *nostr.Event, data *core.AttentionData, block_height int64, d_tag, coordinate string) error

	// StoreMatch stores a match event.
	StoreMatch(ctx context.Context, event *nostr.Event, data *core.MatchData, block_height int64, d_tag, coordinate string) error

	// Exists checks if an event has already been processed.
	Exists(ctx context.Context, event_type string, event_id string) (bool, error)

	// QueryPromotions queries promotions matching the given parameters.
	QueryPromotions(ctx context.Context, params QueryPromotionsParams) ([]PromotionRecord, error)

	// GetAggregates returns aggregate counts for the marketplace.
	GetAggregates(ctx context.Context) (Aggregates, error)
}

// QueryPromotionsParams holds parameters for querying promotions.
type QueryPromotionsParams struct {
	MarketplaceCoordinate string
	MinBid                int64
	MinDuration           int64
	MaxDuration           int64
	BlockHeight           int64
}

// PromotionRecord holds a stored promotion.
type PromotionRecord struct {
	Event      *nostr.Event
	Data       *core.PromotionData
	Coordinate string
	DTag       string
}

// AttentionRecord holds a stored attention offer.
type AttentionRecord struct {
	Event      *nostr.Event
	Data       *core.AttentionData
	Coordinate string
	DTag       string
}

// Aggregates holds marketplace statistics.
type Aggregates struct {
	BillboardCount int64
	PromotionCount int64
	AttentionCount int64
	MatchCount     int64
}

// Matcher defines the interface for matching operations.
type Matcher interface {
	// FindMatches finds matches from candidates.
	FindMatches(ctx context.Context, candidates []MatchCandidate) ([]MatchCandidate, error)
}

// MatchCandidate represents a potential match.
type MatchCandidate struct {
	PromotionEvent      *nostr.Event
	PromotionData       *core.PromotionData
	PromotionCoordinate string
	AttentionEvent      *nostr.Event
	AttentionData       *core.AttentionData
	AttentionCoordinate string
}

// SimpleMatcher is a simple matcher that returns all candidates.
type SimpleMatcher struct{}

// FindMatches returns all candidates as matches.
func (m *SimpleMatcher) FindMatches(ctx context.Context, candidates []MatchCandidate) ([]MatchCandidate, error) {
	return candidates, nil
}
