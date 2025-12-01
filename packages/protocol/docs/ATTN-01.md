# ATTN-01 - ATTN Protocol - Core

`draft` `mandatory`

## Abstract

ATTN-01 defines the event kinds, schemas, and tag specifications for the ATTN Protocol.

## Schema Design Principles

1. **Flat Structure**: No nested objects in content - all fields at top level

2. **Naming Conventions**:
   - Event-specific fields have no prefix (e.g., `duration`, `bid`, `name`)
   - Reference fields use `ref_` prefix (e.g., `ref_marketplace_id`, `ref_promotion_pubkey`)

3. **Tag-Only Fields**: `kind_list` and `relay_list` are stored in tags only (`k` and `r` tags), not in content

4. **Payment Agnostic**: Protocol doesn't prescribe payment systems - marketplaces manage payments

5. **Trust Lists**: Empty trust list = trust no one (secure default)

6. **Values Calculated at Ingestion**: Events store only source data, consumers calculate derived values

## Event Kinds

### Protocol Event Kinds
- **38088**: BLOCK (Bitcoin block arrival)
- **38188**: MARKETPLACE
- **38288**: BILLBOARD
- **38388**: PROMOTION
- **38488**: ATTENTION
- **38588**: BILLBOARD_CONFIRMATION
- **38688**: ATTENTION_CONFIRMATION
- **38788**: MARKETPLACE_CONFIRMATION
- **38888**: MATCH (promotion-attention match)
- **38988**: ATTENTION_PAYMENT_CONFIRMATION

### Standard Event Kinds
- **30000**: NIP-51 Lists (blocked promotions, blocked promoters, trusted billboards, trusted marketplaces)

## Event Schemas

The ATTN Protocol uses only official Nostr tags. All custom data is stored in the JSON content field (which is a JSON string in the event). Block height is stored as a `t` tag for filtering and is required on every event. Tags are used for indexing/filtering; actual data is in the content field.

**Note:** The `content` field in Nostr events is a string. All content shown in examples is JSON that must be stringified when creating events (e.g., `JSON.stringify(content_object)`).

**Tags used:** `d` (identifier), `t` (block height), `a` (event coordinates), `e` (event references), `p` (pubkeys), `r` (relays), `k` (kinds), `u` (URLs)

### Schema Quick Reference

| Event Kind | Name | Published By | Key Content Fields | Key Tags |
|------------|------|--------------|-------------------|----------|
| 38088 | BLOCK | Bitcoin node services | `height`, `hash`, `time?`, `ref_node_pubkey`, `ref_block_id` | `["d", "org.attnprotocol:block:<height>:<hash>"]`, `["t", "<block_height>"]`, `["p", "<node_pubkey>"]`, `["r", "<relay_url>"]` |
| 38188 | MARKETPLACE | Marketplace operators | `name`, `description`, `admin_pubkey`, `min_duration`, `max_duration`, `match_fee_sats`, `confirmation_fee_sats`, `ref_block_id` | `["d", "org.attnprotocol:marketplace:<marketplace_id>"]`, `["a", "<block_coordinate>"]`, `["p", "<marketplace_pubkey>"]`, `["k", "<kind>"]`, `["r", "<relay_url>"]` |
| 38288 | BILLBOARD | Billboard operators | `name`, `description?`, `confirmation_fee_sats` | `["d", "org.attnprotocol:billboard:<billboard_id>"]`, `["a", "<marketplace_coordinate>"]`, `["p", "<billboard_pubkey>"]` |
| 38388 | PROMOTION | Promotion creators | `duration`, `bid`, `event_id`, `call_to_action`, `call_to_action_url`, `escrow_id_list` | `["d", "org.attnprotocol:promotion:<promotion_id>"]`, `["a", "<marketplace_coordinate>"]`, `["a", "<video_coordinate>"]`, `["a", "<billboard_coordinate>"]` |
| 38488 | ATTENTION | Attention owners | `ask`, `min_duration`, `max_duration`, `blocked_promotions_id`, `blocked_promoters_id`, `trusted_marketplaces_id?`, `trusted_billboards_id?` | `["d", "org.attnprotocol:attention:<attention_id>"]`, `["a", "<marketplace_coordinate>"]`, `["a", "<blocked_promotions_coordinate>"]`, `["a", "<blocked_promoters_coordinate>"]`, `["a", "<trusted_marketplaces_coordinate>"]?`, `["a", "<trusted_billboards_coordinate>"]?` |
| 38888 | MATCH | Marketplace operators | `ref_match_id`, `ref_promotion_id`, `ref_attention_id`, `ref_billboard_id`, `ref_marketplace_id`, `ref_*_pubkey` | `["d", "org.attnprotocol:match:<match_id>"]`, `["a", "<marketplace_coordinate>"]`, `["a", "<promotion_coordinate>"]`, `["a", "<attention_coordinate>"]`, `["a", "<billboard_coordinate>"]` |
| 38588 | BILLBOARD_CONFIRMATION | Billboard operators | `ref_match_event_id`, `ref_match_id`, `ref_*_pubkey`, `ref_*_id` | `["d", "org.attnprotocol:billboard-confirmation:<confirmation_id>"]`, `["t", "<block_height>"]`, `["e", "<match_event_id>"]`, `["e", "<marketplace_event_id>"]`, `["e", "<billboard_event_id>"]`, `["e", "<promotion_event_id>"]`, `["e", "<attention_event_id>"]`, `["a", "<marketplace_coordinate>"]`, `["a", "<billboard_coordinate>"]`, `["a", "<promotion_coordinate>"]`, `["a", "<attention_coordinate>"]`, `["a", "<match_coordinate>"]`, `["p", "<pubkey>"]`, `["r", "<relay_url>"]` |
| 38688 | ATTENTION_CONFIRMATION | Attention owners | `ref_match_event_id`, `ref_match_id`, `ref_*_pubkey`, `ref_*_id` | `["d", "org.attnprotocol:attention-confirmation:<confirmation_id>"]`, `["t", "<block_height>"]`, `["e", "<match_event_id>"]`, `["e", "<marketplace_event_id>"]`, `["e", "<billboard_event_id>"]`, `["e", "<promotion_event_id>"]`, `["e", "<attention_event_id>"]`, `["a", "<marketplace_coordinate>"]`, `["a", "<billboard_coordinate>"]`, `["a", "<promotion_coordinate>"]`, `["a", "<attention_coordinate>"]`, `["a", "<match_coordinate>"]`, `["p", "<pubkey>"]`, `["r", "<relay_url>"]` |
| 38788 | MARKETPLACE_CONFIRMATION | Marketplace operators | `ref_match_event_id`, `ref_*_confirmation_event_id`, `ref_*_pubkey`, `ref_*_id` | `["d", "org.attnprotocol:marketplace-confirmation:<confirmation_id>"]`, `["t", "<block_height>"]`, `["e", "<match_event_id>"]`, `["e", "<billboard_confirmation_event_id>"]`, `["e", "<attention_confirmation_event_id>"]`, `["e", "<marketplace_event_id>"]`, `["e", "<billboard_event_id>"]`, `["e", "<promotion_event_id>"]`, `["e", "<attention_event_id>"]`, `["a", "<marketplace_coordinate>"]`, `["a", "<billboard_coordinate>"]`, `["a", "<promotion_coordinate>"]`, `["a", "<attention_coordinate>"]`, `["a", "<match_coordinate>"]`, `["p", "<pubkey>"]`, `["r", "<relay_url>"]` |
| 38988 | ATTENTION_PAYMENT_CONFIRMATION | Attention owners | `sats_received`, `payment_proof?`, `ref_match_event_id`, `ref_marketplace_confirmation_event_id`, `ref_*_pubkey`, `ref_*_id` | `["d", "org.attnprotocol:attention-payment-confirmation:<confirmation_id>"]`, `["t", "<block_height>"]`, `["e", "<marketplace_confirmation_event_id>", "", "marketplace_confirmation"]`, `["e", "<match_event_id>"]`, `["e", "<marketplace_event_id>"]`, `["e", "<billboard_event_id>"]`, `["e", "<promotion_event_id>"]`, `["e", "<attention_event_id>"]`, `["a", "<marketplace_coordinate>"]`, `["a", "<billboard_coordinate>"]`, `["a", "<promotion_coordinate>"]`, `["a", "<attention_coordinate>"]`, `["a", "<match_coordinate>"]`, `["p", "<pubkey>"]`, `["r", "<relay_url>"]` |

---

## BLOCK Event (kind 38088)

**Purpose**: Bitcoin block arrival signal for protocol synchronization

**Published By**: Bitcoin node services

**When**: Immediately after a new Bitcoin block is confirmed on the Bitcoin network

**Schema**:

```typescript
interface BlockContent {
  // Block data (no event prefix - this is the source event)
  height: number;
  hash: string;
  time?: number;  // Unix timestamp (optional, informational only; block height is the primary timing mechanism)
  difficulty?: string;
  tx_count?: number;
  size?: number;
  weight?: number;
  version?: number;
  merkle_root?: string;
  nonce?: number;

  // Reference fields (ref_ prefix)
  ref_node_pubkey: string;  // From event.pubkey
  ref_block_id: string;  // Block identifier (from d tag)
}
```

**Tags**:

```typescript
[
  ["d", "org.attnprotocol:block:<height>:<hash>"],  // Block identifier
  ["t", "<block_height>"],
  ["p", "<node_pubkey>"],  // Node that published this block
  ["r", "<relay_url>"]  // Multiple - relay URLs
]
```

**Example**:

```json
{
  "kind": 38088,
  "pubkey": "node_service_pubkey_hex",
  "created_at": 1234567890,
  "tags": [
    ["d", "org.attnprotocol:block:862626:00000000000000000001a7c..."],
    ["t", "862626"],
    ["p", "node_service_pubkey_hex"],
    ["r", "wss://relay.nextblock.city"]
  ],
  "content": {
    "height": 862626,
    "hash": "00000000000000000001a7c...",
    "time": 1234567890,
    "difficulty": "97345261772782.69",
    "tx_count": 2345,
    "ref_node_pubkey": "node_service_pubkey_hex",
    "ref_block_id": "org.attnprotocol:block:862626:00000000000000000001a7c..."
  }
}
```

**Notes:**
- One event per block height per Bitcoin node service
- Multiple Bitcoin node services can publish for the same block (clients verify consensus)
- Block height in `t` tag enables efficient filtering: `{ kinds: [38088], "#t": ["862626"] }`
- All ATTN Protocol events reference block height via `["t", "<block_height>"]` tag
- Block events are the timing primitive for the entire protocol
- The `time` field is informational only; block height is the primary timing mechanism for all protocol operations
- Block event contains entire block data minus all transactions (only `tx_count` is included)

---

## MARKETPLACE Event (kind 38188)

**Purpose**: Define a marketplace with parameters and fees. Republished/updated each time the marketplace sees a new block to indicate the current official block height for the marketplace.

**Published By**: Marketplace operators

**When**: Marketplace creation and every time a new block is seen (creates a version history of the marketplace at each block height)

**Schema**:

```typescript
interface MarketplaceContent {
  // Marketplace-specific fields (no event prefix - this is the source event)
  name: string;
  description: string;
  admin_pubkey: string;
  min_duration: number;  // Milliseconds
  max_duration: number;  // Milliseconds
  match_fee_sats: number;
  confirmation_fee_sats: number;

  // Reference fields (ref_ prefix)
  ref_marketplace_pubkey: string;
  ref_marketplace_id: string;
  ref_node_pubkey: string;  // Block node this marketplace listens to
  ref_block_id: string;  // Current block event identifier (org.attnprotocol:block:<height>:<hash>)
}
```

**Tags**:

```typescript
[
  ["d", "org.attnprotocol:marketplace:<marketplace_id>"],
  ["t", "<block_height>"],
  ["a", "38088:<node_pubkey>:org.attnprotocol:block:<height>:<hash>"],  // Current block event coordinate
  ["k", "<kind>"],  // Multiple - supported content kinds
  ["p", "<marketplace_pubkey>"],
  ["p", "<node_pubkey>"],  // Block node reference
  ["r", "<relay_url>"],  // Multiple
  ["u", "<website_url>"]  // Optional
]
```

**Example**:

```json
{
  "kind": 38188,
  "pubkey": "marketplace_pubkey_hex",
  "created_at": 1234567890,
  "tags": [
    ["d", "org.attnprotocol:marketplace:nextblock.city"],
    ["t", "862626"],
    ["a", "38088:node_service_pubkey_hex:org.attnprotocol:block:862626:00000000000000000001a7c..."],
    ["k", "34236"],
    ["p", "marketplace_pubkey_hex"],
    ["p", "node_service_pubkey_hex"],
    ["r", "wss://relay.nextblock.city"],
    ["u", "https://nextblock.city"]
  ],
  "content": {
    "name": "NextBlock Marketplace",
    "description": "Zero-fee attention marketplace",
    "admin_pubkey": "admin_pubkey_hex",
    "min_duration": 15000,
    "max_duration": 60000,
    "match_fee_sats": 0,
    "confirmation_fee_sats": 0,
    "ref_marketplace_pubkey": "marketplace_pubkey_hex",
    "ref_marketplace_id": "nextblock.city",
    "ref_node_pubkey": "node_service_pubkey_hex",
    "ref_block_id": "org.attnprotocol:block:862626:00000000000000000001a7c..."
  }
}
```

**Relationships:**
- **Referenced by:** BILLBOARD events (via `["a", "<marketplace_coordinate>"]` tag), PROMOTION events, ATTENTION events, MATCH events
- **References:** BLOCK event (via `["a", "<block_coordinate>"]` tag, `["p", "<node_pubkey>"]` tag, `ref_node_pubkey`, and `ref_block_id`)

**Notes:**
- Marketplace events are republished/updated for each new block to maintain current state
- Each marketplace event version represents the marketplace's official state at that specific block height
- Clients should query for the latest marketplace event at the current block height to get current parameters
- The `ref_block_id` and `["a", "<block_coordinate>"]` tag always reference the current block event
- **Republishing is optional but recommended**: Marketplaces that don't republish will be out of sync with other marketplaces using the same Bitcoin node events

---

## BILLBOARD Event (kind 38288)

**Purpose**: Announce a billboard service within a marketplace

**Published By**: Billboard operators

**When**: Billboard creation or when billboard information is updated

**Schema**:

```typescript
interface BillboardContent {
  // Billboard-specific fields
  name: string;
  description?: string;
  confirmation_fee_sats: number;

  // Reference fields (ref_ prefix)
  ref_billboard_pubkey: string;
  ref_billboard_id: string;
  ref_marketplace_pubkey: string;
  ref_marketplace_id: string;
}
```

**Tags**:

```typescript
[
  ["d", "org.attnprotocol:billboard:<billboard_id>"],
  ["t", "<block_height>"],
  ["a", "38188:<marketplace_pubkey>:org.attnprotocol:marketplace:<marketplace_id>"],
  ["p", "<billboard_pubkey>"],
  ["p", "<marketplace_pubkey>"],
  ["r", "<relay_url>"],  // Multiple
  ["k", "<kind>"],  // Multiple - supported kinds
  ["u", "<billboard_url>"]
]
```

**Example**:

```json
{
  "kind": 38288,
  "pubkey": "billboard_pubkey_hex",
  "created_at": 1234567890,
  "tags": [
    ["d", "org.attnprotocol:billboard:nextblock-billboard-001"],
    ["t", "862626"],
    ["a", "38188:marketplace_pubkey_hex:org.attnprotocol:marketplace:nextblock.city"],
    ["p", "billboard_pubkey_hex"],
    ["p", "marketplace_pubkey_hex"],
    ["r", "wss://relay.nextblock.city"],
    ["k", "34236"],
    ["u", "https://billboard.nextblock.city"]
  ],
  "content": {
    "name": "NextBlock Billboard",
    "description": "Free billboard service",
    "confirmation_fee_sats": 0,
    "ref_billboard_pubkey": "billboard_pubkey_hex",
    "ref_billboard_id": "nextblock-billboard-001",
    "ref_marketplace_pubkey": "marketplace_pubkey_hex",
    "ref_marketplace_id": "nextblock.city"
  }
}
```

**Relationships:**
- **Referenced by:** PROMOTION events (via `["a", "<billboard_coordinate>"]` tag), MATCH events, BILLBOARD_CONFIRMATION events
- **References:** MARKETPLACE event (via `["a", "<marketplace_coordinate>"]` tag)

---

## PROMOTION Event (kind 38388)

**Purpose**: Promotion request with bid and escrow proof

**Published By**: Promotion creators (advertisers)

**When**: When a promotion creator wants to promote content

**Schema**:

```typescript
interface PromotionContent {
  // Promotion-specific fields
  duration: number;  // Milliseconds
  bid: number;  // Total sats willing to pay (viewer ask + fees)
  event_id: string;  // Content being promoted (e.g., video event ID)
  call_to_action: string;
  call_to_action_url: string;
  escrow_id_list: string[];  // Payment proof (opaque to protocol)

  // Reference fields (ref_ prefix)
  ref_promotion_pubkey: string;
  ref_promotion_id: string;
  ref_marketplace_pubkey: string;
  ref_marketplace_id: string;
  ref_billboard_pubkey: string;
  ref_billboard_id: string;
}
```

**Tags**:

```typescript
[
  ["d", "org.attnprotocol:promotion:<promotion_id>"],
  ["t", "<block_height>"],
  ["a", "38188:<marketplace_pubkey>:org.attnprotocol:marketplace:<marketplace_id>"],
  ["a", "38288:<billboard_pubkey>:org.attnprotocol:billboard:<billboard_id>"],
  ["a", "34236:<video_author_pubkey>:<video_d_tag>"],  // Content being promoted
  ["p", "<marketplace_pubkey>"],
  ["p", "<billboard_pubkey>"],
  ["p", "<promotion_pubkey>"],
  ["r", "<relay_url>"],  // Multiple
  ["k", "<kind>"],  // Content kind (e.g., "34236")
  ["u", "<promotion_url>"]
]
```

**Example**:

```json
{
  "kind": 38388,
  "pubkey": "promotion_pubkey_hex",
  "created_at": 1234567890,
  "tags": [
    ["d", "org.attnprotocol:promotion:promotion-001"],
    ["t", "862626"],
    ["a", "38188:marketplace_pubkey_hex:org.attnprotocol:marketplace:nextblock.city"],
    ["a", "38288:billboard_pubkey_hex:org.attnprotocol:billboard:nextblock-billboard-001"],
    ["a", "34236:video_author_pubkey:video_d_tag"],
    ["p", "marketplace_pubkey_hex"],
    ["p", "billboard_pubkey_hex"],
    ["p", "promotion_pubkey_hex"],
    ["r", "wss://relay.nextblock.city"],
    ["k", "34236"],
    ["u", "https://example.com/watch"]
  ],
  "content": {
    "duration": 30000,
    "bid": 3000,
    "event_id": "video_event_id",
    "call_to_action": "Watch Now",
    "call_to_action_url": "https://example.com/watch",
    "escrow_id_list": ["strike_tx_abc123"],
    "ref_promotion_pubkey": "promotion_pubkey_hex",
    "ref_promotion_id": "promotion-001",
    "ref_marketplace_pubkey": "marketplace_pubkey_hex",
    "ref_marketplace_id": "nextblock.city",
    "ref_billboard_pubkey": "billboard_pubkey_hex",
    "ref_billboard_id": "nextblock-billboard-001"
  }
}
```

**Relationships:**
- **Referenced by:** MATCH events (via `["a", "<promotion_coordinate>"]` tag), confirmation events (via `e` tags)
- **References:** MARKETPLACE event (via `["a", "<marketplace_coordinate>"]`), BILLBOARD event (via `["a", "<billboard_coordinate>"]`), video content (via `["a", "<video_coordinate>"]`)

---

## ATTENTION Event (kind 38488)

**Purpose**: Viewer availability signal with ask price and filters

**Published By**: Attention owners (viewers)

**When**: When an attention owner wants to make their attention available for viewing promotions

**Schema**:

```typescript
interface AttentionContent {
  // Attention-specific fields
  ask: number;  // Sats viewer wants to receive
  min_duration: number;  // Milliseconds
  max_duration: number;  // Milliseconds
  blocked_promotions_id: string;  // NIP-51 list d-tag (required - event must point to list ID)
  blocked_promoters_id: string;   // NIP-51 list d-tag (required - event must point to list ID)
  trusted_marketplaces_id?: string;  // NIP-51 list d-tag (optional - if omitted, trusts no marketplaces)
  trusted_billboards_id?: string;    // NIP-51 list d-tag (optional - if omitted, trusts no billboards)

  // Reference fields (ref_ prefix)
  ref_attention_pubkey: string;
  ref_attention_id: string;
  ref_marketplace_pubkey: string;
  ref_marketplace_id: string;
}
```

**Tags**:

```typescript
[
  ["d", "org.attnprotocol:attention:<attention_id>"],
  ["t", "<block_height>"],
  ["a", "38188:<marketplace_pubkey>:org.attnprotocol:marketplace:<marketplace_id>"],
  ["a", "30000:<attention_pubkey>:<blocked_promotions_id>"],  // Required
  ["a", "30000:<attention_pubkey>:<blocked_promoters_id>"],  // Required
  ["a", "30000:<attention_pubkey>:<trusted_marketplaces_id>"],  // Optional
  ["a", "30000:<attention_pubkey>:<trusted_billboards_id>"],  // Optional
  ["p", "<attention_pubkey>"],
  ["p", "<marketplace_pubkey>"],
  ["r", "<relay_url>"],  // Multiple
  ["k", "<kind>"]  // Multiple - acceptable content kinds
]
```

**Example**:

```json
{
  "kind": 38488,
  "pubkey": "attention_pubkey_hex",
  "created_at": 1234567890,
  "tags": [
    ["d", "org.attnprotocol:attention:attention-001"],
    ["t", "862626"],
    ["a", "38188:marketplace_pubkey_hex:org.attnprotocol:marketplace:nextblock.city"],
    ["a", "30000:attention_pubkey_hex:org.attnprotocol:promotion:blocked"],
    ["a", "30000:attention_pubkey_hex:org.attnprotocol:promoter:blocked"],
    ["a", "30000:attention_pubkey_hex:org.attnprotocol:marketplace:trusted"],  // Optional
    ["a", "30000:attention_pubkey_hex:org.attnprotocol:billboard:trusted"],  // Optional
    ["p", "attention_pubkey_hex"],
    ["p", "marketplace_pubkey_hex"],
    ["r", "wss://relay.nextblock.city"],
    ["k", "34236"]
  ],
  "content": {
    "ask": 3000,
    "min_duration": 15000,
    "max_duration": 60000,
    "blocked_promotions_id": "org.attnprotocol:promotion:blocked",
    "blocked_promoters_id": "org.attnprotocol:promoter:blocked",
    "trusted_marketplaces_id": "org.attnprotocol:marketplace:trusted",  // Optional
    "trusted_billboards_id": "org.attnprotocol:billboard:trusted",  // Optional
    "ref_attention_pubkey": "attention_pubkey_hex",
    "ref_attention_id": "attention-001",
    "ref_marketplace_pubkey": "marketplace_pubkey_hex",
    "ref_marketplace_id": "nextblock.city"
  }
}
```

**Relationships:**
- **Referenced by:** MATCH events (via `["a", "<attention_coordinate>"]` tag), confirmation events (via `e` tags)
- **References:** MARKETPLACE event (via `["a", "<marketplace_coordinate>"]`), NIP-51 lists (via `["a", "<blocked_promotions_coordinate>"]`, `["a", "<blocked_promoters_coordinate>"]`, `["a", "<trusted_marketplaces_coordinate>"]`, `["a", "<trusted_billboards_coordinate>"]`)

**Notes:**
- ATTENTION events must point to list IDs via `a` tags for blocked lists (even if the lists are empty)
- The `a` tags for `blocked_promotions_id` and `blocked_promoters_id` are required
- The `a` tags for `trusted_marketplaces_id` and `trusted_billboards_id` are optional
- The referenced NIP-51 lists can be empty (no entries) - an empty list means trust no one (secure default)
- `trusted_marketplaces_id` and `trusted_billboards_id` are optional in content; if omitted, the user trusts no marketplaces/billboards
- If trusted list `a` tags are omitted, the corresponding content fields should also be omitted

---

## MATCH Event (kind 38888)

**Purpose**: Match between promotion and attention with fee calculations

**Published By**: Marketplace operators

**When**: When a promotion's bid meets or exceeds an attention's ask, and the promotion duration falls within the attention's min/max range

**Schema**:

```typescript
interface MatchContent {
  // Reference fields only (ref_ prefix)
  ref_match_id: string;
  ref_promotion_id: string;
  ref_attention_id: string;
  ref_billboard_id: string;
  ref_marketplace_id: string;
  ref_marketplace_pubkey: string;
  ref_promotion_pubkey: string;
  ref_attention_pubkey: string;
  ref_billboard_pubkey: string;
}
```

**Tags**:

```typescript
[
  ["d", "org.attnprotocol:match:<match_id>"],
  ["t", "<block_height>"],
  ["a", "38188:<marketplace_pubkey>:org.attnprotocol:marketplace:<marketplace_id>"],
  ["a", "38288:<billboard_pubkey>:org.attnprotocol:billboard:<billboard_id>"],
  ["a", "38388:<promotion_pubkey>:org.attnprotocol:promotion:<promotion_id>"],
  ["a", "38488:<attention_pubkey>:org.attnprotocol:attention:<attention_id>"],
  ["p", "<marketplace_pubkey>"],
  ["p", "<billboard_pubkey>"],
  ["p", "<promotion_pubkey>"],
  ["p", "<attention_pubkey>"],
  ["r", "<relay_url>"],  // Multiple
  ["k", "<kind>"]  // Multiple
]
```

**Example**:

```json
{
  "kind": 38888,
  "pubkey": "marketplace_pubkey_hex",
  "created_at": 1234567890,
  "tags": [
    ["d", "org.attnprotocol:match:match-001"],
    ["t", "862626"],
    ["a", "38188:marketplace_pubkey_hex:org.attnprotocol:marketplace:nextblock.city"],
    ["a", "38288:billboard_pubkey_hex:org.attnprotocol:billboard:nextblock-billboard-001"],
    ["a", "38388:promotion_pubkey_hex:org.attnprotocol:promotion:promotion-001"],
    ["a", "38488:attention_pubkey_hex:org.attnprotocol:attention:attention-001"],
    ["p", "marketplace_pubkey_hex"],
    ["p", "billboard_pubkey_hex"],
    ["p", "promotion_pubkey_hex"],
    ["p", "attention_pubkey_hex"],
    ["r", "wss://relay.nextblock.city"],
    ["k", "34236"]
  ],
  "content": {
    "ref_match_id": "match-001",
    "ref_promotion_id": "promotion-001",
    "ref_attention_id": "attention-001",
    "ref_billboard_id": "nextblock-billboard-001",
    "ref_marketplace_id": "nextblock.city",
    "ref_marketplace_pubkey": "marketplace_pubkey_hex",
    "ref_promotion_pubkey": "promotion_pubkey_hex",
    "ref_attention_pubkey": "attention_pubkey_hex",
    "ref_billboard_pubkey": "billboard_pubkey_hex"
  }
}
```

**Calculation at Ingestion**:

All values (bid, ask, duration, fees, payouts) are fetched from referenced events and calculated by consumers:

```typescript
// Fetch the referenced events
const promotion = await getPromotion(match.ref_promotion_id);
const attention = await getAttention(match.ref_attention_id);
const marketplace = await getMarketplace(match.ref_marketplace_id);
const billboard = await getBillboard(match.ref_billboard_id);

// Calculate values
const bid = promotion.bid;
const ask = attention.ask;
const duration = promotion.duration;
const marketplaceMatchFee = marketplace.match_fee_sats;
const marketplaceConfirmationFee = marketplace.confirmation_fee_sats;
const billboardConfirmationFee = billboard.confirmation_fee_sats;

const totalFees = marketplaceMatchFee + marketplaceConfirmationFee + billboardConfirmationFee;
const viewerPayout = ask;
const billboardPayout = billboardConfirmationFee;
const marketplacePayout = marketplaceMatchFee + marketplaceConfirmationFee;
const requiredBid = ask + totalFees;
const bidSufficient = bid >= requiredBid;
```

**Sats Consistency Requirement:**
- Sats represent total bid/ask per match and must be consistent across PROMOTION, ATTENTION, MATCH, and all confirmation events
- The `bid` value from the referenced PROMOTION event and the `ask` value from the referenced ATTENTION event must match exactly when calculating fees and payouts
- All sats values in the match chain (PROMOTION → MATCH → confirmations) must reference the same total amounts without modification

**Relationships:**
- **Referenced by:** BILLBOARD_CONFIRMATION, ATTENTION_CONFIRMATION, MARKETPLACE_CONFIRMATION events (via `e` tags)
- **References:** MARKETPLACE event (via `["a", "<marketplace_coordinate>"]`), BILLBOARD event (via `["a", "<billboard_coordinate>"]`), PROMOTION event (via `["a", "<promotion_coordinate>"]`), ATTENTION event (via `["a", "<attention_coordinate>"]`)

---

## BILLBOARD_CONFIRMATION Event (kind 38588)

**Purpose**: Billboard confirms display of promotion

**Published By**: Billboard operators

**When**: After billboard verifies that the attention owner viewed the promotion for the required duration

**Schema**:

```typescript
interface BillboardConfirmationContent {
  // Reference fields (ref_ prefix)
  ref_match_event_id: string;
  ref_match_id: string;
  ref_marketplace_pubkey: string;
  ref_billboard_pubkey: string;
  ref_promotion_pubkey: string;
  ref_attention_pubkey: string;
  ref_marketplace_id: string;
  ref_billboard_id: string;
  ref_promotion_id: string;
  ref_attention_id: string;
}
```

**Tags**:

```typescript
[
  ["d", "org.attnprotocol:billboard-confirmation:<confirmation_id>"],
  ["t", "<block_height>"],
  ["e", "<match_event_id>", "", "match"],  // With marker
  ["e", "<marketplace_event_id>"],
  ["e", "<billboard_event_id>"],
  ["e", "<promotion_event_id>"],
  ["e", "<attention_event_id>"],
  ["a", "38188:<marketplace_pubkey>:org.attnprotocol:marketplace:<marketplace_id>"],
  ["a", "38288:<billboard_pubkey>:org.attnprotocol:billboard:<billboard_id>"],
  ["a", "38388:<promotion_pubkey>:org.attnprotocol:promotion:<promotion_id>"],
  ["a", "38488:<attention_pubkey>:org.attnprotocol:attention:<attention_id>"],
  ["a", "38888:<marketplace_pubkey>:org.attnprotocol:match:<match_id>"],
  ["p", "<marketplace_pubkey>"],
  ["p", "<billboard_pubkey>"],
  ["p", "<promotion_pubkey>"],
  ["p", "<attention_pubkey>"],
  ["r", "<relay_url>"]  // Multiple
]
```

**Example**:

```json
{
  "kind": 38588,
  "pubkey": "billboard_pubkey_hex",
  "created_at": 1234567890,
  "tags": [
    ["d", "org.attnprotocol:billboard-confirmation:confirmation-001"],
    ["t", "862626"],
    ["e", "match_event_id_hex", "", "match"],
    ["e", "marketplace_event_id_hex"],
    ["e", "billboard_event_id_hex"],
    ["e", "promotion_event_id_hex"],
    ["e", "attention_event_id_hex"],
    ["a", "38188:marketplace_pubkey_hex:org.attnprotocol:marketplace:nextblock.city"],
    ["a", "38288:billboard_pubkey_hex:org.attnprotocol:billboard:nextblock-billboard-001"],
    ["a", "38388:promotion_pubkey_hex:org.attnprotocol:promotion:promotion-001"],
    ["a", "38488:attention_pubkey_hex:org.attnprotocol:attention:attention-001"],
    ["a", "38888:marketplace_pubkey_hex:org.attnprotocol:match:match-001"],
    ["p", "marketplace_pubkey_hex"],
    ["p", "billboard_pubkey_hex"],
    ["p", "promotion_pubkey_hex"],
    ["p", "attention_pubkey_hex"],
    ["r", "wss://relay.nextblock.city"]
  ],
  "content": {
    "ref_match_event_id": "match_event_id_hex",
    "ref_match_id": "match-001",
    "ref_marketplace_pubkey": "marketplace_pubkey_hex",
    "ref_billboard_pubkey": "billboard_pubkey_hex",
    "ref_promotion_pubkey": "promotion_pubkey_hex",
    "ref_attention_pubkey": "attention_pubkey_hex",
    "ref_marketplace_id": "nextblock.city",
    "ref_billboard_id": "nextblock-billboard-001",
    "ref_promotion_id": "promotion-001",
    "ref_attention_id": "attention-001"
  }
}
```

**Relationships:**
- **Referenced by:** MARKETPLACE_CONFIRMATION event (via `e` tag)
- **References:** MARKETPLACE event (via `e` tag and coordinate), PROMOTION event (via `e` tag and coordinate), ATTENTION event (via `e` tag and coordinate), MATCH event (via `e` tag and coordinate)

---

## ATTENTION_CONFIRMATION Event (kind 38688)

**Purpose**: Attention owner confirms watching promotion

**Published By**: Attention owners (viewers)

**When**: After the attention owner views the promotion and confirms viewing

**Schema**:

```typescript
interface AttentionConfirmationContent {
  // Reference fields (ref_ prefix)
  ref_match_event_id: string;
  ref_match_id: string;
  ref_marketplace_pubkey: string;
  ref_billboard_pubkey: string;
  ref_promotion_pubkey: string;
  ref_attention_pubkey: string;
  ref_marketplace_id: string;
  ref_billboard_id: string;
  ref_promotion_id: string;
  ref_attention_id: string;
}
```

**Tags**:

```typescript
[
  ["d", "org.attnprotocol:attention-confirmation:<confirmation_id>"],
  ["t", "<block_height>"],
  ["e", "<match_event_id>", "", "match"],  // With marker
  ["e", "<marketplace_event_id>"],
  ["e", "<billboard_event_id>"],
  ["e", "<promotion_event_id>"],
  ["e", "<attention_event_id>"],
  ["a", "38188:<marketplace_pubkey>:org.attnprotocol:marketplace:<marketplace_id>"],
  ["a", "38288:<billboard_pubkey>:org.attnprotocol:billboard:<billboard_id>"],
  ["a", "38388:<promotion_pubkey>:org.attnprotocol:promotion:<promotion_id>"],
  ["a", "38488:<attention_pubkey>:org.attnprotocol:attention:<attention_id>"],
  ["a", "38888:<marketplace_pubkey>:org.attnprotocol:match:<match_id>"],
  ["p", "<marketplace_pubkey>"],
  ["p", "<billboard_pubkey>"],
  ["p", "<promotion_pubkey>"],
  ["p", "<attention_pubkey>"],
  ["r", "<relay_url>"]  // Multiple
]
```

**Example**:

```json
{
  "kind": 38688,
  "pubkey": "attention_pubkey_hex",
  "created_at": 1234567890,
  "tags": [
    ["d", "org.attnprotocol:attention-confirmation:confirmation-001"],
    ["t", "862626"],
    ["e", "match_event_id_hex", "", "match"],
    ["e", "marketplace_event_id_hex"],
    ["e", "billboard_event_id_hex"],
    ["e", "promotion_event_id_hex"],
    ["e", "attention_event_id_hex"],
    ["a", "38188:marketplace_pubkey_hex:org.attnprotocol:marketplace:nextblock.city"],
    ["a", "38288:billboard_pubkey_hex:org.attnprotocol:billboard:nextblock-billboard-001"],
    ["a", "38388:promotion_pubkey_hex:org.attnprotocol:promotion:promotion-001"],
    ["a", "38488:attention_pubkey_hex:org.attnprotocol:attention:attention-001"],
    ["a", "38888:marketplace_pubkey_hex:org.attnprotocol:match:match-001"],
    ["p", "marketplace_pubkey_hex"],
    ["p", "billboard_pubkey_hex"],
    ["p", "promotion_pubkey_hex"],
    ["p", "attention_pubkey_hex"],
    ["r", "wss://relay.nextblock.city"]
  ],
  "content": {
    "ref_match_event_id": "match_event_id_hex",
    "ref_match_id": "match-001",
    "ref_marketplace_pubkey": "marketplace_pubkey_hex",
    "ref_billboard_pubkey": "billboard_pubkey_hex",
    "ref_promotion_pubkey": "promotion_pubkey_hex",
    "ref_attention_pubkey": "attention_pubkey_hex",
    "ref_marketplace_id": "nextblock.city",
    "ref_billboard_id": "nextblock-billboard-001",
    "ref_promotion_id": "promotion-001",
    "ref_attention_id": "attention-001"
  }
}
```

**Relationships:**
- **Referenced by:** MARKETPLACE_CONFIRMATION event (via `e` tag)
- **References:** MARKETPLACE event (via `e` tag and coordinate), PROMOTION event (via `e` tag and coordinate), ATTENTION event (via `e` tag and coordinate), MATCH event (via `e` tag and coordinate)

---

## MARKETPLACE_CONFIRMATION Event (kind 38788)

**Purpose**: Final confirmation event

**Published By**: Marketplace operators

**When**: After both BILLBOARD_CONFIRMATION and ATTENTION_CONFIRMATION events are received

**Schema**:

```typescript
interface MarketplaceConfirmationContent {
  // Reference fields (ref_ prefix)
  ref_match_event_id: string;
  ref_match_id: string;
  ref_billboard_confirmation_event_id: string;
  ref_attention_confirmation_event_id: string;
  ref_marketplace_pubkey: string;
  ref_billboard_pubkey: string;
  ref_promotion_pubkey: string;
  ref_attention_pubkey: string;
  ref_marketplace_id: string;
  ref_billboard_id: string;
  ref_promotion_id: string;
  ref_attention_id: string;
}
```

**Tags**:

```typescript
[
  ["d", "org.attnprotocol:marketplace-confirmation:<confirmation_id>"],
  ["t", "<block_height>"],
  ["e", "<match_event_id>", "", "match"],
  ["e", "<billboard_confirmation_event_id>", "", "billboard_confirmation"],
  ["e", "<attention_confirmation_event_id>", "", "attention_confirmation"],
  ["e", "<marketplace_event_id>"],
  ["e", "<billboard_event_id>"],
  ["e", "<promotion_event_id>"],
  ["e", "<attention_event_id>"],
  ["a", "38188:<marketplace_pubkey>:org.attnprotocol:marketplace:<marketplace_id>"],
  ["a", "38288:<billboard_pubkey>:org.attnprotocol:billboard:<billboard_id>"],
  ["a", "38388:<promotion_pubkey>:org.attnprotocol:promotion:<promotion_id>"],
  ["a", "38488:<attention_pubkey>:org.attnprotocol:attention:<attention_id>"],
  ["a", "38888:<marketplace_pubkey>:org.attnprotocol:match:<match_id>"],
  ["p", "<marketplace_pubkey>"],
  ["p", "<billboard_pubkey>"],
  ["p", "<promotion_pubkey>"],
  ["p", "<attention_pubkey>"],
  ["r", "<relay_url>"]  // Multiple
]
```

**Example**:

```json
{
  "kind": 38788,
  "pubkey": "marketplace_pubkey_hex",
  "created_at": 1234567890,
  "tags": [
    ["d", "org.attnprotocol:marketplace-confirmation:confirmation-001"],
    ["t", "862626"],
    ["e", "match_event_id_hex", "", "match"],
    ["e", "billboard_confirmation_event_id_hex", "", "billboard_confirmation"],
    ["e", "attention_confirmation_event_id_hex", "", "attention_confirmation"],
    ["e", "marketplace_event_id_hex"],
    ["e", "billboard_event_id_hex"],
    ["e", "promotion_event_id_hex"],
    ["e", "attention_event_id_hex"],
    ["a", "38188:marketplace_pubkey_hex:org.attnprotocol:marketplace:nextblock.city"],
    ["a", "38288:billboard_pubkey_hex:org.attnprotocol:billboard:nextblock-billboard-001"],
    ["a", "38388:promotion_pubkey_hex:org.attnprotocol:promotion:promotion-001"],
    ["a", "38488:attention_pubkey_hex:org.attnprotocol:attention:attention-001"],
    ["a", "38888:marketplace_pubkey_hex:org.attnprotocol:match:match-001"],
    ["p", "marketplace_pubkey_hex"],
    ["p", "billboard_pubkey_hex"],
    ["p", "promotion_pubkey_hex"],
    ["p", "attention_pubkey_hex"],
    ["r", "wss://relay.nextblock.city"]
  ],
  "content": {
    "ref_match_event_id": "match_event_id_hex",
    "ref_match_id": "match-001",
    "ref_billboard_confirmation_event_id": "billboard_confirmation_event_id_hex",
    "ref_attention_confirmation_event_id": "attention_confirmation_event_id_hex",
    "ref_marketplace_pubkey": "marketplace_pubkey_hex",
    "ref_billboard_pubkey": "billboard_pubkey_hex",
    "ref_promotion_pubkey": "promotion_pubkey_hex",
    "ref_attention_pubkey": "attention_pubkey_hex",
    "ref_marketplace_id": "nextblock.city",
    "ref_billboard_id": "nextblock-billboard-001",
    "ref_promotion_id": "promotion-001",
    "ref_attention_id": "attention-001"
  }
}
```

**Relationships:**
- **Referenced by:** ATTENTION_PAYMENT_CONFIRMATION event (via `e` tag)
- **References:** MARKETPLACE event (via `e` tag and coordinate), PROMOTION event (via `e` tag and coordinate), ATTENTION event (via `e` tag and coordinate), MATCH event (via `e` tag and coordinate), BILLBOARD_CONFIRMATION event (via `e` tag), ATTENTION_CONFIRMATION event (via `e` tag)

---

## ATTENTION_PAYMENT_CONFIRMATION Event (kind 38988)

**Purpose**: Attention owner attestation of payment receipt

**Published By**: Attention owners

**When**: After receiving payment, following MARKETPLACE_CONFIRMATION (38788)

**Schema**:

```typescript
interface AttentionPaymentConfirmationContent {
  // Payment fields (no prefix - this is the source data)
  sats_received: number;  // Amount actually received
  payment_proof?: string;  // Optional proof of payment (Lightning invoice, tx ID, etc.)

  // Reference fields (ref_ prefix)
  ref_match_event_id: string;
  ref_match_id: string;
  ref_marketplace_confirmation_event_id: string;
  ref_marketplace_pubkey: string;
  ref_billboard_pubkey: string;
  ref_promotion_pubkey: string;
  ref_attention_pubkey: string;
  ref_marketplace_id: string;
  ref_billboard_id: string;
  ref_promotion_id: string;
  ref_attention_id: string;
}
```

**Tags**:

```typescript
[
  ["d", "org.attnprotocol:attention-payment-confirmation:<confirmation_id>"],
  ["t", "<block_height>"],
  ["e", "<marketplace_confirmation_event_id>", "", "marketplace_confirmation"],
  ["e", "<match_event_id>"],
  ["e", "<marketplace_event_id>"],
  ["e", "<billboard_event_id>"],
  ["e", "<promotion_event_id>"],
  ["e", "<attention_event_id>"],
  ["a", "38188:<marketplace_pubkey>:org.attnprotocol:marketplace:<marketplace_id>"],
  ["a", "38288:<billboard_pubkey>:org.attnprotocol:billboard:<billboard_id>"],
  ["a", "38388:<promotion_pubkey>:org.attnprotocol:promotion:<promotion_id>"],
  ["a", "38488:<attention_pubkey>:org.attnprotocol:attention:<attention_id>"],
  ["a", "38888:<marketplace_pubkey>:org.attnprotocol:match:<match_id>"],
  ["p", "<marketplace_pubkey>"],
  ["p", "<billboard_pubkey>"],
  ["p", "<promotion_pubkey>"],
  ["p", "<attention_pubkey>"],
  ["r", "<relay_url>"]  // Multiple
]
```

**Example**:

```json
{
  "kind": 38988,
  "pubkey": "attention_pubkey_hex",
  "created_at": 1234567890,
  "tags": [
    ["d", "org.attnprotocol:attention-payment-confirmation:payment-confirmation-001"],
    ["t", "862626"],
    ["e", "marketplace_confirmation_event_id_hex", "", "marketplace_confirmation"],
    ["e", "match_event_id_hex"],
    ["e", "marketplace_event_id_hex"],
    ["e", "billboard_event_id_hex"],
    ["e", "promotion_event_id_hex"],
    ["e", "attention_event_id_hex"],
    ["a", "38188:marketplace_pubkey_hex:org.attnprotocol:marketplace:nextblock.city"],
    ["a", "38288:billboard_pubkey_hex:org.attnprotocol:billboard:nextblock-billboard-001"],
    ["a", "38388:promotion_pubkey_hex:org.attnprotocol:promotion:promotion-001"],
    ["a", "38488:attention_pubkey_hex:org.attnprotocol:attention:attention-001"],
    ["a", "38888:marketplace_pubkey_hex:org.attnprotocol:match:match-001"],
    ["p", "marketplace_pubkey_hex"],
    ["p", "billboard_pubkey_hex"],
    ["p", "promotion_pubkey_hex"],
    ["p", "attention_pubkey_hex"],
    ["r", "wss://relay.nextblock.city"]
  ],
  "content": {
    "sats_received": 5000,
    "payment_proof": "lnbc50u1p3example...",
    "ref_match_event_id": "match_event_id_hex",
    "ref_match_id": "match-001",
    "ref_marketplace_confirmation_event_id": "marketplace_confirmation_event_id_hex",
    "ref_marketplace_pubkey": "marketplace_pubkey_hex",
    "ref_billboard_pubkey": "billboard_pubkey_hex",
    "ref_promotion_pubkey": "promotion_pubkey_hex",
    "ref_attention_pubkey": "attention_pubkey_hex",
    "ref_marketplace_id": "nextblock.city",
    "ref_billboard_id": "nextblock-billboard-001",
    "ref_promotion_id": "promotion-001",
    "ref_attention_id": "attention-001"
  }
}
```

**Relationships:**
- **Referenced by:** None (this is the final event in the payment confirmation chain)
- **References:** MARKETPLACE_CONFIRMATION event (via `e` tag with `marketplace_confirmation` marker), MARKETPLACE event (via `e` tag and coordinate), PROMOTION event (via `e` tag and coordinate), ATTENTION event (via `e` tag and coordinate), MATCH event (via `e` tag and coordinate)

---

## NIP-51 Lists (kind 30000)

**Purpose**: User-maintained lists for blocking and trust

**Published By**: Attention owners

**When**: When attention owners want to update their blocking or trust preferences

### List Types

| d-tag | Purpose | Contains |
|-------|---------|----------|
| `org.attnprotocol:promotion:blocked` | Blocked promotions | `a` tags (promotion coordinates), `e` tags (promotion event IDs) |
| `org.attnprotocol:promoter:blocked` | Blocked promoters | `p` tags (promoter pubkeys) |
| `org.attnprotocol:marketplace:trusted` | Trusted marketplaces | `a` tags (marketplace coordinates), `p` tags (operator pubkeys) |
| `org.attnprotocol:billboard:trusted` | Trusted billboards | `a` tags (billboard coordinates), `p` tags (operator pubkeys) |

### Blocked Promotions List

Blocks specific promotion events by their coordinates.

```json
{
  "kind": 30000,
  "pubkey": "viewer_pubkey_hex",
  "created_at": 1234567890,
  "tags": [
    ["d", "org.attnprotocol:promotion:blocked"],
    ["t", "862626"],
    ["a", "38388:promotion_pubkey:org.attnprotocol:promotion:promotion-001", "wss://relay.example.com"],
    ["e", "promotion_event_id", "wss://relay.example.com"]
  ],
  "content": "{\"description\": \"Promotions I don't want to see\"}"
}
```

### Blocked Promoters List

Blocks all promotions from specific pubkeys.

```json
{
  "kind": 30000,
  "pubkey": "viewer_pubkey_hex",
  "created_at": 1234567890,
  "tags": [
    ["d", "org.attnprotocol:promoter:blocked"],
    ["t", "862626"],
    ["p", "spammer_pubkey", "wss://relay.example.com"],
    ["p", "scammer_pubkey", "wss://relay.example.com"]
  ],
  "content": "{\"description\": \"Promoters I don't want to see content from\"}"
}
```

### Trusted Marketplaces List

Trusts specific marketplace instances or all marketplaces operated by a pubkey.

```json
{
  "kind": 30000,
  "pubkey": "viewer_pubkey_hex",
  "created_at": 1234567890,
  "tags": [
    ["d", "org.attnprotocol:marketplace:trusted"],
    ["t", "862626"],
    ["a", "38188:marketplace_pubkey:org.attnprotocol:marketplace:nextblock.city", "wss://relay.nextblock.city"],
    ["p", "nextblock_operator_pubkey", "wss://relay.nextblock.city"]
  ],
  "content": "{\"description\": \"Marketplaces I trust for fair payment\"}"
}
```

### Trusted Billboards List

Trusts specific billboard instances or all billboards operated by a pubkey.

```json
{
  "kind": 30000,
  "pubkey": "viewer_pubkey_hex",
  "created_at": 1234567890,
  "tags": [
    ["d", "org.attnprotocol:billboard:trusted"],
    ["t", "862626"],
    ["a", "38288:billboard_pubkey:org.attnprotocol:billboard:nextblock-billboard-001", "wss://relay.nextblock.city"],
    ["p", "nextblock_operator_pubkey", "wss://relay.nextblock.city"]
  ],
  "content": "{\"description\": \"Billboards I trust for accurate view reporting\"}"
}
```

**Trust List Semantics**:
- **Empty list** (no `a` or `p` tags): Trust NO ONE (secure default)
- **List with entries**: Trust ONLY these entities
- **Missing list** (event doesn't exist): Trust NO ONE (secure default)
- **`p` tag**: Trust ALL entities operated by this pubkey
- **`a` tag**: Trust ONLY this specific entity instance

**Important**:
- ATTENTION events must point to blocked list IDs via `a` tags (required) even if the lists are empty
- ATTENTION events may optionally point to trusted list IDs via `a` tags
- The list events themselves can be empty (containing no entries), which means trust no one
- This ensures the event structure is consistent and list coordinates are present for filtering when provided

---

## Schema Consistency Checks

### Naming Conventions

- Event-specific fields: No prefix (e.g., `duration`, `bid`, `name`)
- Reference fields: `ref_{field_name}` (e.g., `ref_marketplace_id`, `ref_promotion_pubkey`)
- Arrays: `field_list` (e.g., `escrow_id_list`, `inbound_id_list`)
- Fees: `{entity}_{fee_type}_fee_sats` (e.g., `match_fee_sats`, `confirmation_fee_sats`)

### Reference Field Consistency

All events use these reference fields consistently (ref_ prefix):
- `ref_marketplace_id`
- `ref_marketplace_pubkey`
- `ref_billboard_id`
- `ref_billboard_pubkey`
- `ref_promotion_id`
- `ref_promotion_pubkey`
- `ref_attention_id`
- `ref_attention_pubkey`
- `ref_match_id`
- `ref_match_event_id`
- `ref_node_pubkey`
- `ref_block_id`
- `ref_billboard_confirmation_event_id`
- `ref_attention_confirmation_event_id`

### Tag Consistency

All events include:
- `["t", "<block_height>"]` - Block height for synchronization
- `["d", "org.attnprotocol:<event_type>:<identifier>"]` - For all protocol events (38088, 38188, 38288, 38388, 38488, 38588, 38688, 38788, 38888, 38988). Format: `org.attnprotocol:` prefix, followed by event type (block, marketplace, billboard, promotion, attention, billboard-confirmation, attention-confirmation, marketplace-confirmation, match, attention-payment-confirmation), followed by unique identifier.
- `["a", "kind:pubkey:org.attnprotocol:event_type:identifier"]` - For referencing ATTN Protocol events (format: `kind:pubkey:org.attnprotocol:event_type:identifier`). For non-protocol events (e.g., video content kind 34236), the format is `kind:pubkey:d_tag` without the `org.attnprotocol:` prefix.
- `["p", "<pubkey>"]` - For all party pubkeys
- `["r", "<relay_url>"]` - For relay hints (multiple allowed)
- `["k", "<kind>"]` - For content kinds (multiple allowed where applicable)

### Array Field Naming

All arrays end with `_list`:
- `escrow_id_list` (PROMOTION)

### Fee Field Consistency

Fees are always in satoshis with `_sats` suffix:
- `match_fee_sats`
- `confirmation_fee_sats`

---

## Key Protocol Features

### 1. Block-Synchronized Timing

Every event includes `["t", "<block_height>"]` tag for Bitcoin block synchronization.

### 2. Flat Data Structure

No nested objects - all fields at top level for easy database insertion:

```typescript
// ✅ Good
{
  "name": "ATTN Protocol Marketplace",
  "match_fee_sats": 0
}

// ❌ Bad
{
  "marketplace": {
    "name": "ATTN Protocol Marketplace",
    "fees": {
      "match": 0
    }
  }
}
```

### 3. Payment Agnostic

`escrow_id_list` are opaque strings. Marketplaces decide payment systems (Lightning, on-chain, etc.).

### 4. Trust By Default = Zero

Empty trust lists mean trust NO ONE. Marketplaces onboard users by adding themselves to user's trust lists.

### 5. Flexible Trust Model

Trust lists support both:
- `a` tags: Trust specific entity instances
- `p` tags: Trust ALL entities operated by a pubkey

### 6. Values Calculated at Ingestion

Events store only source data. Consumers fetch referenced events and calculate derived values (bid, ask, duration, fees, payouts) at ingestion time.
