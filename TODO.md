# ATTN Protocol Monorepo TODO

Tasks and improvements for the ATTN Protocol monorepo, organized by priority.

## Milestone Reference

- **M1-M3**: Foundation (Complete)
- **M4-M7**: Economy (In Progress)
- **M8-M10**: City Life (Planned)

All tasks must include a milestone tag: `[M#]`

## 🔴 Critical (Address Immediately)

_No critical issues at this time._

## ⚠️ High Priority (Address Soon)

- [ ] [M4] Fix framework test import initialization issues
  - File: `packages/framework/src/attn.test.ts`, `packages/framework/src/relay/connection.test.ts`
  - Issue: `ReferenceError: Cannot access '__vi_import_2__' before initialization` - circular import or hoisting issue with vi.mock
  - Impact: 2 of 3 framework test suites fail, ~60 tests not running
  - Recommendation: Review mock setup order; ensure mocked modules are hoisted before imports that use them

- [ ] [M4] Fix node package test mocking issues
  - File: `packages/node/src/lib/services/nostr.service.test.js`, `packages/node/src/lib/bridge.test.js`
  - Issue: 8 NostrService tests fail with "No relay URLs provided", 2 Bridge tests fail with "get_connected_count is not a function"
  - Impact: 10 of 43 node tests failing
  - Recommendation: Fix mock setup to properly inject relay URLs and mock all required methods

- [ ] [M4] Run go mod tidy for go-sdk and go-marketplace
  - File: `packages/go-sdk/go.mod`, `packages/go-marketplace/go.mod`
  - Issue: Both packages require `go mod tidy` before tests can run
  - Impact: Cannot verify test coverage for these packages
  - Recommendation: Run `go mod tidy` in both directories and commit updated go.sum files

- [ ] [M4] Replace console.log with structured logging in server.ts
  - File: `packages/marketplace/src/server.ts`
  - Issue: 35 console.log/error/warn statements in production server code
  - Impact: Inconsistent with structured logging used elsewhere in the codebase
  - Recommendation: Replace with Pino logger (already used in framework package)

## 📝 Medium Priority (Address When Possible)

- [ ] [M4] Fix go-sdk formatInt64 implementation bug
  - File: `packages/go-sdk/sdk.go:110-112`
  - Issue: `formatInt64` function uses timestamp formatting which doesn't produce correct block height strings
  - Code: `return nostr.Timestamp(n).Time().Format("20060102150405")[:14]`
  - Impact: Block height tags may be incorrectly formatted
  - Recommendation: Use `strconv.FormatInt(n, 10)` instead

- [ ] [M4] Fix go-sdk README accuracy
  - File: `packages/go-sdk/README.md:1`
  - Issue: README says "TypeScript SDK" but this is the Go SDK
  - Impact: Confusing for developers
  - Recommendation: Update first line from "TypeScript SDK" to "Go SDK"

- [ ] [M4] Implement or remove go-framework/relay empty directory
  - File: `packages/go-framework/relay/`
  - Issue: Empty directory - no relay connection implementation
  - Impact: Go framework incomplete compared to TypeScript framework; README documents non-existent features
  - Recommendation: Implement relay module or remove empty directory and update README

- [ ] [M4] Create root-level examples directory
  - File: Create `examples/` directory at monorepo root
  - Issue: No example code showing full framework usage across packages
  - Impact: Slower onboarding for new developers
  - Recommendation: Add examples directory with sample marketplace implementations using framework + SDK + marketplace

- [ ] [M4] Use Node.js v20 LTS for CI/CD to avoid tinypool crash
  - File: CI/CD configuration (GitHub Actions, etc.)
  - Issue: Vitest/tinypool crashes with `RangeError: Maximum call stack size exceeded` after tests complete on Node.js v22
  - Workaround: Use Node.js v20 LTS for CI/CD until tinypool fixes Node.js v22 compatibility
  - Note: **Tests pass successfully** - this is a cleanup issue, not a test failure

## 💡 Low Priority (Nice to Have)

- [ ] [M4] Add tests for go-sdk package
  - File: `packages/go-sdk/`
  - Issue: No test files exist in this package
  - Impact: Event builders untested
  - Recommendation: Add unit tests for event creation functions

- [ ] [M4] Add tests for go-marketplace package
  - File: `packages/go-marketplace/`
  - Issue: No test files exist in this package
  - Impact: Marketplace logic untested
  - Recommendation: Add unit tests for marketplace operations

- [ ] [M4] Refactor: Consider splitting Marketplace class
  - File: `packages/marketplace/src/marketplace.ts` (1118 lines)
  - Current: Large class with many responsibilities (hook registration, event handling, storage operations)
  - Proposed: Split into smaller classes: `MarketplaceCore`, `MarketplaceEventHandlers`, `MarketplaceHooks`
  - Benefit: Improved maintainability, easier to test individual components, clearer separation of concerns
  - Effort: High (4+ hours)
  - Risk: High (architectural change, touches many files)

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
  - File: All package.json and go.mod files
  - Issue: No regular dependency audit process documented
  - Impact: Potential security vulnerabilities in dependencies
  - Recommendation: Set up automated dependency audits (npm audit, govulncheck, Dependabot)

## ✅ Recently Completed

- ✅ [M4] Validation logic extraction to go-core (2026-01-04)
  - File: `packages/go-core/validation/`
  - Moved validation from relay/pkg/validation to go-core/validation
  - Now shared across relay implementations
  - All 33 validation tests passing

- ✅ [M4] Fix SDK README package name inconsistency (2025-12-15)
  - File: `packages/sdk/README.md`
  - Updated all references from `@attn-protocol/core` to `@attn/ts-core` to match actual package.json
  - Fixed lines 9, 21, 77, 80, 805 in SDK README

- ✅ [M4] Extract shared WebSocket mock to core package (2025-01-28)
  - File: `packages/core/src/test/mocks/websocket.mock.ts`
  - Created shared MockWebSocket factory function in core package
  - Updated framework and SDK test files to import from core
  - Deleted duplicate mock files from framework and SDK packages
  - All tests now use shared mock via `vi.hoisted()` pattern

- ✅ [M4] Extract private key decoding to core package (2025-01-28)
  - File: `packages/core/src/utils/private-key.ts`
  - Created `decode_private_key` utility with full validation
  - Updated marketplace and SDK to use shared utility
  - Added `nostr-tools` dependency to core package
  - Exported from core package index

## ✅ Previously Completed

- ✅ [M4] JSR publishing configuration complete (2025-12-08)
- ✅ [M4] Import extensions updated for JSR (.js → .ts) (2025-12-08)
- ✅ [M4] SDK WebSocket cross-platform support (2025-12-08)
- ✅ [M4] Comprehensive JSDoc documentation (2025-12-08)
- ✅ [M4] All TypeScript tests passing (2025-12-08)
- ✅ [M4] Added comprehensive test coverage for marketplace package (67 tests)
- ✅ [M4] Updated vitest configs with pool: 'forks' and singleFork: true
- ✅ [M4] Added marketplace package to monorepo README documentation
- ✅ [M4] Replace console logging with structured logging (framework package)
- ✅ [M4] Add structured logging infrastructure
- ✅ [M4] Add comprehensive test coverage for all TypeScript packages
- ✅ [M4] Resolved `any` types in TypeScript codebase
- ✅ [M4] Updated protocol README with correct hook naming
- ✅ [M4] Event handler factory pattern implemented
- ✅ [M4] Protocol consistency verified - 0 issues found

---

**Last Updated:** 2026-01-04 (Full Code Review Complete)
**Last Verified:** 2026-01-04 - Full review completed. Test infrastructure issues identified and documented.

**Project Description:** ATTN Protocol monorepo - Protocol specification, framework, SDK, marketplace, node service, and relay for Bitcoin-native attention marketplace

**Key Features:** Protocol specification (ATTN-01), hook-based framework, event builders, validation utilities, marketplace lifecycle layer, Bitcoin ZMQ bridge, Go-based relay

**Test Status:**
- go-core: ✅ 39 tests pass
- go-core/validation: ✅ 33 tests pass
- go-framework/hooks: ✅ 11 tests pass
- relay/ratelimit: ✅ 8 tests pass
- ts-core: ✅ 47 tests pass
- ts-marketplace: ✅ 70 tests pass
- ts-framework: ❌ 2 suites fail (import init issues)
- node: ❌ 10 of 43 tests fail (mocking issues)

**Production Status:** Production Ready with Caveats - Core packages are production-ready. Framework and node packages have test issues that need resolution before full production deployment.
