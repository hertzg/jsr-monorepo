/**
 * Extracts `#define` constants and `enum` values from C header files.
 *
 * Uses text-based extraction for the predictable patterns found in HomeBank
 * headers: `#define NAME VALUE` lines and `enum { ... }` blocks.
 *
 * @module
 */

/**
 * A `#define` constant extracted from a C header.
 */
export interface ConstantDef {
  /** The constant name (e.g. `OF_INCOME`). */
  name: string;
  /** The original C expression as written (e.g. `(1<<1)`). */
  rawValue: string;
  /** The evaluated value: a number for numeric expressions, or a string for string literals. */
  value: number | string;
}

/**
 * An `enum` definition extracted from a C header.
 */
export interface EnumDef {
  /** The enum's typedef name, or `null` for anonymous enums. */
  name: string | null;
  /** The enum variants with their computed integer values. */
  variants: { name: string; value: number }[];
}

/**
 * The result of extracting constants from one or more C header files.
 */
export interface ConstantExtractionResult {
  /** All `#define` constants found. */
  defines: ConstantDef[];
  /** All `enum` definitions found. */
  enums: EnumDef[];
}

/**
 * Evaluates a simple C constant expression to a number.
 *
 * Handles the patterns that actually appear in HomeBank headers:
 * - Integer literals: `42`, `0x1F`
 * - Floating-point literals: `1.6`
 * - Bit shifts: `(1<<3)`, `1 << 4`
 * - Bitwise OR: `(1<<1) | (1<<3)`
 * - Simple arithmetic: `1 + 2`, `(5*10000) + (10*100) + 0`
 * - Parenthesized expressions
 * - Negative numbers: `-1`
 *
 * @param expr The C expression string to evaluate.
 * @returns The numeric result, or `NaN` if the expression cannot be evaluated.
 *
 * @example Evaluate a bit-shift expression
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { evaluateExpression } from "./constant-extractor.ts";
 *
 * assertEquals(evaluateExpression("(1<<3)"), 8);
 * assertEquals(evaluateExpression("42"), 42);
 * assertEquals(evaluateExpression("0x1F"), 31);
 * ```
 */
export function evaluateExpression(expr: string): number {
  const tokens = tokenize(expr.trim());
  if (tokens.length === 0) return NaN;
  const result = parseExprTokens(tokens, 0);
  return result.value;
}

interface Token {
  type: "number" | "operator" | "paren";
  value: string;
}

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (ch === " " || ch === "\t") {
      i++;
      continue;
    }
    if (ch === "(" || ch === ")") {
      tokens.push({ type: "paren", value: ch });
      i++;
      continue;
    }
    if (ch === "<" && expr[i + 1] === "<") {
      tokens.push({ type: "operator", value: "<<" });
      i += 2;
      continue;
    }
    if (ch === ">" && expr[i + 1] === ">") {
      tokens.push({ type: "operator", value: ">>" });
      i += 2;
      continue;
    }
    if (ch === "|" || ch === "&" || ch === "^" || ch === "+" || ch === "*") {
      tokens.push({ type: "operator", value: ch });
      i++;
      continue;
    }
    if (ch === "-") {
      // Unary minus if at start, after open paren, or after operator
      const prev = tokens[tokens.length - 1];
      if (
        !prev || prev.value === "(" ||
        prev.type === "operator"
      ) {
        // Parse as negative number
        let num = "-";
        i++;
        while (i < expr.length && /[0-9a-fA-FxX.]/.test(expr[i])) {
          num += expr[i];
          i++;
        }
        tokens.push({ type: "number", value: num });
        continue;
      }
      tokens.push({ type: "operator", value: "-" });
      i++;
      continue;
    }
    if (/[0-9]/.test(ch)) {
      let num = "";
      while (i < expr.length && /[0-9a-fA-FxX.]/.test(expr[i])) {
        num += expr[i];
        i++;
      }
      tokens.push({ type: "number", value: num });
      continue;
    }
    // Skip unknown characters
    i++;
  }
  return tokens;
}

interface ParseResult {
  value: number;
  pos: number;
}

function parseExprTokens(tokens: Token[], pos: number): ParseResult {
  return parseBitwiseOr(tokens, pos);
}

function parseBitwiseOr(tokens: Token[], pos: number): ParseResult {
  let result = parseBitwiseXor(tokens, pos);
  while (
    result.pos < tokens.length && tokens[result.pos]?.value === "|"
  ) {
    const right = parseBitwiseXor(tokens, result.pos + 1);
    result = { value: result.value | right.value, pos: right.pos };
  }
  return result;
}

function parseBitwiseXor(tokens: Token[], pos: number): ParseResult {
  let result = parseBitwiseAnd(tokens, pos);
  while (
    result.pos < tokens.length && tokens[result.pos]?.value === "^"
  ) {
    const right = parseBitwiseAnd(tokens, result.pos + 1);
    result = { value: result.value ^ right.value, pos: right.pos };
  }
  return result;
}

function parseBitwiseAnd(tokens: Token[], pos: number): ParseResult {
  let result = parseAddSub(tokens, pos);
  while (
    result.pos < tokens.length && tokens[result.pos]?.value === "&"
  ) {
    const right = parseAddSub(tokens, result.pos + 1);
    result = { value: result.value & right.value, pos: right.pos };
  }
  return result;
}

function parseAddSub(tokens: Token[], pos: number): ParseResult {
  let result = parseShift(tokens, pos);
  while (result.pos < tokens.length) {
    const op = tokens[result.pos]?.value;
    if (op !== "+" && op !== "-") break;
    const right = parseShift(tokens, result.pos + 1);
    result = {
      value: op === "+" ? result.value + right.value : result.value - right.value,
      pos: right.pos,
    };
  }
  return result;
}

function parseShift(tokens: Token[], pos: number): ParseResult {
  let result = parseMulDiv(tokens, pos);
  while (result.pos < tokens.length) {
    const op = tokens[result.pos]?.value;
    if (op !== "<<" && op !== ">>") break;
    const right = parseMulDiv(tokens, result.pos + 1);
    result = {
      value: op === "<<"
        ? result.value << right.value
        : result.value >> right.value,
      pos: right.pos,
    };
  }
  return result;
}

function parseMulDiv(tokens: Token[], pos: number): ParseResult {
  let result = parsePrimary(tokens, pos);
  while (
    result.pos < tokens.length && tokens[result.pos]?.value === "*"
  ) {
    const right = parsePrimary(tokens, result.pos + 1);
    result = { value: result.value * right.value, pos: right.pos };
  }
  return result;
}

function parsePrimary(tokens: Token[], pos: number): ParseResult {
  const token = tokens[pos];
  if (!token) return { value: NaN, pos };

  if (token.type === "paren" && token.value === "(") {
    const inner = parseExprTokens(tokens, pos + 1);
    // Skip closing paren
    const nextPos = inner.pos < tokens.length &&
        tokens[inner.pos]?.value === ")"
      ? inner.pos + 1
      : inner.pos;
    return { value: inner.value, pos: nextPos };
  }

  if (token.type === "number") {
    return { value: parseNumericLiteral(token.value), pos: pos + 1 };
  }

  return { value: NaN, pos: pos + 1 };
}

function parseNumericLiteral(raw: string): number {
  if (raw.startsWith("0x") || raw.startsWith("0X")) {
    return parseInt(raw, 16);
  }
  if (raw.includes(".")) {
    return parseFloat(raw);
  }
  return parseInt(raw, 10);
}

const DEFINE_PATTERN =
  /^[ \t]*#\s*define\s+([A-Z_][A-Z0-9_]*)\s+(.+)$/;

/**
 * Extracts `#define` constants and `enum` definitions from C source text.
 *
 * Processes `#define NAME VALUE` lines where `NAME` is an uppercase identifier,
 * and `enum { ... }` blocks (both anonymous and typedef'd).
 *
 * @param source The C source text to parse.
 * @param _fileName The file name (reserved for diagnostics).
 * @returns A {@linkcode ConstantExtractionResult} with defines and enums.
 *
 * @example Extract defines and enums
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { extractConstants } from "./constant-extractor.ts";
 *
 * const source = '#define MY_FLAG (1<<2)\nenum { A, B, C };';
 * const result = extractConstants(source, "test.h");
 * assertEquals(result.defines.length, 1);
 * assertEquals(result.defines[0].name, "MY_FLAG");
 * assertEquals(result.defines[0].value, 4);
 * assertEquals(result.enums.length, 1);
 * assertEquals(result.enums[0].variants.length, 3);
 * assertEquals(result.enums[0].variants[2].value, 2);
 * ```
 */
export function extractConstants(
  source: string,
  _fileName: string,
): ConstantExtractionResult {
  const defines = extractDefines(source);
  const enums = extractEnums(source);
  return { defines, enums };
}

function extractDefines(source: string): ConstantDef[] {
  const defines: ConstantDef[] = [];
  // Remove block comments to avoid matching inside them
  const cleaned = removeBlockComments(source);

  for (const line of cleaned.split("\n")) {
    const trimmed = line.trim();
    // Skip commented-out lines
    if (trimmed.startsWith("//")) continue;

    const match = trimmed.match(DEFINE_PATTERN);
    if (!match) continue;

    const name = match[1];
    let rawValue = match[2].trim();

    // Strip inline comments from the raw value
    rawValue = stripInlineComment(rawValue);

    // Skip include guards and macros
    if (rawValue === "" || rawValue.startsWith("(") && rawValue.includes(",")) {
      continue;
    }

    // String define
    if (rawValue.startsWith('"') && rawValue.endsWith('"')) {
      defines.push({
        name,
        rawValue,
        value: rawValue.slice(1, -1),
      });
      continue;
    }

    // Try to evaluate as numeric expression
    const evaluated = evaluateExpression(rawValue);
    if (!isNaN(evaluated)) {
      defines.push({ name, rawValue, value: evaluated });
      continue;
    }

    // Keep as string if we can't evaluate
    defines.push({ name, rawValue, value: rawValue });
  }

  return defines;
}

function removeBlockComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "");
}

function stripInlineComment(value: string): string {
  // Don't strip inside quoted strings
  if (value.startsWith('"')) return value;

  // Find // that isn't inside the expression
  const commentIdx = value.indexOf("//");
  if (commentIdx >= 0) {
    return value.slice(0, commentIdx).trim();
  }

  // Also strip trailing C-style /* comments
  const blockIdx = value.indexOf("/*");
  if (blockIdx >= 0) {
    return value.slice(0, blockIdx).trim();
  }

  return value;
}

const ENUM_BLOCK_RE =
  /(?:typedef\s+)?enum\s*(?:(\w+)\s*)?\{([^}]*)\}\s*(\w+)?\s*;/g;

function extractEnums(source: string): EnumDef[] {
  const enums: EnumDef[] = [];
  // Remove block comments but preserve line structure
  const cleaned = removeBlockComments(source);

  for (const match of cleaned.matchAll(ENUM_BLOCK_RE)) {
    const preIdentifier = match[1] ?? null;
    const body = match[2];
    const postIdentifier = match[3] ?? null;
    const name = postIdentifier ?? preIdentifier;

    const variants = parseEnumBody(body);
    enums.push({ name, variants });
  }

  return enums;
}

function parseEnumBody(
  body: string,
): { name: string; value: number }[] {
  const variants: { name: string; value: number }[] = [];
  let nextValue = 0;

  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    // Skip empty lines, comments-only lines
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("/*")) {
      continue;
    }

    // Remove inline comments
    const withoutComment = trimmed.replace(/\/\/.*$/, "").replace(
      /\/\*.*?\*\//g,
      "",
    ).trim();
    if (!withoutComment) continue;

    // Match enum entries: possibly multiple on same line separated by commas
    // but in practice each entry is on its own line
    for (const segment of withoutComment.split(",")) {
      const entry = segment.trim();
      if (!entry) continue;

      // Match: NAME = VALUE or just NAME
      const assignMatch = entry.match(
        /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/,
      );
      if (assignMatch) {
        const entryName = assignMatch[1];
        const rawVal = assignMatch[2].trim();
        const evaluated = evaluateExpression(rawVal);
        if (!isNaN(evaluated)) {
          nextValue = evaluated;
        }
        variants.push({ name: entryName, value: nextValue });
        nextValue = nextValue + 1;
      } else {
        const nameMatch = entry.match(/^([A-Za-z_][A-Za-z0-9_]*)$/);
        if (nameMatch) {
          variants.push({ name: nameMatch[1], value: nextValue });
          nextValue = nextValue + 1;
        }
      }
    }
  }

  return variants;
}

/**
 * Extracts constants from multiple C header files and merges the results.
 *
 * @param files An array of `{ name, content }` objects for each header file.
 * @returns A merged {@linkcode ConstantExtractionResult} containing all defines
 *   and enums from all files.
 *
 * @example Extract from multiple files
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { extractAllConstants } from "./constant-extractor.ts";
 *
 * const result = extractAllConstants([
 *   { name: "a.h", content: "#define A_VAL 1" },
 *   { name: "b.h", content: "#define B_VAL 2" },
 * ]);
 * assertEquals(result.defines.length, 2);
 * assertEquals(result.defines[0].name, "A_VAL");
 * assertEquals(result.defines[1].name, "B_VAL");
 * ```
 */
export function extractAllConstants(
  files: { name: string; content: string }[],
): ConstantExtractionResult {
  const allDefines: ConstantDef[] = [];
  const allEnums: EnumDef[] = [];

  for (const file of files) {
    const result = extractConstants(file.content, file.name);
    allDefines.push(...result.defines);
    allEnums.push(...result.enums);
  }

  return { defines: allDefines, enums: allEnums };
}
