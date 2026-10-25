import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { test } from "node:test";
import { attribute } from "./attribute.ts";

test("attribute reads the attribute as text by default", () => {
  const element = parse('<regionType opt="grid,region">grid</regionType>').root;

  assertEquals(attribute("opt").decode(element), "grid,region");
});

test("attribute converts the attribute", () => {
  const element = parse('<step step="20">x</step>').root;

  assertEquals(attribute("step", Number).decode(element), 20);
});

test("attribute throws when the attribute is missing", () => {
  const element = parse("<regionType>grid</regionType>").root;

  assertThrows(
    () => attribute("opt").decode(element),
    Error,
    "ISAPI <regionType> has no opt attribute",
  );
});
