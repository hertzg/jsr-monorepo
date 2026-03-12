import { assertEquals, assertThrows } from "@std/assert";
import { buildManifest, parseVersion } from "./vendor.ts";

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

  const manifest = buildManifest(
    "5.10",
    "abc1234",
    "2026-03-12",
    headers,
    includeTree,
  );

  assertEquals(manifest.version, "5.10");
  assertEquals(manifest.commit, "abc1234");
  assertEquals(manifest.date, "2026-03-12");
  assertEquals(manifest.xmlSource, "hb-xml.c");
  assertEquals(manifest.headers, headers);
  assertEquals(manifest.includeTree, includeTree);
});

Deno.test("buildManifest always sets xmlSource to hb-xml.c", () => {
  const manifest = buildManifest("1.0", "def5678", "2025-01-01", [], {});
  assertEquals(manifest.xmlSource, "hb-xml.c");
});
