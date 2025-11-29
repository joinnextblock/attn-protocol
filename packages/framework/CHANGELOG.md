# @attn-protocol/framework

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
