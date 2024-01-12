/** Token types recognized by the Cedar policy lexer. */
export enum TokenType {
  PERMIT = "PERMIT",
  FORBID = "FORBID",
  WHEN = "WHEN",
  LPAREN = "LPAREN",
  RPAREN = "RPAREN",
  LBRACE = "LBRACE",
  RBRACE = "RBRACE",
  DOT = "DOT",
  COMMA = "COMMA",
  EQ = "EQ",
  NEQ = "NEQ",
  AND = "AND",
  OR = "OR",
  IN = "IN",
  STRING = "STRING",
  IDENT = "IDENT",
  SEMICOLON = "SEMICOLON",
  EOF = "EOF",
}

/** A single token produced by the lexer. */
export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

const KEYWORDS: Record<string, TokenType> = {
  permit: TokenType.PERMIT,
  forbid: TokenType.FORBID,
  when: TokenType.WHEN,
  in: TokenType.IN,
};

/**
 * Tokenizes a Cedar policy string into an array of tokens.
 * @param input - The Cedar policy source text
 * @returns An array of tokens ending with an EOF token
 * @throws Error if an unknown character is encountered
 */
export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  let line = 1;
  let column = 1;

  function peek(): string {
    return pos < input.length ? input[pos] : "\0";
  }

  function advance(): string {
    const ch = input[pos];
    pos++;
    if (ch === "\n") {
      line++;
      column = 1;
    } else {
      column++;
    }
    return ch;
  }

  function addToken(type: TokenType, value: string, startCol: number, startLine: number): void {
    tokens.push({ type, value, line: startLine, column: startCol });
  }

  while (pos < input.length) {
    const ch = peek();
    const startLine = line;
    const startCol = column;

    // Skip whitespace
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      advance();
      continue;
    }

    // Skip line comments
    if (ch === "/" && pos + 1 < input.length && input[pos + 1] === "/") {
      while (pos < input.length && peek() !== "\n") {
        advance();
      }
      continue;
    }

    // Single-character tokens
    if (ch === "(") { advance(); addToken(TokenType.LPAREN, "(", startCol, startLine); continue; }
    if (ch === ")") { advance(); addToken(TokenType.RPAREN, ")", startCol, startLine); continue; }
    if (ch === "{") { advance(); addToken(TokenType.LBRACE, "{", startCol, startLine); continue; }
    if (ch === "}") { advance(); addToken(TokenType.RBRACE, "}", startCol, startLine); continue; }
    if (ch === ".") { advance(); addToken(TokenType.DOT, ".", startCol, startLine); continue; }
    if (ch === ",") { advance(); addToken(TokenType.COMMA, ",", startCol, startLine); continue; }
    if (ch === ";") { advance(); addToken(TokenType.SEMICOLON, ";", startCol, startLine); continue; }

    // Two-character operators
    if (ch === "=" && pos + 1 < input.length && input[pos + 1] === "=") {
      advance(); advance();
      addToken(TokenType.EQ, "==", startCol, startLine);
      continue;
    }
    if (ch === "!" && pos + 1 < input.length && input[pos + 1] === "=") {
      advance(); advance();
      addToken(TokenType.NEQ, "!=", startCol, startLine);
      continue;
    }
    if (ch === "&" && pos + 1 < input.length && input[pos + 1] === "&") {
      advance(); advance();
      addToken(TokenType.AND, "&&", startCol, startLine);
      continue;
    }
    if (ch === "|" && pos + 1 < input.length && input[pos + 1] === "|") {
      advance(); advance();
      addToken(TokenType.OR, "||", startCol, startLine);
      continue;
    }

    // String literals
    if (ch === '"') {
      advance(); // skip opening quote
      let value = "";
      while (pos < input.length && peek() !== '"') {
        value += advance();
      }
      if (pos >= input.length) {
        throw new Error(`Unterminated string at line ${startLine}, column ${startCol}`);
      }
      advance(); // skip closing quote
      addToken(TokenType.STRING, value, startCol, startLine);
      continue;
    }

    // Identifiers and keywords
    if (isAlpha(ch)) {
      let value = "";
      while (pos < input.length && isAlphaNumeric(peek())) {
        value += advance();
      }
      const type = KEYWORDS[value] ?? TokenType.IDENT;
      addToken(type, value, startCol, startLine);
      continue;
    }

    throw new Error(`Unexpected character '${ch}' at line ${startLine}, column ${startCol}`);
  }

  tokens.push({ type: TokenType.EOF, value: "", line, column });
  return tokens;
}

function isAlpha(ch: string): boolean {
  return /^[a-zA-Z_]$/.test(ch);
}

function isAlphaNumeric(ch: string): boolean {
  return /^[a-zA-Z0-9_]$/.test(ch);
}
