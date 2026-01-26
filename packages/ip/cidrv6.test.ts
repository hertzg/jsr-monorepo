import { assertEquals, assertThrows } from "@std/assert";
import {
  cidr6Addresses,
  cidr6Contains,
  cidr6FirstAddress,
  cidr6LastAddress,
  mask6FromPrefixLength,
  parseCidr6,
  stringifyCidr6,
} from "./cidrv6.ts";
import { parseIpv6, stringifyIpv6 } from "./ipv6.ts";

Deno.test("mask6FromPrefixLength", async (t) => {
  await t.step("common prefix lengths", () => {
    assertEquals(
      mask6FromPrefixLength(128),
      0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFn,
    );
    assertEquals(
      mask6FromPrefixLength(64),
      0xFFFFFFFFFFFFFFFF0000000000000000n,
    );
    assertEquals(
      mask6FromPrefixLength(48),
      0xFFFFFFFFFFFF00000000000000000000n,
    );
    assertEquals(
      mask6FromPrefixLength(32),
      0xFFFFFFFF000000000000000000000000n,
    );
  });

  await t.step("edge cases", () => {
    assertEquals(mask6FromPrefixLength(0), 0n);
    assertEquals(
      mask6FromPrefixLength(128),
      0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFn,
    );
  });

  await t.step("various prefix lengths", () => {
    assertEquals(
      mask6FromPrefixLength(1),
      0x80000000000000000000000000000000n,
    );
    assertEquals(
      mask6FromPrefixLength(120),
      0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00n,
    );
    assertEquals(
      mask6FromPrefixLength(127),
      0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEn,
    );
  });

  await t.step("out of range prefix lengths", () => {
    assertThrows(
      () => mask6FromPrefixLength(-1),
      RangeError,
      "CIDR prefix length must be 0-128",
    );
    assertThrows(
      () => mask6FromPrefixLength(129),
      RangeError,
      "CIDR prefix length must be 0-128",
    );
  });
});

Deno.test("parseCidr6", async (t) => {
  await t.step("valid CIDR notation", () => {
    const cidr = parseCidr6("2001:db8::/32");
    assertEquals(cidr.address, parseIpv6("2001:db8::"));
    assertEquals(cidr.prefixLength, 32);
  });

  await t.step("various prefix lengths", () => {
    const cidr64 = parseCidr6("2001:db8::/64");
    assertEquals(cidr64.address, parseIpv6("2001:db8::"));
    assertEquals(cidr64.prefixLength, 64);

    const cidr48 = parseCidr6("2001:db8::/48");
    assertEquals(cidr48.address, parseIpv6("2001:db8::"));
    assertEquals(cidr48.prefixLength, 48);

    const cidr128 = parseCidr6("2001:db8::1/128");
    assertEquals(cidr128.address, parseIpv6("2001:db8::1"));
    assertEquals(cidr128.prefixLength, 128);
  });

  await t.step("preserves original address", () => {
    const cidr = parseCidr6("2001:db8::100/64");
    assertEquals(cidr.address, parseIpv6("2001:db8::100"));
    assertEquals(cidr.prefixLength, 64);
  });

  await t.step("invalid format", () => {
    assertThrows(
      () => parseCidr6("2001:db8::"),
      TypeError,
      "CIDR notation must be in format '<address>/<prefix>'",
    );
    assertThrows(
      () => parseCidr6("2001:db8::/"),
      TypeError,
      "CIDR prefix length must be specified",
    );
  });

  await t.step("invalid prefix length", () => {
    assertThrows(
      () => parseCidr6("2001:db8::/129"),
      RangeError,
      "CIDR prefix length must be 0-128",
    );
    assertThrows(
      () => parseCidr6("2001:db8::/-1"),
      RangeError,
      "CIDR prefix length must be 0-128",
    );
    assertThrows(
      () => parseCidr6("2001:db8::/abc"),
      TypeError,
      "CIDR prefix length must be a number",
    );
  });

  await t.step("invalid address", () => {
    assertThrows(
      () => parseCidr6("gggg::/32"),
      TypeError,
    );
  });
});

Deno.test("stringifyCidr6", async (t) => {
  await t.step("basic stringifying", () => {
    const cidr = parseCidr6("2001:db8::/32");
    assertEquals(stringifyCidr6(cidr), "2001:db8::/32");
  });

  await t.step("various CIDRs", () => {
    assertEquals(stringifyCidr6(parseCidr6("fd00::/8")), "fd00::/8");
    assertEquals(stringifyCidr6(parseCidr6("2001:db8::/64")), "2001:db8::/64");
    assertEquals(
      stringifyCidr6(parseCidr6("2001:db8::1/128")),
      "2001:db8::1/128",
    );
  });

  await t.step("preserves original address", () => {
    const cidr = parseCidr6("2001:db8::100/64");
    assertEquals(stringifyCidr6(cidr), "2001:db8::100/64");
  });
});

Deno.test("cidr6Contains", async (t) => {
  await t.step("IP in range", () => {
    const cidr = parseCidr6("2001:db8::/32");

    assertEquals(cidr6Contains(cidr, parseIpv6("2001:db8::")), true);
    assertEquals(cidr6Contains(cidr, parseIpv6("2001:db8::1")), true);
    assertEquals(cidr6Contains(cidr, parseIpv6("2001:db8:ffff::")), true);
    assertEquals(
      cidr6Contains(cidr, parseIpv6("2001:db8:ffff:ffff:ffff:ffff:ffff:ffff")),
      true,
    );
  });

  await t.step("IP out of range", () => {
    const cidr = parseCidr6("2001:db8::/32");

    assertEquals(cidr6Contains(cidr, parseIpv6("2001:db7::")), false);
    assertEquals(cidr6Contains(cidr, parseIpv6("2001:db9::")), false);
    assertEquals(cidr6Contains(cidr, parseIpv6("fe80::1")), false);
  });

  await t.step("edge cases - /128 (single IP)", () => {
    const cidr = parseCidr6("2001:db8::1/128");

    assertEquals(cidr6Contains(cidr, parseIpv6("2001:db8::1")), true);
    assertEquals(cidr6Contains(cidr, parseIpv6("2001:db8::")), false);
    assertEquals(cidr6Contains(cidr, parseIpv6("2001:db8::2")), false);
  });

  await t.step("edge cases - /0 (all IPs)", () => {
    const cidr = parseCidr6("::/0");

    assertEquals(cidr6Contains(cidr, parseIpv6("::")), true);
    assertEquals(cidr6Contains(cidr, parseIpv6("2001:db8::1")), true);
    assertEquals(
      cidr6Contains(cidr, parseIpv6("ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff")),
      true,
    );
  });
});

Deno.test("cidr6FirstAddress", async (t) => {
  await t.step("returns first address", () => {
    const cidr = parseCidr6("2001:db8::/32");
    assertEquals(cidr6FirstAddress(cidr), parseIpv6("2001:db8::"));
  });

  await t.step("various CIDRs", () => {
    assertEquals(
      cidr6FirstAddress(parseCidr6("fd00::/8")),
      parseIpv6("fd00::"),
    );
    assertEquals(
      cidr6FirstAddress(parseCidr6("2001:db8:abcd::/48")),
      parseIpv6("2001:db8:abcd::"),
    );
    assertEquals(
      cidr6FirstAddress(parseCidr6("2001:db8::100/64")),
      parseIpv6("2001:db8::"),
    );
  });
});

Deno.test("cidr6LastAddress", async (t) => {
  await t.step("returns last address in range", () => {
    const cidr = parseCidr6("fd00::/120");
    assertEquals(cidr6LastAddress(cidr), parseIpv6("fd00::ff"));
  });

  await t.step("various CIDRs", () => {
    assertEquals(
      cidr6LastAddress(parseCidr6("2001:db8::/125")),
      parseIpv6("2001:db8::7"),
    );
    assertEquals(
      cidr6LastAddress(parseCidr6("2001:db8::1/128")),
      parseIpv6("2001:db8::1"),
    );
  });
});

Deno.test("IP assignment workflow", async (t) => {
  await t.step("sequential IP assignment in CIDR range", () => {
    const cidr = parseCidr6("fd00::/125"); // 8 IPs: fd00::0 to fd00::7

    const firstAddr = cidr6FirstAddress(cidr);
    const lastAddr = cidr6LastAddress(cidr);

    let currentIp = firstAddr + 1n;
    const assigned: string[] = [];

    while (currentIp < lastAddr) {
      assertEquals(cidr6Contains(cidr, currentIp), true);
      assigned.push(stringifyIpv6(currentIp));
      currentIp = currentIp + 1n;
    }

    assertEquals(assigned, [
      "fd00::1",
      "fd00::2",
      "fd00::3",
      "fd00::4",
      "fd00::5",
      "fd00::6",
    ]);
  });

  await t.step("verify first and last address are in range", () => {
    const cidr = parseCidr6("2001:db8::/64");

    assertEquals(cidr6Contains(cidr, cidr6FirstAddress(cidr)), true);
    assertEquals(cidr6Contains(cidr, cidr6LastAddress(cidr)), true);
  });

  await t.step("arithmetic operations on IPs", () => {
    const ip = parseIpv6("2001:db8::a");

    assertEquals(stringifyIpv6(ip + 1n), "2001:db8::b");
    assertEquals(stringifyIpv6(ip - 1n), "2001:db8::9");
    assertEquals(stringifyIpv6(ip + 10n), "2001:db8::14");

    // Crossing group boundary
    assertEquals(
      stringifyIpv6(parseIpv6("2001:db8::ffff") + 1n),
      "2001:db8::1:0",
    );
  });
});

Deno.test("cidr6Addresses", async (t) => {
  await t.step("default behavior - iterates from offset 0", () => {
    const cidr = parseCidr6("fd00::/125"); // 8 IPs: ::0 to ::7

    // Default: offset=0, no count limit, step=1
    const all = Array.from(cidr6Addresses(cidr));

    assertEquals(all.map(stringifyIpv6), [
      "fd00::",
      "fd00::1",
      "fd00::2",
      "fd00::3",
      "fd00::4",
      "fd00::5",
      "fd00::6",
      "fd00::7",
    ]);
    assertEquals(all.length, 8);
  });

  await t.step("iterates from offset 1 (skip network address)", () => {
    const cidr = parseCidr6("fd00::/125"); // 8 IPs

    const usable = Array.from(cidr6Addresses(cidr, { offset: 1 }));

    assertEquals(usable.length, 7);
    assertEquals(usable[0], parseIpv6("fd00::1"));
    assertEquals(usable[6], parseIpv6("fd00::7"));
  });

  await t.step("generates addresses from network address", () => {
    const cidr = parseCidr6("2001:db8::/120");

    const addresses = Array.from(
      cidr6Addresses(cidr, { offset: 0, count: 3, step: 1 }),
    );

    assertEquals(addresses, [
      parseIpv6("2001:db8::0"),
      parseIpv6("2001:db8::1"),
      parseIpv6("2001:db8::2"),
    ]);
  });

  await t.step("generates addresses from offset", () => {
    const cidr = parseCidr6("2001:db8::/120");

    const addresses = Array.from(
      cidr6Addresses(cidr, { offset: 10, count: 5, step: 1 }),
    );

    assertEquals(addresses, [
      parseIpv6("2001:db8::a"),
      parseIpv6("2001:db8::b"),
      parseIpv6("2001:db8::c"),
      parseIpv6("2001:db8::d"),
      parseIpv6("2001:db8::e"),
    ]);
  });

  await t.step("handles empty count", () => {
    const cidr = parseCidr6("2001:db8::/64");

    const addresses = Array.from(
      cidr6Addresses(cidr, { offset: 0, count: 0, step: 1 }),
    );

    assertEquals(addresses, []);
  });

  await t.step("handles single address", () => {
    const cidr = parseCidr6("2001:db8::/120");

    const addresses = Array.from(
      cidr6Addresses(cidr, { offset: 100, count: 1, step: 1 }),
    );

    assertEquals(addresses, [parseIpv6("2001:db8::64")]);
  });

  await t.step("accepts bigint parameters", () => {
    const cidr = parseCidr6("2001:db8::/120");

    const addresses = Array.from(
      cidr6Addresses(cidr, { offset: 5n, count: 3n, step: 1n }),
    );

    assertEquals(addresses, [
      parseIpv6("2001:db8::5"),
      parseIpv6("2001:db8::6"),
      parseIpv6("2001:db8::7"),
    ]);
  });

  await t.step("custom step - even addresses", () => {
    const cidr = parseCidr6("fd00::/120");

    const evenIps = Array.from(
      cidr6Addresses(cidr, { offset: 0, count: 5, step: 2 }),
    );

    assertEquals(evenIps, [
      parseIpv6("fd00::0"),
      parseIpv6("fd00::2"),
      parseIpv6("fd00::4"),
      parseIpv6("fd00::6"),
      parseIpv6("fd00::8"),
    ]);
  });

  await t.step("custom step - odd addresses", () => {
    const cidr = parseCidr6("fd00::/120");

    const oddIps = Array.from(
      cidr6Addresses(cidr, { offset: 1, count: 5, step: 2 }),
    );

    assertEquals(oddIps, [
      parseIpv6("fd00::1"),
      parseIpv6("fd00::3"),
      parseIpv6("fd00::5"),
      parseIpv6("fd00::7"),
      parseIpv6("fd00::9"),
    ]);
  });

  await t.step("negative step - reverse iteration", () => {
    const cidr = parseCidr6("fd00::/120");

    const backwards = Array.from(
      cidr6Addresses(cidr, { offset: 10, count: 5, step: -1 }),
    );

    assertEquals(backwards, [
      parseIpv6("fd00::a"),
      parseIpv6("fd00::9"),
      parseIpv6("fd00::8"),
      parseIpv6("fd00::7"),
      parseIpv6("fd00::6"),
    ]);
  });

  await t.step("stops at CIDR boundary - forward", () => {
    const cidr = parseCidr6("fd00::/125"); // Only 8 IPs: ::0 to ::7

    const ips = Array.from(
      cidr6Addresses(cidr, { offset: 5, count: 10, step: 1 }),
    );

    assertEquals(ips.length, 3);
    assertEquals(ips, [
      parseIpv6("fd00::5"),
      parseIpv6("fd00::6"),
      parseIpv6("fd00::7"),
    ]);
  });

  await t.step("stops at CIDR boundary - backward", () => {
    const cidr = parseCidr6("fd00::/125"); // ::0 to ::7

    const ips = Array.from(
      cidr6Addresses(cidr, { offset: 3, count: 10, step: -1 }),
    );

    assertEquals(ips.length, 4);
    assertEquals(ips, [
      parseIpv6("fd00::3"),
      parseIpv6("fd00::2"),
      parseIpv6("fd00::1"),
      parseIpv6("fd00::0"),
    ]);
  });

  await t.step("starting outside CIDR range returns empty", () => {
    const cidr = parseCidr6("fd00::/125"); // ::0 to ::7

    const ips = Array.from(
      cidr6Addresses(cidr, { offset: 10, count: 5, step: 1 }),
    );

    assertEquals(ips, []);
  });

  await t.step("generator - lazy iteration", () => {
    const cidr = parseCidr6("2001:db8::/64");

    const gen = cidr6Addresses(cidr, { offset: 0, count: 5, step: 1 });

    const first = gen.next();
    assertEquals(first.value, parseIpv6("2001:db8::"));
    assertEquals(first.done, false);

    const second = gen.next();
    assertEquals(second.value, parseIpv6("2001:db8::1"));
    assertEquals(second.done, false);
  });
});

Deno.test("WireGuard IPv6 use cases", async (t) => {
  await t.step("fd00::/8 unique local address allocation", () => {
    const cidr = parseCidr6("fd00::/120");

    const peers = Array.from(
      cidr6Addresses(cidr, { offset: 1, count: 10, step: 1 }),
    );

    assertEquals(peers.length, 10);
    assertEquals(stringifyIpv6(peers[0]), "fd00::1");
    assertEquals(stringifyIpv6(peers[9]), "fd00::a");
  });

  await t.step("link-local scope", () => {
    const cidr = parseCidr6("fe80::/10");

    assertEquals(cidr6Contains(cidr, parseIpv6("fe80::1")), true);
    assertEquals(cidr6Contains(cidr, parseIpv6("febf::ffff")), true);
    assertEquals(cidr6Contains(cidr, parseIpv6("fec0::")), false);
  });

  await t.step("verify peer addresses in mesh", () => {
    const meshCidr = parseCidr6("fd00:abcd::/120");

    const peerAddresses = [
      "fd00:abcd::1",
      "fd00:abcd::2",
      "fd00:abcd::3",
      "fd00:abcd::10",
      "fd00:abcd::ff",
    ];

    for (const addr of peerAddresses) {
      assertEquals(cidr6Contains(meshCidr, parseIpv6(addr)), true);
    }

    assertEquals(cidr6Contains(meshCidr, parseIpv6("fd00:abcd::100")), false);
  });
});
