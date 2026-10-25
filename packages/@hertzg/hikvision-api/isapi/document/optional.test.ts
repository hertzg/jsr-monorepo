import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { test } from "node:test";
import { optional } from "./optional.ts";
import { text } from "./text.ts";

test("optional marks the field and keeps its decode", () => {
  const field = optional(text());

  assertEquals(field.optional, true);
  assertEquals(field.decode(parse("<a>x</a>").root), "x");
});
