# ATTN SDK

TypeScript SDK for creating and publishing ATTN Protocol events on Nostr.

## Overview

The ATTN SDK provides type-safe event creation and publishing for the ATTN Protocol. It complements the `attn` framework (which receives/processes events) by providing event creation and publishing capabilities.

## Installation

```bash
npm install @attn-protocol/sdk
```

## Quick Start

```typescript
import { AttnSdk } from "@attn-protocol/sdk";

// Initialize SDK with private key (hex or nsec format)
const sdk = new AttnSdk({
  private_key: "your_private_key_here", // hex or nsec
});

// Create and publish a BLOCK event for the current height
const block_event = sdk.create_block({
  height: 862626,
  hash: "00000000000000000001a7c...",
  time: 1732680000,
  tx_count: 2345,
  difficulty: "97345261772782.69",
  size: 1234567,
  weight: 3999999,
  version: 2,
  merkle_root: "1111...",
  nonce: 1234567890,
  block_identifier: "node-service-alpha:block#862626",
});
await sdk.publish(block_event, "wss://relay.attnprotocol.org");

// Create and publish a PROMOTION event that matches ATTN-01
const promotion_event = sdk.create_promotion({
  promotion_id: "promotion-001", // d tag + content identifier
  duration: 30_000, // milliseconds
  bid: 5_000, // sats for the full duration
  event_id: "video_event_id_here",
  description: "Watch my amazing content",
  call_to_action: "Watch Now",
  call_to_action_url: "https://example.com/watch",
  marketplace_coordinate: "38188:marketplace_pubkey:marketplace_001",
  video_coordinate: "34236:video_author_pubkey:video_d_tag",
  billboard_coordinate: "38288:billboard_pubkey:billboard_001",
  marketplace_pubkey: "marketplace_pubkey_hex",
  promotion_pubkey: sdk.get_public_key(),
  relays: ["wss://relay.attnprotocol.org"],
  kind: 34236, // promoted kind (k tag)
  url: "https://example.com/promotion",
  marketplace_id: "marketplace_001",
  block_height: 862626, // sets the t tag per ATTN-01
});

// Publish to a single relay
await sdk.publish(promotion_event, "wss://relay.attnprotocol.org");

// Or publish to multiple relays
await sdk.publish_to_multiple(promotion_event, [
  "wss://relay.attnprotocol.org",
  "wss://relay.attnprotocol.org",
]);
```

Every builder implements the schemas and tag layout defined in `@attn-protocol/packages/protocol/docs/ATTN-01.md`. Content fields live in the JSON payload, while routing/indexing values (identifiers, block height, coordinates) ride inside Nostr tags. Always pass the current Bitcoin `block_height` so the SDK can emit the `t` tag that powers block-synchronized filtering.

## Event Types

Each subsection restates the ATTN-01 content + tag requirements so builders stay in lockstep with the block-synchronized snapshot model. When the SDK does not yet expose a specific field/tag (for example, `relay_list` inside the PROMOTION content), treat that as a TODO before publishing—extend the helper or compose the JSON manually so every required field lands on-chain of record.

### BLOCK Event (kind 38088)

ATTN-01 content requirements:
- `height`, `hash`, `time`
- Optional: `difficulty`, `tx_count`, `size`, `weight`, `version`, `merkle_root`, `nonce`
- `node_pubkey` is derived automatically from the provided private key unless overridden
- `block_identifier` defaults to `block#<height>`; override when multiple node services co-exist

ATTN-01 tag requirements:
- `["d", block_identifier]`
- `["t", block_height]` (block height defaults to `height` unless explicitly provided)

```typescript
const block_event = sdk.create_block({
  height: 862626,
  hash: "00000000000000000001a7c...",
  time: 1732680000,
  tx_count: 2345,
  difficulty: "97345261772782.69",
  size: 1234567,
  weight: 3999999,
  version: 2,
  merkle_root: "1111...",
  nonce: 1234567890,
  block_identifier: "node-service-alpha:block#862626",
});
```

### PROMOTION Event (kind 38388)

ATTN-01 content requirements:
- `duration`, `bid`, `event_id`, `description?`, `call_to_action`, `call_to_action_url`
- `marketplace_pubkey`, `promotion_pubkey`, `marketplace_id`, `promotion_id`

ATTN-01 tag requirements:
- `["d", promotion_id]`
- `["t", block_height]`
- `["a", marketplace_coordinate]`, `["a", video_coordinate]`, `["a", billboard_coordinate]`
- `["p", marketplace_pubkey]`, `["p", promotion_pubkey]`
- Multiple `["r", relay_url]`
- `["k", kind]`
- `["u", url]`

```typescript
const promotion_event = sdk.create_promotion({
  promotion_id: "promotion-001",
  duration: 30_000,
  bid: 5_000,
  event_id: "video_event_id_here",
  description: "Watch my amazing content",
  call_to_action: "Watch Now",
  call_to_action_url: "https://example.com/watch",
  marketplace_coordinate: "38188:marketplace_pubkey:marketplace_001",
  video_coordinate: "34236:video_author_pubkey:video_d_tag",
  billboard_coordinate: "38288:billboard_pubkey:billboard_001",
  marketplace_pubkey: "marketplace_pubkey_hex",
  promotion_pubkey: sdk.get_public_key(),
  relays: ["wss://relay.attnprotocol.org"],
  kind: 34236,
  url: "https://example.com/promotion",
  marketplace_id: "marketplace_001",
  block_height: 862626,
});
```

### ATTENTION Event (kind 38488)

ATTN-01 content requirements:
- `ask`, `min_duration`, `max_duration`, `kind_list`, `relay_list`
- `attention_pubkey`, `marketplace_pubkey`, `attention_id`, `marketplace_id`
- `blocked_promotions_id`, `blocked_promoters_id` (NIP-51 list identifiers)

ATTN-01 tag requirements:
- `["d", attention_id]`
- `["t", block_height]`
- `["a", marketplace_coordinate]`
- `["a", blocked_promotions_coordinate]` (`30000:<attention_pubkey>:org.attnprotocol:promotion:blocked`)
- `["a", blocked_promoters_coordinate]` (`30000:<attention_pubkey>:org.attnprotocol:promoter:blocked`)
- `["p", attention_pubkey]`, `["p", marketplace_pubkey]`
- Multiple `["r", relay_url]`
- Multiple `["k", kind]`

```typescript
const attention_event = sdk.create_attention({
  attention_id: "attention-001",
  ask: 3_000,
  min_duration: 15_000,
  max_duration: 60_000,
  kind_list: [34236, 1, 30023],
  relay_list: ["wss://relay.attnprotocol.org"],
  marketplace_coordinate: "38188:marketplace_pubkey:marketplace_001",
  blocked_promotions_coordinate: "30000:attention_pubkey:org.attnprotocol:promotion:blocked",
  blocked_promoters_coordinate: "30000:attention_pubkey:org.attnprotocol:promoter:blocked",
  blocked_promotions_id: "org.attnprotocol:promotion:blocked",
  blocked_promoters_id: "org.attnprotocol:promoter:blocked",
  attention_pubkey: sdk.get_public_key(),
  marketplace_pubkey: "marketplace_pubkey_hex",
  relays: ["wss://relay.attnprotocol.org"],
  kinds: [34236, 1, 30023],
  marketplace_id: "marketplace_001",
  block_height: 862626,
});
```

### MATCH Event (kind 38888)

ATTN-01 content requirements:
- `ask`, `bid`, `duration`, `kind_list`, `relay_list`
- `marketplace_pubkey`, `promotion_pubkey`, `attention_pubkey`, `billboard_pubkey`
- `marketplace_id`, `billboard_id`, `promotion_id`, `attention_id`

ATTN-01 tag requirements:
- `["d", match_id]`
- `["t", block_height]`
- `["a", marketplace_coordinate]`, `["a", billboard_coordinate]`, `["a", promotion_coordinate]`, `["a", attention_coordinate]`
- `["p", marketplace_pubkey]`, `["p", promotion_pubkey]`, `["p", attention_pubkey]`, `["p", billboard_pubkey]`
- Multiple `["r", relay_url]`
- Multiple `["k", kind]`
- **Block height is mandatory**; the SDK throws if `block_height` is missing.

```typescript
const match_event = sdk.create_match({
  match_id: "match-001",
  marketplace_coordinate: "38188:marketplace_pubkey:marketplace_001",
  billboard_coordinate: "38288:billboard_pubkey:billboard_001",
  promotion_coordinate: "38388:promotion_pubkey:promotion_001",
  attention_coordinate: "38488:attention_pubkey:attention_001",
  marketplace_pubkey: "marketplace_pubkey_hex",
  promotion_pubkey: "promotion_pubkey_hex",
  attention_pubkey: "attention_pubkey_hex",
  billboard_pubkey: "billboard_pubkey_hex",
  marketplace_id: "marketplace_001",
  billboard_id: "billboard_001",
  promotion_id: "promotion_001",
  attention_id: "attention_001",
  ask: 3_000,
  bid: 5_000,
  duration: 30_000,
  kind_list: [34236],
  relay_list: ["wss://relay.attnprotocol.org"],
  relays: ["wss://relay.attnprotocol.org"],
  block_height: 862626,
});
```

### MARKETPLACE Event (kind 38188)

ATTN-01 content requirements:
- `name`, `description`, `image?`, `kind_list`, `relay_list`, `url?`
- `admin_pubkey`, `admin_email?`, `min_duration?`, `max_duration?`
- `marketplace_pubkey`, `marketplace_id`

ATTN-01 tag requirements:
- `["d", marketplace_id]`
- `["t", block_height]`
- Multiple `["k", kind]`
- `["p", marketplace_pubkey]`
- Multiple `["r", relay_url]`
- Optional `["u", website_url]`

```typescript
const marketplace_event = sdk.create_marketplace({
  marketplace_id: "marketplace-001",
  name: "Example Marketplace",
  description: "Decentralized attention marketplace",
  kind_list: [34236, 1, 30023],
  relay_list: ["wss://relay.attnprotocol.org"],
  admin_pubkey: sdk.get_public_key(),
  marketplace_pubkey: sdk.get_public_key(),
  image: "https://example.com/image.png",
  url: "https://marketplace.example.com",
  website_url: "https://marketplace.example.com",
  admin_email: "admin@example.com",
  min_duration: 15_000,
  max_duration: 60_000,
  block_height: 862626,
});
```

### BILLBOARD Event (kind 38288)

ATTN-01 content requirements:
- `name`, `description?`
- `billboard_pubkey`, `marketplace_pubkey`
- `billboard_id`, `marketplace_id`

ATTN-01 tag requirements:
- `["d", billboard_id]`
- `["t", block_height]`
- `["a", marketplace_coordinate]`
- `["p", billboard_pubkey]`, `["p", marketplace_pubkey]`
- Multiple `["r", relay_url]`
- `["k", kind]`
- `["u", url]`

```typescript
const billboard_event = sdk.create_billboard({
  billboard_id: "billboard-001",
  name: "My Billboard",
  description: "A great billboard for promotions",
  marketplace_coordinate: "38188:marketplace_pubkey:marketplace_001",
  billboard_pubkey: sdk.get_public_key(),
  marketplace_pubkey: "marketplace_pubkey_hex",
  relays: ["wss://relay.attnprotocol.org"],
  kind: 34236,
  url: "https://billboard.example.com",
  marketplace_id: "marketplace_001",
  block_height: 862626,
});
```

### BILLBOARD_CONFIRMATION Event (kind 38588)

ATTN-01 content requirements:
- `block`, `price`
- `marketplace_event_id`, `promotion_event_id`, `attention_event_id`, `match_event_id`
- `marketplace_pubkey`, `promotion_pubkey`, `attention_pubkey`, `billboard_pubkey`
- `marketplace_id`, `promotion_id`, `attention_id`, `match_id`

ATTN-01 tag requirements:
- `["a", marketplace_coordinate]`, `["a", promotion_coordinate]`, `["a", attention_coordinate]`, `["a", match_coordinate]`
- `["e", marketplace_event_id]`, `["e", promotion_event_id]`, `["e", attention_event_id]`, `["e", match_event_id]`
- `["p", marketplace_pubkey]`, `["p", promotion_pubkey]`, `["p", attention_pubkey]`, `["p", billboard_pubkey]`
- Multiple `["r", relay_url]`
- `["t", block_height]`
- `["u", url]`

```typescript
import { create_billboard_confirmation_event } from "@attn-protocol/sdk";
import { nip19 } from "nostr-tools";

const decoded = nip19.decode("nsec1...");
const private_key = decoded.data as Uint8Array;

const billboard_confirmation = create_billboard_confirmation_event(
  private_key,
  {
    block: 862626,
    price: 2_000,
    marketplace_ref: "marketplace_event_id",
    promotion_ref: "promotion_event_id",
    attention_ref: "attention_event_id",
    match_ref: "match_event_id",
    marketplace_coordinate: "38188:marketplace_pubkey:marketplace_001",
    promotion_coordinate: "38388:promotion_pubkey:promotion_001",
    attention_coordinate: "38488:attention_pubkey:attention_001",
    match_coordinate: "38888:marketplace_pubkey:match_001",
    marketplace_pubkey: "marketplace_pubkey_hex",
    promotion_pubkey: "promotion_pubkey_hex",
    attention_pubkey: "attention_pubkey_hex",
    billboard_pubkey: "billboard_pubkey_hex",
    marketplace_id: "marketplace_001",
    promotion_id: "promotion_001",
    attention_id: "attention_001",
    match_id: "match_001",
    relays: ["wss://relay.attnprotocol.org"],
    url: "https://billboard.example.com/confirmation",
  }
);
```

### VIEWER_CONFIRMATION Event (kind 38688)

ATTN-01 content requirements:
- `block`, `price`, `sats_delivered`, optional `proof_payload`
- `marketplace_event_id`, `promotion_event_id`, `attention_event_id`, `match_event_id`
- `marketplace_pubkey`, `promotion_pubkey`, `attention_pubkey`, `billboard_pubkey`
- `marketplace_id`, `promotion_id`, `attention_id`, `match_id`

ATTN-01 tag requirements:
- `["a", marketplace_coordinate]`, `["a", promotion_coordinate]`, `["a", attention_coordinate]`, `["a", match_coordinate]`
- `["e", marketplace_event_id]`, `["e", promotion_event_id]`, `["e", attention_event_id]`, `["e", match_event_id]`
- `["p", marketplace_pubkey]`, `["p", promotion_pubkey]`, `["p", attention_pubkey]`, `["p", billboard_pubkey]`
- Multiple `["r", relay_url]`
- `["t", block_height]`
- `["u", url]`

```typescript
import { create_viewer_confirmation_event } from "@attn-protocol/sdk";
import { nip19 } from "nostr-tools";

const decoded = nip19.decode("nsec1...");
const private_key = decoded.data as Uint8Array;

const viewer_confirmation = create_viewer_confirmation_event(
  private_key,
  {
    block: 862626,
    price: 3_000,
    sats_delivered: 3_000,
    proof_payload: "viewer_proof_data",
    marketplace_ref: "marketplace_event_id",
    promotion_ref: "promotion_event_id",
    attention_ref: "attention_event_id",
    match_ref: "match_event_id",
    marketplace_coordinate: "38188:marketplace_pubkey:marketplace_001",
    promotion_coordinate: "38388:promotion_pubkey:promotion_001",
    attention_coordinate: "38488:attention_pubkey:attention_001",
    match_coordinate: "38888:marketplace_pubkey:match_001",
    marketplace_pubkey: "marketplace_pubkey_hex",
    promotion_pubkey: "promotion_pubkey_hex",
    attention_pubkey: "attention_pubkey_hex",
    billboard_pubkey: "billboard_pubkey_hex",
    marketplace_id: "marketplace_001",
    promotion_id: "promotion_001",
    attention_id: "attention_001",
    match_id: "match_001",
    relays: ["wss://relay.attnprotocol.org"],
    url: "https://viewer.example.com/confirmation",
  }
);
```

### MARKETPLACE_CONFIRMATION Event (kind 38788)

ATTN-01 content requirements:
- `block`, `duration`, `ask`, `bid`, `price`, `sats_settled`
- `payout_breakdown.viewer?`, `payout_breakdown.billboard?`
- `marketplace_event_id`, `promotion_event_id`, `attention_event_id`, `match_event_id`
- `billboard_confirmation_event_id`, `viewer_confirmation_event_id`
- `marketplace_pubkey`, `promotion_pubkey`, `attention_pubkey`, `billboard_pubkey`
- `marketplace_id`, `promotion_id`, `attention_id`, `match_id`

ATTN-01 tag requirements:
- `["a", marketplace_coordinate]`, `["a", promotion_coordinate]`, `["a", attention_coordinate]`, `["a", match_coordinate]`
- `["e", marketplace_event_id]`, `["e", promotion_event_id]`, `["e", attention_event_id]`, `["e", match_event_id]`
- `["e", billboard_confirmation_event_id]`, `["e", viewer_confirmation_event_id]`
- `["p", marketplace_pubkey]`, `["p", promotion_pubkey]`, `["p", attention_pubkey]`, `["p", billboard_pubkey]`
- Multiple `["r", relay_url]`
- `["t", block_height]`
- `["u", url]`

```typescript
import { create_marketplace_confirmation_event } from "@attn-protocol/sdk";
import { nip19 } from "nostr-tools";

const decoded = nip19.decode("nsec1...");
const private_key = decoded.data as Uint8Array;

const marketplace_confirmation = create_marketplace_confirmation_event(
  private_key,
  {
    block: 862626,
    duration: 30_000,
    ask: 3_000,
    bid: 5_000,
    price: 5_000,
    sats_settled: 5_000,
    payout_breakdown: {
      viewer: 3_000,
      billboard: 2_000,
    },
    marketplace_ref: "marketplace_event_id",
    promotion_ref: "promotion_event_id",
    attention_ref: "attention_event_id",
    match_ref: "match_event_id",
    billboard_confirmation_ref: "billboard_confirmation_event_id",
    viewer_confirmation_ref: "viewer_confirmation_event_id",
    marketplace_coordinate: "38188:marketplace_pubkey:marketplace_001",
    promotion_coordinate: "38388:promotion_pubkey:promotion_001",
    attention_coordinate: "38488:attention_pubkey:attention_001",
    match_coordinate: "38888:marketplace_pubkey:match_001",
    marketplace_pubkey: "marketplace_pubkey_hex",
    promotion_pubkey: "promotion_pubkey_hex",
    attention_pubkey: "attention_pubkey_hex",
    billboard_pubkey: "billboard_pubkey_hex",
    marketplace_id: "marketplace_001",
    promotion_id: "promotion_001",
    attention_id: "attention_001",
    match_id: "match_001",
    relays: ["wss://relay.attnprotocol.org"],
    url: "https://marketplace.example.com/confirmation",
  }
);
```

**Note:** Confirmation event builders require a `Uint8Array` private key. You can decode from hex or nsec format as shown above.

## Publishing Events

### Single Relay

```typescript
const result = await sdk.publish(event, "wss://relay.attnprotocol.org");
console.log(result.success); // true or false
console.log(result.event_id); // Event ID
console.log(result.error); // Error message if failed
```

### Multiple Relays

```typescript
const results = await sdk.publish_to_multiple(event, [
  "wss://relay.attnprotocol.org",
  "wss://relay.attnprotocol.org",
]);

console.log(results.success_count); // Number of successful publishes
console.log(results.failure_count); // Number of failed publishes
console.log(results.results); // Array of individual results
```

## Private Key Formats

The SDK supports both hex and nsec (nip19) private key formats:

```typescript
// Hex format (64 hex characters)
const sdk1 = new AttnSdk({
  private_key: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
});

// Nsec format (nip19 encoded)
const sdk2 = new AttnSdk({
  private_key: "nsec1...",
});
```

### Configuration Validation

The SDK validates configuration in the constructor:

- **Private Key Validation**:
  - Hex format: Must be exactly 64 hex characters (32 bytes)
  - Nsec format: Must start with "nsec" and decode to a valid 32-byte private key
  - Uint8Array: Must be exactly 32 bytes
- **Error Handling**: Invalid private keys throw descriptive errors:
  - `"Invalid nsec format"` - Nsec decoding failed or wrong type
  - `"Invalid hex private key: must be 64 hex characters"` - Hex string wrong length
  - `"Invalid hex private key format"` - Hex string invalid format

All validation happens at construction time, ensuring the SDK instance is always in a valid state.

## Validation Utilities

The SDK includes validation utilities for event validation:

```typescript
import {
  validate_block_height,
  validate_json_content,
  validate_pubkey,
} from "@attn-protocol/sdk";

const result = validate_block_height(event);
if (!result.valid) {
  console.error(result.message);
}
```

## Type Safety

All event parameters are fully typed with TypeScript interfaces:

```typescript
import type {
  PromotionEventParams,
  AttentionEventParams,
  MatchEventParams,
} from "@attn-protocol/sdk";
```

## Bitcoin Block Height Support

All events support Bitcoin block height for block-synchronized operations:

```typescript
const event = sdk.create_promotion({
  // ... other params
  block_height: 862626, // Current Bitcoin block height
});
```

## Error Handling

All publishing methods return detailed error information:

```typescript
const result = await sdk.publish(event, relay_url);
if (!result.success) {
  console.error(`Failed to publish: ${result.error}`);
}
```

## Related Projects

- **@attn-protocol/framework**: Hook-based framework for receiving and processing ATTN Protocol events
- **@attn-protocol/protocol**: ATTN Protocol specification and documentation

## License

MIT

