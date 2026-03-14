import { assertEquals, assertThrows } from "@std/assert";
import { buildManifest, parseLatestBranch, parseVersion } from "./vendor.ts";

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
  const headers = ["homebank.h", "hb-types.h", "enums.h"];
  const includeTree = {
    "homebank.h": ["hb-types.h", "enums.h"],
    "hb-types.h": [],
    "enums.h": [],
  };

  const manifest = buildManifest("5.10", headers, includeTree);

  assertEquals(manifest.version, "5.10");
  assertEquals(manifest.xmlSource, "hb-xml.c");
  assertEquals(manifest.headers, headers);
  assertEquals(manifest.includeTree, includeTree);
});

Deno.test("buildManifest always sets xmlSource to hb-xml.c", () => {
  const manifest = buildManifest("1.0", [], {});
  assertEquals(manifest.xmlSource, "hb-xml.c");
});

Deno.test("parseLatestBranch picks the highest version", () => {
  const output = [
    "aaa1111\trefs/heads/5.6.x",
    "bbb2222\trefs/heads/5.10.x",
    "ccc3333\trefs/heads/5.9.x",
    "ddd4444\trefs/heads/5.8.x",
  ].join("\n");
  assertEquals(parseLatestBranch(output), "5.10.x");
});

Deno.test("parseLatestBranch ignores non-release branches", () => {
  const output = [
    "aaa1111\trefs/heads/master",
    "bbb2222\trefs/heads/5.10.x",
    "ccc3333\trefs/heads/feature/foo",
    "ddd4444\trefs/heads/5.9.x",
  ].join("\n");
  assertEquals(parseLatestBranch(output), "5.10.x");
});

Deno.test("parseLatestBranch throws when no release branches exist", () => {
  assertThrows(
    () => parseLatestBranch("aaa1111\trefs/heads/master"),
    Error,
    "No release branches found",
  );
});

Deno.test("parseLatestBranch handles single branch", () => {
  assertEquals(
    parseLatestBranch("aaa1111\trefs/heads/4.0.x"),
    "4.0.x",
  );
});
