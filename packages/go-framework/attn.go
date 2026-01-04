// Package framework provides a hook-based framework for building ATTN Protocol applications.
//
// The framework handles Nostr relay connections, Bitcoin block synchronization,
// and event lifecycle management, allowing you to focus on implementing your
// marketplace logic.
//
// Example usage:
//
//	attn := framework.NewAttn(framework.Config{
//	    RelaysNoAuth: []string{"wss://relay.example.com"},
//	    PrivateKey:   privateKeyBytes,
//	})
//
//	attn.OnPromotionEvent(func(ctx context.Context, hookCtx hooks.PromotionEventContext) error {
//	    fmt.Println("New promotion:", hookCtx.EventID)
//	    return nil
//	})
//
//	if err := attn.Connect(context.Background()); err != nil {
//	    log.Fatal(err)
//	}
package framework

import (
	"context"
	"encoding/json"
	"sync"

	"github.com/joinnextblock/attn-protocol/go-core"
	"github.com/joinnextblock/attn-protocol/go-framework/hooks"
	"github.com/nbd-wtf/go-nostr"
)

// Config holds configuration for the ATTN framework.
type Config struct {
	// RelaysAuth contains relay URLs requiring NIP-42 authentication.
	RelaysAuth []string

	// RelaysNoAuth contains relay URLs not requiring authentication.
	RelaysNoAuth []string

	// RelaysWriteAuth contains write relay URLs requiring NIP-42 auth.
	RelaysWriteAuth []string

	// RelaysWriteNoAuth contains write relay URLs not requiring auth.
	RelaysWriteNoAuth []string

	// PrivateKey is the 32-byte private key for signing events.
	PrivateKey []byte

	// NodePubkeys contains trusted node pubkeys for block events.
	NodePubkeys []string

	// MarketplacePubkeys filters events by marketplace pubkeys.
	MarketplacePubkeys []string

	// BillboardPubkeys filters events by billboard pubkeys.
	BillboardPubkeys []string

	// AdvertiserPubkeys filters events by advertiser pubkeys.
	AdvertiserPubkeys []string

	// AutoReconnect enables automatic reconnection on disconnect.
	AutoReconnect bool

	// DeduplicateEvents enables event deduplication.
	DeduplicateEvents bool
}

// Attn is the main framework class for ATTN Protocol applications.
type Attn struct {
	config     Config
	emitter    *hooks.Emitter
	relays     []*nostr.Relay
	mu         sync.RWMutex
	connected  bool
	seenEvents map[string]struct{}
}

// NewAttn creates a new ATTN framework instance.
func NewAttn(config Config) *Attn {
	return &Attn{
		config:     config,
		emitter:    hooks.NewEmitter(),
		relays:     make([]*nostr.Relay, 0),
		seenEvents: make(map[string]struct{}),
	}
}

// Connect establishes connections to all configured relays.
func (a *Attn) Connect(ctx context.Context) error {
	all_relays := append(a.config.RelaysAuth, a.config.RelaysNoAuth...)

	for _, url := range all_relays {
		relay, err := nostr.RelayConnect(ctx, url)
		if err != nil {
			// Log but continue with other relays
			continue
		}
		a.relays = append(a.relays, relay)

		// Emit connect hook
		a.emitter.Emit(ctx, hooks.HookRelayConnect, hooks.RelayConnectContext{
			RelayURL: url,
		})

		// Start subscription for this relay
		go a.subscribe(ctx, relay)
	}

	if len(a.relays) == 0 {
		return ErrNoRelaysConnected
	}

	a.connected = true
	return nil
}

// Disconnect closes all relay connections.
func (a *Attn) Disconnect() {
	a.mu.Lock()
	defer a.mu.Unlock()

	for _, relay := range a.relays {
		relay.Close()
	}
	a.relays = nil
	a.connected = false
}

// Connected returns true if connected to at least one relay.
func (a *Attn) Connected() bool {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.connected
}

// subscribe sets up event subscriptions for a relay.
func (a *Attn) subscribe(ctx context.Context, relay *nostr.Relay) {
	// Build filters for ATTN Protocol events
	filters := nostr.Filters{
		{
			Kinds: append(core.AllATTNKinds(), core.KindCityBlock),
		},
	}

	// Apply pubkey filters if configured
	if len(a.config.MarketplacePubkeys) > 0 {
		filters[0].Authors = a.config.MarketplacePubkeys
	}

	sub, err := relay.Subscribe(ctx, filters)
	if err != nil {
		return
	}

	// Emit subscription hook
	a.emitter.Emit(ctx, hooks.HookSubscription, hooks.SubscriptionContext{
		RelayURL:       relay.URL,
		SubscriptionID: sub.GetID(),
		Filters:        filters,
	})

	for event := range sub.Events {
		a.handleEvent(ctx, event, relay.URL)
	}
}

// handleEvent dispatches events to appropriate hooks.
func (a *Attn) handleEvent(ctx context.Context, event *nostr.Event, relay_url string) {
	// Deduplicate if enabled
	if a.config.DeduplicateEvents {
		a.mu.Lock()
		if _, seen := a.seenEvents[event.ID]; seen {
			a.mu.Unlock()
			return
		}
		a.seenEvents[event.ID] = struct{}{}
		a.mu.Unlock()
	}

	base_ctx := hooks.BaseContext{Event: event, RelayURL: relay_url}

	switch event.Kind {
	case core.KindCityBlock:
		a.handleBlockEvent(ctx, event, base_ctx)
	case core.KindMarketplace:
		a.handleMarketplaceEvent(ctx, event, base_ctx)
	case core.KindBillboard:
		a.handleBillboardEvent(ctx, event, base_ctx)
	case core.KindPromotion:
		a.handlePromotionEvent(ctx, event, base_ctx)
	case core.KindAttention:
		a.handleAttentionEvent(ctx, event, base_ctx)
	case core.KindMatch:
		a.handleMatchEvent(ctx, event, base_ctx)
	case core.KindBillboardConfirmation:
		a.handleBillboardConfirmationEvent(ctx, event, base_ctx)
	case core.KindAttentionConfirmation:
		a.handleAttentionConfirmationEvent(ctx, event, base_ctx)
	case core.KindMarketplaceConfirmation:
		a.handleMarketplaceConfirmationEvent(ctx, event, base_ctx)
	case core.KindAttentionPaymentConfirmation:
		a.handleAttentionPaymentConfirmationEvent(ctx, event, base_ctx)
	}
}

func (a *Attn) handleBlockEvent(ctx context.Context, event *nostr.Event, base_ctx hooks.BaseContext) {
	var data core.CityBlockData
	json.Unmarshal([]byte(event.Content), &data)

	hook_ctx := hooks.BlockEventContext{
		BaseContext: base_ctx,
		BlockHeight: data.BlockHeight,
		BlockHash:   data.BlockHash,
		BlockData:   &data,
	}

	a.emitter.Emit(ctx, hooks.HookBeforeBlockEvent, hook_ctx)
	a.emitter.Emit(ctx, hooks.HookBlockEvent, hook_ctx)
	a.emitter.Emit(ctx, hooks.HookAfterBlockEvent, hook_ctx)
}

func (a *Attn) handleMarketplaceEvent(ctx context.Context, event *nostr.Event, base_ctx hooks.BaseContext) {
	var data core.MarketplaceData
	json.Unmarshal([]byte(event.Content), &data)

	hook_ctx := hooks.MarketplaceEventContext{
		BaseContext:     base_ctx,
		EventID:         event.ID,
		Pubkey:          event.PubKey,
		MarketplaceData: &data,
	}

	a.emitter.Emit(ctx, hooks.HookBeforeMarketplaceEvent, hook_ctx)
	a.emitter.Emit(ctx, hooks.HookMarketplaceEvent, hook_ctx)
	a.emitter.Emit(ctx, hooks.HookAfterMarketplaceEvent, hook_ctx)
}

func (a *Attn) handleBillboardEvent(ctx context.Context, event *nostr.Event, base_ctx hooks.BaseContext) {
	var data core.BillboardData
	json.Unmarshal([]byte(event.Content), &data)

	hook_ctx := hooks.BillboardEventContext{
		BaseContext:   base_ctx,
		EventID:       event.ID,
		Pubkey:        event.PubKey,
		BillboardData: &data,
	}

	a.emitter.Emit(ctx, hooks.HookBeforeBillboardEvent, hook_ctx)
	a.emitter.Emit(ctx, hooks.HookBillboardEvent, hook_ctx)
	a.emitter.Emit(ctx, hooks.HookAfterBillboardEvent, hook_ctx)
}

func (a *Attn) handlePromotionEvent(ctx context.Context, event *nostr.Event, base_ctx hooks.BaseContext) {
	var data core.PromotionData
	json.Unmarshal([]byte(event.Content), &data)

	hook_ctx := hooks.PromotionEventContext{
		BaseContext:   base_ctx,
		EventID:       event.ID,
		Pubkey:        event.PubKey,
		PromotionData: &data,
	}

	a.emitter.Emit(ctx, hooks.HookBeforePromotionEvent, hook_ctx)
	a.emitter.Emit(ctx, hooks.HookPromotionEvent, hook_ctx)
	a.emitter.Emit(ctx, hooks.HookAfterPromotionEvent, hook_ctx)
}

func (a *Attn) handleAttentionEvent(ctx context.Context, event *nostr.Event, base_ctx hooks.BaseContext) {
	var data core.AttentionData
	json.Unmarshal([]byte(event.Content), &data)

	hook_ctx := hooks.AttentionEventContext{
		BaseContext:   base_ctx,
		EventID:       event.ID,
		Pubkey:        event.PubKey,
		AttentionData: &data,
	}

	a.emitter.Emit(ctx, hooks.HookBeforeAttentionEvent, hook_ctx)
	a.emitter.Emit(ctx, hooks.HookAttentionEvent, hook_ctx)
	a.emitter.Emit(ctx, hooks.HookAfterAttentionEvent, hook_ctx)
}

func (a *Attn) handleMatchEvent(ctx context.Context, event *nostr.Event, base_ctx hooks.BaseContext) {
	var data core.MatchData
	json.Unmarshal([]byte(event.Content), &data)

	hook_ctx := hooks.MatchEventContext{
		BaseContext: base_ctx,
		EventID:     event.ID,
		Pubkey:      event.PubKey,
		MatchData:   &data,
	}

	a.emitter.Emit(ctx, hooks.HookBeforeMatchEvent, hook_ctx)
	a.emitter.Emit(ctx, hooks.HookMatchEvent, hook_ctx)
	a.emitter.Emit(ctx, hooks.HookAfterMatchEvent, hook_ctx)
}

func (a *Attn) handleBillboardConfirmationEvent(ctx context.Context, event *nostr.Event, base_ctx hooks.BaseContext) {
	var data core.BillboardConfirmationData
	json.Unmarshal([]byte(event.Content), &data)

	hook_ctx := hooks.BillboardConfirmationEventContext{
		BaseContext:      base_ctx,
		EventID:          event.ID,
		Pubkey:           event.PubKey,
		ConfirmationData: &data,
	}

	a.emitter.Emit(ctx, hooks.HookBeforeBillboardConfirmationEvent, hook_ctx)
	a.emitter.Emit(ctx, hooks.HookBillboardConfirmationEvent, hook_ctx)
	a.emitter.Emit(ctx, hooks.HookAfterBillboardConfirmationEvent, hook_ctx)
}

func (a *Attn) handleAttentionConfirmationEvent(ctx context.Context, event *nostr.Event, base_ctx hooks.BaseContext) {
	var data core.AttentionConfirmationData
	json.Unmarshal([]byte(event.Content), &data)

	hook_ctx := hooks.AttentionConfirmationEventContext{
		BaseContext:      base_ctx,
		EventID:          event.ID,
		Pubkey:           event.PubKey,
		ConfirmationData: &data,
	}

	a.emitter.Emit(ctx, hooks.HookBeforeAttentionConfirmationEvent, hook_ctx)
	a.emitter.Emit(ctx, hooks.HookAttentionConfirmationEvent, hook_ctx)
	a.emitter.Emit(ctx, hooks.HookAfterAttentionConfirmationEvent, hook_ctx)
}

func (a *Attn) handleMarketplaceConfirmationEvent(ctx context.Context, event *nostr.Event, base_ctx hooks.BaseContext) {
	var data core.MarketplaceConfirmationData
	json.Unmarshal([]byte(event.Content), &data)

	hook_ctx := hooks.MarketplaceConfirmationEventContext{
		BaseContext:    base_ctx,
		EventID:        event.ID,
		Pubkey:         event.PubKey,
		SettlementData: &data,
	}

	a.emitter.Emit(ctx, hooks.HookBeforeMarketplaceConfirmationEvent, hook_ctx)
	a.emitter.Emit(ctx, hooks.HookMarketplaceConfirmationEvent, hook_ctx)
	a.emitter.Emit(ctx, hooks.HookAfterMarketplaceConfirmationEvent, hook_ctx)
}

func (a *Attn) handleAttentionPaymentConfirmationEvent(ctx context.Context, event *nostr.Event, base_ctx hooks.BaseContext) {
	var data core.AttentionPaymentConfirmationData
	json.Unmarshal([]byte(event.Content), &data)

	hook_ctx := hooks.AttentionPaymentConfirmationEventContext{
		BaseContext: base_ctx,
		EventID:     event.ID,
		Pubkey:      event.PubKey,
		PaymentData: &data,
	}

	a.emitter.Emit(ctx, hooks.HookBeforeAttentionPaymentConfirmationEvent, hook_ctx)
	a.emitter.Emit(ctx, hooks.HookAttentionPaymentConfirmationEvent, hook_ctx)
	a.emitter.Emit(ctx, hooks.HookAfterAttentionPaymentConfirmationEvent, hook_ctx)
}

// Hook registration methods

// OnRelayConnect registers a handler for relay connection events.
func (a *Attn) OnRelayConnect(handler func(ctx context.Context, hookCtx hooks.RelayConnectContext) error) *hooks.Handle {
	return a.emitter.Register(hooks.HookRelayConnect, func(ctx context.Context, data any) error {
		if hookCtx, ok := data.(hooks.RelayConnectContext); ok {
			return handler(ctx, hookCtx)
		}
		return nil
	})
}

// OnRelayDisconnect registers a handler for relay disconnection events.
func (a *Attn) OnRelayDisconnect(handler func(ctx context.Context, hookCtx hooks.RelayDisconnectContext) error) *hooks.Handle {
	return a.emitter.Register(hooks.HookRelayDisconnect, func(ctx context.Context, data any) error {
		if hookCtx, ok := data.(hooks.RelayDisconnectContext); ok {
			return handler(ctx, hookCtx)
		}
		return nil
	})
}

// BeforeBlockEvent registers a before-hook for block events.
func (a *Attn) BeforeBlockEvent(handler func(ctx context.Context, hookCtx hooks.BlockEventContext) error) *hooks.Handle {
	return a.emitter.Register(hooks.HookBeforeBlockEvent, func(ctx context.Context, data any) error {
		if hookCtx, ok := data.(hooks.BlockEventContext); ok {
			return handler(ctx, hookCtx)
		}
		return nil
	})
}

// OnBlockEvent registers a handler for block events.
func (a *Attn) OnBlockEvent(handler func(ctx context.Context, hookCtx hooks.BlockEventContext) error) *hooks.Handle {
	return a.emitter.Register(hooks.HookBlockEvent, func(ctx context.Context, data any) error {
		if hookCtx, ok := data.(hooks.BlockEventContext); ok {
			return handler(ctx, hookCtx)
		}
		return nil
	})
}

// AfterBlockEvent registers an after-hook for block events.
func (a *Attn) AfterBlockEvent(handler func(ctx context.Context, hookCtx hooks.BlockEventContext) error) *hooks.Handle {
	return a.emitter.Register(hooks.HookAfterBlockEvent, func(ctx context.Context, data any) error {
		if hookCtx, ok := data.(hooks.BlockEventContext); ok {
			return handler(ctx, hookCtx)
		}
		return nil
	})
}

// OnPromotionEvent registers a handler for promotion events.
func (a *Attn) OnPromotionEvent(handler func(ctx context.Context, hookCtx hooks.PromotionEventContext) error) *hooks.Handle {
	return a.emitter.Register(hooks.HookPromotionEvent, func(ctx context.Context, data any) error {
		if hookCtx, ok := data.(hooks.PromotionEventContext); ok {
			return handler(ctx, hookCtx)
		}
		return nil
	})
}

// OnAttentionEvent registers a handler for attention events.
func (a *Attn) OnAttentionEvent(handler func(ctx context.Context, hookCtx hooks.AttentionEventContext) error) *hooks.Handle {
	return a.emitter.Register(hooks.HookAttentionEvent, func(ctx context.Context, data any) error {
		if hookCtx, ok := data.(hooks.AttentionEventContext); ok {
			return handler(ctx, hookCtx)
		}
		return nil
	})
}

// OnMarketplaceEvent registers a handler for marketplace events.
func (a *Attn) OnMarketplaceEvent(handler func(ctx context.Context, hookCtx hooks.MarketplaceEventContext) error) *hooks.Handle {
	return a.emitter.Register(hooks.HookMarketplaceEvent, func(ctx context.Context, data any) error {
		if hookCtx, ok := data.(hooks.MarketplaceEventContext); ok {
			return handler(ctx, hookCtx)
		}
		return nil
	})
}

// OnBillboardEvent registers a handler for billboard events.
func (a *Attn) OnBillboardEvent(handler func(ctx context.Context, hookCtx hooks.BillboardEventContext) error) *hooks.Handle {
	return a.emitter.Register(hooks.HookBillboardEvent, func(ctx context.Context, data any) error {
		if hookCtx, ok := data.(hooks.BillboardEventContext); ok {
			return handler(ctx, hookCtx)
		}
		return nil
	})
}

// OnMatchEvent registers a handler for match events.
func (a *Attn) OnMatchEvent(handler func(ctx context.Context, hookCtx hooks.MatchEventContext) error) *hooks.Handle {
	return a.emitter.Register(hooks.HookMatchEvent, func(ctx context.Context, data any) error {
		if hookCtx, ok := data.(hooks.MatchEventContext); ok {
			return handler(ctx, hookCtx)
		}
		return nil
	})
}

// Emitter returns the underlying hook emitter for advanced usage.
func (a *Attn) Emitter() *hooks.Emitter {
	return a.emitter
}
