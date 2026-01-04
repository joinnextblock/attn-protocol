# @attn/relay

## 0.4.1

### Patch Changes

- 4a1739f: chore: Standardize all package names to use @attn/ prefix

  Renamed packages for consistency:
  - `@attn-protocol/node` → `@attn/node`
  - `@attn-protocol/protocol` → `@attn/protocol`
  - `@attn-protocol/relay` → `@attn/relay`
  - `@attn-protocol/sdk` → `@attn/sdk`

  Updated all imports and dependencies across the monorepo to use the new `@attn/` namespace.

## 0.4.0

### Minor Changes

- 7ec1f7c: Refactor relay package to export shared components (logger, ratelimit, validation) from pkg/ directory, enabling other projects to import and use these components as a library.

## 0.3.0

### Minor Changes

- b93fec7: Review and improve test quality: remove non-functional type tests, enhance SDK tests with actual behavior verification, and ensure all tests verify real functionality rather than shallow mock checks.

  Add package.json to relay package to enable changeset versioning.

## 0.2.0

### Minor Changes

- 35f9803: Review and improve test quality: remove non-functional type tests, enhance SDK tests with actual behavior verification, and ensure all tests verify real functionality rather than shallow mock checks.

  Add package.json to relay package to enable changeset versioning.
