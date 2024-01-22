# ADR-003: Deny-Overrides Policy Combination

## Status
Accepted

## Date
2024-01-22

## Context
When multiple policies apply to a single authorization request, the system needs a deterministic strategy for combining their results. The two main approaches are "permit-overrides" (any permit wins) and "deny-overrides" (any forbid wins). The choice has significant security implications: permit-overrides makes it easy to accidentally grant access, while deny-overrides ensures that explicit denials are never silently bypassed.

## Decision
We implement a deny-overrides policy combination algorithm with default deny. The evaluation logic proceeds in three steps:

1. Evaluate all policies against the request, collecting match results.
2. If any `forbid` policy matches, the request is **denied** -- regardless of how many `permit` policies also match.
3. If no `forbid` matches but at least one `permit` matches, the request is **allowed**.
4. If no policy matches at all, the request is **denied** (default deny / closed-world assumption).

This matches the Cedar specification's standard evaluation semantics and aligns with the principle of least privilege.

## Consequences
- **Positive**: The system is secure by default. A single `forbid` policy can serve as a hard guardrail that cannot be overridden by a misconfigured `permit`. This makes it safe to compose policies from multiple authors -- a deny from a security team cannot be negated by a permissive application-level rule. The default-deny baseline means that forgetting to write a policy results in denial, not accidental access.
- **Negative**: Policy authors must understand that `forbid` is absolute. There is no "exception to the exception" mechanism -- if a `forbid` matches, no `permit` can override it. This can be surprising and requires careful policy design, particularly for broad `forbid` rules that might inadvertently block legitimate access.

## Alternatives Considered
- **Permit-overrides**: Rejected because it creates a security footgun -- any overly broad `permit` policy would override carefully crafted denials. This conflicts with defense-in-depth principles.
- **First-match / ordered evaluation**: Rejected because it makes policy meaning dependent on file ordering, which is fragile and error-prone. Cedar's unordered semantics are more robust.
- **Priority-based combination**: Rejected as unnecessary complexity for the playground scope. Priority systems require metadata management and are harder to reason about.
