import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { dns } from "./dns.ts";

Deno.test("dns decodes the element the firmware writes", () => {
  const root = parse(
    '<Dns version="1.1"><dns1>192.168.1.1</dns1><dns2>8.8.4.4</dns2></Dns>',
  ).root;

  assertEquals(dns.decode(root), { dns1: "192.168.1.1", dns2: "8.8.4.4" });
});

Deno.test("dns round-trips through encode and decode", () => {
  const value = { dns1: "10.0.0.53", dns2: "10.0.1.53" };

  assertEquals(dns.decode(parse(dns.encode(value)).root), value);
});

Deno.test("dns decodes a request that carries only the secondary server", () => {
  const root = parse('<Dns version="1.1"><dns2>9.9.9.9</dns2></Dns>').root;

  assertEquals(dns.decode(root), { dns2: "9.9.9.9" });
});
