# ADR-001: Implement a Simplified Cedar Subset

## Status
Accepted

## Date
2024-01-22

## Context
We needed a policy language for the authz-playground that would let users learn and experiment with authorization concepts. The full Cedar specification is extensive: it includes entity hierarchies, namespaced types, set operations, IP/decimal extensions, `unless` clauses, and a formal type system with schema validation. Implementing the complete spec would represent months of engineering effort and shift the project from an educational playground into a production policy engine -- a space already served by AWS's official Cedar SDK.

## Decision
We implement a focused subset of Cedar that covers the core authorization model while omitting advanced features. The subset includes:

- **Policy effects**: `permit` and `forbid` with the standard `(principal, action, resource)` scope
- **Conditions**: `when` clauses with field access (`principal.role`, `resource.tenant`), string literals, and comparison operators (`==`, `!=`, `in`)
- **Logical connectives**: `&&` and `||` for combining conditions
- **Comments**: line comments with `//`

We explicitly exclude: entity hierarchies and `in` for group membership on entity refs, `unless` clauses, typed entity references (`User::"alice"`), IP/decimal extension functions, set literals, the `is` operator, `context` as a first-class entity, and schema-based type checking.

## Consequences
- **Positive**: The tool remains approachable for newcomers. The entire parser, evaluator, and linter fit in a few hundred lines each, making the codebase easy to audit and extend. Users can learn deny-override semantics, multi-tenancy patterns, and RBAC without boilerplate.
- **Negative**: Policies written here are not directly portable to production Cedar without adaptation. Users who outgrow the subset must migrate to the full SDK. Some real-world patterns (group hierarchies, context-based conditions) cannot be expressed.

## Alternatives Considered
- **Full Cedar implementation**: Rejected due to scope -- this is a learning tool, not a production engine. The official Rust SDK already serves that purpose.
- **Custom DSL unrelated to Cedar**: Rejected because Cedar's syntax is well-documented and increasingly adopted. Aligning with Cedar gives users transferable knowledge.
- **OPA/Rego subset**: Rejected because Rego's logic-programming model has a steeper learning curve for authorization newcomers compared to Cedar's declarative permit/forbid structure.
