# ATTN SDK TODO

Tasks and improvements for the ATTN SDK package, organized by priority.

## Milestone Reference

- **M1-M3**: Foundation (Complete)
- **M4-M7**: Economy (In Progress)
- **M8-M10**: City Life (Planned)

All tasks must include a milestone tag: `[M#]`

## 🔴 Critical (Address Immediately)

- [ ] [M4] Add comprehensive test coverage for event builders, validation, and publishing
  - File: Missing test files throughout codebase
  - Issue: No test coverage for critical SDK functionality including event builders, validation functions, relay publishing, and error handling
  - Impact: High regression risk, difficult to verify fixes, no confidence in refactoring, potential production bugs
  - Recommendation: Add comprehensive test suite using Jest or Vitest with unit tests for all event builders, validation functions, publishing utilities, and error handling

## ⚠️ High Priority (Address Soon)

- [ ] [M4] Add test infrastructure
  - File: `package.json` - missing test framework
  - Issue: No test framework configured
  - Impact: Cannot add tests without infrastructure setup
  - Recommendation: Add Jest or Vitest, configure test scripts in package.json

## 📝 Medium Priority (Address When Possible)

- [ ] [M4] Add JSDoc comments to all public methods
  - File: `src/utils/validation.ts`, `src/utils/formatting.ts`
  - Issue: Some utility functions lack JSDoc comments
  - Impact: Reduced developer experience, unclear API usage
  - Recommendation: Add comprehensive JSDoc with parameter descriptions, return types, examples

## 💡 Low Priority (Nice to Have)

- [ ] [M4] Add examples directory with sample event creation
  - File: Create `examples/` directory
  - Issue: No example code showing SDK usage patterns
  - Impact: Slower onboarding for new developers
  - Recommendation: Add examples showing event creation, validation, and publishing patterns

---

**Last Updated:** 2025-01-28

**Project Description:** TypeScript SDK for creating and publishing ATTN Protocol events

**Key Features:** Event builders for all ATTN Protocol events, validation utilities, relay publishing, type-safe interfaces

