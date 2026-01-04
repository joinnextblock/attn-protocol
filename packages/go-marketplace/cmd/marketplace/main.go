// Package main provides the entry point for the ATTN Marketplace service.
package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"sync"
	"syscall"

	"github.com/joinnextblock/attn-protocol/go-core"
	"github.com/joinnextblock/attn-protocol/go-framework/hooks"
	"github.com/joinnextblock/attn-protocol/go-marketplace"
	"github.com/nbd-wtf/go-nostr"
)

func main() {
	log.Println("Starting ATTN Marketplace Service (Go)")

	// Load configuration from environment
	config := loadConfig()

	// Create in-memory storage (can be replaced with persistent storage)
	storage := NewInMemoryStorage()

	// Create simple matcher
	matcher := &marketplace.SimpleMatcher{}

	// Create marketplace
	mp := marketplace.New(config, storage, matcher)

	// Add custom hooks
	mp.Framework().OnBlockEvent(func(ctx context.Context, hookCtx hooks.BlockEventContext) error {
		log.Printf("Block %d: %s", hookCtx.BlockHeight, hookCtx.BlockHash)
		return nil
	})

	mp.Framework().OnPromotionEvent(func(ctx context.Context, hookCtx hooks.PromotionEventContext) error {
		log.Printf("Promotion received: %s (bid: %d sats)", hookCtx.EventID, hookCtx.PromotionData.Bid)
		return nil
	})

	mp.Framework().OnAttentionEvent(func(ctx context.Context, hookCtx hooks.AttentionEventContext) error {
		log.Printf("Attention received: %s (ask: %d sats)", hookCtx.EventID, hookCtx.AttentionData.Ask)
		return nil
	})

	mp.Framework().OnMatchEvent(func(ctx context.Context, hookCtx hooks.MatchEventContext) error {
		log.Printf("Match created: %s", hookCtx.EventID)
		return nil
	})

	// Start HTTP server for health checks
	api_port := os.Getenv("CITY_MARKETPLACE_API_PORT")
	if api_port == "" {
		api_port = "8787"
	}

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, `{"status":"ok","block_height":%d}`, mp.BlockHeight())
	})

	http.HandleFunc("/stats", func(w http.ResponseWriter, r *http.Request) {
		aggregates, _ := storage.GetAggregates(r.Context())
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"billboards":%d,"promotions":%d,"attention":%d,"matches":%d}`,
			aggregates.BillboardCount, aggregates.PromotionCount,
			aggregates.AttentionCount, aggregates.MatchCount)
	})

	go func() {
		log.Printf("HTTP server listening on :%s", api_port)
		if err := http.ListenAndServe(":"+api_port, nil); err != nil {
			log.Printf("HTTP server error: %v", err)
		}
	}()

	// Start marketplace
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	if err := mp.Start(ctx); err != nil {
		log.Fatalf("Failed to start marketplace: %v", err)
	}

	log.Println("Marketplace started successfully")

	// Wait for shutdown signal
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	<-sigChan

	log.Println("Shutting down...")
	mp.Stop()
	log.Println("Goodbye!")
}

func loadConfig() marketplace.Config {
	// Parse relay URLs from environment
	parse_relays := func(env_var string) []string {
		val := os.Getenv(env_var)
		if val == "" {
			return nil
		}
		return strings.Split(val, ",")
	}

	// Get relay configurations
	read_auth := parse_relays("CITY_MARKETPLACE_RELAY_READ_AUTH")
	read_noauth := parse_relays("CITY_MARKETPLACE_RELAY_READ_NOAUTH")
	write_auth := parse_relays("CITY_MARKETPLACE_RELAY_WRITE_AUTH")
	write_noauth := parse_relays("CITY_MARKETPLACE_RELAY_WRITE_NOAUTH")

	// Default to internal relay if no relays configured
	if len(read_auth) == 0 && len(read_noauth) == 0 {
		log.Println("No relay URLs configured, using default internal relay ws://relay:8888")
		read_noauth = []string{"ws://relay:8888"}
	}
	if len(write_auth) == 0 && len(write_noauth) == 0 {
		write_noauth = []string{"ws://relay:8888"}
	}

	return marketplace.Config{
		PrivateKey:             os.Getenv("CITY_MARKETPLACE_NSEC"),
		MarketplaceID:          os.Getenv("CITY_MARKETPLACE_D_TAG"),
		Name:                   os.Getenv("CITY_MARKETPLACE_NAME"),
		Description:            os.Getenv("CITY_MARKETPLACE_DESCRIPTION"),
		NodePubkey:             os.Getenv("CITY_CLOCK_PUBKEY"),
		AutoMatch:              true,
		AutoPublishMarketplace: true,
		RelayConfig: marketplace.RelayConfig{
			ReadAuth:    read_auth,
			ReadNoAuth:  read_noauth,
			WriteAuth:   write_auth,
			WriteNoAuth: write_noauth,
		},
	}
}

// InMemoryStorage implements the marketplace.Storage interface
type InMemoryStorage struct {
	mu         sync.RWMutex
	billboards map[string]*StoredEvent
	promotions map[string]*StoredEvent
	attention  map[string]*StoredEvent
	matches    map[string]*StoredEvent
}

type StoredEvent struct {
	Event       *nostr.Event
	Data        any
	BlockHeight int64
	DTag        string
	Coordinate  string
}

func NewInMemoryStorage() *InMemoryStorage {
	return &InMemoryStorage{
		billboards: make(map[string]*StoredEvent),
		promotions: make(map[string]*StoredEvent),
		attention:  make(map[string]*StoredEvent),
		matches:    make(map[string]*StoredEvent),
	}
}

func (s *InMemoryStorage) StoreBillboard(ctx context.Context, event *nostr.Event, data *core.BillboardData, block_height int64, d_tag, coordinate string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.billboards[event.ID] = &StoredEvent{Event: event, Data: data, BlockHeight: block_height, DTag: d_tag, Coordinate: coordinate}
	log.Printf("Stored billboard: %s", event.ID)
	return nil
}

func (s *InMemoryStorage) StorePromotion(ctx context.Context, event *nostr.Event, data *core.PromotionData, block_height int64, d_tag, coordinate string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.promotions[event.ID] = &StoredEvent{Event: event, Data: data, BlockHeight: block_height, DTag: d_tag, Coordinate: coordinate}
	log.Printf("Stored promotion: %s (bid: %d)", event.ID, data.Bid)
	return nil
}

func (s *InMemoryStorage) StoreAttention(ctx context.Context, event *nostr.Event, data *core.AttentionData, block_height int64, d_tag, coordinate string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.attention[event.ID] = &StoredEvent{Event: event, Data: data, BlockHeight: block_height, DTag: d_tag, Coordinate: coordinate}
	log.Printf("Stored attention: %s (ask: %d)", event.ID, data.Ask)
	return nil
}

func (s *InMemoryStorage) StoreMatch(ctx context.Context, event *nostr.Event, data *core.MatchData, block_height int64, d_tag, coordinate string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.matches[event.ID] = &StoredEvent{Event: event, Data: data, BlockHeight: block_height, DTag: d_tag, Coordinate: coordinate}
	log.Printf("Stored match: %s", event.ID)
	return nil
}

func (s *InMemoryStorage) Exists(ctx context.Context, event_type string, event_id string) (bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	switch event_type {
	case "billboard":
		_, exists := s.billboards[event_id]
		return exists, nil
	case "promotion":
		_, exists := s.promotions[event_id]
		return exists, nil
	case "attention":
		_, exists := s.attention[event_id]
		return exists, nil
	case "match":
		_, exists := s.matches[event_id]
		return exists, nil
	}
	return false, nil
}

func (s *InMemoryStorage) QueryPromotions(ctx context.Context, params marketplace.QueryPromotionsParams) ([]marketplace.PromotionRecord, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var results []marketplace.PromotionRecord
	for _, stored := range s.promotions {
		data := stored.Data.(*core.PromotionData)
		// Filter by bid >= ask (min_bid)
		if data.Bid >= params.MinBid {
			results = append(results, marketplace.PromotionRecord{
				Event:      stored.Event,
				Data:       data,
				Coordinate: stored.Coordinate,
				DTag:       stored.DTag,
			})
		}
	}
	return results, nil
}

func (s *InMemoryStorage) GetAggregates(ctx context.Context) (marketplace.Aggregates, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return marketplace.Aggregates{
		BillboardCount: int64(len(s.billboards)),
		PromotionCount: int64(len(s.promotions)),
		AttentionCount: int64(len(s.attention)),
		MatchCount:     int64(len(s.matches)),
	}, nil
}
