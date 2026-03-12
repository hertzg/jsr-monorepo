/**
 * Parses `#include "..."` directives in C header files and traces the
 * dependency tree. Only quoted local includes are resolved; system includes
 * (angle-bracket) are ignored.
 *
 * @module
 */

/**
 * Result of resolving includes from an entry file.
 */
export interface IncludeResolution {
  /** All resolved file names, deduplicated and sorted alphabetically. */
  files: string[];
  /** Map from each file to the files it directly includes. */
  includeTree: Record<string, string[]>;
}

/** Options for {@linkcode resolveIncludes}. */
export interface ResolveIncludesOptions {
  /** Maximum recursion depth. Defaults to 10. */
  maxDepth?: number;
}

const INCLUDE_PATTERN = /^\s*#\s*include\s+"([^"]+)"/;

/**
 * Extracts local `#include "..."` directives from C source text.
 *
 * Only quoted includes are returned; angle-bracket system includes are ignored.
 * Commented-out includes (prefixed with `//`) are also ignored.
 *
 * @param source The C source text to parse.
 * @returns An array of included file names.
 *
 * @example Extract includes from C source
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseIncludes } from "./include-resolver.ts";
 *
 * const source = '#include "foo.h"\n#include <stdio.h>\n#include "bar.h"';
 * assertEquals(parseIncludes(source), ["foo.h", "bar.h"]);
 * ```
 */
export function parseIncludes(source: string): string[] {
  const includes: string[] = [];
  for (const line of source.split("\n")) {
    const trimmed = line.trim();
    // Skip commented-out includes
    if (trimmed.startsWith("//")) continue;
    const match = trimmed.match(INCLUDE_PATTERN);
    if (match) {
      includes.push(match[1]);
    }
  }
  return includes;
}

/**
 * Recursively resolves all local `#include "..."` directives starting from an
 * entry file. Handles cycles gracefully and limits recursion depth.
 *
 * @param entryFile The entry file name to start resolution from.
 * @param readFile A callback that returns the contents of a file given its name.
 *   This makes the resolver testable without filesystem access.
 * @param options Optional configuration including max recursion depth.
 * @returns An {@linkcode IncludeResolution} with deduplicated sorted file list
 *   and include tree.
 *
 * @example Resolve a simple include tree
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { resolveIncludes } from "./include-resolver.ts";
 *
 * const files: Record<string, string> = {
 *   "a.h": '#include "b.h"',
 *   "b.h": "",
 * };
 * const result = resolveIncludes("a.h", (name) => files[name]);
 * assertEquals(result.files, ["a.h", "b.h"]);
 * assertEquals(result.includeTree, { "a.h": ["b.h"], "b.h": [] });
 * ```
 */
export function resolveIncludes(
  entryFile: string,
  readFile: (path: string) => string,
  options?: ResolveIncludesOptions,
): IncludeResolution {
  const maxDepth = options?.maxDepth ?? 10;
  const visited = new Set<string>();
  const includeTree: Record<string, string[]> = {};

  function visit(file: string, depth: number): void {
    if (visited.has(file)) return;
    if (depth > maxDepth) return;

    visited.add(file);
    const source = readFile(file);
    const includes = parseIncludes(source);
    includeTree[file] = includes;

    for (const inc of includes) {
      visit(inc, depth + 1);
    }
  }

  visit(entryFile, 0);

  const files = [...visited].sort();
  return { files, includeTree };
}
