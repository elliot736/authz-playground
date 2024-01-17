import type { Policy, Expression, Comparison } from "../parser/parser.js";
import type { AuthzRequest } from "../evaluator/evaluator.js";
import { evaluate, evaluateAll } from "../evaluator/evaluator.js";

/**
 * Produces a text-based decision tree showing how a request was evaluated
 * against a set of policies.
 *
 * @param policies - The parsed policies
 * @param request - The authorization request
 * @returns A formatted string showing the decision tree
 */
export function visualize(policies: Policy[], request: AuthzRequest): string {
  const decision = evaluate(policies, request);
  const evaluations = evaluateAll(policies, request);
  const lines: string[] = [];

  const decisionLabel = decision.allowed ? "ALLOW" : "DENY";
  lines.push(`Authorization Decision: ${decisionLabel}`);

  for (let i = 0; i < evaluations.length; i++) {
    const evaluation = evaluations[i];
    const isLast = i === evaluations.length - 1;
    const prefix = isLast ? "└── " : "├── ";
    const childPrefix = isLast ? "    " : "│   ";

    const effectLabel = evaluation.policy.effect;
    const condSummary = formatPolicyConditions(evaluation.policy);
    lines.push(`${prefix}Policy ${i + 1}: ${effectLabel}(...) ${condSummary}`);

    // Show each condition result
    for (let j = 0; j < evaluation.conditionResults.length; j++) {
      const cr = evaluation.conditionResults[j];
      const condIsLast = j === evaluation.conditionResults.length - 1 && !evaluation.matched && evaluation.policy.effect === "permit";
      const condPrefix = condIsLast ? "└── " : "├── ";
      const condExpr = formatComparison(cr.condition);
      const matchLabel = cr.result ? "MATCH" : "NO MATCH";
      lines.push(
        `${childPrefix}${condPrefix}${condExpr} → "${cr.leftValue}" ${cr.condition.operator === "eq" ? "==" : cr.condition.operator === "neq" ? "!=" : "in"} "${cr.rightValue}" → ${matchLabel}`
      );
    }

    // Result line
    const resultPrefix = "└── ";
    if (evaluation.matched) {
      const effectUpper = evaluation.policy.effect.toUpperCase();
      lines.push(`${childPrefix}${resultPrefix}Result: MATCHED (${effectUpper})`);
    } else {
      lines.push(`${childPrefix}${resultPrefix}Result: NOT MATCHED`);
    }
  }

  // Final line
  if (decision.allowed) {
    const matchIndex = evaluations.findIndex(
      (e) => e.matched && e.policy.effect === "permit"
    );
    lines.push(`└── Final: ALLOWED by Policy ${matchIndex + 1}`);
  } else if (decision.matchedPolicy) {
    const matchIndex = evaluations.findIndex(
      (e) => e.matched && e.policy.effect === "forbid"
    );
    lines.push(`└── Final: DENIED by Policy ${matchIndex + 1}`);
  } else {
    lines.push(`└── Final: DENIED (no matching policy, default deny)`);
  }

  return lines.join("\n");
}

function formatPolicyConditions(policy: Policy): string {
  if (policy.conditions.conditions.length === 0) {
    return "(no conditions)";
  }
  const parts = policy.conditions.conditions.map(formatComparison);
  const connectors = policy.conditions.connectors;
  let result = parts[0];
  for (let i = 0; i < connectors.length; i++) {
    const op = connectors[i] === "and" ? "&&" : "||";
    result += ` ${op} ${parts[i + 1]}`;
  }
  return `when { ${result} }`;
}

function formatComparison(cond: Comparison): string {
  const left = formatExpression(cond.left);
  const right = formatExpression(cond.right);
  const op = cond.operator === "eq" ? "==" : cond.operator === "neq" ? "!=" : "in";
  return `${left} ${op} ${right}`;
}

function formatExpression(expr: Expression): string {
  if (expr.kind === "string_literal") {
    return `"${expr.value}"`;
  }
  if (expr.field === "") {
    return expr.entity;
  }
  return `${expr.entity}.${expr.field}`;
}
