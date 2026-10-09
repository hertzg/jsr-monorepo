import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { upnp } from "./upnp.ts";

Deno.test("upnp decodes the element the cmd 97 handler writes", () => {
  const root = parse('<Upnp version="1.1"><enable>1</enable></Upnp>').root;

  assertEquals(upnp.decode(root), { enable: 1 });
});

Deno.test("upnp round-trips through encode and decode", () => {
  const value = { enable: 0 };

  assertEquals(upnp.decode(parse(upnp.encode(value)).root), value);
});

Deno.test("upnp throws without enable, as the firmware parser does", () => {
  const root = parse('<Upnp version="1.1"></Upnp>').root;

  assertThrows(() => upnp.decode(root), Error, "<enable>");
});
