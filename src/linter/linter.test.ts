import { describe, it, expect } from "vitest";
import { lint } from "./linter.js";
import { parse } from "../parser/parser.js";

describe("Linter", () => {
  it("reports overly-permissive: permit with no conditions", () => {
    const policies = parse(`permit(principal, action, resource);`);
    const results = lint(policies);
    const rule = results.find((r) => r.rule === "overly-permissive");
    expect(rule).toBeDefined();
    expect(rule!.severity).toBe("error");
    expect(rule!.policyIndex).toBe(0);
  });

  it("does not report overly-permissive for permit with conditions", () => {
    const policies = parse(`permit(principal, action, resource)
      when { principal.role == "admin" };`);
    const results = lint(policies);
    const rule = results.find((r) => r.rule === "overly-permissive");
    expect(rule).toBeUndefined();
  });

  it("reports no-forbid-policies when no forbid policies exist", () => {
    const policies = parse(`permit(principal, action, resource)
      when { principal.role == "admin" };`);
    const results = lint(policies);
    const rule = results.find((r) => r.rule === "no-forbid-policies");
    expect(rule).toBeDefined();
    expect(rule!.severity).toBe("warning");
  });

  it("does not report no-forbid-policies when forbid exists", () => {
    const policies = parse(`
      permit(principal, action, resource)
        when { principal.role == "admin" };
      forbid(principal, action, resource)
        when { resource.classification == "top_secret" };
    `);
    const results = lint(policies);
    const rule = results.find((r) => r.rule === "no-forbid-policies");
    expect(rule).toBeUndefined();
  });

  it("reports unconstrained-action: permit without action check", () => {
    const policies = parse(`permit(principal, action, resource)
      when { principal.role == "admin" };`);
    const results = lint(policies);
    const rule = results.find((r) => r.rule === "unconstrained-action");
    expect(rule).toBeDefined();
    expect(rule!.severity).toBe("warning");
  });

  it("does not report unconstrained-action when action is checked", () => {
    const policies = parse(`permit(principal, action, resource)
      when { principal.role == "admin" && action == "read" };`);
    const results = lint(policies);
    const rule = results.find((r) => r.rule === "unconstrained-action");
    expect(rule).toBeUndefined();
  });

  it("reports missing-tenant-check when no tenant field referenced", () => {
    const policies = parse(`permit(principal, action, resource)
      when { principal.role == "admin" && action == "read" };`);
    const results = lint(policies);
    const rule = results.find((r) => r.rule === "missing-tenant-check");
    expect(rule).toBeDefined();
    expect(rule!.severity).toBe("info");
  });

  it("does not report missing-tenant-check when tenant is referenced", () => {
    const policies = parse(`permit(principal, action, resource)
      when { principal.tenant == resource.tenant && action == "read" };`);
    const results = lint(policies);
    const rule = results.find((r) => r.rule === "missing-tenant-check");
    expect(rule).toBeUndefined();
  });

  it("does not report unconstrained-action for forbid policies", () => {
    const policies = parse(`
      forbid(principal, action, resource)
        when { resource.classification == "top_secret" };
    `);
    const results = lint(policies);
    const rule = results.find((r) => r.rule === "unconstrained-action");
    expect(rule).toBeUndefined();
  });

  it("does not report missing-tenant-check for forbid policies", () => {
    const policies = parse(`
      forbid(principal, action, resource)
        when { resource.classification == "top_secret" };
    `);
    const results = lint(policies);
    const rule = results.find((r) => r.rule === "missing-tenant-check");
    expect(rule).toBeUndefined();
  });

  it("reports multiple issues for multiple problematic policies", () => {
    const policies = parse(`
      permit(principal, action, resource);
      permit(principal, action, resource)
        when { principal.role == "editor" };
    `);
    const results = lint(policies);
    // Should have overly-permissive for policy 0
    // Should have no-forbid-policies
    // Should have unconstrained-action for policies without action check
    expect(results.length).toBeGreaterThanOrEqual(3);
  });
});
