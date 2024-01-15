import type { Policy } from "../parser/parser.js";

/** A single lint result. */
export interface LintResult {
  severity: "error" | "warning" | "info";
  rule: string;
  message: string;
  policyIndex: number;
}

/**
 * Lints a set of Cedar policies for common mistakes.
 *
 * Lint rules:
 * - **overly-permissive**: permit with no conditions (permits everything)
 * - **no-forbid-policies**: no forbid policies exist at all
 * - **unconstrained-action**: permit that doesn't check action
 * - **missing-tenant-check**: permit that doesn't reference tenant fields
 *
 * @param policies - The parsed policies to lint
 * @returns An array of lint results
 */
export function lint(policies: Policy[]): LintResult[] {
  const results: LintResult[] = [];

  // Rule: no-forbid-policies
  const hasForbid = policies.some((p) => p.effect === "forbid");
  if (!hasForbid && policies.length > 0) {
    results.push({
      severity: "warning",
      rule: "no-forbid-policies",
      message: "No forbid policies found. Consider adding deny rules for defense in depth.",
      policyIndex: -1,
    });
  }

  policies.forEach((policy, index) => {
    // Rule: overly-permissive (permit with no conditions)
    if (policy.effect === "permit" && policy.conditions.conditions.length === 0) {
      results.push({
        severity: "error",
        rule: "overly-permissive",
        message: `Policy ${index + 1} is a permit with no conditions, allowing all requests.`,
        policyIndex: index,
      });
    }

    // Only check these rules for permit policies
    if (policy.effect === "permit") {
      // Rule: unconstrained-action
      const checksAction = policy.conditions.conditions.some((cond) => {
        return (
          (cond.left.kind === "field_access" && cond.left.entity === "action") ||
          (cond.right.kind === "field_access" && cond.right.entity === "action")
        );
      });
      if (!checksAction && policy.conditions.conditions.length > 0) {
        results.push({
          severity: "warning",
          rule: "unconstrained-action",
          message: `Policy ${index + 1} does not constrain the action, allowing all actions.`,
          policyIndex: index,
        });
      }

      // Rule: missing-tenant-check
      const checksTenant = policy.conditions.conditions.some((cond) => {
        const leftTenant =
          cond.left.kind === "field_access" && cond.left.field === "tenant";
        const rightTenant =
          cond.right.kind === "field_access" && cond.right.field === "tenant";
        return leftTenant || rightTenant;
      });
      if (!checksTenant && policy.conditions.conditions.length > 0) {
        results.push({
          severity: "info",
          rule: "missing-tenant-check",
          message: `Policy ${index + 1} does not check tenant, which may be a multi-tenancy risk.`,
          policyIndex: index,
        });
      }
    }
  });

  return results;
}
