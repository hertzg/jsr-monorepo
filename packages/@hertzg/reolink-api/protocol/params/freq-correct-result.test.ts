import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { freqCorrectResult } from "./freq-correct-result.ts";

Deno.test("freqCorrectResult decodes the cmd 606 reply the firmware writes", () => {
  const root = parse(
    '<freqCorrectResult version="1.1"><result>unknow</result></freqCorrectResult>',
  ).root;

  assertEquals(freqCorrectResult.decode(root), { result: "unknow" });
});

Deno.test("freqCorrectResult round-trips through encode and decode", () => {
  const value = { result: "success" as const };

  assertEquals(
    freqCorrectResult.decode(parse(freqCorrectResult.encode(value)).root),
    value,
  );
});

Deno.test("freqCorrectResult rejects the corrected spelling unknown", () => {
  const root = parse(
    '<freqCorrectResult version="1.1"><result>unknown</result></freqCorrectResult>',
  ).root;

  assertThrows(() => freqCorrectResult.decode(root), Error, '"unknown"');
});
