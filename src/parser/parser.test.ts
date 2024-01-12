import { describe, it, expect } from "vitest";
import { parse } from "./parser.js";
import type { Policy } from "./parser.js";

describe("Parser", () => {
  it("parses a simple permit policy with no conditions", () => {
    const input = `permit(principal, action, resource);`;
    const policies = parse(input);

    expect(policies).toHaveLength(1);
    expect(policies[0].effect).toBe("permit");
    expect(policies[0].conditions.conditions).toHaveLength(0);
  });

  it("parses a simple forbid policy", () => {
    const input = `forbid(principal, action, resource);`;
    const policies = parse(input);

    expect(policies).toHaveLength(1);
    expect(policies[0].effect).toBe("forbid");
  });

  it("parses a policy with a single condition", () => {
    const input = `permit(principal, action, resource)
  when { principal.role == "admin" };`;
    const policies = parse(input);

    expect(policies).toHaveLength(1);
    const cond = policies[0].conditions.conditions[0];
    expect(cond.left).toMatchObject({ kind: "field_access", entity: "principal", field: "role" });
    expect(cond.operator).toBe("eq");
    expect(cond.right).toMatchObject({ kind: "string_literal", value: "admin" });
  });

  it("parses a policy with multiple AND conditions", () => {
    const input = `permit(principal, action, resource)
  when { principal.role == "admin" && action == "read" };`;
    const policies = parse(input);

    expect(policies[0].conditions.conditions).toHaveLength(2);
    expect(policies[0].conditions.connectors).toEqual(["and"]);
  });

  it("parses field access on both sides", () => {
    const input = `permit(principal, action, resource)
  when { principal.tenant == resource.tenant };`;
    const policies = parse(input);

    const cond = policies[0].conditions.conditions[0];
    expect(cond.left).toMatchObject({ kind: "field_access", entity: "principal", field: "tenant" });
    expect(cond.right).toMatchObject({ kind: "field_access", entity: "resource", field: "tenant" });
  });

  it("parses multiple policies in one file", () => {
    const input = `permit(principal, action, resource)
  when { principal.role == "admin" };

forbid(principal, action, resource)
  when { resource.classification == "top_secret" };`;
    const policies = parse(input);

    expect(policies).toHaveLength(2);
    expect(policies[0].effect).toBe("permit");
    expect(policies[1].effect).toBe("forbid");
  });

  it("parses action comparisons (action == 'read')", () => {
    const input = `permit(principal, action, resource)
  when { action == "read" };`;
    const policies = parse(input);

    const cond = policies[0].conditions.conditions[0];
    expect(cond.left).toMatchObject({ kind: "field_access", entity: "action", field: "" });
    expect(cond.right).toMatchObject({ kind: "string_literal", value: "read" });
  });

  it("parses != operator", () => {
    const input = `forbid(principal, action, resource)
  when { principal.clearance != "top_secret" };`;
    const policies = parse(input);

    const cond = policies[0].conditions.conditions[0];
    expect(cond.operator).toBe("neq");
  });

  it("parses || (OR) conditions", () => {
    const input = `permit(principal, action, resource)
  when { principal.role == "admin" || principal.role == "editor" };`;
    const policies = parse(input);

    expect(policies[0].conditions.conditions).toHaveLength(2);
    expect(policies[0].conditions.connectors).toEqual(["or"]);
  });

  it("parses 'in' operator", () => {
    const input = `permit(principal, action, resource)
  when { principal in resource.readers };`;
    const policies = parse(input);

    const cond = policies[0].conditions.conditions[0];
    expect(cond.operator).toBe("in");
  });

  it("throws on missing semicolon", () => {
    const input = `permit(principal, action, resource)`;
    expect(() => parse(input)).toThrow();
  });

  it("throws on unclosed brace", () => {
    const input = `permit(principal, action, resource)
  when { principal.role == "admin" ;`;
    expect(() => parse(input)).toThrow();
  });

  it("throws on unexpected token", () => {
    const input = `permit when;`;
    expect(() => parse(input)).toThrow();
  });
});
