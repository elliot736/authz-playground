# Architecture Decision Records

This directory contains the Architecture Decision Records (ADRs) for the authz-playground project.

| ADR | Title | Description |
|-----|-------|-------------|
| [ADR-001](ADR-001-simplified-cedar-subset.md) | Implement a Simplified Cedar Subset | Scope boundaries for the Cedar language subset: what is included, what is excluded, and why |
| [ADR-002](ADR-002-hand-written-recursive-descent-parser.md) | Hand-Written Recursive Descent Parser | Why a custom lexer and parser over parser generators like PEG.js or tree-sitter |
| [ADR-003](ADR-003-deny-overrides-policy-combination.md) | Deny-Overrides Policy Combination | Why forbid always takes priority over permit, matching Cedar semantics and least-privilege principles |
| [ADR-004](ADR-004-zero-runtime-dependencies.md) | Zero Runtime Dependencies | Why the project has no production dependencies, only devDependencies for build and test |
| [ADR-005](ADR-005-text-based-decision-tree-visualization.md) | Text-Based Decision Tree Visualization | Why ASCII tree output instead of HTML, SVG, or Graphviz for showing evaluation traces |
| [ADR-006](ADR-006-spec-driven-development-with-table-driven-tests.md) | Spec-Driven Development with Table-Driven Tests | Why tests-first with Vitest and the table-driven pattern for evaluator and linter coverage |
| [ADR-007](ADR-007-separated-lexer-and-parser-stages.md) | Separated Lexer and Parser Stages | Why two-pass tokenize-then-parse instead of a single-pass parser, and the benefits for error reporting |
