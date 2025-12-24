import { assertEquals, assertThrows } from "@std/assert";
import { parseIpv4, stringifyIpv4 } from "./ipv4.ts";

Deno.test("parseIpv4", async (t) => {
  await t.step("valid addresses", () => {
    assertEquals(parseIpv4("192.168.1.1"), 3232235777n);
    assertEquals(parseIpv4("10.0.0.1"), 167772161n);
    assertEquals(parseIpv4("172.16.0.1"), 2886729729n);
    assertEquals(parseIpv4("127.0.0.1"), 2130706433n);
  });

  await t.step("edge cases", () => {
    assertEquals(parseIpv4("0.0.0.0"), 0n);
    assertEquals(parseIpv4("255.255.255.255"), 4294967295n);
  });

  await t.step("invalid format - wrong number of octets", () => {
    assertThrows(
      () => parseIpv4("192.168.1"),
      TypeError,
      "IPv4 address must have exactly 4 octets, got 3",
    );
    assertThrows(
      () => parseIpv4("192.168.1.1.1"),
      TypeError,
      "IPv4 address must have exactly 4 octets, got 5",
    );
  });

  await t.step("invalid format - leading zeros", () => {
    assertThrows(
      () => parseIpv4("192.168.01.1"),
      TypeError,
      "IPv4 octets cannot have leading zeros except '0' itself",
    );
    assertThrows(
      () => parseIpv4("01.0.0.1"),
      TypeError,
      "IPv4 octets cannot have leading zeros except '0' itself",
    );
  });

  await t.step("invalid format - non-numeric", () => {
    assertThrows(
      () => parseIpv4("a.b.c.d"),
      TypeError,
      "IPv4 address octets must be decimal numbers",
    );
    assertThrows(
      () => parseIpv4("192.168.x.1"),
      TypeError,
      "IPv4 address octets must be decimal numbers",
    );
  });

  await t.step("out of range octets", () => {
    assertThrows(
      () => parseIpv4("256.0.0.1"),
      RangeError,
      "IPv4 octet out of range: 256 (must be 0-255)",
    );
    assertThrows(
      () => parseIpv4("192.168.1.256"),
      RangeError,
      "IPv4 octet out of range: 256 (must be 0-255)",
    );
    assertThrows(
      () => parseIpv4("192.168.1.300"),
      RangeError,
      "IPv4 octet out of range: 300 (must be 0-255)",
    );
  });
});

Deno.test("stringifyIpv4", async (t) => {
  await t.step("valid values", () => {
    assertEquals(stringifyIpv4(3232235777n), "192.168.1.1");
    assertEquals(stringifyIpv4(167772161n), "10.0.0.1");
    assertEquals(stringifyIpv4(2886729729n), "172.16.0.1");
    assertEquals(stringifyIpv4(2130706433n), "127.0.0.1");
  });

  await t.step("edge cases", () => {
    assertEquals(stringifyIpv4(0n), "0.0.0.0");
    assertEquals(stringifyIpv4(4294967295n), "255.255.255.255");
  });

  await t.step("out of range values", () => {
    assertThrows(
      () => stringifyIpv4(-1n),
      RangeError,
      "IPv4 value out of range: -1 (must be 0 to 4294967295)",
    );
    assertThrows(
      () => stringifyIpv4(4294967296n),
      RangeError,
      "IPv4 value out of range: 4294967296 (must be 0 to 4294967295)",
    );
  });
});

Deno.test("IPv4 round-trip", async (t) => {
  await t.step("parse then stringify", () => {
    const addresses = [
      "192.168.1.1",
      "10.0.0.1",
      "172.16.0.1",
      "127.0.0.1",
      "0.0.0.0",
      "255.255.255.255",
    ];

    for (const addr of addresses) {
      assertEquals(stringifyIpv4(parseIpv4(addr)), addr);
    }
  });

  await t.step("stringify then parse", () => {
    const values = [
      3232235777n,
      167772161n,
      2886729729n,
      2130706433n,
      0n,
      4294967295n,
    ];

    for (const val of values) {
      assertEquals(parseIpv4(stringifyIpv4(val)), val);
    }
  });
});
