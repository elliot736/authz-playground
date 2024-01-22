# ADR-004: Zero Runtime Dependencies

## Status
Accepted

## Date
2024-01-22

## Context
Node.js projects commonly pull in dozens of runtime dependencies, even for simple tasks like CLI argument parsing (commander, yargs) or configuration loading (dotenv, cosmiconfig). Each dependency introduces supply-chain risk, version conflicts, and installation overhead. We needed to decide whether the convenience of third-party libraries justified these costs for a tool of this scope.

## Decision
We maintain zero runtime dependencies. The `package.json` contains only `devDependencies` (TypeScript, Vitest, and `@types/node`), all of which are needed exclusively for development and testing. In production, the tool relies solely on Node.js built-in modules (`node:fs` for file I/O, `process` for CLI interaction, and `JSON.parse` for request loading).

Specific functionality we implement ourselves instead of importing:
- **CLI argument parsing**: A 10-line `parseArgs` function that handles `--key value` pairs.
- **Policy parsing**: Hand-written lexer and parser (see ADR-002).
- **Output formatting**: Template literals and string concatenation for the visualizer tree and lint output.

## Consequences
- **Positive**: The project has a minimal attack surface for supply-chain vulnerabilities. Installation is fast -- `npm install` only fetches dev tooling. There are no transitive dependency conflicts or breaking upgrades from upstream packages. The tool can be audited end-to-end by reading a handful of source files. The small install footprint makes it viable as a globally installed CLI tool.
- **Negative**: We implement basic utilities (argument parsing, formatted output) that libraries handle more robustly. The hand-rolled CLI parser does not support flags like `--verbose`, short options (`-p`), or `--help` auto-generation. If requirements grow to include YAML input, HTTP serving, or colored terminal output, we will need to either add dependencies or write more boilerplate.

## Alternatives Considered
- **commander / yargs for CLI**: Rejected because our CLI has only three commands with two options each. The argument parsing logic is trivial and does not warrant a dependency.
- **chalk for colored output**: Rejected to maintain zero dependencies. If colored output becomes important, ANSI escape codes can be inlined without a library.
- **ajv for JSON schema validation**: Rejected because the request format is simple enough to validate implicitly through TypeScript types and runtime access patterns.
