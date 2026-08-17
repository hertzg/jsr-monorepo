import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  compareAddressv4,
  parseAddressv4,
  stringifyAddressv4,
} from "./addressv4.ts";
import { isValidAddressv4 } from "./validatev4.ts";

Deno.test("parseAddressv4", async (t) => {
  await t.step("valid addresses", () => {
    assertEquals(parseAddressv4("192.168.1.1"), { address: 3232235777 });
    assertEquals(parseAddressv4("10.0.0.1"), { address: 167772161 });
    assertEquals(parseAddressv4("172.16.0.1"), { address: 2886729729 });
    assertEquals(parseAddressv4("127.0.0.1"), { address: 2130706433 });
  });

  await t.step("edge cases", () => {
    assertEquals(parseAddressv4("0.0.0.0"), { address: 0 });
    assertEquals(parseAddressv4("255.255.255.255"), { address: 4294967295 });
  });

  await t.step("invalid format - wrong number of octets", () => {
    assertThrows(
      () => parseAddressv4("192.168.1"),
      TypeError,
      "IPv4 address must have exactly 4 octets, got 3",
    );
    assertThrows(
      () => parseAddressv4("192.168.1.1.1"),
      TypeError,
      "IPv4 address must have exactly 4 octets, got 5",
    );
  });

  await t.step("invalid format - leading zeros", () => {
    assertThrows(
      () => parseAddressv4("192.168.01.1"),
      TypeError,
      "IPv4 octets cannot have leading zeros except '0' itself",
    );
    assertThrows(
      () => parseAddressv4("01.0.0.1"),
      TypeError,
      "IPv4 octets cannot have leading zeros except '0' itself",
    );
  });

  await t.step("invalid format - non-numeric", () => {
    assertThrows(
      () => parseAddressv4("a.b.c.d"),
      TypeError,
      "IPv4 address octets must be decimal numbers",
    );
    assertThrows(
      () => parseAddressv4("192.168.x.1"),
      TypeError,
      "IPv4 address octets must be decimal numbers",
    );
  });

  await t.step("out of range octets", () => {
    assertThrows(
      () => parseAddressv4("256.0.0.1"),
      RangeError,
      "IPv4 octet out of range: 256 (must be 0-255)",
    );
    assertThrows(
      () => parseAddressv4("192.168.1.256"),
      RangeError,
      "IPv4 octet out of range: 256 (must be 0-255)",
    );
    assertThrows(
      () => parseAddressv4("192.168.1.300"),
      RangeError,
      "IPv4 octet out of range: 300 (must be 0-255)",
    );
  });

  await t.step("rejects whitespace anywhere", () => {
    assertThrows(() => parseAddressv4(" 10.1.2.3"), TypeError);
    assertThrows(() => parseAddressv4("10.1.2.3 "), TypeError);
    assertThrows(() => parseAddressv4("1.2.3.4\n"), TypeError);
    assertThrows(() => parseAddressv4("1.2. 3.4"), TypeError);
  });

  await t.step("rejects trailing text after an octet", () => {
    assertThrows(() => parseAddressv4("1.2.3.4abc"), TypeError);
  });

  await t.step("rejects a sign or radix prefix on an octet", () => {
    assertThrows(() => parseAddressv4("1.2.3.+4"), TypeError);
    assertThrows(() => parseAddressv4("+1.2.3.4"), TypeError);
    assertThrows(() => parseAddressv4("0x1.2.3.4"), TypeError);
    assertThrows(() => parseAddressv4("1.2.3.0x4"), TypeError);
  });

  await t.step("rejects a signed octet as a malformed one", () => {
    // "-" is in no part of the grammar, so it is a shape error wherever it
    // appears -- not a negative number that happens to be out of range.
    assertThrows(
      () => parseAddressv4("-1.2.3.4"),
      TypeError,
      "IPv4 address octets must be decimal numbers, got '-1'",
    );
    assertThrows(
      () => parseAddressv4("1.-2.3.4"),
      TypeError,
      "IPv4 address octets must be decimal numbers, got '-2'",
    );

    // "-0" is the case a range check cannot catch on its own: -0 is
    // numerically 0, so `octet < 0` is false and it would parse as "0".
    assertThrows(
      () => parseAddressv4("-0.1.2.3"),
      TypeError,
      "IPv4 address octets must be decimal numbers, got '-0'",
    );
    assertThrows(
      () => parseAddressv4("1.2.3.-0"),
      TypeError,
      "IPv4 address octets must be decimal numbers, got '-0'",
    );
  });

  await t.step("never reads a non-numeric octet as a number", () => {
    // Number("NaN") is NaN and String(NaN) is "NaN", so validating an octet
    // by that round-trip would accept this and return 16909056.
    assertThrows(() => parseAddressv4("1.2.3.NaN"), TypeError);
  });

  await t.step("carries a zone ID verbatim", () => {
    // RouterOS: gateway=10.155.101.1%ether1
    assertEquals(parseAddressv4("10.155.101.1%ether1"), {
      address: 177956097,
      zoneId: "ether1",
    });
    assertEquals(parseAddressv4("192.168.1.1%12"), {
      address: 3232235777,
      zoneId: "12",
    });
    assertEquals(parseAddressv4("192.168.1.1%eth0.100"), {
      address: 3232235777,
      zoneId: "eth0.100",
    });
    assertEquals(parseAddressv4("192.168.1.1%sfp-sfpplus2@myVrf"), {
      address: 3232235777,
      zoneId: "sfp-sfpplus2@myVrf",
    });
  });

  await t.step("never percent-decodes the zone ID", () => {
    assertEquals(parseAddressv4("192.168.1.1%25eth0"), {
      address: 3232235777,
      zoneId: "25eth0",
    });
  });

  await t.step("has no zoneId key when there is no zone", () => {
    assertEquals(Object.keys(parseAddressv4("192.168.1.1")), ["address"]);
  });

  await t.step("rejects a malformed zone ID as a shape error", () => {
    assertThrows(() => parseAddressv4("192.168.1.1%"), TypeError);
    assertThrows(() => parseAddressv4("%eth0"), TypeError);
    assertThrows(() => parseAddressv4("192.168.1.1%eth0%1"), TypeError);
    assertThrows(
      () => parseAddressv4("192.168.1.1% eth0"),
      TypeError,
      "Zone ID must not contain whitespace, got ' eth0'",
    );
    assertThrows(() => parseAddressv4("192.168.1.1%eth0 "), TypeError);
    assertThrows(() => parseAddressv4("192.168.1.1%eth\t0"), TypeError);
  });

  await t.step("rejects a prefix: that slot belongs to parseCidrv4", () => {
    assertThrows(
      () => parseAddressv4("192.168.1.0/24"),
      TypeError,
      "IPv4 address must not have a prefix, got '/24'",
    );
    assertThrows(() => parseAddressv4("192.168.1.0/255.255.255.0"), TypeError);
    assertThrows(() => parseAddressv4("192.168.1.1%eth0/24"), TypeError);
    assertThrows(() => parseAddressv4("192.168.1.0/"), TypeError);
  });

  await t.step("rejects IPv6 notation, mapped or not", () => {
    assertThrows(() => parseAddressv4("::ffff:192.168.1.1"), TypeError);
    assertThrows(() => parseAddressv4("::1"), TypeError);
  });
});

Deno.test("stringifyAddressv4", async (t) => {
  await t.step("valid values", () => {
    assertEquals(stringifyAddressv4(3232235777), "192.168.1.1");
    assertEquals(stringifyAddressv4(167772161), "10.0.0.1");
    assertEquals(stringifyAddressv4(2886729729), "172.16.0.1");
    assertEquals(stringifyAddressv4(2130706433), "127.0.0.1");
  });

  await t.step("a parse result, with and without a zone ID", () => {
    assertEquals(stringifyAddressv4({ address: 3232235777 }), "192.168.1.1");
    assertEquals(
      stringifyAddressv4({ address: 3232235777, zoneId: "ether1" }),
      "192.168.1.1%ether1",
    );
  });

  await t.step("an empty zone ID writes no %", () => {
    assertEquals(
      stringifyAddressv4({ address: 3232235777, zoneId: "" }),
      "192.168.1.1",
    );
  });

  await t.step("a hand-built zone ID is written as given", () => {
    // Garbage in, garbage out: parseAddressv4 rejects the result.
    const written = stringifyAddressv4({ address: 1, zoneId: "eth0%1" });
    assertEquals(written, "0.0.0.1%eth0%1");
    assertThrows(() => parseAddressv4(written), TypeError);
  });

  await t.step("edge cases", () => {
    assertEquals(stringifyAddressv4(0), "0.0.0.0");
    assertEquals(stringifyAddressv4(4294967295), "255.255.255.255");
  });

  await t.step("out of range values", () => {
    assertThrows(
      () => stringifyAddressv4(-1),
      RangeError,
      "IPv4 value out of range: -1 (must be 0 to 4294967295)",
    );
    assertThrows(
      () => stringifyAddressv4(4294967296),
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
      "192.168.1.1%ether1",
      "10.155.101.1%sfp-sfpplus2@myVrf",
      "192.168.1.1%25",
    ];

    for (const addr of addresses) {
      assertEquals(stringifyAddressv4(parseAddressv4(addr)), addr);
    }
  });

  await t.step("stringify then parse", () => {
    const values = [
      3232235777,
      167772161,
      2886729729,
      2130706433,
      0,
      4294967295,
    ];

    for (const val of values) {
      assertEquals(parseAddressv4(stringifyAddressv4(val)), { address: val });
    }
  });
});

Deno.test("isValidAddressv4", async (t) => {
  await t.step("valid addresses", () => {
    assert(isValidAddressv4("0.0.0.0"));
    assert(isValidAddressv4("192.168.1.1"));
    assert(isValidAddressv4("255.255.255.255"));
    assert(isValidAddressv4("10.0.0.1"));
    assert(isValidAddressv4("172.16.0.1"));
  });

  await t.step("accepts a zone ID, as the parser does", () => {
    assert(isValidAddressv4("192.168.1.1%ether1"));
  });

  await t.step("invalid addresses", () => {
    assertEquals(isValidAddressv4(""), false);
    assertEquals(isValidAddressv4("192.168.1.1%"), false);
    assertEquals(isValidAddressv4("192.168.1.1% eth0"), false);
    assertEquals(isValidAddressv4("256.0.0.1"), false);
    assertEquals(isValidAddressv4("1.2.3"), false);
    assertEquals(isValidAddressv4("1.2.3.4.5"), false);
    assertEquals(isValidAddressv4("01.02.03.04"), false);
    assertEquals(isValidAddressv4("abc"), false);
    assertEquals(isValidAddressv4("::1"), false);
    assertEquals(isValidAddressv4("192.168.1.0/24"), false);
  });
});

Deno.test("compareAddressv4", async (t) => {
  await t.step("orders numerically ascending", () => {
    assertEquals(
      compareAddressv4(
        parseAddressv4("10.0.0.1").address,
        parseAddressv4("10.0.0.2").address,
      ),
      -1,
    );
    assertEquals(
      compareAddressv4(
        parseAddressv4("10.0.0.2").address,
        parseAddressv4("10.0.0.1").address,
      ),
      1,
    );
    assertEquals(
      compareAddressv4(
        parseAddressv4("10.0.0.1").address,
        parseAddressv4("10.0.0.1").address,
      ),
      0,
    );
  });

  await t.step("returns only -1, 0 or 1, never a magnitude", () => {
    assertEquals(
      compareAddressv4(
        parseAddressv4("0.0.0.0").address,
        parseAddressv4("255.255.255.255").address,
      ),
      -1,
    );
    assertEquals(
      compareAddressv4(
        parseAddressv4("255.255.255.255").address,
        parseAddressv4("0.0.0.0").address,
      ),
      1,
    );
  });

  await t.step("sorts numerically, not lexicographically", () => {
    const addresses = ["10.0.0.9", "10.0.0.10", "10.0.0.2"].map(
      (s) => parseAddressv4(s).address,
    );
    assertEquals(addresses.toSorted(compareAddressv4).map(stringifyAddressv4), [
      "10.0.0.2",
      "10.0.0.9",
      "10.0.0.10",
    ]);
  });
});
