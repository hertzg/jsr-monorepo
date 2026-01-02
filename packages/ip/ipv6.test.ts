import { assertEquals, assertThrows } from "@std/assert";
import { compressIpv6, expandIpv6, parseIpv6, stringifyIpv6 } from "./ipv6.ts";

Deno.test("parseIpv6", async (t) => {
  await t.step("full form addresses", () => {
    assertEquals(
      parseIpv6("2001:0db8:0000:0000:0000:0000:0000:0001"),
      0x20010db8000000000000000000000001n,
    );
    assertEquals(
      parseIpv6("ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff"),
      0xffffffffffffffffffffffffffffffffn,
    );
    assertEquals(
      parseIpv6("0000:0000:0000:0000:0000:0000:0000:0000"),
      0n,
    );
  });

  await t.step("compressed form with leading ::", () => {
    assertEquals(parseIpv6("::1"), 1n);
    assertEquals(parseIpv6("::"), 0n);
    assertEquals(parseIpv6("::ffff"), 0xffffn);
    assertEquals(
      parseIpv6("::ffff:ffff:ffff:ffff"),
      0x0000_0000_0000_0000_ffff_ffff_ffff_ffffn,
    );
  });

  await t.step("compressed form with trailing ::", () => {
    assertEquals(parseIpv6("2001:db8::"), 0x20010db8000000000000000000000000n);
    assertEquals(parseIpv6("fe80::"), 0xfe800000000000000000000000000000n);
  });

  await t.step("compressed form with :: in middle", () => {
    assertEquals(parseIpv6("2001:db8::1"), 0x20010db8000000000000000000000001n);
    assertEquals(
      parseIpv6("fe80::1:2"),
      0xfe800000000000000000000000010002n,
    );
    assertEquals(
      parseIpv6("1::1"),
      0x00010000000000000000000000000001n,
    );
    assertEquals(
      parseIpv6("1:2::3:4"),
      0x00010002000000000000000000030004n,
    );
  });

  await t.step("lowercase hex", () => {
    assertEquals(parseIpv6("abcd:ef01::1"), 0xabcdef01000000000000000000000001n);
  });

  await t.step("uppercase hex", () => {
    assertEquals(parseIpv6("ABCD:EF01::1"), 0xabcdef01000000000000000000000001n);
  });

  await t.step("mixed case hex", () => {
    assertEquals(parseIpv6("AbCd:eF01::1"), 0xabcdef01000000000000000000000001n);
  });

  await t.step("IPv4-mapped addresses", () => {
    assertEquals(
      parseIpv6("::ffff:192.168.1.1"),
      0x0000_0000_0000_0000_0000_ffff_c0a8_0101n,
    );
    assertEquals(
      parseIpv6("::ffff:10.0.0.1"),
      0x0000_0000_0000_0000_0000_ffff_0a00_0001n,
    );
    assertEquals(
      parseIpv6("::ffff:0.0.0.0"),
      0x0000_0000_0000_0000_0000_ffff_0000_0000n,
    );
    assertEquals(
      parseIpv6("::ffff:255.255.255.255"),
      0x0000_0000_0000_0000_0000_ffff_ffff_ffffn,
    );
  });

  await t.step("zone ID stripping", () => {
    assertEquals(parseIpv6("fe80::1%eth0"), parseIpv6("fe80::1"));
    assertEquals(parseIpv6("fe80::1%0"), parseIpv6("fe80::1"));
    assertEquals(parseIpv6("::1%lo"), parseIpv6("::1"));
  });

  await t.step("edge cases", () => {
    assertEquals(parseIpv6("0:0:0:0:0:0:0:0"), 0n);
    assertEquals(parseIpv6("0:0:0:0:0:0:0:1"), 1n);
    assertEquals(
      parseIpv6("ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff"),
      340282366920938463463374607431768211455n,
    );
  });

  await t.step("invalid format - multiple ::", () => {
    assertThrows(
      () => parseIpv6("2001::db8::1"),
      TypeError,
      "IPv6 address can only contain one '::'",
    );
  });

  await t.step("invalid format - too many groups", () => {
    assertThrows(
      () => parseIpv6("1:2:3:4:5:6:7:8:9"),
      TypeError,
      "IPv6 address must have exactly 8 groups",
    );
  });

  await t.step("invalid format - too few groups without ::", () => {
    assertThrows(
      () => parseIpv6("2001:db8:1"),
      TypeError,
      "IPv6 address must have exactly 8 groups",
    );
  });

  await t.step("invalid format - invalid hex", () => {
    assertThrows(
      () => parseIpv6("2001:gggg::1"),
      TypeError,
      "Invalid IPv6 group",
    );
    assertThrows(
      () => parseIpv6("2001:db8::xyz"),
      TypeError,
      "Invalid IPv6 group",
    );
  });

  await t.step("invalid format - group too long", () => {
    assertThrows(
      () => parseIpv6("2001:12345::1"),
      TypeError,
      "Invalid IPv6 group",
    );
  });

  await t.step("invalid format - empty group", () => {
    assertThrows(
      () => parseIpv6("2001::db8:::1"),
      TypeError,
    );
  });
});

Deno.test("stringifyIpv6", async (t) => {
  await t.step("zero address", () => {
    assertEquals(stringifyIpv6(0n), "::");
  });

  await t.step("loopback", () => {
    assertEquals(stringifyIpv6(1n), "::1");
  });

  await t.step("common addresses", () => {
    assertEquals(
      stringifyIpv6(0x20010db8000000000000000000000001n),
      "2001:db8::1",
    );
    assertEquals(
      stringifyIpv6(0xfe800000000000000000000000000001n),
      "fe80::1",
    );
  });

  await t.step("no compression needed", () => {
    assertEquals(
      stringifyIpv6(0x00010002000300040005000600070008n),
      "1:2:3:4:5:6:7:8",
    );
  });

  await t.step("single zero not compressed", () => {
    assertEquals(
      stringifyIpv6(0x00010000000300040005000600070008n),
      "1:0:3:4:5:6:7:8",
    );
  });

  await t.step("longest zero run is compressed", () => {
    assertEquals(
      stringifyIpv6(0x00010000000000000000000600070008n),
      "1::6:7:8",
    );
  });

  await t.step("first longest run is compressed", () => {
    assertEquals(
      stringifyIpv6(0x00010000000000000001000000000001n),
      "1::1:0:0:1",
    );
  });

  await t.step("max address", () => {
    assertEquals(
      stringifyIpv6(0xffffffffffffffffffffffffffffffffn),
      "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff",
    );
  });

  await t.step("leading zeros in groups are stripped", () => {
    assertEquals(
      stringifyIpv6(0x00010002000300040005000600070008n),
      "1:2:3:4:5:6:7:8",
    );
  });

  await t.step("compression at start", () => {
    assertEquals(
      stringifyIpv6(0x00000000000000000000000000000001n),
      "::1",
    );
  });

  await t.step("compression at end", () => {
    assertEquals(
      stringifyIpv6(0x20010db8000000000000000000000000n),
      "2001:db8::",
    );
  });

  await t.step("out of range values", () => {
    assertThrows(
      () => stringifyIpv6(-1n),
      RangeError,
      "IPv6 value out of range",
    );
    assertThrows(
      () => stringifyIpv6(340282366920938463463374607431768211456n),
      RangeError,
      "IPv6 value out of range",
    );
  });
});

Deno.test("expandIpv6", async (t) => {
  await t.step("expands :: to full form", () => {
    assertEquals(
      expandIpv6("::"),
      "0000:0000:0000:0000:0000:0000:0000:0000",
    );
  });

  await t.step("expands ::1 to full form", () => {
    assertEquals(
      expandIpv6("::1"),
      "0000:0000:0000:0000:0000:0000:0000:0001",
    );
  });

  await t.step("expands 2001:db8::1 to full form", () => {
    assertEquals(
      expandIpv6("2001:db8::1"),
      "2001:0db8:0000:0000:0000:0000:0000:0001",
    );
  });

  await t.step("handles already expanded form", () => {
    assertEquals(
      expandIpv6("2001:0db8:0000:0000:0000:0000:0000:0001"),
      "2001:0db8:0000:0000:0000:0000:0000:0001",
    );
  });

  await t.step("expands trailing ::", () => {
    assertEquals(
      expandIpv6("fe80::"),
      "fe80:0000:0000:0000:0000:0000:0000:0000",
    );
  });

  await t.step("strips zone ID", () => {
    assertEquals(
      expandIpv6("fe80::1%eth0"),
      "fe80:0000:0000:0000:0000:0000:0000:0001",
    );
  });
});

Deno.test("compressIpv6", async (t) => {
  await t.step("compresses full form", () => {
    assertEquals(
      compressIpv6("0000:0000:0000:0000:0000:0000:0000:0000"),
      "::",
    );
    assertEquals(
      compressIpv6("0000:0000:0000:0000:0000:0000:0000:0001"),
      "::1",
    );
    assertEquals(
      compressIpv6("2001:0db8:0000:0000:0000:0000:0000:0001"),
      "2001:db8::1",
    );
  });

  await t.step("already compressed form is idempotent", () => {
    assertEquals(compressIpv6("::"), "::");
    assertEquals(compressIpv6("::1"), "::1");
    assertEquals(compressIpv6("2001:db8::1"), "2001:db8::1");
  });

  await t.step("removes leading zeros", () => {
    assertEquals(
      compressIpv6("0001:0002:0003:0004:0005:0006:0007:0008"),
      "1:2:3:4:5:6:7:8",
    );
  });
});

Deno.test("IPv6 round-trip", async (t) => {
  await t.step("parse then stringify", () => {
    const addresses = [
      "::",
      "::1",
      "2001:db8::1",
      "fe80::1",
      "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff",
    ];

    for (const addr of addresses) {
      assertEquals(stringifyIpv6(parseIpv6(addr)), addr);
    }
  });

  await t.step("stringify then parse", () => {
    const values = [
      0n,
      1n,
      0x20010db8000000000000000000000001n,
      0xfe800000000000000000000000000001n,
      0xffffffffffffffffffffffffffffffffn,
    ];

    for (const val of values) {
      assertEquals(parseIpv6(stringifyIpv6(val)), val);
    }
  });

  await t.step("full form to compressed and back", () => {
    const fullForms = [
      "0000:0000:0000:0000:0000:0000:0000:0000",
      "2001:0db8:0000:0000:0000:0000:0000:0001",
      "fe80:0000:0000:0000:0000:0000:0000:0001",
    ];

    for (const full of fullForms) {
      const parsed = parseIpv6(full);
      const compressed = stringifyIpv6(parsed);
      const expanded = expandIpv6(compressed);
      assertEquals(expanded, full);
    }
  });
});

Deno.test("IPv6 arithmetic", async (t) => {
  await t.step("increment IP", () => {
    const ip = parseIpv6("2001:db8::1");
    assertEquals(stringifyIpv6(ip + 1n), "2001:db8::2");
  });

  await t.step("decrement IP", () => {
    const ip = parseIpv6("2001:db8::2");
    assertEquals(stringifyIpv6(ip - 1n), "2001:db8::1");
  });

  await t.step("increment across group boundary", () => {
    const ip = parseIpv6("2001:db8::ffff");
    assertEquals(stringifyIpv6(ip + 1n), "2001:db8::1:0");
  });

  await t.step("add large offset", () => {
    const ip = parseIpv6("::");
    assertEquals(stringifyIpv6(ip + 0x10000n), "::1:0");
  });
});
