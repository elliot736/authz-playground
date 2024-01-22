# ADR-007: Separated Lexer and Parser Stages

## Status
Accepted

## Date
2024-01-22

## Context
When building a language front-end, there are two common architectures: a single-pass approach where the parser reads characters directly from the source text, and a two-pass approach where a lexer first converts the source into a token stream that the parser then consumes. The choice affects error reporting quality, code organization, and testability.

## Decision
We separate the front-end into two distinct stages with a clear interface between them:

1. **Lexer** (`tokenize`): Converts raw source text into an array of `Token` objects. Each token carries its `type`, `value`, `line`, and `column`. The lexer handles whitespace skipping, comment stripping, keyword recognition, string literal extraction, and operator matching. It produces an `EOF` sentinel at the end of the stream.

2. **Parser** (`Parser` class): Consumes the token array using a position cursor. It never sees raw characters -- only typed tokens. The parser implements one method per grammar production (`parsePolicy`, `parseConditions`, `parseComparison`, `parseExpression`) and emits structured AST nodes.

The token interface (`Token` with `type`, `value`, `line`, `column`) serves as the contract between the two stages.

## Consequences
- **Positive**: Each stage has a single responsibility and can be tested independently -- the lexer tests verify tokenization without parsing, and the parser tests can supply hand-crafted token arrays if needed. Error messages from the lexer report character-level issues (unterminated strings, unexpected characters) with precise positions, while parser errors report structural problems (missing semicolons, invalid expressions) using the token positions. Adding a new token type (e.g., `LBRACKET` for set literals) requires changes only in the lexer; the parser consumes it through the existing token interface.
- **Negative**: The two-pass approach allocates an intermediate token array, using slightly more memory than a single-pass parser. For the policy sizes this tool handles (typically dozens of lines), this overhead is negligible. The two files do need to be kept in sync -- a new keyword must be added to both the lexer's keyword map and the parser's dispatch logic.

## Alternatives Considered
- **Single-pass (scannerless) parser**: Rejected because interleaving character-level concerns (whitespace, comments, string escaping) with grammar-level logic makes both harder to understand and debug. Error messages also tend to be less precise.
- **Streaming / lazy tokenization**: Rejected as unnecessary. Cedar policy files are small enough to tokenize entirely into memory. A lazy approach would add complexity (generator functions, backtracking buffers) with no practical benefit.
