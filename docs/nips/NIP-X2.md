# NIP-X2 - PREFERRED TOPICS

`draft` `optional`

## Abstract
NIP-X2 defines a standardized mechanism for PROMOTION Viewers to express content interests using the standard Nostr topic tag within the PROMO Protocol. By enhancing the ATTENTION event (kind:38888) with topic tags, BROKERAGE Operators can more effectively match relevant PROMOTIONS and ATTENTION. This improvement increases content relevance for PROMOTION Viewers while enabling higher engagement rates for PROMOTION Creators, creating a more efficient marketplace based on content preferences rather than economic factors alone.

## Examples

### BILLBOARD
```json
{
    "kind": 38088,
    "pubkey": "<BILLBOARD_OPERATOR_pubkey>",
    "created_at": <unix_timestamp>,
    "content": "",
    "tags": [
        //...
        ["t", "nostr"],
        ["t", "bitcoin"],
    ]
}
```

### PROMOTION
```json
{
    "kind": 38188,
    "pubkey": "<PROMOTION_CREATOR_pubkey>",
    "created_at": <unix_timestamp>,
    "content": "",
    "tags": [
        //...
        ["t", "nostr"],
        ["t", "bitcoin"],
    ]
}
```

### ATTENTION
```json
{
    "kind": 38888,
    "pubkey": "<PROMOTION_VIEWER_pubkey>",
    "created_at": <unix_timestamp>,
    "content": "",
    "tags": [
        //...
        ["t", "nostr"],
        ["t", "bitcoin"],
    ]
}
```