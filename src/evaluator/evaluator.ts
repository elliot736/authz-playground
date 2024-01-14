import type { Policy, Expression, Comparison, ConditionGroup } from "../parser/parser.js";

/** An authorization request to evaluate against policies. */
export interface AuthzRequest {
  principal: Record<string, string>;
  action: string;
  resource: Record<string, string>;
}

/** The result of evaluating an authorization request. */
export interface Decision {
  allowed: boolean;
  matchedPolicy: Policy | null;
  reason: string;
}

/** Per-policy evaluation details used by the visualizer. */
export interface PolicyEvaluation {
  policy: Policy;
  matched: boolean;
  conditionResults: ConditionResult[];
}

/** Result of evaluating a single condition. */
export interface ConditionResult {
  condition: Comparison;
  leftValue: string;
  rightValue: string;
  result: boolean;
}

/**
 * Evaluates an authorization request against a set of policies.
 *
 * Evaluation logic:
 * 1. If any forbid policy matches, the request is denied (deny overrides).
 * 2. If any permit policy matches, the request is allowed.
 * 3. If no policy matches, the request is denied (default deny).
 *
 * @param policies - The parsed policies to evaluate against
 * @param request - The authorization request
 * @returns The authorization decision
 */
export function evaluate(policies: Policy[], request: AuthzRequest): Decision {
  const evaluations = evaluateAll(policies, request);

  // Check forbid first (deny overrides)
  for (const evaluation of evaluations) {
    if (evaluation.matched && evaluation.policy.effect === "forbid") {
      return {
        allowed: false,
        matchedPolicy: evaluation.policy,
        reason: "Request forbidden by matching forbid policy",
      };
    }
  }

  // Check permits
  for (const evaluation of evaluations) {
    if (evaluation.matched && evaluation.policy.effect === "permit") {
      return {
        allowed: true,
        matchedPolicy: evaluation.policy,
        reason: "Request permitted by matching permit policy",
      };
    }
  }

  // Default deny
  return {
    allowed: false,
    matchedPolicy: null,
    reason: "No matching policy found; request denied by default",
  };
}

/**
 * Evaluates all policies against a request, returning detailed results for each.
 * @param policies - The parsed policies
 * @param request - The authorization request
 * @returns Per-policy evaluation details
 */
export function evaluateAll(policies: Policy[], request: AuthzRequest): PolicyEvaluation[] {
  return policies.map((policy) => evaluatePolicy(policy, request));
}

function evaluatePolicy(policy: Policy, request: AuthzRequest): PolicyEvaluation {
  const group = policy.conditions;
  if (group.conditions.length === 0) {
    return { policy, matched: true, conditionResults: [] };
  }

  const conditionResults = group.conditions.map((cond) => evaluateCondition(cond, request));

  let matched: boolean;
  if (group.connectors.length === 0) {
    matched = conditionResults[0].result;
  } else {
    matched = conditionResults[0].result;
    for (let i = 0; i < group.connectors.length; i++) {
      const connector = group.connectors[i];
      const nextResult = conditionResults[i + 1].result;
      if (connector === "and") {
        matched = matched && nextResult;
      } else {
        matched = matched || nextResult;
      }
    }
  }

  return { policy, matched, conditionResults };
}

function evaluateCondition(cond: Comparison, request: AuthzRequest): ConditionResult {
  const leftValue = resolveExpression(cond.left, request);
  const rightValue = resolveExpression(cond.right, request);

  let result: boolean;
  switch (cond.operator) {
    case "eq":
      result = leftValue === rightValue;
      break;
    case "neq":
      result = leftValue !== rightValue;
      break;
    case "in":
      result = rightValue.split(",").map((s) => s.trim()).includes(leftValue);
      break;
  }

  return { condition: cond, leftValue, rightValue, result };
}

function resolveExpression(expr: Expression, request: AuthzRequest): string {
  if (expr.kind === "string_literal") {
    return expr.value;
  }

  // field_access
  const { entity, field } = expr;
  if (entity === "action" && field === "") {
    return request.action;
  }
  if (entity === "principal") {
    return request.principal[field] ?? "";
  }
  if (entity === "resource") {
    return request.resource[field] ?? "";
  }
  if (entity === "action" && field !== "") {
    return "";
  }
  return "";
}
