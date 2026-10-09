import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { t1MicTest } from "./t1-mic-test.ts";

Deno.test("t1MicTest decodes to an empty object whatever the children", () => {
  const root = parse(
    '<T1MicTest version="1.1"><result>1</result></T1MicTest>',
  ).root;

  assertEquals(t1MicTest.decode(root), {});
});

Deno.test("t1MicTest round-trips through encode and decode", () => {
  assertEquals(t1MicTest.decode(parse(t1MicTest.encode({})).root), {});
});

Deno.test("t1MicTest encodes an element with only the version", () => {
  assertEquals(
    t1MicTest.encode({}),
    '<T1MicTest version="1.1"></T1MicTest>',
  );
});
