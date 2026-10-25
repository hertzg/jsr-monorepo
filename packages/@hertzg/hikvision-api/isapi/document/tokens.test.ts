import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { test } from "node:test";
import { tokens } from "./tokens.ts";

test("tokens splits the element's text on commas into trimmed items", () => {
  assertEquals(
    tokens().decode(parse("<targetType>human, vehicle,</targetType>").root),
    ["human", "vehicle"],
  );
});

test("tokens decodes an empty element as no items", () => {
  assertEquals(tokens().decode(parse("<targetType/>").root), []);
});
