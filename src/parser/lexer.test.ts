import { describe, it, expect } from "vitest";
import { tokenize, TokenType } from "./lexer.js";

describe("Lexer", () => {
  it("tokenizes a simple permit statement", () => {
    const input = `permit(principal, action, resource);`;
    const tokens = tokenize(input);

    expect(tokens[0]).toMatchObject({ type: TokenType.PERMIT, value: "permit" });
    expect(tokens[1]).toMatchObject({ type: TokenType.LPAREN });
    expect(tokens[2]).toMatchObject({ type: TokenType.IDENT, value: "principal" });
    expect(tokens[3]).toMatchObject({ type: TokenType.COMMA });
    expect(tokens[4]).toMatchObject({ type: TokenType.IDENT, value: "action" });
    expect(tokens[5]).toMatchObject({ type: TokenType.COMMA });
    expect(tokens[6]).toMatchObject({ type: TokenType.IDENT, value: "resource" });
    expect(tokens[7]).toMatchObject({ type: TokenType.RPAREN });
    expect(tokens[8]).toMatchObject({ type: TokenType.SEMICOLON });
    expect(tokens[9]).toMatchObject({ type: TokenType.EOF });
  });

  it("tokenizes a forbid statement", () => {
    const input = `forbid(principal, action, resource);`;
    const tokens = tokenize(input);

    expect(tokens[0]).toMatchObject({ type: TokenType.FORBID, value: "forbid" });
    expect(tokens[1]).toMatchObject({ type: TokenType.LPAREN });
    expect(tokens[7]).toMatchObject({ type: TokenType.RPAREN });
    expect(tokens[8]).toMatchObject({ type: TokenType.SEMICOLON });
  });

  it("tokenizes complex conditions with multiple operators", () => {
    const input = `permit(principal, action, resource)
  when { principal.role == "admin" && action == "read" };`;
    const tokens = tokenize(input);

    const types = tokens.map((t) => t.type);
    expect(types).toContain(TokenType.WHEN);
    expect(types).toContain(TokenType.LBRACE);
    expect(types).toContain(TokenType.DOT);
    expect(types).toContain(TokenType.EQ);
    expect(types).toContain(TokenType.STRING);
    expect(types).toContain(TokenType.AND);
    expect(types).toContain(TokenType.RBRACE);
  });

  it("tokenizes string literals", () => {
    const input = `"admin"`;
    const tokens = tokenize(input);
    expect(tokens[0]).toMatchObject({ type: TokenType.STRING, value: "admin" });
  });

  it("tokenizes != operator", () => {
    const input = `principal.clearance != "top_secret"`;
    const tokens = tokenize(input);
    const neqToken = tokens.find((t) => t.type === TokenType.NEQ);
    expect(neqToken).toBeDefined();
    expect(neqToken!.value).toBe("!=");
  });

  it("tokenizes || operator", () => {
    const input = `principal.role == "admin" || principal.role == "editor"`;
    const tokens = tokenize(input);
    const orToken = tokens.find((t) => t.type === TokenType.OR);
    expect(orToken).toBeDefined();
    expect(orToken!.value).toBe("||");
  });

  it("tokenizes the 'in' keyword", () => {
    const input = `principal in resource.readers`;
    const tokens = tokenize(input);
    expect(tokens[1]).toMatchObject({ type: TokenType.IN, value: "in" });
  });

  it("skips line comments", () => {
    const input = `// this is a comment
permit(principal, action, resource);`;
    const tokens = tokenize(input);
    expect(tokens[0]).toMatchObject({ type: TokenType.PERMIT });
  });

  it("skips inline comments", () => {
    const input = `permit(principal, action, resource); // inline comment`;
    const tokens = tokenize(input);
    // Should have normal tokens followed by EOF, no comment tokens
    const types = tokens.map((t) => t.type);
    expect(types).not.toContain("COMMENT" as TokenType);
  });

  it("returns EOF for empty input", () => {
    const tokens = tokenize("");
    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe(TokenType.EOF);
  });

  it("throws an error for unknown characters", () => {
    expect(() => tokenize("permit @")).toThrow();
  });

  it("tracks line numbers correctly", () => {
    const input = `permit(principal, action, resource)
  when { principal.role == "admin" };`;
    const tokens = tokenize(input);

    expect(tokens[0].line).toBe(1); // permit
    const whenToken = tokens.find((t) => t.type === TokenType.WHEN);
    expect(whenToken!.line).toBe(2);
  });

  it("tracks column numbers correctly", () => {
    const input = `permit(principal, action, resource);`;
    const tokens = tokenize(input);
    expect(tokens[0].column).toBe(1); // permit starts at column 1
    expect(tokens[1].column).toBe(7); // ( at column 7
  });
});
