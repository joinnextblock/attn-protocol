# ATTN Framework TODO

Tasks and improvements for the ATTN Framework, organized by priority.

## Milestone Reference

- **M1-M3**: Foundation (Complete)
- **M4-M7**: Economy (In Progress)
- **M8-M10**: City Life (Planned)

All tasks must include a milestone tag: `[M#]`

## 🔴 Critical (Address Immediately)

_No critical issues at this time. Add items as they are identified._

**Format:** `- [ ] [M#] Task description`
  - File: Path to file(s) affected
  - Issue: Description of the problem
  - Impact: What happens if this isn't addressed
  - Recommendation: Suggested approach or solution

## ⚠️ High Priority (Address Soon)

- [ ] [M4] Add comprehensive test coverage for hook system, relay connection, and event handling
  - File: Missing test files throughout codebase (no test infrastructure exists)
  - Issue: No test coverage for critical framework functionality including hook system, relay connection lifecycle, event handling, block processing, and error handling
  - Impact: High regression risk, difficult to verify fixes, no confidence in refactoring, potential production bugs
  - Recommendation: Add comprehensive test suite using Jest or Vitest with unit tests for hook emitter, connection manager, event handlers; integration tests with mock Nostr relay; end-to-end tests for full framework lifecycle
  - Priority: **HIGH** - Framework is core infrastructure for attention marketplace

- [ ] [M4] Implement block gap detection logic
  - File: `src/relay/connection.ts` - `RelayConnection` class, `handle_block_event()` method
  - Issue: Hook `on_block_gap_detected` exists in types (`BlockGapDetectedContext`) and can be registered via `attn.on_block_gap_detected()`, but detection logic is not implemented. The `RelayConnection` class receives block events but does not track the last block height or compare expected vs actual block heights to detect gaps.
  - Impact: Block synchronization issues may go undetected, services may miss blocks without knowing, breaking the block-synchronized marketplace architecture. Critical for Bitcoin-native timing.
  - Recommendation:
    - Add `private last_block_height: number | null = null;` property to `RelayConnection` class
    - In `handle_block_event()`, after extracting block height, compare with `last_block_height`
    - If `last_block_height !== null` and `block_height !== last_block_height + 1`, emit `on_block_gap_detected` hook with `{ expected_height: last_block_height + 1, actual_height: block_height, gap_size: block_height - last_block_height - 1 }`
    - Update `last_block_height = block_height` after successful processing
    - Handle initial block (when `last_block_height === null`) by setting it without gap detection

**Format:** `- [ ] [M#] Task description`
  - File: Path to file(s) affected
  - Issue: Description of the problem
  - Impact: What happens if this isn't addressed
  - Recommendation: Suggested approach or solution

## 📝 Medium Priority (Address When Possible)

- [ ] [M4] Add JSDoc comments to all public methods and classes
  - File: `src/attn.ts`, `src/hooks/emitter.ts`, `src/relay/connection.ts`
  - Issue: Some methods have JSDoc, but not all public APIs are fully documented. Main `Attn` class has good documentation, but `RelayConnection` and `HookEmitter` could use more comprehensive JSDoc.
  - Impact: Reduced developer experience, unclear API usage, harder for new developers to understand the framework
  - Recommendation: Add comprehensive JSDoc with parameter descriptions, return types, examples, and usage notes for all public methods

- [ ] [M4] Add error handling improvements for edge cases in relay connection
  - File: `src/relay/connection.ts`
  - Issue: Some edge cases in connection lifecycle may not be fully handled (e.g., rapid connect/disconnect cycles, authentication timeout edge cases, WebSocket close codes, network interruptions during subscription)
  - Impact: Unexpected behavior during connection failures or edge cases, potential memory leaks from unhandled timeouts
  - Recommendation: Review and improve error handling for all connection states, add cleanup for all timeouts, handle WebSocket close codes appropriately, add retry logic for transient failures

- [ ] [M4] Add TypeScript strict mode and improve type safety
  - File: `tsconfig.json`
  - Issue: TypeScript configuration may not be in strict mode, allowing potential type safety issues
  - Impact: Potential runtime errors from loose type checking, `any` types may exist, null/undefined checks may be missing
  - Recommendation: Enable strict mode (`strict: true`), fix any resulting type errors, eliminate `any` types, add proper null checks

**Format:** `- [ ] [M#] Task description`
  - File: Path to file(s) affected
  - Issue: Description of the problem
  - Impact: What happens if this isn't addressed
  - Recommendation: Suggested approach or solution

## 💡 Low Priority (Nice to Have)

- [ ] [M4] Add examples directory with sample implementations
  - File: Create `examples/` directory
  - Issue: No example code showing how to use the framework
  - Impact: Slower onboarding for new developers
  - Recommendation: Add example marketplace implementations

- [ ] [M4] Add performance benchmarks for hook system
  - File: Create `benchmarks/` directory
  - Issue: No performance metrics for hook execution
  - Impact: Unknown performance characteristics under load
  - Recommendation: Add benchmarks for hook registration and emission

- [ ] [M4] Add integration tests with mock relay
  - File: Create `test/integration/` directory
  - Issue: No integration tests for full framework lifecycle
  - Impact: Difficult to verify end-to-end behavior
  - Recommendation: Add integration tests using mock Nostr relay

**Format:** `- [ ] [M#] Task description`
  - File: Path to file(s) affected
  - Issue: Description of the problem
  - Impact: What happens if this isn't addressed
  - Recommendation: Suggested approach or solution

## ✅ Recently Completed

- ✅ Framework README documentation - Comprehensive documentation added with examples, hook system details, and configuration options
- ✅ Removed ZMQ test file - Empty `test-zmq.ts` file deleted (ZMQ support removed from protocol)
- ✅ Validation comment verification - Confirmed no outdated protocol references in validation utilities

---

**Last Updated:** 2025-01-28

**Project Description:** Hook-based framework for building Bitcoin-native attention marketplace implementations using the ATTN Protocol on Nostr

**Key Features:** Rely-style hook system, Nostr relay connection management, Bitcoin block synchronization, ATTN Protocol event subscriptions, standard Nostr event support

