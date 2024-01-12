import { tokenize, TokenType } from "./lexer.js";
import type { Token } from "./lexer.js";

/** The effect of a policy: permit or forbid. */
export type Effect = "permit" | "forbid";

/** A logical operator connecting conditions. */
export type LogicalOp = "and" | "or";

/** A comparison operator. */
export type ComparisonOp = "eq" | "neq" | "in";

/** A field access expression like `principal.role`. */
export interface FieldAccess {
  kind: "field_access";
  entity: string;
  field: string;
}

/** A string literal expression like `"admin"`. */
export interface StringLiteral {
  kind: "string_literal";
  value: string;
}

/** An expression is either a field access or a string literal. */
export type Expression = FieldAccess | StringLiteral;

/** A comparison between two expressions. */
export interface Comparison {
  left: Expression;
  operator: ComparisonOp;
  right: Expression;
}

/** A group of conditions connected by logical operators. */
export interface ConditionGroup {
  conditions: Comparison[];
  connectors: LogicalOp[];
}

/** A parsed Cedar policy. */
export interface Policy {
  effect: Effect;
  conditions: ConditionGroup;
}

/**
 * Parses Cedar policy text into an array of Policy objects.
 * @param input - The Cedar policy source text
 * @returns An array of parsed policies
 * @throws Error if the input contains syntax errors
 */
export function parse(input: string): Policy[] {
  const tokens = tokenize(input);
  const parser = new Parser(tokens);
  return parser.parseAll();
}

class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parseAll(): Policy[] {
    const policies: Policy[] = [];
    while (!this.isAtEnd()) {
      policies.push(this.parsePolicy());
    }
    return policies;
  }

  private parsePolicy(): Policy {
    const effectToken = this.current();
    if (effectToken.type !== TokenType.PERMIT && effectToken.type !== TokenType.FORBID) {
      throw this.error(`Expected 'permit' or 'forbid', got '${effectToken.value}'`);
    }
    const effect: Effect = effectToken.type === TokenType.PERMIT ? "permit" : "forbid";
    this.advance();

    // Parse (principal, action, resource)
    this.expect(TokenType.LPAREN, "'('");
    this.expect(TokenType.IDENT, "identifier"); // principal
    this.expect(TokenType.COMMA, "','");
    this.expect(TokenType.IDENT, "identifier"); // action
    this.expect(TokenType.COMMA, "','");
    this.expect(TokenType.IDENT, "identifier"); // resource
    this.expect(TokenType.RPAREN, "')'");

    // Optional: when { conditions }
    let conditions: ConditionGroup = { conditions: [], connectors: [] };
    if (this.current().type === TokenType.WHEN) {
      this.advance(); // consume 'when'
      this.expect(TokenType.LBRACE, "'{'");
      conditions = this.parseConditions();
      this.expect(TokenType.RBRACE, "'}'");
    }

    this.expect(TokenType.SEMICOLON, "';'");

    return { effect, conditions };
  }

  private parseConditions(): ConditionGroup {
    const conditions: Comparison[] = [];
    const connectors: LogicalOp[] = [];

    conditions.push(this.parseComparison());

    while (
      this.current().type === TokenType.AND ||
      this.current().type === TokenType.OR
    ) {
      const op: LogicalOp = this.current().type === TokenType.AND ? "and" : "or";
      connectors.push(op);
      this.advance();
      conditions.push(this.parseComparison());
    }

    return { conditions, connectors };
  }

  private parseComparison(): Comparison {
    const left = this.parseExpression();

    const opToken = this.current();
    let operator: ComparisonOp;
    if (opToken.type === TokenType.EQ) {
      operator = "eq";
    } else if (opToken.type === TokenType.NEQ) {
      operator = "neq";
    } else if (opToken.type === TokenType.IN) {
      operator = "in";
    } else {
      throw this.error(`Expected comparison operator (==, !=, in), got '${opToken.value}'`);
    }
    this.advance();

    const right = this.parseExpression();
    return { left, operator, right };
  }

  private parseExpression(): Expression {
    const token = this.current();

    if (token.type === TokenType.STRING) {
      this.advance();
      return { kind: "string_literal", value: token.value };
    }

    if (token.type === TokenType.IDENT) {
      const entity = token.value;
      this.advance();

      if (this.current().type === TokenType.DOT) {
        this.advance(); // consume '.'
        const fieldToken = this.current();
        if (fieldToken.type !== TokenType.IDENT) {
          throw this.error(`Expected field name after '.', got '${fieldToken.value}'`);
        }
        this.advance();
        return { kind: "field_access", entity, field: fieldToken.value };
      }

      // Bare identifier (e.g., 'action')
      return { kind: "field_access", entity, field: "" };
    }

    throw this.error(`Expected expression, got '${token.value}'`);
  }

  private current(): Token {
    return this.tokens[this.pos];
  }

  private advance(): Token {
    const token = this.tokens[this.pos];
    this.pos++;
    return token;
  }

  private expect(type: TokenType, description: string): Token {
    const token = this.current();
    if (token.type !== type) {
      throw this.error(`Expected ${description}, got '${token.value}'`);
    }
    return this.advance();
  }

  private isAtEnd(): boolean {
    return this.current().type === TokenType.EOF;
  }

  private error(message: string): Error {
    const token = this.current();
    return new Error(`Parse error at line ${token.line}, column ${token.column}: ${message}`);
  }
}
