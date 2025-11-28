# Packages

| Package | Purpose | Notes |
| --- | --- | --- |
| [`packages/protocol`](./protocol) | Canonical ATTN Protocol reference (specs, docs, assets). | Source of block-synced rules for Billboard operators. |
| [`packages/framework`](./framework) | Runtime primitives for building block-aligned services on ATTN Protocol. | Exposes hooks + relay wiring to keep block synchronization cadence. |
| [`packages/sdk`](./sdk) | Client utilities for emitting and validating ATTN Protocol events. | Helps marketplaces and billboards stay snapshot-safe. |

Each package follows snake_case conventions, pins its own toolchain (via `package.json` or `bun.lock`), and must subscribe to Bitcoin block events (kind 30078) before emitting state. When adding a new package, document it here so operations stay traceable per block.
