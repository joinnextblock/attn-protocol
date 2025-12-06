# ATTN Protocol Monorepo TODO

Tasks and improvements for the ATTN Protocol monorepo, organized by priority.

## Milestone Reference

- **M1-M3**: Foundation (Complete)
- **M4-M7**: Economy (In Progress)
- **M8-M10**: City Life (Planned)

All tasks must include a milestone tag: `[M#]`

## 🔴 Critical (Address Immediately)

_No critical issues remaining._

## ⚠️ High Priority (Address Soon)

- [ ] [M4] Replace `any` types with proper type definitions
  - File: `packages/framework/src/relay/connection.ts:20,22`
  - Issue: Uses `(globalThis as any).window?.WebSocket` for browser compatibility
  - Impact: Type safety compromised, potential runtime errors
  - Recommendation: Create proper type definitions for browser WebSocket compatibility

## 📝 Medium Priority (Address When Possible)

- [ ] [M4] Add comprehensive JSDoc comments to all public methods
  - File: `packages/framework/src/hooks/emitter.ts`, `packages/sdk/src/utils/`
  - Issue: Some methods lack JSDoc comments
  - Impact: Reduced developer experience, unclear API usage
  - Recommendation: Add comprehensive JSDoc with parameter descriptions, return types, examples

- [ ] [M4] Improve error handling for edge cases in relay connection
  - File: `packages/framework/src/relay/connection.ts`
  - Issue: Some edge cases may not be fully handled (rapid connect/disconnect, timeout edge cases)
  - Impact: Unexpected behavior during connection failures
  - Recommendation: Review and improve error handling for all connection states

- [ ] [M4] Create root-level examples directory
  - File: Create `examples/` directory at monorepo root
  - Issue: No example code showing full framework usage across packages
  - Impact: Slower onboarding for new developers
  - Recommendation: Add examples directory with sample marketplace implementations using framework + SDK

## 💡 Low Priority (Nice to Have)

- [ ] [M4] Add performance benchmarks for hook system and event builders
  - File: Create `benchmarks/` directory
  - Issue: No performance metrics for hook execution or event creation
  - Impact: Unknown performance characteristics under load
  - Recommendation: Add benchmarks for hook registration/emission and event builder performance

- [ ] [M4] Add integration tests with mock relay
  - File: Create `test/integration/` directory
  - Issue: No integration tests for full framework lifecycle
  - Impact: Difficult to verify end-to-end behavior
  - Recommendation: Add integration tests using mock Nostr relay

- [ ] [M4] Regular dependency audits for security vulnerabilities
  - File: All package.json files
  - Issue: No regular dependency audit process
  - Impact: Potential security vulnerabilities in dependencies
  - Recommendation: Set up automated dependency audits (npm audit, Dependabot, etc.)

## ✅ Recently Completed

- ✅ [M4] Replace console logging with structured logging
  - File: `packages/framework/src/relay/connection.ts`, `packages/framework/src/hooks/emitter.ts`
  - Completion Note: All console.* calls replaced with structured logging using Pino. Added Logger interface and default logger implementation. Logger can be provided via AttnConfig or RelayConnectionConfig. All 41 console calls in connection.ts and 1 in emitter.ts replaced with structured logging. Tests updated and passing.

- ✅ [M4] Add structured logging infrastructure
  - File: `packages/framework/src/logger.ts`, `packages/framework/src/attn.ts`, `packages/framework/src/relay/connection.ts`, `packages/framework/src/hooks/emitter.ts`
  - Completion Note: Added Pino dependency, created Logger interface, default logger implementation, and no-op logger for testing. Logger interface exported from framework package. AttnConfig and RelayConnectionConfig accept optional logger parameter. HookEmitter accepts logger in constructor. All tests passing.

- ✅ [M4] Add comprehensive test coverage for all TypeScript packages
  - File: `packages/framework`, `packages/sdk`, `packages/core`
  - Completion Note: Test infrastructure and coverage added across framework, SDK, and core packages using Vitest. Framework has tests for hook emitter, relay connection, and event handling. SDK has tests for event builders, validation, and publishing. Core has tests for constants and types.

- ✅ [M4] Add test infrastructure to all TypeScript packages
  - File: All TypeScript packages
  - Completion Note: Vitest configured in all packages with test scripts in package.json. Test files exist: `connection.test.ts`, `attn.test.ts`, `emitter.test.ts` (framework), event builder tests (SDK), `constants.test.ts`, `types.test.ts` (core).

---

**Last Updated:** 2025-01-28

**Project Description:** ATTN Protocol monorepo - Protocol specification, framework, SDK, and relay for Bitcoin-native attention marketplace

**Key Features:** Protocol specification (ATTN-01), hook-based framework, event builders, validation utilities, Go-based relay

