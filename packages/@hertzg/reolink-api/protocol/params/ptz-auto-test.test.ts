import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { ptzAutoTest } from "./ptz-auto-test.ts";

Deno.test("ptzAutoTest decodes the cmd 340 reply", () => {
  const root = parse(
    '<PtzAutoTest version="1.1"><testStat>1</testStat></PtzAutoTest>',
  ).root;

  assertEquals(ptzAutoTest.decode(root), { testStat: 1 });
});

Deno.test("ptzAutoTest round-trips through encode and decode", () => {
  const value = { testStat: 2 };

  const xml = ptzAutoTest.encode(value);

  assertEquals(ptzAutoTest.decode(parse(xml).root), value);
});

Deno.test("ptzAutoTest rejects a reply without a state", () => {
  const root = parse('<PtzAutoTest version="1.1"></PtzAutoTest>').root;

  assertThrows(() => ptzAutoTest.decode(root), Error, "<testStat>");
});
