import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { autoUpdate } from "./auto-update.ts";

Deno.test("autoUpdate decodes the cmd 195 reply", () => {
  const root = parse(
    '<AutoUpdate version="1.1"><enable>1</enable></AutoUpdate>',
  ).root;

  assertEquals(autoUpdate.decode(root), { enable: 1 });
});

Deno.test("autoUpdate decodes an element without enable", () => {
  const root = parse('<AutoUpdate version="1.1"></AutoUpdate>').root;

  assertEquals(autoUpdate.decode(root), {});
});

Deno.test("autoUpdate round-trips through encode and decode", () => {
  const value = { enable: 0 };

  const xml = autoUpdate.encode(value);

  assertEquals(autoUpdate.decode(parse(xml).root), value);
});
