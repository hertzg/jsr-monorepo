import { assertEquals } from "@std/assert";
import {
  cidrv4BroadcastAddress,
  cidrv4Contains,
  cidrv4NetworkAddress,
  parse,
  parseCidrv4,
  parseIpv4,
  stringify,
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

  await t.step("parse/stringify IPv4 address", () => {
    const ip = parse("10.0.0.1");
    assertEquals(ip, 167772161);
    assertEquals(stringify(ip), "10.0.0.1");
  });

  await t.step("parse/stringify IPv6 address", () => {
    const ip = parse("::1");
    assertEquals(ip, 1n);
    assertEquals(stringify(ip), "::1");
  });

  await t.step("parse/stringify IPv4 CIDR", () => {
    const cidr = parse("10.0.0.0/8");
    assertEquals(cidr, { address: 167772160, prefixLength: 8 });
    assertEquals(stringify(cidr), "10.0.0.0/8");
  });

  await t.step("parse/stringify IPv6 CIDR", () => {
    const cidr = parse("2001:db8::/32");
    assertEquals(cidr, {
      address: 0x2001_0db8_0000_0000_0000_0000_0000_0000n,
      prefixLength: 32,
    });
    assertEquals(stringify(cidr), "2001:db8::/32");
  });

  await t.step("parse unwraps IPv4-mapped CIDR", () => {
    const cidr = parse("::ffff:192.168.1.0/120");
    assertEquals(cidr, { address: 3232235776, prefixLength: 24 });
    assertEquals(stringify(cidr), "192.168.1.0/24");
  });
});
