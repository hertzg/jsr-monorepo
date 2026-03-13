import { assertEquals } from "@std/assert";
import {
  parseIncludes,
  resolveIncludes,
} from "./include-resolver.ts";

Deno.test("parseIncludes extracts quoted local includes", () => {
  const source = [
    '#include "foo.h"',
    '#include "bar.h"',
  ].join("\n");
  assertEquals(parseIncludes(source), ["foo.h", "bar.h"]);
});

Deno.test("parseIncludes ignores system includes", () => {
  const source = [
    "#include <stdio.h>",
    "#include <glib.h>",
    '#include "local.h"',
  ].join("\n");
  assertEquals(parseIncludes(source), ["local.h"]);
});

Deno.test("parseIncludes ignores commented-out includes", () => {
  const source = [
    '//#include "commented.h"',
    '// #include "also-commented.h"',
    '#include "active.h"',
  ].join("\n");
  assertEquals(parseIncludes(source), ["active.h"]);
});

Deno.test("parseIncludes handles mixed includes", () => {
  const source = [
    "#include <errno.h>",
    '#include "hb-types.h"',
    "#include <glib.h>",
    '#include "enums.h"',
  ].join("\n");
  assertEquals(parseIncludes(source), ["hb-types.h", "enums.h"]);
});

Deno.test("parseIncludes handles empty source", () => {
  assertEquals(parseIncludes(""), []);
});

Deno.test("resolveIncludes resolves a simple single include", () => {
  const files: Record<string, string> = {
    "a.h": '#include "b.h"',
    "b.h": "// no includes",
  };
  const result = resolveIncludes("a.h", (name) => files[name]);
  assertEquals(result.files, ["a.h", "b.h"]);
  assertEquals(result.includeTree, {
    "a.h": ["b.h"],
    "b.h": [],
  });
});

Deno.test("resolveIncludes resolves transitive includes", () => {
  const files: Record<string, string> = {
    "a.h": '#include "b.h"',
    "b.h": '#include "c.h"',
    "c.h": "// leaf",
  };
  const result = resolveIncludes("a.h", (name) => files[name]);
  assertEquals(result.files, ["a.h", "b.h", "c.h"]);
  assertEquals(result.includeTree, {
    "a.h": ["b.h"],
    "b.h": ["c.h"],
    "c.h": [],
  });
});

Deno.test("resolveIncludes deduplicates files included from multiple parents", () => {
  const files: Record<string, string> = {
    "a.h": '#include "b.h"\n#include "c.h"',
    "b.h": '#include "c.h"',
    "c.h": "// leaf",
  };
  const result = resolveIncludes("a.h", (name) => files[name]);
  assertEquals(result.files, ["a.h", "b.h", "c.h"]);
  assertEquals(result.includeTree["a.h"], ["b.h", "c.h"]);
  assertEquals(result.includeTree["b.h"], ["c.h"]);
  assertEquals(result.includeTree["c.h"], []);
});

Deno.test("resolveIncludes handles cycles gracefully", () => {
  const files: Record<string, string> = {
    "a.h": '#include "b.h"',
    "b.h": '#include "a.h"',
  };
  const result = resolveIncludes("a.h", (name) => files[name]);
  assertEquals(result.files, ["a.h", "b.h"]);
  assertEquals(result.includeTree["a.h"], ["b.h"]);
  assertEquals(result.includeTree["b.h"], ["a.h"]);
});

Deno.test("resolveIncludes respects max depth", () => {
  const files: Record<string, string> = {
    "d0.h": '#include "d1.h"',
    "d1.h": '#include "d2.h"',
    "d2.h": '#include "d3.h"',
    "d3.h": "// leaf",
  };
  const result = resolveIncludes("d0.h", (name) => files[name], {
    maxDepth: 2,
  });
  // d0 at depth 0, d1 at depth 1, d2 at depth 2, d3 at depth 3 (exceeds max)
  assertEquals(result.files, ["d0.h", "d1.h", "d2.h"]);
  assertEquals(result.includeTree["d0.h"], ["d1.h"]);
  assertEquals(result.includeTree["d1.h"], ["d2.h"]);
  assertEquals(result.includeTree["d2.h"], ["d3.h"]);
  // d3 not visited
  assertEquals(result.includeTree["d3.h"], undefined);
});

Deno.test("resolveIncludes returns sorted file list", () => {
  const files: Record<string, string> = {
    "z.h": '#include "a.h"\n#include "m.h"',
    "a.h": "",
    "m.h": "",
  };
  const result = resolveIncludes("z.h", (name) => files[name]);
  assertEquals(result.files, ["a.h", "m.h", "z.h"]);
});

Deno.test("resolveIncludes include tree correctness with diamond dependency", () => {
  // Diamond: a -> b, c; b -> d; c -> d
  const files: Record<string, string> = {
    "a.h": '#include "b.h"\n#include "c.h"',
    "b.h": '#include "d.h"',
    "c.h": '#include "d.h"',
    "d.h": "",
  };
  const result = resolveIncludes("a.h", (name) => files[name]);
  assertEquals(result.files, ["a.h", "b.h", "c.h", "d.h"]);
  assertEquals(result.includeTree, {
    "a.h": ["b.h", "c.h"],
    "b.h": ["d.h"],
    "c.h": ["d.h"],
    "d.h": [],
  });
});
