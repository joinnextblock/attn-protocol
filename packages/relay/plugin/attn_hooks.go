package plugin

import (
	"context"

	"github.com/nbd-wtf/go-nostr"
)

// ATTNHooks defines the interface for ATTN event lifecycle hooks.
// Implementations can provide custom processing for each ATTN event type at different stages.
type ATTNHooks interface {
	// Block Event (38088) lifecycle
	BeforeBlockEvent(ctx context.Context, event *nostr.Event) error
	AfterBlockEvent(ctx context.Context, event *nostr.Event) error

	// Marketplace Event (38188) lifecycle
	BeforeMarketplaceEvent(ctx context.Context, event *nostr.Event) error
	AfterMarketplaceEvent(ctx context.Context, event *nostr.Event) error

	// Billboard Event (38288) lifecycle
	BeforeBillboardEvent(ctx context.Context, event *nostr.Event) error
	AfterBillboardEvent(ctx context.Context, event *nostr.Event) error

	// Promotion Event (38388) lifecycle
	BeforePromotionEvent(ctx context.Context, event *nostr.Event) error
	AfterPromotionEvent(ctx context.Context, event *nostr.Event) error

	// Attention Event (38488) lifecycle
	BeforeAttentionEvent(ctx context.Context, event *nostr.Event) error
	AfterAttentionEvent(ctx context.Context, event *nostr.Event) error

	// Match Event (38888) lifecycle
	BeforeMatchEvent(ctx context.Context, event *nostr.Event) error
	AfterMatchEvent(ctx context.Context, event *nostr.Event) error

	// Confirmation Events lifecycle
	BeforeBillboardConfirmationEvent(ctx context.Context, event *nostr.Event) error
	AfterBillboardConfirmationEvent(ctx context.Context, event *nostr.Event) error

	BeforeAttentionConfirmationEvent(ctx context.Context, event *nostr.Event) error
	AfterAttentionConfirmationEvent(ctx context.Context, event *nostr.Event) error

	BeforeMarketplaceConfirmationEvent(ctx context.Context, event *nostr.Event) error
	AfterMarketplaceConfirmationEvent(ctx context.Context, event *nostr.Event) error

	BeforeAttentionPaymentConfirmationEvent(ctx context.Context, event *nostr.Event) error
	AfterAttentionPaymentConfirmationEvent(ctx context.Context, event *nostr.Event) error
}

