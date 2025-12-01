# @attn-protocol/core

Core constants and types for ATTN Protocol.

This package provides shared constants and type definitions used across all ATTN Protocol packages.

## Exports

### Constants

- `ATTN_EVENT_KINDS` - Event kind numbers (38088-38988)
- `NIP51_LIST_TYPES` - NIP-51 list type identifiers

### Types

- `BlockHeight` - Bitcoin block height (number)
- `Pubkey` - Nostr public key (string)
- `EventId` - Nostr event ID (string)
- `RelayUrl` - Nostr relay URL (string)

## Usage

```typescript
import { ATTN_EVENT_KINDS, BlockHeight, Pubkey } from '@attn-protocol/core';

const block_kind = ATTN_EVENT_KINDS.BLOCK; // 38088
const height: BlockHeight = 870000;
const pubkey: Pubkey = 'abc123...';
```

## Purpose

This package serves as the foundation for all ATTN Protocol packages, ensuring consistency in constants and types across the ecosystem.

