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
  - File: Missing test files throughout codebase
  - Issue: No test coverage for critical framework functionality
  - Impact: Regression risk, difficult to verify fixes, no confidence in refactoring
  - Priority: **HIGH** - Framework is core infrastructure for attention marketplace

- [ ] [M4] Implement block gap detection logic
  - File: `src/relay/connection.ts`
  - Issue: Hook `on_block_gap_detected` exists in types and can be registered, but detection logic is not implemented. Framework receives block events but doesn't track expected vs actual block heights to detect gaps.
  - Impact: Block synchronization issues may go undetected, services may miss blocks without knowing
  - Recommendation: Track last block height, compare with new block height, emit `on_block_gap_detected` hook when gap detected

**Format:** `- [ ] [M#] Task description`
  - File: Path to file(s) affected
  - Issue: Description of the problem
  - Impact: What happens if this isn't addressed
  - Recommendation: Suggested approach or solution

## 📝 Medium Priority (Address When Possible)

- [ ] [M4] Add JSDoc comments to all public methods and classes
  - File: `src/attn.ts`, `src/hooks/emitter.ts`, `src/relay/connection.ts`
  - Issue: Some methods have JSDoc, but not all public APIs are fully documented
  - Impact: Reduced developer experience, unclear API usage
  - Recommendation: Add comprehensive JSDoc with parameter descriptions and examples

- [ ] [M4] Add error handling improvements for edge cases in relay connection
  - File: `src/relay/connection.ts`
  - Issue: Some edge cases in connection lifecycle may not be fully handled
  - Impact: Unexpected behavior during connection failures or edge cases
  - Recommendation: Review and improve error handling for all connection states

- [ ] [M4] Add TypeScript strict mode and improve type safety
  - File: `tsconfig.json`
  - Issue: TypeScript configuration may not be in strict mode
  - Impact: Potential runtime errors from loose type checking
  - Recommendation: Enable strict mode and fix any resulting type errors

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

_No completed items yet. Mark items as completed here when finished._

---

**Last Updated:** 2024-12-20

**Project Description:** Hook-based framework for building Bitcoin-native attention marketplace implementations using the ATTN Protocol on Nostr

**Key Features:** Rely-style hook system, Nostr relay connection management, Bitcoin block synchronization, ATTN Protocol event subscriptions, standard Nostr event support

