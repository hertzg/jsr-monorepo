import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { flip } from "./flip.ts";

Deno.test("flip decodes the cmd 172 reply", () => {
  const root = parse('<Flip version="1.1"><status>1</status></Flip>').root;

  assertEquals(flip.decode(root), { status: 1 });
});

Deno.test("flip round-trips through encode and decode", () => {
  const value = { status: 0 };

  assertEquals(flip.decode(parse(flip.encode(value)).root), value);
});

Deno.test("flip throws without status, which the camera always writes", () => {
  const root = parse("<Flip></Flip>").root;

  assertThrows(() => flip.decode(root), Error, "<status>");
});
