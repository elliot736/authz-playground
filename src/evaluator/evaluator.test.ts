import { describe, it, expect } from "vitest";
import { evaluate } from "./evaluator.js";
import { parse } from "../parser/parser.js";
import type { AuthzRequest } from "./evaluator.js";

describe("Evaluator", () => {
  const testCases: Array<{
    name: string;
    policyText: string;
    request: AuthzRequest;
    expectedAllowed: boolean;
    expectedReason: string;
  }> = [
    {
      name: "simple permit matches",
      policyText: `permit(principal, action, resource)
        when { principal.role == "admin" };`,
      request: {
        principal: { role: "admin" },
        action: "read",
        resource: { type: "document" },
      },
      expectedAllowed: true,
      expectedReason: "permitted",
    },
    {
      name: "simple permit does not match",
      policyText: `permit(principal, action, resource)
        when { principal.role == "admin" };`,
      request: {
        principal: { role: "viewer" },
        action: "read",
        resource: { type: "document" },
      },
      expectedAllowed: false,
      expectedReason: "no matching",
    },
    {
      name: "simple forbid matches",
      policyText: `forbid(principal, action, resource)
        when { resource.classification == "top_secret" };`,
      request: {
        principal: { role: "admin" },
        action: "read",
        resource: { classification: "top_secret" },
      },
      expectedAllowed: false,
      expectedReason: "forbidden",
    },
    {
      name: "forbid overrides permit (both match, forbid wins)",
      policyText: `permit(principal, action, resource)
        when { principal.role == "admin" };
      forbid(principal, action, resource)
        when { resource.classification == "top_secret" };`,
      request: {
        principal: { role: "admin" },
        action: "read",
        resource: { classification: "top_secret" },
      },
      expectedAllowed: false,
      expectedReason: "forbidden",
    },
    {
      name: "default deny when no policy matches",
      policyText: `permit(principal, action, resource)
        when { principal.role == "admin" };`,
      request: {
        principal: { role: "viewer" },
        action: "write",
        resource: { type: "document" },
      },
      expectedAllowed: false,
      expectedReason: "no matching",
    },
    {
      name: "multiple AND conditions all must be true",
      policyText: `permit(principal, action, resource)
        when { principal.role == "editor" && action == "write" };`,
      request: {
        principal: { role: "editor" },
        action: "write",
        resource: { type: "document" },
      },
      expectedAllowed: true,
      expectedReason: "permitted",
    },
    {
      name: "multiple AND conditions - one fails",
      policyText: `permit(principal, action, resource)
        when { principal.role == "editor" && action == "write" };`,
      request: {
        principal: { role: "editor" },
        action: "read",
        resource: { type: "document" },
      },
      expectedAllowed: false,
      expectedReason: "no matching",
    },
    {
      name: "field-to-field comparison (principal.tenant == resource.tenant)",
      policyText: `permit(principal, action, resource)
        when { principal.tenant == resource.tenant };`,
      request: {
        principal: { tenant: "acme" },
        action: "read",
        resource: { tenant: "acme" },
      },
      expectedAllowed: true,
      expectedReason: "permitted",
    },
    {
      name: "field-to-field comparison fails",
      policyText: `permit(principal, action, resource)
        when { principal.tenant == resource.tenant };`,
      request: {
        principal: { tenant: "acme" },
        action: "read",
        resource: { tenant: "globex" },
      },
      expectedAllowed: false,
      expectedReason: "no matching",
    },
    {
      name: "action matching (action == 'read')",
      policyText: `permit(principal, action, resource)
        when { action == "read" };`,
      request: {
        principal: { role: "viewer" },
        action: "read",
        resource: { type: "document" },
      },
      expectedAllowed: true,
      expectedReason: "permitted",
    },
    {
      name: "policy with no conditions matches everything",
      policyText: `permit(principal, action, resource);`,
      request: {
        principal: { role: "anyone" },
        action: "anything",
        resource: { type: "anything" },
      },
      expectedAllowed: true,
      expectedReason: "permitted",
    },
    {
      name: "!= operator works correctly",
      policyText: `forbid(principal, action, resource)
        when { principal.clearance != "top_secret" };`,
      request: {
        principal: { clearance: "secret" },
        action: "read",
        resource: { type: "document" },
      },
      expectedAllowed: false,
      expectedReason: "forbidden",
    },
    {
      name: "!= operator - values are equal means condition fails",
      policyText: `forbid(principal, action, resource)
        when { principal.clearance != "top_secret" };`,
      request: {
        principal: { clearance: "top_secret" },
        action: "read",
        resource: { type: "document" },
      },
      expectedAllowed: false,
      expectedReason: "no matching",
    },
    {
      name: "OR conditions - first matches",
      policyText: `permit(principal, action, resource)
        when { principal.role == "admin" || principal.role == "editor" };`,
      request: {
        principal: { role: "admin" },
        action: "read",
        resource: { type: "document" },
      },
      expectedAllowed: true,
      expectedReason: "permitted",
    },
    {
      name: "OR conditions - second matches",
      policyText: `permit(principal, action, resource)
        when { principal.role == "admin" || principal.role == "editor" };`,
      request: {
        principal: { role: "editor" },
        action: "read",
        resource: { type: "document" },
      },
      expectedAllowed: true,
      expectedReason: "permitted",
    },
    {
      name: "OR conditions - neither matches",
      policyText: `permit(principal, action, resource)
        when { principal.role == "admin" || principal.role == "editor" };`,
      request: {
        principal: { role: "viewer" },
        action: "read",
        resource: { type: "document" },
      },
      expectedAllowed: false,
      expectedReason: "no matching",
    },
  ];

  testCases.forEach(({ name, policyText, request, expectedAllowed, expectedReason }) => {
    it(name, () => {
      const policies = parse(policyText);
      const decision = evaluate(policies, request);
      expect(decision.allowed).toBe(expectedAllowed);
      expect(decision.reason.toLowerCase()).toContain(expectedReason);
    });
  });
});
