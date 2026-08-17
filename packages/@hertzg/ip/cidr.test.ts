import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  type Cidr,
  cidrAddresses,
  cidrContains,
  cidrContainsCidr,
  cidrFirstAddress,
  cidrIntersect,
  cidrLastAddress,
  cidrMerge,
  cidrOverlaps,
  cidrSize,
  cidrSubtract,
  compareCidr,
  isCidrv4,
  isCidrv6,
  parseCidr,
  stringifyCidr,
} from "./cidr.ts";
import { parseAddress, stringifyAddress } from "./address.ts";
import { isValidCidr } from "./validate.ts";
import { parseAddressv4 } from "./addressv4.ts";
import { parseAddressv6 } from "./addressv6.ts";
import { parseCidrv4 } from "./cidrv4.ts";
import { parseCidrv6 } from "./cidrv6.ts";

Deno.test("parseCidr", async (t) => {
  await t.step("parses IPv4 CIDR", () => {
    assertEquals(parseCidr("192.168.1.0/24"), {
      address: 3232235776,
      prefixLength: 24,
    });
    assertEquals(parseCidr("10.0.0.0/8"), {
      address: 167772160,
      prefixLength: 8,
    });
    assertEquals(parseCidr("172.16.0.0/12"), {
      address: 2886729728,
      prefixLength: 12,
    });
  });

  await t.step("parses IPv6 CIDR", () => {
    assertEquals(parseCidr("2001:db8::/32"), {
      address: 0x20010db8n << 96n,
      prefixLength: 32,
    });
    assertEquals(parseCidr("fe80::/10"), {
      address: 0xfe80n << 112n,
      prefixLength: 10,
    });
    assertEquals(parseCidr("::1/128"), { address: 1n, prefixLength: 128 });
  });

  await t.step("parses the mask dialect of either version", () => {
    assertEquals(parseCidr("10.0.0.0/255.0.0.0"), {
      address: 167772160,
      mask: 0xff000000,
    });
    assertEquals(parseCidr("fe80::/ffff:ffff::"), {
      address: 0xfe80n << 112n,
      mask: 0xffffffffn << 96n,
    });
  });

  await t.step("carries a zone ID on either version", () => {
    assertEquals(parseCidr("10.0.0.0%ether1/8"), {
      address: 167772160,
      prefixLength: 8,
      zoneId: "ether1",
    });
    assertEquals(parseCidr("fe80::%ether1/64"), {
      address: 0xfe80n << 112n,
      prefixLength: 64,
      zoneId: "ether1",
    });
  });

  await t.step("dispatches on the address slot, not the whole string", () => {
    // A colon in the zone does not make an IPv4 block IPv6.
    assertEquals(parseCidr("10.0.0.0%eth0:1/8"), {
      address: 167772160,
      prefixLength: 8,
      zoneId: "eth0:1",
    });
    // A colon in the mask of an IPv4 address is a version disagreement,
    // reported as such rather than as a malformed IPv6 address.
    assertThrows(
      () => parseCidr("10.0.0.0/ffff:ff00::"),
      TypeError,
      "IPv4 CIDR mask must be an IPv4 address",
    );
  });

  await t.step("unmaps IPv4-mapped IPv6 CIDR with prefix >= 96", () => {
    assertEquals(parseCidr("::ffff:192.168.1.0/120"), {
      address: 3232235776,
      prefixLength: 24,
    });
    assertEquals(parseCidr("::ffff:c0a8:100/120"), {
      address: 3232235776,
      prefixLength: 24,
    });
    assertEquals(parseCidr("::ffff:1.2.3.4/128"), {
      address: 16909060,
      prefixLength: 32,
    });
  });

  await t.step("unmaps at the prefix boundary /96", () => {
    assertEquals(parseCidr("::ffff:0.0.0.0/96"), {
      address: 0,
      prefixLength: 0,
    });
  });

  await t.step("preserves IPv4-mapped IPv6 CIDR with prefix < 96", () => {
    assertEquals(parseCidr("::ffff:0:0/64"), {
      address: 0xffff00000000n,
      prefixLength: 64,
    });
    assertEquals(parseCidr("::ffff:1.2.3.4/95"), {
      address: 0xffff01020304n,
      prefixLength: 95,
    });
  });

  await t.step(
    "unmaps a masked block only when the high 96 bits are ones",
    () => {
      assertEquals(
        parseCidr("::ffff:192.168.1.0/ffff:ffff:ffff:ffff:ffff:ffff:ffff:ff00"),
        { address: 3232235776, mask: 0xffffff00 },
      );
      assertEquals(
        parseCidr("::ffff:192.168.1.0/ffff:ffff:ffff:ffff:ffff:ffff::"),
        { address: 3232235776, mask: 0 },
      );
      // A non-contiguous low half still unmaps: the mapped prefix is fixed.
      assertEquals(
        parseCidr("::ffff:192.168.1.0/ffff:ffff:ffff:ffff:ffff:ffff:ff00:ff"),
        { address: 3232235776, mask: 0xff0000ff },
      );
      // One zero bit in the high 96 keeps it IPv6.
      assertEquals(
        parseCidr("::ffff:192.168.1.0/ffff:ffff:ffff:ffff:ffff:fffe:ffff:ff00"),
        {
          address: 0xffffc0a80100n,
          mask: 0xfffffffffffffffffffffffeffffff00n,
        },
      );
    },
  );

  await t.step("keeps the zone ID when it unmaps", () => {
    assertEquals(parseCidr("::ffff:192.168.1.0%eth0/120"), {
      address: 3232235776,
      prefixLength: 24,
      zoneId: "eth0",
    });
  });

  await t.step("unmapToV4: false keeps every IPv6 block", () => {
    assertEquals(parseCidr("::ffff:192.168.1.0/120", { unmapToV4: false }), {
      address: 0xffffc0a80100n,
      prefixLength: 120,
    });
    assertEquals(parseCidr("::ffff:192.168.1.0/120", { unmapToV4: true }), {
      address: 3232235776,
      prefixLength: 24,
    });
    assertEquals(parseCidr("::ffff:192.168.1.0/120", {}), {
      address: 3232235776,
      prefixLength: 24,
    });
  });

  await t.step("preserves non-mapped IPv6 CIDR", () => {
    assertEquals(parseCidr("2001:db8::/32"), {
      address: 0x20010db8n << 96n,
      prefixLength: 32,
    });
    assertEquals(parseCidr("::/96"), { address: 0n, prefixLength: 96 });
  });

  await t.step("rejects an address without a prefix", () => {
    assertThrows(() => parseCidr("10.0.0.1"), TypeError);
    assertThrows(() => parseCidr("fe80::1%eth0"), TypeError);
  });
});

Deno.test("stringifyCidr", async (t) => {
  await t.step("stringifies IPv4 CIDR", () => {
    assertEquals(stringifyCidr(parseCidr("192.168.1.0/24")), "192.168.1.0/24");
    assertEquals(
      stringifyCidr({ address: 167772160, mask: 0xff000000 }),
      "10.0.0.0/255.0.0.0",
    );
  });

  await t.step("stringifies IPv6 CIDR", () => {
    assertEquals(stringifyCidr(parseCidr("2001:db8::/32")), "2001:db8::/32");
    assertEquals(
      stringifyCidr({ address: 0xfe80n << 112n, mask: 0xffffffffn << 96n }),
      "fe80::/ffff:ffff::",
    );
  });

  await t.step("a bare address gets the noun default of its version", () => {
    assertEquals(stringifyCidr(3232235777), "192.168.1.1/32");
    assertEquals(
      stringifyCidr(0xfe800000000000000000000000000001n),
      "fe80::1/128",
    );
    assertEquals(
      stringifyCidr({
        address: 0xfe800000000000000000000000000001n,
        zoneId: "eth0",
      }),
      "fe80::1%eth0/128",
    );
    assertEquals(
      stringifyCidr(parseAddress("192.168.1.1%ether1")),
      "192.168.1.1%ether1/32",
    );
  });

  await t.step("a zone ID goes between the address and the slash", () => {
    assertEquals(
      stringifyCidr(parseCidr("fe80::%ether1/64")),
      "fe80::%ether1/64",
    );
    assertEquals(
      stringifyCidr({
        address: 3232235777,
        zoneId: "ether1",
        prefixLength: 24,
      }),
      "192.168.1.1%ether1/24",
    );
  });
});

Deno.test("parseCidr round-trip", async (t) => {
  await t.step("IPv4 round-trip", () => {
    const cidrs = ["10.0.0.0/8", "192.168.1.0/24", "172.16.0.0/12"];
    for (const c of cidrs) {
      const parsed = parseCidr(c);
      assertEquals(stringifyCidr(parsed), c);
    }
  });

  await t.step("IPv6 round-trip", () => {
    const cidrs = ["2001:db8::/32", "fe80::/10", "::/0"];
    for (const c of cidrs) {
      const parsed = parseCidr(c);
      assertEquals(stringifyCidr(parsed), c);
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

Deno.test("cidrContains", async (t) => {
  await t.step("delegates to IPv4", () => {
    assert(
      cidrContains(parseCidr("10.0.0.0/8"), parseAddress("10.1.2.3").address),
    );
    assertEquals(
      cidrContains(parseCidr("10.0.0.0/8"), parseAddress("11.0.0.1").address),
      false,
    );
  });

  await t.step("delegates to IPv6", () => {
    assert(
      cidrContains(
        parseCidr("2001:db8::/32"),
        parseAddress("2001:db8::1").address,
      ),
    );
    assertEquals(
      cidrContains(
        parseCidr("2001:db8::/32"),
        parseAddress("2001:db9::1").address,
      ),
      false,
    );
  });

  await t.step("non-canonical CIDRs are masked to their network", () => {
    assert(
      cidrContains(parseCidr("10.1.2.3/8"), parseAddress("10.9.9.9").address),
    );
    assert(
      cidrContains(
        parseCidr("2001:db8:1::5/32"),
        parseAddress("2001:db8::1").address,
      ),
    );
  });

  await t.step("mixed v4/v6 returns false instead of throwing", () => {
    assertEquals(
      cidrContains(
        parseCidr("10.0.0.0/8"),
        parseAddress("2001:db8::1").address,
      ),
      false,
    );
    assertEquals(
      cidrContains(
        parseCidr("2001:db8::/32"),
        parseAddress("10.1.2.3").address,
      ),
      false,
    );
    assertEquals(
      cidrContains(parseCidr("::/0"), parseAddress("10.1.2.3").address),
      false,
    );
    assertEquals(
      cidrContains(parseCidr("0.0.0.0/0"), parseAddress("2001:db8::1").address),
      false,
    );
  });

  await t.step(
    "IPv4-mapped address from parseAddress matches an IPv4 CIDR",
    () => {
      assert(
        cidrContains(
          parseCidr("10.0.0.0/8"),
          parseAddress("::ffff:10.1.2.3").address,
        ),
      );
    },
  );

  await t.step("IPv4-mapped address from parseAddressv6 stays IPv6", () => {
    assertEquals(
      cidrContains(
        parseCidr("10.0.0.0/8"),
        parseAddressv6("::ffff:10.1.2.3").address,
      ),
      false,
    );
    // parseCidr would unwrap the mapped prefix to 0.0.0.0/0; parseCidrv6 keeps it IPv6
    assert(
      cidrContains(
        parseCidrv6("::ffff:0:0/96"),
        parseAddressv6("::ffff:10.1.2.3").address,
      ),
    );
  });
});

Deno.test("cidrContainsCidr", async (t) => {
  await t.step("delegates to IPv4", () => {
    assert(
      cidrContainsCidr(parseCidr("10.0.0.0/8"), parseCidr("10.1.0.0/16")),
    );
    assertEquals(
      cidrContainsCidr(parseCidr("10.1.0.0/16"), parseCidr("10.0.0.0/8")),
      false,
    );
  });

  await t.step("delegates to IPv6", () => {
    assert(
      cidrContainsCidr(
        parseCidr("2001:db8::/32"),
        parseCidr("2001:db8:1::/48"),
      ),
    );
    assertEquals(
      cidrContainsCidr(
        parseCidr("2001:db8:1::/48"),
        parseCidr("2001:db8::/32"),
      ),
      false,
    );
  });

  await t.step("mixed v4/v6 throws TypeError", () => {
    assertThrows(
      () =>
        cidrContainsCidr(parseCidr("10.0.0.0/8"), parseCidr("2001:db8::/32")),
      TypeError,
    );
    assertThrows(
      () =>
        cidrContainsCidr(parseCidr("2001:db8::/32"), parseCidr("10.0.0.0/8")),
      TypeError,
    );
    assertThrows(
      () => cidrContainsCidr(parseCidr("0.0.0.0/0"), parseCidr("::/0")),
      TypeError,
    );
  });
});

Deno.test("cidrOverlaps", async (t) => {
  await t.step("delegates to IPv4", () => {
    assert(
      cidrOverlaps(parseCidr("10.0.0.0/8"), parseCidr("10.1.0.0/16")),
    );
    assertEquals(
      cidrOverlaps(parseCidr("10.0.0.0/8"), parseCidr("172.16.0.0/12")),
      false,
    );
  });

  await t.step("delegates to IPv6", () => {
    assert(
      cidrOverlaps(parseCidr("2001:db8::/32"), parseCidr("2001:db8:1::/48")),
    );
    assertEquals(
      cidrOverlaps(parseCidr("2001:db8::/32"), parseCidr("2001:db9::/32")),
      false,
    );
  });

  await t.step("mixed v4/v6 throws TypeError", () => {
    assertThrows(
      () => cidrOverlaps(parseCidr("10.0.0.0/8"), parseCidr("2001:db8::/32")),
      TypeError,
    );
    assertThrows(
      () => cidrOverlaps(parseCidr("::/0"), parseCidr("0.0.0.0/0")),
      TypeError,
    );
  });
});

Deno.test("cidrIntersect", async (t) => {
  await t.step("delegates to IPv4", () => {
    const result = cidrIntersect(
      parseCidr("10.0.0.0/8"),
      parseCidr("10.1.0.0/16"),
    );
    assertEquals(result && stringifyCidr(result), "10.1.0.0/16");
  });

  await t.step("delegates to IPv6", () => {
    const result = cidrIntersect(
      parseCidr("2001:db8::/32"),
      parseCidr("2001:db8:1::/48"),
    );
    assertEquals(result && stringifyCidr(result), "2001:db8:1::/48");
  });

  await t.step("mixed v4/v6 throws TypeError", () => {
    assertThrows(
      () => cidrIntersect(parseCidr("10.0.0.0/8"), parseCidr("2001:db8::/32")),
      TypeError,
    );
    assertThrows(
      () => cidrIntersect(parseCidr("2001:db8::/32"), parseCidr("10.0.0.0/8")),
      TypeError,
    );
  });
});

Deno.test("cidrSubtract", async (t) => {
  await t.step("delegates to IPv4", () => {
    const result = cidrSubtract(
      parseCidr("10.0.0.0/24"),
      parseCidr("172.16.0.0/24"),
    );
    assertEquals(
      result.map(stringifyCidr),
      ["10.0.0.0/24"],
    );
  });

  await t.step("delegates to IPv6", () => {
    const result = cidrSubtract(
      parseCidr("2001:db8::/32"),
      parseCidr("2001:db9::/32"),
    );
    assertEquals(
      result.map(stringifyCidr),
      ["2001:db8::/32"],
    );
  });

  await t.step("mixed v4/v6 throws TypeError", () => {
    assertThrows(
      () => cidrSubtract(parseCidr("10.0.0.0/8"), parseCidr("2001:db8::/32")),
      TypeError,
    );
    assertThrows(
      () => cidrSubtract(parseCidr("2001:db8::/32"), parseCidr("10.0.0.0/8")),
      TypeError,
    );
  });
});

Deno.test("cidrMerge", async (t) => {
  await t.step("merges IPv4 array", () => {
    const result = cidrMerge([
      parseCidr("10.0.0.0/25"),
      parseCidr("10.0.0.128/25"),
    ]);
    assertEquals(
      result.map((c) => stringifyCidr(c)),
      ["10.0.0.0/24"],
    );
  });

  await t.step("merges IPv6 array", () => {
    const result = cidrMerge([
      parseCidr("2001:db8::/33"),
      parseCidr("2001:db8:8000::/33"),
    ]);
    assertEquals(
      result.map((c) => stringifyCidr(c)),
      ["2001:db8::/32"],
    );
  });

  await t.step("empty array returns empty", () => {
    assertEquals(cidrMerge([]), []);
  });
});

Deno.test("cidrSize", async (t) => {
  await t.step("returns number for IPv4", () => {
    assertEquals(cidrSize(parseCidr("192.168.1.0/24")), 256);
    assertEquals(cidrSize(parseCidr("10.0.0.0/8")), 16777216);
    assertEquals(cidrSize(parseCidr("0.0.0.0/0")), 4294967296);
  });

  await t.step("returns bigint for IPv6", () => {
    assertEquals(cidrSize(parseCidr("fd00::/120")), 256n);
    assertEquals(cidrSize(parseCidr("::1/128")), 1n);
  });
});

Deno.test("cidrAddresses", async (t) => {
  await t.step("generates IPv4 addresses", () => {
    const addrs = Array.from(
      cidrAddresses(parseCidr("10.0.0.0/30")),
    );
    assertEquals(addrs.length, 4);
    assertEquals(typeof addrs[0], "number");
  });

  await t.step("generates IPv6 addresses", () => {
    const addrs = Array.from(
      cidrAddresses(parseCidr("fd00::/126"), { count: 4 }),
    );
    assertEquals(addrs.length, 4);
    assertEquals(typeof addrs[0], "bigint");
  });

  await t.step("supports offset and count for IPv4", () => {
    const addrs = Array.from(
      cidrAddresses(parseCidr("10.0.0.0/29"), { offset: 1, count: 3 }),
    );
    assertEquals(addrs.length, 3);
  });

  await t.step("supports offset and count for IPv6", () => {
    const addrs = Array.from(
      cidrAddresses(parseCidr("fd00::/120"), { offset: 1, count: 3 }),
    );
    assertEquals(addrs.length, 3);
  });
});

Deno.test("compareCidr", async (t) => {
  await t.step("delegates to IPv4", () => {
    assertEquals(
      compareCidr(parseCidr("10.0.0.0/8"), parseCidr("192.168.0.0/16")),
      -1,
    );
    assertEquals(
      compareCidr(parseCidr("10.0.0.0/8"), parseCidr("10.0.0.0/16")),
      -1,
    );
    assertEquals(
      compareCidr(parseCidr("10.0.0.0/8"), parseCidr("10.0.0.0/8")),
      0,
    );
  });

  await t.step("delegates to IPv6", () => {
    assertEquals(
      compareCidr(parseCidr("2001:db8::/32"), parseCidr("fd00::/8")),
      -1,
    );
    assertEquals(
      compareCidr(parseCidr("2001:db8::/32"), parseCidr("2001:db8::/48")),
      -1,
    );
    assertEquals(
      compareCidr(parseCidr("2001:db8::/32"), parseCidr("2001:db8::/32")),
      0,
    );
  });

  await t.step("sorts every IPv4 block before every IPv6 block", () => {
    assertEquals(compareCidr(parseCidr("255.0.0.0/8"), parseCidr("::/0")), -1);
    assertEquals(compareCidr(parseCidr("::/0"), parseCidr("0.0.0.0/0")), 1);
  });

  await t.step("sorts a mixed list instead of throwing", () => {
    const mixed = [
      "2001:db8::/32",
      "192.168.1.0/24",
      "10.0.0.0/16",
      "fd00::/8",
      "10.0.0.0/8",
    ].map((s) => parseCidr(s));

    assertEquals(mixed.toSorted(compareCidr).map(stringifyCidr), [
      "10.0.0.0/8",
      "10.0.0.0/16",
      "192.168.1.0/24",
      "2001:db8::/32",
      "fd00::/8",
    ]);
  });

  await t.step("agrees with the order cidrMerge produces", () => {
    const blocks = ["10.2.0.0/16", "192.168.0.0/16", "10.0.0.0/16"].map(
      (s) => parseCidr(s),
    );
    const ordered = ["10.0.0.0/16", "10.2.0.0/16", "192.168.0.0/16"];

    assertEquals(blocks.toSorted(compareCidr).map(stringifyCidr), ordered);
    assertEquals(cidrMerge(blocks).map(stringifyCidr), ordered);
  });
});

Deno.test("cidrFirstAddress", async (t) => {
  await t.step("returns number for IPv4", () => {
    const address = cidrFirstAddress(parseCidr("192.168.1.0/24"));
    assertEquals(typeof address, "number");
    assertEquals(stringifyAddress(address), "192.168.1.0");
  });

  await t.step("returns bigint for IPv6", () => {
    const address = cidrFirstAddress(parseCidr("2001:db8::/32"));
    assertEquals(typeof address, "bigint");
    assertEquals(stringifyAddress(address), "2001:db8::");
  });

  await t.step("masks a non-canonical block of either version", () => {
    assertEquals(
      stringifyAddress(cidrFirstAddress(parseCidr("192.168.1.77/24"))),
      "192.168.1.0",
    );
    assertEquals(
      stringifyAddress(cidrFirstAddress(parseCidr("2001:db8::dead/32"))),
      "2001:db8::",
    );
  });
});

Deno.test("cidrLastAddress", async (t) => {
  await t.step("returns number for IPv4", () => {
    const address = cidrLastAddress(parseCidr("192.168.1.0/24"));
    assertEquals(typeof address, "number");
    assertEquals(stringifyAddress(address), "192.168.1.255");
  });

  await t.step("returns bigint for IPv6", () => {
    const address = cidrLastAddress(parseCidr("2001:db8::/120"));
    assertEquals(typeof address, "bigint");
    assertEquals(stringifyAddress(address), "2001:db8::ff");
  });

  await t.step("masks a non-canonical block of either version", () => {
    assertEquals(
      stringifyAddress(cidrLastAddress(parseCidr("192.168.1.77/24"))),
      "192.168.1.255",
    );
    assertEquals(
      stringifyAddress(cidrLastAddress(parseCidr("2001:db8::dead/112"))),
      "2001:db8::ffff",
    );
  });

  await t.step("bounds span the whole block when the version is known", () => {
    const v4 = parseCidrv4("10.0.0.0/29");
    assertEquals(cidrLastAddress(v4) - cidrFirstAddress(v4) + 1, cidrSize(v4));

    const v6 = parseCidrv6("fd00::/120");
    assertEquals(cidrLastAddress(v6) - cidrFirstAddress(v6) + 1n, cidrSize(v6));
  });
});

Deno.test("mask dialect", async (t) => {
  const v4Masked = {
    address: parseAddressv4("10.0.0.0").address,
    mask: 0xFF000000,
  };
  const v6Masked = {
    address: parseAddressv6("2001:db8::").address,
    mask: 0xFFFFFFFF000000000000000000000000n,
  };

  await t.step("isCidrv4 accepts a masked block", () => {
    assert(isCidrv4(v4Masked));
    assertEquals(isCidrv4(v6Masked), false);
  });

  await t.step("isCidrv6 accepts a masked block", () => {
    assert(isCidrv6(v6Masked));
    assertEquals(isCidrv6(v4Masked), false);
  });

  await t.step("stringifyCidr writes the mask back", () => {
    assertEquals(stringifyCidr(v4Masked), "10.0.0.0/255.0.0.0");
    assertEquals(stringifyCidr(v6Masked), "2001:db8::/ffff:ffff::");
  });

  await t.step("cidrContains with masked blocks", () => {
    assert(cidrContains(v4Masked, parseAddress("10.1.2.3").address));
    assert(cidrContains(v6Masked, parseAddress("2001:db8::1").address));
    assertEquals(
      cidrContains(v4Masked, parseAddress("2001:db8::1").address),
      false,
    );
  });

  await t.step("cidrContainsCidr across dialects", () => {
    assert(cidrContainsCidr(v4Masked, parseCidrv4("10.1.0.0/16")));
    assertThrows(
      () => cidrContainsCidr<Cidr>(v4Masked, v6Masked),
      TypeError,
    );
  });

  await t.step("cidrOverlaps across dialects", () => {
    assert(cidrOverlaps(parseCidrv6("2001:db8:1::/48"), v6Masked));
  });

  await t.step("cidrIntersect of mixed dialects is masked", () => {
    assertEquals(
      cidrIntersect(v4Masked, parseCidrv4("10.1.0.0/16")),
      { address: parseAddressv4("10.1.0.0").address, mask: 0xFFFF0000 },
    );
  });

  await t.step("cidrSubtract of mixed dialects is masked", () => {
    assertEquals(
      cidrSubtract(v6Masked, parseCidrv6("2001:db8::/33")).map(stringifyCidr),
      ["2001:db8:8000::/ffff:ffff:8000::"],
    );
  });

  await t.step("cidrMerge of mixed dialects is masked", () => {
    assertEquals(
      cidrMerge([v4Masked, parseCidr("11.0.0.0/8")]).map(stringifyCidr),
      ["10.0.0.0/254.0.0.0"],
    );
  });

  await t.step("cidrSize with masked blocks", () => {
    assertEquals(cidrSize(v4Masked), 16777216);
    assertEquals(cidrSize(v6Masked), 1n << 96n);
  });

  await t.step("cidrFirstAddress with masked blocks", () => {
    assertEquals(stringifyAddress(cidrFirstAddress(v4Masked)), "10.0.0.0");
    assertEquals(stringifyAddress(cidrFirstAddress(v6Masked)), "2001:db8::");
  });

  await t.step("cidrLastAddress with masked blocks", () => {
    assertEquals(stringifyAddress(cidrLastAddress(v4Masked)), "10.255.255.255");
    assertEquals(
      stringifyAddress(cidrLastAddress(v6Masked)),
      "2001:db8:ffff:ffff:ffff:ffff:ffff:ffff",
    );
  });

  await t.step("cidrAddresses with a masked block", () => {
    assertEquals(
      Array.from(cidrAddresses(v4Masked, { count: 2 })).map(stringifyAddress),
      ["10.0.0.0", "10.0.0.1"],
    );
  });

  await t.step("compareCidr orders masked blocks with prefixed ones", () => {
    const list = [
      parseCidr("2001:db8::/48"),
      v6Masked,
      parseCidr("10.0.0.0/16"),
      v4Masked,
    ];
    assertEquals(list.toSorted(compareCidr).map(stringifyCidr), [
      "10.0.0.0/255.0.0.0",
      "10.0.0.0/16",
      "2001:db8::/ffff:ffff::",
      "2001:db8::/48",
    ]);
  });
});
