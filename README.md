# The ATTN Protocol

The ATTN Protocol is a decentralized framework enabling paid content promotion within the Nostr ecosystem. Standardized communication methods unlock new economic opportunities while preserving privacy, permissionless access, and user sovereignty.

It also functions as the Bitcoin-native attention interchange for block-synced marketplaces. Bitcoin node services broadcast each new block height (kind 30078), services react in lockstep, and marketplace state freezes so every snapshot stays truthful. Promotions, matches, confirmations, and payouts all ride Nostr events, which keeps independent services synchronized without trusting a central coordinator.

## Why it exists

- **Block-synchronized marketplaces**: Replace timestamp-based ad tech with deterministic block heights so block services, billboards, and marketplaces never drift.
- **Sovereign payments**: All value settles over Bitcoin/Lightning—no subscriptions, no rent extraction, instant exit between blocks.
- **Composable services**: Because events are just Nostr kinds (38088–38888), anyone can build clients, billboards, or analytics without permission while still mapping to marketplace inventory, user earnings, transfers, and settlement flows.

## Key capabilities

- **ATTN-01 spec**: `packages/protocol/docs/ATTN-01.md` is the canonical definition of kinds 38088–38888, the event mapping, and all required tags.
- **Runtime framework**: `@attn-protocol/framework` exposes the `Attn` hook system that wires relays, handles NIP-42 auth, deduplicates events, and sequences `before_new_block → on_new_block → after_new_block`.
- **Typed SDK**: `@attn-protocol/sdk` ships builders plus validators such as `create_block_event`, `create_promotion_event`, and relay publishers so services can emit fully-signed events with the correct `["t","<block_height>"]` tags.
- **Snapshot discipline**: Every helper enforces block height tagging and deterministic IDs so downstream marketplace inventory, user earnings, transfers, and settlement calculations never accumulate across blocks.

## Monorepo layout

| Package | Purpose |
| --- | --- |
| [`packages/protocol`](./packages/protocol/) | ATTN-01 spec, diagrams, assets, and changelog. |
| [`packages/framework`](./packages/framework/) | `Attn` hook runtime + relay adapters used by marketplace/billboard services. |
| [`packages/sdk`](./packages/sdk/) | Event builders, validators, relay publishers, and shared type definitions. |

See [`packages/README.md`](./packages/README.md) for a directory-level summary.

## Event kinds

| Kind | Name | Description |
| --- | --- | --- |
| 38088 | BLOCK | Bitcoin block snapshot (timestamp + block data) |
| 38188 | MARKETPLACE | Marketplace / available inventory |
| 38288 | BILLBOARD | Billboards + verification |
| 38388 | PROMOTION | Marketplace bids |
| 38488 | ATTENTION | Viewer asks |
| 38588 | BILLBOARD_CONFIRMATION | Billboard attestations |
| 38688 | VIEWER_CONFIRMATION | Viewer attestations (user earnings) |
| 38788 | MARKETPLACE_CONFIRMATION | Marketplace finalization |
| 38888 | MATCH | Settlement flows to final destination |

All builders stamp the canonical coordinate/tag layout (`["d", "<identifier>"]`, `["t", "<block_height>"]`) so relays and analytics can filter by block height only.

## Development

```bash
npm install
npm run build        # builds all packages
npm run lint         # runs eslint across packages
npm run check        # package-specific checks (tsc, tests, etc.)
```

Each package can also be built in isolation via `npm run build --workspace=@attn-protocol/sdk`, etc. Use `npm run changeset` when preparing a release; the repo already includes the Changesets CLI plus publishing scripts.

## Example usage

```ts
import { create_block_event } from "@attn-protocol/sdk";
import { Attn } from "@attn-protocol/framework";

const event = create_block_event(private_key, {
  height: 880000,
  hash: "0000000...",
  time: 1730000000,
  block_height: 880000,
});

const attn = new Attn({
  relays: ["wss://relay.attnprotocol.org"],
  private_key,
  node_pubkeys: [node_pubkey_hex],
});

await attn.connect();
```

## Documentation

- [ATTN Protocol Specification](./packages/protocol/docs/)
- [Framework hooks](./packages/framework/HOOKS.md)
- [SDK reference](./packages/sdk/README.md)

## Contributing

Contributions are welcome! Please read each package README for build/test instructions and use Changesets for any version bumps.

## License

MIT License

## Related Projects

- [Nostr Protocol](https://github.com/nostr-protocol/nips)
