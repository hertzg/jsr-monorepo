import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  cidrv6Addresses,
  cidrv6Contains,
  cidrv6ContainsCidr,
  cidrv6FirstAddress,
  cidrv6LastAddress,
  cidrv6Mask,
  cidrv6Overlaps,
  parseCidrv6,
  stringifyCidrv6,
} from "./cidrv6.ts";
import { parseIpv6, stringifyIpv6 } from "./ipv6.ts";
import { isValidCidrv6 } from "./validatev6.ts";

Deno.test("cidrv6Mask", async (t) => {
  await t.step("common prefix lengths", () => {
    assertEquals(
      cidrv6Mask(128),
      0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFn,
    );
    assertEquals(
      cidrv6Mask(64),
      0xFFFFFFFFFFFFFFFF0000000000000000n,
    );
    assertEquals(
      cidrv6Mask(48),
      0xFFFFFFFFFFFF00000000000000000000n,
    );
    assertEquals(
      cidrv6Mask(32),
      0xFFFFFFFF000000000000000000000000n,
    );
  });

  await t.step("edge cases", () => {
    assertEquals(cidrv6Mask(0), 0n);
    assertEquals(
      cidrv6Mask(128),
      0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFn,
    );
  });

  await t.step("various prefix lengths", () => {
    assertEquals(
      cidrv6Mask(1),
      0x80000000000000000000000000000000n,
    );
    assertEquals(
      cidrv6Mask(120),
      0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00n,
    );
    assertEquals(
      cidrv6Mask(127),
      0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEn,
    );
  });

  await t.step("out of range prefix lengths", () => {
    assertThrows(
      () => cidrv6Mask(-1),
      RangeError,
      "CIDR prefix length must be 0-128",
    );
    assertThrows(
      () => cidrv6Mask(129),
      RangeError,
      "CIDR prefix length must be 0-128",
    );
  });
});

Deno.test("parseCidrv6", async (t) => {
  await t.step("valid CIDR notation", () => {
    const cidr = parseCidrv6("2001:db8::/32");
    assertEquals(cidr.address, parseIpv6("2001:db8::"));
    assertEquals(cidr.prefixLength, 32);
  });

  await t.step("various prefix lengths", () => {
    const cidrv64 = parseCidrv6("2001:db8::/64");
    assertEquals(cidrv64.address, parseIpv6("2001:db8::"));
    assertEquals(cidrv64.prefixLength, 64);

    const cidr48 = parseCidrv6("2001:db8::/48");
    assertEquals(cidr48.address, parseIpv6("2001:db8::"));
    assertEquals(cidr48.prefixLength, 48);

    const cidr128 = parseCidrv6("2001:db8::1/128");
    assertEquals(cidr128.address, parseIpv6("2001:db8::1"));
    assertEquals(cidr128.prefixLength, 128);
  });

  await t.step("preserves original address", () => {
    const cidr = parseCidrv6("2001:db8::100/64");
    assertEquals(cidr.address, parseIpv6("2001:db8::100"));
    assertEquals(cidr.prefixLength, 64);
  });

  await t.step("invalid format", () => {
    assertThrows(
      () => parseCidrv6("2001:db8::"),
      TypeError,
      "CIDR notation must be in format '<address>/<prefix>'",
    );
    assertThrows(
      () => parseCidrv6("2001:db8::/"),
      TypeError,
      "CIDR prefix length must be specified",
    );
  });

  await t.step("invalid prefix length", () => {
    assertThrows(
      () => parseCidrv6("2001:db8::/129"),
      RangeError,
      "CIDR prefix length must be 0-128",
    );
    assertThrows(
      () => parseCidrv6("2001:db8::/-1"),
      RangeError,
      "CIDR prefix length must be 0-128",
    );
    assertThrows(
      () => parseCidrv6("2001:db8::/abc"),
      TypeError,
      "CIDR prefix length must be a number",
    );
  });

  await t.step("invalid address", () => {
    assertThrows(
      () => parseCidrv6("gggg::/32"),
      TypeError,
    );
  });
});

Deno.test("stringifyCidrv6", async (t) => {
  await t.step("basic stringifying", () => {
    const cidr = parseCidrv6("2001:db8::/32");
    assertEquals(stringifyCidrv6(cidr), "2001:db8::/32");
  });

  await t.step("various CIDRs", () => {
    assertEquals(stringifyCidrv6(parseCidrv6("fd00::/8")), "fd00::/8");
    assertEquals(stringifyCidrv6(parseCidrv6("2001:db8::/64")), "2001:db8::/64");
    assertEquals(
      stringifyCidrv6(parseCidrv6("2001:db8::1/128")),
      "2001:db8::1/128",
    );
  });

  await t.step("preserves original address", () => {
    const cidr = parseCidrv6("2001:db8::100/64");
    assertEquals(stringifyCidrv6(cidr), "2001:db8::100/64");
  });
});

Deno.test("cidrv6Contains", async (t) => {
  await t.step("IP in range", () => {
    const cidr = parseCidrv6("2001:db8::/32");

    assertEquals(cidrv6Contains(cidr, parseIpv6("2001:db8::")), true);
    assertEquals(cidrv6Contains(cidr, parseIpv6("2001:db8::1")), true);
    assertEquals(cidrv6Contains(cidr, parseIpv6("2001:db8:ffff::")), true);
    assertEquals(
      cidrv6Contains(cidr, parseIpv6("2001:db8:ffff:ffff:ffff:ffff:ffff:ffff")),
      true,
    );
  });

  await t.step("IP out of range", () => {
    const cidr = parseCidrv6("2001:db8::/32");

    assertEquals(cidrv6Contains(cidr, parseIpv6("2001:db7::")), false);
    assertEquals(cidrv6Contains(cidr, parseIpv6("2001:db9::")), false);
    assertEquals(cidrv6Contains(cidr, parseIpv6("fe80::1")), false);
  });

  await t.step("edge cases - /128 (single IP)", () => {
    const cidr = parseCidrv6("2001:db8::1/128");

    assertEquals(cidrv6Contains(cidr, parseIpv6("2001:db8::1")), true);
    assertEquals(cidrv6Contains(cidr, parseIpv6("2001:db8::")), false);
    assertEquals(cidrv6Contains(cidr, parseIpv6("2001:db8::2")), false);
  });

  await t.step("edge cases - /0 (all IPs)", () => {
    const cidr = parseCidrv6("::/0");

    assertEquals(cidrv6Contains(cidr, parseIpv6("::")), true);
    assertEquals(cidrv6Contains(cidr, parseIpv6("2001:db8::1")), true);
    assertEquals(
      cidrv6Contains(cidr, parseIpv6("ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff")),
      true,
    );
  });
});

Deno.test("cidrv6FirstAddress", async (t) => {
  await t.step("returns first address", () => {
    const cidr = parseCidrv6("2001:db8::/32");
    assertEquals(cidrv6FirstAddress(cidr), parseIpv6("2001:db8::"));
  });

  await t.step("various CIDRs", () => {
    assertEquals(
      cidrv6FirstAddress(parseCidrv6("fd00::/8")),
      parseIpv6("fd00::"),
    );
    assertEquals(
      cidrv6FirstAddress(parseCidrv6("2001:db8:abcd::/48")),
      parseIpv6("2001:db8:abcd::"),
    );
    assertEquals(
      cidrv6FirstAddress(parseCidrv6("2001:db8::100/64")),
      parseIpv6("2001:db8::"),
    );
  });
});

Deno.test("cidrv6LastAddress", async (t) => {
  await t.step("returns last address in range", () => {
    const cidr = parseCidrv6("fd00::/120");
    assertEquals(cidrv6LastAddress(cidr), parseIpv6("fd00::ff"));
  });

  await t.step("various CIDRs", () => {
    assertEquals(
      cidrv6LastAddress(parseCidrv6("2001:db8::/125")),
      parseIpv6("2001:db8::7"),
    );
    assertEquals(
      cidrv6LastAddress(parseCidrv6("2001:db8::1/128")),
      parseIpv6("2001:db8::1"),
    );
  });
});

Deno.test("IP assignment workflow", async (t) => {
  await t.step("sequential IP assignment in CIDR range", () => {
    const cidr = parseCidrv6("fd00::/125"); // 8 IPs: fd00::0 to fd00::7

    const firstAddr = cidrv6FirstAddress(cidr);
    const lastAddr = cidrv6LastAddress(cidr);

    let currentIp = firstAddr + 1n;
    const assigned: string[] = [];

    while (currentIp < lastAddr) {
      assertEquals(cidrv6Contains(cidr, currentIp), true);
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
    const cidr = parseCidrv6("2001:db8::/64");

    assertEquals(cidrv6Contains(cidr, cidrv6FirstAddress(cidr)), true);
    assertEquals(cidrv6Contains(cidr, cidrv6LastAddress(cidr)), true);
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

Deno.test("cidrv6Addresses", async (t) => {
  await t.step("default behavior - iterates from offset 0", () => {
    const cidr = parseCidrv6("fd00::/125"); // 8 IPs: ::0 to ::7

    // Default: offset=0, no count limit, step=1
    const all = Array.from(cidrv6Addresses(cidr));

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
    const cidr = parseCidrv6("fd00::/125"); // 8 IPs

    const usable = Array.from(cidrv6Addresses(cidr, { offset: 1 }));

    assertEquals(usable.length, 7);
    assertEquals(usable[0], parseIpv6("fd00::1"));
    assertEquals(usable[6], parseIpv6("fd00::7"));
  });

  await t.step("generates addresses from network address", () => {
    const cidr = parseCidrv6("2001:db8::/120");

    const addresses = Array.from(
      cidrv6Addresses(cidr, { offset: 0, count: 3, step: 1 }),
    );

    assertEquals(addresses, [
      parseIpv6("2001:db8::0"),
      parseIpv6("2001:db8::1"),
      parseIpv6("2001:db8::2"),
    ]);
  });

  await t.step("generates addresses from offset", () => {
    const cidr = parseCidrv6("2001:db8::/120");

    const addresses = Array.from(
      cidrv6Addresses(cidr, { offset: 10, count: 5, step: 1 }),
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
    const cidr = parseCidrv6("2001:db8::/64");

    const addresses = Array.from(
      cidrv6Addresses(cidr, { offset: 0, count: 0, step: 1 }),
    );

    assertEquals(addresses, []);
  });

  await t.step("handles single address", () => {
    const cidr = parseCidrv6("2001:db8::/120");

    const addresses = Array.from(
      cidrv6Addresses(cidr, { offset: 100, count: 1, step: 1 }),
    );

    assertEquals(addresses, [parseIpv6("2001:db8::64")]);
  });

  await t.step("accepts bigint parameters", () => {
    const cidr = parseCidrv6("2001:db8::/120");

    const addresses = Array.from(
      cidrv6Addresses(cidr, { offset: 5n, count: 3n, step: 1n }),
    );

    assertEquals(addresses, [
      parseIpv6("2001:db8::5"),
      parseIpv6("2001:db8::6"),
      parseIpv6("2001:db8::7"),
    ]);
  });

  await t.step("custom step - even addresses", () => {
    const cidr = parseCidrv6("fd00::/120");

    const evenIps = Array.from(
      cidrv6Addresses(cidr, { offset: 0, count: 5, step: 2 }),
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
    const cidr = parseCidrv6("fd00::/120");

    const oddIps = Array.from(
      cidrv6Addresses(cidr, { offset: 1, count: 5, step: 2 }),
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
    const cidr = parseCidrv6("fd00::/120");

    const backwards = Array.from(
      cidrv6Addresses(cidr, { offset: 10, count: 5, step: -1 }),
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
    const cidr = parseCidrv6("fd00::/125"); // Only 8 IPs: ::0 to ::7

    const ips = Array.from(
      cidrv6Addresses(cidr, { offset: 5, count: 10, step: 1 }),
    );

    assertEquals(ips.length, 3);
    assertEquals(ips, [
      parseIpv6("fd00::5"),
      parseIpv6("fd00::6"),
      parseIpv6("fd00::7"),
    ]);
  });

  await t.step("stops at CIDR boundary - backward", () => {
    const cidr = parseCidrv6("fd00::/125"); // ::0 to ::7

    const ips = Array.from(
      cidrv6Addresses(cidr, { offset: 3, count: 10, step: -1 }),
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
    const cidr = parseCidrv6("fd00::/125"); // ::0 to ::7

    const ips = Array.from(
      cidrv6Addresses(cidr, { offset: 10, count: 5, step: 1 }),
    );

    assertEquals(ips, []);
  });

  await t.step("generator - lazy iteration", () => {
    const cidr = parseCidrv6("2001:db8::/64");

    const gen = cidrv6Addresses(cidr, { offset: 0, count: 5, step: 1 });

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
    const cidr = parseCidrv6("fd00::/120");

    const peers = Array.from(
      cidrv6Addresses(cidr, { offset: 1, count: 10, step: 1 }),
    );

    assertEquals(peers.length, 10);
    assertEquals(stringifyIpv6(peers[0]), "fd00::1");
    assertEquals(stringifyIpv6(peers[9]), "fd00::a");
  });

  await t.step("link-local scope", () => {
    const cidr = parseCidrv6("fe80::/10");

    assertEquals(cidrv6Contains(cidr, parseIpv6("fe80::1")), true);
    assertEquals(cidrv6Contains(cidr, parseIpv6("febf::ffff")), true);
    assertEquals(cidrv6Contains(cidr, parseIpv6("fec0::")), false);
  });

  await t.step("verify peer addresses in mesh", () => {
    const meshCidr = parseCidrv6("fd00:abcd::/120");

    const peerAddresses = [
      "fd00:abcd::1",
      "fd00:abcd::2",
      "fd00:abcd::3",
      "fd00:abcd::10",
      "fd00:abcd::ff",
    ];

    for (const addr of peerAddresses) {
      assertEquals(cidrv6Contains(meshCidr, parseIpv6(addr)), true);
    }

    assertEquals(cidrv6Contains(meshCidr, parseIpv6("fd00:abcd::100")), false);
  });
});

Deno.test("cidrv6ContainsCidr", async (t) => {
  await t.step("larger CIDR contains smaller", () => {
    assert(
      cidrv6ContainsCidr(
        parseCidrv6("2001:db8::/32"),
        parseCidrv6("2001:db8:1::/48"),
      ),
    );
    assert(
      cidrv6ContainsCidr(
        parseCidrv6("fd00::/8"),
        parseCidrv6("fd00::/120"),
      ),
    );
  });

  await t.step("equal CIDRs contain each other", () => {
    const cidr = parseCidrv6("2001:db8::/64");
    assert(cidrv6ContainsCidr(cidr, cidr));
  });

  await t.step("/0 contains everything", () => {
    const all = parseCidrv6("::/0");
    assert(cidrv6ContainsCidr(all, parseCidrv6("2001:db8::/32")));
    assert(cidrv6ContainsCidr(all, parseCidrv6("::1/128")));
    assert(cidrv6ContainsCidr(all, parseCidrv6("::/0")));
  });

  await t.step("/128 containment", () => {
    assert(
      cidrv6ContainsCidr(
        parseCidrv6("2001:db8::/120"),
        parseCidrv6("2001:db8::1/128"),
      ),
    );
    assert(
      cidrv6ContainsCidr(
        parseCidrv6("2001:db8::1/128"),
        parseCidrv6("2001:db8::1/128"),
      ),
    );
  });

  await t.step("reversed containment returns false", () => {
    assertEquals(
      cidrv6ContainsCidr(
        parseCidrv6("2001:db8:1::/48"),
        parseCidrv6("2001:db8::/32"),
      ),
      false,
    );
    assertEquals(
      cidrv6ContainsCidr(
        parseCidrv6("fd00::/120"),
        parseCidrv6("fd00::/8"),
      ),
      false,
    );
  });

  await t.step("disjoint CIDRs return false", () => {
    assertEquals(
      cidrv6ContainsCidr(
        parseCidrv6("2001:db8::/32"),
        parseCidrv6("2001:db9::/32"),
      ),
      false,
    );
  });

  await t.step("different /128s return false", () => {
    assertEquals(
      cidrv6ContainsCidr(
        parseCidrv6("2001:db8::1/128"),
        parseCidrv6("2001:db8::2/128"),
      ),
      false,
    );
  });
});

Deno.test("cidrv6Overlaps", async (t) => {
  await t.step("supernet and subnet overlap", () => {
    assert(
      cidrv6Overlaps(parseCidrv6("2001:db8::/32"), parseCidrv6("2001:db8:1::/48")),
    );
  });

  await t.step("symmetric", () => {
    assert(
      cidrv6Overlaps(parseCidrv6("2001:db8:1::/48"), parseCidrv6("2001:db8::/32")),
    );
  });

  await t.step("equal CIDRs overlap", () => {
    assert(
      cidrv6Overlaps(
        parseCidrv6("fd00::/120"),
        parseCidrv6("fd00::/120"),
      ),
    );
  });

  await t.step("/0 overlaps everything", () => {
    const all = parseCidrv6("::/0");
    assert(cidrv6Overlaps(all, parseCidrv6("2001:db8::/32")));
    assert(cidrv6Overlaps(all, parseCidrv6("::1/128")));
  });

  await t.step("adjacent CIDRs do not overlap", () => {
    assertEquals(
      cidrv6Overlaps(
        parseCidrv6("2001:db8::/33"),
        parseCidrv6("2001:db8:8000::/33"),
      ),
      false,
    );
  });

  await t.step("disjoint CIDRs do not overlap", () => {
    assertEquals(
      cidrv6Overlaps(
        parseCidrv6("2001:db8::/32"),
        parseCidrv6("2001:db9::/32"),
      ),
      false,
    );
  });

  await t.step("two halves of /120 do not overlap", () => {
    assertEquals(
      cidrv6Overlaps(
        parseCidrv6("fd00::/121"),
        parseCidrv6("fd00::80/121"),
      ),
      false,
    );
  });
});

Deno.test("isValidCidrv6", async (t) => {
  await t.step("valid CIDR", () => {
    assert(isValidCidrv6("::/0"));
    assert(isValidCidrv6("2001:db8::/32"));
    assert(isValidCidrv6("::1/128"));
    assert(isValidCidrv6("fe80::/10"));
  });

  await t.step("invalid CIDR", () => {
    assertEquals(isValidCidrv6(""), false);
    assertEquals(isValidCidrv6("2001:db8::1"), false);
    assertEquals(isValidCidrv6("2001:db8::/129"), false);
    assertEquals(isValidCidrv6("192.168.1.0/24"), false);
    assertEquals(isValidCidrv6("abc/32"), false);
  });
});
