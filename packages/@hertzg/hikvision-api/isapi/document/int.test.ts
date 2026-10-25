import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { test } from "node:test";
import { int } from "./int.ts";

test("int decodes the element's text as a number", () => {
  assertEquals(int().decode(parse("<channelID>7</channelID>").root), 7);
});

test("int decodes a negative decimal", () => {
  assertEquals(int().decode(parse("<x>-1.5</x>").root), -1.5);
});

test("int throws on non-numeric text and names the element", () => {
  assertThrows(
    () => int().decode(parse("<channelID>seven</channelID>").root),
    Error,
    'ISAPI <channelID> is not a number: "seven"',
  );
});

test("int throws on an empty element", () => {
  assertThrows(() => int().decode(parse("<channelID/>").root), Error);
});
