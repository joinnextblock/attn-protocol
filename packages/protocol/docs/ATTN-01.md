# ATTN-01 - ATTN Protocol - Core

`draft` `mandatory`

## Abstract

ATTN-01 defines the event kinds, schemas, and tag specifications for the ATTN Protocol.

## Event Kinds

### New Event Kinds
- **38088**: MARKETPLACE
- **38188**: BILLBOARD
- **38288**: PROMOTION
- **38388**: ATTENTION
- **38488**: BILLBOARD_CONFIRMATION
- **38588**: VIEWER_CONFIRMATION
- **38688**: MARKETPLACE_CONFIRMATION
- **38888**: MATCH (promotion-attention match)

### Existing Event Kinds
- **30000**: Trusted BILLBOARD list, Trusted MARKETPLACE list (NIP-51)

### Protocol-Specific Event Kinds
- **38988**: Blocked PROMOTION list

## Event Schemas

The ATTN Protocol uses only official Nostr tags. All custom data is stored in the JSON content field. Block height is stored as a `t` tag for filtering. Tags are used for indexing/filtering; actual data is in the content field.

**Tags used:** `d` (identifier), `t` (block height), `a` (event coordinates), `e` (event references), `p` (pubkeys), `r` (relays), `k` (kinds), `u` (URLs)

### MARKETPLACE Event (kind 38088)

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
- `["d", "<marketplace_identifier>"]` (required): Marketplace identifier (e.g., "city.nextblock.marketplace:city")
- `["t", "<block_height>"]` (required): Block height as topic tag for filtering
- `["k", "<kind>"]` (required, multiple allowed): Event kinds that can be promoted in this marketplace (e.g., "34236" for addressable short video events per NIP-71)
- `["p", "<marketplace_pubkey>"]` (required): Marketplace pubkey for indexing/filtering
- `["r", "<relay_url>"]` (required, multiple allowed): Relays for this marketplace (for indexing/filtering)
- `["u", "<website_url>"]` (optional): Website URL (for indexing/filtering)

### BILLBOARD Event (kind 38188)

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
- `["a", "<marketplace_coordinate>"]` (required): Marketplace reference in coordinate format: `38088:<marketplace_pubkey>:<marketplace_id>`
- `["p", "<billboard_pubkey>"]` (required): Billboard pubkey
- `["p", "<marketplace_pubkey>"]` (required): Marketplace pubkey
- `["r", "<relay_url>"]` (required, multiple allowed): Relay URLs (for indexing)
- `["k", "<kind>"]` (required): Event kinds this billboard can display (for indexing)
- `["u", "<url>"]` (required): Billboard website URL (for indexing)

### PROMOTION Event (kind 38288)

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

**Tags:**
- `["d", "<promotion_identifier>"]` (required): Promotion identifier
- `["t", "<block_height>"]` (required): Block height as topic tag for filtering
- `["a", "<marketplace_coordinate>"]` (required): Marketplace reference in coordinate format: `38088:<marketplace_pubkey>:<marketplace_id>`
- `["a", "<video_coordinate>"]` (required): Video reference in coordinate format: `34236:<video_author_pubkey>:<video_d_tag>`
- `["a", "<billboard_coordinate>"]` (required): Billboard reference in coordinate format: `38188:<billboard_pubkey>:<billboard_id>`
- `["p", "<marketplace_pubkey>"]` (required): Marketplace pubkey
- `["p", "<promotion_pubkey>"]` (required): Promotion pubkey
- `["r", "<relay_url>"]` (required, multiple allowed): Relay URLs
- `["k", "<kind>"]` (required, default: 34236): Kind of event being promoted
- `["u", "<url>"]` (required): Promotion URL

### ATTENTION Event (kind 38388)

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

**Tags:**
- `["d", "<attention_identifier>"]` (required): Attention identifier
- `["t", "<block_height>"]` (required): Block height as topic tag for filtering
- `["a", "<marketplace_coordinate>"]` (required): Marketplace reference in coordinate format: `38088:<marketplace_pubkey>:<marketplace_id>`
- `["a", "<block_list_coordinate>"]` (required): Block list reference in coordinate format: `38988:<block_list_owner_pubkey>:<block_list_d_tag>` (required even if list is empty)
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

**Tags:**
- `["d", "<match_identifier>"]` (required): Match identifier
- `["t", "<block_height>"]` (required): Block height as topic tag for filtering
- `["a", "<marketplace_coordinate>"]` (required): Marketplace reference in coordinate format: `38088:<marketplace_pubkey>:<marketplace_id>`
- `["a", "<billboard_coordinate>"]` (required): Billboard reference in coordinate format: `38188:<billboard_pubkey>:<billboard_id>`
- `["a", "<promotion_coordinate>"]` (required): Promotion reference in coordinate format: `38288:<promotion_pubkey>:<promotion_id>`
- `["a", "<attention_coordinate>"]` (required): Attention reference in coordinate format: `38388:<attention_pubkey>:<attention_id>`
- `["p", "<marketplace_pubkey>"]` (required): Marketplace pubkey
- `["p", "<promotion_pubkey>"]` (required): Promotion pubkey
- `["p", "<attention_pubkey>"]` (required): Attention pubkey
- `["r", "<relay_url>"]` (required, multiple allowed): Relay URLs
- `["k", "<kind>"]` (required, multiple allowed): Event kinds (for indexing)

### BILLBOARD_CONFIRMATION Event (kind 38488)

**Content Fields:**
- `block` (number, required): Block height as integer
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

**Tags:**
- `["a", "<marketplace_coordinate>"]` (required): Marketplace coordinate in format: `38088:<marketplace_pubkey>:<marketplace_id>`
- `["a", "<promotion_coordinate>"]` (required): Promotion coordinate in format: `38288:<promotion_pubkey>:<promotion_id>`
- `["a", "<attention_coordinate>"]` (required): Attention coordinate in format: `38388:<attention_pubkey>:<attention_id>`
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

### VIEWER_CONFIRMATION Event (kind 38588)

**Content Fields:**
- `block` (number, required): Block height as integer
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

**Tags:**
- `["a", "<marketplace_coordinate>"]` (required): Marketplace coordinate in format: `38088:<marketplace_pubkey>:<marketplace_id>`
- `["a", "<promotion_coordinate>"]` (required): Promotion coordinate in format: `38288:<promotion_pubkey>:<promotion_id>`
- `["a", "<attention_coordinate>"]` (required): Attention coordinate in format: `38388:<attention_pubkey>:<attention_id>`
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

### MARKETPLACE_CONFIRMATION Event (kind 38688)

**Content Fields:**
- `block` (number, required): Block height as integer
- `sats_settled` (number, required): Total satoshis settled
- `payout_breakdown` (object, optional): Payout breakdown by recipient
  - `viewer` (number): Satoshis to attention owner
  - `billboard` (number): Satoshis to billboard operator
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

**Tags:**
- `["a", "<marketplace_coordinate>"]` (required): Marketplace coordinate in format: `38088:<marketplace_pubkey>:<marketplace_id>`
- `["a", "<promotion_coordinate>"]` (required): Promotion coordinate in format: `38288:<promotion_pubkey>:<promotion_id>`
- `["a", "<attention_coordinate>"]` (required): Attention coordinate in format: `38388:<attention_pubkey>:<attention_id>`
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
