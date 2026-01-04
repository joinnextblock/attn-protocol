# @attn/go-sdk

TypeScript SDK for creating and publishing ATTN Protocol events on Nostr.

## Overview

The ATTN Go SDK provides event builders for all ATTN Protocol event types. It handles event creation, signing, and publishing to Nostr relays.

This package mirrors the TypeScript `@attn/ts-sdk` package.

## Installation

```bash
go get github.com/joinnextblock/attn-protocol/go-sdk
```

## Quick Start

```go
package main

import (
    "context"
    "fmt"
    "log"

    "github.com/joinnextblock/attn-protocol/go-sdk/events"
    "github.com/joinnextblock/attn-protocol/go-sdk/relay"
)

func main() {
    privateKey := "your-64-char-hex-private-key"

    // Create a promotion event
    event, err := events.CreatePromotion(privateKey, events.PromotionParams{
        Duration:              30000,
        Bid:                   1000,
        MarketplaceCoordinate: "38188:pubkey:my-marketplace",
        BillboardCoordinate:   "38288:pubkey:my-billboard",
        BlockHeight:           870000,
        PromotionID:           "my-promotion-1",
    })
    if err != nil {
        log.Fatal(err)
    }

    fmt.Println("Created promotion event:", event.ID)

    // Publish to relay
    ctx := context.Background()
    result, err := relay.PublishToRelay(ctx, event, "wss://relay.example.com")
    if err != nil {
        log.Fatal(err)
    }

    fmt.Println("Published:", result.Success)
}
```

## Event Builders

### Promotion Events

```go
event, err := events.CreatePromotion(privateKey, events.PromotionParams{
    Duration:              30000,      // 30 seconds
    Bid:                   1000,       // 1000 sats
    EventID:               "content-event-id",
    CallToAction:          "Visit Now",
    CallToActionURL:       "https://example.com",
    MarketplaceCoordinate: "38188:pubkey:marketplace-id",
    BillboardCoordinate:   "38288:pubkey:billboard-id",
    BlockHeight:           870000,
    PromotionID:           "unique-promotion-id",
})
```

### Attention Events

```go
event, err := events.CreateAttention(privateKey, events.AttentionParams{
    Ask:                   500,        // 500 sats minimum
    MinDuration:           15000,      // 15 seconds
    MaxDuration:           60000,      // 60 seconds
    MarketplaceCoordinate: "38188:pubkey:marketplace-id",
    BlockHeight:           870000,
    AttentionID:           "unique-attention-id",
})
```

### Marketplace Events

```go
event, err := events.CreateMarketplace(privateKey, events.MarketplaceParams{
    Name:                "My Marketplace",
    Description:         "A marketplace for attention",
    AdminPubkey:         adminPubkey,
    MinDuration:         15000,
    MaxDuration:         60000,
    MatchFeeSats:        10,
    ConfirmationFeeSats: 5,
    MarketplaceID:       "my-marketplace",
    BlockHeight:         870000,
    KindList:            []int{34236},
    RelayList:           []string{"wss://relay.example.com"},
})
```

### Match Events

```go
event, err := events.CreateMatch(privateKey, events.MatchParams{
    MatchID:               "unique-match-id",
    BlockHeight:           870000,
    MarketplaceCoordinate: "38188:pubkey:marketplace-id",
    BillboardCoordinate:   "38288:pubkey:billboard-id",
    PromotionCoordinate:   "38388:pubkey:promotion-id",
    AttentionCoordinate:   "38488:pubkey:attention-id",
    MarketplacePubkey:     marketplacePubkey,
    BillboardPubkey:       billboardPubkey,
    PromotionPubkey:       promotionPubkey,
    AttentionPubkey:       attentionPubkey,
})
```

## Publishing Events

### Single Relay

```go
result, err := relay.PublishToRelay(ctx, event, "wss://relay.example.com")
if err != nil {
    log.Fatal(err)
}
fmt.Printf("Success: %v, Error: %v\n", result.Success, result.Error)
```

### Multiple Relays

```go
results, err := relay.PublishToMultiple(ctx, event, []string{
    "wss://relay1.example.com",
    "wss://relay2.example.com",
})
if err != nil {
    log.Printf("Failed on all relays: %v\n", err)
}
fmt.Printf("Success: %d, Failed: %d\n", results.SuccessCount, results.FailureCount)
```

### Using a Relay Pool

```go
pool, err := relay.NewPool([]string{
    "wss://relay1.example.com",
    "wss://relay2.example.com",
})
if err != nil {
    log.Fatal(err)
}
defer pool.Close()

if err := pool.Connect(ctx); err != nil {
    log.Fatal(err)
}

if err := pool.Publish(ctx, event); err != nil {
    log.Fatal(err)
}
```

## Event Types

| Kind | Event Type | Builder Function |
|------|------------|------------------|
| 38188 | MARKETPLACE | `events.CreateMarketplace` |
| 38288 | BILLBOARD | `events.CreateBillboard` |
| 38388 | PROMOTION | `events.CreatePromotion` |
| 38488 | ATTENTION | `events.CreateAttention` |
| 38888 | MATCH | `events.CreateMatch` |
| 38588 | BILLBOARD_CONFIRMATION | `events.CreateBillboardConfirmation` |
| 38688 | ATTENTION_CONFIRMATION | `events.CreateAttentionConfirmation` |
| 38788 | MARKETPLACE_CONFIRMATION | `events.CreateMarketplaceConfirmation` |
| 38988 | ATTENTION_PAYMENT_CONFIRMATION | `events.CreateAttentionPaymentConfirmation` |

## Related Packages

- `@attn/go-core` - Core constants and types
- `@attn/go-framework` - Hook-based framework for event processing
- `@attn/go-marketplace` - Marketplace lifecycle layer

## License

MIT
