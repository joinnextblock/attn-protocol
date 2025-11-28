# ATTN-01 - ATTN Protocol - Core

`draft` `mandatory`

## Abstract

ATTN-01 defines the event kinds, schemas, and tag specifications for the ATTN Protocol.

## Event Kinds

### Protocol Event Kinds
- **38088**: BLOCK (Bitcoin block arrival)
- **38188**: MARKETPLACE
- **38288**: BILLBOARD
- **38388**: PROMOTION
- **38488**: ATTENTION
- **38588**: BILLBOARD_CONFIRMATION
- **38688**: VIEWER_CONFIRMATION
- **38788**: MARKETPLACE_CONFIRMATION
- **38888**: MATCH (promotion-attention match)

### Standard Event Kinds
- **30000**: NIP-51 Lists (blocked promotions, blocked promoters, trusted billboards, trusted marketplaces)

## Event Schemas

The ATTN Protocol uses only official Nostr tags. All custom data is stored in the JSON content field. Block height is stored as a `t` tag for filtering and is required on every event. Tags are used for indexing/filtering; actual data is in the content field.

**Tags used:** `d` (identifier), `t` (block height), `a` (event coordinates), `e` (event references), `p` (pubkeys), `r` (relays), `k` (kinds), `u` (URLs)

### BLOCK Event (kind 38088)

**Purpose:** Published by Bitcoin node services when a new Bitcoin block is confirmed. Used by marketplaces to synchronize auction rounds and finalize matches. This is the foundational event that establishes the timing primitive for the entire protocol.

**Content Fields:**
- `height` (number, required): Block height
- `hash` (string, required): Block hash
- `time` (number, required): Block timestamp (Unix time)
- `difficulty` (string, optional): Block difficulty
- `tx_count` (number, optional): Number of transactions
- `size` (number, optional): Block size in bytes
- `weight` (number, optional): Block weight
- `version` (number, optional): Block version
- `merkle_root` (string, optional): Merkle root hash
- `nonce` (number, optional): Block nonce
- `node_pubkey` (string, required): Bitcoin node service pubkey (from event pubkey)

**Tags:**
- `["t", "<block_height>"]` (required): Block height as topic tag for filtering

**Example:**
```json
{
  "kind": 38088,
  "pubkey": "<node_service_pubkey>",
  "created_at": 1234567890,
  "tags": [
    ["t", "862626"]
  ],
  "content": "{
    \"height\": 862626,
    \"hash\": \"00000000000000000001a7c...\",
    \"time\": 1234567890,
    \"difficulty\": \"97345261772782.69\",
    \"tx_count\": 2345,
    \"node_pubkey\": \"<node_service_pubkey>\"
  }"
}
```

**Notes:**
- One event per block height per Bitcoin node service
- Multiple Bitcoin node services can publish for the same block (clients verify consensus)
- Published by services running Bitcoin nodes (like block timestamp services)
- Block height in `t` tag enables efficient filtering: `{ kinds: [38088], "#t": ["862626"] }`
- All ATTN Protocol events reference block height via `["t", "<block_height>"]` tag
- Block events are the timing primitive for the entire protocol

### MARKETPLACE Event (kind 38188)

**Content Fields:**
- `name` (string, required): Marketplace name
- `description` (string, required): Marketplace description
- `image` (string, optional): Marketplace image URL
- `kind_list` (array, required): Array of event kind numbers that can be promoted (e.g., [34236] for addressable short video events)
- `relay_list` (array, required): Array of relay URLs for this marketplace
- `url` (string, optional): Marketplace website URL
- `admin_pubkey` (string, required): Admin pubkey
- `admin_email` (string, optional): Admin email
- `min_duration` (number, optional, default: 15000): Minimum duration in milliseconds (default: 15 seconds)
- `max_duration` (number, optional, default: 60000): Maximum duration in milliseconds (default: 60 seconds)
- `marketplace_pubkey` (string, required): Marketplace pubkey (from `p` tag)
- `marketplace_id` (string, required): Marketplace identifier (from `d` tag)

**Tags:**
- `["d", "<marketplace_identifier>"]` (required): Marketplace identifier (e.g., "example.marketplace:identifier")
- `["t", "<block_height>"]` (required): Block height as topic tag for filtering
- `["k", "<kind>"]` (required, multiple allowed): Event kinds that can be promoted in this marketplace (e.g., "34236" for addressable short video events per NIP-71)
- `["p", "<marketplace_pubkey>"]` (required): Marketplace pubkey for indexing/filtering
- `["r", "<relay_url>"]` (required, multiple allowed): Relays for this marketplace (for indexing/filtering)
- `["u", "<website_url>"]` (optional): Website URL (for indexing/filtering)

### BILLBOARD Event (kind 38288)

**Content Fields:**
- `name` (string, required): Billboard name
- `description` (string, optional): Billboard description
- `billboard_pubkey` (string, required): Billboard pubkey (from `p` tag)
- `marketplace_pubkey` (string, required): Marketplace pubkey (from `p` tag)
- `billboard_id` (string, required): Billboard identifier (from `d` tag)
- `marketplace_id` (string, required): Marketplace identifier (from marketplace coordinate `a` tag)

**Tags:**
- `["d", "<billboard_identifier>"]` (required): Billboard identifier
- `["t", "<block_height>"]` (required): Block height as topic tag for filtering
- `["a", "<marketplace_coordinate>"]` (required): Marketplace reference in coordinate format: `38188:<marketplace_pubkey>:<marketplace_id>`
- `["p", "<billboard_pubkey>"]` (required): Billboard pubkey
- `["p", "<marketplace_pubkey>"]` (required): Marketplace pubkey
- `["r", "<relay_url>"]` (required, multiple allowed): Relay URLs (for indexing)
- `["k", "<kind>"]` (required): Event kinds this billboard can display (for indexing)
- `["u", "<url>"]` (required): Billboard website URL (for indexing)

### PROMOTION Event (kind 38388)

**Content Fields:**
- `duration` (number, required): Duration in milliseconds
- `bid` (number, required): Total bid in satoshis for the duration
- `event_id` (string, required): Event ID of the content being promoted (the video)
- `description` (string, optional): Text description
- `call_to_action` (string, required): CTA button text
- `call_to_action_url` (string, required): CTA button URL
- `marketplace_pubkey` (string, required): Marketplace pubkey (from `p` tag)
- `promotion_pubkey` (string, required): Promotion pubkey (from `p` tag)
- `marketplace_id` (string, required): Marketplace identifier (from marketplace coordinate `a` tag)
- `promotion_id` (string, required): Promotion identifier (from `d` tag)

- **Tags:**
- `["d", "<promotion_identifier>"]` (required): Promotion identifier
- `["t", "<block_height>"]` (required): Block height as topic tag for filtering
- `["a", "<marketplace_coordinate>"]` (required): Marketplace reference in coordinate format: `38188:<marketplace_pubkey>:<marketplace_id>`
- `["a", "<video_coordinate>"]` (required): Video reference in coordinate format: `34236:<video_author_pubkey>:<video_d_tag>`
- `["a", "<billboard_coordinate>"]` (required): Billboard reference in coordinate format: `38288:<billboard_pubkey>:<billboard_id>`
- `["p", "<marketplace_pubkey>"]` (required): Marketplace pubkey
- `["p", "<promotion_pubkey>"]` (required): Promotion pubkey
- `["r", "<relay_url>"]` (required, multiple allowed): Relay URLs
- `["k", "<kind>"]` (required, default: 34236): Kind of event being promoted
- `["u", "<url>"]` (required): Promotion URL

### ATTENTION Event (kind 38488)

**Content Fields:**
- `ask` (number, required): Total ask in satoshis for the duration (same as `bid` in PROMOTION)
- `min_duration` (number, required): Minimum duration in milliseconds
- `max_duration` (number, required): Maximum duration in milliseconds
- `kind_list` (array, required): Array of event kind numbers the attention owner is willing to see
- `relay_list` (array, required): Array of relay URLs
- `attention_pubkey` (string, required): Attention pubkey (from `p` tag)
- `marketplace_pubkey` (string, required): Marketplace pubkey (from `p` tag)
- `attention_id` (string, required): Attention identifier (from `d` tag)
- `marketplace_id` (string, required): Marketplace identifier (from marketplace coordinate `a` tag)
- `blocked_promotions_id` (string, required): D tag value of the blocked promotions list (default: `org.attnprotocol:promotion:blocked`)
- `blocked_promoters_id` (string, required): D tag value of the blocked promoters list (default: `org.attnprotocol:promoter:blocked`)

**Tags:**
- `["d", "<attention_identifier>"]` (required): Attention identifier
- `["t", "<block_height>"]` (required): Block height as topic tag for filtering
- `["a", "<marketplace_coordinate>"]` (required): Marketplace reference in coordinate format: `38188:<marketplace_pubkey>:<marketplace_id>`
- `["a", "<blocked_promotions_coordinate>"]` (required): Blocked promotions list reference: `30000:<attention_pubkey>:org.attnprotocol:promotion:blocked`
- `["a", "<blocked_promoters_coordinate>"]` (required): Blocked promoters list reference: `30000:<attention_pubkey>:org.attnprotocol:promoter:blocked`
- `["p", "<attention_pubkey>"]` (required): Attention pubkey (attention owner)
- `["p", "<marketplace_pubkey>"]` (required): Marketplace pubkey
- `["r", "<relay_url>"]` (required, multiple allowed): Relay URLs (for indexing)
- `["k", "<kind>"]` (required, multiple allowed): Event kinds the attention owner is willing to see (for indexing)

### MATCH Event (kind 38888)

**Content Fields:**
- `ask` (number, required): Ask amount in satoshis
- `bid` (number, required): Bid amount in satoshis
- `duration` (number, required): Duration in milliseconds
- `kind_list` (array, required): Array of event kind numbers
- `relay_list` (array, required): Array of relay URLs
- `marketplace_pubkey` (string, required): Marketplace pubkey (from `p` tag)
- `promotion_pubkey` (string, required): Promotion pubkey (from `p` tag)
- `attention_pubkey` (string, required): Attention pubkey (from `p` tag)
- `billboard_pubkey` (string, required): Billboard pubkey (from billboard coordinate `a` tag)
- `marketplace_id` (string, required): Marketplace identifier (from marketplace coordinate `a` tag)
- `billboard_id` (string, required): Billboard identifier (from billboard coordinate `a` tag)
- `promotion_id` (string, required): Promotion identifier (from promotion coordinate `a` tag)
- `attention_id` (string, required): Attention identifier (from attention coordinate `a` tag)

- **Tags:**
- `["d", "<match_identifier>"]` (required): Match identifier
- `["t", "<block_height>"]` (required): Block height as topic tag for filtering
- `["a", "<marketplace_coordinate>"]` (required): Marketplace reference in coordinate format: `38188:<marketplace_pubkey>:<marketplace_id>`
- `["a", "<billboard_coordinate>"]` (required): Billboard reference in coordinate format: `38288:<billboard_pubkey>:<billboard_id>`
- `["a", "<promotion_coordinate>"]` (required): Promotion reference in coordinate format: `38388:<promotion_pubkey>:<promotion_id>`
- `["a", "<attention_coordinate>"]` (required): Attention reference in coordinate format: `38488:<attention_pubkey>:<attention_id>`
- `["p", "<marketplace_pubkey>"]` (required): Marketplace pubkey
- `["p", "<promotion_pubkey>"]` (required): Promotion pubkey
- `["p", "<attention_pubkey>"]` (required): Attention pubkey
- `["r", "<relay_url>"]` (required, multiple allowed): Relay URLs
- `["k", "<kind>"]` (required, multiple allowed): Event kinds (for indexing)

### BILLBOARD_CONFIRMATION Event (kind 38588)

**Content Fields:**
- `block` (number, required): Block height as integer
- `price` (number, required): Total satoshis settled
- `marketplace_event_id` (string, required): Marketplace event ID
- `promotion_event_id` (string, required): Promotion event ID
- `attention_event_id` (string, required): Attention event ID
- `match_event_id` (string, required): Match event ID
- `marketplace_pubkey` (string, required): Marketplace pubkey
- `promotion_pubkey` (string, required): Promotion creator pubkey
- `attention_pubkey` (string, required): Attention owner pubkey
- `billboard_pubkey` (string, required): Billboard operator pubkey
- `marketplace_id` (string, required): Marketplace identifier
- `promotion_id` (string, required): Promotion identifier
- `attention_id` (string, required): Attention identifier
- `match_id` (string, required): Match identifier

- **Tags:**
- `["a", "<marketplace_coordinate>"]` (required): Marketplace coordinate in format: `38188:<marketplace_pubkey>:<marketplace_id>`
- `["a", "<promotion_coordinate>"]` (required): Promotion coordinate in format: `38388:<promotion_pubkey>:<promotion_id>`
- `["a", "<attention_coordinate>"]` (required): Attention coordinate in format: `38488:<attention_pubkey>:<attention_id>`
- `["a", "<match_coordinate>"]` (required): Match coordinate in format: `38888:<match_pubkey>:<match_id>`
- `["e", "<marketplace_event_id>"]` (required): Reference to marketplace event
- `["e", "<promotion_event_id>"]` (required): Reference to promotion event
- `["e", "<attention_event_id>"]` (required): Reference to attention event
- `["e", "<match_event_id>"]` (required): Reference to match event
- `["p", "<marketplace_pubkey>"]` (required): Marketplace pubkey
- `["p", "<promotion_pubkey>"]` (required): Promotion creator pubkey
- `["p", "<attention_pubkey>"]` (required): Attention owner pubkey
- `["p", "<billboard_pubkey>"]` (required): Billboard operator pubkey
- `["r", "<relay_url>"]` (required, multiple allowed): Relay URLs
- `["t", "<block_height>"]` (required): Block height as string for filtering
- `["u", "<url>"]` (required): URL (billboard website or confirmation page)

### VIEWER_CONFIRMATION Event (kind 38688)

**Content Fields:**
- `block` (number, required): Block height as integer
- `price` (number, required): Total satoshis settled
- `marketplace_event_id` (string, required): Marketplace event ID
- `promotion_event_id` (string, required): Promotion event ID
- `attention_event_id` (string, required): Attention event ID
- `match_event_id` (string, required): Match event ID
- `marketplace_pubkey` (string, required): Marketplace pubkey
- `promotion_pubkey` (string, required): Promotion creator pubkey
- `attention_pubkey` (string, required): Attention owner pubkey
- `billboard_pubkey` (string, required): Billboard operator pubkey
- `marketplace_id` (string, required): Marketplace identifier
- `promotion_id` (string, required): Promotion identifier
- `attention_id` (string, required): Attention identifier
- `match_id` (string, required): Match identifier

- **Tags:**
- `["a", "<marketplace_coordinate>"]` (required): Marketplace coordinate in format: `38188:<marketplace_pubkey>:<marketplace_id>`
- `["a", "<promotion_coordinate>"]` (required): Promotion coordinate in format: `38388:<promotion_pubkey>:<promotion_id>`
- `["a", "<attention_coordinate>"]` (required): Attention coordinate in format: `38488:<attention_pubkey>:<attention_id>`
- `["a", "<match_coordinate>"]` (required): Match coordinate in format: `38888:<match_pubkey>:<match_id>`
- `["e", "<marketplace_event_id>"]` (required): Reference to marketplace event
- `["e", "<promotion_event_id>"]` (required): Reference to promotion event
- `["e", "<attention_event_id>"]` (required): Reference to attention event
- `["e", "<match_event_id>"]` (required): Reference to match event
- `["p", "<marketplace_pubkey>"]` (required): Marketplace pubkey
- `["p", "<promotion_pubkey>"]` (required): Promotion creator pubkey
- `["p", "<attention_pubkey>"]` (required): Attention owner pubkey
- `["p", "<billboard_pubkey>"]` (required): Billboard operator pubkey
- `["r", "<relay_url>"]` (required, multiple allowed): Relay URLs
- `["t", "<block_height>"]` (required): Block height as string for filtering
- `["u", "<url>"]` (required): URL (attention owner website or confirmation page)

### MARKETPLACE_CONFIRMATION Event (kind 38788)

**Content Fields:**
- `block` (number, required): Block height as integer
- `duration` (number, required): Duration in milliseconds
- `ask` (number, required): Ask amount in satoshis
- `bid` (number, required): Bid amount in satoshis
- `price` (number, required): Total satoshis settled
- `marketplace_event_id` (string, required): Marketplace event ID
- `promotion_event_id` (string, required): Promotion event ID
- `attention_event_id` (string, required): Attention event ID
- `match_event_id` (string, required): Match event ID
- `billboard_confirmation_event_id` (string, required): Billboard confirmation event ID
- `viewer_confirmation_event_id` (string, required): Viewer confirmation event ID
- `marketplace_pubkey` (string, required): Marketplace pubkey
- `promotion_pubkey` (string, required): Promotion creator pubkey
- `attention_pubkey` (string, required): Attention owner pubkey
- `billboard_pubkey` (string, required): Billboard operator pubkey
- `marketplace_id` (string, required): Marketplace identifier
- `promotion_id` (string, required): Promotion identifier
- `attention_id` (string, required): Attention identifier
- `match_id` (string, required): Match identifier

- **Tags:**
- `["a", "<marketplace_coordinate>"]` (required): Marketplace coordinate in format: `38188:<marketplace_pubkey>:<marketplace_id>`
- `["a", "<promotion_coordinate>"]` (required): Promotion coordinate in format: `38388:<promotion_pubkey>:<promotion_id>`
- `["a", "<attention_coordinate>"]` (required): Attention coordinate in format: `38488:<attention_pubkey>:<attention_id>`
- `["a", "<match_coordinate>"]` (required): Match coordinate in format: `38888:<match_pubkey>:<match_id>`
- `["e", "<marketplace_event_id>"]` (required): Reference to marketplace event
- `["e", "<promotion_event_id>"]` (required): Reference to promotion event
- `["e", "<attention_event_id>"]` (required): Reference to attention event
- `["e", "<match_event_id>"]` (required): Reference to match event
- `["e", "<billboard_confirmation_event_id>"]` (required): Reference to billboard confirmation
- `["e", "<viewer_confirmation_event_id>"]` (required): Reference to viewer confirmation
- `["p", "<marketplace_pubkey>"]` (required): Marketplace pubkey
- `["p", "<promotion_pubkey>"]` (required): Promotion creator pubkey
- `["p", "<attention_pubkey>"]` (required): Attention owner pubkey
- `["p", "<billboard_pubkey>"]` (required): Billboard operator pubkey
- `["r", "<relay_url>"]` (required, multiple allowed): Relay URLs
- `["t", "<block_height>"]` (required): Block height as string for filtering
- `["u", "<url>"]` (required): URL (marketplace website or confirmation page)

### NIP-51 Lists (kind 30000)

The ATTN Protocol uses NIP-51 lists for user preferences around blocking and trusting actors and events. All ATTN Protocol lists use the namespace prefix `org.attnprotocol:` in their `d` tags.

**Naming Convention:** `org.attnprotocol:<resource>:<action>`

**List Types:**
- `["d", "org.attnprotocol:promotion:blocked"]` - Blocked promotions list (uses `a` tags)
- `["d", "org.attnprotocol:promoter:blocked"]` - Blocked promoters list (uses `p` tags)
- `["d", "org.attnprotocol:billboard:trusted"]` - Trusted billboards list (uses `a` tags)
- `["d", "org.attnprotocol:marketplace:trusted"]` - Trusted marketplaces list (uses `a` tags)

**Tag Usage:**
- **P tags**: Used to reference pubkeys (actors) - blocks/trusts ALL content from that pubkey
- **A tags**: Used to reference specific event coordinates - blocks/trusts specific instances

#### Blocked Promotions List

Blocks specific promotion events by their coordinates.

```json
{
  "kind": 30000,
  "pubkey": "<user_pubkey>",
  "created_at": 1234567890,
  "tags": [
    ["d", "org.attnprotocol:promotion:blocked"],
    ["a", "38388:promoter_pubkey_1:promotion-id-1"],
    ["a", "38388:promoter_pubkey_2:promotion-id-2"],
    ["t", "862626"]
  ],
  "content": ""
}
```

#### Blocked Promoters List

Blocks all promotions from specific pubkeys.

```json
{
  "kind": 30000,
  "pubkey": "<user_pubkey>",
  "created_at": 1234567890,
  "tags": [
    ["d", "org.attnprotocol:promoter:blocked"],
    ["p", "<promoter_pubkey_1>"],
    ["p", "<promoter_pubkey_2>"],
    ["t", "862626"]
  ],
  "content": ""
}
```

#### Trusted Billboards List

Trusts specific billboard instances (a tags only).

```json
{
  "kind": 30000,
  "pubkey": "<user_pubkey>",
  "created_at": 1234567890,
  "tags": [
    ["d", "org.attnprotocol:billboard:trusted"],
    ["a", "38288:billboard_pubkey_1:billboard-times-square"],
    ["a", "38288:billboard_pubkey_2:billboard-downtown"],
    ["t", "862626"]
  ],
  "content": ""
}
```

#### Trusted Marketplaces List

Trusts specific marketplace instances (a tags only).

```json
{
  "kind": 30000,
  "pubkey": "<user_pubkey>",
  "created_at": 1234567890,
  "tags": [
    ["d", "org.attnprotocol:marketplace:trusted"],
    ["a", "38188:marketplace_pubkey_1:myrr"],
    ["a", "38188:marketplace_pubkey_2:other-marketplace"],
    ["t", "862626"]
  ],
  "content": ""
}
```
