import { assertEquals } from "@std/assert";
import {
  cidrv4BroadcastAddress,
  cidrv4Contains,
  cidrv4NetworkAddress,
  parseCidrv4,
  parseIpv4,
  stringifyIpv4,
} from "./mod.ts";

Deno.test("mod.ts re-exports", async (t) => {
  await t.step("IPv4 functions work via main module", () => {
    const ip = parseIpv4("192.168.1.1");
    assertEquals(ip, 3232235777);
    assertEquals(stringifyIpv4(ip), "192.168.1.1");
  });

  await t.step("CIDR functions work via main module", () => {
    const cidr = parseCidrv4("192.168.1.0/24");
    assertEquals(cidr.address, 3232235776);
    assertEquals(cidr.prefixLength, 24);

    assertEquals(cidrv4NetworkAddress(cidr), 3232235776);
    assertEquals(cidrv4BroadcastAddress(cidr), 3232236031);
    assertEquals(cidrv4Contains(cidr, parseIpv4("192.168.1.100")), true);
  });
});
