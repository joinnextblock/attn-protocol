# @attn-protocol/marketplace

Marketplace lifecycle layer on top of `@attn-protocol/framework`. Bring your own storage implementation.

## Architecture

```
Consumer Implementation (your storage, matching, etc.)
        │
        ▼
@attn-protocol/marketplace  ← Marketplace lifecycle hooks
        │
        ▼
@attn-protocol/framework    ← Base event subscription & relay management
```

## Installation

```bash
npm install @attn-protocol/marketplace
```

## Quick Start

```typescript
import { Marketplace } from '@attn-protocol/marketplace';

const marketplace = new Marketplace({
  // === Marketplace Identity ===
  private_key: process.env.MARKETPLACE_PRIVATE_KEY!,
  marketplace_id: 'my-marketplace',
  name: 'My Marketplace',
  description: 'Attention marketplace powered by ATTN Protocol',
  follows: [process.env.NODE_PUBKEY!], // Optional: kind 3 follow list

  // === Marketplace Parameters ===
  node_pubkey: process.env.NODE_PUBKEY!, // Node pubkey to follow for blocks
  min_duration: 15000,  // 15 seconds
  max_duration: 60000,  // 60 seconds
  match_fee_sats: 0, // Fee per match in sats (default: 0)
  confirmation_fee_sats: 0, // Fee per confirmation in sats (default: 0)
  kind_list: [34236], // Supported content kinds (default: [34236])
  website_url: 'https://example.com',
  auto_publish_marketplace: true, // Auto-publish marketplace event on block boundary (default: true)
  auto_match: true, // Auto-run matching when attention/promotion received (default: true)
  publish_profile_on_connect: true, // Auto-publish profile on connect (default: true if profile is set)

  // === Profile Publishing (optional) ===
  profile: {
    name: 'My Marketplace',
    about: 'Attention marketplace powered by ATTN Protocol',
    nip05: 'marketplace@example.com',
    website: 'https://example.com',
    image: 'https://example.com/image.png',
    banner: 'https://example.com/banner.png',
    lud16: 'example.com',
    nip05: 'marketplace@example.com',
  },

  // === Infrastructure ===
  relay_config: {
    read_auth: ['wss://auth-relay.example.com'],
    read_noauth: ['wss://public-relay.example.com'],
    write_auth: ['wss://auth-relay.example.com'],
    write_noauth: ['wss://public-relay.example.com'],
  },




});

// Implement required hooks (see below)
// ...

await marketplace.start();
```

## Required Hooks

You MUST implement these hooks - no defaults provided:

```typescript
// Storage - bring your own database
marketplace.on_store_billboard(async (ctx) => {
  await db.save('billboards', ctx);
});

marketplace.on_store_promotion(async (ctx) => {
  await db.save('promotions', ctx);
});

marketplace.on_store_attention(async (ctx) => {
  await db.save('attention', ctx);
});

marketplace.on_store_match(async (ctx) => {
  await db.save('matches', ctx);
});

// Query - fetch promotions for matching
marketplace.on_query_promotions(async (ctx) => {
  const promotions = await db.query('promotions', {
    marketplace_coordinate: ctx.marketplace_coordinate,
    bid_gte: ctx.min_bid,
    duration_gte: ctx.min_duration,
    duration_lte: ctx.max_duration,
  });
  return { promotions };
});

// Matching - your matching algorithm
marketplace.on_find_matches(async (ctx) => {
  // Simplest: return all candidates
  // Or implement priority/sorting logic
  return { matches: ctx.candidates };
});

// Deduplication - check if event already processed
marketplace.on_exists(async (ctx) => {
  const exists = await db.exists(ctx.event_type, ctx.event_id);
  return { exists };
});

// Aggregates - counts for marketplace event
marketplace.on_get_aggregates(async (ctx) => {
  return {
    billboard_count: await db.count('billboards'),
    promotion_count: await db.count('promotions'),
    attention_count: await db.count('attention'),
    match_count: await db.count('matches'),
  };
});
```

## Optional Hooks

### Storage (Optional)

```typescript
marketplace.on_store_marketplace(async (ctx) => { /* ... */ });
marketplace.on_store_billboard_confirmation(async (ctx) => { /* ... */ });
marketplace.on_store_attention_confirmation(async (ctx) => { /* ... */ });
marketplace.on_store_marketplace_confirmation(async (ctx) => { /* ... */ });
marketplace.on_store_attention_payment_confirmation(async (ctx) => { /* ... */ });
```

### Matching Lifecycle

```typescript
// Pre-match validation (e.g., check blocklists)
marketplace.on_before_create_match(async (ctx) => {
  const is_blocked = await check_blocklist(ctx.promotion_event.pubkey);
  return { proceed: !is_blocked, reason: is_blocked ? 'Promoter blocked' : undefined };
});

// Post-match actions
marketplace.on_after_create_match(async (ctx) => {
  await notify_billboard(ctx.match_event);
});

// Modify match before publishing
marketplace.on_before_publish_match(async (ctx) => {
  return { proceed: true };
});

// Post-publish actions
marketplace.on_after_publish_match(async (ctx) => {
  console.log('Published to', ctx.publish_results.filter(r => r.success).length, 'relays');
});
```

### Confirmation Lifecycle

```typescript
marketplace.on_billboard_confirmation(async (ctx) => { /* ... */ });
marketplace.on_attention_confirmation(async (ctx) => { /* ... */ });
marketplace.on_before_publish_marketplace_confirmation(async (ctx) => { /* ... */ });
marketplace.on_after_publish_marketplace_confirmation(async (ctx) => { /* ... */ });
marketplace.on_attention_payment_confirmation(async (ctx) => { /* ... */ });
```

### Other

```typescript
// Block boundary - actions on new block
marketplace.on_block_boundary(async (ctx) => {
  console.log('New block:', ctx.block_height);
  await cleanup_old_events(ctx.block_height - 144);
});

// Custom validation
marketplace.on_validate_promotion(async (ctx) => {
  if (ctx.data.bid < 100) {
    return { valid: false, reason: 'Minimum bid is 100 sats' };
  }
  return { valid: true };
});

marketplace.on_validate_attention(async (ctx) => {
  return { valid: true };
});
```

## Minimal In-Memory Example

```typescript
import { Marketplace } from '@attn-protocol/marketplace';

const marketplace = new Marketplace({ /* config */ });

// In-memory storage
const storage = {
  billboards: new Map(),
  promotions: new Map(),
  attention: new Map(),
  matches: new Map(),
};

// Storage hooks
marketplace.on_store_billboard(async (ctx) => {
  storage.billboards.set(ctx.event.id, ctx);
});
marketplace.on_store_promotion(async (ctx) => {
  storage.promotions.set(ctx.event.id, ctx);
});
marketplace.on_store_attention(async (ctx) => {
  storage.attention.set(ctx.event.id, ctx);
});
marketplace.on_store_match(async (ctx) => {
  storage.matches.set(ctx.event.id, ctx);
});

// Query hook
marketplace.on_query_promotions(async (ctx) => {
  const promotions = [...storage.promotions.values()]
    .filter(p =>
      p.data.marketplace_coordinate === ctx.marketplace_coordinate &&
      (ctx.min_bid === undefined || p.data.bid >= ctx.min_bid)
    );
  return { promotions };
});

// Matching hook
marketplace.on_find_matches(async (ctx) => {
  return { matches: ctx.candidates };
});

// Exists hook
marketplace.on_exists(async (ctx) => {
  const store = storage[ctx.event_type === 'attention' ? 'attention' : ctx.event_type + 's'];
  return { exists: store?.has(ctx.event_id) ?? false };
});

// Aggregates hook
marketplace.on_get_aggregates(async () => ({
  billboard_count: storage.billboards.size,
  promotion_count: storage.promotions.size,
  attention_count: storage.attention.size,
  match_count: storage.matches.size,
}));

await marketplace.start();
```

## Accessing Underlying Framework

```typescript
// Access underlying @attn-protocol/framework instance
marketplace.attn.on_relay_connect((ctx) => {
  console.log('Connected to', ctx.relay_url);
});

marketplace.attn.on_block_event((ctx) => {
  console.log('Block:', ctx.block_height, ctx.block_data);
});

// Profile published hook (emitted after kind 0, 10002, and optionally kind 3 are published)
marketplace.attn.on_profile_published((ctx) => {
  console.log('Profile event ID:', ctx.profile_event_id);
  console.log('Relay list event ID:', ctx.relay_list_event_id);
  console.log('Success count:', ctx.success_count);
  if (ctx.follow_list_event_id) {
    console.log('Follow list event ID:', ctx.follow_list_event_id);
  }
});
```

## Configuration

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `private_key` | string | Yes | Marketplace signing key (hex or nsec) |
| `marketplace_id` | string | Yes | Marketplace identifier |
| `name` | string | Yes | Marketplace display name |
| `node_pubkey` | string | Yes | Node pubkey to follow for blocks |
| `relay_config` | RelayConfig | Yes | Relay URLs (see below) |
| `description` | string | No | Marketplace description |
| `min_duration` | number | No | Minimum duration in ms (default: 15000) |
| `max_duration` | number | No | Maximum duration in ms (default: 60000) |
| `match_fee_sats` | number | No | Fee per match in sats (default: 0) |
| `confirmation_fee_sats` | number | No | Fee per confirmation in sats (default: 0) |
| `kind_list` | number[] | No | Supported content kinds (default: [34236]) |
| `website_url` | string | No | Marketplace website URL |
| `auto_publish_marketplace` | boolean | No | Auto-publish on block (default: true) |
| `auto_match` | boolean | No | Auto-run matching (default: true) |
| `profile` | ProfileConfig | No | Profile metadata for kind 0 event |
| `follows` | string[] | No | Pubkeys for kind 3 follow list |
| `publish_profile_on_connect` | boolean | No | Auto-publish profile on connect (default: true if profile is set) |

### RelayConfig

| Option | Type | Description |
|--------|------|-------------|
| `read_auth` | string[] | Relay URLs for reading events (require NIP-42 auth) |
| `read_noauth` | string[] | Relay URLs for reading events (no auth required) |
| `write_auth` | string[] | Relay URLs for writing events (require NIP-42 auth) |
| `write_noauth` | string[] | Relay URLs for writing events (no auth required) |

## License

MIT
