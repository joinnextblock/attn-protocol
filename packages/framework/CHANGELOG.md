# @attn-protocol/framework

## 0.9.3

### Patch Changes

- Fix README accuracy to match implementation: update package naming to @attn/*, document all AttnConfig options, add on_profile_published hook, add Publisher pattern documentation

## 0.9.2

### Patch Changes

- Enhance JSDoc documentation for improved JSR score and developer experience

## 0.9.1

### Patch Changes

- dba759b: Add descriptions to jsr.json files for improved JSR registry discoverability and score

## 0.9.0

### Minor Changes

- 62b90c7: Add marketplace package with storage abstraction, enhance core types, and improve testing infrastructure

## 0.8.0

### Minor Changes

- 3d31151: Add marketplace package with storage abstraction, enhance core types, and improve testing infrastructure

## 0.7.2

### Patch Changes

- 9df2915: Update code review report and make node_pubkeys optional in framework. Change default requires_auth to false and update default timeouts in SDK publisher.

## 0.7.1

### Patch Changes

- bdeefe4: Update code review report and make node_pubkeys optional in framework. Change default requires_auth to false and update default timeouts in SDK publisher.

## 0.7.0

### Minor Changes

- 7cdf220: add optional subscription_since filter to limit relay event backfill

## 0.6.0

### Minor Changes

- 33bf538: add optional subscription_since filter to limit relay event backfill

## 0.5.6

### Patch Changes

- 4aa8de7: Fix relay connection to handle relays that don't require authentication gracefully

## 0.5.5

### Patch Changes

- b93fec7: Review and improve test quality: remove non-functional type tests, enhance SDK tests with actual behavior verification, and ensure all tests verify real functionality rather than shallow mock checks.

  Add package.json to relay package to enable changeset versioning.

## 0.5.4

### Patch Changes

- 35f9803: Review and improve test quality: remove non-functional type tests, enhance SDK tests with actual behavior verification, and ensure all tests verify real functionality rather than shallow mock checks.

  Add package.json to relay package to enable changeset versioning.

## 0.5.3

### Patch Changes

- 8fa547c: Review and improve test quality: remove non-functional type tests, enhance SDK tests with actual behavior verification, and ensure all tests verify real functionality rather than shallow mock checks.

## 0.5.2

### Patch Changes

- 0e5427f: Improved WebSocket error handling and logging in relay connection. Enhanced error messages with relay URL context and better handling of ErrorEvent objects and other error types.

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

### Patch Changes

- Updated dependencies [ebd67d2]
  - @attn-protocol/core@0.5.0

## 0.4.1

### Patch Changes

- 57b9424: Refactor: Consistency improvements, documentation updates, and asset reorganization

## 0.4.0

### Minor Changes

- test

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

- Update HOOKS.md documentation to accurately reflect current framework implementation. Added missing hooks (on_subscription, on_new_profile, on_new_relay_list, on_new_nip51_list), documented unimplemented hooks with status notes, updated lifecycle diagram, and reorganized sections for clarity.
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
