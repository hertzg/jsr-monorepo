import { assertEquals, assertThrows } from "@std/assert";
import {
  cidrv4BroadcastAddress,
  cidrv4Contains,
  cidrv4NetworkAddress,
  cidrv4PrefixLength,
  cidrv6PrefixLength,
  parseAddressv4,
  parseCidrv4,
  stringifyAddressv4,
} from "./mod.ts";

Deno.test("mod.ts re-exports", async (t) => {
  await t.step("IPv4 functions work via main module", () => {
    const ip = parseAddressv4("192.168.1.1");
    assertEquals(ip, 3232235777);
    assertEquals(stringifyAddressv4(ip), "192.168.1.1");
  });

  await t.step("CIDR functions work via main module", () => {
    const cidr = parseCidrv4("192.168.1.0/24");
    assertEquals(cidr.address, 3232235776);
    assertEquals(cidr.prefixLength, 24);

    assertEquals(cidrv4NetworkAddress(cidr), 3232235776);
    assertEquals(cidrv4BroadcastAddress(cidr), 3232236031);
    assertEquals(cidrv4Contains(cidr, parseAddressv4("192.168.1.100")), true);
  });

  await t.step("mask to prefix length works via main module", () => {
    assertEquals(cidrv4PrefixLength(0xFFFFFF00), 24);
    assertThrows(() => cidrv4PrefixLength(0xFF00FF00), TypeError);
    assertEquals(
      cidrv6PrefixLength(0xFFFFFFFFFFFFFFFF0000000000000000n),
      64,
    );
    assertThrows(
      () => cidrv6PrefixLength(0xFFFF0000FFFF00000000000000000000n),
      TypeError,
    );
  });
});
