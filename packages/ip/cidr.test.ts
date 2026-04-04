import { assert, assertEquals } from "@std/assert";
import { parseCidr, stringifyCidr } from "./cidr.ts";
import { isValidCidr } from "./validate.ts";
import type { Cidrv4 } from "./cidrv4.ts";
import type { Cidrv6 } from "./cidrv6.ts";

Deno.test("parseCidr", async (t) => {
  await t.step("parses IPv4 CIDR", () => {
    const cidr = parseCidr("192.168.1.0/24") as Cidrv4;
    assertEquals(typeof cidr.address, "number");
    assertEquals(cidr.prefixLength, 24);
  });

  await t.step("parses IPv6 CIDR", () => {
    const cidr = parseCidr("2001:db8::/32") as Cidrv6;
    assertEquals(typeof cidr.address, "bigint");
    assertEquals(cidr.prefixLength, 32);
  });

  await t.step("parses various IPv4 CIDRs", () => {
    const cidr = parseCidr("10.0.0.0/8") as Cidrv4;
    assertEquals(cidr.prefixLength, 8);

    const cidr2 = parseCidr("172.16.0.0/12") as Cidrv4;
    assertEquals(cidr2.prefixLength, 12);
  });

  await t.step("parses various IPv6 CIDRs", () => {
    const cidr = parseCidr("fe80::/10") as Cidrv6;
    assertEquals(cidr.prefixLength, 10);

    const cidr2 = parseCidr("::1/128") as Cidrv6;
    assertEquals(cidr2.prefixLength, 128);
  });
});

Deno.test("stringifyCidr", async (t) => {
  await t.step("stringifies IPv4 CIDR", () => {
    const cidr = parseCidr("192.168.1.0/24");
    assertEquals(stringifyCidr(cidr as Cidrv4), "192.168.1.0/24");
  });

  await t.step("stringifies IPv6 CIDR", () => {
    const cidr = parseCidr("2001:db8::/32");
    assertEquals(stringifyCidr(cidr as Cidrv6), "2001:db8::/32");
  });
});

Deno.test("parseCidr round-trip", async (t) => {
  await t.step("IPv4 round-trip", () => {
    const cidrs = ["10.0.0.0/8", "192.168.1.0/24", "172.16.0.0/12"];
    for (const c of cidrs) {
      const parsed = parseCidr(c);
      assertEquals(stringifyCidr(parsed as Cidrv4), c);
    }
  });

  await t.step("IPv6 round-trip", () => {
    const cidrs = ["2001:db8::/32", "fe80::/10", "::/0"];
    for (const c of cidrs) {
      const parsed = parseCidr(c);
      assertEquals(stringifyCidr(parsed as Cidrv6), c);
    }
  });
});

Deno.test("isValidCidr", async (t) => {
  await t.step("accepts valid IPv4 CIDRs", () => {
    assert(isValidCidr("10.0.0.0/8"));
    assert(isValidCidr("192.168.1.0/24"));
    assert(isValidCidr("0.0.0.0/0"));
  });

  await t.step("accepts valid IPv6 CIDRs", () => {
    assert(isValidCidr("2001:db8::/32"));
    assert(isValidCidr("fe80::/10"));
    assert(isValidCidr("::/0"));
  });

  await t.step("rejects plain IP addresses", () => {
    assertEquals(isValidCidr("10.0.0.1"), false);
    assertEquals(isValidCidr("::1"), false);
  });

  await t.step("rejects invalid input", () => {
    assertEquals(isValidCidr(""), false);
    assertEquals(isValidCidr("garbage/24"), false);
    assertEquals(isValidCidr("10.0.0.0/33"), false);
  });
});
