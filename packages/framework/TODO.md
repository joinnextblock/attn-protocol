# ATTN Framework TODO

Tasks and improvements for the ATTN Framework, organized by priority.

## Milestone Reference

- **M1-M3**: Foundation (Complete)
- **M4-M7**: Economy (In Progress)
- **M8-M10**: City Life (Planned)

All tasks must include a milestone tag: `[M#]`

## 🔴 Critical (Address Immediately)

_No critical issues at this time._

**Format:** `- [ ] [M#] Task description`
  - File: Path to file(s) affected
  - Issue: Description of the problem
  - Impact: What happens if this isn't addressed
  - Recommendation: Suggested approach or solution

## ⚠️ High Priority (Address Soon)

- [ ] [M4] Fix failing test: `should throw error if node_pubkeys is missing`
  - File: `src/attn.test.ts:301-309`
  - Issue: Test expects `node_pubkeys` validation to throw, but `node_pubkeys` is now optional (no longer required)
  - Impact: Test failure causes CI/CD pipeline failures, false negatives
  - Recommendation: Remove this test or update it to test the new optional behavior

- [ ] [M4] Fix failing test: `should handle authentication rejection`
  - File: `src/relay/connection.test.ts:303-324`
  - Issue: Mock WebSocket timing issue - promise resolves before rejection is simulated
  - Impact: Test failure causes CI/CD pipeline failures
  - Recommendation: Add proper await/timing to ensure rejection is simulated before promise resolution

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

- [ ] [M4] Add JSDoc comments to remaining public methods
  - File: `src/relay/connection.ts` (some private methods lack documentation)
  - Issue: Some complex methods are not fully documented
  - Impact: Reduced developer experience, unclear behavior for complex methods
  - Recommendation: Add comprehensive JSDoc with parameter descriptions, return types, and usage notes

- [ ] [M4] Add examples directory with sample implementations
  - File: Create `examples/` directory
  - Issue: No example code showing how to use the framework
  - Impact: Slower onboarding for new developers
  - Recommendation: Add example marketplace implementations showing hook usage patterns

- [ ] [M4] Refactor: Extract generic event handler
  - File(s): `src/relay/connection.ts:810-1150`
  - Current: 9+ event handlers with identical pattern (parse content, extract block height, build context, emit before/on/after)
  - Proposed: Extract generic `handle_event<T>()` function that takes event kind and context builder
  - Benefit: Reduce ~400 lines of duplication, easier maintenance, consistent behavior
  - Effort: Medium (2-4 hours)

**Format:** `- [ ] [M#] Task description`
  - File: Path to file(s) affected
  - Issue: Description of the problem
  - Impact: What happens if this isn't addressed
  - Recommendation: Suggested approach or solution

## 💡 Low Priority (Nice to Have)

- [ ] [M4] Add performance benchmarks for hook system
  - File: Create `benchmarks/` directory
  - Issue: No performance metrics for hook execution
  - Impact: Unknown performance characteristics under load
  - Recommendation: Add benchmarks for hook registration and emission

- [ ] [M4] Add more integration tests with mock relay
  - File: Expand `src/test/` directory
  - Issue: Current tests focus on unit testing, integration coverage could be improved
  - Impact: Edge cases in full lifecycle may not be caught
  - Recommendation: Add integration tests for complete event flows

**Format:** `- [ ] [M#] Task description`
  - File: Path to file(s) affected
  - Issue: Description of the problem
  - Impact: What happens if this isn't addressed
  - Recommendation: Suggested approach or solution

## ✅ Recently Completed

- ✅ [M4] Hook naming refactoring completed (2025-12-07)
  - Renamed all `on_new_*` hooks to `on_*_event` pattern
  - Renamed all `before_new_*` and `after_new_*` hooks to `before_*_event` and `after_*_event`
  - Renamed all confirmation hooks to `on_*_confirmation_event` pattern
  - Added 24 new before/after lifecycle hooks for all ATTN protocol events
  - Updated all type names from `New*Context` to `*EventContext`
  - Updated all documentation (README.md, HOOKS.md)
  - 58 tests passing

- ✅ [M4] Implemented structured logging with Pino
  - Added `src/logger.ts` with Pino-based logger
  - Added `Logger` interface for custom logger injection
  - Added `create_default_logger()` and `create_noop_logger()` utilities
  - Replaced all console.log/error/warn calls with structured logging
  - Configurable log level via `LOG_LEVEL` environment variable

- ✅ [M4] Added comprehensive test coverage
  - Hook emitter tests (19 tests)
  - Attn class tests (28 tests)
  - Relay connection tests (13 tests)
  - Mock WebSocket implementation
  - Test fixtures for events

- ✅ Framework README documentation - Comprehensive documentation added with examples, hook system details, and configuration options

- ✅ Removed ZMQ test file - Empty `test-zmq.ts` file deleted (ZMQ support removed from protocol)

- ✅ Validation comment verification - Confirmed no outdated protocol references in validation utilities

---

**Last Updated:** 2025-12-07

**Project Description:** Hook-based framework for building Bitcoin-native attention marketplace implementations using the ATTN Protocol on Nostr

**Key Features:** Rely-style hook system with before/on/after lifecycle, Nostr relay connection management, Bitcoin block synchronization, ATTN Protocol event subscriptions, standard Nostr event support, structured logging via Pino

