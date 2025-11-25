# ATTN Protocol

![The ATTN Protocol](./packages/protocol/assets/banner.png)

ATTN Protocol is a decentralized framework enabling paid content promotion within the Nostr ecosystem. Standardized communication methods unlock new economic opportunities while preserving privacy, permissionless access, and user sovereignty.

It also functions as the Bitcoin-native attention interchange for block-synced marketplaces. Bridge broadcasts each new block height (kind 30078), services react in lockstep, and marketplace state freezes so every snapshot stays truthful. Promotions, matches, confirmations, and payouts all ride Nostr events, which keeps independent services synchronized without trusting a central coordinator.

## Why it exists

- **Block-synchronized marketplaces**: Replace timestamp-based ad tech with deterministic block heights so Bridge, Billboard, and Brokerage never drift.
- **Sovereign payments**: All value settles over Bitcoin/Lightning—no subscriptions, no rent extraction, instant exit between blocks.
- **Composable services**: Because events are just Nostr kinds (38088–38888), anyone can build clients, billboards, or analytics without permission while still mapping to Reservoir/Aqueduct/Canal/Harbor flows.

## Key features

- Pay-per-view content promotion
- Satoshi-based payment infrastructure
- Market-driven pricing and bid/ask matching
- Bitcoin block height (`t` tag) baked into every event for deterministic timing
- User-controlled content filtering, block lists, and preferences

## Documentation

- [ATTN Protocol Specification](./packages/protocol/docs/)

## Packages

- **[@attn-protocol/protocol](./packages/protocol/)** – Formal spec (ATTN-01+), docs, and assets that define each event type and city metric.
- **[@attn-protocol/framework](./packages/framework/)** – Hook-based runtime to build block-aware services (Bridge subscribers, relay emitters, tidal math).
- **[@attn-protocol/sdk](./packages/sdk/)** – TypeScript toolkit for crafting, validating, and publishing ATTN events (billboard, marketplace, viewer confirmations, etc.).

## Quick Start

```bash
# Install all dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test

# Format code
npm run format
```

## Development

Each package functions as a city district:

- **Protocol** → sets Lighthouse/Gallery metrics, defines how Reservoir resets each block.
- **Framework** → wires Bridge events into service hooks so snapshots never drift.
- **SDK** → gives clients snake_case builders and validation helpers for every event schema.

These districts share tooling through the root workspace and can be developed independently; workspace dependencies stay linked via npm.

## Contributing

Contributions are welcome! Please see individual package READMEs for specific contribution guidelines.

## License

MIT License

## Related Projects

- [Nostr Protocol](https://github.com/nostr-protocol/nips)
