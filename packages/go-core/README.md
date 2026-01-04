# @attn/go-core

Core constants and types for ATTN Protocol in Go.

## Overview

This package provides the foundational types and constants used across all ATTN Protocol Go packages. It mirrors the TypeScript `@attn/ts-core` package.

## Installation

```bash
go get github.com/joinnextblock/attn-protocol/go-core
```

## Usage

```go
package main

import (
    "fmt"
    core "github.com/joinnextblock/attn-protocol/go-core"
)

func main() {
    // Use event kind constants
    fmt.Println("Promotion kind:", core.KindPromotion) // 38388

    // Check if a kind is ATTN Protocol
    if core.IsATTNKind(38388) {
        fmt.Println("This is an ATTN event kind")
    }

    // Get all ATTN kinds for filtering
    kinds := core.AllATTNKinds()
    fmt.Println("All ATTN kinds:", kinds)
}
```

## Constants

### Event Kinds

| Constant | Value | Description |
|----------|-------|-------------|
| `KindMarketplace` | 38188 | Marketplace registration/update |
| `KindBillboard` | 38288 | Billboard (ad slot) registration |
| `KindPromotion` | 38388 | Promotion (ad) submission |
| `KindAttention` | 38488 | Attention offer from users |
| `KindBillboardConfirmation` | 38588 | Billboard confirms a match |
| `KindAttentionConfirmation` | 38688 | Attention provider confirms a match |
| `KindMarketplaceConfirmation` | 38788 | Marketplace confirms both parties agreed |
| `KindMatch` | 38888 | Match pairing promotion with attention |
| `KindAttentionPaymentConfirmation` | 38988 | Payment confirmation from attention provider |

### City Protocol

| Constant | Value | Description |
|----------|-------|-------------|
| `KindCityBlock` | 38808 | Bitcoin block arrival (published by City Protocol) |

### NIP-51 List Types

| Constant | Value |
|----------|-------|
| `NIP51BlockedPromotions` | `org.attnprotocol:promotion:blocked` |
| `NIP51BlockedPromoters` | `org.attnprotocol:promoter:blocked` |
| `NIP51TrustedBillboards` | `org.attnprotocol:billboard:trusted` |
| `NIP51TrustedMarketplaces` | `org.attnprotocol:marketplace:trusted` |

## Types

### Event Content Types

- `MarketplaceData` - MARKETPLACE event content (kind 38188)
- `BillboardData` - BILLBOARD event content (kind 38288)
- `PromotionData` - PROMOTION event content (kind 38388)
- `AttentionData` - ATTENTION event content (kind 38488)
- `MatchData` - MATCH event content (kind 38888)
- `BillboardConfirmationData` - BILLBOARD_CONFIRMATION event content (kind 38588)
- `AttentionConfirmationData` - ATTENTION_CONFIRMATION event content (kind 38688)
- `MarketplaceConfirmationData` - MARKETPLACE_CONFIRMATION event content (kind 38788)
- `AttentionPaymentConfirmationData` - ATTENTION_PAYMENT_CONFIRMATION event content (kind 38988)
- `CityBlockData` - City Protocol BLOCK event content (kind 38808)

### Utility Types

- `BlockHeight` - Bitcoin block height (int64)
- `Pubkey` - Nostr public key (string)
- `EventID` - Nostr event ID (string)
- `RelayURL` - Nostr relay WebSocket URL (string)

## Related Packages

- `@attn/go-framework` - Hook-based framework for event processing
- `@attn/go-sdk` - Event builders and validators
- `@attn/go-marketplace` - Marketplace lifecycle layer

## License

MIT
