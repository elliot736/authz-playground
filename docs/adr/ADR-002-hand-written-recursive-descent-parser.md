# ADR-002: Hand-Written Recursive Descent Parser

## Status
Accepted

## Date
2024-01-22

## Context
The project needs to parse Cedar policy text into a structured AST for evaluation, linting, and visualization. We had to decide between using a parser generator (PEG.js, nearley, tree-sitter) or writing a parser by hand. The Cedar subset grammar is small -- roughly a dozen production rules -- so the implementation cost of either approach is modest.

## Decision
We implement a hand-written recursive descent parser consisting of a `tokenize` function (lexer) and a `Parser` class that consumes the token stream. The parser uses predictive parsing with single-token lookahead: `parsePolicy` dispatches on `permit`/`forbid`, `parseConditions` loops on `&&`/`||`, `parseComparison` expects `left op right`, and `parseExpression` handles field access and string literals.

The parser produces a clean AST with typed interfaces (`Policy`, `ConditionGroup`, `Comparison`, `Expression`) that downstream consumers (evaluator, linter, visualizer) depend on directly.

## Consequences
- **Positive**: Zero additional dependencies -- the parser is pure TypeScript with no build-time code generation step. Error messages include precise line and column numbers because we control the lexer. The code is straightforward to read and debug; contributors can trace parsing logic without learning a grammar DSL. Adding new syntax (e.g., a `context` entity) requires only a few lines of code in the relevant parse method.
- **Negative**: Grammar changes require manual updates to both the lexer and parser, whereas a generator would let us modify a single grammar file. As the language subset grows, the parser could become harder to maintain -- though the current grammar is small enough that this risk is low.

## Alternatives Considered
- **PEG.js / peggy**: Rejected because it would add a build-time dependency and code generation step, conflicting with the zero-dependency goal (ADR-004). The grammar is simple enough that a generator provides little leverage.
- **nearley**: Rejected for the same dependency and complexity reasons. Earley parsing is powerful for ambiguous grammars, but our grammar is unambiguous by design.
- **tree-sitter**: Rejected because tree-sitter targets incremental parsing for editors. We parse entire policy files in one pass, so incremental parsing adds complexity without benefit. It would also require a C/Rust toolchain for the native binding.
