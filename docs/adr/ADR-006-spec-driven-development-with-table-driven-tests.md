# ADR-006: Spec-Driven Development with Table-Driven Tests

## Status
Accepted

## Date
2024-01-22

## Context
Authorization logic is security-critical: a bug in the evaluator can silently permit unauthorized access or incorrectly deny legitimate requests. We needed a testing strategy that provides high confidence in correctness, makes it easy to add new test cases as the language grows, and serves as executable documentation of the expected behavior.

## Decision
We adopt spec-driven (tests-first) development using Vitest as the test runner, with table-driven tests as the primary pattern for the evaluator and linter.

**Table-driven tests**: The evaluator test suite defines an array of test case objects, each containing a `name`, `policyText`, `request`, `expectedAllowed`, and `expectedReason`. A single `forEach` loop runs all cases through the same assertion logic. Adding a new scenario requires only appending an object to the array -- no new test function or boilerplate.

**Vitest**: Chosen for its native ESM and TypeScript support, fast execution, and compatibility with the project's `"type": "module"` configuration. It requires no additional transpilation setup beyond what TypeScript provides.

**Tests-first workflow**: The contributing guidelines specify writing tests before implementation. Each module (lexer, parser, evaluator, linter, visualizer) has a co-located `.test.ts` file that covers both positive and negative cases.

## Consequences
- **Positive**: The table-driven pattern makes the evaluator's behavior scannable at a glance -- each row is a complete specification of input and expected output. Adding edge cases is low-friction, encouraging thorough coverage. The pattern naturally documents Cedar evaluation semantics: deny-overrides, default-deny, AND/OR logic, and field-to-field comparison. Co-located test files make it easy to find tests for any module.
- **Negative**: Table-driven tests can obscure debugging when a single case fails, since all cases share assertion logic. Complex test scenarios that require setup or teardown do not fit the table pattern well and require standalone `it` blocks.

## Alternatives Considered
- **Jest**: Rejected because Jest's ESM support requires additional configuration (`--experimental-vm-modules`) and transforms. Vitest works out of the box with the project's module setup.
- **node:test (built-in)**: Rejected because it lacks the ergonomic assertion library and watch mode that Vitest provides. Using it would mean writing more boilerplate for each assertion.
- **Property-based testing (fast-check)**: Not adopted initially to keep the test infrastructure simple, but could complement the table-driven approach for fuzzing the parser in the future.
