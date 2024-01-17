import { describe, it, expect } from "vitest";
import { visualize } from "./visualizer.js";
import { parse } from "../parser/parser.js";
import type { AuthzRequest } from "../evaluator/evaluator.js";

describe("Visualizer", () => {
  it("shows ALLOW decision when permit matches", () => {
    const policies = parse(`permit(principal, action, resource)
      when { principal.role == "admin" };`);
    const request: AuthzRequest = {
      principal: { role: "admin" },
      action: "read",
      resource: { type: "document" },
    };
    const output = visualize(policies, request);

    expect(output).toContain("ALLOW");
    expect(output).toContain("MATCH");
  });

  it("shows DENY decision when forbid matches", () => {
    const policies = parse(`
      permit(principal, action, resource)
        when { principal.role == "admin" };
      forbid(principal, action, resource)
        when { resource.classification == "top_secret" };
    `);
    const request: AuthzRequest = {
      principal: { role: "admin" },
      action: "read",
      resource: { classification: "top_secret" },
    };
    const output = visualize(policies, request);

    expect(output).toContain("DENY");
    expect(output).toContain("FORBID");
  });

  it("shows DENY decision when no policy matches", () => {
    const policies = parse(`permit(principal, action, resource)
      when { principal.role == "admin" };`);
    const request: AuthzRequest = {
      principal: { role: "viewer" },
      action: "read",
      resource: { type: "document" },
    };
    const output = visualize(policies, request);

    expect(output).toContain("DENY");
    expect(output).toContain("NO MATCH");
  });

  it("shows condition evaluation details", () => {
    const policies = parse(`permit(principal, action, resource)
      when { principal.role == "admin" };`);
    const request: AuthzRequest = {
      principal: { role: "viewer" },
      action: "read",
      resource: { type: "document" },
    };
    const output = visualize(policies, request);

    expect(output).toContain("principal.role");
    expect(output).toContain("admin");
    expect(output).toContain("viewer");
  });

  it("includes policy index numbers", () => {
    const policies = parse(`
      permit(principal, action, resource)
        when { principal.role == "admin" };
      forbid(principal, action, resource)
        when { resource.classification == "top_secret" };
    `);
    const request: AuthzRequest = {
      principal: { role: "admin" },
      action: "read",
      resource: { classification: "public" },
    };
    const output = visualize(policies, request);

    expect(output).toContain("Policy 1");
    expect(output).toContain("Policy 2");
  });

  it("shows tree-like formatting characters", () => {
    const policies = parse(`permit(principal, action, resource)
      when { principal.role == "admin" };`);
    const request: AuthzRequest = {
      principal: { role: "admin" },
      action: "read",
      resource: { type: "document" },
    };
    const output = visualize(policies, request);

    // Should use tree drawing characters
    expect(output).toMatch(/[├└│]/);
  });
});
