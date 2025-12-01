# @attn-protocol/sdk

## 0.6.0

### Minor Changes

- ebd67d2: Add ATTENTION_PAYMENT_CONFIRMATION event (kind 38988)

  Adds a new event that allows attention owners to independently attest they received payment after the marketplace publishes MARKETPLACE_CONFIRMATION. This completes the payment audit trail by providing cryptographic proof that payment was actually delivered.
  - Added event kind 38988 constant to core
  - Added ATTENTION_PAYMENT_CONFIRMATION event specification to ATTN-01
  - Added event builder and types to SDK
  - Added hook handler and registration to framework
  - Updated all documentation to include new event

### Patch Changes

- Updated dependencies [ebd67d2]
  - @attn-protocol/core@0.5.0

## 0.5.1

### Patch Changes

- 57b9424: Refactor: Consistency improvements, documentation updates, and asset reorganization

## 0.5.0

### Minor Changes

- test
- 064006d: - Fix: Ensure `block_height` is always present in event tags
  - Fix: Update validation function to correctly check `t` tag instead of content
  - Fix: Ensure `ref_node_pubkey`, `ref_block_id`, and `block_coordinate` are required in MARKETPLACE event
  - Fix: Ensure `ref_*` fields are required in all confirmation events
  - Fix: Ensure `kind_list` and `relay_list` are excluded from content in MARKETPLACE and ATTENTION events
  - Fix: Ensure `kinds` and `relays` are excluded from content in ATTENTION event
  - Fix: Ensure `bid`, `ask`, and `duration` are not stored in MATCH event

## 0.4.0

### Minor Changes

- 064006d: - Fix: Ensure `block_height` is always present in event tags
  - Fix: Update validation function to correctly check `t` tag instead of content
  - Fix: Ensure `ref_node_pubkey`, `ref_block_id`, and `block_coordinate` are required in MARKETPLACE event
  - Fix: Ensure `ref_*` fields are required in all confirmation events
  - Fix: Ensure `kind_list` and `relay_list` are excluded from content in MARKETPLACE and ATTENTION events
  - Fix: Ensure `kinds` and `relays` are excluded from content in ATTENTION event
  - Fix: Ensure `bid`, `ask`, and `duration` are not stored in MATCH event

## 0.3.0

### Minor Changes

- Rename VIEWER_CONFIRMATION to ATTENTION_CONFIRMATION
  - Renamed event kind constant from VIEWER_CONFIRMATION to ATTENTION_CONFIRMATION (kind 38688 remains unchanged)
  - Updated SDK: removed `create_viewer_confirmation_event`, added `create_attention_confirmation_event`
  - Updated framework: renamed `on_viewer_confirm` hook to `on_attention_confirm`, updated `ViewerConfirmContext` to `AttentionConfirmContext`
  - Updated protocol documentation (ATTN-01.md) with schema design principles and clarifications
  - Updated all type definitions and references across packages

### Patch Changes

- Updated dependencies
  - @attn-protocol/core@0.4.0

## 0.2.5

### Patch Changes

- Update README documentation to reference @attn-protocol/core constants instead of hardcoded event kind numbers. Added examples showing how to import and use ATTN_EVENT_KINDS from core package. Updated Related Projects sections to include core package.

## 0.2.4

### Patch Changes

- Update README documentation to reference @attn-protocol/core constants instead of hardcoded event kind numbers. Added examples showing how to import and use ATTN_EVENT_KINDS from core package. Updated Related Projects sections to include core package.

## 0.2.3

### Patch Changes

- Refactor existing packages into new `@attn-protocol/core` package. Extracted shared constants (`ATTN_EVENT_KINDS`, `NIP51_LIST_TYPES`) and core types (`BlockHeight`, `Pubkey`, `EventId`, `RelayUrl`) from framework into core package. Updated SDK to use constants from core instead of hardcoded event kind numbers. Framework and SDK now depend on core package for shared constants and types.
- Updated dependencies
  - @attn-protocol/core@0.3.0

## 0.2.2

### Patch Changes

- 368290b: Documentation reorganization: simplify root README and move detailed content to package-specific docs

## 0.2.1

### Patch Changes

- 334366d: Update documentation, protocol specification (ATTN-01), and framework connection improvements

## 0.2.0

### Minor Changes

- 517f6c9: Enhanced framework with improved relay connection handling, updated protocol documentation, and expanded SDK event types including new block event support. Added constants module and improved type definitions across all packages.
