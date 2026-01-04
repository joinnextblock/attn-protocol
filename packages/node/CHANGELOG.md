# @attn/node

## 0.1.1

### Patch Changes

- 4a1739f: chore: Standardize all package names to use @attn/ prefix

  Renamed packages for consistency:
  - `@attn-protocol/node` → `@attn/node`
  - `@attn-protocol/protocol` → `@attn/protocol`
  - `@attn-protocol/relay` → `@attn/relay`
  - `@attn-protocol/sdk` → `@attn/sdk`

  Updated all imports and dependencies across the monorepo to use the new `@attn/` namespace.

## 0.1.0

### Minor Changes

- Initial release of the node package. Bitcoin ZeroMQ to Nostr bridge that streams Bitcoin blocks as ATTN-01 events.
  - ZeroMQToNostrBridge class for bridging Bitcoin blocks to Nostr
  - BitcoinService for ZeroMQ and RPC communication
  - NostrService for relay connection and event publishing
  - Support for authenticated (NIP-42) and non-authenticated relays
  - Automatic reconnection with exponential backoff
  - Health statistics and relay classification
  - Structured logging with Pino
