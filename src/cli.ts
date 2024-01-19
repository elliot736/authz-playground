import * as fs from "node:fs";
import { parse } from "./parser/parser.js";
import { evaluate } from "./evaluator/evaluator.js";
import { lint } from "./linter/linter.js";
import { visualize } from "./visualizer/visualizer.js";
import type { AuthzRequest } from "./evaluator/evaluator.js";

/**
 * Parses CLI arguments and runs the appropriate command.
 * @param args - Command line arguments (process.argv.slice(2))
 */
export function runCli(args: string[]): void {
  const command = args[0];

  if (!command || command === "--help" || command === "-h") {
    printUsage();
    return;
  }

  switch (command) {
    case "evaluate":
      handleEvaluate(args.slice(1));
      break;
    case "lint":
      handleLint(args.slice(1));
      break;
    case "visualize":
      handleVisualize(args.slice(1));
      break;
    default:
      console.error(`Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }
}

function parseArgs(args: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--") && i + 1 < args.length) {
      const key = args[i].slice(2);
      result[key] = args[i + 1];
      i++;
    }
  }
  return result;
}

function readPolicies(policyPath: string) {
  const text = fs.readFileSync(policyPath, "utf-8");
  return parse(text);
}

function readRequests(requestPath: string): AuthzRequest[] {
  const text = fs.readFileSync(requestPath, "utf-8");
  const data = JSON.parse(text) as AuthzRequest | AuthzRequest[];
  return Array.isArray(data) ? data : [data];
}

function handleEvaluate(args: string[]): void {
  const opts = parseArgs(args);
  if (!opts["policy"] || !opts["request"]) {
    console.error("Usage: authz-playground evaluate --policy <file> --request <file>");
    process.exit(1);
  }

  const policies = readPolicies(opts["policy"]);
  const requests = readRequests(opts["request"]);

  for (const request of requests) {
    const decision = evaluate(policies, request);
    const status = decision.allowed ? "ALLOW" : "DENY";
    console.log(`[${status}] ${decision.reason}`);
    console.log(`  Principal: ${JSON.stringify(request.principal)}`);
    console.log(`  Action: ${request.action}`);
    console.log(`  Resource: ${JSON.stringify(request.resource)}`);
    console.log();
  }
}

function handleLint(args: string[]): void {
  const opts = parseArgs(args);
  if (!opts["policy"]) {
    console.error("Usage: authz-playground lint --policy <file>");
    process.exit(1);
  }

  const policies = readPolicies(opts["policy"]);
  const results = lint(policies);

  if (results.length === 0) {
    console.log("No lint issues found.");
    return;
  }

  for (const result of results) {
    const prefix = result.severity.toUpperCase().padEnd(7);
    const location = result.policyIndex >= 0 ? ` (policy ${result.policyIndex + 1})` : "";
    console.log(`[${prefix}] ${result.rule}${location}: ${result.message}`);
  }

  const errorCount = results.filter((r) => r.severity === "error").length;
  if (errorCount > 0) {
    process.exit(1);
  }
}

function handleVisualize(args: string[]): void {
  const opts = parseArgs(args);
  if (!opts["policy"] || !opts["request"]) {
    console.error("Usage: authz-playground visualize --policy <file> --request <file>");
    process.exit(1);
  }

  const policies = readPolicies(opts["policy"]);
  const requests = readRequests(opts["request"]);

  for (const request of requests) {
    console.log(visualize(policies, request));
    console.log();
  }
}

function printUsage(): void {
  console.log(`authz-playground - Cedar Policy Playground & Linter

Usage:
  authz-playground evaluate --policy <file> --request <file>
  authz-playground lint --policy <file>
  authz-playground visualize --policy <file> --request <file>

Commands:
  evaluate    Evaluate authorization requests against policies
  lint        Lint policies for common mistakes
  visualize   Show decision tree for request evaluation`);
}
