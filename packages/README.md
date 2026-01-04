# Packages

## TypeScript Packages

| Package | Purpose | Notes |
| --- | --- | --- |
| [`packages/protocol`](./protocol) | Canonical ATTN Protocol reference (specs, docs, assets). | Source of block-synced rules for Billboard operators. |
| [`packages/core`](./core) | Core constants and types shared across all packages. | Provides `ATTN_EVENT_KINDS`, `CITY_PROTOCOL_KINDS`, `NIP51_LIST_TYPES`, and core type definitions. Published as `@attn/ts-core`. |
| [`packages/framework`](./framework) | Runtime primitives for building block-aligned services on ATTN Protocol. | Exposes hooks + relay wiring to keep block synchronization cadence. Published as `@attn/ts-framework`. |
| [`packages/sdk`](./sdk) | Client utilities for emitting and validating ATTN Protocol events. | Helps marketplaces and billboards stay snapshot-safe. Published as `@attn/ts-sdk`. |
| [`packages/marketplace`](./marketplace) | Marketplace lifecycle layer with bring-your-own storage. | Wraps framework with marketplace hooks for matching, confirmations, and publishing. Published as `@attn/ts-marketplace`. |
| [`packages/relay`](./relay) | Open-source Nostr relay with ATTN Protocol plugin system. | Validates and stores ATTN events with rate limiting and auth. |

## Go Packages

| Package | Purpose | Notes |
| --- | --- | --- |
| [`packages/go-core`](./go-core) | Core constants and types for Go applications. | Mirrors `@attn/ts-core` with `core.KindPromotion`, `core.PromotionData`, etc. |
| [`packages/go-framework`](./go-framework) | Hook-based framework for building ATTN Protocol applications. | Mirrors `@attn/ts-framework` with relay connections and event lifecycle management. |
| [`packages/go-sdk`](./go-sdk) | Event builders for creating and publishing ATTN Protocol events. | Mirrors `@attn/ts-sdk` with `events.CreatePromotion()`, etc. |
| [`packages/go-marketplace`](./go-marketplace) | Marketplace lifecycle layer with bring-your-own storage. | Mirrors `@attn/ts-marketplace` with storage interface for custom backends. |

**Note:** Block events (kind 38808) are now published by City Protocol's `@city/clock` service. The `packages/node` package has been moved to City Protocol.

Each package follows snake_case conventions, pins its own toolchain (via `package.json`, `bun.lock`, or `go.mod`), and must subscribe to City Protocol block events (kind 38808) before emitting state. When adding a new package, document it here so operations stay traceable per block.
