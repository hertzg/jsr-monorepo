import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { test } from "node:test";
import { text } from "./text.ts";

test("text decodes the element's text as is", () => {
  assertEquals(
    text().decode(parse("<model> DS-7608NI-Q2/8P </model>").root),
    " DS-7608NI-Q2/8P ",
  );
});
