import { assertEquals, assertThrows } from "@std/assert";
import { parseAddress, stringifyAddress } from "./address.ts";
import { parseAddressv4, stringifyAddressv4 } from "./addressv4.ts";
import { parseAddressv6, stringifyAddressv6 } from "./addressv6.ts";
import { parseCidr, stringifyCidr } from "./cidr.ts";
import { cidrv4PrefixLength, parseCidrv4, stringifyCidrv4 } from "./cidrv4.ts";
import { parseCidrv6, stringifyCidrv6 } from "./cidrv6.ts";
import { splitNotation } from "./notation.ts";

Deno.test("splitNotation", async (t) => {
  await t.step("an address alone", () => {
    assertEquals(splitNotation("192.168.1.1"), { address: "192.168.1.1" });
    assertEquals(splitNotation("fe80::1"), { address: "fe80::1" });
  });

  await t.step("address and zone ID", () => {
    assertEquals(splitNotation("fe80::1%eth0"), {
      address: "fe80::1",
      zoneId: "eth0",
    });
    assertEquals(splitNotation("192.168.1.1%ether1"), {
      address: "192.168.1.1",
      zoneId: "ether1",
    });
  });

  await t.step("address and prefix", () => {
    assertEquals(splitNotation("10.0.0.0/8"), {
      address: "10.0.0.0",
      prefix: "8",
    });
    assertEquals(splitNotation("10.0.0.0/255.0.0.0"), {
      address: "10.0.0.0",
      prefix: "255.0.0.0",
    });
    assertEquals(splitNotation("fe80::/ffff:ffff::"), {
      address: "fe80::",
      prefix: "ffff:ffff::",
    });
  });

  await t.step("all three slots", () => {
    assertEquals(splitNotation("fe80::%ether1/64"), {
      address: "fe80::",
      zoneId: "ether1",
      prefix: "64",
    });
    assertEquals(splitNotation("fe80::1%eth0/64"), {
      address: "fe80::1",
      zoneId: "eth0",
      prefix: "64",
    });
  });

  await t.step("absent slots are absent, not undefined-valued keys", () => {
    assertEquals(Object.keys(splitNotation("fe80::1")), ["address"]);
    assertEquals(Object.keys(splitNotation("fe80::1%eth0")), [
      "address",
      "zoneId",
    ]);
    assertEquals(Object.keys(splitNotation("fe80::/64")), [
      "address",
      "prefix",
    ]);
  });

  await t.step("knows nothing about IP: any text splits", () => {
    assertEquals(splitNotation("garbage"), { address: "garbage" });
    assertEquals(splitNotation("a%b/c"), {
      address: "a",
      zoneId: "b",
      prefix: "c",
    });
    assertEquals(splitNotation(" 10.0.0.1 "), { address: " 10.0.0.1 " });
  });

  await t.step("the zone slice stops at the slash: no greedy zone", () => {
    // Go and Java read "fe80::1%eth0/64" as the zone "eth0/64". Here the
    // slash bounds the zone, so that reading cannot happen.
    const { zoneId, prefix } = splitNotation("fe80::1%eth0/64");
    assertEquals(zoneId, "eth0");
    assertEquals(prefix, "64");
  });

  await t.step("the zone is split off before any dot is looked at", () => {
    // A VLAN interface name has a dot; a dot-first parser would take
    // "eth0.100" for an embedded IPv4 tail.
    assertEquals(splitNotation("fe80::1%eth0.100"), {
      address: "fe80::1",
      zoneId: "eth0.100",
    });
  });

  await t.step("the zone is carried verbatim, never percent-decoded", () => {
    assertEquals(splitNotation("fe80::1%25eth0"), {
      address: "fe80::1",
      zoneId: "25eth0",
    });
    assertEquals(splitNotation("111.13.0.2%sfp-sfpplus2@myVrf"), {
      address: "111.13.0.2",
      zoneId: "sfp-sfpplus2@myVrf",
    });
  });

  await t.step("whitespace in a zone is not this layer's concern", () => {
    assertEquals(splitNotation("fe80::1% eth0"), {
      address: "fe80::1",
      zoneId: " eth0",
    });
  });
});

Deno.test("splitNotation rejects exactly five shapes", async (t) => {
  await t.step("two %", () => {
    assertThrows(
      () => splitNotation("fe80::1%eth0%1"),
      TypeError,
      "Notation must contain '%' at most once, got 'fe80::1%eth0%1'",
    );
    assertThrows(() => splitNotation("fe80::1%%"), TypeError);
    assertThrows(() => splitNotation("%%"), TypeError);
  });

  await t.step("two /", () => {
    assertThrows(
      () => splitNotation("10.0.0.0/8/8"),
      TypeError,
      "Notation must contain '/' at most once, got '10.0.0.0/8/8'",
    );
    assertThrows(() => splitNotation("10.0.0.0//8"), TypeError);
    assertThrows(() => splitNotation("fe80::1%a/64/64"), TypeError);
  });

  await t.step("% after /", () => {
    assertThrows(
      () => splitNotation("10.0.0.0/8%eth0"),
      TypeError,
      "Zone ID must precede the prefix, got '10.0.0.0/8%eth0'",
    );
    assertThrows(() => splitNotation("fe80::/64%eth0"), TypeError);
    assertThrows(() => splitNotation("fe80::/64%"), TypeError);
  });

  await t.step("empty address", () => {
    assertThrows(
      () => splitNotation("%eth0"),
      TypeError,
      "Notation must start with an address, got '%eth0'",
    );
    assertThrows(() => splitNotation("/64"), TypeError);
    assertThrows(() => splitNotation("%eth0/64"), TypeError);
    assertThrows(() => splitNotation(""), TypeError);
    assertThrows(() => splitNotation("%"), TypeError);
    assertThrows(() => splitNotation("/"), TypeError);
  });

  await t.step("empty zone ID or prefix", () => {
    assertThrows(
      () => splitNotation("fe80::1%"),
      TypeError,
      "Zone ID must not be empty, got 'fe80::1%'",
    );
    assertThrows(() => splitNotation("fe80::%/64"), TypeError);
    assertThrows(
      () => splitNotation("10.0.0.0/"),
      TypeError,
      "Prefix must not be empty, got '10.0.0.0/'",
    );
    assertThrows(() => splitNotation("fe80::1%eth0/"), TypeError);
  });

  await t.step("and nothing else", () => {
    // Every rejection above is a shape error; nothing here is a range error.
    for (const input of ["a%b%c", "a/b/c", "a/b%c", "%a", "/a", "a%", "a/"]) {
      assertThrows(() => splitNotation(input), TypeError, undefined, input);
    }
  });
});

// The six parsers are narrowings of one grammar (ADR 0003). This is the
// behaviour table from the v5 proposal, at the parsers' defaults: each row
// is one input, each column one parser, `TypeError` a rejection.
Deno.test("the six parsers narrow one grammar", async (t) => {
  const L1 = 0xfe800000000000000000000000000001n;
  const V1 = 3232235777;
  const M4 = 16909060;
  const M6 = 0xffff01020304n;
  const X = TypeError;

  type Cell = Record<string, unknown> | ErrorConstructor;
  type Row = [
    input: string,
    parseAddress: Cell,
    parseAddressv4: Cell,
    parseAddressv6: Cell,
    parseCidr: Cell,
    parseCidrv4: Cell,
    parseCidrv6: Cell,
  ];

  const table: Row[] = [
    ["fe80::1", { address: L1 }, X, { address: L1 }, X, X, X],
    [
      "fe80::1%lo0",
      { address: L1, zoneId: "lo0" },
      X,
      { address: L1, zoneId: "lo0" },
      X,
      X,
      X,
    ],
    [
      "fe80::1%12",
      { address: L1, zoneId: "12" },
      X,
      { address: L1, zoneId: "12" },
      X,
      X,
      X,
    ],
    [
      "fe80::1%eth0.100",
      { address: L1, zoneId: "eth0.100" },
      X,
      { address: L1, zoneId: "eth0.100" },
      X,
      X,
      X,
    ],
    [
      "fe80::1%eth0@1",
      { address: L1, zoneId: "eth0@1" },
      X,
      { address: L1, zoneId: "eth0@1" },
      X,
      X,
      X,
    ],
    [
      "fe80::1%25eth0",
      { address: L1, zoneId: "25eth0" },
      X,
      { address: L1, zoneId: "25eth0" },
      X,
      X,
      X,
    ],
    ["192.168.1.1", { address: V1 }, { address: V1 }, X, X, X, X],
    [
      "192.168.1.1%ether1",
      { address: V1, zoneId: "ether1" },
      { address: V1, zoneId: "ether1" },
      X,
      X,
      X,
      X,
    ],
    ["10.0.0.0/8", X, X, X, { address: 167772160, prefixLength: 8 }, {
      address: 167772160,
      prefixLength: 8,
    }, X],
    ["10.0.0.0/255.0.0.0", X, X, X, { address: 167772160, mask: 0xff000000 }, {
      address: 167772160,
      mask: 0xff000000,
    }, X],
    [
      "fe80::%ether1/64",
      X,
      X,
      X,
      { address: 0xfe80n << 112n, zoneId: "ether1", prefixLength: 64 },
      X,
      { address: 0xfe80n << 112n, zoneId: "ether1", prefixLength: 64 },
    ],
    [
      "fe80::1%lo0/64",
      X,
      X,
      X,
      { address: L1, zoneId: "lo0", prefixLength: 64 },
      X,
      { address: L1, zoneId: "lo0", prefixLength: 64 },
    ],
    [
      "fe80::/ffff:ffff::",
      X,
      X,
      X,
      { address: 0xfe80n << 112n, mask: 0xffffffffn << 96n },
      X,
      { address: 0xfe80n << 112n, mask: 0xffffffffn << 96n },
    ],
    ["::ffff:1.2.3.4", { address: M4 }, X, { address: M6 }, X, X, X],
    ["::ffff:1.2.3.4/120", X, X, X, { address: M4, prefixLength: 24 }, X, {
      address: M6,
      prefixLength: 120,
    }],
    ["fe80::1%", X, X, X, X, X, X],
    ["fe80::%", X, X, X, X, X, X],
    ["fe80::1%eth0%1", X, X, X, X, X, X],
    ["192.168.1.1%", X, X, X, X, X, X],
    ["%eth0", X, X, X, X, X, X],
    ["10.0.0.1", { address: 167772161 }, { address: 167772161 }, X, X, X, X],
  ];

  const parsers = [
    ["parseAddress", parseAddress],
    ["parseAddressv4", parseAddressv4],
    ["parseAddressv6", parseAddressv6],
    ["parseCidr", parseCidr],
    ["parseCidrv4", parseCidrv4],
    ["parseCidrv6", parseCidrv6],
  ] as const;

  for (const [input, ...cells] of table) {
    await t.step(input, () => {
      for (const [column, [name, parse]] of parsers.entries()) {
        const expected = cells[column];
        if (typeof expected === "function") {
          assertThrows(() => parse(input), expected, undefined, name);
        } else {
          assertEquals(parse(input), expected, name);
        }
      }
    });
  }
});

// The traces from the parser spec, one per layer-3 rule they exercise.
Deno.test("layered parser traces", async (t) => {
  await t.step("fe80::%ether1/64: L1 splits, L3 checks the range", () => {
    assertEquals(parseCidrv6("fe80::%ether1/64"), {
      address: 0xfe80n << 112n,
      zoneId: "ether1",
      prefixLength: 64,
    });
  });

  await t.step("fe80::1%eth0.100: the zone splits before any dot", () => {
    assertEquals(parseAddressv6("fe80::1%eth0.100").zoneId, "eth0.100");
  });

  await t.step("10.0.0.0/8%eth0: the zone must precede the prefix", () => {
    assertThrows(
      () => parseCidrv4("10.0.0.0/8%eth0"),
      TypeError,
      "Zone ID must precede the prefix",
    );
  });

  await t.step("fe80::1%eth0%1: two % die in layer 1", () => {
    assertThrows(
      () => parseAddressv6("fe80::1%eth0%1"),
      TypeError,
      "'%' at most once",
    );
  });

  await t.step("10.0.0.0/255.0.0.0: a dotted prefix is a mask", () => {
    assertEquals(parseCidrv4("10.0.0.0/255.0.0.0"), {
      address: 167772160,
      mask: 0xff000000,
    });
  });

  await t.step("10.0.0.0/ffff:ff00::: a mask must match the version", () => {
    assertThrows(() => parseCidrv4("10.0.0.0/ffff:ff00::"), TypeError);
    assertThrows(() => parseCidr("10.0.0.0/ffff:ff00::"), TypeError);
    assertThrows(() => parseCidrv6("fe80::/255.0.0.0"), TypeError);
    assertThrows(() => parseCidr("fe80::/255.0.0.0"), TypeError);
  });

  await t.step("10.0.0.0/255.0.0.255: a non-contiguous mask parses", () => {
    assertEquals(parseCidrv4("10.0.0.0/255.0.0.255"), {
      address: 167772160,
      mask: 0xff0000ff,
    });
    assertThrows(
      () => cidrv4PrefixLength(parseCidrv4("10.0.0.0/255.0.0.255")),
      TypeError,
    );
  });

  await t.step("::ffff:1.2.3.4/120: parseCidr unmaps and rebases", () => {
    assertEquals(parseCidr("::ffff:1.2.3.4/120"), {
      address: 16909060,
      prefixLength: 24,
    });
  });

  await t.step("::ffff:1.2.3.4/64: below /96 stays IPv6", () => {
    assertEquals(parseCidr("::ffff:1.2.3.4/64"), {
      address: 0xffff01020304n,
      prefixLength: 64,
    });
  });

  await t.step("192.168.1.1%ether1: IPv4 zones are real", () => {
    assertEquals(parseAddressv4("192.168.1.1%ether1"), {
      address: 3232235777,
      zoneId: "ether1",
    });
  });

  await t.step("fe80::1%: an empty zone is a shape error", () => {
    assertThrows(() => parseAddressv6("fe80::1%"), TypeError);
  });

  await t.step("::ffff:1.2.3.4/96: unmaps to /0", () => {
    assertEquals(parseCidr("::ffff:1.2.3.4/96"), {
      address: 16909060,
      prefixLength: 0,
    });
  });

  await t.step("1:2:3:4:5:6:7:8::: :: must cover a group", () => {
    assertThrows(() => parseAddressv6("1:2:3:4:5:6:7:8::"), TypeError);
  });

  await t.step(
    "1:2:3:1.2.3.4:5:6: a dotted quad only as the last field",
    () => {
      assertThrows(() => parseAddressv6("1:2:3:1.2.3.4:5:6"), TypeError);
    },
  );
});

Deno.test("errors: wrong shape is TypeError, too large is RangeError", async (t) => {
  await t.step("shape errors", () => {
    const shapes = [
      "fe80::1%eth0%1",
      "10.0.0.0/8/8",
      "10.0.0.0/8%eth0",
      "%eth0",
      "fe80::1%",
      "10.0.0.0/",
      "fe80::1% eth0",
      "10.0.0.0/ffff:ff00::",
      "fe80::/255.0.0.0",
      "10.0.0.0/08",
      "10.0.0.0/+8",
      "10.0.0.0/-1",
      "10.0.0.0/8 ",
      "1.2.3",
      "1:2:3:4:5:6:7:8::",
      "ffgg::",
    ];
    for (const input of shapes) {
      assertThrows(() => parseAddress(input), TypeError, undefined, input);
      assertThrows(() => parseCidr(input), TypeError, undefined, input);
    }
  });

  await t.step("range errors", () => {
    assertThrows(() => parseAddress("256.0.0.1"), RangeError);
    assertThrows(() => parseAddress("::1.2.3.256"), RangeError);
    assertThrows(() => parseCidr("10.0.0.0/33"), RangeError);
    assertThrows(() => parseCidr("fe80::/129"), RangeError);
    assertThrows(() => parseCidr("10.0.0.0/256.0.0.0"), RangeError);
    assertThrows(() => parseCidr("fe80::/ffff::1.2.3.256"), RangeError);
  });
});

Deno.test("stringify(parse(s)) === s for every canonical accepted form", async (t) => {
  const addresses = [
    "192.168.1.1",
    "192.168.1.1%ether1",
    "192.168.1.1%25",
    "10.155.101.1%sfp-sfpplus2@myVrf",
    "fe80::1",
    "fe80::1%eth0",
    "fe80::1%12",
    "fe80::1%eth0.100",
    "fe80::1%eth0@1",
    "fe80::1%25eth0",
    "::",
    "::1%lo0",
  ];
  const cidrs = [
    "10.0.0.0/8",
    "10.0.0.0/255.0.0.0",
    "10.0.0.0/255.0.0.255",
    "192.168.1.1%ether1/24",
    "192.168.1.1%ether1/255.255.255.0",
    "fe80::/10",
    "fe80::%ether1/64",
    "fe80::1%lo0/64",
    "fe80::/ffff:ffff::",
    "fe80::/ffff::ffff",
    "fe80::%eth0/ffff:ffff::",
    "::ffff:102:304/64",
    "::/0",
  ];

  await t.step("universal", () => {
    for (const s of addresses) {
      assertEquals(stringifyAddress(parseAddress(s)), s);
    }
    for (const s of cidrs) {
      assertEquals(stringifyCidr(parseCidr(s, { unmapToV4: false })), s);
    }
  });

  await t.step("IPv4", () => {
    for (const s of addresses.filter((s) => !s.includes(":"))) {
      assertEquals(stringifyAddressv4(parseAddressv4(s)), s);
    }
    for (const s of cidrs.filter((s) => !s.includes(":"))) {
      assertEquals(stringifyCidrv4(parseCidrv4(s)), s);
    }
  });

  await t.step("IPv6", () => {
    for (
      const s of [...addresses, "::ffff:c0a8:101%z"].filter((s) =>
        s.includes(":")
      )
    ) {
      assertEquals(stringifyAddressv6(parseAddressv6(s)), s);
    }
    for (const s of cidrs.filter((s) => s.includes(":"))) {
      assertEquals(stringifyCidrv6(parseCidrv6(s)), s);
    }
  });

  await t.step("the dialect is preserved, the omission is not", () => {
    assertEquals(
      stringifyCidr(parseCidr("10.0.0.0/255.0.0.0")),
      "10.0.0.0/255.0.0.0",
    );
    assertEquals(stringifyCidr(parseCidr("10.0.0.0/8")), "10.0.0.0/8");
    assertEquals(
      stringifyAddress(parseAddress("fe80::1%eth0")),
      "fe80::1%eth0",
    );
    assertThrows(() => parseCidr("10.0.0.1"), TypeError);
  });
});
