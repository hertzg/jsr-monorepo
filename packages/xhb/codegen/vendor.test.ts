import { assertEquals, assertThrows } from "@std/assert";
import {
  buildManifest,
  parseHomebankReleaseBranches,
  parseVersion,
} from "./vendor.ts";

Deno.test("parseVersion extracts HB_VERSION from homebank.h content", () => {
  const content = [
    "#define HOMEBANK_MAJOR\t5",
    "#define HOMEBANK_MINOR\t10",
    "#define HOMEBANK_MICRO\t0",
    "",
    '#define HB_VERSION\t\t"5.10"',
  ].join("\n");
  assertEquals(parseVersion(content), "5.10");
});

Deno.test("parseVersion throws when HB_VERSION is missing", () => {
  assertThrows(
    () => parseVersion("#define SOMETHING_ELSE 42"),
    Error,
    "Could not find HB_VERSION",
  );
});

Deno.test("parseVersion handles different version formats", () => {
  assertEquals(parseVersion('#define HB_VERSION "1.2.3"'), "1.2.3");
  assertEquals(parseVersion('#define HB_VERSION "0.1"'), "0.1");
});

Deno.test("buildManifest produces correct manifest structure", () => {
  const includeTree = {
    "homebank.h": ["hb-types.h", "enums.h"],
    "hb-types.h": [],
    "enums.h": [],
  };

  const manifest = buildManifest("5.10", includeTree);

  assertEquals(manifest.version, "5.10");
  assertEquals(manifest.xmlSource, "hb-xml.c");
  assertEquals(manifest.includeTree, includeTree);
});

Deno.test("buildManifest always sets xmlSource to hb-xml.c", () => {
  const manifest = buildManifest("1.0", {});
  assertEquals(manifest.xmlSource, "hb-xml.c");
});

Deno.test("parseHomebankReleaseBranches sorts by version ascending", () => {
  // deno-fmt-ignore
  const output = [
    ["aaa1111", "refs/heads/5.6.x" ],
    ["bbb2222", "refs/heads/5.10.x"],
    ["ccc3333", "refs/heads/5.9.x" ],
    ["ddd4444", "refs/heads/5.8.x" ],
  ].map((r) => r.join("\t")).join("\n");
  assertEquals(parseHomebankReleaseBranches(output), [
    "5.6.x",
    "5.8.x",
    "5.9.x",
    "5.10.x",
  ]);
});

Deno.test("parseHomebankReleaseBranches ignores non-release branches", () => {
  // deno-fmt-ignore
  const output = [
    ["aaa1111", "refs/heads/master"     ],
    ["bbb2222", "refs/heads/5.10.x"     ],
    ["ccc3333", "refs/heads/feature/foo"],
    ["ddd4444", "refs/heads/5.9.x"      ],
  ].map((r) => r.join("\t")).join("\n");
  assertEquals(parseHomebankReleaseBranches(output), ["5.9.x", "5.10.x"]);
});

Deno.test("parseHomebankReleaseBranches returns empty for no release branches", () => {
  // deno-fmt-ignore
  const output = [
    ["aaa1111", "refs/heads/master"],
  ].map((r) => r.join("\t")).join("\n");
  assertEquals(parseHomebankReleaseBranches(output), []);
});

Deno.test("parseHomebankReleaseBranches handles single branch", () => {
  // deno-fmt-ignore
  const output = [
    ["aaa1111", "refs/heads/4.0.x"],
  ].map((r) => r.join("\t")).join("\n");
  assertEquals(parseHomebankReleaseBranches(output), ["4.0.x"]);
});
