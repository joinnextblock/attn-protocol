# @attn-protocol/core

Core constants and types for ATTN Protocol.

This package provides shared constants and type definitions used across all ATTN Protocol packages.

## Exports

### Constants

- `ATTN_EVENT_KINDS` - Event kind numbers (38188-38988)
- `CITY_PROTOCOL_KINDS` - City Protocol event kinds referenced by ATTN (38808 for BLOCK)
- `NIP51_LIST_TYPES` - NIP-51 list type identifiers

### Types

- `BlockHeight` - Bitcoin block height (number)
- `Pubkey` - Nostr public key (string)
- `EventId` - Nostr event ID (string)
- `RelayUrl` - Nostr relay URL (string)
- `CityBlockData` - City Protocol block event content
- `CityBlockReference` - Reference fields for City block events

## Usage

```typescript
import { ATTN_EVENT_KINDS, CITY_PROTOCOL_KINDS, BlockHeight, Pubkey } from '@attn-protocol/core';

// ATTN Protocol event kinds (38188-38988)
const marketplace_kind = ATTN_EVENT_KINDS.MARKETPLACE; // 38188
const promotion_kind = ATTN_EVENT_KINDS.PROMOTION; // 38388

// City Protocol block kind (38808) - block events are published by City Protocol
const block_kind = CITY_PROTOCOL_KINDS.BLOCK; // 38808

const height: BlockHeight = 870000;
const pubkey: Pubkey = 'abc123...';
```

## Purpose

This package serves as the foundation for all ATTN Protocol packages, ensuring consistency in constants and types across the ecosystem.

**Note:** Block events (kind 38808) are now published by City Protocol. ATTN Protocol events reference City Protocol block events for timing synchronization.

