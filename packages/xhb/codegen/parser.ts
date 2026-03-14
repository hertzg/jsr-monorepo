/**
 * Shared tree-sitter initialization for C source parsing.
 *
 * Provides a pre-configured parser loaded with the vendored tree-sitter-c
 * WASM grammar. Used by the constant and entity extractors.
 *
 * @module
 */

import Parser from "web-tree-sitter";
import { resolve } from "node:path";
import { dirname, fromFileUrl } from "@std/path";

const GRAMMAR_PATH = resolve(
  dirname(fromFileUrl(import.meta.url)),
  "vendor/tree-sitter-c.wasm",
);

let initialized = false;

/**
 * Create a tree-sitter parser configured with the C grammar.
 *
 * Initializes the WASM runtime on first call and loads the vendored
 * `tree-sitter-c.wasm` grammar. Subsequent calls reuse the runtime
 * but return a fresh parser instance.
 *
 * @returns A ready-to-use tree-sitter `Parser` for C source code.
 */
export async function createCParser(): Promise<Parser> {
  if (!initialized) {
    await Parser.init();
    initialized = true;
  }
  const parser = new Parser();
  const C = await Parser.Language.load(GRAMMAR_PATH);
  parser.setLanguage(C);
  return parser;
}

/**
 * A tree-sitter syntax node.
 *
 * Re-exported for use in extractor modules without requiring a direct
 * dependency on `web-tree-sitter` types.
 */
export type SyntaxNode = Parser.SyntaxNode;
