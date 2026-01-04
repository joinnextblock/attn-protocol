# ATTN Protocol

A decentralized framework enabling paid content promotion within the Nostr ecosystem. By establishing standardized communication methods for promotional content, the protocol creates new economic opportunities while preserving Nostr's core principles of decentralization and privacy.

It also functions as the Bitcoin-native attention interchange for block-synced marketplaces. City Protocol's clock services broadcast each new block height (kind 38808), ATTN Protocol services react in lockstep, and marketplace state freezes so every snapshot stays truthful. Promotions, matches, confirmations, and payouts all ride Nostr events, which keeps independent services synchronized without trusting a central coordinator.

## Why it exists

- **Block-synchronized marketplaces**: Replace timestamp-based ad tech with deterministic block heights so City Protocol clocks, billboards, and marketplaces never drift.
- **Sovereign payments**: All value settles over Bitcoin/Lightning—no subscriptions, no rent extraction, instant exit between blocks.
- **Composable services**: Because events are just Nostr kinds (38188–38988 for ATTN, 38808 for City Protocol blocks), anyone can build clients, billboards, or analytics without permission while still mapping to marketplace inventory, user earnings, transfers, and settlement flows.

## Key capabilities

- **ATTN-01 spec**: [`docs/ATTN-01.md`](./docs/ATTN-01.md) is the canonical definition of kinds 38188–38988, the event mapping, and all required tags. Block events (kind 38808) are published by City Protocol.
- **Runtime framework**: `@attn-protocol/framework` exposes the `Attn` hook system that wires relays, handles NIP-42 auth, deduplicates events, and sequences `before_block_event → on_block_event → after_block_event`.
- **Typed SDK**: `@attn-protocol/sdk` ships builders plus validators such as `create_promotion_event`, `create_marketplace_event`, and relay publishers so services can emit fully-signed events with the correct `["t","<block_height>"]` tags.
- **Snapshot discipline**: Every helper enforces block height tagging and deterministic IDs so downstream marketplace inventory, user earnings, transfers, and settlement calculations never accumulate across blocks.

## Event kinds

| Kind | Name | Description | Published By |
| --- | --- | --- | --- |
| 38808 | BLOCK | Bitcoin block arrival event. Timing primitive for the entire protocol. | City Protocol clock ([@city/clock](https://github.com/joinnextblock/city-protocol)) |
| 38188 | MARKETPLACE | Marketplace definition with parameters (min/max duration, supported event kinds, relay lists). References the City Protocol clock pubkey for timing. | Marketplace operators |
| 38288 | BILLBOARD | Billboard definition within a marketplace. Billboards are where promotions are watched and verified. | Billboard operators |
| 38388 | PROMOTION | Promotion request with bid (total satoshis for duration), duration (milliseconds), and content reference. | Promotion creators |
| 38488 | ATTENTION | Viewer availability signal with ask (total satoshis for duration), duration range (min/max milliseconds), and content preferences. | Attention owners |
| 38588 | BILLBOARD_CONFIRMATION | Billboard attestation of successful view. | Billboard operators |
| 38688 | ATTENTION_CONFIRMATION | Attention owner attestation of viewing. | Attention owners |
| 38788 | MARKETPLACE_CONFIRMATION | Final settlement event published after both BILLBOARD_CONFIRMATION and ATTENTION_CONFIRMATION are received. | Marketplace operators |
| 38888 | MATCH | Match between promotion and attention. Created when bid ≥ ask and duration is compatible. | Marketplace operators |
| 38988 | ATTENTION_PAYMENT_CONFIRMATION | Attention owner attestation of payment receipt. Published after receiving payment following MARKETPLACE_CONFIRMATION. | Attention owners |

All builders stamp the canonical coordinate/tag layout (`["d", "<identifier>"]`, `["t", "<block_height>"]`) so relays and analytics can filter by block height only.

## Documentation

### Protocol Specification

- **[ATTN-01](./docs/ATTN-01.md)**: Complete event definitions with standardized schema format
- **[Event Flow](./docs/EVENT_FLOW.md)**: Visual diagrams of protocol workflows

### User Documentation

- **[User Guide](./docs/README.md)**: User-facing documentation, glossary, quick reference, and AI assistant guide

### Developer Documentation

- **[Framework Documentation](../framework/README.md)**: Hook system and event processing
- **[SDK Documentation](../sdk/README.md)**: Event builders, type reference, and examples
- **[Framework Hooks](../framework/docs/HOOKS.md)**: Hook execution order and lifecycle stages

## Contributing

Contributions are welcome! Please read each package README for build/test instructions and use Changesets for any version bumps.

## License

MIT License

## Related Projects

- [Nostr Protocol](https://github.com/nostr-protocol/nips)
