import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { mirror } from "./mirror.ts";

Deno.test("mirror decodes the cmd 170 reply", () => {
  const root = parse('<Mirror version="1.1"><status>1</status></Mirror>').root;

  assertEquals(mirror.decode(root), { status: 1 });
});

Deno.test("mirror round-trips through encode and decode", () => {
  const value = { status: 0 };

  assertEquals(mirror.decode(parse(mirror.encode(value)).root), value);
});

Deno.test("mirror throws without status, which the camera always writes", () => {
  const root = parse("<Mirror></Mirror>").root;

  assertThrows(() => mirror.decode(root), Error, "<status>");
});
