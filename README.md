# The ATTN Protocol

A decentralized framework enabling paid content promotion within the Nostr ecosystem. Standardized communication methods unlock new economic opportunities while preserving privacy, permissionless access, and user sovereignty.

It also functions as the Bitcoin-native attention interchange for block-synced marketplaces. Bitcoin node services broadcast each new block height (kind 38088), services react in lockstep, and marketplace state freezes so every snapshot stays truthful.

## Quick Links

- **[Protocol Documentation](./packages/protocol/README.md)**: Overview, event kinds, and protocol details
- **[Protocol Specification](./packages/protocol/docs/ATTN-01.md)**: Complete event definitions with standardized schema format
- **[User Guide](./packages/protocol/docs/README.md)**: User-facing documentation, glossary, and quick reference
- **[Framework Documentation](./packages/framework/README.md)**: Hook system and event processing
- **[SDK Documentation](./packages/sdk/README.md)**: Event builders, type reference, and examples

## Packages

| Package | Purpose |
| --- | --- |
| [`packages/protocol`](./packages/protocol/) | ATTN-01 spec, diagrams, and documentation |
| [`packages/core`](./packages/core/) | Core constants and type definitions |
| [`packages/framework`](./packages/framework/) | Hook runtime and relay adapters |
| [`packages/sdk`](./packages/sdk/) | Event builders and validators |
| [`packages/relay`](./packages/relay/) | Open-source Nostr relay with plugin system |

## License

MIT License

## Related Projects

- [Nostr Protocol](https://github.com/nostr-protocol/nips)
