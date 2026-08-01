import { assertEquals } from "@std/assert";
import { parse } from "./mod.ts";
import { serializeVersions } from "./versions.ts";

Deno.test("the <homebank> root carries the file format version and the app data version", () => {
  const xml = [
    '<?xml version="1.0"?>',
    '<homebank v="1.3999999999999999" d="050402">',
    "</homebank>",
    "",
  ].join("\n");

  // `v` is a C double written at full precision, so it is kept as text
  // (ADR 0002). `d` is the HomeBank release that wrote the file, here 5.4.2.
  assertEquals(parse(xml).versions, {
    file: "1.3999999999999999",
    data: 50402,
  });
});

Deno.test("the data version is written back zero-padded to six digits", () => {
  // 50402 must not come back out as d="50402" — this is the one place where
  // a number is reformatted on the way out (ADR 0001).
  assertEquals(
    serializeVersions({ file: "1.3999999999999999", data: 50402 }),
    '<homebank v="1.3999999999999999" d="050402">',
  );
});
