package plugin

import (
	"context"
	"net/http"

	"github.com/nbd-wtf/go-nostr"
	"github.com/pippellia-btc/rely"
)

// NoAuthHooks provides a public relay implementation with no authentication required.
// All methods return nil (allow everything) for a completely open relay.
type NoAuthHooks struct{}

// OnConnection allows all connections.
func (h *NoAuthHooks) OnConnection(stats rely.Stats, req *http.Request) error {
	return nil
}

// OnConnect is called after connection is established.
// Optionally sends AUTH challenge but doesn't require it.
func (h *NoAuthHooks) OnConnect(client rely.Client) {
	// Optional: send AUTH challenge but don't require it
	// client.SendAuth()
}

// OnAuth accepts all authentications.
func (h *NoAuthHooks) OnAuth(client rely.Client) error {
	return nil
}

// RejectReq allows all queries.
func (h *NoAuthHooks) RejectReq(client rely.Client, filters nostr.Filters) error {
	return nil
}

// RejectEvent allows all events (subject to validation and rate limiting).
func (h *NoAuthHooks) RejectEvent(client rely.Client, event *nostr.Event) error {
	return nil
}

// IsAuthorized returns false (no special authorized services).
func (h *NoAuthHooks) IsAuthorized(pubkey string) bool {
	return false
}

// NoATTNHooks provides default no-op implementations for all ATTN event lifecycle hooks.
type NoATTNHooks struct{}

func (h *NoATTNHooks) BeforeBlockEvent(ctx context.Context, event *nostr.Event) error {
	return nil
}

func (h *NoATTNHooks) AfterBlockEvent(ctx context.Context, event *nostr.Event) error {
	return nil
}

func (h *NoATTNHooks) BeforeMarketplaceEvent(ctx context.Context, event *nostr.Event) error {
	return nil
}

func (h *NoATTNHooks) AfterMarketplaceEvent(ctx context.Context, event *nostr.Event) error {
	return nil
}

func (h *NoATTNHooks) BeforeBillboardEvent(ctx context.Context, event *nostr.Event) error {
	return nil
}

func (h *NoATTNHooks) AfterBillboardEvent(ctx context.Context, event *nostr.Event) error {
	return nil
}

func (h *NoATTNHooks) BeforePromotionEvent(ctx context.Context, event *nostr.Event) error {
	return nil
}

func (h *NoATTNHooks) AfterPromotionEvent(ctx context.Context, event *nostr.Event) error {
	return nil
}

func (h *NoATTNHooks) BeforeAttentionEvent(ctx context.Context, event *nostr.Event) error {
	return nil
}

func (h *NoATTNHooks) AfterAttentionEvent(ctx context.Context, event *nostr.Event) error {
	return nil
}

func (h *NoATTNHooks) BeforeMatchEvent(ctx context.Context, event *nostr.Event) error {
	return nil
}

func (h *NoATTNHooks) AfterMatchEvent(ctx context.Context, event *nostr.Event) error {
	return nil
}

func (h *NoATTNHooks) BeforeBillboardConfirmationEvent(ctx context.Context, event *nostr.Event) error {
	return nil
}

func (h *NoATTNHooks) AfterBillboardConfirmationEvent(ctx context.Context, event *nostr.Event) error {
	return nil
}

func (h *NoATTNHooks) BeforeAttentionConfirmationEvent(ctx context.Context, event *nostr.Event) error {
	return nil
}

func (h *NoATTNHooks) AfterAttentionConfirmationEvent(ctx context.Context, event *nostr.Event) error {
	return nil
}

func (h *NoATTNHooks) BeforeMarketplaceConfirmationEvent(ctx context.Context, event *nostr.Event) error {
	return nil
}

func (h *NoATTNHooks) AfterMarketplaceConfirmationEvent(ctx context.Context, event *nostr.Event) error {
	return nil
}

func (h *NoATTNHooks) BeforeAttentionPaymentConfirmationEvent(ctx context.Context, event *nostr.Event) error {
	return nil
}

func (h *NoATTNHooks) AfterAttentionPaymentConfirmationEvent(ctx context.Context, event *nostr.Event) error {
	return nil
}

