# ATTN Framework

Hook-based framework for building Bitcoin-native attention marketplace implementations using the ATTN Protocol on Nostr.

## Overview

The ATTN Framework provides a Rely-style hook system for receiving and processing ATTN Protocol events. It handles Nostr relay connections, Bitcoin block synchronization, and event lifecycle management, allowing you to focus on implementing your marketplace logic.

## Installation

```bash
npm install @attn-protocol/framework
```

## Quick Start

```typescript
import { Attn } from "@attn-protocol/framework";

// Initialize framework with relay configuration
const attn = new Attn({
  relay: {
    relay_url: "wss://relay.nextblock.city",
    private_key: your_private_key, // Uint8Array for NIP-42 authentication
    bridge_pubkey_hex: bridge_service_pubkey, // Filter block events from Bridge service
    marketplace_coordinates: ["38088:pubkey:id"], // Optional: Filter ATTN Protocol events by marketplace(s)
  },
});

// Register hooks for event processing
attn.on_new_promotion(async (context) => {
  console.log("New promotion received:", context.event);
  // Your matching logic here
});

attn.on_new_attention(async (context) => {
  console.log("New attention received:", context.event);
  // Your matching logic here
});

attn.on_new_block(async (context) => {
  console.log(`New block: ${context.block_height}`);
  // Finalize matches, roll metrics, publish snapshots
});

// Connect to relay
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

- Subscribes to Bridge service block events (kind 30078)
- Filters events by Bridge service pubkey for security
- Detects block gaps and surfaces them via hooks

### ATTN Protocol Event Subscriptions

- Automatically subscribes to all ATTN Protocol event kinds:
  - 38188 (BILLBOARD)
  - 38288 (PROMOTION)
  - 38388 (ATTENTION)
  - 38488 (BILLBOARD_CONFIRMATION)
  - 38588 (VIEWER_CONFIRMATION)
  - 38688 (MARKETPLACE_CONFIRMATION)
  - 38888 (MATCH)
- Optional marketplace filtering via `marketplace_coordinates` config
- Emits hooks for each event type automatically

### Standard Nostr Event Subscriptions

- Automatically subscribes to standard Nostr event kinds:
  - 0 (Profile Metadata)
  - 10002 (Relay List Metadata)
  - 30000 (NIP-51 Lists - trusted billboards, trusted marketplaces, blocked promotions)
- Emits hooks for each event type automatically

### Event Lifecycle Hooks

The framework provides hooks for all stages of the attention marketplace lifecycle:

- **Infrastructure**: `on_relay_connect`, `on_relay_disconnect`, `on_subscription`
- **Event Reception**: `on_new_billboard`, `on_new_promotion`, `on_new_attention`, `on_new_match`
- **Matching**: `on_match_published` (backward compatibility, includes promotion/attention IDs)
- **Confirmations**: `on_billboard_confirm`, `on_viewer_confirm`, `on_marketplace_confirmed`
- **Block Processing**: `on_new_block`, `on_block_gap_detected`
- **Error Handling**: `on_rate_limit`, `on_health_change`

### Standard Nostr Event Hooks

The framework also subscribes to standard Nostr events for enhanced functionality:

- **Profile Events**: `on_new_profile` (kind 0) - User profile metadata
- **Relay Lists**: `on_new_relay_list` (kind 10002) - User relay preferences
- **NIP-51 Lists**: `on_new_nip51_list` (kind 30000) - Trusted billboards, trusted marketplaces, blocked promotions

## Configuration

```typescript
interface AttnConfig {
  relay?: {
    relay_url: string;
    private_key?: Uint8Array; // Required for NIP-42 authentication
    bridge_pubkey_hex?: string; // Bridge service pubkey (hex) for filtering kind 30078
    marketplace_coordinates?: string[]; // Optional: Filter ATTN Protocol events by marketplace(s) (format: "38088:pubkey:id")
    connection_timeout_ms?: number; // Default: 30000
    reconnect_delay_ms?: number; // Default: 5000
    max_reconnect_attempts?: number; // Default: 10
    auth_timeout_ms?: number; // Default: 10000
  };
}
```

### Configuration Validation

The framework validates configuration at runtime:

- **Type Safety**: TypeScript interfaces ensure type correctness at compile time
- **Runtime Validation**: The framework validates required fields when methods are called:
  - `connect()` throws an error if `relay` config is not provided
  - `relay_url` must be a valid WebSocket URL (validated on connection attempt)
  - `private_key` must be a `Uint8Array` (32 bytes) if provided
  - `bridge_pubkey_hex` must be a 64-character hex string if provided
  - `marketplace_coordinates` must be an array of strings in format `"38088:pubkey:id"` if provided

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
  NewBillboardContext,
  NewPromotionContext,
  NewAttentionContext,
  NewMatchContext,
  MatchPublishedContext,
  BillboardConfirmContext,
  ViewerConfirmContext,
  MarketplaceConfirmedContext,
  NewBlockContext,
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
- Block synchronization is built-in
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

## Related Projects

- **@attn-protocol/sdk**: TypeScript SDK for creating and publishing ATTN Protocol events
- **@attn-protocol/protocol**: ATTN Protocol specification and documentation

## License

MIT
