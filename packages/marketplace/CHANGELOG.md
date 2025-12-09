# @attn-protocol/marketplace

## 0.3.0

### Minor Changes

- a94fa53: feat(marketplace): Add named hook methods and flatten config

  **Breaking Changes (0.x.x):**
  - Changed from string-based hooks (`marketplace.on('hook_name', ...)`) to named methods (`marketplace.on_hook_name(...)`)
  - Flattened `marketplace_params` into root config (e.g., `name`, `description`, `min_duration` are now top-level)

  **New Features:**
  - Added 26 named hook methods with full TypeScript types
  - Added `HookHandle` interface with `unregister()` for removing handlers
  - Added profile publishing support (`profile`, `follows`, `publish_profile_on_connect` config options)
  - Access framework hooks via `marketplace.attn.on_profile_published()`, etc.

  **Config Changes:**
  - `relay_config` now has 4 arrays: `read_auth`, `read_noauth`, `write_auth`, `write_noauth`
  - Marketplace params (`name`, `description`, `min_duration`, `max_duration`, etc.) moved to root config

## 0.2.3

### Patch Changes

- Enhance JSDoc documentation for improved JSR score and developer experience

## 0.2.2

### Patch Changes

- Fix module documentation examples to match actual API using .on() method

## 0.2.1

### Patch Changes

- dba759b: Add descriptions to jsr.json files for improved JSR registry discoverability and score

## 0.2.0

### Minor Changes

- 62b90c7: Add marketplace package with storage abstraction, enhance core types, and improve testing infrastructure

## 0.1.0

### Minor Changes

- 3d31151: Add marketplace package with storage abstraction, enhance core types, and improve testing infrastructure

## 0.0.1

### Patch Changes

- Initial release of the marketplace package. Provides a lifecycle layer on top of @attn-protocol/framework with bring-your-own storage architecture.
  - Marketplace class for managing marketplace lifecycle
  - HookEmitter for event-driven hook system
  - Required hooks: store_billboard, store_promotion, store_attention, store_match, query_promotions, find_matches, exists, get_aggregates
  - Optional hooks for confirmations, validation, and matching lifecycle
  - Automatic matching when attention events arrive
  - Auto-publish marketplace events on new blocks
