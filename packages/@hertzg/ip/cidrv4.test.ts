import { test } from "node:test";
import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  cidrv4Addresses,
  cidrv4BroadcastAddress,
  cidrv4Contains,
  cidrv4ContainsCidr,
  cidrv4FirstUsableAddress,
  cidrv4Intersect,
  cidrv4LastUsableAddress,
  cidrv4Mask,
  cidrv4Merge,
  cidrv4NetworkAddress,
  cidrv4Overlaps,
  cidrv4PrefixLength,
  cidrv4Size,
  cidrv4Subtract,
  cidrv4UsableAddresses,
  cidrv4UsableSize,
  compareCidrv4,
  parseCidrv4,
  stringifyCidrv4,
} from "./cidrv4.ts";
import { parseAddressv4, stringifyAddressv4 } from "./addressv4.ts";
import { isValidCidrv4 } from "./validatev4.ts";

test("cidrv4Mask", async (t) => {
  await t.test("common prefix lengths", () => {
    assertEquals(cidrv4Mask(24), 0xFFFFFF00);
    assertEquals(cidrv4Mask(16), 0xFFFF0000);
    assertEquals(cidrv4Mask(8), 0xFF000000);
  });

  await t.test("edge cases", () => {
    assertEquals(cidrv4Mask(0), 0);
    assertEquals(cidrv4Mask(32), 0xFFFFFFFF);
  });

  await t.test("various prefix lengths", () => {
    assertEquals(cidrv4Mask(1), 0x80000000);
    assertEquals(cidrv4Mask(30), 0xFFFFFFFC);
    assertEquals(cidrv4Mask(31), 0xFFFFFFFE);
  });

  await t.test("out of range prefix lengths", () => {
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

test("cidrv4PrefixLength", async (t) => {
  await t.test("common masks", () => {
    assertEquals(cidrv4PrefixLength(0xFFFFFF00), 24);
    assertEquals(cidrv4PrefixLength(0xFFFF0000), 16);
    assertEquals(cidrv4PrefixLength(0xFF000000), 8);
  });

  await t.test("edge cases", () => {
    assertEquals(cidrv4PrefixLength(0), 0);
    assertEquals(cidrv4PrefixLength(0xFFFFFFFF), 32);
  });

  await t.test("various masks", () => {
    assertEquals(cidrv4PrefixLength(0x80000000), 1);
    assertEquals(cidrv4PrefixLength(0xFFFFFFFC), 30);
    assertEquals(cidrv4PrefixLength(0xFFFFFFFE), 31);
  });

  await t.test("accepts dotted decimal notation", () => {
    assertEquals(cidrv4PrefixLength("255.255.255.0"), 24);
    assertEquals(cidrv4PrefixLength("255.255.0.0"), 16);
    assertEquals(cidrv4PrefixLength("255.0.0.0"), 8);
    assertEquals(cidrv4PrefixLength("255.255.255.252"), 30);
    assertEquals(cidrv4PrefixLength("0.0.0.0"), 0);
    assertEquals(cidrv4PrefixLength("255.255.255.255"), 32);
  });

  await t.test("both forms agree for every prefix length", () => {
    for (let prefixLength = 0; prefixLength <= 32; prefixLength++) {
      const mask = cidrv4Mask(prefixLength);
      assertEquals(
        cidrv4PrefixLength(stringifyAddressv4(mask)),
        cidrv4PrefixLength(mask),
      );
    }
  });

  await t.test("non-contiguous dotted decimal throws", () => {
    assertThrows(
      () => cidrv4PrefixLength("255.0.255.0"),
      TypeError,
      "IPv4 mask is not contiguous: 0xff00ff00",
    );
    assertThrows(() => cidrv4PrefixLength("0.0.0.255"), TypeError);
    assertThrows(() => cidrv4PrefixLength("255.255.255.1"), TypeError);
  });

  await t.test("malformed notation propagates parseAddressv4's errors", () => {
    assertThrows(
      () => cidrv4PrefixLength("255.255.255"),
      TypeError,
      "IPv4 address must have exactly 4 octets",
    );
    assertThrows(
      () => cidrv4PrefixLength("255.255.255.256"),
      RangeError,
      "IPv4 octet out of range",
    );
    assertThrows(() => cidrv4PrefixLength("255.255.255.01"), TypeError);
    assertThrows(() => cidrv4PrefixLength(""), TypeError);

    // The string overload reaches parseAddressv4, so a mask with surrounding
    // whitespace is malformed notation rather than a silent 24.
    assertThrows(() => cidrv4PrefixLength(" 255.255.255.0"), TypeError);
  });

  await t.test("a mask string is an address slot: no zone ID", () => {
    assertThrows(
      () => cidrv4PrefixLength("255.255.255.0%eth0"),
      TypeError,
      "IPv4 mask must not have a zone ID, got '255.255.255.0%eth0'",
    );
  });

  await t.test("non-contiguous masks throw", () => {
    assertThrows(
      () => cidrv4PrefixLength(0xFF00FF00),
      TypeError,
      "IPv4 mask is not contiguous: 0xff00ff00",
    );
    assertThrows(() => cidrv4PrefixLength(0xFFFFFF01), TypeError);
    assertThrows(() => cidrv4PrefixLength(0x7FFFFFFF), TypeError);
  });

  await t.test("wildcard (host) masks throw", () => {
    assertThrows(
      () => cidrv4PrefixLength(0x000000FF),
      TypeError,
      "IPv4 mask is not contiguous: 0x000000ff",
    );
    assertThrows(() => cidrv4PrefixLength(0x0000FFFF), TypeError);
  });

  await t.test("counts leading ones, not set bits", () => {
    // node-ip's bug: 0xFF00FF00 has 16 set bits but is not a /16 mask.
    assertThrows(() => cidrv4PrefixLength(0xFF00FF00), TypeError);
    assertEquals(cidrv4PrefixLength(0xFFFF0000), 16);
  });

  await t.test("round-trips with cidrv4Mask for every prefix length", () => {
    for (let prefixLength = 0; prefixLength <= 32; prefixLength++) {
      assertEquals(
        cidrv4PrefixLength(cidrv4Mask(prefixLength)),
        prefixLength,
      );
    }
  });

  await t.test("only cidrv4Mask outputs are accepted", () => {
    const contiguous = new Set(
      Array.from({ length: 33 }, (_, prefixLength) => cidrv4Mask(prefixLength)),
    );

    // Exhaustive over 32-bit space is too slow; sweep the low 16 bits
    // paired with every contiguous high half instead.
    for (let low = 0; low <= 0xFFFF; low++) {
      const mask = (0xFFFF0000 | low) >>> 0;
      let threw = false;
      try {
        cidrv4PrefixLength(mask);
      } catch {
        threw = true;
      }
      assertEquals(threw, !contiguous.has(mask));
    }
  });

  await t.test("out of range masks throw", () => {
    assertThrows(
      () => cidrv4PrefixLength(-1),
      RangeError,
      "IPv4 mask must be a 32-bit unsigned integer, got -1",
    );
    assertThrows(
      () => cidrv4PrefixLength(0x100000000),
      RangeError,
      "IPv4 mask must be a 32-bit unsigned integer, got 4294967296",
    );
  });

  await t.test("non-integer masks throw", () => {
    assertThrows(
      () => cidrv4PrefixLength(1.5),
      RangeError,
      "IPv4 mask must be a 32-bit unsigned integer, got 1.5",
    );
    assertThrows(
      () => cidrv4PrefixLength(NaN),
      RangeError,
      "IPv4 mask must be a 32-bit unsigned integer, got NaN",
    );
  });
});

test("parseCidrv4", async (t) => {
  await t.test("valid CIDR notation", () => {
    assertEquals(parseCidrv4("192.168.1.0/24"), {
      address: parseAddressv4("192.168.1.0").address,
      prefixLength: 24,
    });
  });

  await t.test("various prefix lengths", () => {
    assertEquals(parseCidrv4("10.0.0.0/8"), {
      address: parseAddressv4("10.0.0.0").address,
      prefixLength: 8,
    });
    assertEquals(parseCidrv4("172.16.0.0/16"), {
      address: parseAddressv4("172.16.0.0").address,
      prefixLength: 16,
    });
    assertEquals(parseCidrv4("192.168.1.1/32"), {
      address: parseAddressv4("192.168.1.1").address,
      prefixLength: 32,
    });
  });

  await t.test("preserves original address", () => {
    // Address is preserved as-is, even if it doesn't match the network address
    assertEquals(parseCidrv4("192.168.1.100/24"), {
      address: parseAddressv4("192.168.1.100").address,
      prefixLength: 24,
    });
  });

  await t.test("invalid format", () => {
    assertThrows(
      () => parseCidrv4("192.168.1.0"),
      TypeError,
      "CIDR notation must be in format '<address>/<prefix>', got '192.168.1.0'",
    );
    assertThrows(
      () => parseCidrv4("192.168.1.0/24/extra"),
      TypeError,
      "Notation must contain '/' at most once, got '192.168.1.0/24/extra'",
    );
  });

  await t.test("invalid prefix length", () => {
    assertThrows(
      () => parseCidrv4("192.168.1.0/33"),
      RangeError,
      "CIDR prefix length must be 0-32",
    );
    assertThrows(
      () => parseCidrv4("192.168.1.0/abc"),
      TypeError,
      "CIDR prefix length must be a number",
    );
  });

  await t.test("prefix length is digits with no leading zero", () => {
    assertThrows(() => parseCidrv4("10.0.0.0/08"), TypeError);
    assertThrows(() => parseCidrv4("10.0.0.0/008"), TypeError);
    assertThrows(() => parseCidrv4("10.0.0.0/8x"), TypeError);
    assertThrows(() => parseCidrv4("10.0.0.0/ 8"), TypeError);
    assertThrows(() => parseCidrv4("10.0.0.0/8\n"), TypeError);
    assertThrows(() => parseCidrv4("10.0.0.0/+8"), TypeError);
  });

  await t.test("rejects a signed prefix length as a malformed one", () => {
    assertThrows(
      () => parseCidrv4("192.168.1.0/-1"),
      TypeError,
      "CIDR prefix length must be a number, got '-1'",
    );

    // "-0" is the case a range check cannot catch on its own: -0 is
    // numerically 0, so it passes `0-32` and reaches the caller as a Cidrv4
    // whose prefixLength is a negative zero, which stringifies back to "/0".
    assertThrows(
      () => parseCidrv4("10.0.0.0/-0"),
      TypeError,
      "CIDR prefix length must be a number, got '-0'",
    );
  });

  await t.test("invalid address", () => {
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
    assertThrows(() => parseCidrv4("2001:db8::/32"), TypeError);
  });

  await t.test("prefix length range: 0 to 32, checked here", () => {
    assertEquals(parseCidrv4("10.0.0.0/0"), {
      address: 167772160,
      prefixLength: 0,
    });
    assertEquals(parseCidrv4("10.0.0.0/32"), {
      address: 167772160,
      prefixLength: 32,
    });
    assertThrows(() => parseCidrv4("10.0.0.0/33"), RangeError);
    assertThrows(() => parseCidrv4("10.0.0.0/128"), RangeError);
    assertThrows(
      () => parseCidrv4("10.0.0.0/99999999999999999999"),
      RangeError,
    );
  });

  await t.test("mask dialect: a dotted prefix is stored as a mask", () => {
    assertEquals(parseCidrv4("192.168.1.0/255.255.255.0"), {
      address: 3232235776,
      mask: 0xffffff00,
    });
    assertEquals(parseCidrv4("10.0.0.0/255.0.0.0"), {
      address: 167772160,
      mask: 0xff000000,
    });
    assertEquals(parseCidrv4("0.0.0.0/0.0.0.0"), { address: 0, mask: 0 });
    assertEquals(parseCidrv4("10.0.0.1/255.255.255.255"), {
      address: 167772161,
      mask: 0xffffffff,
    });
  });

  await t.test(
    "mask dialect: not range-checked, not required to be contiguous",
    () => {
      assertEquals(parseCidrv4("10.0.0.0/255.0.0.255"), {
        address: 167772160,
        mask: 0xff0000ff,
      });
      assertEquals(parseCidrv4("10.0.0.0/0.0.0.255"), {
        address: 167772160,
        mask: 0xff,
      });
    },
  );

  await t.test("mask dialect: the mask is scanned as an address", () => {
    assertThrows(() => parseCidrv4("10.0.0.0/255.0.0"), TypeError);
    assertThrows(() => parseCidrv4("10.0.0.0/255.0.0.256"), RangeError);
    assertThrows(() => parseCidrv4("10.0.0.0/255.0.0.0 "), TypeError);
    assertThrows(() => parseCidrv4("10.0.0.0/255.000.0.0"), TypeError);
  });

  await t.test(
    "mask dialect: an IPv6 mask does not agree with an IPv4 address",
    () => {
      assertThrows(
        () => parseCidrv4("10.0.0.0/ffff:ff00::"),
        TypeError,
        "IPv4 CIDR mask must be an IPv4 address, got 'ffff:ff00::'",
      );
      assertThrows(() => parseCidrv4("10.0.0.0/::"), TypeError);
      assertThrows(() => parseCidrv4("10.0.0.0/::ffff:255.0.0.0"), TypeError);
    },
  );

  await t.test("carries a zone ID verbatim, on either dialect", () => {
    assertEquals(parseCidrv4("10.155.101.0%ether1/24"), {
      address: 177956096,
      prefixLength: 24,
      zoneId: "ether1",
    });
    assertEquals(parseCidrv4("10.155.101.0%ether1/255.255.255.0"), {
      address: 177956096,
      mask: 0xffffff00,
      zoneId: "ether1",
    });
    assertEquals(parseCidrv4("10.0.0.0%25/8"), {
      address: 167772160,
      prefixLength: 8,
      zoneId: "25",
    });
  });

  await t.test("has no zoneId key when there is no zone", () => {
    assertEquals(Object.keys(parseCidrv4("10.0.0.0/8")), [
      "address",
      "prefixLength",
    ]);
  });

  await t.test("rejects a malformed zone ID or the wrong slot order", () => {
    assertThrows(() => parseCidrv4("10.0.0.0%/8"), TypeError);
    assertThrows(() => parseCidrv4("10.0.0.0% eth0/8"), TypeError);
    assertThrows(() => parseCidrv4("10.0.0.0%eth0%1/8"), TypeError);
    assertThrows(
      () => parseCidrv4("10.0.0.0/8%eth0"),
      TypeError,
      "Zone ID must precede the prefix",
    );
    assertThrows(() => parseCidrv4("10.0.0.0%eth0"), TypeError);
  });
});

test("stringifyCidrv4", async (t) => {
  await t.test("basic stringifying", () => {
    const cidr = parseCidrv4("192.168.1.0/24");
    assertEquals(stringifyCidrv4(cidr), "192.168.1.0/24");
  });

  await t.test("various CIDRs", () => {
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

  await t.test("preserves original address", () => {
    // Even if address doesn't match network, it's preserved
    const cidr = parseCidrv4("192.168.1.100/24");
    assertEquals(stringifyCidrv4(cidr), "192.168.1.100/24");
  });

  await t.test("a masked block is written with its mask", () => {
    assertEquals(
      stringifyCidrv4({ address: 167772160, mask: 0xff000000 }),
      "10.0.0.0/255.0.0.0",
    );
    assertEquals(
      stringifyCidrv4({ address: 167772160, mask: 0xff0000ff }),
      "10.0.0.0/255.0.0.255",
    );
    assertEquals(
      stringifyCidrv4(parseCidrv4("192.168.1.0/255.255.255.0")),
      "192.168.1.0/255.255.255.0",
    );
  });

  await t.test("a bare address gets the noun default, /32", () => {
    assertEquals(stringifyCidrv4(3232235777), "192.168.1.1/32");
    assertEquals(stringifyCidrv4(0), "0.0.0.0/32");
    assertEquals(stringifyCidrv4({ address: 3232235777 }), "192.168.1.1/32");
    assertEquals(
      stringifyCidrv4({ address: 3232235777, zoneId: "ether1" }),
      "192.168.1.1%ether1/32",
    );
  });

  await t.test("a zone ID goes between the address and the slash", () => {
    assertEquals(
      stringifyCidrv4({
        address: 3232235777,
        zoneId: "ether1",
        prefixLength: 24,
      }),
      "192.168.1.1%ether1/24",
    );
    assertEquals(
      stringifyCidrv4({
        address: 3232235777,
        zoneId: "ether1",
        mask: 0xffffff00,
      }),
      "192.168.1.1%ether1/255.255.255.0",
    );
    assertEquals(
      stringifyCidrv4(parseCidrv4("10.155.101.0%ether1/24")),
      "10.155.101.0%ether1/24",
    );
  });

  await t.test("an empty zone ID writes no %", () => {
    assertEquals(
      stringifyCidrv4({ address: 3232235777, zoneId: "", prefixLength: 24 }),
      "192.168.1.1/24",
    );
  });

  await t.test("out of range values", () => {
    assertThrows(() => stringifyCidrv4(-1), RangeError);
    assertThrows(() => stringifyCidrv4({ address: 0, mask: -1 }), RangeError);
  });
});

test("cidrv4Contains", async (t) => {
  await t.test("IP in range", () => {
    const cidr = parseCidrv4("192.168.1.0/24");

    assertEquals(
      cidrv4Contains(cidr, parseAddressv4("192.168.1.0").address),
      true,
    );
    assertEquals(
      cidrv4Contains(cidr, parseAddressv4("192.168.1.1").address),
      true,
    );
    assertEquals(
      cidrv4Contains(cidr, parseAddressv4("192.168.1.100").address),
      true,
    );
    assertEquals(
      cidrv4Contains(cidr, parseAddressv4("192.168.1.255").address),
      true,
    );
  });

  await t.test("IP out of range", () => {
    const cidr = parseCidrv4("192.168.1.0/24");

    assertEquals(
      cidrv4Contains(cidr, parseAddressv4("192.168.0.255").address),
      false,
    );
    assertEquals(
      cidrv4Contains(cidr, parseAddressv4("192.168.2.0").address),
      false,
    );
    assertEquals(
      cidrv4Contains(cidr, parseAddressv4("10.0.0.1").address),
      false,
    );
  });

  await t.test("edge cases - /32 (single IP)", () => {
    const cidr = parseCidrv4("192.168.1.1/32");

    assertEquals(
      cidrv4Contains(cidr, parseAddressv4("192.168.1.1").address),
      true,
    );
    assertEquals(
      cidrv4Contains(cidr, parseAddressv4("192.168.1.0").address),
      false,
    );
    assertEquals(
      cidrv4Contains(cidr, parseAddressv4("192.168.1.2").address),
      false,
    );
  });

  await t.test("edge cases - /0 (all IPs)", () => {
    const cidr = parseCidrv4("0.0.0.0/0");

    assertEquals(cidrv4Contains(cidr, parseAddressv4("0.0.0.0").address), true);
    assertEquals(
      cidrv4Contains(cidr, parseAddressv4("192.168.1.1").address),
      true,
    );
    assertEquals(
      cidrv4Contains(cidr, parseAddressv4("255.255.255.255").address),
      true,
    );
  });
});

test("cidrv4NetworkAddress", async (t) => {
  await t.test("returns network address", () => {
    const cidr = parseCidrv4("192.168.1.0/24");
    assertEquals(
      cidrv4NetworkAddress(cidr),
      parseAddressv4("192.168.1.0").address,
    );
  });

  await t.test("various CIDRs", () => {
    assertEquals(
      cidrv4NetworkAddress(parseCidrv4("10.0.0.0/8")),
      parseAddressv4("10.0.0.0").address,
    );
    assertEquals(
      cidrv4NetworkAddress(parseCidrv4("172.16.0.0/16")),
      parseAddressv4("172.16.0.0").address,
    );
    assertEquals(
      cidrv4NetworkAddress(parseCidrv4("192.168.1.100/24")),
      parseAddressv4("192.168.1.0").address,
    );
  });
});

test("cidrv4BroadcastAddress", async (t) => {
  await t.test("returns broadcast address", () => {
    const cidr = parseCidrv4("192.168.1.0/24");
    assertEquals(
      cidrv4BroadcastAddress(cidr),
      parseAddressv4("192.168.1.255").address,
    );
  });

  await t.test("various CIDRs", () => {
    assertEquals(
      cidrv4BroadcastAddress(parseCidrv4("10.0.0.0/8")),
      parseAddressv4("10.255.255.255").address,
    );
    assertEquals(
      cidrv4BroadcastAddress(parseCidrv4("172.16.0.0/16")),
      parseAddressv4("172.16.255.255").address,
    );
    assertEquals(
      cidrv4BroadcastAddress(parseCidrv4("192.168.1.1/32")),
      parseAddressv4("192.168.1.1").address,
    );
  });
});

test("IP assignment workflow", async (t) => {
  await t.test("sequential IP assignment in CIDR block", () => {
    const cidr = parseCidrv4("10.0.0.0/29"); // 8 IPs: 10.0.0.0 to 10.0.0.7

    const networkAddr = cidrv4NetworkAddress(cidr);
    const broadcastAddr = cidrv4BroadcastAddress(cidr);

    // Start from first usable IP (network + 1)
    let currentIp = networkAddr + 1;
    const assigned: string[] = [];

    // Assign IPs until broadcast (exclusive)
    while (currentIp < broadcastAddr) {
      assertEquals(cidrv4Contains(cidr, currentIp), true);
      assigned.push(stringifyAddressv4(currentIp));
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

  await t.test("verify network and broadcast are in range", () => {
    const cidr = parseCidrv4("192.168.1.0/24");

    // Network address is in range
    assertEquals(cidrv4Contains(cidr, cidrv4NetworkAddress(cidr)), true);

    // Broadcast address is in range
    assertEquals(cidrv4Contains(cidr, cidrv4BroadcastAddress(cidr)), true);
  });

  await t.test("arithmetic operations on IPs", () => {
    const ip = parseAddressv4("192.168.1.10").address;

    // Next IP
    assertEquals(stringifyAddressv4(ip + 1), "192.168.1.11");

    // Previous IP
    assertEquals(stringifyAddressv4(ip - 1), "192.168.1.9");

    // Add offset
    assertEquals(stringifyAddressv4(ip + 10), "192.168.1.20");

    // Crossing octet boundary
    assertEquals(
      stringifyAddressv4(parseAddressv4("192.168.1.255").address + 1),
      "192.168.2.0",
    );
  });
});

test("cidrv4Addresses", async (t) => {
  await t.test("default behavior - iterates full range from offset 0", () => {
    const cidr = parseCidrv4("10.0.0.0/29"); // 8 IPs: .0 to .7

    // Default: offset=0, no count limit, step=1
    const all = Array.from(cidrv4Addresses(cidr));

    assertEquals(all.map(stringifyAddressv4), [
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

  await t.test("iterates from offset 1 (skip network address)", () => {
    const cidr = parseCidrv4("10.0.0.0/29"); // 8 IPs

    const usable = Array.from(cidrv4Addresses(cidr, { offset: 1 }));

    assertEquals(usable.length, 7);
    assertEquals(usable[0], parseAddressv4("10.0.0.1").address);
    assertEquals(usable[6], parseAddressv4("10.0.0.7").address);
  });

  await t.test("generates addresses from network address", () => {
    const cidr = parseCidrv4("192.168.1.0/24");

    const addresses = Array.from(
      cidrv4Addresses(cidr, { offset: 0, count: 3, step: 1 }),
    );

    assertEquals(addresses, [
      parseAddressv4("192.168.1.0").address,
      parseAddressv4("192.168.1.1").address,
      parseAddressv4("192.168.1.2").address,
    ]);
  });

  await t.test("generates addresses from offset", () => {
    const cidr = parseCidrv4("192.168.1.0/24");

    const addresses = Array.from(
      cidrv4Addresses(cidr, { offset: 10, count: 5, step: 1 }),
    );

    assertEquals(addresses, [
      parseAddressv4("192.168.1.10").address,
      parseAddressv4("192.168.1.11").address,
      parseAddressv4("192.168.1.12").address,
      parseAddressv4("192.168.1.13").address,
      parseAddressv4("192.168.1.14").address,
    ]);
  });

  await t.test("skips network address for usable IPs", () => {
    const cidr = parseCidrv4("10.0.0.0/29");

    // Skip network address (offset 1)
    const usableIps = Array.from(
      cidrv4Addresses(cidr, { offset: 1, count: 6, step: 1 }),
    );

    assertEquals(usableIps.map(stringifyAddressv4), [
      "10.0.0.1",
      "10.0.0.2",
      "10.0.0.3",
      "10.0.0.4",
      "10.0.0.5",
      "10.0.0.6",
    ]);
  });

  await t.test("handles empty count", () => {
    const cidr = parseCidrv4("192.168.1.0/24");

    const addresses = Array.from(
      cidrv4Addresses(cidr, { offset: 0, count: 0, step: 1 }),
    );

    assertEquals(addresses, []);
  });

  await t.test("handles single address", () => {
    const cidr = parseCidrv4("192.168.1.0/24");

    const addresses = Array.from(
      cidrv4Addresses(cidr, { offset: 100, count: 1, step: 1 }),
    );

    assertEquals(addresses, [parseAddressv4("192.168.1.100").address]);
  });

  await t.test("works with different CIDR sizes", () => {
    const cidr8 = parseCidrv4("10.0.0.0/8");
    const cidr16 = parseCidrv4("172.16.0.0/16");
    const cidr32 = parseCidrv4("192.168.1.1/32");

    assertEquals(
      Array.from(cidrv4Addresses(cidr8, { offset: 0, count: 2, step: 1 }))[0],
      parseAddressv4("10.0.0.0").address,
    );
    assertEquals(
      Array.from(cidrv4Addresses(cidr16, { offset: 0, count: 2, step: 1 }))[0],
      parseAddressv4("172.16.0.0").address,
    );
    assertEquals(
      Array.from(cidrv4Addresses(cidr32, { offset: 0, count: 1, step: 1 }))[0],
      parseAddressv4("192.168.1.1").address,
    );
  });

  await t.test("accepts number parameters", () => {
    const cidr = parseCidrv4("192.168.1.0/24");

    const addresses = Array.from(
      cidrv4Addresses(cidr, { offset: 5, count: 3, step: 1 }),
    );

    assertEquals(addresses, [
      parseAddressv4("192.168.1.5").address,
      parseAddressv4("192.168.1.6").address,
      parseAddressv4("192.168.1.7").address,
    ]);
  });

  await t.test("batch IP allocation", () => {
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

    assertEquals(batch1[0], parseAddressv4("172.16.0.1").address);
    assertEquals(batch1[9], parseAddressv4("172.16.0.10").address);

    assertEquals(batch2[0], parseAddressv4("172.16.0.11").address);
    assertEquals(batch2[9], parseAddressv4("172.16.0.20").address);

    assertEquals(batch3[0], parseAddressv4("172.16.0.21").address);
    assertEquals(batch3[9], parseAddressv4("172.16.0.30").address);
  });

  await t.test("large offset and count", () => {
    const cidr = parseCidrv4("10.0.0.0/16");

    const addresses = Array.from(
      cidrv4Addresses(cidr, { offset: 1000, count: 5, step: 1 }),
    );

    assertEquals(addresses[0], parseAddressv4("10.0.3.232").address); // 10.0.0.0 + 1000
    assertEquals(addresses[4], parseAddressv4("10.0.3.236").address); // 10.0.0.0 + 1004
  });

  await t.test("preserves non-aligned CIDR address", () => {
    const cidr = parseCidrv4("192.168.1.100/24");

    // Network address is still 192.168.1.0
    const addresses = Array.from(
      cidrv4Addresses(cidr, { offset: 0, count: 3, step: 1 }),
    );

    assertEquals(addresses, [
      parseAddressv4("192.168.1.0").address,
      parseAddressv4("192.168.1.1").address,
      parseAddressv4("192.168.1.2").address,
    ]);
  });

  await t.test("custom step - even addresses", () => {
    const cidr = parseCidrv4("192.168.1.0/24");

    const evenIps = Array.from(
      cidrv4Addresses(cidr, { offset: 0, count: 5, step: 2 }),
    );

    assertEquals(evenIps, [
      parseAddressv4("192.168.1.0").address,
      parseAddressv4("192.168.1.2").address,
      parseAddressv4("192.168.1.4").address,
      parseAddressv4("192.168.1.6").address,
      parseAddressv4("192.168.1.8").address,
    ]);
  });

  await t.test("custom step - odd addresses", () => {
    const cidr = parseCidrv4("192.168.1.0/24");

    const oddIps = Array.from(
      cidrv4Addresses(cidr, { offset: 1, count: 5, step: 2 }),
    );

    assertEquals(oddIps, [
      parseAddressv4("192.168.1.1").address,
      parseAddressv4("192.168.1.3").address,
      parseAddressv4("192.168.1.5").address,
      parseAddressv4("192.168.1.7").address,
      parseAddressv4("192.168.1.9").address,
    ]);
  });

  await t.test("custom step - larger increments", () => {
    const cidr = parseCidrv4("10.0.0.0/24");

    const ips = Array.from(
      cidrv4Addresses(cidr, { offset: 0, count: 5, step: 10 }),
    );

    assertEquals(ips, [
      parseAddressv4("10.0.0.0").address,
      parseAddressv4("10.0.0.10").address,
      parseAddressv4("10.0.0.20").address,
      parseAddressv4("10.0.0.30").address,
      parseAddressv4("10.0.0.40").address,
    ]);
  });

  await t.test("negative step - reverse iteration", () => {
    const cidr = parseCidrv4("192.168.1.0/24");

    const backwards = Array.from(
      cidrv4Addresses(cidr, { offset: 10, count: 5, step: -1 }),
    );

    assertEquals(backwards, [
      parseAddressv4("192.168.1.10").address,
      parseAddressv4("192.168.1.9").address,
      parseAddressv4("192.168.1.8").address,
      parseAddressv4("192.168.1.7").address,
      parseAddressv4("192.168.1.6").address,
    ]);
  });

  await t.test("negative step - from end of range", () => {
    const cidr = parseCidrv4("10.0.0.0/29"); // .0 to .7

    const backwards = Array.from(
      cidrv4Addresses(cidr, { offset: 7, count: 4, step: -2 }),
    );

    assertEquals(backwards, [
      parseAddressv4("10.0.0.7").address,
      parseAddressv4("10.0.0.5").address,
      parseAddressv4("10.0.0.3").address,
      parseAddressv4("10.0.0.1").address,
    ]);
  });

  await t.test("stops at CIDR boundary - forward", () => {
    const cidr = parseCidrv4("192.168.1.0/29"); // Only 8 IPs: .0 to .7

    // Request 10 IPs but only 3 are available from offset 5
    const ips = Array.from(
      cidrv4Addresses(cidr, { offset: 5, count: 10, step: 1 }),
    );

    assertEquals(ips.length, 3);
    assertEquals(ips, [
      parseAddressv4("192.168.1.5").address,
      parseAddressv4("192.168.1.6").address,
      parseAddressv4("192.168.1.7").address,
    ]);
  });

  await t.test("stops at CIDR boundary - backward", () => {
    const cidr = parseCidrv4("192.168.1.0/29"); // .0 to .7

    // Request 10 IPs going backwards but only 4 available from offset 3
    const ips = Array.from(
      cidrv4Addresses(cidr, { offset: 3, count: 10, step: -1 }),
    );

    assertEquals(ips.length, 4);
    assertEquals(ips, [
      parseAddressv4("192.168.1.3").address,
      parseAddressv4("192.168.1.2").address,
      parseAddressv4("192.168.1.1").address,
      parseAddressv4("192.168.1.0").address,
    ]);
  });

  await t.test("stops at CIDR boundary with large step", () => {
    const cidr = parseCidrv4("10.0.0.0/28"); // .0 to .15

    // Large step will quickly exceed CIDR block
    const ips = Array.from(
      cidrv4Addresses(cidr, { offset: 5, count: 10, step: 5 }),
    );

    assertEquals(ips.length, 3);
    assertEquals(ips, [
      parseAddressv4("10.0.0.5").address,
      parseAddressv4("10.0.0.10").address,
      parseAddressv4("10.0.0.15").address,
    ]);
  });

  await t.test("starting outside CIDR block returns empty", () => {
    const cidr = parseCidrv4("192.168.1.0/29"); // .0 to .7

    // Offset 10 is outside the /29 range
    const ips = Array.from(
      cidrv4Addresses(cidr, { offset: 10, count: 5, step: 1 }),
    );

    assertEquals(ips, []);
  });

  await t.test("negative offset with negative step", () => {
    const cidr = parseCidrv4("192.168.1.0/24");

    // Start at offset -5 (before network address)
    const ips = Array.from(
      cidrv4Addresses(cidr, { offset: -5, count: 3, step: -1 }),
    );

    // All addresses are outside the CIDR block
    assertEquals(ips, []);
  });

  await t.test("generator - lazy iteration", () => {
    const cidr = parseCidrv4("192.168.1.0/24");

    const gen = cidrv4Addresses(cidr, { offset: 0, count: 5, step: 1 });

    // Manually iterate to verify it's a generator
    const first = gen.next();
    assertEquals(first.value, parseAddressv4("192.168.1.0").address);
    assertEquals(first.done, false);

    const second = gen.next();
    assertEquals(second.value, parseAddressv4("192.168.1.1").address);
    assertEquals(second.done, false);
  });
});

test("cidrv4ContainsCidr", async (t) => {
  await t.test("larger CIDR contains smaller", () => {
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

  await t.test("equal CIDRs contain each other", () => {
    const cidr = parseCidrv4("192.168.1.0/24");
    assert(cidrv4ContainsCidr(cidr, cidr));
  });

  await t.test("/0 contains everything", () => {
    const all = parseCidrv4("0.0.0.0/0");
    assert(cidrv4ContainsCidr(all, parseCidrv4("192.168.1.0/24")));
    assert(cidrv4ContainsCidr(all, parseCidrv4("10.0.0.1/32")));
    assert(cidrv4ContainsCidr(all, parseCidrv4("0.0.0.0/0")));
  });

  await t.test("/32 containment", () => {
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

  await t.test("reversed containment returns false", () => {
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

  await t.test("disjoint CIDRs return false", () => {
    assertEquals(
      cidrv4ContainsCidr(
        parseCidrv4("10.0.0.0/8"),
        parseCidrv4("172.16.0.0/12"),
      ),
      false,
    );
  });

  await t.test("different /32s return false", () => {
    assertEquals(
      cidrv4ContainsCidr(
        parseCidrv4("192.168.1.1/32"),
        parseCidrv4("192.168.1.2/32"),
      ),
      false,
    );
  });
});

test("cidrv4Overlaps", async (t) => {
  await t.test("outer and inner block overlap", () => {
    assert(
      cidrv4Overlaps(parseCidrv4("10.0.0.0/8"), parseCidrv4("10.1.0.0/16")),
    );
  });

  await t.test("symmetric", () => {
    assert(
      cidrv4Overlaps(parseCidrv4("10.1.0.0/16"), parseCidrv4("10.0.0.0/8")),
    );
  });

  await t.test("equal CIDRs overlap", () => {
    assert(
      cidrv4Overlaps(
        parseCidrv4("192.168.1.0/24"),
        parseCidrv4("192.168.1.0/24"),
      ),
    );
  });

  await t.test("/0 overlaps everything", () => {
    const all = parseCidrv4("0.0.0.0/0");
    assert(cidrv4Overlaps(all, parseCidrv4("192.168.1.0/24")));
    assert(cidrv4Overlaps(all, parseCidrv4("10.0.0.1/32")));
  });

  await t.test("adjacent CIDRs do not overlap", () => {
    assertEquals(
      cidrv4Overlaps(
        parseCidrv4("192.168.0.0/24"),
        parseCidrv4("192.168.1.0/24"),
      ),
      false,
    );
  });

  await t.test("disjoint CIDRs do not overlap", () => {
    assertEquals(
      cidrv4Overlaps(
        parseCidrv4("10.0.0.0/8"),
        parseCidrv4("172.16.0.0/12"),
      ),
      false,
    );
  });

  await t.test("two halves of /24 do not overlap", () => {
    assertEquals(
      cidrv4Overlaps(
        parseCidrv4("192.168.1.0/25"),
        parseCidrv4("192.168.1.128/25"),
      ),
      false,
    );
  });
});

test("isValidCidrv4", async (t) => {
  await t.test("valid CIDR", () => {
    assert(isValidCidrv4("0.0.0.0/0"));
    assert(isValidCidrv4("192.168.1.0/24"));
    assert(isValidCidrv4("10.0.0.1/32"));
    assert(isValidCidrv4("172.16.0.0/12"));
  });

  await t.test("invalid CIDR", () => {
    assertEquals(isValidCidrv4(""), false);
    assertEquals(isValidCidrv4("192.168.1.0"), false);
    assertEquals(isValidCidrv4("192.168.1.0/33"), false);
    assertEquals(isValidCidrv4("192.168.1.0/-1"), false);
    assertEquals(isValidCidrv4("2001:db8::/32"), false);
    assertEquals(isValidCidrv4("abc/24"), false);
  });
});

test("cidrv4Intersect", async (t) => {
  await t.test("no overlap returns null", () => {
    assertEquals(
      cidrv4Intersect(parseCidrv4("10.0.0.0/24"), parseCidrv4("172.16.0.0/24")),
      null,
    );
  });

  await t.test("b inside a", () => {
    const result = cidrv4Intersect(
      parseCidrv4("192.168.1.0/24"),
      parseCidrv4("192.168.1.0/28"),
    );
    assertEquals(result && stringifyCidrv4(result), "192.168.1.0/28");
  });

  await t.test("a inside b", () => {
    const result = cidrv4Intersect(
      parseCidrv4("192.168.1.0/28"),
      parseCidrv4("192.168.1.0/24"),
    );
    assertEquals(result && stringifyCidrv4(result), "192.168.1.0/28");
  });

  await t.test("equal CIDRs", () => {
    const result = cidrv4Intersect(
      parseCidrv4("10.0.0.0/24"),
      parseCidrv4("10.0.0.0/24"),
    );
    assertEquals(result && stringifyCidrv4(result), "10.0.0.0/24");
  });

  await t.test("adjacent non-overlapping returns null", () => {
    assertEquals(
      cidrv4Intersect(
        parseCidrv4("192.168.1.0/25"),
        parseCidrv4("192.168.1.128/25"),
      ),
      null,
    );
  });

  await t.test("/0 and specific", () => {
    const result = cidrv4Intersect(
      parseCidrv4("0.0.0.0/0"),
      parseCidrv4("10.0.0.0/8"),
    );
    assertEquals(result && stringifyCidrv4(result), "10.0.0.0/8");
  });

  await t.test("both /32 same", () => {
    const result = cidrv4Intersect(
      parseCidrv4("10.0.0.1/32"),
      parseCidrv4("10.0.0.1/32"),
    );
    assertEquals(result && stringifyCidrv4(result), "10.0.0.1/32");
  });

  await t.test("both /32 different", () => {
    assertEquals(
      cidrv4Intersect(parseCidrv4("10.0.0.1/32"), parseCidrv4("10.0.0.2/32")),
      null,
    );
  });
});

test("cidrv4Subtract", async (t) => {
  await t.test("no overlap", () => {
    const result = cidrv4Subtract(
      parseCidrv4("10.0.0.0/24"),
      parseCidrv4("172.16.0.0/24"),
    );
    assertEquals(result.map(stringifyCidrv4), ["10.0.0.0/24"]);
  });

  await t.test("b contains a", () => {
    const result = cidrv4Subtract(
      parseCidrv4("192.168.1.0/28"),
      parseCidrv4("192.168.1.0/24"),
    );
    assertEquals(result, []);
  });

  await t.test("carve /28 from /24", () => {
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

  await t.test("equal CIDRs", () => {
    const result = cidrv4Subtract(
      parseCidrv4("10.0.0.0/24"),
      parseCidrv4("10.0.0.0/24"),
    );
    assertEquals(result, []);
  });

  await t.test("/32 from /30", () => {
    const result = cidrv4Subtract(
      parseCidrv4("10.0.0.0/30"),
      parseCidrv4("10.0.0.0/32"),
    );
    assertEquals(result.map(stringifyCidrv4), [
      "10.0.0.2/31",
      "10.0.0.1/32",
    ]);
  });

  await t.test("/32 no overlap", () => {
    const result = cidrv4Subtract(
      parseCidrv4("10.0.0.1/32"),
      parseCidrv4("10.0.0.2/32"),
    );
    assertEquals(result.map(stringifyCidrv4), ["10.0.0.1/32"]);
  });

  await t.test("/32 exact match", () => {
    const result = cidrv4Subtract(
      parseCidrv4("10.0.0.1/32"),
      parseCidrv4("10.0.0.1/32"),
    );
    assertEquals(result, []);
  });

  await t.test("adjacent non-overlapping", () => {
    const result = cidrv4Subtract(
      parseCidrv4("192.168.1.0/25"),
      parseCidrv4("192.168.1.128/25"),
    );
    assertEquals(result.map(stringifyCidrv4), ["192.168.1.0/25"]);
  });

  await t.test("carve middle /26 from /24", () => {
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

test("cidrv4Merge", async (t) => {
  await t.test("empty input", () => {
    assertEquals(cidrv4Merge([]), []);
  });

  await t.test("single CIDR", () => {
    assertEquals(
      cidrv4Merge([parseCidrv4("10.0.0.0/24")]).map(stringifyCidrv4),
      ["10.0.0.0/24"],
    );
  });

  await t.test("single non-normalized", () => {
    assertEquals(
      cidrv4Merge([parseCidrv4("10.0.0.100/24")]).map(stringifyCidrv4),
      ["10.0.0.0/24"],
    );
  });

  await t.test("non-overlapping sorted", () => {
    assertEquals(
      cidrv4Merge([
        parseCidrv4("192.168.1.0/24"),
        parseCidrv4("10.0.0.0/24"),
      ]).map(stringifyCidrv4),
      ["10.0.0.0/24", "192.168.1.0/24"],
    );
  });

  await t.test("exact duplicates", () => {
    assertEquals(
      cidrv4Merge([
        parseCidrv4("10.0.0.0/24"),
        parseCidrv4("10.0.0.0/24"),
      ]).map(stringifyCidrv4),
      ["10.0.0.0/24"],
    );
  });

  await t.test("contained removed", () => {
    assertEquals(
      cidrv4Merge([
        parseCidrv4("10.0.0.0/16"),
        parseCidrv4("10.0.1.0/24"),
      ]).map(stringifyCidrv4),
      ["10.0.0.0/16"],
    );
  });

  await t.test("contained (smaller first)", () => {
    assertEquals(
      cidrv4Merge([
        parseCidrv4("10.0.1.0/24"),
        parseCidrv4("10.0.0.0/16"),
      ]).map(stringifyCidrv4),
      ["10.0.0.0/16"],
    );
  });

  await t.test("adjacent siblings merged", () => {
    assertEquals(
      cidrv4Merge([
        parseCidrv4("10.0.0.0/25"),
        parseCidrv4("10.0.0.128/25"),
      ]).map(stringifyCidrv4),
      ["10.0.0.0/24"],
    );
  });

  await t.test("non-adjacent same prefix", () => {
    assertEquals(
      cidrv4Merge([
        parseCidrv4("10.0.0.0/25"),
        parseCidrv4("10.0.1.128/25"),
      ]).map(stringifyCidrv4),
      ["10.0.0.0/25", "10.0.1.128/25"],
    );
  });

  await t.test("chain merge (cascade)", () => {
    assertEquals(
      cidrv4Merge([
        parseCidrv4("10.0.0.0/25"),
        parseCidrv4("10.0.0.128/25"),
        parseCidrv4("10.0.1.0/25"),
        parseCidrv4("10.0.1.128/25"),
      ]).map(stringifyCidrv4),
      ["10.0.0.0/23"],
    );
  });

  await t.test("deep cascade (/32 siblings)", () => {
    assertEquals(
      cidrv4Merge([
        parseCidrv4("10.0.0.0/32"),
        parseCidrv4("10.0.0.1/32"),
      ]).map(stringifyCidrv4),
      ["10.0.0.0/31"],
    );
  });

  await t.test("/0 absorbs everything", () => {
    assertEquals(
      cidrv4Merge([
        parseCidrv4("0.0.0.0/0"),
        parseCidrv4("10.0.0.0/8"),
        parseCidrv4("192.168.0.0/16"),
      ]).map(stringifyCidrv4),
      ["0.0.0.0/0"],
    );
  });

  await t.test("two /1 blocks merge to /0", () => {
    assertEquals(
      cidrv4Merge([
        parseCidrv4("0.0.0.0/1"),
        parseCidrv4("128.0.0.0/1"),
      ]).map(stringifyCidrv4),
      ["0.0.0.0/0"],
    );
  });

  await t.test("mixed containment + adjacency", () => {
    assertEquals(
      cidrv4Merge([
        parseCidrv4("10.0.0.0/24"),
        parseCidrv4("10.0.0.0/25"),
        parseCidrv4("10.0.1.0/24"),
      ]).map(stringifyCidrv4),
      ["10.0.0.0/23"],
    );
  });

  await t.test("route aggregation (real-world)", () => {
    assertEquals(
      cidrv4Merge([
        parseCidrv4("198.51.100.0/25"),
        parseCidrv4("198.51.100.128/26"),
        parseCidrv4("198.51.100.192/26"),
        parseCidrv4("203.0.113.0/24"),
      ]).map(stringifyCidrv4),
      ["198.51.100.0/24", "203.0.113.0/24"],
    );
  });
});

test("compareCidrv4", async (t) => {
  await t.test("orders by address ascending", () => {
    assertEquals(
      compareCidrv4(parseCidrv4("10.0.0.0/8"), parseCidrv4("192.168.0.0/16")),
      -1,
    );
    assertEquals(
      compareCidrv4(parseCidrv4("192.168.0.0/16"), parseCidrv4("10.0.0.0/8")),
      1,
    );
  });

  await t.test("tie-breaks on prefix length: supernet before subnet", () => {
    assertEquals(
      compareCidrv4(parseCidrv4("10.0.0.0/8"), parseCidrv4("10.0.0.0/16")),
      -1,
    );
    assertEquals(
      compareCidrv4(parseCidrv4("10.0.0.0/16"), parseCidrv4("10.0.0.0/8")),
      1,
    );
  });

  await t.test("equal address and prefix length compares equal", () => {
    assertEquals(
      compareCidrv4(parseCidrv4("10.0.0.0/8"), parseCidrv4("10.0.0.0/8")),
      0,
    );
  });

  await t.test(
    "returns only -1, 0 or 1, never a prefix-length difference",
    () => {
      assertEquals(
        compareCidrv4(parseCidrv4("0.0.0.0/0"), parseCidrv4("0.0.0.0/32")),
        -1,
      );
      assertEquals(
        compareCidrv4(parseCidrv4("0.0.0.0/32"), parseCidrv4("0.0.0.0/0")),
        1,
      );
    },
  );

  await t.test(
    "compares the block as written, without masking host bits",
    () => {
      assertEquals(
        compareCidrv4(parseCidrv4("10.0.0.5/24"), parseCidrv4("10.0.0.0/24")),
        1,
      );
    },
  );

  await t.test("sorts a routing table", () => {
    const routes = ["192.168.1.0/24", "10.0.0.0/16", "10.0.0.0/8"].map(
      parseCidrv4,
    );
    assertEquals(routes.toSorted(compareCidrv4).map(stringifyCidrv4), [
      "10.0.0.0/8",
      "10.0.0.0/16",
      "192.168.1.0/24",
    ]);
  });
});

test("cidrv4FirstUsableAddress", async (t) => {
  await t.test("skips the network address", () => {
    assertEquals(
      stringifyAddressv4(
        cidrv4FirstUsableAddress(parseCidrv4("192.168.1.0/24")),
      ),
      "192.168.1.1",
    );
    assertEquals(
      stringifyAddressv4(cidrv4FirstUsableAddress(parseCidrv4("10.0.0.0/30"))),
      "10.0.0.1",
    );
  });

  await t.test("/31 keeps the network address (RFC 3021)", () => {
    assertEquals(
      stringifyAddressv4(cidrv4FirstUsableAddress(parseCidrv4("10.0.0.0/31"))),
      "10.0.0.0",
    );
  });

  await t.test("/32 is the address itself", () => {
    assertEquals(
      stringifyAddressv4(cidrv4FirstUsableAddress(parseCidrv4("10.0.0.7/32"))),
      "10.0.0.7",
    );
  });

  await t.test("/0 starts at 0.0.0.1", () => {
    assertEquals(
      stringifyAddressv4(cidrv4FirstUsableAddress(parseCidrv4("0.0.0.0/0"))),
      "0.0.0.1",
    );
  });

  await t.test("non-canonical address is masked to the network first", () => {
    assertEquals(
      stringifyAddressv4(
        cidrv4FirstUsableAddress(parseCidrv4("192.168.1.77/24")),
      ),
      "192.168.1.1",
    );
  });

  await t.test("stays inside the block", () => {
    for (let prefixLength = 0; prefixLength <= 32; prefixLength++) {
      const cidr = parseCidrv4(`10.20.30.40/${prefixLength}`);
      assert(cidrv4Contains(cidr, cidrv4FirstUsableAddress(cidr)));
    }
  });
});

test("cidrv4LastUsableAddress", async (t) => {
  await t.test("skips the broadcast address", () => {
    assertEquals(
      stringifyAddressv4(
        cidrv4LastUsableAddress(parseCidrv4("192.168.1.0/24")),
      ),
      "192.168.1.254",
    );
    assertEquals(
      stringifyAddressv4(cidrv4LastUsableAddress(parseCidrv4("10.0.0.0/30"))),
      "10.0.0.2",
    );
  });

  await t.test("/31 keeps the broadcast address (RFC 3021)", () => {
    assertEquals(
      stringifyAddressv4(cidrv4LastUsableAddress(parseCidrv4("10.0.0.0/31"))),
      "10.0.0.1",
    );
  });

  await t.test("/32 is the address itself", () => {
    assertEquals(
      stringifyAddressv4(cidrv4LastUsableAddress(parseCidrv4("10.0.0.7/32"))),
      "10.0.0.7",
    );
  });

  await t.test("/0 ends at 255.255.255.254", () => {
    assertEquals(
      stringifyAddressv4(cidrv4LastUsableAddress(parseCidrv4("0.0.0.0/0"))),
      "255.255.255.254",
    );
  });

  await t.test("non-canonical address is masked to the network first", () => {
    assertEquals(
      stringifyAddressv4(
        cidrv4LastUsableAddress(parseCidrv4("192.168.1.77/24")),
      ),
      "192.168.1.254",
    );
  });

  await t.test("stays inside the block", () => {
    for (let prefixLength = 0; prefixLength <= 32; prefixLength++) {
      const cidr = parseCidrv4(`10.20.30.40/${prefixLength}`);
      assert(cidrv4Contains(cidr, cidrv4LastUsableAddress(cidr)));
    }
  });

  await t.test("never precedes the first usable address", () => {
    for (let prefixLength = 0; prefixLength <= 32; prefixLength++) {
      const cidr = parseCidrv4(`10.20.30.40/${prefixLength}`);
      assert(cidrv4FirstUsableAddress(cidr) <= cidrv4LastUsableAddress(cidr));
    }
  });
});

test("cidrv4UsableSize", async (t) => {
  await t.test("size minus network and broadcast", () => {
    assertEquals(cidrv4UsableSize(parseCidrv4("192.168.1.0/24")), 254);
    assertEquals(cidrv4UsableSize(parseCidrv4("10.0.0.0/30")), 2);
    assertEquals(cidrv4UsableSize(parseCidrv4("10.0.0.0/8")), 16777214);
  });

  await t.test("/31 is 2, /32 is 1", () => {
    assertEquals(cidrv4UsableSize(parseCidrv4("10.0.0.0/31")), 2);
    assertEquals(cidrv4UsableSize(parseCidrv4("10.0.0.1/32")), 1);
  });

  await t.test("/0 is the whole space minus two", () => {
    assertEquals(cidrv4UsableSize(parseCidrv4("0.0.0.0/0")), 4294967294);
  });

  await t.test("accepts a bare prefix length", () => {
    assertEquals(cidrv4UsableSize(24), 254);
    assertEquals(cidrv4UsableSize(30), 2);
    assertEquals(cidrv4UsableSize(31), 2);
    assertEquals(cidrv4UsableSize(32), 1);
    assertEquals(cidrv4UsableSize(0), 4294967294);
  });

  await t.test("out of range prefix lengths", () => {
    assertThrows(() => cidrv4UsableSize(-1), RangeError);
    assertThrows(() => cidrv4UsableSize(33), RangeError);
    assertThrows(() => cidrv4UsableSize(24.5), RangeError);
  });

  await t.test("size - 2 is wrong exactly at /31 and /32", () => {
    for (let prefixLength = 0; prefixLength <= 30; prefixLength++) {
      assertEquals(
        cidrv4UsableSize(prefixLength),
        cidrv4Size(prefixLength) - 2,
      );
    }
    assertEquals(cidrv4Size(31) - 2, 0);
    assertEquals(cidrv4Size(32) - 2, -1);
  });

  await t.test("never zero", () => {
    for (let prefixLength = 0; prefixLength <= 32; prefixLength++) {
      assert(cidrv4UsableSize(prefixLength) >= 1);
    }
  });
});

test("cidrv4UsableAddresses", async (t) => {
  await t.test("/30 yields both link addresses", () => {
    const addresses = Array.from(
      cidrv4UsableAddresses(parseCidrv4("10.0.0.0/30")),
    );
    assertEquals(addresses.map(stringifyAddressv4), ["10.0.0.1", "10.0.0.2"]);
  });

  await t.test("/31 yields both addresses (RFC 3021)", () => {
    const addresses = Array.from(
      cidrv4UsableAddresses(parseCidrv4("10.0.0.0/31")),
    );
    assertEquals(addresses.map(stringifyAddressv4), ["10.0.0.0", "10.0.0.1"]);
  });

  await t.test("/32 yields the single address", () => {
    const addresses = Array.from(
      cidrv4UsableAddresses(parseCidrv4("10.0.0.7/32")),
    );
    assertEquals(addresses.map(stringifyAddressv4), ["10.0.0.7"]);
  });

  await t.test("non-canonical address is masked to the network first", () => {
    const addresses = Array.from(
      cidrv4UsableAddresses(parseCidrv4("10.0.1.5/29")),
    );
    assertEquals(addresses.length, 6);
    assertEquals(stringifyAddressv4(addresses[0]), "10.0.1.1");
  });

  await t.test("count matches cidrv4UsableSize", () => {
    for (let prefixLength = 16; prefixLength <= 32; prefixLength++) {
      const cidr = parseCidrv4(`172.16.0.0/${prefixLength}`);
      assertEquals(
        Array.from(cidrv4UsableAddresses(cidr)).length,
        cidrv4UsableSize(cidr),
      );
    }
  });

  await t.test("ends match the first/last usable addresses", () => {
    for (let prefixLength = 16; prefixLength <= 32; prefixLength++) {
      const cidr = parseCidrv4(`172.16.0.0/${prefixLength}`);
      const addresses = Array.from(cidrv4UsableAddresses(cidr));
      assertEquals(addresses[0], cidrv4FirstUsableAddress(cidr));
      assertEquals(addresses.at(-1), cidrv4LastUsableAddress(cidr));
    }
  });

  await t.test("never yields the network or broadcast address of a /24", () => {
    const cidr = parseCidrv4("192.168.1.0/24");
    const addresses = Array.from(cidrv4UsableAddresses(cidr));
    assert(!addresses.includes(cidrv4NetworkAddress(cidr)));
    assert(!addresses.includes(cidrv4BroadcastAddress(cidr)));
  });

  await t.test("is lazy — a /0 costs nothing until iterated", () => {
    const addresses = cidrv4UsableAddresses(parseCidrv4("0.0.0.0/0"));
    assertEquals(
      stringifyAddressv4(addresses.next().value as number),
      "0.0.0.1",
    );
    assertEquals(
      stringifyAddressv4(addresses.next().value as number),
      "0.0.0.2",
    );
    addresses.return(undefined);
  });

  await t.test("the naive cidrv4Addresses recipe is wrong at /31", () => {
    const cidr = parseCidrv4("10.0.0.0/31");
    const naive = Array.from(
      cidrv4Addresses(cidr, { offset: 1, count: cidrv4Size(cidr) - 2 }),
    );
    assertEquals(naive, []);
    assertEquals(Array.from(cidrv4UsableAddresses(cidr)).length, 2);
  });

  await t.test("the naive cidrv4Addresses recipe is wrong at /32", () => {
    const cidr = parseCidrv4("10.0.0.7/32");
    const naive = Array.from(
      cidrv4Addresses(cidr, { offset: 1, count: cidrv4Size(cidr) - 2 }),
    );
    assertEquals(naive, []);
    assertEquals(Array.from(cidrv4UsableAddresses(cidr)).length, 1);
  });
});

test("mask dialect", async (t) => {
  await t.test("cidrv4Mask reads a stored mask as is", () => {
    assertEquals(cidrv4Mask({ address: 0, mask: 0xFFFFFF00 }), 0xFFFFFF00);
    assertEquals(cidrv4Mask({ address: 0, mask: 0xFF00FF00 }), 0xFF00FF00);
  });

  await t.test("cidrv4Mask shifts a prefixed block", () => {
    assertEquals(cidrv4Mask(parseCidrv4("10.0.0.0/8")), 0xFF000000);
  });

  await t.test("cidrv4PrefixLength reads a prefixed block as is", () => {
    assertEquals(cidrv4PrefixLength(parseCidrv4("10.0.0.0/8")), 8);
  });

  await t.test("cidrv4PrefixLength converts a contiguous stored mask", () => {
    assertEquals(cidrv4PrefixLength({ address: 0, mask: 0xFFFFFF00 }), 24);
  });

  await t.test(
    "cidrv4PrefixLength throws on a non-contiguous stored mask",
    () => {
      assertThrows(
        () => cidrv4PrefixLength({ address: 0, mask: 0xFF00FF00 }),
        TypeError,
        "IPv4 mask is not contiguous: 0xff00ff00",
      );
    },
  );

  await t.test("stringifyCidrv4 writes the mask back in dotted decimal", () => {
    assertEquals(
      stringifyCidrv4({
        address: parseAddressv4("10.0.0.0").address,
        mask: 0xFF000000,
      }),
      "10.0.0.0/255.0.0.0",
    );
  });

  await t.test(
    "stringifyCidrv4 keeps host bits and a non-contiguous mask",
    () => {
      assertEquals(
        stringifyCidrv4({
          address: parseAddressv4("10.1.2.3").address,
          mask: 0xFF00FF00,
        }),
        "10.1.2.3/255.0.255.0",
      );
    },
  );

  await t.test("cidrv4Contains with a masked block", () => {
    const cidr = {
      address: parseAddressv4("192.168.1.0").address,
      mask: 0xFFFFFF00,
    };
    assert(cidrv4Contains(cidr, parseAddressv4("192.168.1.77").address));
    assertEquals(
      cidrv4Contains(cidr, parseAddressv4("192.168.2.1").address),
      false,
    );
  });

  await t.test("a non-contiguous mask flows through cidrv4Contains", () => {
    const cidr = {
      address: parseAddressv4("10.0.0.0").address,
      mask: 0xFF00FF00,
    };
    assert(cidrv4Contains(cidr, parseAddressv4("10.200.0.7").address));
    assertEquals(
      cidrv4Contains(cidr, parseAddressv4("10.0.1.0").address),
      false,
    );
  });

  await t.test("bounds of a masked block", () => {
    const cidr = {
      address: parseAddressv4("192.168.1.77").address,
      mask: 0xFFFFFF00,
    };
    assertEquals(
      stringifyAddressv4(cidrv4NetworkAddress(cidr)),
      "192.168.1.0",
    );
    assertEquals(
      stringifyAddressv4(cidrv4BroadcastAddress(cidr)),
      "192.168.1.255",
    );
    assertEquals(
      stringifyAddressv4(cidrv4FirstUsableAddress(cidr)),
      "192.168.1.1",
    );
    assertEquals(
      stringifyAddressv4(cidrv4LastUsableAddress(cidr)),
      "192.168.1.254",
    );
  });

  await t.test("a masked /31 is fully usable", () => {
    const cidr = {
      address: parseAddressv4("10.0.0.0").address,
      mask: 0xFFFFFFFE,
    };
    assertEquals(
      stringifyAddressv4(cidrv4FirstUsableAddress(cidr)),
      "10.0.0.0",
    );
    assertEquals(stringifyAddressv4(cidrv4LastUsableAddress(cidr)), "10.0.0.1");
    assertEquals(cidrv4UsableSize(cidr), 2);
  });

  await t.test("cidrv4Size and cidrv4UsableSize with a masked block", () => {
    const cidr = {
      address: parseAddressv4("192.168.1.0").address,
      mask: 0xFFFFFF00,
    };
    assertEquals(cidrv4Size(cidr), 256);
    assertEquals(cidrv4UsableSize(cidr), 254);
  });

  await t.test(
    "cidrv4Size of a non-contiguous mask is the host-bit count plus one",
    () => {
      assertEquals(cidrv4Size({ address: 0, mask: 0xFF00FF00 }), 16711936);
    },
  );

  await t.test(
    "cidrv4Addresses and cidrv4UsableAddresses with a masked block",
    () => {
      const cidr = {
        address: parseAddressv4("10.0.0.0").address,
        mask: 0xFFFFFFF8,
      };
      assertEquals(
        Array.from(cidrv4Addresses(cidr, { count: 3 })).map(stringifyAddressv4),
        ["10.0.0.0", "10.0.0.1", "10.0.0.2"],
      );
      assertEquals(
        Array.from(cidrv4UsableAddresses(cidr)).map(stringifyAddressv4),
        [
          "10.0.0.1",
          "10.0.0.2",
          "10.0.0.3",
          "10.0.0.4",
          "10.0.0.5",
          "10.0.0.6",
        ],
      );
    },
  );

  await t.test("cidrv4ContainsCidr across dialects", () => {
    const outer = {
      address: parseAddressv4("10.0.0.0").address,
      mask: 0xFF000000,
    };
    assert(cidrv4ContainsCidr(outer, parseCidrv4("10.1.0.0/16")));
    assert(
      cidrv4ContainsCidr(parseCidrv4("10.0.0.0/8"), {
        address: parseAddressv4("10.1.0.0").address,
        mask: 0xFFFF0000,
      }),
    );
    assertEquals(cidrv4ContainsCidr(parseCidrv4("10.1.0.0/16"), outer), false);
  });

  await t.test("cidrv4Overlaps across dialects", () => {
    const a = { address: parseAddressv4("10.0.0.0").address, mask: 0xFF000000 };
    assert(cidrv4Overlaps(a, parseCidrv4("10.1.0.0/16")));
    assert(cidrv4Overlaps(parseCidrv4("10.1.0.0/16"), a));
    assertEquals(cidrv4Overlaps(a, parseCidrv4("172.16.0.0/12")), false);
  });

  await t.test("cidrv4Intersect matches the input dialect", () => {
    const masked = cidrv4Intersect(
      { address: parseAddressv4("192.168.1.0").address, mask: 0xFFFFFF00 },
      { address: parseAddressv4("192.168.1.0").address, mask: 0xFFFFFFF0 },
    );
    assertEquals(masked, {
      address: parseAddressv4("192.168.1.0").address,
      mask: 0xFFFFFFF0,
    });

    const prefixed = cidrv4Intersect(
      parseCidrv4("192.168.1.0/24"),
      parseCidrv4("192.168.1.0/28"),
    );
    assertEquals(prefixed, {
      address: parseAddressv4("192.168.1.0").address,
      prefixLength: 28,
    });
  });

  await t.test("cidrv4Intersect of mixed dialects is masked", () => {
    const result = cidrv4Intersect(
      parseCidrv4("192.168.1.0/28"),
      { address: parseAddressv4("192.168.1.0").address, mask: 0xFFFFFF00 },
    );
    assertEquals(result, {
      address: parseAddressv4("192.168.1.0").address,
      mask: 0xFFFFFFF0,
    });
  });

  await t.test("cidrv4Subtract matches the input dialect", () => {
    const result = cidrv4Subtract(
      { address: parseAddressv4("192.168.1.0").address, mask: 0xFFFFFF00 },
      { address: parseAddressv4("192.168.1.0").address, mask: 0xFFFFFFF0 },
    );
    assertEquals(result.map(stringifyCidrv4), [
      "192.168.1.128/255.255.255.128",
      "192.168.1.64/255.255.255.192",
      "192.168.1.32/255.255.255.224",
      "192.168.1.16/255.255.255.240",
    ]);
  });

  await t.test("cidrv4Subtract of mixed dialects is masked", () => {
    const disjoint = cidrv4Subtract(
      parseCidrv4("10.0.0.0/24"),
      { address: parseAddressv4("172.16.0.0").address, mask: 0xFFFFFF00 },
    );
    assertEquals(disjoint, [{
      address: parseAddressv4("10.0.0.0").address,
      mask: 0xFFFFFF00,
    }]);

    const carved = cidrv4Subtract(
      { address: parseAddressv4("192.168.1.0").address, mask: 0xFFFFFF80 },
      parseCidrv4("192.168.1.0/26"),
    );
    assertEquals(carved.map(stringifyCidrv4), ["192.168.1.64/255.255.255.192"]);
  });

  await t.test("cidrv4Merge matches the input dialect", () => {
    const merged = cidrv4Merge([
      { address: parseAddressv4("10.0.1.0").address, mask: 0xFFFFFF00 },
      { address: parseAddressv4("10.0.0.0").address, mask: 0xFFFFFF00 },
      { address: parseAddressv4("10.0.0.128").address, mask: 0xFFFFFF80 },
    ]);
    assertEquals(merged, [{
      address: parseAddressv4("10.0.0.0").address,
      mask: 0xFFFFFE00,
    }]);
  });

  await t.test("cidrv4Merge of mixed dialects is masked", () => {
    const merged = cidrv4Merge([
      parseCidrv4("10.0.1.0/24"),
      { address: parseAddressv4("10.0.0.0").address, mask: 0xFFFFFF00 },
    ]);
    assertEquals(merged.map(stringifyCidrv4), ["10.0.0.0/255.255.254.0"]);
  });

  await t.test("compareCidrv4 orders by mask, dialect aside", () => {
    const masked = {
      address: parseAddressv4("10.0.0.0").address,
      mask: 0xFF000000,
    };
    assertEquals(compareCidrv4(masked, parseCidrv4("10.0.0.0/8")), 0);
    assertEquals(compareCidrv4(masked, parseCidrv4("10.0.0.0/16")), -1);
    assertEquals(compareCidrv4(parseCidrv4("10.0.0.0/16"), masked), 1);
  });

  await t.test("compareCidrv4 is total over a non-contiguous mask", () => {
    const odd = {
      address: parseAddressv4("10.0.0.0").address,
      mask: 0xFF00FF00,
    };
    assertEquals(compareCidrv4(odd, parseCidrv4("10.0.0.0/8")), 1);
    assertEquals(compareCidrv4(odd, odd), 0);
  });

  await t.test(
    "every operation agrees across dialects for every contiguous mask",
    () => {
      const address = parseAddressv4("203.0.113.77").address;
      const probe = parseAddressv4("203.0.113.200").address;
      const other = parseCidrv4("203.0.113.64/26");
      for (let prefixLength = 0; prefixLength <= 32; prefixLength++) {
        const prefixed = { address, prefixLength };
        const masked = { address, mask: cidrv4Mask(prefixLength) };
        assertEquals(cidrv4PrefixLength(masked), prefixLength);
        assertEquals(
          cidrv4Contains(masked, probe),
          cidrv4Contains(prefixed, probe),
        );
        assertEquals(
          cidrv4NetworkAddress(masked),
          cidrv4NetworkAddress(prefixed),
        );
        assertEquals(
          cidrv4BroadcastAddress(masked),
          cidrv4BroadcastAddress(prefixed),
        );
        assertEquals(
          cidrv4FirstUsableAddress(masked),
          cidrv4FirstUsableAddress(prefixed),
        );
        assertEquals(
          cidrv4LastUsableAddress(masked),
          cidrv4LastUsableAddress(prefixed),
        );
        assertEquals(cidrv4Size(masked), cidrv4Size(prefixed));
        assertEquals(cidrv4UsableSize(masked), cidrv4UsableSize(prefixed));
        assertEquals(
          cidrv4ContainsCidr(masked, other),
          cidrv4ContainsCidr(prefixed, other),
        );
        assertEquals(
          cidrv4ContainsCidr(other, masked),
          cidrv4ContainsCidr(other, prefixed),
        );
        assertEquals(
          cidrv4Overlaps(masked, other),
          cidrv4Overlaps(prefixed, other),
        );
        assertEquals(
          compareCidrv4(masked, other),
          compareCidrv4(prefixed, other),
        );
        const intersection = cidrv4Intersect(prefixed, other);
        assertEquals(
          cidrv4Intersect(masked, other),
          intersection && {
            address: intersection.address,
            mask: cidrv4Mask(intersection),
          },
        );
      }
    },
  );
});
