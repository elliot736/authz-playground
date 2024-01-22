# ADR-005: Text-Based Decision Tree Visualization

## Status
Accepted

## Date
2024-01-22

## Context
A key feature of the playground is showing users *how* their policies are evaluated -- not just the final allow/deny result, but which policies matched, which conditions passed or failed, and why. We needed to choose a visualization format that serves this debugging and learning purpose.

## Decision
We render the decision tree as a plain-text ASCII tree using Unicode box-drawing characters (`├──`, `└──`, `│`). The output is structured hierarchically:

1. **Root**: The final authorization decision (ALLOW or DENY).
2. **Policy nodes**: Each policy with its effect and condition summary.
3. **Condition nodes**: Each condition showing the expression, resolved values, and match result.
4. **Final node**: Which policy determined the outcome, or that default deny applied.

The visualizer reuses the evaluator's `evaluateAll` function to get per-policy and per-condition results, then formats them into the tree. Each condition line shows both the symbolic expression (`principal.role == "admin"`) and the resolved runtime values (`"viewer" == "admin" -> NO MATCH`), making it easy to see exactly why a condition passed or failed.

## Consequences
- **Positive**: The output works in any terminal, CI log, or pipe to a file. No browser, image viewer, or external tool is needed. The tree is easy to copy into bug reports, documentation, or chat messages. The implementation is a single function with no dependencies beyond the evaluator. The format is grep-friendly -- users can search for "NO MATCH" to find failing conditions.
- **Negative**: Complex policies with many conditions produce long output that may be hard to scan. The format cannot represent overlapping relationships or cross-references between policies. There is no interactivity -- users cannot expand or collapse nodes.

## Alternatives Considered
- **Graphviz DOT output**: Rejected because it requires an external tool (`dot`) to render, adding friction for casual users. Could be added as a secondary format later.
- **HTML/SVG interactive visualization**: Rejected because it would require either a bundler and browser runtime or a server component, significantly increasing project complexity and conflicting with the CLI-first design.
- **JSON structured output**: Considered as a complement but not a replacement. Raw JSON is harder to read at a glance. The evaluator already exposes structured data through `evaluateAll` for programmatic consumers; the visualizer is specifically for human readability.
