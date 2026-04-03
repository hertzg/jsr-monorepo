import { assertEquals } from "@std/assert";
import { parseCidr, stringifyCidr } from "./cidr.ts";
import type { Cidr4 } from "./cidrv4.ts";
import type { Cidr6 } from "./cidrv6.ts";

Deno.test("parseCidr", async (t) => {
  await t.step("parses IPv4 CIDR", () => {
    const cidr = parseCidr("192.168.1.0/24") as Cidr4;
    assertEquals(typeof cidr.address, "number");
    assertEquals(cidr.prefixLength, 24);
  });

  await t.step("parses IPv6 CIDR", () => {
    const cidr = parseCidr("2001:db8::/32") as Cidr6;
    assertEquals(typeof cidr.address, "bigint");
    assertEquals(cidr.prefixLength, 32);
  });

  await t.step("parses various IPv4 CIDRs", () => {
    const cidr = parseCidr("10.0.0.0/8") as Cidr4;
    assertEquals(cidr.prefixLength, 8);

    const cidr2 = parseCidr("172.16.0.0/12") as Cidr4;
    assertEquals(cidr2.prefixLength, 12);
  });

  await t.step("parses various IPv6 CIDRs", () => {
    const cidr = parseCidr("fe80::/10") as Cidr6;
    assertEquals(cidr.prefixLength, 10);

    const cidr2 = parseCidr("::1/128") as Cidr6;
    assertEquals(cidr2.prefixLength, 128);
  });
});

Deno.test("stringifyCidr", async (t) => {
  await t.step("stringifies IPv4 CIDR", () => {
    const cidr = parseCidr("192.168.1.0/24");
    assertEquals(stringifyCidr(cidr as Cidr4), "192.168.1.0/24");
  });

  await t.step("stringifies IPv6 CIDR", () => {
    const cidr = parseCidr("2001:db8::/32");
    assertEquals(stringifyCidr(cidr as Cidr6), "2001:db8::/32");
  });
});

Deno.test("parseCidr round-trip", async (t) => {
  await t.step("IPv4 round-trip", () => {
    const cidrs = ["10.0.0.0/8", "192.168.1.0/24", "172.16.0.0/12"];
    for (const c of cidrs) {
      const parsed = parseCidr(c);
      assertEquals(stringifyCidr(parsed as Cidr4), c);
    }
  });

  await t.step("IPv6 round-trip", () => {
    const cidrs = ["2001:db8::/32", "fe80::/10", "::/0"];
    for (const c of cidrs) {
      const parsed = parseCidr(c);
      assertEquals(stringifyCidr(parsed as Cidr6), c);
    }
  });
});
