# @attn-protocol/protocol

## 0.6.0

### Minor Changes

- 4aa8de7: Add required count metrics fields to MARKETPLACE event content schema (billboard_count, promotion_count, attention_count, match_count)

## 0.5.1

### Patch Changes

- b93fec7: Fix broken links in README files: correct relay package path, remove broken banner image reference, and fix ATTN-01 documentation links.

## 0.5.0

### Minor Changes

- ebd67d2: Add ATTENTION_PAYMENT_CONFIRMATION event (kind 38988)

  Adds a new event that allows attention owners to independently attest they received payment after the marketplace publishes MARKETPLACE_CONFIRMATION. This completes the payment audit trail by providing cryptographic proof that payment was actually delivered.
  - Added event kind 38988 constant to core
  - Added ATTENTION_PAYMENT_CONFIRMATION event specification to ATTN-01
  - Added event builder and types to SDK
  - Added hook handler and registration to framework
  - Updated all documentation to include new event

## 0.4.2

### Patch Changes

- Refactor README information hierarchy: simplify root README, enhance protocol README with detailed content (event kinds, why it exists, key capabilities), and update cross-references in user guide.

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

## 0.2.3

### Patch Changes

- bbb5750: Update event kind descriptions in main README to align with ATTN-01 specification. Added "Published By" column to event kinds table and updated all descriptions with accurate details from the canonical spec.

## 0.2.2

### Patch Changes

- 368290b: Documentation reorganization: simplify root README and move detailed content to package-specific docs

## 0.2.1

### Patch Changes

- 334366d: Update documentation, protocol specification (ATTN-01), and framework connection improvements

## 0.2.0

### Minor Changes

- 517f6c9: Enhanced framework with improved relay connection handling, updated protocol documentation, and expanded SDK event types including new block event support. Added constants module and improved type definitions across all packages.
