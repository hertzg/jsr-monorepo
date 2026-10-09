import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { loginNet } from "./login-net.ts";

Deno.test("loginNet decodes the network type and UDP port", () => {
  const root = parse(
    '<LoginNet version="1.1"><type>WAN</type><udpPort>4321</udpPort></LoginNet>',
  ).root;

  assertEquals(loginNet.decode(root), { type: "WAN", udpPort: 4321 });
});

Deno.test("loginNet round-trips through encode and decode", () => {
  const value = { type: "LAN" as const, udpPort: 1234 };

  assertEquals(loginNet.decode(parse(loginNet.encode(value)).root), value);
});

Deno.test("loginNet reads an element with no fields", () => {
  const root = parse('<LoginNet version="1.1"></LoginNet>').root;

  assertEquals(loginNet.decode(root), {});
});

Deno.test("loginNet rejects a network type other than LAN or WAN", () => {
  const root = parse("<LoginNet><type>VPN</type></LoginNet>").root;

  assertThrows(() => loginNet.decode(root), Error, "LAN, WAN");
});
