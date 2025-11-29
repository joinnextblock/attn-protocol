# ATTN Framework

Hook-based framework for building Bitcoin-native attention marketplace implementations using the ATTN Protocol on Nostr.

## Overview

The ATTN Framework provides a Rely-style hook system for receiving and processing ATTN Protocol events. It handles Nostr relay connections, Bitcoin block synchronization, and event lifecycle management, allowing you to focus on implementing your marketplace logic.

The framework depends on `@attn-protocol/core` for shared constants and type definitions. Event kind constants are available from the core package for consistency across the ATTN Protocol ecosystem.

## Installation

```bash
npm install @attn-protocol/framework
```

## Quick Start

```typescript
import { Attn } from "@attn-protocol/framework";

// Basic usage
const attn = new Attn({
  relays: ["wss://relay.attnprotocol.org"],
  private_key: myPrivateKey, // Uint8Array for NIP-42
  node_pubkeys: [node_pubkey], // Trusted Bitcoin node services
});

// With marketplace filtering
const filteredAttn = new Attn({
  relays: ["wss://relay.attnprotocol.org"],
  private_key: myPrivateKey,
  node_pubkeys: [node_pubkey],
  marketplace_pubkeys: [example_marketplace_pubkey],
});

// Multiple marketplaces
const multiMarketplaceAttn = new Attn({
  relays: ["wss://relay.attnprotocol.org"],
  private_key: myPrivateKey,
  node_pubkeys: [node_pubkey],
  marketplace_pubkeys: [example_marketplace_pubkey, other_marketplace_pubkey],
});

// Register hooks for event processing
attn.on_new_marketplace(async (context) => {
  console.log("Marketplace updated:", context.event);
});

attn.on_new_promotion(async (context) => {
  console.log("New promotion received:", context.event);
});

attn.on_new_attention(async (context) => {
  console.log("New attention received:", context.event);
});

attn.on_new_block(async (context) => {
  console.log(`Block ${context.block_height} hash ${context.block_hash}`);
});

attn.before_new_block(async (context) => {
  console.log(`Preparing for block ${context.block_height}`);
});

attn.after_new_block(async (context) => {
  console.log(`Finished processing block ${context.block_height}`);
});

// Connect to all relays
await attn.connect();
```

## Core Features

### Relay Connection Management

The framework handles Nostr relay connections, including:
- WebSocket connection lifecycle
- NIP-42 authentication
- Automatic reconnection with configurable retry logic
- Connection health monitoring

### Bitcoin Block Synchronization

- Subscribes to Bitcoin node block events (kind `ATTN_EVENT_KINDS.BLOCK` / 38088)
- Filters events by trusted `node_pubkeys` for security
- Detects block gaps and surfaces them via hooks

### ATTN Protocol Event Subscriptions

- Automatically subscribes to all ATTN Protocol event kinds:
  - `ATTN_EVENT_KINDS.MARKETPLACE` (38188)
  - `ATTN_EVENT_KINDS.BILLBOARD` (38288)
  - `ATTN_EVENT_KINDS.PROMOTION` (38388)
  - `ATTN_EVENT_KINDS.ATTENTION` (38488)
  - `ATTN_EVENT_KINDS.BILLBOARD_CONFIRMATION` (38588)
  - `ATTN_EVENT_KINDS.VIEWER_CONFIRMATION` (38688)
  - `ATTN_EVENT_KINDS.MARKETPLACE_CONFIRMATION` (38788)
  - `ATTN_EVENT_KINDS.MATCH` (38888)
- Optional pubkey filtering via `marketplace_pubkeys`, `billboard_pubkeys`, or `advertiser_pubkeys`
- Emits hooks for each event type automatically

You can import event kind constants from `@attn-protocol/core`:

```typescript
import { ATTN_EVENT_KINDS } from "@attn-protocol/core";

// Use constants instead of hardcoded numbers
if (event.kind === ATTN_EVENT_KINDS.PROMOTION) {
  // Handle promotion event
}
```

### Standard Nostr Event Subscriptions

- Automatically subscribes to standard Nostr event kinds:
  - 0 (Profile Metadata)
  - 10002 (Relay List Metadata)
  - 30000 (NIP-51 Lists - trusted billboards, trusted marketplaces, blocked promotions, blocked promoters)
- Emits hooks for each event type automatically

### Event Lifecycle Hooks

The framework provides hooks for all stages of the attention marketplace lifecycle:

- **Infrastructure**: `on_relay_connect`, `on_relay_disconnect`, `on_subscription`
- **Event Reception**: `on_new_marketplace`, `on_new_billboard`, `on_new_promotion`, `on_new_attention`, `on_new_match`
- **Matching**: `on_match_published` (backward compatibility, includes promotion/attention IDs)
- **Confirmations**: `on_billboard_confirm`, `on_viewer_confirm`, `on_marketplace_confirmed`
- **Block Processing**: `before_new_block`, `on_new_block`, `after_new_block`, `on_block_gap_detected`
- **Error Handling**: `on_rate_limit`, `on_health_change`

### Standard Nostr Event Hooks

The framework also subscribes to standard Nostr events for enhanced functionality:

- **Profile Events**: `on_new_profile` (kind 0) - User profile metadata
- **Relay Lists**: `on_new_relay_list` (kind 10002) - User relay preferences
- **NIP-51 Lists**: `on_new_nip51_list` (kind 30000) - Trusted billboards, trusted marketplaces, blocked promotions

## Configuration

```typescript
interface AttnConfig {
  relays: string[];
  private_key: Uint8Array;
  node_pubkeys: string[];
  marketplace_pubkeys?: string[];
  billboard_pubkeys?: string[];
  advertiser_pubkeys?: string[];
  auto_reconnect?: boolean; // Default: true
  deduplicate?: boolean; // Default: true
  connection_timeout_ms?: number; // Default: 30000
  reconnect_delay_ms?: number; // Default: 5000
  max_reconnect_attempts?: number; // Default: 10
  auth_timeout_ms?: number; // Default: 10000
}
```

`marketplace_pubkeys`, `billboard_pubkeys`, and `advertiser_pubkeys` each scope only the event kinds that include those `p` tags (e.g., marketplace filters affect MARKETPLACE + MARKETPLACE_CONFIRMATION events, billboard filters apply to BILLBOARD + BILLBOARD_CONFIRMATION, etc.), so enabling one filter no longer hides unrelated traffic.

### Configuration Validation

The framework validates configuration at runtime:

- **Type Safety**: TypeScript interfaces ensure type correctness at compile time
- **Runtime Validation**: The framework validates required fields when methods are called:
  - `connect()` throws if no relays or no trusted `node_pubkeys` are supplied
  - Each relay URL must be a valid WebSocket endpoint
  - `private_key` must be a `Uint8Array` (32 bytes) for NIP-42 authentication
  - `node_pubkeys` and optional pubkey filters must be hex strings
  - Timing fields fall back to sane defaults if omitted

Validation errors are thrown as exceptions with descriptive error messages.

## Hook System

The framework uses a Rely-style hook system. Register handlers using `on_*` methods:

```typescript
// Register a hook handler
const handle = attn.on_new_promotion(async (context) => {
  // Process promotion event
});

// Unregister the handler
handle.unregister();
```

### Hook Context Types

All hooks provide typed context objects:

```typescript
import type {
  RelayConnectContext,
  RelayDisconnectContext,
  SubscriptionContext,
  NewMarketplaceContext,
  NewBillboardContext,
  NewPromotionContext,
  NewAttentionContext,
  NewMatchContext,
  MatchPublishedContext,
  BillboardConfirmContext,
  ViewerConfirmContext,
  MarketplaceConfirmedContext,
  NewBlockContext,
  BlockData,
  BlockGapDetectedContext,
  RateLimitContext,
  HealthChangeContext,
  NewProfileContext,
  NewRelayListContext,
  NewNip51ListContext,
} from "@attn-protocol/framework";
```

## Lifecycle

The framework follows a deterministic lifecycle sequence. See [HOOKS.md](./HOOKS.md) for detailed documentation on the hook lifecycle sequence, execution order, and when each hook fires.

## Bitcoin-Native Design

The framework is designed for Bitcoin-native operations:

- All events include `["t", "<block_height>"]` tags
- Block heights are the primary time measurement
- Block synchronization is built-in with `before_new_block` → `on_new_block` → `after_new_block` lifecycle hooks
- No wall-clock time dependencies

## Error Handling

The framework provides hooks for error scenarios:

```typescript
attn.on_relay_disconnect(async (context) => {
  console.error("Disconnected:", context.reason);
  // Handle reconnection logic
});

attn.on_rate_limit(async (context) => {
  console.warn("Rate limited:", context.relay_url || "unknown relay");
  // Implement backoff strategy
});

attn.on_health_change(async (context) => {
  console.log("Health changed:", context.health_status);
  // Update service status
});
```

## Type Safety

All hook handlers are fully typed with TypeScript:

```typescript
import type { HookHandler, NewPromotionContext } from "@attn-protocol/framework";

const handler: HookHandler<NewPromotionContext> = async (context) => {
  // context is fully typed
  const event = context.event;
  const block_height = context.block_height;
};
```

## Implementation Patterns

### Pattern 3: Block-Synchronized Processing

The framework provides hooks for block-synchronized processing, ensuring all operations align with Bitcoin block boundaries:

```typescript
import { Attn } from "@attn-protocol/framework";

const attn = new Attn({
  relays: ["wss://relay.attnprotocol.org"],
  private_key,
  node_pubkeys: [node_pubkey_hex],
});

// Framework hook pattern for block-synchronized processing
attn.before_new_block(async (context) => {
  // Prepare state for new block
  console.log(`Preparing for block ${context.block_height}`);
  await finalize_current_block_transactions();
  await prepare_state_for_new_block();
});

attn.on_new_block(async (context) => {
  // Process new block
  const block_height = context.block_height;
  const block_hash = context.block_hash;
  console.log(`Processing block ${block_height} (hash: ${block_hash})`);

  // Process all events for this block
  await process_block_snapshot(block_height);

  // Run matching engine for this block
  await run_matching_engine(block_height);
});

attn.after_new_block(async (context) => {
  // Cleanup after block processing
  console.log(`Finished processing block ${context.block_height}`);
  await reset_state_for_next_block();
  await archive_block_data(context.block_height);
});

await attn.connect();
```

This pattern ensures that:
- All state transitions happen at block boundaries
- No accumulation across blocks (snapshot architecture)
- Deterministic processing based on block height
- Clean separation between block preparation, processing, and cleanup

## Related Projects

- **@attn-protocol/core**: Core constants and types shared across all ATTN Protocol packages
- **@attn-protocol/sdk**: TypeScript SDK for creating and publishing ATTN Protocol events
- **@attn-protocol/protocol**: ATTN Protocol specification and documentation

## License

MIT
