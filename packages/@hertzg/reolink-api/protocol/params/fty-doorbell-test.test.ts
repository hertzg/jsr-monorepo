import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { ftyDoorbellTest } from "./fty-doorbell-test.ts";

Deno.test("ftyDoorbellTest decodes every field net_fty_doorbell_test_x2s reads", () => {
  const root = parse(
    "<ftyDoorbellTest><testDuration>120</testDuration>" +
      "<testTimes>8</testTimes><result>1</result><op>2</op>" +
      "<testTotalCount>40</testTotalCount></ftyDoorbellTest>",
  ).root;

  assertEquals(ftyDoorbellTest.decode(root), {
    testDuration: 120,
    testTimes: 8,
    result: 1,
    op: 2,
    testTotalCount: 40,
  });
});

Deno.test("ftyDoorbellTest decodes an element with no fields", () => {
  const root = parse("<ftyDoorbellTest></ftyDoorbellTest>").root;

  assertEquals(ftyDoorbellTest.decode(root), {});
});

Deno.test("ftyDoorbellTest round-trips through encode and decode", () => {
  const value = {
    testDuration: 300,
    testTimes: 3,
    result: 0,
    op: 1,
    testTotalCount: 9,
  };

  const xml = ftyDoorbellTest.encode(value);

  assertEquals(ftyDoorbellTest.decode(parse(xml).root), value);
});
