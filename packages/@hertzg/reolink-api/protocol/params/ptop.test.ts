import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { ptop } from "./ptop.ts";

Deno.test("ptop decodes the cmd 210 reply", () => {
  const root = parse('<PTOP version="1.1"><enable>1</enable></PTOP>').root;

  assertEquals(ptop.decode(root), { enable: 1 });
});

Deno.test("ptop rejects an element without enable", () => {
  const root = parse('<PTOP version="1.1"></PTOP>').root;

  assertThrows(() => ptop.decode(root), Error, "<enable>");
});

Deno.test("ptop round-trips through encode and decode", () => {
  const value = { enable: 0 };

  const xml = ptop.encode(value);

  assertEquals(ptop.decode(parse(xml).root), value);
});
