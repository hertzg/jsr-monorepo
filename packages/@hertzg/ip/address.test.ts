import { test } from "node:test";
import { assertEquals, assertThrows } from "@std/assert";
import { compareAddress, parseAddress, stringifyAddress } from "./address.ts";
import { parseAddressv4 } from "./addressv4.ts";
import { parseAddressv6 } from "./addressv6.ts";

test("parseAddress", async (t) => {
  await t.test("parses IPv4 addresses", () => {
    assertEquals(parseAddress("192.168.1.1"), { address: 3232235777 });
    assertEquals(parseAddress("10.0.0.1"), { address: 167772161 });
    assertEquals(parseAddress("0.0.0.0"), { address: 0 });
    assertEquals(parseAddress("255.255.255.255"), { address: 4294967295 });
  });

  await t.test("parses IPv6 addresses", () => {
    assertEquals(parseAddress("::1"), { address: 1n });
    assertEquals(parseAddress("::"), { address: 0n });
    assertEquals(parseAddress("2001:db8::1"), {
      address: 42540766411282592856903984951653826561n,
    });
  });

  await t.test("carries a zone ID on either version", () => {
    assertEquals(parseAddress("192.168.1.1%ether1"), {
      address: 3232235777,
      zoneId: "ether1",
    });
    assertEquals(parseAddress("fe80::1%eth0"), {
      address: 0xfe800000000000000000000000000001n,
      zoneId: "eth0",
    });
  });

  await t.test("dispatches on the address slot, not the whole string", () => {
    // A colon in the zone does not make an IPv4 address IPv6.
    assertEquals(parseAddress("10.0.0.1%eth0:1"), {
      address: 167772161,
      zoneId: "eth0:1",
    });
  });

  await t.test("unmaps IPv4-mapped IPv6 to IPv4 by default", () => {
    assertEquals(parseAddress("::ffff:192.168.1.1"), { address: 3232235777 });
    assertEquals(parseAddress("::ffff:10.0.0.1"), { address: 167772161 });
    assertEquals(parseAddress("::ffff:0.0.0.0"), { address: 0 });
    assertEquals(parseAddress("::ffff:c0a8:101"), { address: 3232235777 });
  });

  await t.test("keeps the zone ID when it unmaps", () => {
    assertEquals(parseAddress("::ffff:192.168.1.1%eth0"), {
      address: 3232235777,
      zoneId: "eth0",
    });
  });

  await t.test("unmapToV4: false keeps the bigint", () => {
    assertEquals(parseAddress("::ffff:192.168.1.1", { unmapToV4: false }), {
      address: 0xffffc0a80101n,
    });
    assertEquals(parseAddress("::ffff:192.168.1.1", { unmapToV4: true }), {
      address: 3232235777,
    });
    assertEquals(parseAddress("::ffff:192.168.1.1", {}), {
      address: 3232235777,
    });
  });

  await t.test("only the mapped range unmaps", () => {
    assertEquals(parseAddress("::1.2.3.4"), { address: 0x1020304n });
    assertEquals(parseAddress("64:ff9b::1.2.3.4"), {
      address: 0x0064ff9b0000000000000000_01020304n,
    });
  });

  await t.test("rejects a prefix", () => {
    assertThrows(() => parseAddress("10.0.0.0/8"), TypeError);
    assertThrows(() => parseAddress("10.0.0.0/255.0.0.0"), TypeError);
    assertThrows(() => parseAddress("fe80::%eth0/64"), TypeError);
    assertThrows(() => parseAddress("::ffff:1.2.3.4/120"), TypeError);
  });

  await t.test("rejects a malformed zone ID", () => {
    assertThrows(() => parseAddress("fe80::1%"), TypeError);
    assertThrows(() => parseAddress("192.168.1.1%"), TypeError);
    assertThrows(() => parseAddress("%eth0"), TypeError);
    assertThrows(() => parseAddress("fe80::1%eth0%1"), TypeError);
    assertThrows(() => parseAddress("fe80::1% eth0"), TypeError);
  });
});

test("stringifyAddress", async (t) => {
  await t.test("stringifies IPv4 addresses", () => {
    assertEquals(stringifyAddress(3232235777), "192.168.1.1");
    assertEquals(stringifyAddress(0), "0.0.0.0");
  });

  await t.test("stringifies IPv6 addresses", () => {
    assertEquals(stringifyAddress(1n), "::1");
    assertEquals(stringifyAddress(0n), "::");
    assertEquals(
      stringifyAddress(42540766411282592856903984951653826561n),
      "2001:db8::1",
    );
  });

  await t.test("stringifies a parse result, zone included", () => {
    assertEquals(stringifyAddress({ address: 3232235777 }), "192.168.1.1");
    assertEquals(
      stringifyAddress({ address: 3232235777, zoneId: "ether1" }),
      "192.168.1.1%ether1",
    );
    assertEquals(stringifyAddress({ address: 1n, zoneId: "lo0" }), "::1%lo0");
  });

  await t.test("an empty zone ID writes no %", () => {
    assertEquals(stringifyAddress({ address: 1n, zoneId: "" }), "::1");
  });
});

test("parseAddress round-trip", async (t) => {
  await t.test("IPv4 round-trip", () => {
    const addrs = ["192.168.1.1", "10.0.0.1", "0.0.0.0", "255.255.255.255"];
    for (const addr of addrs) {
      assertEquals(stringifyAddress(parseAddress(addr)), addr);
    }
  });

  await t.test("IPv6 round-trip", () => {
    const addrs = ["::1", "::", "2001:db8::1", "fe80::1"];
    for (const addr of addrs) {
      assertEquals(stringifyAddress(parseAddress(addr)), addr);
    }
  });

  await t.test("zone IDs round-trip verbatim", () => {
    const addrs = [
      "fe80::1%eth0",
      "fe80::1%12",
      "fe80::1%eth0.100",
      "fe80::1%eth0@1",
      "fe80::1%25eth0",
      "192.168.1.1%ether1",
      "10.155.101.1%sfp-sfpplus2@myVrf",
    ];
    for (const addr of addrs) {
      assertEquals(stringifyAddress(parseAddress(addr)), addr);
    }
  });

  await t.test("a mapped address round-trips to its IPv4 form", () => {
    assertEquals(
      stringifyAddress(parseAddress("::ffff:192.168.1.1")),
      "192.168.1.1",
    );
  });
});

test("compareAddress", async (t) => {
  await t.test("delegates to IPv4", () => {
    assertEquals(
      compareAddress(
        parseAddress("10.0.0.1").address,
        parseAddress("10.0.0.2").address,
      ),
      -1,
    );
    assertEquals(
      compareAddress(
        parseAddress("10.0.0.2").address,
        parseAddress("10.0.0.1").address,
      ),
      1,
    );
    assertEquals(
      compareAddress(
        parseAddress("10.0.0.1").address,
        parseAddress("10.0.0.1").address,
      ),
      0,
    );
  });

  await t.test("delegates to IPv6", () => {
    assertEquals(
      compareAddress(parseAddress("::1").address, parseAddress("::2").address),
      -1,
    );
    assertEquals(
      compareAddress(parseAddress("::2").address, parseAddress("::1").address),
      1,
    );
    assertEquals(
      compareAddress(parseAddress("::1").address, parseAddress("::1").address),
      0,
    );
  });

  await t.test("sorts every IPv4 address before every IPv6 address", () => {
    assertEquals(
      compareAddress(
        parseAddress("255.255.255.255").address,
        parseAddress("::").address,
      ),
      -1,
    );
    assertEquals(
      compareAddress(
        parseAddress("::").address,
        parseAddress("0.0.0.0").address,
      ),
      1,
    );
  });

  await t.test("sorts a mixed list instead of throwing", () => {
    const mixed = ["2001:db8::1", "10.0.0.2", "::1", "10.0.0.1"].map(
      (s) => parseAddress(s).address,
    );
    assertEquals(mixed.toSorted(compareAddress).map(stringifyAddress), [
      "10.0.0.1",
      "10.0.0.2",
      "::1",
      "2001:db8::1",
    ]);
  });

  await t.test(
    "an IPv4-mapped bigint is an IPv6 value, not its IPv4 twin",
    () => {
      const mapped = parseAddressv6("::ffff:10.0.0.1").address;
      const plain = parseAddressv4("10.0.0.1").address;

      assertEquals(compareAddress(mapped, plain), 1);
      assertEquals(compareAddress(plain, mapped), -1);
    },
  );

  await t.test(
    "parseAddress unmaps mapped addresses, so they compare equal",
    () => {
      assertEquals(
        compareAddress(
          parseAddress("::ffff:10.0.0.1").address,
          parseAddress("10.0.0.1").address,
        ),
        0,
      );
    },
  );
});
