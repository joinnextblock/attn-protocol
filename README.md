# The ATTN Protocol

A decentralized framework enabling paid content promotion within the Nostr ecosystem. Standardized communication methods unlock new economic opportunities while preserving privacy, permissionless access, and user sovereignty.

## Block Synchronization

ATTN Protocol uses **City Protocol** for block synchronization. City Protocol's clock service broadcasts each new block height (kind 38808), services react in lockstep, and marketplace state freezes so every snapshot stays truthful.

Block events are published by City Protocol, not ATTN Protocol. This allows the attention marketplace to operate on Bitcoin time without needing its own block event infrastructure.

```
Block Event Coordinate: 38808:<clock_pubkey>:org.cityprotocol:block:<height>:<hash>
```

## Quick Links

- **[Protocol Documentation](./packages/protocol/README.md)**: Overview, event kinds, and protocol details
- **[Protocol Specification](./packages/protocol/docs/ATTN-01.md)**: Complete event definitions with standardized schema format
- **[User Guide](./packages/protocol/docs/README.md)**: User-facing documentation, glossary, and quick reference
- **[Framework Documentation](./packages/framework/README.md)**: Hook system and event processing
- **[SDK Documentation](./packages/sdk/README.md)**: Event builders, type reference, and examples
- **[Marketplace Documentation](./packages/marketplace/README.md)**: Marketplace lifecycle layer with bring-your-own storage

## Event Kinds

### City Protocol (Block Events)
| Kind | Name | Description |
|------|------|-------------|
| 38808 | BLOCK | Bitcoin block arrival (published by City Protocol clock) |

### ATTN Protocol
| Kind | Name | Description |
|------|------|-------------|
| 38188 | MARKETPLACE | Marketplace registration/update |
| 38288 | BILLBOARD | Billboard (ad slot) registration |
| 38388 | PROMOTION | Promotion (ad) submission |
| 38488 | ATTENTION | Attention offer from users |
| 38588 | BILLBOARD_CONFIRMATION | Billboard confirms a match |
| 38688 | ATTENTION_CONFIRMATION | Attention provider confirms a match |
| 38788 | MARKETPLACE_CONFIRMATION | Marketplace confirms both parties agreed |
| 38888 | MATCH | Match pairing promotion with attention |
| 38988 | ATTENTION_PAYMENT_CONFIRMATION | Payment confirmation from attention provider |

## Packages

| Package | Purpose |
| --- | --- |
| [`packages/protocol`](./packages/protocol/) | ATTN-01 spec, diagrams, and documentation |
| [`packages/core`](./packages/core/) | Core constants and type definitions |
| [`packages/framework`](./packages/framework/) | Hook runtime and relay adapters |
| [`packages/sdk`](./packages/sdk/) | Event builders and validators |
| [`packages/marketplace`](./packages/marketplace/) | Marketplace lifecycle layer (bring your own storage) |
| [`packages/relay`](./packages/relay/) | Open-source Nostr relay with plugin system |

**Note:** The `packages/node` package (Bitcoin ZMQ to Nostr bridge) has been moved to City Protocol as `@city/clock`. Block events are now published by City Protocol.

## License

MIT License

## Related Projects

- [City Protocol](https://github.com/joinnextblock/city-protocol) - Block-aware domains with clock service
- [Nostr Protocol](https://github.com/nostr-protocol/nips)
