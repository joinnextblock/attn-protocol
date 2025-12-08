# @attn-protocol/marketplace

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
