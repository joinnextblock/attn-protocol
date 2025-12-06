# Changelog

## 0.5.3

### Patch Changes

- 35f9803: Review and improve test quality: remove non-functional type tests, enhance SDK tests with actual behavior verification, and ensure all tests verify real functionality rather than shallow mock checks.

  Add package.json to relay package to enable changeset versioning.

## 0.5.2

### Patch Changes

- 8fa547c: Review and improve test quality: remove non-functional type tests, enhance SDK tests with actual behavior verification, and ensure all tests verify real functionality rather than shallow mock checks.

## 0.5.1

### Patch Changes

- Update build configuration: switch core package to use dist output, update dependency references to use file paths for local development

## 0.5.0

### Minor Changes

- ebd67d2: Add ATTENTION_PAYMENT_CONFIRMATION event (kind 38988)

  Adds a new event that allows attention owners to independently attest they received payment after the marketplace publishes MARKETPLACE_CONFIRMATION. This completes the payment audit trail by providing cryptographic proof that payment was actually delivered.
  - Added event kind 38988 constant to core
  - Added ATTENTION_PAYMENT_CONFIRMATION event specification to ATTN-01
  - Added event builder and types to SDK
  - Added hook handler and registration to framework
  - Updated all documentation to include new event

## 0.4.0

### Minor Changes

- Rename VIEWER_CONFIRMATION to ATTENTION_CONFIRMATION
  - Renamed event kind constant from VIEWER_CONFIRMATION to ATTENTION_CONFIRMATION (kind 38688 remains unchanged)
  - Updated SDK: removed `create_viewer_confirmation_event`, added `create_attention_confirmation_event`
  - Updated framework: renamed `on_viewer_confirm` hook to `on_attention_confirm`, updated `ViewerConfirmContext` to `AttentionConfirmContext`
  - Updated protocol documentation (ATTN-01.md) with schema design principles and clarifications
  - Updated all type definitions and references across packages

## 0.3.0

### Minor Changes

- Refactor existing packages into new `@attn-protocol/core` package. Extracted shared constants (`ATTN_EVENT_KINDS`, `NIP51_LIST_TYPES`) and core types (`BlockHeight`, `Pubkey`, `EventId`, `RelayUrl`) from framework into core package. Updated SDK to use constants from core instead of hardcoded event kind numbers. Framework and SDK now depend on core package for shared constants and types.

## 0.2.2

### Added

- Initial release of `@attn-protocol/core` package
- Extracted `ATTN_EVENT_KINDS` and `NIP51_LIST_TYPES` constants from framework
- Extracted core types (`BlockHeight`, `Pubkey`, `EventId`, `RelayUrl`) from framework
