import { assertEquals, assertThrows } from "@std/assert";
import {
  cidrv4FromCidrv64Mapped,
  cidrv4ToCidrv64Mapped,
  ipv4From64Mapped,
  ipv4To64Mapped,
} from "./4to6.ts";
import { parseIpv4, stringifyIpv4 } from "./ipv4.ts";
import { parseIpv6, stringifyIpv6 } from "./ipv6.ts";
import { parseCidrv4, stringifyCidrv4 } from "./cidrv4.ts";
import { parseCidrv6, stringifyCidrv6 } from "./cidrv6.ts";

Deno.test("ipv4To64Mapped", async (t) => {
  await t.step("embeds IPv4 into mapped prefix", () => {
    assertEquals(ipv4To64Mapped(parseIpv4("192.168.1.1")), parseIpv6("::ffff:192.168.1.1"));
    assertEquals(ipv4To64Mapped(parseIpv4("127.0.0.1")), parseIpv6("::ffff:127.0.0.1"));
    assertEquals(ipv4To64Mapped(parseIpv4("10.0.0.1")), parseIpv6("::ffff:10.0.0.1"));
  });

  await t.step("edge cases", () => {
    assertEquals(ipv4To64Mapped(parseIpv4("0.0.0.0")), parseIpv6("::ffff:0.0.0.0"));
    assertEquals(ipv4To64Mapped(parseIpv4("255.255.255.255")), parseIpv6("::ffff:255.255.255.255"));
  });

  await t.step("result stringifies to mapped hex notation", () => {
    assertEquals(stringifyIpv6(ipv4To64Mapped(parseIpv4("192.168.1.1"))), "::ffff:c0a8:101");
    assertEquals(stringifyIpv6(ipv4To64Mapped(parseIpv4("0.0.0.0"))), "::ffff:0:0");
  });

  await t.step("raw numeric value is correct", () => {
    assertEquals(ipv4To64Mapped(0), 0xFFFF_0000_0000n);
    assertEquals(ipv4To64Mapped(1), 0xFFFF_0000_0001n);
    assertEquals(ipv4To64Mapped(0xC0A80101), 0xFFFF_C0A8_0101n);
  });
});

Deno.test("ipv4From64Mapped", async (t) => {
  await t.step("extracts IPv4 from mapped address", () => {
    assertEquals(stringifyIpv4(ipv4From64Mapped(parseIpv6("::ffff:192.168.1.1"))), "192.168.1.1");
    assertEquals(stringifyIpv4(ipv4From64Mapped(parseIpv6("::ffff:127.0.0.1"))), "127.0.0.1");
    assertEquals(stringifyIpv4(ipv4From64Mapped(parseIpv6("::ffff:10.0.0.1"))), "10.0.0.1");
  });

  await t.step("accepts hex notation input", () => {
    assertEquals(stringifyIpv4(ipv4From64Mapped(parseIpv6("::ffff:c0a8:101"))), "192.168.1.1");
  });

  await t.step("edge cases", () => {
    assertEquals(ipv4From64Mapped(parseIpv6("::ffff:0.0.0.0")), 0);
    assertEquals(ipv4From64Mapped(parseIpv6("::ffff:255.255.255.255")), 0xFFFFFFFF);
  });

  await t.step("round-trip with ipv4To64Mapped", () => {
    const addrs = ["0.0.0.0", "127.0.0.1", "192.168.1.1", "10.0.0.1", "255.255.255.255"];
    for (const addr of addrs) {
      const v4 = parseIpv4(addr);
      assertEquals(ipv4From64Mapped(ipv4To64Mapped(v4)), v4);
    }
  });
});

Deno.test("cidrv4ToCidrv64Mapped", async (t) => {
  await t.step("converts prefix length by adding 96", () => {
    const cidr = cidrv4ToCidrv64Mapped(parseCidrv4("10.0.0.0/8"));
    assertEquals(cidr.prefixLength, 104);

    const cidr24 = cidrv4ToCidrv64Mapped(parseCidrv4("192.168.1.0/24"));
    assertEquals(cidr24.prefixLength, 120);
  });

  await t.step("converts address to mapped", () => {
    const cidr = cidrv4ToCidrv64Mapped(parseCidrv4("10.0.0.0/8"));
    assertEquals(cidr.address, parseIpv6("::ffff:10.0.0.0"));
  });

  await t.step("stringifies correctly", () => {
    assertEquals(
      stringifyCidrv6(cidrv4ToCidrv64Mapped(parseCidrv4("10.0.0.0/8"))),
      "::ffff:a00:0/104",
    );
    assertEquals(
      stringifyCidrv6(cidrv4ToCidrv64Mapped(parseCidrv4("192.168.1.0/24"))),
      "::ffff:c0a8:100/120",
    );
  });

  await t.step("edge cases", () => {
    const all = cidrv4ToCidrv64Mapped(parseCidrv4("0.0.0.0/0"));
    assertEquals(all.prefixLength, 96);
    assertEquals(stringifyCidrv6(all), "::ffff:0:0/96");

    const single = cidrv4ToCidrv64Mapped(parseCidrv4("192.168.1.1/32"));
    assertEquals(single.prefixLength, 128);
  });
});

Deno.test("cidrv4FromCidrv64Mapped", async (t) => {
  await t.step("converts prefix length by subtracting 96", () => {
    const cidr = cidrv4FromCidrv64Mapped(parseCidrv6("::ffff:10.0.0.0/104"));
    assertEquals(cidr.prefixLength, 8);
    assertEquals(stringifyCidrv4(cidr), "10.0.0.0/8");
  });

  await t.step("various prefix lengths", () => {
    assertEquals(
      stringifyCidrv4(cidrv4FromCidrv64Mapped(parseCidrv6("::ffff:192.168.1.0/120"))),
      "192.168.1.0/24",
    );
    assertEquals(
      stringifyCidrv4(cidrv4FromCidrv64Mapped(parseCidrv6("::ffff:0.0.0.0/96"))),
      "0.0.0.0/0",
    );
    assertEquals(
      stringifyCidrv4(cidrv4FromCidrv64Mapped(parseCidrv6("::ffff:192.168.1.1/128"))),
      "192.168.1.1/32",
    );
  });

  await t.step("throws for prefix length less than 96", () => {
    assertThrows(
      () => cidrv4FromCidrv64Mapped(parseCidrv6("::ffff:0:0/64")),
      RangeError,
    );
    assertThrows(
      () => cidrv4FromCidrv64Mapped(parseCidrv6("2001:db8::/32")),
      RangeError,
    );
    assertThrows(
      () => cidrv4FromCidrv64Mapped(parseCidrv6("::/0")),
      RangeError,
    );
  });

  await t.step("round-trip with cidrv4ToCidrv64Mapped", () => {
    const cidrs = ["10.0.0.0/8", "192.168.1.0/24", "172.16.0.0/12", "0.0.0.0/0", "10.0.0.1/32"];
    for (const cidr of cidrs) {
      const v4 = parseCidrv4(cidr);
      assertEquals(cidrv4FromCidrv64Mapped(cidrv4ToCidrv64Mapped(v4)), v4);
    }
  });
});
