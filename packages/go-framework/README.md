# @attn/go-framework

Hook-based framework for building Bitcoin-native attention marketplace implementations using the ATTN Protocol on Nostr.

## Overview

The ATTN Go Framework provides a Rely-style hook system for receiving and processing ATTN Protocol events. It handles Nostr relay connections, Bitcoin block synchronization, and event lifecycle management, allowing you to focus on implementing your marketplace logic.

This package mirrors the TypeScript `@attn/ts-framework` package.

## Installation

```bash
go get github.com/joinnextblock/attn-protocol/go-framework
```

## Quick Start

```go
package main

import (
    "context"
    "fmt"
    "log"

    "github.com/joinnextblock/attn-protocol/go-framework"
    "github.com/joinnextblock/attn-protocol/go-framework/hooks"
)

func main() {
    // Create framework instance
    attn := framework.NewAttn(framework.Config{
        RelaysNoAuth:      []string{"wss://relay.example.com"},
        PrivateKey:        privateKeyBytes,
        DeduplicateEvents: true,
    })

    // Register event handlers
    attn.OnPromotionEvent(func(ctx context.Context, hookCtx hooks.PromotionEventContext) error {
        fmt.Printf("New promotion: %s (bid: %d sats)\n", hookCtx.EventID, hookCtx.PromotionData.Bid)
        return nil
    })

    attn.OnAttentionEvent(func(ctx context.Context, hookCtx hooks.AttentionEventContext) error {
        fmt.Printf("New attention: %s (ask: %d sats)\n", hookCtx.EventID, hookCtx.AttentionData.Ask)
        return nil
    })

    attn.OnBlockEvent(func(ctx context.Context, hookCtx hooks.BlockEventContext) error {
        fmt.Printf("New block: %d (%s)\n", hookCtx.BlockHeight, hookCtx.BlockHash)
        return nil
    })

    // Connect to relays
    ctx := context.Background()
    if err := attn.Connect(ctx); err != nil {
        log.Fatal(err)
    }

    // Run until interrupted
    select {}
}
```

## Configuration

```go
type Config struct {
    // Relay URLs requiring NIP-42 authentication
    RelaysAuth []string

    // Relay URLs not requiring authentication
    RelaysNoAuth []string

    // Write relay URLs requiring NIP-42 auth
    RelaysWriteAuth []string

    // Write relay URLs not requiring auth
    RelaysWriteNoAuth []string

    // 32-byte private key for signing events
    PrivateKey []byte

    // Trusted node pubkeys for block events
    NodePubkeys []string

    // Filter events by marketplace pubkeys
    MarketplacePubkeys []string

    // Filter events by billboard pubkeys
    BillboardPubkeys []string

    // Filter events by advertiser pubkeys
    AdvertiserPubkeys []string

    // Enable automatic reconnection on disconnect
    AutoReconnect bool

    // Enable event deduplication
    DeduplicateEvents bool
}
```

## Hook System

The framework provides hooks for all stages of the attention marketplace lifecycle:

### Infrastructure Hooks
- `OnRelayConnect` - Relay connection established
- `OnRelayDisconnect` - Relay connection lost

### Block Event Hooks
- `BeforeBlockEvent` - Before block processing
- `OnBlockEvent` - Block event received
- `AfterBlockEvent` - After block processing

### ATTN Protocol Event Hooks
- `OnMarketplaceEvent` - Marketplace registration/update
- `OnBillboardEvent` - Billboard registration
- `OnPromotionEvent` - Promotion submission
- `OnAttentionEvent` - Attention offer
- `OnMatchEvent` - Match created

### Confirmation Event Hooks
- Billboard, Attention, Marketplace, and Payment confirmations

## Hook Context Types

Each hook receives a typed context:

```go
// Block events
type BlockEventContext struct {
    BaseContext
    BlockHeight int64
    BlockHash   string
    BlockData   *core.CityBlockData
}

// Promotion events
type PromotionEventContext struct {
    BaseContext
    EventID       string
    Pubkey        string
    PromotionData *core.PromotionData
}

// Attention events
type AttentionEventContext struct {
    BaseContext
    EventID       string
    Pubkey        string
    AttentionData *core.AttentionData
}
```

## Related Packages

- `@attn/go-core` - Core constants and types
- `@attn/go-sdk` - Event builders and validators
- `@attn/go-marketplace` - Marketplace lifecycle layer

## License

MIT
