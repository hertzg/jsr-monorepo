import { assertEquals, assertThrows } from "@std/assert";
import {
  cidr4Addresses,
  cidr4BroadcastAddress,
  cidr4Contains,
  cidr4NetworkAddress,
  maskFromPrefixLength,
  parseCidr4,
  stringifyCidr4,
} from "./cidrv4.ts";
import { parseIpv4, stringifyIpv4 } from "./ipv4.ts";

Deno.test("maskFromPrefixLength", async (t) => {
  await t.step("common prefix lengths", () => {
    assertEquals(maskFromPrefixLength(24), 0xFFFFFF00);
    assertEquals(maskFromPrefixLength(16), 0xFFFF0000);
    assertEquals(maskFromPrefixLength(8), 0xFF000000);
  });

  await t.step("edge cases", () => {
    assertEquals(maskFromPrefixLength(0), 0);
    assertEquals(maskFromPrefixLength(32), 0xFFFFFFFF);
  });

  await t.step("various prefix lengths", () => {
    assertEquals(maskFromPrefixLength(1), 0x80000000);
    assertEquals(maskFromPrefixLength(30), 0xFFFFFFFC);
    assertEquals(maskFromPrefixLength(31), 0xFFFFFFFE);
  });

  await t.step("out of range prefix lengths", () => {
    assertThrows(
      () => maskFromPrefixLength(-1),
      RangeError,
      "CIDR prefix length must be 0-32, got -1",
    );
    assertThrows(
      () => maskFromPrefixLength(33),
      RangeError,
      "CIDR prefix length must be 0-32, got 33",
    );
  });
});

Deno.test("parseCidr4", async (t) => {
  await t.step("valid CIDR notation", () => {
    const cidr = parseCidr4("192.168.1.0/24");
    assertEquals(cidr.address, parseIpv4("192.168.1.0"));
    assertEquals(cidr.prefixLength, 24);
  });

  await t.step("various prefix lengths", () => {
    const cidr8 = parseCidr4("10.0.0.0/8");
    assertEquals(cidr8.address, parseIpv4("10.0.0.0"));
    assertEquals(cidr8.prefixLength, 8);

    const cidr16 = parseCidr4("172.16.0.0/16");
    assertEquals(cidr16.address, parseIpv4("172.16.0.0"));
    assertEquals(cidr16.prefixLength, 16);

    const cidr32 = parseCidr4("192.168.1.1/32");
    assertEquals(cidr32.address, parseIpv4("192.168.1.1"));
    assertEquals(cidr32.prefixLength, 32);
  });

  await t.step("preserves original address", () => {
    // Address is preserved as-is, even if it doesn't match the network address
    const cidr = parseCidr4("192.168.1.100/24");
    assertEquals(cidr.address, parseIpv4("192.168.1.100"));
    assertEquals(cidr.prefixLength, 24);
  });

  await t.step("invalid format", () => {
    assertThrows(
      () => parseCidr4("192.168.1.0"),
      TypeError,
      "CIDR notation must be in format '<address>/<prefix>', got 1 parts",
    );
    assertThrows(
      () => parseCidr4("192.168.1.0/24/extra"),
      TypeError,
      "CIDR notation must be in format '<address>/<prefix>', got 3 parts",
    );
  });

  await t.step("invalid prefix length", () => {
    assertThrows(
      () => parseCidr4("192.168.1.0/33"),
      RangeError,
      "CIDR prefix length must be 0-32",
    );
    assertThrows(
      () => parseCidr4("192.168.1.0/-1"),
      RangeError,
      "CIDR prefix length must be 0-32",
    );
    assertThrows(
      () => parseCidr4("192.168.1.0/abc"),
      TypeError,
      "CIDR prefix length must be a number",
    );
  });

  await t.step("invalid address", () => {
    assertThrows(
      () => parseCidr4("256.0.0.0/24"),
      RangeError,
      "IPv4 octet out of range",
    );
    assertThrows(
      () => parseCidr4("192.168.1/24"),
      TypeError,
      "IPv4 address must have exactly 4 octets",
    );
  });
});

Deno.test("stringifyCidr4", async (t) => {
  await t.step("basic stringifying", () => {
    const cidr = parseCidr4("192.168.1.0/24");
    assertEquals(stringifyCidr4(cidr), "192.168.1.0/24");
  });

  await t.step("various CIDRs", () => {
    assertEquals(stringifyCidr4(parseCidr4("10.0.0.0/8")), "10.0.0.0/8");
    assertEquals(
      stringifyCidr4(parseCidr4("172.16.0.0/16")),
      "172.16.0.0/16",
    );
    assertEquals(
      stringifyCidr4(parseCidr4("192.168.1.1/32")),
      "192.168.1.1/32",
    );
  });

  await t.step("preserves original address", () => {
    // Even if address doesn't match network, it's preserved
    const cidr = parseCidr4("192.168.1.100/24");
    assertEquals(stringifyCidr4(cidr), "192.168.1.100/24");
  });
});

Deno.test("cidr4Contains", async (t) => {
  await t.step("IP in range", () => {
    const cidr = parseCidr4("192.168.1.0/24");

    assertEquals(cidr4Contains(cidr, parseIpv4("192.168.1.0")), true);
    assertEquals(cidr4Contains(cidr, parseIpv4("192.168.1.1")), true);
    assertEquals(cidr4Contains(cidr, parseIpv4("192.168.1.100")), true);
    assertEquals(cidr4Contains(cidr, parseIpv4("192.168.1.255")), true);
  });

  await t.step("IP out of range", () => {
    const cidr = parseCidr4("192.168.1.0/24");

    assertEquals(cidr4Contains(cidr, parseIpv4("192.168.0.255")), false);
    assertEquals(cidr4Contains(cidr, parseIpv4("192.168.2.0")), false);
    assertEquals(cidr4Contains(cidr, parseIpv4("10.0.0.1")), false);
  });

  await t.step("edge cases - /32 (single IP)", () => {
    const cidr = parseCidr4("192.168.1.1/32");

    assertEquals(cidr4Contains(cidr, parseIpv4("192.168.1.1")), true);
    assertEquals(cidr4Contains(cidr, parseIpv4("192.168.1.0")), false);
    assertEquals(cidr4Contains(cidr, parseIpv4("192.168.1.2")), false);
  });

  await t.step("edge cases - /0 (all IPs)", () => {
    const cidr = parseCidr4("0.0.0.0/0");

    assertEquals(cidr4Contains(cidr, parseIpv4("0.0.0.0")), true);
    assertEquals(cidr4Contains(cidr, parseIpv4("192.168.1.1")), true);
    assertEquals(cidr4Contains(cidr, parseIpv4("255.255.255.255")), true);
  });
});

Deno.test("cidr4NetworkAddress", async (t) => {
  await t.step("returns network address", () => {
    const cidr = parseCidr4("192.168.1.0/24");
    assertEquals(cidr4NetworkAddress(cidr), parseIpv4("192.168.1.0"));
  });

  await t.step("various CIDRs", () => {
    assertEquals(
      cidr4NetworkAddress(parseCidr4("10.0.0.0/8")),
      parseIpv4("10.0.0.0"),
    );
    assertEquals(
      cidr4NetworkAddress(parseCidr4("172.16.0.0/16")),
      parseIpv4("172.16.0.0"),
    );
    assertEquals(
      cidr4NetworkAddress(parseCidr4("192.168.1.100/24")),
      parseIpv4("192.168.1.0"),
    );
  });
});

Deno.test("cidr4BroadcastAddress", async (t) => {
  await t.step("returns broadcast address", () => {
    const cidr = parseCidr4("192.168.1.0/24");
    assertEquals(cidr4BroadcastAddress(cidr), parseIpv4("192.168.1.255"));
  });

  await t.step("various CIDRs", () => {
    assertEquals(
      cidr4BroadcastAddress(parseCidr4("10.0.0.0/8")),
      parseIpv4("10.255.255.255"),
    );
    assertEquals(
      cidr4BroadcastAddress(parseCidr4("172.16.0.0/16")),
      parseIpv4("172.16.255.255"),
    );
    assertEquals(
      cidr4BroadcastAddress(parseCidr4("192.168.1.1/32")),
      parseIpv4("192.168.1.1"),
    );
  });
});

Deno.test("IP assignment workflow", async (t) => {
  await t.step("sequential IP assignment in CIDR range", () => {
    const cidr = parseCidr4("10.0.0.0/29"); // 8 IPs: 10.0.0.0 to 10.0.0.7

    const networkAddr = cidr4NetworkAddress(cidr);
    const broadcastAddr = cidr4BroadcastAddress(cidr);

    // Start from first usable IP (network + 1)
    let currentIp = networkAddr + 1;
    const assigned: string[] = [];

    // Assign IPs until broadcast (exclusive)
    while (currentIp < broadcastAddr) {
      assertEquals(cidr4Contains(cidr, currentIp), true);
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
    const cidr = parseCidr4("192.168.1.0/24");

    // Network address is in range
    assertEquals(cidr4Contains(cidr, cidr4NetworkAddress(cidr)), true);

    // Broadcast address is in range
    assertEquals(cidr4Contains(cidr, cidr4BroadcastAddress(cidr)), true);
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

Deno.test("cidr4Addresses", async (t) => {
  await t.step("default behavior - iterates full range from offset 1", () => {
    const cidr = parseCidr4("10.0.0.0/29"); // 8 IPs: .0 to .7

    // Default: offset=1, no count limit, step=1
    const allUsable = Array.from(cidr4Addresses(cidr));

    assertEquals(allUsable.map(stringifyIpv4), [
      "10.0.0.1",
      "10.0.0.2",
      "10.0.0.3",
      "10.0.0.4",
      "10.0.0.5",
      "10.0.0.6",
      "10.0.0.7",
    ]);
  });

  await t.step("iterates full range from offset 0", () => {
    const cidr = parseCidr4("10.0.0.0/29"); // 8 IPs

    const all = Array.from(cidr4Addresses(cidr, { offset: 0 }));

    assertEquals(all.length, 8);
    assertEquals(all[0], parseIpv4("10.0.0.0"));
    assertEquals(all[7], parseIpv4("10.0.0.7"));
  });

  await t.step("generates addresses from network address", () => {
    const cidr = parseCidr4("192.168.1.0/24");

    const addresses = Array.from(
      cidr4Addresses(cidr, { offset: 0, count: 3, step: 1 }),
    );

    assertEquals(addresses, [
      parseIpv4("192.168.1.0"),
      parseIpv4("192.168.1.1"),
      parseIpv4("192.168.1.2"),
    ]);
  });

  await t.step("generates addresses from offset", () => {
    const cidr = parseCidr4("192.168.1.0/24");

    const addresses = Array.from(
      cidr4Addresses(cidr, { offset: 10, count: 5, step: 1 }),
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
    const cidr = parseCidr4("10.0.0.0/29");

    // Skip network address (offset 1)
    const usableIps = Array.from(
      cidr4Addresses(cidr, { offset: 1, count: 6, step: 1 }),
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
    const cidr = parseCidr4("192.168.1.0/24");

    const addresses = Array.from(
      cidr4Addresses(cidr, { offset: 0, count: 0, step: 1 }),
    );

    assertEquals(addresses, []);
  });

  await t.step("handles single address", () => {
    const cidr = parseCidr4("192.168.1.0/24");

    const addresses = Array.from(
      cidr4Addresses(cidr, { offset: 100, count: 1, step: 1 }),
    );

    assertEquals(addresses, [parseIpv4("192.168.1.100")]);
  });

  await t.step("works with different CIDR sizes", () => {
    const cidr8 = parseCidr4("10.0.0.0/8");
    const cidr16 = parseCidr4("172.16.0.0/16");
    const cidr32 = parseCidr4("192.168.1.1/32");

    assertEquals(
      Array.from(cidr4Addresses(cidr8, { offset: 0, count: 2, step: 1 }))[0],
      parseIpv4("10.0.0.0"),
    );
    assertEquals(
      Array.from(cidr4Addresses(cidr16, { offset: 0, count: 2, step: 1 }))[0],
      parseIpv4("172.16.0.0"),
    );
    assertEquals(
      Array.from(cidr4Addresses(cidr32, { offset: 0, count: 1, step: 1 }))[0],
      parseIpv4("192.168.1.1"),
    );
  });

  await t.step("accepts number parameters", () => {
    const cidr = parseCidr4("192.168.1.0/24");

    const addresses = Array.from(
      cidr4Addresses(cidr, { offset: 5, count: 3, step: 1 }),
    );

    assertEquals(addresses, [
      parseIpv4("192.168.1.5"),
      parseIpv4("192.168.1.6"),
      parseIpv4("192.168.1.7"),
    ]);
  });

  await t.step("batch IP allocation", () => {
    const cidr = parseCidr4("172.16.0.0/24");

    const batch1 = Array.from(
      cidr4Addresses(cidr, { offset: 1, count: 10, step: 1 }),
    );
    const batch2 = Array.from(
      cidr4Addresses(cidr, { offset: 11, count: 10, step: 1 }),
    );
    const batch3 = Array.from(
      cidr4Addresses(cidr, { offset: 21, count: 10, step: 1 }),
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
    const cidr = parseCidr4("10.0.0.0/16");

    const addresses = Array.from(
      cidr4Addresses(cidr, { offset: 1000, count: 5, step: 1 }),
    );

    assertEquals(addresses[0], parseIpv4("10.0.3.232")); // 10.0.0.0 + 1000
    assertEquals(addresses[4], parseIpv4("10.0.3.236")); // 10.0.0.0 + 1004
  });

  await t.step("preserves non-aligned CIDR address", () => {
    const cidr = parseCidr4("192.168.1.100/24");

    // Network address is still 192.168.1.0
    const addresses = Array.from(
      cidr4Addresses(cidr, { offset: 0, count: 3, step: 1 }),
    );

    assertEquals(addresses, [
      parseIpv4("192.168.1.0"),
      parseIpv4("192.168.1.1"),
      parseIpv4("192.168.1.2"),
    ]);
  });

  await t.step("custom step - even addresses", () => {
    const cidr = parseCidr4("192.168.1.0/24");

    const evenIps = Array.from(
      cidr4Addresses(cidr, { offset: 0, count: 5, step: 2 }),
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
    const cidr = parseCidr4("192.168.1.0/24");

    const oddIps = Array.from(
      cidr4Addresses(cidr, { offset: 1, count: 5, step: 2 }),
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
    const cidr = parseCidr4("10.0.0.0/24");

    const ips = Array.from(
      cidr4Addresses(cidr, { offset: 0, count: 5, step: 10 }),
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
    const cidr = parseCidr4("192.168.1.0/24");

    const backwards = Array.from(
      cidr4Addresses(cidr, { offset: 10, count: 5, step: -1 }),
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
    const cidr = parseCidr4("10.0.0.0/29"); // .0 to .7

    const backwards = Array.from(
      cidr4Addresses(cidr, { offset: 7, count: 4, step: -2 }),
    );

    assertEquals(backwards, [
      parseIpv4("10.0.0.7"),
      parseIpv4("10.0.0.5"),
      parseIpv4("10.0.0.3"),
      parseIpv4("10.0.0.1"),
    ]);
  });

  await t.step("stops at CIDR boundary - forward", () => {
    const cidr = parseCidr4("192.168.1.0/29"); // Only 8 IPs: .0 to .7

    // Request 10 IPs but only 3 are available from offset 5
    const ips = Array.from(
      cidr4Addresses(cidr, { offset: 5, count: 10, step: 1 }),
    );

    assertEquals(ips.length, 3);
    assertEquals(ips, [
      parseIpv4("192.168.1.5"),
      parseIpv4("192.168.1.6"),
      parseIpv4("192.168.1.7"),
    ]);
  });

  await t.step("stops at CIDR boundary - backward", () => {
    const cidr = parseCidr4("192.168.1.0/29"); // .0 to .7

    // Request 10 IPs going backwards but only 4 available from offset 3
    const ips = Array.from(
      cidr4Addresses(cidr, { offset: 3, count: 10, step: -1 }),
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
    const cidr = parseCidr4("10.0.0.0/28"); // .0 to .15

    // Large step will quickly exceed CIDR range
    const ips = Array.from(
      cidr4Addresses(cidr, { offset: 5, count: 10, step: 5 }),
    );

    assertEquals(ips.length, 3);
    assertEquals(ips, [
      parseIpv4("10.0.0.5"),
      parseIpv4("10.0.0.10"),
      parseIpv4("10.0.0.15"),
    ]);
  });

  await t.step("starting outside CIDR range returns empty", () => {
    const cidr = parseCidr4("192.168.1.0/29"); // .0 to .7

    // Offset 10 is outside the /29 range
    const ips = Array.from(
      cidr4Addresses(cidr, { offset: 10, count: 5, step: 1 }),
    );

    assertEquals(ips, []);
  });

  await t.step("negative offset with negative step", () => {
    const cidr = parseCidr4("192.168.1.0/24");

    // Start at offset -5 (before network address)
    const ips = Array.from(
      cidr4Addresses(cidr, { offset: -5, count: 3, step: -1 }),
    );

    // All addresses are outside the CIDR range
    assertEquals(ips, []);
  });

  await t.step("generator - lazy iteration", () => {
    const cidr = parseCidr4("192.168.1.0/24");

    const gen = cidr4Addresses(cidr, { offset: 0, count: 5, step: 1 });

    // Manually iterate to verify it's a generator
    const first = gen.next();
    assertEquals(first.value, parseIpv4("192.168.1.0"));
    assertEquals(first.done, false);

    const second = gen.next();
    assertEquals(second.value, parseIpv4("192.168.1.1"));
    assertEquals(second.done, false);
  });
});
