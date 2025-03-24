# NIP-X3 - SELLER BLOCK LIST
`draft optional`

## Abstract
NIP-X3 defines a standardized mechanism for content viewers (sellers) to express preferences about which promoted content they do not wish to view. This enhancement allows sellers to block specific promotion event IDs or promotions from specific pubkeys using addressable NIP-51 lists, giving them greater control over their viewing experience while maintaining the decentralized nature of the Promoted Note Network.

## Protocol Components

### NEW TAGS FOR KIND:17888
- `global_block_list` - Event ID of a [NIP-51](https://github.com/nostr-protocol/nips/blob/master/51.md) list (kind:30003) containing blocked promotions and promoters
- `k` - Specifies event kinds the seller is willing to view as promoted content

## Key Components

### Preference Types
- **Promotion-Level Preferences**: Block specific promotion event IDs using `e` tags in the [NIP-51](https://github.com/nostr-protocol/nips/blob/master/51.md) list
- **Promoter-Level Preferences**: Block promotions from specific pubkeys using `p` tags in the [NIP-51](https://github.com/nostr-protocol/nips/blob/master/51.md) list
- **Kind Preferences**: Filter by event kinds the seller is willing to view

### Implementation Approach
This NIP extends the existing kind:17888 seller event from [NIP-X1](./NIP-X1.md) with additional tags to express content blocking preferences and content type preferences. The block list is implemented as an addressable [NIP-51](https://github.com/nostr-protocol/nips/blob/master/51.md) list.

## Enhanced Event Specifications

### Blocked Promotions List (NIP-51)
A parameterized replaceable list of kind:30003 containing blocked promotion event IDs and promoter pubkeys as defined in [NIP-51](https://github.com/nostr-protocol/nips/blob/master/51.md):

```json
{
  "kind": 30003,
  "pubkey": "<seller_pubkey>",
  "created_at": 1677647210,
  "tags": [
    ["d", "promotions-block-list"],
    ["e", "<objectionable_promotion_1>"],
    ["e", "<objectionable_promotion_2>"],
    ["e", "<objectionable_promotion_3>"],
    ["p", "<objectionable_promoter_1>"],
    ["p", "<objectionable_promoter_2>"],
    ["summary", "Blocked promotions"]
  ],
  "content": "",
  "id": "<list_event_id>",
  "sig": "<signature>"
}
```

### Seller Event with Preferences
Extended kind:17888 from sellers setting view parameters and referencing the block list:

```json
{
  "kind": 17888,
  "pubkey": "<seller_pubkey>",
  "created_at": 1677647250,
  "tags": [
    ["sats_per_second", "5"],
    ["b", "<billboard_pubkey>", "<relay_url>"],
    ["global_block_list", "<list_event_id>"],
    ["k", "22"],
    ["k", "20"]
  ],
  "content": "",
  "id": "<seller_preferences_id>",
  "sig": "<signature>"
}
```

#### Existing Required Tags (from [NIP-X1](./NIP-X1.md))
- `sats_per_second`: Required payment per view
- `b`: Accepted billboard pubkey and relay

#### Existing Optional Tags (from [NIP-X1](./NIP-X1.md))
- `max_duration`: Maximum viewing duration

#### New Optional Preference Tags
- `global_block_list`: Event ID of a [NIP-51](https://github.com/nostr-protocol/nips/blob/master/51.md) list (kind:30003) containing the seller's block list
- `k`: Event kinds the seller is willing to view as promoted content (can appear multiple times)
  - Example: `["k", "22"]` indicates willingness to view kind:22 short vertical video ([NIP-71](https://github.com/nostr-protocol/nips/blob/master/71.md))
  - Example: `["k", "20"]` indicates willingness to view kind:20 picture events ([NIP-68](https://github.com/nostr-protocol/nips/blob/master/68.md))

## Protocol Behavior

### Preference Evaluation Rules
1. **Addressable Block List**: Block list is maintained as an addressable NIP-51 list
2. **Default Allow**: All promotions are implicitly allowed unless explicitly blocked
3. **Kind Filtering**: Promoted content must be of a kind specified in a `k` tag (if any `k` tags are present)
4. **Most Specific First**: Promotion-level block lists take precedence over promoter-level block lists
5. **Block List Priority**: If a promotion is blocked, it must not be shown regardless of other factors

### Billboard Requirements
- MUST fetch and parse the [NIP-51](https://github.com/nostr-protocol/nips/blob/master/51.md) list referenced by `global_block_list` to determine blocked promotions
- MUST respect all seller block list preferences when matching promotions
- MUST NOT show a blocked promotion to a seller under any circumstances
- MUST NOT show promotions from blocked promoter pubkeys to a seller
- MUST only show promoted content of kinds specified in `k` tags (if present)
- MUST propagate preference changes immediately when a new block list is detected
- MAY cache seller preferences for performance optimization

### Client Requirements
- SHOULD provide user-friendly interfaces for managing the promotion block list
- SHOULD allow sellers to easily add promotion event IDs to their block list
- SHOULD allow sellers to easily add promoter pubkeys to their block list
- SHOULD allow sellers to specify which kinds of content they wish to see promoted
- SHOULD update the [NIP-51](https://github.com/nostr-protocol/nips/blob/master/51.md) list when block list changes are made
- MAY suggest block list entries based on previous seller behavior

## Preference Update Lifecycle
1. To update preferences, sellers:
   - Publish a new or updated [NIP-51](https://github.com/nostr-protocol/nips/blob/master/51.md) list (kind:30003) with blocked promotions
   - Update their kind:17888 event with the new list ID if needed
2. Billboards MUST use the most recent valid kind:17888 event for a seller
3. Billboards MUST use the most recent valid [NIP-51](https://github.com/nostr-protocol/nips/blob/master/51.md) list referenced by the seller
4. Preference changes take effect as soon as the billboard processes the new events

## Flow Diagram
```mermaid
sequenceDiagram
    participant Relay
    participant Billboard
    participant Seller
    participant Buyer

    Seller->>Relay: Publishes kind:30003 NIP-51 list<br/>with blocked promotions and promoters
    Seller->>Relay: Publishes kind:17888 event<br/>with preferences (k, global_block_list)
    Relay->>Billboard: Forwards events to billboard
    Buyer->>Relay: Publishes kind:18888 event<br/>with promotion request
    Relay->>Billboard: Forwards kind:18888 event
    
    Note over Billboard: Billboard checks seller's preferences<br/>(kinds, block list) before matching
    
    alt Promotion matches seller preferences
        Billboard->>Seller: Shows promoted content
    else Promotion doesn't match preferences
        Billboard->>Seller: Does not show promotion<br/>Finds alternative match
    end
```

## Integration with Existing NIPs
This NIP extends [NIP-X1](./NIP-X1.md) by enhancing the seller event kind:17888 with promotion block list and content type preference capabilities. It leverages [NIP-51](https://github.com/nostr-protocol/nips/blob/master/51.md) lists to provide a scalable and maintainable block list. It remains fully compatible with the metrics framework defined in [NIP-X2](./NIP-X2.md), as billboard operators will only match allowable promotions based on seller preferences.

## Future Extensions
A future NIP may define a mechanism for billboard-specific block lists, allowing sellers to maintain different blocking preferences for different billboards by using the billboard pubkey as the `d` tag value.

## Privacy Considerations
- Seller promotion block list preferences are public, as they are published in Nostr events
- Billboards SHOULD NOT reveal detailed block list information in metrics reporting
- Aggregated metrics MAY include overall matching rates without identifying specific block list patterns