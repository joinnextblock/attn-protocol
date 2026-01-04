# @attn/go-marketplace

Marketplace lifecycle layer on top of `@attn/go-framework`. Bring your own storage implementation.

## Overview

This package provides a marketplace lifecycle layer that handles:
- Storing and querying events (bring your own storage)
- Matching promotions with attention offers
- Publishing matches and confirmations
- Block-boundary processing

This package mirrors the TypeScript `@attn/ts-marketplace` package.

## Installation

```bash
go get github.com/joinnextblock/attn-protocol/go-marketplace
```

## Quick Start

```go
package main

import (
    "context"
    "log"

    "github.com/joinnextblock/attn-protocol/go-marketplace"
)

func main() {
    // Create storage (implement the Storage interface)
    storage := NewMyStorage()

    // Create matcher (or use SimpleMatcher)
    matcher := &marketplace.SimpleMatcher{}

    // Create marketplace
    mp := marketplace.New(marketplace.Config{
        PrivateKey:             "your-private-key-hex",
        MarketplaceID:          "my-marketplace",
        Name:                   "My Go Marketplace",
        NodePubkey:             "node-pubkey-hex",
        AutoMatch:              true,
        AutoPublishMarketplace: true,
        RelayConfig: marketplace.RelayConfig{
            ReadNoAuth:  []string{"wss://relay.example.com"},
            WriteNoAuth: []string{"wss://relay.example.com"},
        },
    }, storage, matcher)

    // Start marketplace
    ctx := context.Background()
    if err := mp.Start(ctx); err != nil {
        log.Fatal(err)
    }

    // Run until interrupted
    select {}
}
```

## Storage Interface

You must implement the `Storage` interface to bring your own storage backend:

```go
type Storage interface {
    // Store events
    StoreBillboard(ctx context.Context, event *nostr.Event, data *core.BillboardData, block_height int64, d_tag, coordinate string) error
    StorePromotion(ctx context.Context, event *nostr.Event, data *core.PromotionData, block_height int64, d_tag, coordinate string) error
    StoreAttention(ctx context.Context, event *nostr.Event, data *core.AttentionData, block_height int64, d_tag, coordinate string) error
    StoreMatch(ctx context.Context, event *nostr.Event, data *core.MatchData, block_height int64, d_tag, coordinate string) error

    // Query and check
    Exists(ctx context.Context, event_type string, event_id string) (bool, error)
    QueryPromotions(ctx context.Context, params QueryPromotionsParams) ([]PromotionRecord, error)
    GetAggregates(ctx context.Context) (Aggregates, error)
}
```

## Matcher Interface

Implement the `Matcher` interface for custom matching logic:

```go
type Matcher interface {
    FindMatches(ctx context.Context, candidates []MatchCandidate) ([]MatchCandidate, error)
}
```

Or use the built-in `SimpleMatcher` which returns all candidates as matches.

## Configuration

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `PrivateKey` | string | Yes | Marketplace signing key (hex or nsec) |
| `MarketplaceID` | string | Yes | Marketplace identifier |
| `Name` | string | Yes | Marketplace display name |
| `NodePubkey` | string | Yes | Node pubkey to follow for blocks |
| `Description` | string | No | Marketplace description |
| `MinDuration` | int64 | No | Minimum duration in ms (default: 15000) |
| `MaxDuration` | int64 | No | Maximum duration in ms (default: 60000) |
| `MatchFeeSats` | int64 | No | Fee per match in sats (default: 0) |
| `AutoPublishMarketplace` | bool | No | Auto-publish on block (default: false) |
| `AutoMatch` | bool | No | Auto-run matching (default: false) |
| `RelayConfig` | RelayConfig | Yes | Relay URLs configuration |

### RelayConfig

| Option | Type | Description |
|--------|------|-------------|
| `ReadAuth` | []string | Relay URLs for reading events (require NIP-42 auth) |
| `ReadNoAuth` | []string | Relay URLs for reading events (no auth required) |
| `WriteAuth` | []string | Relay URLs for writing events (require NIP-42 auth) |
| `WriteNoAuth` | []string | Relay URLs for writing events (no auth required) |

## In-Memory Storage Example

```go
type InMemoryStorage struct {
    mu         sync.RWMutex
    billboards map[string]*nostr.Event
    promotions map[string]*nostr.Event
    attention  map[string]*nostr.Event
    matches    map[string]*nostr.Event
}

func NewInMemoryStorage() *InMemoryStorage {
    return &InMemoryStorage{
        billboards: make(map[string]*nostr.Event),
        promotions: make(map[string]*nostr.Event),
        attention:  make(map[string]*nostr.Event),
        matches:    make(map[string]*nostr.Event),
    }
}

func (s *InMemoryStorage) StoreBillboard(ctx context.Context, event *nostr.Event, data *core.BillboardData, block_height int64, d_tag, coordinate string) error {
    s.mu.Lock()
    defer s.mu.Unlock()
    s.billboards[event.ID] = event
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

// ... implement other methods
```

## Accessing Underlying Framework

```go
// Access framework instance
mp.Framework().OnRelayConnect(func(ctx context.Context, hookCtx hooks.RelayConnectContext) error {
    fmt.Println("Connected to", hookCtx.RelayURL)
    return nil
})

// Get current block height
height := mp.BlockHeight()
```

## Related Packages

- `@attn/go-core` - Core constants and types
- `@attn/go-framework` - Hook-based framework
- `@attn/go-sdk` - Event builders and validators

## License

MIT
