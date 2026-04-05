import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  cidrv4Addresses,
  cidrv4BroadcastAddress,
  cidrv4Contains,
  cidrv4ContainsCidr,
  cidrv4Intersect,
  cidrv4NetworkAddress,
  cidrv4Mask,
  cidrv4Overlaps,
  cidrv4Subtract,
  parseCidrv4,
  stringifyCidrv4,
} from "./cidrv4.ts";
import { parseIpv4, stringifyIpv4 } from "./ipv4.ts";
import { isValidCidrv4 } from "./validatev4.ts";

Deno.test("cidrv4Mask", async (t) => {
  await t.step("common prefix lengths", () => {
    assertEquals(cidrv4Mask(24), 0xFFFFFF00);
    assertEquals(cidrv4Mask(16), 0xFFFF0000);
    assertEquals(cidrv4Mask(8), 0xFF000000);
  });

  await t.step("edge cases", () => {
    assertEquals(cidrv4Mask(0), 0);
    assertEquals(cidrv4Mask(32), 0xFFFFFFFF);
  });

  await t.step("various prefix lengths", () => {
    assertEquals(cidrv4Mask(1), 0x80000000);
    assertEquals(cidrv4Mask(30), 0xFFFFFFFC);
    assertEquals(cidrv4Mask(31), 0xFFFFFFFE);
  });

  await t.step("out of range prefix lengths", () => {
    assertThrows(
      () => cidrv4Mask(-1),
      RangeError,
      "CIDR prefix length must be 0-32, got -1",
    );
    assertThrows(
      () => cidrv4Mask(33),
      RangeError,
      "CIDR prefix length must be 0-32, got 33",
    );
  });
});

Deno.test("parseCidrv4", async (t) => {
  await t.step("valid CIDR notation", () => {
    const cidr = parseCidrv4("192.168.1.0/24");
    assertEquals(cidr.address, parseIpv4("192.168.1.0"));
    assertEquals(cidr.prefixLength, 24);
  });

  await t.step("various prefix lengths", () => {
    const cidr8 = parseCidrv4("10.0.0.0/8");
    assertEquals(cidr8.address, parseIpv4("10.0.0.0"));
    assertEquals(cidr8.prefixLength, 8);

    const cidr16 = parseCidrv4("172.16.0.0/16");
    assertEquals(cidr16.address, parseIpv4("172.16.0.0"));
    assertEquals(cidr16.prefixLength, 16);

    const cidr32 = parseCidrv4("192.168.1.1/32");
    assertEquals(cidr32.address, parseIpv4("192.168.1.1"));
    assertEquals(cidr32.prefixLength, 32);
  });

  await t.step("preserves original address", () => {
    // Address is preserved as-is, even if it doesn't match the network address
    const cidr = parseCidrv4("192.168.1.100/24");
    assertEquals(cidr.address, parseIpv4("192.168.1.100"));
    assertEquals(cidr.prefixLength, 24);
  });

  await t.step("invalid format", () => {
    assertThrows(
      () => parseCidrv4("192.168.1.0"),
      TypeError,
      "CIDR notation must be in format '<address>/<prefix>', got 1 parts",
    );
    assertThrows(
      () => parseCidrv4("192.168.1.0/24/extra"),
      TypeError,
      "CIDR notation must be in format '<address>/<prefix>', got 3 parts",
    );
  });

  await t.step("invalid prefix length", () => {
    assertThrows(
      () => parseCidrv4("192.168.1.0/33"),
      RangeError,
      "CIDR prefix length must be 0-32",
    );
    assertThrows(
      () => parseCidrv4("192.168.1.0/-1"),
      RangeError,
      "CIDR prefix length must be 0-32",
    );
    assertThrows(
      () => parseCidrv4("192.168.1.0/abc"),
      TypeError,
      "CIDR prefix length must be a number",
    );
  });

  await t.step("invalid address", () => {
    assertThrows(
      () => parseCidrv4("256.0.0.0/24"),
      RangeError,
      "IPv4 octet out of range",
    );
    assertThrows(
      () => parseCidrv4("192.168.1/24"),
      TypeError,
      "IPv4 address must have exactly 4 octets",
    );
  });
});

Deno.test("stringifyCidrv4", async (t) => {
  await t.step("basic stringifying", () => {
    const cidr = parseCidrv4("192.168.1.0/24");
    assertEquals(stringifyCidrv4(cidr), "192.168.1.0/24");
  });

  await t.step("various CIDRs", () => {
    assertEquals(stringifyCidrv4(parseCidrv4("10.0.0.0/8")), "10.0.0.0/8");
    assertEquals(
      stringifyCidrv4(parseCidrv4("172.16.0.0/16")),
      "172.16.0.0/16",
    );
    assertEquals(
      stringifyCidrv4(parseCidrv4("192.168.1.1/32")),
      "192.168.1.1/32",
    );
  });

  await t.step("preserves original address", () => {
    // Even if address doesn't match network, it's preserved
    const cidr = parseCidrv4("192.168.1.100/24");
    assertEquals(stringifyCidrv4(cidr), "192.168.1.100/24");
  });
});

Deno.test("cidrv4Contains", async (t) => {
  await t.step("IP in range", () => {
    const cidr = parseCidrv4("192.168.1.0/24");

    assertEquals(cidrv4Contains(cidr, parseIpv4("192.168.1.0")), true);
    assertEquals(cidrv4Contains(cidr, parseIpv4("192.168.1.1")), true);
    assertEquals(cidrv4Contains(cidr, parseIpv4("192.168.1.100")), true);
    assertEquals(cidrv4Contains(cidr, parseIpv4("192.168.1.255")), true);
  });

  await t.step("IP out of range", () => {
    const cidr = parseCidrv4("192.168.1.0/24");

    assertEquals(cidrv4Contains(cidr, parseIpv4("192.168.0.255")), false);
    assertEquals(cidrv4Contains(cidr, parseIpv4("192.168.2.0")), false);
    assertEquals(cidrv4Contains(cidr, parseIpv4("10.0.0.1")), false);
  });

  await t.step("edge cases - /32 (single IP)", () => {
    const cidr = parseCidrv4("192.168.1.1/32");

    assertEquals(cidrv4Contains(cidr, parseIpv4("192.168.1.1")), true);
    assertEquals(cidrv4Contains(cidr, parseIpv4("192.168.1.0")), false);
    assertEquals(cidrv4Contains(cidr, parseIpv4("192.168.1.2")), false);
  });

  await t.step("edge cases - /0 (all IPs)", () => {
    const cidr = parseCidrv4("0.0.0.0/0");

    assertEquals(cidrv4Contains(cidr, parseIpv4("0.0.0.0")), true);
    assertEquals(cidrv4Contains(cidr, parseIpv4("192.168.1.1")), true);
    assertEquals(cidrv4Contains(cidr, parseIpv4("255.255.255.255")), true);
  });
});

Deno.test("cidrv4NetworkAddress", async (t) => {
  await t.step("returns network address", () => {
    const cidr = parseCidrv4("192.168.1.0/24");
    assertEquals(cidrv4NetworkAddress(cidr), parseIpv4("192.168.1.0"));
  });

  await t.step("various CIDRs", () => {
    assertEquals(
      cidrv4NetworkAddress(parseCidrv4("10.0.0.0/8")),
      parseIpv4("10.0.0.0"),
    );
    assertEquals(
      cidrv4NetworkAddress(parseCidrv4("172.16.0.0/16")),
      parseIpv4("172.16.0.0"),
    );
    assertEquals(
      cidrv4NetworkAddress(parseCidrv4("192.168.1.100/24")),
      parseIpv4("192.168.1.0"),
    );
  });
});

Deno.test("cidrv4BroadcastAddress", async (t) => {
  await t.step("returns broadcast address", () => {
    const cidr = parseCidrv4("192.168.1.0/24");
    assertEquals(cidrv4BroadcastAddress(cidr), parseIpv4("192.168.1.255"));
  });

  await t.step("various CIDRs", () => {
    assertEquals(
      cidrv4BroadcastAddress(parseCidrv4("10.0.0.0/8")),
      parseIpv4("10.255.255.255"),
    );
    assertEquals(
      cidrv4BroadcastAddress(parseCidrv4("172.16.0.0/16")),
      parseIpv4("172.16.255.255"),
    );
    assertEquals(
      cidrv4BroadcastAddress(parseCidrv4("192.168.1.1/32")),
      parseIpv4("192.168.1.1"),
    );
  });
});

Deno.test("IP assignment workflow", async (t) => {
  await t.step("sequential IP assignment in CIDR range", () => {
    const cidr = parseCidrv4("10.0.0.0/29"); // 8 IPs: 10.0.0.0 to 10.0.0.7

    const networkAddr = cidrv4NetworkAddress(cidr);
    const broadcastAddr = cidrv4BroadcastAddress(cidr);

    // Start from first usable IP (network + 1)
    let currentIp = networkAddr + 1;
    const assigned: string[] = [];

    // Assign IPs until broadcast (exclusive)
    while (currentIp < broadcastAddr) {
      assertEquals(cidrv4Contains(cidr, currentIp), true);
      assigned.push(stringifyIpv4(currentIp));
      currentIp = currentIp + 1;
    }

    // Should have assigned: 10.0.0.1, 10.0.0.2, ..., 10.0.0.6
    assertEquals(assigned, [
      "10.0.0.1",
      "10.0.0.2",
      "10.0.0.3",
      "10.0.0.4",
      "10.0.0.5",
      "10.0.0.6",
    ]);
  });

  await t.step("verify network and broadcast are in range", () => {
    const cidr = parseCidrv4("192.168.1.0/24");

    // Network address is in range
    assertEquals(cidrv4Contains(cidr, cidrv4NetworkAddress(cidr)), true);

    // Broadcast address is in range
    assertEquals(cidrv4Contains(cidr, cidrv4BroadcastAddress(cidr)), true);
  });

  await t.step("arithmetic operations on IPs", () => {
    const ip = parseIpv4("192.168.1.10");

    // Next IP
    assertEquals(stringifyIpv4(ip + 1), "192.168.1.11");

    // Previous IP
    assertEquals(stringifyIpv4(ip - 1), "192.168.1.9");

    // Add offset
    assertEquals(stringifyIpv4(ip + 10), "192.168.1.20");

    // Crossing octet boundary
    assertEquals(stringifyIpv4(parseIpv4("192.168.1.255") + 1), "192.168.2.0");
  });
});

Deno.test("cidrv4Addresses", async (t) => {
  await t.step("default behavior - iterates full range from offset 0", () => {
    const cidr = parseCidrv4("10.0.0.0/29"); // 8 IPs: .0 to .7

    // Default: offset=0, no count limit, step=1
    const all = Array.from(cidrv4Addresses(cidr));

    assertEquals(all.map(stringifyIpv4), [
      "10.0.0.0",
      "10.0.0.1",
      "10.0.0.2",
      "10.0.0.3",
      "10.0.0.4",
      "10.0.0.5",
      "10.0.0.6",
      "10.0.0.7",
    ]);
    assertEquals(all.length, 8);
  });

  await t.step("iterates from offset 1 (skip network address)", () => {
    const cidr = parseCidrv4("10.0.0.0/29"); // 8 IPs

    const usable = Array.from(cidrv4Addresses(cidr, { offset: 1 }));

    assertEquals(usable.length, 7);
    assertEquals(usable[0], parseIpv4("10.0.0.1"));
    assertEquals(usable[6], parseIpv4("10.0.0.7"));
  });

  await t.step("generates addresses from network address", () => {
    const cidr = parseCidrv4("192.168.1.0/24");

    const addresses = Array.from(
      cidrv4Addresses(cidr, { offset: 0, count: 3, step: 1 }),
    );

    assertEquals(addresses, [
      parseIpv4("192.168.1.0"),
      parseIpv4("192.168.1.1"),
      parseIpv4("192.168.1.2"),
    ]);
  });

  await t.step("generates addresses from offset", () => {
    const cidr = parseCidrv4("192.168.1.0/24");

    const addresses = Array.from(
      cidrv4Addresses(cidr, { offset: 10, count: 5, step: 1 }),
    );

    assertEquals(addresses, [
      parseIpv4("192.168.1.10"),
      parseIpv4("192.168.1.11"),
      parseIpv4("192.168.1.12"),
      parseIpv4("192.168.1.13"),
      parseIpv4("192.168.1.14"),
    ]);
  });

  await t.step("skips network address for usable IPs", () => {
    const cidr = parseCidrv4("10.0.0.0/29");

    // Skip network address (offset 1)
    const usableIps = Array.from(
      cidrv4Addresses(cidr, { offset: 1, count: 6, step: 1 }),
    );

    assertEquals(usableIps.map(stringifyIpv4), [
      "10.0.0.1",
      "10.0.0.2",
      "10.0.0.3",
      "10.0.0.4",
      "10.0.0.5",
      "10.0.0.6",
    ]);
  });

  await t.step("handles empty count", () => {
    const cidr = parseCidrv4("192.168.1.0/24");

    const addresses = Array.from(
      cidrv4Addresses(cidr, { offset: 0, count: 0, step: 1 }),
    );

    assertEquals(addresses, []);
  });

  await t.step("handles single address", () => {
    const cidr = parseCidrv4("192.168.1.0/24");

    const addresses = Array.from(
      cidrv4Addresses(cidr, { offset: 100, count: 1, step: 1 }),
    );

    assertEquals(addresses, [parseIpv4("192.168.1.100")]);
  });

  await t.step("works with different CIDR sizes", () => {
    const cidr8 = parseCidrv4("10.0.0.0/8");
    const cidr16 = parseCidrv4("172.16.0.0/16");
    const cidr32 = parseCidrv4("192.168.1.1/32");

    assertEquals(
      Array.from(cidrv4Addresses(cidr8, { offset: 0, count: 2, step: 1 }))[0],
      parseIpv4("10.0.0.0"),
    );
    assertEquals(
      Array.from(cidrv4Addresses(cidr16, { offset: 0, count: 2, step: 1 }))[0],
      parseIpv4("172.16.0.0"),
    );
    assertEquals(
      Array.from(cidrv4Addresses(cidr32, { offset: 0, count: 1, step: 1 }))[0],
      parseIpv4("192.168.1.1"),
    );
  });

  await t.step("accepts number parameters", () => {
    const cidr = parseCidrv4("192.168.1.0/24");

    const addresses = Array.from(
      cidrv4Addresses(cidr, { offset: 5, count: 3, step: 1 }),
    );

    assertEquals(addresses, [
      parseIpv4("192.168.1.5"),
      parseIpv4("192.168.1.6"),
      parseIpv4("192.168.1.7"),
    ]);
  });

  await t.step("batch IP allocation", () => {
    const cidr = parseCidrv4("172.16.0.0/24");

    const batch1 = Array.from(
      cidrv4Addresses(cidr, { offset: 1, count: 10, step: 1 }),
    );
    const batch2 = Array.from(
      cidrv4Addresses(cidr, { offset: 11, count: 10, step: 1 }),
    );
    const batch3 = Array.from(
      cidrv4Addresses(cidr, { offset: 21, count: 10, step: 1 }),
    );

    assertEquals(batch1.length, 10);
    assertEquals(batch2.length, 10);
    assertEquals(batch3.length, 10);

    assertEquals(batch1[0], parseIpv4("172.16.0.1"));
    assertEquals(batch1[9], parseIpv4("172.16.0.10"));

    assertEquals(batch2[0], parseIpv4("172.16.0.11"));
    assertEquals(batch2[9], parseIpv4("172.16.0.20"));

    assertEquals(batch3[0], parseIpv4("172.16.0.21"));
    assertEquals(batch3[9], parseIpv4("172.16.0.30"));
  });

  await t.step("large offset and count", () => {
    const cidr = parseCidrv4("10.0.0.0/16");

    const addresses = Array.from(
      cidrv4Addresses(cidr, { offset: 1000, count: 5, step: 1 }),
    );

    assertEquals(addresses[0], parseIpv4("10.0.3.232")); // 10.0.0.0 + 1000
    assertEquals(addresses[4], parseIpv4("10.0.3.236")); // 10.0.0.0 + 1004
  });

  await t.step("preserves non-aligned CIDR address", () => {
    const cidr = parseCidrv4("192.168.1.100/24");

    // Network address is still 192.168.1.0
    const addresses = Array.from(
      cidrv4Addresses(cidr, { offset: 0, count: 3, step: 1 }),
    );

    assertEquals(addresses, [
      parseIpv4("192.168.1.0"),
      parseIpv4("192.168.1.1"),
      parseIpv4("192.168.1.2"),
    ]);
  });

  await t.step("custom step - even addresses", () => {
    const cidr = parseCidrv4("192.168.1.0/24");

    const evenIps = Array.from(
      cidrv4Addresses(cidr, { offset: 0, count: 5, step: 2 }),
    );

    assertEquals(evenIps, [
      parseIpv4("192.168.1.0"),
      parseIpv4("192.168.1.2"),
      parseIpv4("192.168.1.4"),
      parseIpv4("192.168.1.6"),
      parseIpv4("192.168.1.8"),
    ]);
  });

  await t.step("custom step - odd addresses", () => {
    const cidr = parseCidrv4("192.168.1.0/24");

    const oddIps = Array.from(
      cidrv4Addresses(cidr, { offset: 1, count: 5, step: 2 }),
    );

    assertEquals(oddIps, [
      parseIpv4("192.168.1.1"),
      parseIpv4("192.168.1.3"),
      parseIpv4("192.168.1.5"),
      parseIpv4("192.168.1.7"),
      parseIpv4("192.168.1.9"),
    ]);
  });

  await t.step("custom step - larger increments", () => {
    const cidr = parseCidrv4("10.0.0.0/24");

    const ips = Array.from(
      cidrv4Addresses(cidr, { offset: 0, count: 5, step: 10 }),
    );

    assertEquals(ips, [
      parseIpv4("10.0.0.0"),
      parseIpv4("10.0.0.10"),
      parseIpv4("10.0.0.20"),
      parseIpv4("10.0.0.30"),
      parseIpv4("10.0.0.40"),
    ]);
  });

  await t.step("negative step - reverse iteration", () => {
    const cidr = parseCidrv4("192.168.1.0/24");

    const backwards = Array.from(
      cidrv4Addresses(cidr, { offset: 10, count: 5, step: -1 }),
    );

    assertEquals(backwards, [
      parseIpv4("192.168.1.10"),
      parseIpv4("192.168.1.9"),
      parseIpv4("192.168.1.8"),
      parseIpv4("192.168.1.7"),
      parseIpv4("192.168.1.6"),
    ]);
  });

  await t.step("negative step - from end of range", () => {
    const cidr = parseCidrv4("10.0.0.0/29"); // .0 to .7

    const backwards = Array.from(
      cidrv4Addresses(cidr, { offset: 7, count: 4, step: -2 }),
    );

    assertEquals(backwards, [
      parseIpv4("10.0.0.7"),
      parseIpv4("10.0.0.5"),
      parseIpv4("10.0.0.3"),
      parseIpv4("10.0.0.1"),
    ]);
  });

  await t.step("stops at CIDR boundary - forward", () => {
    const cidr = parseCidrv4("192.168.1.0/29"); // Only 8 IPs: .0 to .7

    // Request 10 IPs but only 3 are available from offset 5
    const ips = Array.from(
      cidrv4Addresses(cidr, { offset: 5, count: 10, step: 1 }),
    );

    assertEquals(ips.length, 3);
    assertEquals(ips, [
      parseIpv4("192.168.1.5"),
      parseIpv4("192.168.1.6"),
      parseIpv4("192.168.1.7"),
    ]);
  });

  await t.step("stops at CIDR boundary - backward", () => {
    const cidr = parseCidrv4("192.168.1.0/29"); // .0 to .7

    // Request 10 IPs going backwards but only 4 available from offset 3
    const ips = Array.from(
      cidrv4Addresses(cidr, { offset: 3, count: 10, step: -1 }),
    );

    assertEquals(ips.length, 4);
    assertEquals(ips, [
      parseIpv4("192.168.1.3"),
      parseIpv4("192.168.1.2"),
      parseIpv4("192.168.1.1"),
      parseIpv4("192.168.1.0"),
    ]);
  });

  await t.step("stops at CIDR boundary with large step", () => {
    const cidr = parseCidrv4("10.0.0.0/28"); // .0 to .15

    // Large step will quickly exceed CIDR range
    const ips = Array.from(
      cidrv4Addresses(cidr, { offset: 5, count: 10, step: 5 }),
    );

    assertEquals(ips.length, 3);
    assertEquals(ips, [
      parseIpv4("10.0.0.5"),
      parseIpv4("10.0.0.10"),
      parseIpv4("10.0.0.15"),
    ]);
  });

  await t.step("starting outside CIDR range returns empty", () => {
    const cidr = parseCidrv4("192.168.1.0/29"); // .0 to .7

    // Offset 10 is outside the /29 range
    const ips = Array.from(
      cidrv4Addresses(cidr, { offset: 10, count: 5, step: 1 }),
    );

    assertEquals(ips, []);
  });

  await t.step("negative offset with negative step", () => {
    const cidr = parseCidrv4("192.168.1.0/24");

    // Start at offset -5 (before network address)
    const ips = Array.from(
      cidrv4Addresses(cidr, { offset: -5, count: 3, step: -1 }),
    );

    // All addresses are outside the CIDR range
    assertEquals(ips, []);
  });

  await t.step("generator - lazy iteration", () => {
    const cidr = parseCidrv4("192.168.1.0/24");

    const gen = cidrv4Addresses(cidr, { offset: 0, count: 5, step: 1 });

    // Manually iterate to verify it's a generator
    const first = gen.next();
    assertEquals(first.value, parseIpv4("192.168.1.0"));
    assertEquals(first.done, false);

    const second = gen.next();
    assertEquals(second.value, parseIpv4("192.168.1.1"));
    assertEquals(second.done, false);
  });
});

Deno.test("cidrv4ContainsCidr", async (t) => {
  await t.step("larger CIDR contains smaller", () => {
    assert(
      cidrv4ContainsCidr(
        parseCidrv4("10.0.0.0/8"),
        parseCidrv4("10.1.0.0/16"),
      ),
    );
    assert(
      cidrv4ContainsCidr(
        parseCidrv4("192.168.0.0/16"),
        parseCidrv4("192.168.1.0/24"),
      ),
    );
  });

  await t.step("equal CIDRs contain each other", () => {
    const cidr = parseCidrv4("192.168.1.0/24");
    assert(cidrv4ContainsCidr(cidr, cidr));
  });

  await t.step("/0 contains everything", () => {
    const all = parseCidrv4("0.0.0.0/0");
    assert(cidrv4ContainsCidr(all, parseCidrv4("192.168.1.0/24")));
    assert(cidrv4ContainsCidr(all, parseCidrv4("10.0.0.1/32")));
    assert(cidrv4ContainsCidr(all, parseCidrv4("0.0.0.0/0")));
  });

  await t.step("/32 containment", () => {
    assert(
      cidrv4ContainsCidr(
        parseCidrv4("192.168.1.0/24"),
        parseCidrv4("192.168.1.1/32"),
      ),
    );
    assert(
      cidrv4ContainsCidr(
        parseCidrv4("192.168.1.1/32"),
        parseCidrv4("192.168.1.1/32"),
      ),
    );
  });

  await t.step("reversed containment returns false", () => {
    assertEquals(
      cidrv4ContainsCidr(
        parseCidrv4("10.1.0.0/16"),
        parseCidrv4("10.0.0.0/8"),
      ),
      false,
    );
    assertEquals(
      cidrv4ContainsCidr(
        parseCidrv4("192.168.1.0/24"),
        parseCidrv4("192.168.0.0/16"),
      ),
      false,
    );
  });

  await t.step("disjoint CIDRs return false", () => {
    assertEquals(
      cidrv4ContainsCidr(
        parseCidrv4("10.0.0.0/8"),
        parseCidrv4("172.16.0.0/12"),
      ),
      false,
    );
  });

  await t.step("different /32s return false", () => {
    assertEquals(
      cidrv4ContainsCidr(
        parseCidrv4("192.168.1.1/32"),
        parseCidrv4("192.168.1.2/32"),
      ),
      false,
    );
  });
});

Deno.test("cidrv4Overlaps", async (t) => {
  await t.step("supernet and subnet overlap", () => {
    assert(
      cidrv4Overlaps(parseCidrv4("10.0.0.0/8"), parseCidrv4("10.1.0.0/16")),
    );
  });

  await t.step("symmetric", () => {
    assert(
      cidrv4Overlaps(parseCidrv4("10.1.0.0/16"), parseCidrv4("10.0.0.0/8")),
    );
  });

  await t.step("equal CIDRs overlap", () => {
    assert(
      cidrv4Overlaps(
        parseCidrv4("192.168.1.0/24"),
        parseCidrv4("192.168.1.0/24"),
      ),
    );
  });

  await t.step("/0 overlaps everything", () => {
    const all = parseCidrv4("0.0.0.0/0");
    assert(cidrv4Overlaps(all, parseCidrv4("192.168.1.0/24")));
    assert(cidrv4Overlaps(all, parseCidrv4("10.0.0.1/32")));
  });

  await t.step("adjacent CIDRs do not overlap", () => {
    assertEquals(
      cidrv4Overlaps(
        parseCidrv4("192.168.0.0/24"),
        parseCidrv4("192.168.1.0/24"),
      ),
      false,
    );
  });

  await t.step("disjoint CIDRs do not overlap", () => {
    assertEquals(
      cidrv4Overlaps(
        parseCidrv4("10.0.0.0/8"),
        parseCidrv4("172.16.0.0/12"),
      ),
      false,
    );
  });

  await t.step("two halves of /24 do not overlap", () => {
    assertEquals(
      cidrv4Overlaps(
        parseCidrv4("192.168.1.0/25"),
        parseCidrv4("192.168.1.128/25"),
      ),
      false,
    );
  });
});

Deno.test("isValidCidrv4", async (t) => {
  await t.step("valid CIDR", () => {
    assert(isValidCidrv4("0.0.0.0/0"));
    assert(isValidCidrv4("192.168.1.0/24"));
    assert(isValidCidrv4("10.0.0.1/32"));
    assert(isValidCidrv4("172.16.0.0/12"));
  });

  await t.step("invalid CIDR", () => {
    assertEquals(isValidCidrv4(""), false);
    assertEquals(isValidCidrv4("192.168.1.0"), false);
    assertEquals(isValidCidrv4("192.168.1.0/33"), false);
    assertEquals(isValidCidrv4("192.168.1.0/-1"), false);
    assertEquals(isValidCidrv4("2001:db8::/32"), false);
    assertEquals(isValidCidrv4("abc/24"), false);
  });
});

Deno.test("cidrv4Intersect", async (t) => {
  await t.step("no overlap returns null", () => {
    assertEquals(
      cidrv4Intersect(parseCidrv4("10.0.0.0/24"), parseCidrv4("172.16.0.0/24")),
      null,
    );
  });

  await t.step("b inside a", () => {
    const result = cidrv4Intersect(
      parseCidrv4("192.168.1.0/24"),
      parseCidrv4("192.168.1.0/28"),
    );
    assertEquals(result && stringifyCidrv4(result), "192.168.1.0/28");
  });

  await t.step("a inside b", () => {
    const result = cidrv4Intersect(
      parseCidrv4("192.168.1.0/28"),
      parseCidrv4("192.168.1.0/24"),
    );
    assertEquals(result && stringifyCidrv4(result), "192.168.1.0/28");
  });

  await t.step("equal CIDRs", () => {
    const result = cidrv4Intersect(
      parseCidrv4("10.0.0.0/24"),
      parseCidrv4("10.0.0.0/24"),
    );
    assertEquals(result && stringifyCidrv4(result), "10.0.0.0/24");
  });

  await t.step("adjacent non-overlapping returns null", () => {
    assertEquals(
      cidrv4Intersect(
        parseCidrv4("192.168.1.0/25"),
        parseCidrv4("192.168.1.128/25"),
      ),
      null,
    );
  });

  await t.step("/0 and specific", () => {
    const result = cidrv4Intersect(
      parseCidrv4("0.0.0.0/0"),
      parseCidrv4("10.0.0.0/8"),
    );
    assertEquals(result && stringifyCidrv4(result), "10.0.0.0/8");
  });

  await t.step("both /32 same", () => {
    const result = cidrv4Intersect(
      parseCidrv4("10.0.0.1/32"),
      parseCidrv4("10.0.0.1/32"),
    );
    assertEquals(result && stringifyCidrv4(result), "10.0.0.1/32");
  });

  await t.step("both /32 different", () => {
    assertEquals(
      cidrv4Intersect(parseCidrv4("10.0.0.1/32"), parseCidrv4("10.0.0.2/32")),
      null,
    );
  });
});

Deno.test("cidrv4Subtract", async (t) => {
  await t.step("no overlap", () => {
    const result = cidrv4Subtract(
      parseCidrv4("10.0.0.0/24"),
      parseCidrv4("172.16.0.0/24"),
    );
    assertEquals(result.map(stringifyCidrv4), ["10.0.0.0/24"]);
  });

  await t.step("b contains a", () => {
    const result = cidrv4Subtract(
      parseCidrv4("192.168.1.0/28"),
      parseCidrv4("192.168.1.0/24"),
    );
    assertEquals(result, []);
  });

  await t.step("carve /28 from /24", () => {
    const result = cidrv4Subtract(
      parseCidrv4("192.168.1.0/24"),
      parseCidrv4("192.168.1.0/28"),
    );
    assertEquals(result.map(stringifyCidrv4), [
      "192.168.1.128/25",
      "192.168.1.64/26",
      "192.168.1.32/27",
      "192.168.1.16/28",
    ]);
  });

  await t.step("equal CIDRs", () => {
    const result = cidrv4Subtract(
      parseCidrv4("10.0.0.0/24"),
      parseCidrv4("10.0.0.0/24"),
    );
    assertEquals(result, []);
  });

  await t.step("/32 from /30", () => {
    const result = cidrv4Subtract(
      parseCidrv4("10.0.0.0/30"),
      parseCidrv4("10.0.0.0/32"),
    );
    assertEquals(result.map(stringifyCidrv4), [
      "10.0.0.2/31",
      "10.0.0.1/32",
    ]);
  });

  await t.step("/32 no overlap", () => {
    const result = cidrv4Subtract(
      parseCidrv4("10.0.0.1/32"),
      parseCidrv4("10.0.0.2/32"),
    );
    assertEquals(result.map(stringifyCidrv4), ["10.0.0.1/32"]);
  });

  await t.step("/32 exact match", () => {
    const result = cidrv4Subtract(
      parseCidrv4("10.0.0.1/32"),
      parseCidrv4("10.0.0.1/32"),
    );
    assertEquals(result, []);
  });

  await t.step("adjacent non-overlapping", () => {
    const result = cidrv4Subtract(
      parseCidrv4("192.168.1.0/25"),
      parseCidrv4("192.168.1.128/25"),
    );
    assertEquals(result.map(stringifyCidrv4), ["192.168.1.0/25"]);
  });

  await t.step("carve middle /26 from /24", () => {
    const result = cidrv4Subtract(
      parseCidrv4("192.168.1.0/24"),
      parseCidrv4("192.168.1.64/26"),
    );
    assertEquals(result.map(stringifyCidrv4), [
      "192.168.1.128/25",
      "192.168.1.0/26",
    ]);
  });
});
