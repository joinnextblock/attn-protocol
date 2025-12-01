# Event Flow: Block Event to Marketplace Confirmation

This document illustrates the complete event flow in the ATTN Protocol, from the foundational BLOCK event through to final MARKETPLACE_CONFIRMATION settlement.

## Overview

The ATTN Protocol operates on a block-synchronized architecture where Bitcoin block events (kind 38088) establish the timing primitive for all marketplace operations. All events include a `["t", "<block_height>"]` tag for block-based filtering and synchronization.

## Complete Event Flow Diagram

```mermaid
sequenceDiagram
    participant Bitcoin Node as Bitcoin Node Service
    participant Relay as Nostr Relay
    participant Marketplace as Marketplace Service
    participant Billboard as Billboard Operator
    participant Promoter as Promotion Creator
    participant Viewer as Attention Owner

    Note over Bitcoin Node: New Bitcoin block confirmed
    Bitcoin Node->>Relay: BLOCK event (38088)<br/>["t", "<block_height>"]<br/>height, hash, time

    Note over Relay: Block event triggers<br/>block synchronization

    Relay->>Marketplace: Forwards BLOCK event
    Relay->>Billboard: Forwards BLOCK event

    Note over Marketplace: before_new_block hook
    Note over Marketplace: on_new_block hook
    Note over Marketplace: after_new_block hook

    Note over Marketplace,Billboard: Setup Phase (can occur before block)
    Marketplace->>Relay: MARKETPLACE event (38188)<br/>["d", "<marketplace_id>"]<br/>["t", "<block_height>"]<br/>name, kind_list, min/max_duration
    Billboard->>Relay: BILLBOARD event (38288)<br/>["d", "<billboard_id>"]<br/>["a", "<marketplace_coordinate>"]<br/>["t", "<block_height>"]

    Relay->>Marketplace: Forwards MARKETPLACE
    Relay->>Marketplace: Forwards BILLBOARD

    Note over Marketplace,Billboard: Matching Phase
    Promoter->>Relay: PROMOTION event (38388)<br/>["d", "<promotion_id>"]<br/>["a", "<marketplace_coordinate>"]<br/>["a", "<billboard_coordinate>"]<br/>["t", "<block_height>"]<br/>bid, duration, event_id

    Relay->>Marketplace: Forwards PROMOTION

    Viewer->>Relay: ATTENTION event (38488)<br/>["d", "<attention_id>"]<br/>["a", "<marketplace_coordinate>"]<br/>["t", "<block_height>"]<br/>ask, min/max_duration, kind_list

    Relay->>Marketplace: Forwards ATTENTION

    Note over Marketplace: Matching engine evaluates:<br/>bid ≥ ask AND<br/>duration within range
    Marketplace->>Relay: MATCH event (38888)<br/>["d", "<match_id>"]<br/>["a", "<marketplace_coordinate>"]<br/>["a", "<promotion_coordinate>"]<br/>["a", "<attention_coordinate>"]<br/>["a", "<billboard_coordinate>"]<br/>["t", "<block_height>"]<br/>bid, ask, duration

    Relay->>Billboard: Forwards MATCH
    Relay->>Viewer: Forwards MATCH
    Relay->>Promoter: Forwards MATCH

    Note over Billboard: Displays promotion<br/>to attention owner
    Note over Billboard: Verifies viewing duration

    Note over Marketplace,Billboard: Confirmation Phase
    Billboard->>Relay: BILLBOARD_CONFIRMATION (38588)<br/>["a", "<all_coordinates>"]<br/>["e", "<marketplace_event_id>"]<br/>["e", "<promotion_event_id>"]<br/>["e", "<attention_event_id>"]<br/>["e", "<match_event_id>"]<br/>["t", "<block_height>"]<br/>block, price

    Relay->>Marketplace: Forwards BILLBOARD_CONFIRMATION

    Viewer->>Relay: ATTENTION_CONFIRMATION (38688)<br/>["a", "<all_coordinates>"]<br/>["e", "<marketplace_event_id>"]<br/>["e", "<promotion_event_id>"]<br/>["e", "<attention_event_id>"]<br/>["e", "<match_event_id>"]<br/>["t", "<block_height>"]<br/>block, price, sats_delivered

    Relay->>Marketplace: Forwards ATTENTION_CONFIRMATION

    Note over Marketplace: Both confirmations received:<br/>BILLBOARD_CONFIRMATION +<br/>ATTENTION_CONFIRMATION

    Marketplace->>Relay: MARKETPLACE_CONFIRMATION (38788)<br/>["a", "<all_coordinates>"]<br/>["e", "<marketplace_event_id>"]<br/>["e", "<promotion_event_id>"]<br/>["e", "<attention_event_id>"]<br/>["e", "<match_event_id>"]<br/>["e", "<billboard_confirmation_event_id>"]<br/>["e", "<attention_confirmation_event_id>"]<br/>["t", "<block_height>"]<br/>block, sats_settled, payout_breakdown

    Relay->>Billboard: Forwards MARKETPLACE_CONFIRMATION
    Relay->>Viewer: Forwards MARKETPLACE_CONFIRMATION
    Relay->>Promoter: Forwards MARKETPLACE_CONFIRMATION

    Viewer->>Relay: ATTENTION_PAYMENT_CONFIRMATION (38988)<br/>["a", "<all_coordinates>"]<br/>["e", "<marketplace_confirmation_event_id>", "", "marketplace_confirmation"]<br/>["e", "<match_event_id>"]<br/>["t", "<block_height>"]<br/>sats_received, payment_proof?

    Relay->>Marketplace: Forwards ATTENTION_PAYMENT_CONFIRMATION
    Relay->>Billboard: Forwards ATTENTION_PAYMENT_CONFIRMATION
    Relay->>Promoter: Forwards ATTENTION_PAYMENT_CONFIRMATION

    Note over Marketplace,Viewer: Payment confirmation complete.<br/>Settlement verified by attention owner.
```

## Flow Explanation

### 1. Block Synchronization (Foundation)

The **BLOCK event (38088)** is published by Bitcoin node services immediately after a new Bitcoin block is confirmed. This event:
- Contains block height, hash, and timestamp
- Includes `["t", "<block_height>"]` tag for filtering
- Triggers block synchronization hooks in marketplace services:
  - `before_new_block` - Prepare state
  - `on_new_block` - Process block event
  - `after_new_block` - Finalize block processing

All subsequent events reference this block height via their `["t", "<block_height>"]` tags, ensuring deterministic state snapshots per block.

### 2. Setup Phase

**MARKETPLACE (38188)** and **BILLBOARD (38288)** events establish the marketplace infrastructure:
- Marketplace defines parameters (min/max duration, supported event kinds)
- Billboard announces its presence within a marketplace
- These can be published before or after block events
- Billboard references marketplace via coordinate `["a", "<marketplace_coordinate>"]` tag

### 3. Matching Phase

**PROMOTION (38388)** and **ATTENTION (38488)** events represent supply and demand:
- Promotion creators publish bids (total satoshis for duration)
- Attention owners publish asks (total satoshis for duration)
- Both reference marketplace and include duration preferences

**MATCH (38888)** is created by marketplace services when:
- `bid ≥ ask` (price compatibility)
- Promotion duration falls within attention owner's min/max range
- All parties are linked via coordinate `["a", "..."]` tags

### 4. Confirmation Phase

The confirmation chain creates an auditable settlement trail:

1. **BILLBOARD_CONFIRMATION (38588)**: Billboard operator verifies the promotion was viewed for the required duration
   - References all previous events via `["e", "..."]` tags
   - Includes all coordinates via `["a", "..."]` tags

2. **ATTENTION_CONFIRMATION (38688)**: Attention owner confirms receipt and payment
   - References all previous events via `["e", "..."]` tags
   - Includes all coordinates via `["a", "..."]` tags
   - May include `sats_delivered` as proof

3. **MARKETPLACE_CONFIRMATION (38788)**: Final settlement event published after both confirmations are received
   - References all previous events including both confirmations via `["e", "..."]` tags
   - Includes `sats_settled` and `payout_breakdown` for transparency
   - Marketplace claims payment has been sent

4. **ATTENTION_PAYMENT_CONFIRMATION (38988)**: Attention owner attestation of payment receipt
   - References MARKETPLACE_CONFIRMATION event via `["e", "..."]` tag with `marketplace_confirmation` marker
   - Includes `sats_received` (required) and optional `payment_proof` (Lightning invoice, tx ID, etc.)
   - References all previous events via `["e", "..."]` tags
   - Includes all coordinates via `["a", "..."]` tags
   - Completes the payment confirmation chain

## Key Event Kinds Reference

| Kind | Name | Published By | Purpose |
|------|------|-------------|---------|
| 38088 | BLOCK | Bitcoin node services | Timing primitive, block synchronization |
| 38188 | MARKETPLACE | Marketplace operators | Marketplace definition and parameters |
| 38288 | BILLBOARD | Billboard operators | Billboard announcement within marketplace |
| 38388 | PROMOTION | Promotion creators | Promotion request with bid and duration |
| 38488 | ATTENTION | Attention owners | Viewer availability with ask and duration range |
| 38888 | MATCH | Marketplace services | Match between promotion and attention |
| 38588 | BILLBOARD_CONFIRMATION | Billboard operators | Billboard attestation of successful view |
| 38688 | ATTENTION_CONFIRMATION | Attention owners | Attention owner attestation of viewing |
| 38788 | MARKETPLACE_CONFIRMATION | Marketplace operators | Final settlement after both confirmations |
| 38988 | ATTENTION_PAYMENT_CONFIRMATION | Attention owners | Attention owner attestation of payment receipt |

## Tag Structure

### Block Height Synchronization
All events include `["t", "<block_height>"]` tag for:
- Block-based filtering: `{ kinds: [38388], "#t": ["862626"] }`
- Deterministic state snapshots per block
- Synchronization across services

### Coordinate References (`a` tags)
Events reference related entities via coordinates:
- Format: `["a", "<kind>:<pubkey>:<identifier>"]`
- Example: `["a", "38188:<marketplace_pubkey>:marketplace_001"]`
- Links marketplace, billboard, promotion, attention, and match events

### Event References (`e` tags)
Confirmation events reference all previous events:
- BILLBOARD_CONFIRMATION references: marketplace, promotion, attention, match
- ATTENTION_CONFIRMATION references: marketplace, promotion, attention, match
- MARKETPLACE_CONFIRMATION references: all previous events including both confirmations
- ATTENTION_PAYMENT_CONFIRMATION references: MARKETPLACE_CONFIRMATION (with `marketplace_confirmation` marker), marketplace, promotion, attention, match

## Block-by-Block Snapshot Architecture

Each Bitcoin block represents a sealed snapshot of marketplace state:
- Events are grouped by block height
- No accumulation across blocks
- Each block is a complete, frozen moment
- Services process events per block for deterministic state

## Related Documentation

- **[ATTN-01 Specification](./ATTN-01.md)**: Complete event schemas, tag specifications, and requirements
- **[Protocol User Guide](./README.md)**: User-facing documentation and workflow examples
- **[Framework Hooks](../../framework/HOOKS.md)**: Hook execution order and lifecycle stages

