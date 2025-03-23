# NIP-X$ - Seller Interests for Promoted Notes

`draft` `optional`

## Abstract

This NIP defines a standardized mechanism for sellers in the Promoted Notes network to express content interests using the standard Nostr topic tag. By enhancing the seller event (kind:17888) with topic tags, billboards can more effectively match relevant promoted content with interested viewers, improving the experience for all marketplace participants.

## Motivation

In the current Promoted Notes system (NIP-X1), sellers have no standardized way to signal content preferences, leading to random or purely economic-based content matching. This NIP introduces content relevance as a matching criterion, enabling:

1. Better viewer experience through relevant content
2. Improved engagement rates for buyers
3. More efficient marketplace operation
4. Enhanced value proposition for all participants

## Implementation

### Topic Tags in Seller Events

This NIP extends kind:17888 events to include the standard Nostr topic tag (`t`). No new tags are introduced, maintaining compatibility with existing Nostr conventions.

```json
{
  "kind": 17888,
  "pubkey": "<seller_pubkey>",
  "content": "",
  "created_at": UNIX_TIMESTAMP,
  "tags": [
    ["max_duration", "<value>", "seconds"],
    ["sats_per_second", "<value>"],
    ["b", "<billboard_pubkey>", "<relay_url>"],
    ["t", "technology"],
    ["t", "bitcoin"],
    ["t", "programming"]
  ]
}
```

### Billboard Matching Behavior

Billboards implementing this NIP SHOULD:

1. Extract and index topic tags from both promoted notes and seller events
2. Implement case-insensitive topic matching (e.g., "bitcoin" matches "Bitcoin")
3. Prioritize promotions with topics matching seller interests when multiple valid matches exist
4. Balance topic relevance with economic factors (bid/ask matching, fees)
5. Continue honoring blacklist preferences from [NIP-X3](./NIP-X3-seller-blacklist.md) if implemented

### Integration with NIP-51 Interest Sets

Billboards MAY additionally consult a seller's Interest sets (kind:30015) defined in NIP-51 for enhanced matching, but MUST primarily rely on topics explicitly included in kind:17888 events as these represent the current active interests in the promotion context.

## Technical Details

### Topic Matching Algorithms

Billboard operators have implementation flexibility but SHOULD consider:

1. **Exact Matching**: Direct topic-to-topic comparison (recommended baseline)
2. **Hierarchical Matching**: Recognizing topic hierarchies (e.g., "cryptocurrency" is related to "bitcoin")
3. **Semantic Matching**: Limited fuzzy matching of closely related terms

Regardless of the matching algorithm used, billboards MUST document their approach.

### Performance Considerations

For efficient implementation:

1. Topics SHOULD be indexed for fast lookup
2. Topic matching SHOULD be pre-computed where possible
3. Caching strategies SHOULD be employed for frequent matches
4. Billboard operators SHOULD establish reasonable limits on the number of topic tags they process

### Topic Standardization

While this NIP does not mandate a specific topic taxonomy, billboard operators are encouraged to:

1. Normalize topics to lowercase during matching
2. Strip special characters and spaces
3. Consider providing suggested topic lists to clients
4. Develop industry conventions around common topics

## Client Implementation Guidance

Client developers SHOULD:

1. Provide intuitive interfaces for adding and removing topic tags
2. Suggest common or trending topics from the broader Nostr ecosystem
3. Allow easy discovery of content categories
4. Automatically suggest topics based on user behavior (optional)
5. Display current topic preferences clearly to users

## Examples

### Basic Topic Preferences

```json
{
  "kind": 17888,
  "tags": [
    ["sats_per_second", "5"],
    ["b", "<billboard_pubkey>", "<relay_url>"],
    ["t", "bitcoin"],
    ["t", "lightning"]
  ]
}
```

### Combined with Blacklist Preferences

```json
{
  "kind": 17888,
  "tags": [
    ["sats_per_second", "6"],
    ["b", "<billboard_pubkey>", "<relay_url>"],
    ["t", "art"],
    ["t", "nft"],
    ["block_p", "<annoying_creator>"]
  ]
}
```

## Benefits and Outcomes

- **For Sellers**: More engaging and relevant content viewing experience
- **For Buyers**: Better targeting and higher engagement rates
- **For Billboards**: Enhanced matching capability and value proposition
- **For Ecosystem**: More efficient marketplace with quality-based incentives

## Compatibility

This NIP is fully compatible with:
- NIP-X1 (Basic Protocol for Promoted Notes)
- NIP-X2 (Billboard Metrics)
- NIP-X3 (Seller Preferences)
- NIP-51 (Lists, for complementary Interest sets)

Billboards that do not implement this NIP will ignore topic tags and continue functioning with basic economic matching as defined in NIP-X1.

## References

1. NIP-X1: Basic Protocol for Promoted Notes
2. NIP-X2: Billboard Metrics
3. NIP-X3: Seller Preferences
4. NIP-51: Lists

## Authors

*[To be completed]*
