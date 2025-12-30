import { assertEquals } from "@std/assert";
import {
  cidr4BroadcastAddress,
  cidr4Contains,
  cidr4NetworkAddress,
  parseCidr4,
  parseIpv4,
  stringifyIpv4,
} from "./mod.ts";

Deno.test("mod.ts re-exports", async (t) => {
  await t.step("IPv4 functions work via main module", () => {
    const ip = parseIpv4("192.168.1.1");
    assertEquals(ip, 3232235777n);
    assertEquals(stringifyIpv4(ip), "192.168.1.1");
  });

  await t.step("CIDR functions work via main module", () => {
    const cidr = parseCidr4("192.168.1.0/24");
    assertEquals(cidr.address, 3232235776n);
    assertEquals(cidr.prefixLength, 24);

    assertEquals(cidr4NetworkAddress(cidr), 3232235776n);
    assertEquals(cidr4BroadcastAddress(cidr), 3232236031n);
    assertEquals(cidr4Contains(cidr, parseIpv4("192.168.1.100")), true);
  });
});
