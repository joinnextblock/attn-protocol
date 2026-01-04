// Package marketplace provides a marketplace lifecycle layer on top of the ATTN Framework.
//
// This package allows you to bring your own storage implementation while handling
// the marketplace lifecycle logic including event processing, matching, and publishing.
//
// Example usage:
//
//	mp := marketplace.New(marketplace.Config{
//	    PrivateKey:    privateKeyHex,
//	    MarketplaceID: "my-marketplace",
//	    Name:          "My Marketplace",
//	    NodePubkey:    nodePubkey,
//	    AutoMatch:     true,
//	    RelayConfig: marketplace.RelayConfig{
//	        ReadNoAuth:  []string{"wss://relay.example.com"},
//	        WriteNoAuth: []string{"wss://relay.example.com"},
//	    },
//	}, storage, matcher)
//
//	if err := mp.Start(ctx); err != nil {
//	    log.Fatal(err)
//	}
package marketplace

import (
	"context"
	"fmt"
	"sync"

	"github.com/joinnextblock/attn-protocol/go-core"
	"github.com/joinnextblock/attn-protocol/go-framework"
	"github.com/joinnextblock/attn-protocol/go-framework/hooks"
	"github.com/nbd-wtf/go-nostr"
)

// Config holds marketplace configuration.
type Config struct {
	// PrivateKey is the marketplace signing key (hex or nsec).
	PrivateKey string

	// MarketplaceID is the unique marketplace identifier.
	MarketplaceID string

	// Name is the marketplace display name.
	Name string

	// Description is the marketplace description.
	Description string

	// NodePubkey is the node pubkey to follow for blocks.
	NodePubkey string

	// MinDuration is the minimum ad duration in milliseconds.
	MinDuration int64

	// MaxDuration is the maximum ad duration in milliseconds.
	MaxDuration int64

	// MatchFeeSats is the fee per match in satoshis.
	MatchFeeSats int64

	// ConfirmationFeeSats is the fee per confirmation in satoshis.
	ConfirmationFeeSats int64

	// KindList is the list of supported content kinds.
	KindList []int

	// WebsiteURL is the marketplace website URL.
	WebsiteURL string

	// AutoPublishMarketplace auto-publishes marketplace event on block boundary.
	AutoPublishMarketplace bool

	// AutoMatch auto-runs matching when attention/promotion received.
	AutoMatch bool

	// RelayConfig holds relay URL configuration.
	RelayConfig RelayConfig
}

// RelayConfig holds relay URL configuration.
type RelayConfig struct {
	ReadAuth    []string
	ReadNoAuth  []string
	WriteAuth   []string
	WriteNoAuth []string
}

// Marketplace is the main marketplace class.
type Marketplace struct {
	config             Config
	framework          *framework.Attn
	storage            Storage
	matcher            Matcher
	currentBlockHeight int64
	currentBlockHash   string
	mu                 sync.RWMutex
}

// New creates a new marketplace instance.
func New(config Config, storage Storage, matcher Matcher) *Marketplace {
	// Set defaults
	if config.MinDuration == 0 {
		config.MinDuration = 15000
	}
	if config.MaxDuration == 0 {
		config.MaxDuration = 60000
	}
	if len(config.KindList) == 0 {
		config.KindList = []int{34236}
	}

	// Build framework config
	fw_config := framework.Config{
		RelaysAuth:        config.RelayConfig.ReadAuth,
		RelaysNoAuth:      config.RelayConfig.ReadNoAuth,
		RelaysWriteAuth:   config.RelayConfig.WriteAuth,
		RelaysWriteNoAuth: config.RelayConfig.WriteNoAuth,
		NodePubkeys:       []string{config.NodePubkey},
		DeduplicateEvents: true,
	}

	m := &Marketplace{
		config:    config,
		framework: framework.NewAttn(fw_config),
		storage:   storage,
		matcher:   matcher,
	}

	// Wire framework events to marketplace handlers
	m.wireFrameworkEvents()

	return m
}

// wireFrameworkEvents connects framework hooks to marketplace logic.
func (m *Marketplace) wireFrameworkEvents() {
	// Billboard events
	m.framework.OnBillboardEvent(func(ctx context.Context, hookCtx hooks.BillboardEventContext) error {
		return m.handleBillboard(ctx, hookCtx.Event, hookCtx.BillboardData)
	})

	// Promotion events
	m.framework.OnPromotionEvent(func(ctx context.Context, hookCtx hooks.PromotionEventContext) error {
		return m.handlePromotion(ctx, hookCtx.Event, hookCtx.PromotionData)
	})

	// Attention events
	m.framework.OnAttentionEvent(func(ctx context.Context, hookCtx hooks.AttentionEventContext) error {
		return m.handleAttention(ctx, hookCtx.Event, hookCtx.AttentionData)
	})

	// Match events
	m.framework.OnMatchEvent(func(ctx context.Context, hookCtx hooks.MatchEventContext) error {
		return m.handleMatch(ctx, hookCtx.Event, hookCtx.MatchData)
	})

	// Block events
	m.framework.OnBlockEvent(func(ctx context.Context, hookCtx hooks.BlockEventContext) error {
		return m.handleBlock(ctx, hookCtx.BlockHeight, hookCtx.BlockHash)
	})
}

// handleBillboard processes billboard events.
func (m *Marketplace) handleBillboard(ctx context.Context, event *nostr.Event, data *core.BillboardData) error {
	block_height := extractBlockHeight(event)
	d_tag := extractDTag(event)
	coordinate := buildCoordinate(event)

	if block_height == 0 || d_tag == "" || coordinate == "" {
		return nil // Invalid event
	}

	// Check if already processed
	exists, err := m.storage.Exists(ctx, "billboard", event.ID)
	if err != nil {
		return err
	}
	if exists {
		return nil
	}

	return m.storage.StoreBillboard(ctx, event, data, block_height, d_tag, coordinate)
}

// handlePromotion processes promotion events.
func (m *Marketplace) handlePromotion(ctx context.Context, event *nostr.Event, data *core.PromotionData) error {
	block_height := extractBlockHeight(event)
	d_tag := extractDTag(event)
	coordinate := buildCoordinate(event)

	if block_height == 0 || d_tag == "" || coordinate == "" {
		return nil
	}

	// Check if already processed
	exists, err := m.storage.Exists(ctx, "promotion", event.ID)
	if err != nil {
		return err
	}
	if exists {
		return nil
	}

	if err := m.storage.StorePromotion(ctx, event, data, block_height, d_tag, coordinate); err != nil {
		return err
	}

	// Optionally trigger matching
	// (promotion -> attention matching not implemented in this basic version)

	return nil
}

// handleAttention processes attention events.
func (m *Marketplace) handleAttention(ctx context.Context, event *nostr.Event, data *core.AttentionData) error {
	block_height := extractBlockHeight(event)
	d_tag := extractDTag(event)
	coordinate := buildCoordinate(event)

	if block_height == 0 || d_tag == "" || coordinate == "" {
		return nil
	}

	// Check if already processed
	exists, err := m.storage.Exists(ctx, "attention", event.ID)
	if err != nil {
		return err
	}
	if exists {
		return nil
	}

	if err := m.storage.StoreAttention(ctx, event, data, block_height, d_tag, coordinate); err != nil {
		return err
	}

	// Trigger matching
	if m.config.AutoMatch {
		return m.tryMatchAttention(ctx, event, data, coordinate, block_height)
	}

	return nil
}

// handleMatch processes match events.
func (m *Marketplace) handleMatch(ctx context.Context, event *nostr.Event, data *core.MatchData) error {
	block_height := extractBlockHeight(event)
	d_tag := extractDTag(event)
	coordinate := buildCoordinate(event)

	if block_height == 0 || d_tag == "" || coordinate == "" {
		return nil
	}

	// Check if already processed
	exists, err := m.storage.Exists(ctx, "match", event.ID)
	if err != nil {
		return err
	}
	if exists {
		return nil
	}

	return m.storage.StoreMatch(ctx, event, data, block_height, d_tag, coordinate)
}

// handleBlock processes block events.
func (m *Marketplace) handleBlock(ctx context.Context, block_height int64, block_hash string) error {
	m.mu.Lock()
	m.currentBlockHeight = block_height
	m.currentBlockHash = block_hash
	m.mu.Unlock()

	// Auto-publish marketplace event
	if m.config.AutoPublishMarketplace {
		// Marketplace event publishing would be implemented here
		// This is a simplified version
	}

	return nil
}

// tryMatchAttention attempts to match an attention offer with promotions.
func (m *Marketplace) tryMatchAttention(ctx context.Context, attention_event *nostr.Event, attention_data *core.AttentionData, attention_coordinate string, block_height int64) error {
	// Extract marketplace coordinate from attention event
	marketplace_coordinate := extractMarketplaceCoordinate(attention_event)
	if marketplace_coordinate == "" {
		return nil
	}

	// Query matching promotions
	promotions, err := m.storage.QueryPromotions(ctx, QueryPromotionsParams{
		MarketplaceCoordinate: marketplace_coordinate,
		MinBid:                attention_data.Ask,
		MinDuration:           attention_data.MinDuration,
		MaxDuration:           attention_data.MaxDuration,
		BlockHeight:           block_height,
	})
	if err != nil {
		return err
	}

	if len(promotions) == 0 {
		return nil
	}

	// Build candidates
	candidates := make([]MatchCandidate, len(promotions))
	for i, p := range promotions {
		candidates[i] = MatchCandidate{
			PromotionEvent:      p.Event,
			PromotionData:       p.Data,
			PromotionCoordinate: p.Coordinate,
			AttentionEvent:      attention_event,
			AttentionData:       attention_data,
			AttentionCoordinate: attention_coordinate,
		}
	}

	// Find matches using custom matching logic
	matches, err := m.matcher.FindMatches(ctx, candidates)
	if err != nil {
		return err
	}

	// Create and publish matches
	for _, match := range matches {
		if err := m.createAndPublishMatch(ctx, match, block_height); err != nil {
			// Log but continue
			continue
		}
	}

	return nil
}

// createAndPublishMatch creates a match event and publishes it.
func (m *Marketplace) createAndPublishMatch(ctx context.Context, candidate MatchCandidate, block_height int64) error {
	// Match creation and publishing would be implemented here
	// This is a simplified version that just logs
	_ = ctx
	_ = candidate
	_ = block_height
	return nil
}

// Start starts the marketplace.
func (m *Marketplace) Start(ctx context.Context) error {
	return m.framework.Connect(ctx)
}

// Stop stops the marketplace.
func (m *Marketplace) Stop() {
	m.framework.Disconnect()
}

// Framework returns the underlying framework instance.
func (m *Marketplace) Framework() *framework.Attn {
	return m.framework
}

// BlockHeight returns the current block height.
func (m *Marketplace) BlockHeight() int64 {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.currentBlockHeight
}

// Helper functions

func extractBlockHeight(event *nostr.Event) int64 {
	for _, tag := range event.Tags {
		if len(tag) >= 2 && tag[0] == "t" {
			var height int64
			fmt.Sscanf(tag[1], "%d", &height)
			return height
		}
	}
	return 0
}

func extractDTag(event *nostr.Event) string {
	for _, tag := range event.Tags {
		if len(tag) >= 2 && tag[0] == "d" {
			return tag[1]
		}
	}
	return ""
}

func buildCoordinate(event *nostr.Event) string {
	d_tag := extractDTag(event)
	if d_tag == "" {
		return ""
	}
	return fmt.Sprintf("%d:%s:%s", event.Kind, event.PubKey, d_tag)
}

func extractMarketplaceCoordinate(event *nostr.Event) string {
	for _, tag := range event.Tags {
		if len(tag) >= 2 && tag[0] == "a" {
			// Check if it's a marketplace coordinate (38188:...)
			if len(tag[1]) > 6 && tag[1][:6] == "38188:" {
				return tag[1]
			}
		}
	}
	return ""
}
