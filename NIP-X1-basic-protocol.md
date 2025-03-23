# NIP-X1 - BASIC PROTOCOL
`draft mandatory`

## Abstract
NIP-XX defines a decentralized protocol for content promotion on Nostr. The protocol establishes a market-driven system connecting content promoters (buyers), content viewers (sellers), and verification nodes (billboards).

## Protocol Components

### NEW TAGS

- b - the pubkey of a billboard

## Key Components

### Protocol Participants
- **Relay**: Standard Nostr relay servers that propagate events between participants
- **Buyers**: Nostr pubkeys that publish kind:18888 events to promote specific notes
- **Sellers**: Nostr pubkeys that publish kind:17888 events to signal availability for viewing promoted content
- **Billboards**: Verification nodes that publish kind:28888 events, match buyers with sellers, and validate content viewing

### Event Schema Implementation
- **kind:28888**: Defines billboard operational parameters
  - Fee structure (percentage or fixed amount)
  - Duration constraints (minimum/maximum viewing time)
  - Update interval (frequency of promotion rotation)
  - Service endpoints (primary/backup URLs)
  - Relay preferences (read/write specifications)

- **kind:18888**: Defines buyer promotion parameters
  - Target note ID (event to be promoted)
  - Sats/Second amount (payment offered per view)
  - Duration requirement (viewing time needed)
  - Trusted billboard specification (pubkey and relay)

- **kind:17888**: Defines seller viewing parameters
  - Sats/Second amount (payment required per view)
  - Maximum duration (upper limit on viewing time)
  - Accepted billboard specification (pubkey and relay)


## Event Specifications

### Billboard Configuration
Event kind:28888 defining billboard operating parameters

```json
{
    "kind": 28888,
    "pubkey": "<billboard_pubkey>",
    "content": "{optional: billboard name}",
    "created_at": UNIX_TIMESTAMP,
    "tags": [
        ["max_duration", "<value>", "seconds"],
        ["min_duration", "<value>", "seconds"],
        ["interval", "<value>", "seconds"],
        ["fee", "<value>", "percent|sats"],
        ["min_fee", "<value>", "sats"],
        ["u", "<url>", "primary"],
        ["u", "<url>", "backup"],
        ["nip", "X1"],
        ["nip", "X2"],
        ["k", "22"],
        ["k", "20"],
    ]
}
```

#### Required Tags
- `interval`: Update frequency in seconds
- `fee`: Billboard commission (percent or fixed sats)
- `u`: Billboard endpoint URLs
- `nips`: Implemented NIP versions
- `kinds`: supported kinds of promotion

#### Optional Tags
- `max_duration`: Maximum allowed view duration
- `min_duration`: Minimum allowed view duration
- `min_fee`: Minimum commission in sats

### Buyer Event
Event kind:18888 from buyers requesting note promotion

```json
{
    "kind": 18888,
    "pubkey": "<buyer_pubkey>",
    "content": "",
    "created_at": UNIX_TIMESTAMP,
    "tags": [
        ["e", "<note_id>"],
        ["duration", "<value>", "seconds"],
        ["sats_per_second", "<value>"],
        ["b", "<billboard_pubkey>", "<relay_url>"]
    ]
}
```

#### Required Tags
- `e`: ID of note to promote
- `duration`: Required view duration
- `sats_per_second`: Payment amount per view
- `b`: Trusted billboard pubkey and relay

### Seller Event
Event kind:17888 from sellers setting view parameters

```json
{
    "kind": 17888,
    "pubkey": "<seller_pubkey>",
    "content": "",
    "created_at": UNIX_TIMESTAMP,
    "tags": [
        ["max_duration", "<value>", "seconds"],
        ["sats_per_second", "<value>"],
        ["b", "<billboard_pubkey>", "<relay_url>"]
    ]
}
```

#### Required Tags
- `sats_per_second`: Required payment per view
- `b`: Accepted billboard pubkey and relay

#### Optional Tags
- `max_duration`: Maximum viewing duration

## Protocol Behavior

### Promotion Lifecycle
- Promotions are initiated when buyers publish kind:18888 events
- A promotion remains active until one of:
  1. The buyer publishes a kind:5 event referencing the promotion event ID
  2. The billboard terminates the promotion based on its criteria
- Billboards MUST:
  - Monitor for kind:5 events referencing active promotions
  - Remove promotions immediately upon detecting valid deletion events

### Billboard Requirements
- MUST validate all duration values against configured limits
- MUST reject promotions where BUYER sats_per_second < SELLER sats_per_second
- MUST attempt billboard URLs in specified order
- MUST operate on specified relays according to read/write designation
- MUST honor fee structure specified in configuration

### Client Requirements
- SHOULD publish events to billboard's write/both relays
- SHOULD monitor billboard's read/both relays
- MUST respect billboard's minimum duration requirements
- MUST include valid billboard pubkey in events

## Flow Diagram
```mermaid
sequenceDiagram
    participant Relay
    participant Billboard
    participant Seller
    participant Buyer

    Billboard->>Relay: Publishes kind:28888 event<br/>with configuration details<br/>(fees, durations, URLs)
    Note over Billboard: Billboard subscribes to all 18888 & 17888 events
    Buyer->>Relay: Publishes kind:18888 event<br/>with promotion request<br/>(note ID, bid, duration)
    Relay->>Billboard: Publishes kind:18888 event<br/>with promotion request<br/>(note ID, bid, duration)
    Seller->>Relay: Publishes kind:17888 event<br/>with participation details<br/>(asking price)
    Relay->>Billboard: Publishes kind:17888 event<br/>with promotion request<br/>(note ID, bid, duration)
    Seller->>Billboard: Navigates to billboard
    Billboard->>Seller: Billboard displays best promoted note for seller
    Note over Relay,Buyer: verification notes defined in NIP-XX
    Note over Relay,Buyer: payment notes defined in NIP-XX
    Note over Relay,Buyer: statistic notes defined in NIP-XX
```

### Trust Model
- Buyers specify trusted billboards in promotion requests
- Sellers specify accepted billboards in participation events
- Trust relationships are sovereign and market-driven
- No central billboard authority required

### Basic Workflow

1. **Registration**: Billboards Operators publish kind:28888 events announcing their services
2. **Seller Availability**: Sellers publish kind:17888 events indicating willingness to view content
3. **Buyer Request**: Buyers publish kind:18888 events to promote specific notes
4. **Matching**: Billboards Operators match buyers with sellers when bid ≥ ask
5. **Verification**: Billboards Operators validates that sellers viewed content for required duration