import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { dhcp } from "./dhcp.ts";

Deno.test("dhcp decodes the element the firmware writes", () => {
  const root = parse('<Dhcp version="1.1"><enable>1</enable></Dhcp>').root;

  assertEquals(dhcp.decode(root), { enable: 1 });
});

Deno.test("dhcp round-trips through encode and decode", () => {
  const value = { enable: 0 };

  assertEquals(dhcp.decode(parse(dhcp.encode(value)).root), value);
});

Deno.test("dhcp throws without enable, as the firmware parser does", () => {
  const root = parse('<Dhcp version="1.1"></Dhcp>').root;

  assertThrows(() => dhcp.decode(root), Error, "<enable>");
});
