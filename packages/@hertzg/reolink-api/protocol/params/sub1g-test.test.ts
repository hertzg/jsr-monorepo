import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { sub1gTest } from "./sub1g-test.ts";

Deno.test("sub1gTest decodes the reply netserver writes", () => {
  const root = parse(
    '<sub1gTest version="1.1"><correctResult>0</correctResult></sub1gTest>',
  ).root;

  assertEquals(sub1gTest.decode(root), { correctResult: 0 });
});

Deno.test("sub1gTest decodes an element without a result", () => {
  const root = parse('<sub1gTest version="1.1"></sub1gTest>').root;

  assertEquals(sub1gTest.decode(root), {});
});

Deno.test("sub1gTest round-trips through encode and decode", () => {
  const value = { correctResult: 2 };

  assertEquals(sub1gTest.decode(parse(sub1gTest.encode(value)).root), value);
});
