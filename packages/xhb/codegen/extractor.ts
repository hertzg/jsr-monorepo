/**
 * Extracts raw structural data from C source files using tree-sitter.
 *
 * This module is intentionally generic — it knows nothing about HomeBank
 * semantics. It parses C source into an AST via tree-sitter, then
 * serializes the relevant structural elements (defines, enums, function
 * call sites) into a JSON manifest. All domain-specific interpretation
 * happens downstream.
 *
 * @module
 */

import type Parser from "web-tree-sitter";
import { createCParser, type SyntaxNode } from "./parser.ts";

// ── Manifest types ──────────────────────────────────────────────────

/** A `#define` constant. Value is evaluated where possible. */
export interface RawDefine {
  name: string;
  rawValue: string;
  value: number | string;
}

/** An enum variant with its computed integer value. */
export interface RawEnumVariant {
  name: string;
  value: number;
}

/** An enum definition. */
export interface RawEnum {
  name: string | null;
  variants: RawEnumVariant[];
}

/** Extraction result for a single header file. */
export interface RawHeaderFile {
  defines: RawDefine[];
  enums: RawEnum[];
}

/**
 * A call expression found inside a function body.
 *
 * Captures the called function name, string literal arguments, and
 * any enclosing if-statement guard condition text.
 */
export interface RawCallSite {
  /** The function being called. */
  fn: string;
  /** String literal arguments (quotes stripped), in order. */
  stringArgs: string[];
  /** All identifier arguments, in order. */
  identifierArgs: string[];
  /** If-statement condition text when the call is guarded, or null. */
  guard: string | null;
}

/**
 * A function definition's extracted structural data.
 */
export interface RawFunction {
  /** All call expressions found in the body, in source order. */
  callSites: RawCallSite[];
}

/** The complete extraction manifest. */
export interface ExtractionManifest {
  headers: Record<string, RawHeaderFile>;
  functions: Record<string, RawFunction>;
}

// ── AST helpers ─────────────────────────────────────────────────────

function extractFunctionName(node: SyntaxNode): string | null {
  const declarator = node.childForFieldName("declarator");
  if (!declarator) return null;
  let current: SyntaxNode | null = declarator;
  while (current) {
    if (current.type === "function_declarator") {
      return current.childForFieldName("declarator")?.text ?? null;
    }
    if (current.type === "pointer_declarator") {
      current = current.childForFieldName("declarator");
      continue;
    }
    let found: SyntaxNode | null = null;
    for (let i = 0; i < current.childCount; i++) {
      const child = current.child(i)!;
      if (
        child.type === "function_declarator" ||
        child.type === "pointer_declarator"
      ) {
        found = child;
        break;
      }
    }
    current = found;
  }
  return null;
}

function evaluateNode(node: SyntaxNode): number {
  switch (node.type) {
    case "number_literal": {
      const text = node.text;
      if (text.startsWith("0x") || text.startsWith("0X")) {
        return parseInt(text, 16);
      }
      if (text.includes(".")) return parseFloat(text);
      return parseInt(text, 10);
    }
    case "parenthesized_expression": {
      const inner = node.child(1);
      return inner ? evaluateNode(inner) : NaN;
    }
    case "unary_expression": {
      const op = node.childForFieldName("operator")?.text;
      const arg = node.childForFieldName("argument");
      if (!arg) return NaN;
      const val = evaluateNode(arg);
      if (op === "-") return -val;
      if (op === "~") return ~val;
      return NaN;
    }
    case "binary_expression": {
      const left = node.childForFieldName("left");
      const right = node.childForFieldName("right");
      if (!left || !right) return NaN;
      const lv = evaluateNode(left);
      const rv = evaluateNode(right);
      const op = node.childForFieldName("operator")?.text ??
        node.child(1)?.text;
      switch (op) {
        case "+": return lv + rv;
        case "-": return lv - rv;
        case "*": return lv * rv;
        case "/": return rv !== 0 ? (lv / rv) | 0 : NaN;
        case "<<": return lv << rv;
        case ">>": return lv >> rv;
        case "|": return lv | rv;
        case "&": return lv & rv;
        case "^": return lv ^ rv;
        default: return NaN;
      }
    }
    default:
      return NaN;
  }
}

// ── Header extraction ───────────────────────────────────────────────

function extractDefines(
  parser: Parser,
  root: SyntaxNode,
): RawDefine[] {
  const defines: RawDefine[] = [];

  function collect(node: SyntaxNode): void {
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i)!;
      if (
        child.type === "preproc_ifdef" || child.type === "preproc_if" ||
        child.type === "preproc_elif" || child.type === "preproc_else"
      ) {
        collect(child);
        continue;
      }
      if (child.type !== "preproc_def") continue;
      const nameNode = child.childForFieldName("name");
      if (!nameNode) continue;
      const name = nameNode.text;
      if (!/^[A-Z_][A-Z0-9_]*$/.test(name)) continue;

      const valueNode = child.childForFieldName("value");
      if (!valueNode) continue;
      const rawValue = valueNode.text.trim();
      if (!rawValue) continue;
      if (rawValue.startsWith("(") && rawValue.includes(",")) continue;

      if (rawValue.startsWith('"') && rawValue.endsWith('"')) {
        defines.push({ name, rawValue, value: rawValue.slice(1, -1) });
        continue;
      }

      const tree = parser.parse(`int _x = ${rawValue};`);
      const decl = tree.rootNode.child(0);
      const value = decl?.childForFieldName("declarator")
        ?.childForFieldName("value");
      if (value) {
        const evaluated = evaluateNode(value);
        if (!isNaN(evaluated)) {
          defines.push({ name, rawValue, value: evaluated });
          continue;
        }
      }
      defines.push({ name, rawValue, value: rawValue });
    }
  }

  collect(root);
  return defines;
}

function extractEnums(root: SyntaxNode): RawEnum[] {
  const enums: RawEnum[] = [];

  function collect(node: SyntaxNode): void {
    if (node.type === "enum_specifier") {
      const nameNode = node.childForFieldName("name");
      const bodyNode = node.childForFieldName("body");
      let name = nameNode?.text ?? null;
      if (!name && node.parent?.type === "type_definition") {
        const declarator = node.parent.childForFieldName("declarator");
        if (declarator?.type === "type_identifier") {
          name = declarator.text;
        }
      }
      if (bodyNode) {
        const variants: RawEnumVariant[] = [];
        let nextValue = 0;
        for (let i = 0; i < bodyNode.childCount; i++) {
          const child = bodyNode.child(i)!;
          if (child.type !== "enumerator") continue;
          const vName = child.childForFieldName("name");
          if (!vName) continue;
          const vValue = child.childForFieldName("value");
          if (vValue) {
            const evaluated = evaluateNode(vValue);
            if (!isNaN(evaluated)) nextValue = evaluated;
          }
          variants.push({ name: vName.text, value: nextValue });
          nextValue++;
        }
        enums.push({ name, variants });
      }
      return;
    }
    for (let i = 0; i < node.childCount; i++) {
      collect(node.child(i)!);
    }
  }

  collect(root);
  return enums;
}

function extractHeaderFile(
  parser: Parser,
  source: string,
): RawHeaderFile {
  const tree = parser.parse(source);
  return {
    defines: extractDefines(parser, tree.rootNode),
    enums: extractEnums(tree.rootNode),
  };
}

// ── Function call site extraction ───────────────────────────────────

function extractCallSites(body: SyntaxNode): RawCallSite[] {
  const sites: RawCallSite[] = [];

  function walk(node: SyntaxNode, ancestors: SyntaxNode[]): void {
    if (node.type === "call_expression") {
      const fnNode = node.childForFieldName("function");
      const fn = fnNode?.text;
      if (fn) {
        const args = node.childForFieldName("arguments");
        const stringArgs: string[] = [];
        const identifierArgs: string[] = [];
        if (args) {
          for (let j = 0; j < args.childCount; j++) {
            const arg = args.child(j)!;
            if (arg.type === "string_literal") {
              stringArgs.push(arg.text.slice(1, -1));
            } else if (arg.type === "identifier") {
              identifierArgs.push(arg.text);
            }
          }
        }

        // Find nearest if-statement ancestor guard
        let guard: string | null = null;
        for (let i = ancestors.length - 1; i >= 0; i--) {
          if (ancestors[i].type !== "if_statement") continue;
          const cond = ancestors[i].childForFieldName("condition");
          if (cond) {
            guard = cond.text;
            break;
          }
        }

        sites.push({ fn, stringArgs, identifierArgs, guard });
      }
    }
    for (let i = 0; i < node.childCount; i++) {
      walk(node.child(i)!, [...ancestors, node]);
    }
  }

  walk(body, []);
  return sites;
}

// ── Main extraction ─────────────────────────────────────────────────

/**
 * Extract structural data from vendored C source files.
 *
 * Parses all header files for defines and enums, and the main C source
 * for function definitions with their call sites. Produces a generic
 * manifest with no domain-specific interpretation.
 *
 * @param vendorDir Path to the vendored C source directory.
 * @returns The extraction manifest.
 */
export async function extract(vendorDir: string): Promise<ExtractionManifest> {
  const parser = await createCParser();

  const manifestPath = `${vendorDir}/manifest.json`;
  const manifest = JSON.parse(await Deno.readTextFile(manifestPath));

  // Extract headers
  const headers: Record<string, RawHeaderFile> = {};
  for (const headerName of manifest.headers as string[]) {
    const source = await Deno.readTextFile(`${vendorDir}/${headerName}`);
    headers[headerName] = extractHeaderFile(parser, source);
  }

  // Extract functions from the main C source
  const xmlSource = await Deno.readTextFile(
    `${vendorDir}/${manifest.xmlSource}`,
  );
  const tree = parser.parse(xmlSource);
  const functions: Record<string, RawFunction> = {};

  for (let i = 0; i < tree.rootNode.childCount; i++) {
    const node = tree.rootNode.child(i)!;
    if (node.type !== "function_definition") continue;
    const name = extractFunctionName(node);
    const body = node.childForFieldName("body");
    if (name && body) {
      functions[name] = { callSites: extractCallSites(body) };
    }
  }

  return {
    headers,
    functions,
  };
}

// ── CLI entry point ─────────────────────────────────────────────────

if (import.meta.main) {
  const vendorDir = new URL("./vendor/homebank", import.meta.url).pathname;
  const outputPath = new URL("./extracted.json", import.meta.url).pathname;

  const manifest = await extract(vendorDir);
  const json = JSON.stringify(manifest, null, 2) + "\n";

  await Deno.writeTextFile(outputPath, json);
  console.log(`Wrote ${outputPath}`);
}
