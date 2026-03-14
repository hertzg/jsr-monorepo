/**
 * Generic C structural extractor using tree-sitter.
 *
 * Parses C source into an AST and serializes structural elements
 * (preprocessor defines, enums, function call sites) into a JSON
 * manifest. Intentionally domain-agnostic — all HomeBank-specific
 * interpretation happens downstream.
 *
 * @module
 */

import type Parser from "web-tree-sitter";
import { createCParser, type SyntaxNode } from "./parser.ts";

// ── Types ────────────────────────────────────────────────────────────

/** A preprocessor `#define` constant with its evaluated value. */
export interface DefineConstant {
  name: string;
  expression: string;
  evaluatedValue: number | string;
}

/** A single enum member with its computed integer value. */
export interface EnumMember {
  name: string;
  value: number;
}

/** An enum definition with optional name and members. */
export interface EnumDefinition {
  name: string | null;
  members: EnumMember[];
}

/** Extracted structural data from a single header file. */
export interface HeaderExtraction {
  defines: DefineConstant[];
  enums: EnumDefinition[];
}

/** A function call found inside a function body. */
export interface CallSite {
  calledFunction: string;
  stringLiteralArgs: string[];
  identifierArgs: string[];
  guardCondition: string | null;
}

/** Extracted data from a function definition. */
export interface FunctionExtraction {
  callSites: CallSite[];
}

/** The complete extraction manifest. */
export interface ExtractionManifest {
  headers: Record<string, HeaderExtraction>;
  functions: Record<string, FunctionExtraction>;
}

// ── AST utilities ────────────────────────────────────────────────────

function children(node: SyntaxNode): SyntaxNode[] {
  const result: SyntaxNode[] = [];
  for (let i = 0; i < node.childCount; i++) {
    result.push(node.child(i)!);
  }
  return result;
}

function field(node: SyntaxNode, name: string): SyntaxNode | null {
  return node.childForFieldName(name);
}

const PREPROC_CONTAINERS = new Set([
  "preproc_ifdef",
  "preproc_if",
  "preproc_elif",
  "preproc_else",
]);

const UPPERCASE_DEFINE = /^[A-Z_][A-Z0-9_]*$/;

// ── Constant expression evaluator ────────────────────────────────────

const BINARY_OPS: Record<string, (a: number, b: number) => number> = {
  "+": (a, b) => a + b,
  "-": (a, b) => a - b,
  "*": (a, b) => a * b,
  "/": (a, b) => b !== 0 ? (a / b) | 0 : NaN,
  "<<": (a, b) => a << b,
  ">>": (a, b) => a >> b,
  "|": (a, b) => a | b,
  "&": (a, b) => a & b,
  "^": (a, b) => a ^ b,
};

function evaluateConstantExpression(node: SyntaxNode): number {
  switch (node.type) {
    case "number_literal": {
      const text = node.text;
      if (text.startsWith("0x") || text.startsWith("0X")) {
        return parseInt(text, 16);
      }
      return text.includes(".") ? parseFloat(text) : parseInt(text, 10);
    }
    case "parenthesized_expression":
      return node.child(1)
        ? evaluateConstantExpression(node.child(1)!)
        : NaN;
    case "unary_expression": {
      const arg = field(node, "argument");
      if (!arg) return NaN;
      const val = evaluateConstantExpression(arg);
      switch (field(node, "operator")?.text) {
        case "-": return -val;
        case "~": return ~val;
        default: return NaN;
      }
    }
    case "binary_expression": {
      const left = field(node, "left");
      const right = field(node, "right");
      if (!left || !right) return NaN;
      const op = field(node, "operator")?.text ?? node.child(1)?.text;
      const fn = op ? BINARY_OPS[op] : undefined;
      return fn
        ? fn(evaluateConstantExpression(left), evaluateConstantExpression(right))
        : NaN;
    }
    default:
      return NaN;
  }
}

// ── Define extraction ────────────────────────────────────────────────

function isStringLiteral(value: string): boolean {
  return value.startsWith('"') && value.endsWith('"');
}

function isFunctionLikeMacro(value: string): boolean {
  return value.startsWith("(") && value.includes(",");
}

function tryEvaluateDefineValue(
  parser: Parser,
  expression: string,
): number | null {
  const tree = parser.parse(`int _x = ${expression};`);
  const valueNode = field(
    field(tree.rootNode.child(0)!, "declarator")!,
    "value",
  );
  if (!valueNode) return null;
  const result = evaluateConstantExpression(valueNode);
  return isNaN(result) ? null : result;
}

function extractDefines(
  parser: Parser,
  root: SyntaxNode,
): DefineConstant[] {
  const defines: DefineConstant[] = [];

  function visit(node: SyntaxNode): void {
    for (const child of children(node)) {
      if (PREPROC_CONTAINERS.has(child.type)) {
        visit(child);
        continue;
      }
      if (child.type !== "preproc_def") continue;

      const name = field(child, "name")?.text;
      if (!name || !UPPERCASE_DEFINE.test(name)) continue;

      const expression = field(child, "value")?.text.trim();
      if (!expression || isFunctionLikeMacro(expression)) continue;

      if (isStringLiteral(expression)) {
        defines.push({
          name,
          expression,
          evaluatedValue: expression.slice(1, -1),
        });
        continue;
      }

      const numericValue = tryEvaluateDefineValue(parser, expression);
      defines.push({
        name,
        expression,
        evaluatedValue: numericValue ?? expression,
      });
    }
  }

  visit(root);
  return defines;
}

// ── Enum extraction ──────────────────────────────────────────────────

function resolveEnumName(node: SyntaxNode): string | null {
  const explicit = field(node, "name")?.text;
  if (explicit) return explicit;

  if (node.parent?.type === "type_definition") {
    const declarator = field(node.parent, "declarator");
    if (declarator?.type === "type_identifier") return declarator.text;
  }
  return null;
}

function extractEnumMembers(bodyNode: SyntaxNode): EnumMember[] {
  const members: EnumMember[] = [];
  let nextValue = 0;

  for (const child of children(bodyNode)) {
    if (child.type !== "enumerator") continue;
    const name = field(child, "name")?.text;
    if (!name) continue;

    const explicitValue = field(child, "value");
    if (explicitValue) {
      const evaluated = evaluateConstantExpression(explicitValue);
      if (!isNaN(evaluated)) nextValue = evaluated;
    }

    members.push({ name, value: nextValue });
    nextValue++;
  }
  return members;
}

function extractEnums(root: SyntaxNode): EnumDefinition[] {
  const enums: EnumDefinition[] = [];

  function visit(node: SyntaxNode): void {
    if (node.type === "enum_specifier") {
      const body = field(node, "body");
      if (body) {
        enums.push({
          name: resolveEnumName(node),
          members: extractEnumMembers(body),
        });
      }
      return;
    }
    for (const child of children(node)) visit(child);
  }

  visit(root);
  return enums;
}

// ── Call site extraction ─────────────────────────────────────────────

function parseCallArguments(
  argsNode: SyntaxNode,
): { stringLiteralArgs: string[]; identifierArgs: string[] } {
  const stringLiteralArgs: string[] = [];
  const identifierArgs: string[] = [];
  for (const arg of children(argsNode)) {
    if (arg.type === "string_literal") {
      stringLiteralArgs.push(arg.text.slice(1, -1));
    } else if (arg.type === "identifier") {
      identifierArgs.push(arg.text);
    }
  }
  return { stringLiteralArgs, identifierArgs };
}

function findNearestGuardCondition(ancestors: SyntaxNode[]): string | null {
  for (let i = ancestors.length - 1; i >= 0; i--) {
    if (ancestors[i].type !== "if_statement") continue;
    const condition = field(ancestors[i], "condition");
    if (condition) return condition.text;
  }
  return null;
}

function extractCallSites(body: SyntaxNode): CallSite[] {
  const sites: CallSite[] = [];

  function visit(node: SyntaxNode, ancestors: SyntaxNode[]): void {
    if (node.type === "call_expression") {
      const calledFunction = field(node, "function")?.text;
      if (calledFunction) {
        const argsNode = field(node, "arguments");
        const { stringLiteralArgs, identifierArgs } = argsNode
          ? parseCallArguments(argsNode)
          : { stringLiteralArgs: [], identifierArgs: [] };

        sites.push({
          calledFunction,
          stringLiteralArgs,
          identifierArgs,
          guardCondition: findNearestGuardCondition(ancestors),
        });
      }
    }
    const nextAncestors = [...ancestors, node];
    for (const child of children(node)) {
      visit(child, nextAncestors);
    }
  }

  visit(body, []);
  return sites;
}

// ── Function name resolution ─────────────────────────────────────────

function resolveFunctionName(node: SyntaxNode): string | null {
  let current: SyntaxNode | null = field(node, "declarator");
  while (current) {
    if (current.type === "function_declarator") {
      return field(current, "declarator")?.text ?? null;
    }
    if (current.type === "pointer_declarator") {
      current = field(current, "declarator");
      continue;
    }
    current = children(current).find((c) =>
      c.type === "function_declarator" || c.type === "pointer_declarator"
    ) ?? null;
  }
  return null;
}

// ── Main extraction ──────────────────────────────────────────────────

function extractHeader(parser: Parser, source: string): HeaderExtraction {
  const tree = parser.parse(source);
  return {
    defines: extractDefines(parser, tree.rootNode),
    enums: extractEnums(tree.rootNode),
  };
}

function extractFunctions(
  tree: Parser.Tree,
): Record<string, FunctionExtraction> {
  const functions: Record<string, FunctionExtraction> = {};
  for (const node of children(tree.rootNode)) {
    if (node.type !== "function_definition") continue;
    const name = resolveFunctionName(node);
    const body = field(node, "body");
    if (name && body) {
      functions[name] = { callSites: extractCallSites(body) };
    }
  }
  return functions;
}

/**
 * Extract structural data from vendored C source files.
 *
 * Parses all header files for defines and enums, and the main C source
 * for function definitions with their call sites.
 *
 * @param vendorDir Path to the vendored C source directory.
 * @returns The extraction manifest.
 */
export async function extract(vendorDir: string): Promise<ExtractionManifest> {
  const parser = await createCParser();
  const manifest = JSON.parse(
    await Deno.readTextFile(`${vendorDir}/manifest.json`),
  );

  const headerNames = Object.keys(manifest.includeTree) as string[];
  const headerEntries = await Promise.all(
    headerNames.map(async (name) => {
      const source = await Deno.readTextFile(`${vendorDir}/${name}`);
      return [name, extractHeader(parser, source)] as const;
    }),
  );

  const xmlSource = await Deno.readTextFile(
    `${vendorDir}/${manifest.xmlSource}`,
  );

  return {
    headers: Object.fromEntries(headerEntries),
    functions: extractFunctions(parser.parse(xmlSource)),
  };
}

if (import.meta.main) {
  const vendorDir = new URL("./vendor/homebank", import.meta.url).pathname;
  const outputPath = new URL("./extracted.json", import.meta.url).pathname;

  const manifest = await extract(vendorDir);
  await Deno.writeTextFile(
    outputPath,
    JSON.stringify(manifest, null, 2) + "\n",
  );
  console.log(`Wrote ${outputPath}`);
}
