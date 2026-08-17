import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  compareAddressv6,
  mapFromAddressv4,
  parseAddressv6,
  stringifyAddressv6,
  stringifyAddressv6Expanded,
  unmapToAddressv4,
} from "./addressv6.ts";
import { parseAddressv4, stringifyAddressv4 } from "./addressv4.ts";
import { isValidAddressv6 } from "./validatev6.ts";

Deno.test("parseAddressv6", async (t) => {
  await t.step("full form addresses", () => {
    assertEquals(parseAddressv6("2001:0db8:0000:0000:0000:0000:0000:0001"), {
      address: 0x20010db8000000000000000000000001n,
    });
    assertEquals(parseAddressv6("ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff"), {
      address: 0xffffffffffffffffffffffffffffffffn,
    });
    assertEquals(parseAddressv6("0000:0000:0000:0000:0000:0000:0000:0000"), {
      address: 0n,
    });
  });

  await t.step("compressed form with leading ::", () => {
    assertEquals(parseAddressv6("::1"), { address: 1n });
    assertEquals(parseAddressv6("::"), { address: 0n });
    assertEquals(parseAddressv6("::ffff"), { address: 0xffffn });
    assertEquals(
      parseAddressv6("::ffff:ffff:ffff:ffff").address,
      0x0000_0000_0000_0000_ffff_ffff_ffff_ffffn,
    );
  });

  await t.step("compressed form with trailing ::", () => {
    assertEquals(parseAddressv6("2001:db8::"), {
      address: 0x20010db8000000000000000000000000n,
    });
    assertEquals(parseAddressv6("fe80::"), {
      address: 0xfe800000000000000000000000000000n,
    });
  });

  await t.step("compressed form with :: in middle", () => {
    assertEquals(parseAddressv6("2001:db8::1"), {
      address: 0x20010db8000000000000000000000001n,
    });
    assertEquals(parseAddressv6("fe80::1:2"), {
      address: 0xfe800000000000000000000000010002n,
    });
    assertEquals(parseAddressv6("1::1"), {
      address: 0x00010000000000000000000000000001n,
    });
    assertEquals(parseAddressv6("1:2::3:4"), {
      address: 0x00010002000000000000000000030004n,
    });
  });

  await t.step("lowercase hex", () => {
    assertEquals(parseAddressv6("abcd:ef01::1"), {
      address: 0xabcdef01000000000000000000000001n,
    });
  });

  await t.step("uppercase hex", () => {
    assertEquals(parseAddressv6("ABCD:EF01::1"), {
      address: 0xabcdef01000000000000000000000001n,
    });
  });

  await t.step("mixed case hex", () => {
    assertEquals(parseAddressv6("AbCd:eF01::1"), {
      address: 0xabcdef01000000000000000000000001n,
    });
  });

  await t.step("IPv4-mapped addresses", () => {
    assertEquals(
      parseAddressv6("::ffff:192.168.1.1").address,
      0x0000_0000_0000_0000_0000_ffff_c0a8_0101n,
    );
    assertEquals(
      parseAddressv6("::ffff:10.0.0.1").address,
      0x0000_0000_0000_0000_0000_ffff_0a00_0001n,
    );
    assertEquals(
      parseAddressv6("::ffff:0.0.0.0").address,
      0x0000_0000_0000_0000_0000_ffff_0000_0000n,
    );
    assertEquals(
      parseAddressv6("::ffff:255.255.255.255").address,
      0x0000_0000_0000_0000_0000_ffff_ffff_ffffn,
    );
  });

  await t.step("carries a zone ID verbatim", () => {
    assertEquals(parseAddressv6("fe80::1%eth0"), {
      address: 0xfe800000000000000000000000000001n,
      zoneId: "eth0",
    });
    assertEquals(parseAddressv6("fe80::1%0"), {
      address: 0xfe800000000000000000000000000001n,
      zoneId: "0",
    });
    assertEquals(parseAddressv6("::1%lo"), { address: 1n, zoneId: "lo" });
    assertEquals(parseAddressv6("fe80::1%eth0.100"), {
      address: 0xfe800000000000000000000000000001n,
      zoneId: "eth0.100",
    });
    assertEquals(parseAddressv6("fe80::1%eth0@1"), {
      address: 0xfe800000000000000000000000000001n,
      zoneId: "eth0@1",
    });
    assertEquals(parseAddressv6("::ffff:192.168.1.1%z"), {
      address: 0xffffc0a80101n,
      zoneId: "z",
    });
  });

  await t.step("never percent-decodes the zone ID", () => {
    assertEquals(parseAddressv6("fe80::1%25eth0"), {
      address: 0xfe800000000000000000000000000001n,
      zoneId: "25eth0",
    });
  });

  await t.step("has no zoneId key when there is no zone", () => {
    assertEquals(Object.keys(parseAddressv6("fe80::1")), ["address"]);
  });

  await t.step("rejects a malformed zone ID as a shape error", () => {
    assertThrows(() => parseAddressv6("fe80::1%"), TypeError);
    assertThrows(() => parseAddressv6("fe80::%"), TypeError);
    assertThrows(() => parseAddressv6("%eth0"), TypeError);
    assertThrows(() => parseAddressv6("fe80::1%eth0%1"), TypeError);
    assertThrows(
      () => parseAddressv6("fe80::1% eth0"),
      TypeError,
      "Zone ID must not contain whitespace, got ' eth0'",
    );
    assertThrows(() => parseAddressv6("fe80::1%eth0 "), TypeError);
    assertThrows(() => parseAddressv6("fe80::1%eth\t0"), TypeError);
  });

  await t.step("rejects a prefix: that slot belongs to parseCidrv6", () => {
    assertThrows(
      () => parseAddressv6("2001:db8::/32"),
      TypeError,
      "IPv6 address must not have a prefix, got '/32'",
    );
    assertThrows(() => parseAddressv6("fe80::/ffff:ffff::"), TypeError);
    assertThrows(() => parseAddressv6("fe80::%eth0/64"), TypeError);
    assertThrows(() => parseAddressv6("fe80::/"), TypeError);
  });

  await t.step("rejects IPv4 notation", () => {
    assertThrows(() => parseAddressv6("192.168.1.1"), TypeError);
    assertThrows(() => parseAddressv6("192.168.1.1%eth0"), TypeError);
  });

  await t.step("edge cases", () => {
    assertEquals(parseAddressv6("0:0:0:0:0:0:0:0"), { address: 0n });
    assertEquals(parseAddressv6("0:0:0:0:0:0:0:1"), { address: 1n });
    assertEquals(parseAddressv6("ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff"), {
      address: 340282366920938463463374607431768211455n,
    });
  });

  await t.step("invalid format - multiple ::", () => {
    assertThrows(
      () => parseAddressv6("2001::db8::1"),
      TypeError,
      "IPv6 address can only contain one '::'",
    );
  });

  await t.step("invalid format - too many groups", () => {
    assertThrows(
      () => parseAddressv6("1:2:3:4:5:6:7:8:9"),
      TypeError,
      "IPv6 address must have exactly 8 groups",
    );
  });

  await t.step("invalid format - too few groups without ::", () => {
    assertThrows(
      () => parseAddressv6("2001:db8:1"),
      TypeError,
      "IPv6 address must have exactly 8 groups",
    );
  });

  await t.step("invalid format - invalid hex", () => {
    assertThrows(
      () => parseAddressv6("2001:gggg::1"),
      TypeError,
      "Invalid IPv6 group",
    );
    assertThrows(
      () => parseAddressv6("2001:db8::xyz"),
      TypeError,
      "Invalid IPv6 group",
    );
  });

  await t.step("invalid format - group too long", () => {
    assertThrows(
      () => parseAddressv6("2001:12345::1"),
      TypeError,
      "Invalid IPv6 group",
    );
  });

  await t.step("invalid format - empty group", () => {
    assertThrows(
      () => parseAddressv6("2001::db8:::1"),
      TypeError,
    );
  });

  await t.step("never returns a negative, whatever the sign looks like", () => {
    // A hex group was read with parseInt, which accepts a sign, and nothing
    // range-checked the result -- so these returned values outside the
    // 0 .. 2^128-1 the type is documented to hold. "-" is not a hex digit.
    assertThrows(() => parseAddressv6("::-1"), TypeError);
    assertThrows(() => parseAddressv6("::-0"), TypeError);
    assertThrows(() => parseAddressv6("-1::"), TypeError);
    assertThrows(() => parseAddressv6("1:2:3:4:5:6:7:-8"), TypeError);
  });

  await t.step("RangeError only from the embedded IPv4 form", () => {
    // A hex group cannot be numerically out of range -- 4 digits cannot
    // exceed ffff -- so an over-long group is a TypeError, not a RangeError.
    assertThrows(
      () => parseAddressv6("fffff::"),
      TypeError,
      "Invalid IPv6 group",
    );

    // The embedded IPv4 tail delegates to parseAddressv4, which does have a
    // range check. This is the only path that produces a RangeError.
    assertThrows(
      () => parseAddressv6("::1.2.3.256"),
      RangeError,
      "IPv4 octet out of range",
    );
  });
});

/**
 * One row of the acceptance table: a bigint is the address `parseAddressv6`
 * must return (with no zone ID), an error constructor is what it must throw.
 */
type Row = [input: string, expected: bigint | ErrorConstructor];

function assertRow(input: string, expected: bigint | ErrorConstructor): void {
  if (typeof expected === "bigint") {
    assertEquals(parseAddressv6(input), { address: expected }, input);
  } else {
    assertThrows(() => parseAddressv6(input), expected, undefined, input);
  }
}

// The table below is the RFC 4291 section 2.2 grammar, stated as inputs rather
// than as a second copy of the grammar. Its 560 rows come from four sources,
// deduped by input string with the first expected value winning:
//
//   node          test/parallel/test-net-isip.js, the isIP and isIPv6 assertions
//   ipaddr.js     test/ipaddr.test.js, the IPv6.isValid assertions
//   ip-address    test/data/valid-ipv6-addresses.json and
//                 invalid-ipv6-addresses.json, entries without a "/"
//   this package  whitespace forms, 0x and sign prefixes, our error types
//
// The four sources produce no conflicts. Rows with a zone ID live in their own
// step below, since a Row has no slot for one; "fe80::%" and the like are
// covered by the zone ID steps of the parseAddressv6 test.

Deno.test("parseAddressv6 acceptance table", async (t) => {
  await t.step("accepts '::' covering one or more groups", () => {
    const rows: Row[] = [
      ["2001:252:0:1::2008:6", 0x20010252000000010000000020080006n],
      ["2001:dead:beef:1::2008:6", 0x2001deadbeef00010000000020080006n],
      ["2001::", 0x20010000000000000000000000000000n],
      ["2001:dead::", 0x2001dead000000000000000000000000n],
      ["2001:dead:beef::", 0x2001deadbeef00000000000000000000n],
      ["2001:dead:beef:1::", 0x2001deadbeef00010000000000000000n],
      [":2001:252:0:1::2008:6", TypeError],
      ["2001:252:0:1::2008:6:", TypeError],
      ["::2001:252:1:2008:6", 0x20010252000120080006n],
      ["::1", 0x1n],
      ["::", 0x0n],
      ["2001:db8:F53A::1", 0x20010db8f53a00000000000000000001n],
      ["2002::2:", TypeError],
      ["1:2:3:4:5:6:7::", 0x10002000300040005000600070000n],
      ["::1:2:3:4:5:6:7", 0x1000200030004000500060007n],
      ["0:0:0:0:0:0:0::", 0x0n],
      ["0:0:0:0:0:0::", 0x0n],
      ["0:0:0:0:0::", 0x0n],
      ["0:0:0:0::", 0x0n],
      ["0:0:0::", 0x0n],
      ["0:0::", 0x0n],
      ["0::", 0x0n],
      ["0:a:b:c:d:e:f::", 0xa000b000c000d000e000f0000n],
      ["1080::8:800:200c:417a", 0x108000000000000000080800200c417an],
      [
        "1111:2222:3333:4444:5555:6666:7777::",
        0x11112222333344445555666677770000n,
      ],
      ["1111:2222:3333:4444:5555:6666::", 0x11112222333344445555666600000000n],
      [
        "1111:2222:3333:4444:5555:6666::8888",
        0x11112222333344445555666600008888n,
      ],
      ["1111:2222:3333:4444:5555::", 0x11112222333344445555000000000000n],
      [
        "1111:2222:3333:4444:5555::7777:8888",
        0x11112222333344445555000077778888n,
      ],
      ["1111:2222:3333:4444:5555::8888", 0x11112222333344445555000000008888n],
      ["1111:2222:3333:4444::", 0x11112222333344440000000000000000n],
      [
        "1111:2222:3333:4444::6666:7777:8888",
        0x11112222333344440000666677778888n,
      ],
      ["1111:2222:3333:4444::7777:8888", 0x11112222333344440000000077778888n],
      ["1111:2222:3333:4444::8888", 0x11112222333344440000000000008888n],
      ["1111:2222:3333::", 0x11112222333300000000000000000000n],
      [
        "1111:2222:3333::5555:6666:7777:8888",
        0x11112222333300005555666677778888n,
      ],
      ["1111:2222:3333::6666:7777:8888", 0x11112222333300000000666677778888n],
      ["1111:2222:3333::7777:8888", 0x11112222333300000000000077778888n],
      ["1111:2222:3333::8888", 0x11112222333300000000000000008888n],
      ["1111:2222::", 0x11112222000000000000000000000000n],
      [
        "1111:2222::4444:5555:6666:7777:8888",
        0x11112222000044445555666677778888n,
      ],
      ["1111:2222::5555:6666:7777:8888", 0x11112222000000005555666677778888n],
      ["1111:2222::6666:7777:8888", 0x11112222000000000000666677778888n],
      ["1111:2222::7777:8888", 0x11112222000000000000000077778888n],
      ["1111:2222::8888", 0x11112222000000000000000000008888n],
      ["1111::", 0x11110000000000000000000000000000n],
      [
        "1111::3333:4444:5555:6666:7777:8888",
        0x11110000333344445555666677778888n,
      ],
      ["1111::4444:5555:6666:7777:8888", 0x11110000000044445555666677778888n],
      ["1111::5555:6666:7777:8888", 0x11110000000000005555666677778888n],
      ["1111::6666:7777:8888", 0x11110000000000000000666677778888n],
      ["1111::7777:8888", 0x11110000000000000000000077778888n],
      ["1111::8888", 0x11110000000000000000000000008888n],
      ["1:2:3:4:5:6::", 0x10002000300040005000600000000n],
      ["1:2:3:4:5:6::8", 0x10002000300040005000600000008n],
      ["1:2:3:4:5::", 0x10002000300040005000000000000n],
      ["1:2:3:4:5::7:8", 0x10002000300040005000000070008n],
      ["1:2:3:4:5::8", 0x10002000300040005000000000008n],
      ["1:2:3:4::", 0x10002000300040000000000000000n],
      ["1:2:3:4::7:8", 0x10002000300040000000000070008n],
      ["1:2:3:4::8", 0x10002000300040000000000000008n],
      ["1:2:3::", 0x10002000300000000000000000000n],
      ["1:2:3::7:8", 0x10002000300000000000000070008n],
      ["1:2:3::8", 0x10002000300000000000000000008n],
      ["1:2::", 0x10002000000000000000000000000n],
      ["1:2::7:8", 0x10002000000000000000000070008n],
      ["1:2::8", 0x10002000000000000000000000008n],
      ["1::", 0x10000000000000000000000000000n],
      ["1::2:3", 0x10000000000000000000000020003n],
      ["1::2:3:4", 0x10000000000000000000200030004n],
      ["1::2:3:4:5", 0x10000000000000002000300040005n],
      ["1::2:3:4:5:6", 0x10000000000020003000400050006n],
      ["1::2:3:4:5:6:7", 0x10000000200030004000500060007n],
      ["1::7:8", 0x10000000000000000000000070008n],
      ["1::8", 0x10000000000000000000000000008n],
      [
        "2001:0db8:0000:0000:0000::1428:57ab",
        0x20010db80000000000000000142857abn,
      ],
      ["2001:0db8:0:0::1428:57ab", 0x20010db80000000000000000142857abn],
      ["2001:0db8:1234::", 0x20010db8123400000000000000000000n],
      ["2001:0db8::1428:57ab", 0x20010db80000000000000000142857abn],
      [
        "2001::CE49:7601:2CAD:DFFF:7C94:FFFE",
        0x20010000ce4976012caddfff7c94fffen,
      ],
      [
        "2001::CE49:7601:E866:EFFF:62C3:FFFE",
        0x20010000ce497601e866efff62c3fffen,
      ],
      ["2001:DB8::8:800:200C:417A", 0x20010db80000000000080800200c417an],
      ["2001:db8:85a3::8a2e:370:7334", 0x20010db885a3000000008a2e03707334n],
      ["2001:db8::", 0x20010db8000000000000000000000000n],
      ["2001:db8::1428:57ab", 0x20010db80000000000000000142857abn],
      ["2001:db8:a::123", 0x20010db8000a00000000000000000123n],
      ["2002::", 0x20020000000000000000000000000000n],
      ["2608::3:5", 0x26080000000000000000000000030005n],
      [
        "2608:af09:30::102a:7b91:c239:baff",
        0x2608af0900300000102a7b91c239baffn,
      ],
      ["2::10", 0x20000000000000000000000000010n],
      ["::0", 0x0n],
      ["::0:0", 0x0n],
      ["::0:0:0", 0x0n],
      ["::0:0:0:0", 0x0n],
      ["::0:0:0:0:0", 0x0n],
      ["::0:0:0:0:0:0", 0x0n],
      ["::0:0:0:0:0:0:0", 0x0n],
      ["::0:a:b:c:d:e:f", 0xa000b000c000d000e000fn],
      ["::2222:3333:4444:5555:6666:7777:8888", 0x2222333344445555666677778888n],
      ["::2:3", 0x20003n],
      ["::2:3:4", 0x200030004n],
      ["::2:3:4:5", 0x2000300040005n],
      ["::2:3:4:5:6", 0x20003000400050006n],
      ["::2:3:4:5:6:7", 0x200030004000500060007n],
      ["::2:3:4:5:6:7:8", 0x2000300040005000600070008n],
      ["::3333:4444:5555:6666:7777:8888", 0x333344445555666677778888n],
      ["::4444:5555:6666:7777:8888", 0x44445555666677778888n],
      ["::5555:6666:7777:8888", 0x5555666677778888n],
      ["::6666:7777:8888", 0x666677778888n],
      ["::7777:8888", 0x77778888n],
      ["::8", 0x8n],
      ["::8888", 0x8888n],
      ["::ffff:0:0", 0xffff00000000n],
      ["::ffff:0c22:384e", 0xffff0c22384en],
      ["::ffff:c000:280", 0xffffc0000280n],
      ["FF01::101", 0xff010000000000000000000000000101n],
      ["a:b:c:d:e:f:0::", 0xa000b000c000d000e000f00000000n],
      ["fe80::", 0xfe800000000000000000000000000000n],
      ["fe80::1", 0xfe800000000000000000000000000001n],
      ["fe80::204:61ff:fe9d:f156", 0xfe80000000000000020461fffe9df156n],
      ["fe80::217:f2ff:fe07:ed62", 0xfe800000000000000217f2fffe07ed62n],
      ["ff02::1", 0xff020000000000000000000000000001n],
      ["ffff::", 0xffff0000000000000000000000000000n],
      ["ffff::3:5", 0xffff0000000000000000000000030005n],
      ["a:0::0:b", 0xa000000000000000000000000000bn],
      ["a:0:0::0:b", 0xa000000000000000000000000000bn],
      ["a:0::0:0:b", 0xa000000000000000000000000000bn],
      ["a::0:0:b", 0xa000000000000000000000000000bn],
      ["a::0:b", 0xa000000000000000000000000000bn],
      ["a:0::b", 0xa000000000000000000000000000bn],
      ["a:0:0::b", 0xa000000000000000000000000000bn],
      ["1111:2222:3333:4444:5555::8888:", TypeError],
      ["1111:2222:3333:4444::5555:", TypeError],
      ["1111:2222:3333:4444::7777:8888:", TypeError],
      ["1111:2222:3333:4444::8888:", TypeError],
      ["1111:2222:3333::5555:", TypeError],
      ["1111:2222:3333::6666:7777:8888:", TypeError],
      ["1111:2222:3333::7777:8888:", TypeError],
      ["1111:2222:3333::8888:", TypeError],
      ["1111:2222::5555:", TypeError],
      ["1111:2222::5555:6666:7777:8888:", TypeError],
      ["1111:2222::6666:7777:8888:", TypeError],
      ["1111:2222::7777:8888:", TypeError],
      ["1111:2222::8888:", TypeError],
      ["1111::4444:5555:6666:7777:8888:", TypeError],
      ["1111::5555:", TypeError],
      ["1111::5555:6666:7777:8888:", TypeError],
      ["1111::6666:7777:8888:", TypeError],
      ["1111::7777:8888:", TypeError],
      ["1111::8888:", TypeError],
      [":1111:2222:3333:4444:5555:6666::", TypeError],
      [":1111:2222:3333:4444:5555::", TypeError],
      [":1111:2222:3333:4444:5555::8888", TypeError],
      [":1111:2222:3333:4444::", TypeError],
      [":1111:2222:3333:4444::5555", TypeError],
      [":1111:2222:3333:4444::7777:8888", TypeError],
      [":1111:2222:3333:4444::8888", TypeError],
      [":1111:2222:3333::", TypeError],
      [":1111:2222:3333::5555", TypeError],
      [":1111:2222:3333::6666:7777:8888", TypeError],
      [":1111:2222:3333::7777:8888", TypeError],
      [":1111:2222:3333::8888", TypeError],
      [":1111:2222::", TypeError],
      [":1111:2222::5555", TypeError],
      [":1111:2222::5555:6666:7777:8888", TypeError],
      [":1111:2222::6666:7777:8888", TypeError],
      [":1111:2222::7777:8888", TypeError],
      [":1111:2222::8888", TypeError],
      [":1111::", TypeError],
      [":1111::4444:5555:6666:7777:8888", TypeError],
      [":1111::5555", TypeError],
      [":1111::5555:6666:7777:8888", TypeError],
      [":1111::6666:7777:8888", TypeError],
      [":1111::7777:8888", TypeError],
      [":1111::8888", TypeError],
      ["::3333:4444:5555:6666:7777:8888:", TypeError],
      ["::4444:5555:6666:7777:8888:", TypeError],
      ["::5555:", TypeError],
      ["::5555:6666:7777:8888:", TypeError],
      ["::6666:7777:8888:", TypeError],
      ["::7777:8888:", TypeError],
      ["::8888:", TypeError],
      ["::1e2", 0x1e2n],
      ["::0b11", 0xb11n],
    ];

    for (const [input, expected] of rows) assertRow(input, expected);
  });

  await t.step("rejects a malformed embedded IPv4 form", () => {
    const rows: Row[] = [
      ["::2001:252:1:255.255.255.255.76", TypeError],
      ["::ffff:300.168.1.1", RangeError],
      ["::ffff:300.168.1.1:0", TypeError],
      ["::ffff:222.1.41.9000", RangeError],
      ["1.2.3.4:1111:2222:3333:4444::5555", TypeError],
      ["1.2.3.4:1111:2222:3333::5555", TypeError],
      ["1.2.3.4:1111:2222::5555", TypeError],
      ["1.2.3.4:1111::5555", TypeError],
      ["1.2.3.4::", TypeError],
      ["1.2.3.4::5555", TypeError],
      ["1111:1.2.3.4", TypeError],
      ["1111:2222:1.2.3.4", TypeError],
      ["1111:2222:3333:1.2.3.4", TypeError],
      ["1111:2222:3333:4444:1.2.3.4", TypeError],
      ["1111:2222:3333:4444:5555:1.2.3.4", TypeError],
      // The tail after the last colon is handed to parseAddressv4 whole, so an
      // over-long leading field is reported as the octet it is, not as a
      // hex group.
      ["1111:2222:3333:4444:5555:66661.2.3.4", RangeError],
      ["1111:2222:3333:4444:5555:6666:00.00.00.00", TypeError],
      ["1111:2222:3333:4444:5555:6666:000.000.000.000", TypeError],
      ["1111:2222:3333:4444:5555:6666:1.2.3.4.5", TypeError],
      ["1111:2222:3333:4444:5555:6666:255.255.255255", TypeError],
      ["1111:2222:3333:4444:5555:6666:255.255255.255", TypeError],
      ["1111:2222:3333:4444:5555:6666:255255.255.255", TypeError],
      ["1111:2222:3333:4444:5555:6666:256.256.256.256", RangeError],
      ["1111:2222:3333:4444:5555:6666:7777:1.2.3.4", TypeError],
      ["1111:2222:3333:4444:5555:6666:7777:8888:1.2.3.4", TypeError],
      ["1111:2222:3333:4444:5555:6666::1.2.3.4", TypeError],
      ["1::1.2.256.4", RangeError],
      ["1::1.2.3.256", RangeError],
      ["1::1.2.3.300", RangeError],
      ["1::1.2.3.900", RangeError],
      ["1::1.2.300.4", RangeError],
      ["1::1.2.900.4", RangeError],
      ["1::1.256.3.4", RangeError],
      ["1::1.300.3.4", RangeError],
      ["1::1.900.3.4", RangeError],
      ["1::256.2.3.4", RangeError],
      ["1::260.2.3.4", RangeError],
      ["1::300.2.3.4", RangeError],
      ["1::300.300.300.300", RangeError],
      ["1::3000.30.30.30", RangeError],
      ["1::400.2.3.4", RangeError],
      ["1::5:1.2.256.4", RangeError],
      ["1::5:1.2.3.256", RangeError],
      ["1::5:1.2.3.300", RangeError],
      ["1::5:1.2.3.900", RangeError],
      ["1::5:1.2.300.4", RangeError],
      ["1::5:1.2.900.4", RangeError],
      ["1::5:1.256.3.4", RangeError],
      ["1::5:1.300.3.4", RangeError],
      ["1::5:1.900.3.4", RangeError],
      ["1::5:256.2.3.4", RangeError],
      ["1::5:260.2.3.4", RangeError],
      ["1::5:300.2.3.4", RangeError],
      ["1::5:300.300.300.300", RangeError],
      ["1::5:3000.30.30.30", RangeError],
      ["1::5:400.2.3.4", RangeError],
      ["1::5:900.2.3.4", RangeError],
      ["1::900.2.3.4", RangeError],
      [":1.2.3.4", TypeError],
      [":1111:2222:3333:4444:5555:6666:1.2.3.4", TypeError],
      [":1111:2222:3333:4444:5555::1.2.3.4", TypeError],
      [":1111:2222:3333:4444::1.2.3.4", TypeError],
      [":1111:2222:3333:4444::6666:1.2.3.4", TypeError],
      [":1111:2222:3333::1.2.3.4", TypeError],
      [":1111:2222:3333::5555:6666:1.2.3.4", TypeError],
      [":1111:2222:3333::6666:1.2.3.4", TypeError],
      [":1111:2222::1.2.3.4", TypeError],
      [":1111:2222::4444:5555:6666:1.2.3.4", TypeError],
      [":1111:2222::5555:6666:1.2.3.4", TypeError],
      [":1111:2222::6666:1.2.3.4", TypeError],
      [":1111::1.2.3.4", TypeError],
      [":1111::3333:4444:5555:6666:1.2.3.4", TypeError],
      [":1111::4444:5555:6666:1.2.3.4", TypeError],
      [":1111::5555:6666:1.2.3.4", TypeError],
      [":1111::6666:1.2.3.4", TypeError],
      [":2222:3333:4444:5555:6666:1.2.3.4", TypeError],
      [":3333:4444:5555:6666:1.2.3.4", TypeError],
      [":4444:5555:6666:1.2.3.4", TypeError],
      [":5555:6666:1.2.3.4", TypeError],
      [":6666:1.2.3.4", TypeError],
      ["::.", TypeError],
      ["::..", TypeError],
      ["::...", TypeError],
      ["::...4", TypeError],
      ["::..3.", TypeError],
      ["::..3.4", TypeError],
      ["::.2..", TypeError],
      ["::.2.3.", TypeError],
      ["::.2.3.4", TypeError],
      ["::1...", TypeError],
      ["::1.2..", TypeError],
      ["::1.2.256.4", RangeError],
      ["::1.2.3.", TypeError],
      ["::1.2.3.256", RangeError],
      ["::1.2.3.300", RangeError],
      ["::1.2.3.900", RangeError],
      ["::1.2.300.4", RangeError],
      ["::1.2.900.4", RangeError],
      ["::1.256.3.4", RangeError],
      ["::1.300.3.4", RangeError],
      ["::1.900.3.4", RangeError],
      ["::2222:3333:4444:5555:6666:7777:1.2.3.4", TypeError],
      ["::256.2.3.4", RangeError],
      ["::260.2.3.4", RangeError],
      ["::300.2.3.4", RangeError],
      ["::300.300.300.300", RangeError],
      ["::3000.30.30.30", RangeError],
      ["::400.2.3.4", RangeError],
      ["::900.2.3.4", RangeError],
      ["::ffff:2.3.4", TypeError],
      ["::ffff:257.1.2.3", RangeError],
      ["fe80:0000:0000:0000:0204:61ff:254.157.241.086", TypeError],
    ];

    for (const [input, expected] of rows) assertRow(input, expected);
  });

  await t.step("accepts the embedded IPv4 form", () => {
    const rows: Row[] = [
      ["::2001:252:1:1.1.1.1", 0x20010252000101010101n],
      ["::2001:252:1:255.255.255.255", 0x200102520001ffffffffn],
      ["::ffff:192.168.1.1", 0xffffc0a80101n],
      ["::1.1.1.1", 0x1010101n],
      ["0:0:0:0:0:0:13.1.68.3", 0xd014403n],
      ["0:0:0:0:0:FFFF:129.144.52.38", 0xffff81903426n],
      [
        "1111:2222:3333:4444:5555:6666:123.123.123.123",
        0x1111222233334444555566667b7b7b7bn,
      ],
      [
        "1111:2222:3333:4444:5555::123.123.123.123",
        0x1111222233334444555500007b7b7b7bn,
      ],
      [
        "1111:2222:3333:4444::123.123.123.123",
        0x1111222233334444000000007b7b7b7bn,
      ],
      [
        "1111:2222:3333:4444::6666:123.123.123.123",
        0x1111222233334444000066667b7b7b7bn,
      ],
      ["1111:2222:3333::123.123.123.123", 0x1111222233330000000000007b7b7b7bn],
      [
        "1111:2222:3333::5555:6666:123.123.123.123",
        0x1111222233330000555566667b7b7b7bn,
      ],
      [
        "1111:2222:3333::6666:123.123.123.123",
        0x1111222233330000000066667b7b7b7bn,
      ],
      ["1111:2222::123.123.123.123", 0x1111222200000000000000007b7b7b7bn],
      [
        "1111:2222::4444:5555:6666:123.123.123.123",
        0x1111222200004444555566667b7b7b7bn,
      ],
      [
        "1111:2222::5555:6666:123.123.123.123",
        0x1111222200000000555566667b7b7b7bn,
      ],
      ["1111:2222::6666:123.123.123.123", 0x1111222200000000000066667b7b7b7bn],
      ["1111::123.123.123.123", 0x1111000000000000000000007b7b7b7bn],
      [
        "1111::3333:4444:5555:6666:123.123.123.123",
        0x1111000033334444555566667b7b7b7bn,
      ],
      [
        "1111::4444:5555:6666:123.123.123.123",
        0x1111000000004444555566667b7b7b7bn,
      ],
      ["1111::5555:6666:123.123.123.123", 0x1111000000000000555566667b7b7b7bn],
      ["1111::6666:123.123.123.123", 0x1111000000000000000066667b7b7b7bn],
      ["1:2:3:4:5:6:1.2.3.4", 0x10002000300040005000601020304n],
      ["1:2:3:4:5::1.2.3.4", 0x10002000300040005000001020304n],
      ["1:2:3:4::1.2.3.4", 0x10002000300040000000001020304n],
      ["1:2:3:4::5:1.2.3.4", 0x10002000300040000000501020304n],
      ["1:2:3::1.2.3.4", 0x10002000300000000000001020304n],
      ["1:2:3::5:1.2.3.4", 0x10002000300000000000501020304n],
      ["1:2::1.2.3.4", 0x10002000000000000000001020304n],
      ["1:2::5:1.2.3.4", 0x10002000000000000000501020304n],
      ["1::1.2.3.4", 0x10000000000000000000001020304n],
      ["1::5:1.2.3.4", 0x10000000000000000000501020304n],
      ["1::5:11.22.33.44", 0x1000000000000000000050b16212cn],
      ["::123.123.123.123", 0x7b7b7b7bn],
      ["::13.1.68.3", 0xd014403n],
      [
        "::2222:3333:4444:5555:6666:123.123.123.123",
        0x222233334444555566667b7b7b7bn,
      ],
      ["::4444:5555:6666:123.123.123.123", 0x4444555566667b7b7b7bn],
      ["::5555:6666:123.123.123.123", 0x555566667b7b7b7bn],
      ["::6666:123.123.123.123", 0x66667b7b7b7bn],
      ["::FFFF:129.144.52.38", 0xffff81903426n],
      ["::ffff:12.34.56.78", 0xffff0c22384en],
      ["::ffff:192.0.2.128", 0xffffc0000280n],
      ["::ffff:192.168.1.26", 0xffffc0a8011an],
      [
        "fe80:0:0:0:204:61ff:254.157.241.86",
        0xfe80000000000000020461fffe9df156n,
      ],
      ["fe80::204:61ff:254.157.241.86", 0xfe80000000000000020461fffe9df156n],
      ["fe80::217:f2ff:254.7.237.98", 0xfe800000000000000217f2fffe07ed62n],
    ];

    for (const [input, expected] of rows) assertRow(input, expected);
  });

  await t.step("rejects more than one '::'", () => {
    const rows: Row[] = [
      ["2001:252::1::2008:6", TypeError],
      ["2001:db8::F53A::1", TypeError],
      ["1111:2222:3333:4444:5555::7777::", TypeError],
      ["1111:2222:3333:4444::6666:7777::", TypeError],
      ["1111:2222:3333:4444::6666::8888", TypeError],
      ["1111:2222:3333::5555:6666:7777::", TypeError],
      ["1111:2222:3333::5555:6666::8888", TypeError],
      ["1111:2222:3333::5555::1.2.3.4", TypeError],
      ["1111:2222:3333::5555::7777:8888", TypeError],
      ["1111:2222::4444:5555:6666:7777::", TypeError],
      ["1111:2222::4444:5555:6666::8888", TypeError],
      ["1111:2222::4444:5555::1.2.3.4", TypeError],
      ["1111:2222::4444:5555::7777:8888", TypeError],
      ["1111:2222::4444::6666:1.2.3.4", TypeError],
      ["1111:2222::4444::6666:7777:8888", TypeError],
      ["1111::3333:4444:5555:6666:7777::", TypeError],
      ["1111::3333:4444:5555:6666::8888", TypeError],
      ["1111::3333:4444:5555::1.2.3.4", TypeError],
      ["1111::3333:4444:5555::7777:8888", TypeError],
      ["1111::3333:4444::6666:1.2.3.4", TypeError],
      ["1111::3333:4444::6666:7777:8888", TypeError],
      ["1111::3333::5555:6666:1.2.3.4", TypeError],
      ["1111::3333::5555:6666:7777:8888", TypeError],
      ["1:2:3::4:5::7:8", TypeError],
      ["1::2::3", TypeError],
      ["2001::FFD3::57ab", TypeError],
      ["3ffe:b00::1::a", TypeError],
      ["::1111:2222:3333:4444:5555:6666::", TypeError],
      ["::2222:3333:4444:5555:7777:8888::", TypeError],
      ["::2222:3333:4444:5555:7777::8888", TypeError],
      ["::2222:3333:4444:5555::1.2.3.4", TypeError],
      ["::2222:3333:4444:5555::7777:8888", TypeError],
      ["::2222:3333:4444::6666:1.2.3.4", TypeError],
      ["::2222:3333:4444::6666:7777:8888", TypeError],
      ["::2222:3333::5555:6666:1.2.3.4", TypeError],
      ["::2222:3333::5555:6666:7777:8888", TypeError],
      ["::2222::4444:5555:6666:1.2.3.4", TypeError],
      ["::2222::4444:5555:6666:7777:8888", TypeError],
      ["FF01::101::2", TypeError],
      ["a::b::c", TypeError],
      ["ffff::ffff::ffff", TypeError],
    ];

    for (const [input, expected] of rows) assertRow(input, expected);
  });

  await t.step("rejects three or more consecutive colons", () => {
    const rows: Row[] = [
      ["1111:2222:3333:4444:5555:6666:7777:::", TypeError],
      ["1111:2222:3333:4444:5555:6666:::", TypeError],
      ["1111:2222:3333:4444:5555:6666:::8888", TypeError],
      ["1111:2222:3333:4444:5555:::", TypeError],
      ["1111:2222:3333:4444:5555:::1.2.3.4", TypeError],
      ["1111:2222:3333:4444:5555:::7777:8888", TypeError],
      ["1111:2222:3333:4444:::", TypeError],
      ["1111:2222:3333:4444:::6666:1.2.3.4", TypeError],
      ["1111:2222:3333:4444:::6666:7777:8888", TypeError],
      ["1111:2222:3333:::", TypeError],
      ["1111:2222:3333:::5555:6666:1.2.3.4", TypeError],
      ["1111:2222:3333:::5555:6666:7777:8888", TypeError],
      ["1111:2222:::", TypeError],
      ["1111:2222:::4444:5555:6666:1.2.3.4", TypeError],
      ["1111:2222:::4444:5555:6666:7777:8888", TypeError],
      ["1111:::", TypeError],
      ["1111:::3333:4444:5555:6666:1.2.3.4", TypeError],
      ["1111:::3333:4444:5555:6666:7777:8888", TypeError],
      ["1:::3:4:5", TypeError],
      [":::", TypeError],
      [":::1.2.3.4", TypeError],
      [":::2222:3333:4444:5555:6666:1.2.3.4", TypeError],
      [":::2222:3333:4444:5555:6666:7777:8888", TypeError],
      [":::3333:4444:5555:6666:7777:8888", TypeError],
      [":::4444:5555:6666:1.2.3.4", TypeError],
      [":::4444:5555:6666:7777:8888", TypeError],
      [":::5555", TypeError],
      [":::5555:6666:1.2.3.4", TypeError],
      [":::5555:6666:7777:8888", TypeError],
      [":::6666:1.2.3.4", TypeError],
      [":::6666:7777:8888", TypeError],
      [":::7777:8888", TypeError],
      [":::8888", TypeError],
    ];

    for (const [input, expected] of rows) assertRow(input, expected);
  });

  await t.step("accepts the canonical eight-group form", () => {
    const rows: Row[] = [
      ["0000:0000:0000:0000:0000:0000:0000:0000", 0x0n],
      ["1050:0:0:0:5:600:300c:326b", 0x105000000000000000050600300c326bn],
      [
        "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff",
        0xffffffffffffffffffffffffffffffffn,
      ],
      ["0000:0000:0000:0000:0000:0000:0000:0001", 0x1n],
      ["0:0:0:0:0:0:0:0", 0x0n],
      ["0:0:0:0:0:0:0:1", 0x1n],
      ["0:0:0:0:1:0:0:0", 0x1000000000000n],
      ["0:1:2:3:4:5:6:7", 0x1000200030004000500060007n],
      ["1080:0:0:0:8:800:200c:417a", 0x108000000000000000080800200c417an],
      [
        "1111:2222:3333:4444:5555:6666:7777:8888",
        0x11112222333344445555666677778888n,
      ],
      ["1:2:3:4:5:6:7:8", 0x10002000300040005000600070008n],
      [
        "2001:0000:1234:0000:0000:C1C0:ABCD:0876",
        0x20010000123400000000c1c0abcd0876n,
      ],
      [
        "2001:0000:4136:e378:8000:63bf:3fff:fdd2",
        0x200100004136e378800063bf3ffffdd2n,
      ],
      [
        "2001:0db8:0000:0000:0000:0000:1428:57ab",
        0x20010db80000000000000000142857abn,
      ],
      ["2001:0db8:0:0:0:0:1428:57ab", 0x20010db80000000000000000142857abn],
      [
        "2001:0db8:1234:0000:0000:0000:0000:0000",
        0x20010db8123400000000000000000000n,
      ],
      [
        "2001:0db8:1234:ffff:ffff:ffff:ffff:ffff",
        0x20010db81234ffffffffffffffffffffn,
      ],
      [
        "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
        0x20010db885a3000000008a2e03707334n,
      ],
      ["2001:DB8:0:0:8:800:200C:417A", 0x20010db80000000000080800200c417an],
      ["2001:db8:85a3:0:0:8a2e:370:7334", 0x20010db885a3000000008a2e03707334n],
      ["2608:af09:30:0:0:0:0:134", 0x2608af09003000000000000000000134n],
      [
        "3ffe:0b00:0000:0000:0001:0000:0000:000a",
        0x3ffe0b0000000000000100000000000an,
      ],
      ["7:6:5:4:3:2:1:0", 0x70006000500040003000200010000n],
      ["FF01:0:0:0:0:0:0:101", 0xff010000000000000000000000000101n],
      [
        "FF02:0000:0000:0000:0000:0000:0000:0001",
        0xff020000000000000000000000000001n,
      ],
      [
        "fe80:0000:0000:0000:0204:61ff:fe9d:f156",
        0xfe80000000000000020461fffe9df156n,
      ],
      ["fe80:0:0:0:204:61ff:fe9d:f156", 0xfe80000000000000020461fffe9df156n],
      [
        "fedc:ba98:7654:3210:fedc:ba98:7654:3210",
        0xfedcba9876543210fedcba9876543210n,
      ],
      ["1111:2222:3333:4444:5555:6666:7777:", TypeError],
      [":2222:3333:4444:5555:6666:7777:8888", TypeError],
    ];

    for (const [input, expected] of rows) assertRow(input, expected);
  });

  await t.step("rejects a group count other than eight", () => {
    const rows: Row[] = [
      ["1111:", TypeError],
      ["1111:2222", TypeError],
      ["1111:2222:", TypeError],
      ["1111:2222:3333", TypeError],
      ["1111:2222:3333:", TypeError],
      ["1111:2222:3333:4444", TypeError],
      ["1111:2222:3333:4444:", TypeError],
      ["1111:2222:3333:4444:5555", TypeError],
      ["1111:2222:3333:4444:5555:", TypeError],
      ["1111:2222:3333:4444:5555:6666", TypeError],
      ["1111:2222:3333:4444:5555:6666:", TypeError],
      ["1111:2222:3333:4444:5555:6666:7777", TypeError],
      ["1111:2222:3333:4444:5555:6666:7777:8888:", TypeError],
      ["1111:2222:3333:4444:5555:6666:7777:8888:9999", TypeError],
      ["1:2:3:4:5:6:7:8:9", TypeError],
      ["2001:DB8:0:0:8:800:200C:417A:221", TypeError],
      ["3ffe:0b00:0000:0001:0000:0000:000a", TypeError],
      [":", TypeError],
      [":1111:2222:3333:4444:5555:6666:7777:8888", TypeError],
      [":3333:4444:5555:6666:7777:8888", TypeError],
      [":4444:5555:6666:7777:8888", TypeError],
      [":5555:6666:7777:8888", TypeError],
      [":6666:7777:8888", TypeError],
      [":7777:8888", TypeError],
      [":8888", TypeError],
      ["FF02:0000:0000:0000:0000:0000:0000:0000:0001", TypeError],
      ["a:a:a:a:a:a:a:a:a", TypeError],
      ["a:b", TypeError],
      ["ffff:", TypeError],
    ];

    for (const [input, expected] of rows) assertRow(input, expected);
  });

  await t.step("rejects '::' covering zero groups", () => {
    const rows: Row[] = [
      ["0000:0000:0000:0000:0000:0000:0000:0000::0000", TypeError],
      [":2001:252:0:1::2008:6:", TypeError],
      ["1:2:3:4:5:6:7:8::", TypeError],
      ["::1:2:3:4:5:6:7:8", TypeError],
      ["::8:8:8:8:8:8:8:8:8", TypeError],
      ["1111:2222:3333:4444:5555:6666:7777:8888::", TypeError],
      ["1111:2222:3333:4444:5555:6666::8888:", TypeError],
      ["1111:2222:3333:4444:5555::7777:8888:", TypeError],
      ["1111:2222:3333:4444::6666:7777:8888:", TypeError],
      ["1111:2222:3333::5555:6666:7777:8888:", TypeError],
      ["1111:2222::4444:5555:6666:7777:8888:", TypeError],
      ["1111::3333:4444:5555:6666:7777:8888:", TypeError],
      ["1:2:3::4:5:6:7:8:9", TypeError],
      [":1111:2222:3333:4444:5555:6666:7777::", TypeError],
      [":1111:2222:3333:4444:5555:6666::8888", TypeError],
      [":1111:2222:3333:4444:5555::7777:8888", TypeError],
      [":1111:2222:3333:4444::6666:7777:8888", TypeError],
      [":1111:2222:3333::5555:6666:7777:8888", TypeError],
      [":1111:2222::4444:5555:6666:7777:8888", TypeError],
      [":1111::3333:4444:5555:6666:7777:8888", TypeError],
      ["::2222:3333:4444:5555:6666:7777:8888:", TypeError],
      ["::2222:3333:4444:5555:6666:7777:8888:9999", TypeError],
      ["1:2:3:4:5:6:7::8", TypeError],
    ];

    for (const [input, expected] of rows) assertRow(input, expected);
  });

  await t.step("rejects groups over four hex digits", () => {
    const rows: Row[] = [
      ["0000:0000:0000:0000:0000:0000:12345:0000", TypeError],
      ["200001::1", TypeError],
      ["00000::1", TypeError],
      ["00000:0:0:0:0:0:1.2.3.4", TypeError],
      ["02001:0000:1234:0000:0000:C1C0:ABCD:0876", TypeError],
      ["11112222:3333:4444:5555:6666:1.2.3.4", TypeError],
      ["11112222:3333:4444:5555:6666:7777:8888", TypeError],
      ["1111:22223333:4444:5555:6666:1.2.3.4", TypeError],
      ["1111:22223333:4444:5555:6666:7777:8888", TypeError],
      ["1111:2222:33334444:5555:6666:1.2.3.4", TypeError],
      ["1111:2222:33334444:5555:6666:7777:8888", TypeError],
      ["1111:2222:3333:44445555:6666:1.2.3.4", TypeError],
      ["1111:2222:3333:44445555:6666:7777:8888", TypeError],
      ["1111:2222:3333:4444:55556666:1.2.3.4", TypeError],
      ["1111:2222:3333:4444:55556666:7777:8888", TypeError],
      ["1111:2222:3333:4444:5555:66667777:8888", TypeError],
      ["1111:2222:3333:4444:5555:6666:77778888", TypeError],
      ["12345::6:7:8", TypeError],
      ["2001:0000:1234:0000:00001:C1C0:ABCD:0876", TypeError],
      ["2001:db8:85a3::8a2e:37023:7334", TypeError],
      ["a:aaaaa::", TypeError],
    ];

    for (const [input, expected] of rows) assertRow(input, expected);
  });

  await t.step("rejects characters outside the hex/IPv4 grammar", () => {
    const rows: Row[] = [
      ["::anything", TypeError],
      ["fe80::wtf", TypeError],
      ["':10.0.0.1", TypeError],
      ["2001:1:1:1:1:1:255Z255X255Y255", TypeError],
      ["2001:db8:85a3::8a2e:370k:7334", TypeError],
      ["::-1", TypeError],
      ["::ffff:192x168.1.26", TypeError],
      ["XXXX:XXXX:XXXX:XXXX:XXXX:XXXX:1.2.3.4", TypeError],
      ["XXXX:XXXX:XXXX:XXXX:XXXX:XXXX:XXXX:XXXX", TypeError],
      ["a::g", TypeError],
      ["a:b:c:d:e:f:g:0", TypeError],
      ["ffgg:ffff:ffff:ffff:ffff:ffff:ffff:ffff", TypeError],
      ["0x12::1", TypeError],
      ["::+1", TypeError],
    ];

    for (const [input, expected] of rows) assertRow(input, expected);
  });

  await t.step("rejects input that is not colon-hexadecimal", () => {
    const rows: Row[] = [
      ["127.0.0.1", TypeError],
      ["x127.0.0.1", TypeError],
      ["example.com", TypeError],
      ["0", TypeError],
      ["", TypeError],
      ["1", TypeError],
      ["-1", TypeError],
      ["1.2.3.4", TypeError],
      ["1111", TypeError],
      ["123", TypeError],
      ["ldkfj", TypeError],
    ];

    for (const [input, expected] of rows) assertRow(input, expected);
  });

  await t.step("rejects whitespace anywhere", () => {
    const rows: Row[] = [
      ["::1 ::1", TypeError],
      ["2001:0000:1234: 0000:0000:C1C0:ABCD:0876", TypeError],
      ["2001:0000:1234:0000:0000:C1C0:ABCD:0876  0", TypeError],
      [" ::1", TypeError],
      ["\t::1", TypeError],
      ["::1 hello", TypeError],
      ["::1 ", TypeError],
      ["::1\n", TypeError],
      ["2001:db8 ::1", TypeError],
      ["2001: db8::1", TypeError],
    ];

    for (const [input, expected] of rows) assertRow(input, expected);
  });

  await t.step("carries a well-formed zone ID", () => {
    const rows: [string, bigint, string][] = [
      ["fe80::2008%eth0", 0xfe800000000000000000000000002008n, "eth0"],
      ["fe80::2008%eth0.0", 0xfe800000000000000000000000002008n, "eth0.0"],
      ["fe80::2008%eth0@1", 0xfe800000000000000000000000002008n, "eth0@1"],
      ["::ffff:192.168.1.1%z", 0xffffc0a80101n, "z"],
      ["::1.2.3.4%z", 0x1020304n, "z"],
      ["::%z", 0x0n, "z"],
      ["fe80::1%eth0", 0xfe800000000000000000000000000001n, "eth0"],
    ];

    for (const [input, address, zoneId] of rows) {
      assertEquals(parseAddressv6(input), { address, zoneId }, input);
    }
    assertThrows(() => parseAddressv6("::8:8:8:8:8:8:8:8:8%z"), TypeError);
  });
});

Deno.test("stringifyAddressv6", async (t) => {
  await t.step("zero address", () => {
    assertEquals(stringifyAddressv6(0n), "::");
  });

  await t.step("loopback", () => {
    assertEquals(stringifyAddressv6(1n), "::1");
  });

  await t.step("common addresses", () => {
    assertEquals(
      stringifyAddressv6(0x20010db8000000000000000000000001n),
      "2001:db8::1",
    );
    assertEquals(
      stringifyAddressv6(0xfe800000000000000000000000000001n),
      "fe80::1",
    );
  });

  await t.step("no compression needed", () => {
    assertEquals(
      stringifyAddressv6(0x00010002000300040005000600070008n),
      "1:2:3:4:5:6:7:8",
    );
  });

  await t.step("single zero not compressed", () => {
    assertEquals(
      stringifyAddressv6(0x00010000000300040005000600070008n),
      "1:0:3:4:5:6:7:8",
    );
  });

  await t.step("longest zero run is compressed", () => {
    assertEquals(
      stringifyAddressv6(0x00010000000000000000000600070008n),
      "1::6:7:8",
    );
  });

  await t.step("first longest run is compressed", () => {
    assertEquals(
      stringifyAddressv6(0x00010000000000000001000000000001n),
      "1::1:0:0:1",
    );
  });

  await t.step("max address", () => {
    assertEquals(
      stringifyAddressv6(0xffffffffffffffffffffffffffffffffn),
      "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff",
    );
  });

  await t.step("leading zeros in groups are stripped", () => {
    assertEquals(
      stringifyAddressv6(0x00010002000300040005000600070008n),
      "1:2:3:4:5:6:7:8",
    );
  });

  await t.step("compression at start", () => {
    assertEquals(
      stringifyAddressv6(0x00000000000000000000000000000001n),
      "::1",
    );
  });

  await t.step("compression at end", () => {
    assertEquals(
      stringifyAddressv6(0x20010db8000000000000000000000000n),
      "2001:db8::",
    );
  });

  await t.step("out of range values", () => {
    assertThrows(
      () => stringifyAddressv6(-1n),
      RangeError,
      "IPv6 value out of range",
    );
    assertThrows(
      () => stringifyAddressv6(340282366920938463463374607431768211456n),
      RangeError,
      "IPv6 value out of range",
    );
  });
});

Deno.test("stringifyAddressv6Expanded", async (t) => {
  await t.step("zero address", () => {
    assertEquals(
      stringifyAddressv6Expanded(0n),
      "0000:0000:0000:0000:0000:0000:0000:0000",
    );
  });

  await t.step("loopback", () => {
    assertEquals(
      stringifyAddressv6Expanded(1n),
      "0000:0000:0000:0000:0000:0000:0000:0001",
    );
  });

  await t.step("every group padded to four hex digits", () => {
    assertEquals(
      stringifyAddressv6Expanded(0x20010db8000000000000000000000001n),
      "2001:0db8:0000:0000:0000:0000:0000:0001",
    );
  });

  await t.step("never compresses a zero run", () => {
    assertEquals(
      stringifyAddressv6Expanded(0x00010000000000000001000000000001n),
      "0001:0000:0000:0000:0001:0000:0000:0001",
    );
  });

  await t.step("max address", () => {
    assertEquals(
      stringifyAddressv6Expanded(340282366920938463463374607431768211455n),
      "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff",
    );
  });

  await t.step("out of range values", () => {
    assertThrows(() => stringifyAddressv6Expanded(-1n), RangeError);
    assertThrows(
      () =>
        stringifyAddressv6Expanded(340282366920938463463374607431768211456n),
      RangeError,
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
      "::ffff:c0a8:101",
    ];

    for (const addr of addresses) {
      assertEquals(stringifyAddressv6(parseAddressv6(addr)), addr);
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
      assertEquals(parseAddressv6(stringifyAddressv6(val)), { address: val });
    }
  });

  await t.step("zone IDs round-trip verbatim", () => {
    const addresses = [
      "fe80::1%eth0",
      "fe80::1%12",
      "fe80::1%eth0.100",
      "fe80::1%eth0@1",
      "fe80::1%25eth0",
      "::ffff:c0a8:101%z",
    ];

    for (const addr of addresses) {
      assertEquals(stringifyAddressv6(parseAddressv6(addr)), addr);
    }
  });

  await t.step("full form to compressed and back", () => {
    const fullForms = [
      "0000:0000:0000:0000:0000:0000:0000:0000",
      "2001:0db8:0000:0000:0000:0000:0000:0001",
      "fe80:0000:0000:0000:0000:0000:0000:0001",
    ];

    for (const full of fullForms) {
      const compressed = stringifyAddressv6(parseAddressv6(full));
      const expanded = stringifyAddressv6Expanded(parseAddressv6(compressed));
      assertEquals(expanded, full);
    }
  });
});

Deno.test("IPv6 arithmetic", async (t) => {
  await t.step("increment IP", () => {
    const ip = parseAddressv6("2001:db8::1").address;
    assertEquals(stringifyAddressv6(ip + 1n), "2001:db8::2");
  });

  await t.step("decrement IP", () => {
    const ip = parseAddressv6("2001:db8::2").address;
    assertEquals(stringifyAddressv6(ip - 1n), "2001:db8::1");
  });

  await t.step("increment across group boundary", () => {
    const ip = parseAddressv6("2001:db8::ffff").address;
    assertEquals(stringifyAddressv6(ip + 1n), "2001:db8::1:0");
  });

  await t.step("add large offset", () => {
    const ip = parseAddressv6("::").address;
    assertEquals(stringifyAddressv6(ip + 0x10000n), "::1:0");
  });
});

Deno.test("isValidAddressv6", async (t) => {
  await t.step("valid addresses", () => {
    assert(isValidAddressv6("::"));
    assert(isValidAddressv6("::1"));
    assert(isValidAddressv6("2001:db8::1"));
    assert(isValidAddressv6("fe80::1%eth0"));
    assert(isValidAddressv6("::ffff:192.168.1.1"));
    assert(
      isValidAddressv6("2001:0db8:0000:0000:0000:0000:0000:0001"),
    );
  });

  await t.step("invalid addresses", () => {
    assertEquals(isValidAddressv6(""), false);
    assertEquals(isValidAddressv6("192.168.1.1"), false);
    assertEquals(isValidAddressv6("2001:db8:::1"), false);
    assertEquals(isValidAddressv6("gggg::1"), false);
    assertEquals(isValidAddressv6("abc"), false);
    assertEquals(isValidAddressv6("2001:db8::/32"), false);
  });
});

Deno.test("compareAddressv6", async (t) => {
  await t.step("orders numerically ascending", () => {
    assertEquals(
      compareAddressv6(
        parseAddressv6("::1").address,
        parseAddressv6("::2").address,
      ),
      -1,
    );
    assertEquals(
      compareAddressv6(
        parseAddressv6("::2").address,
        parseAddressv6("::1").address,
      ),
      1,
    );
    assertEquals(
      compareAddressv6(
        parseAddressv6("::1").address,
        parseAddressv6("::1").address,
      ),
      0,
    );
  });

  await t.step("returns only -1, 0 or 1, never a magnitude", () => {
    const lowest = parseAddressv6("::").address;
    const highest = parseAddressv6("ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff")
      .address;
    assertEquals(compareAddressv6(lowest, highest), -1);
    assertEquals(compareAddressv6(highest, lowest), 1);
  });

  await t.step("sorts numerically, not lexicographically", () => {
    const addresses = ["2001:db8::9", "2001:db8::10", "2001:db8::2"].map(
      (s) => parseAddressv6(s).address,
    );
    assertEquals(addresses.toSorted(compareAddressv6).map(stringifyAddressv6), [
      "2001:db8::2",
      "2001:db8::9",
      "2001:db8::10",
    ]);
  });

  await t.step("orders IPv4-mapped addresses by their 128-bit value", () => {
    const addresses = ["::ffff:10.0.0.1", "::1", "2001:db8::1"].map(
      (s) => parseAddressv6(s).address,
    );
    assertEquals(addresses.toSorted(compareAddressv6).map(stringifyAddressv6), [
      "::1",
      "::ffff:a00:1",
      "2001:db8::1",
    ]);
  });
});

Deno.test("mapFromAddressv4", async (t) => {
  await t.step("embeds IPv4 into mapped prefix", () => {
    assertEquals(
      mapFromAddressv4(parseAddressv4("192.168.1.1").address),
      parseAddressv6("::ffff:192.168.1.1").address,
    );
    assertEquals(
      mapFromAddressv4(parseAddressv4("127.0.0.1").address),
      parseAddressv6("::ffff:127.0.0.1").address,
    );
    assertEquals(
      mapFromAddressv4(parseAddressv4("10.0.0.1").address),
      parseAddressv6("::ffff:10.0.0.1").address,
    );
  });

  await t.step("edge cases", () => {
    assertEquals(
      mapFromAddressv4(parseAddressv4("0.0.0.0").address),
      parseAddressv6("::ffff:0.0.0.0").address,
    );
    assertEquals(
      mapFromAddressv4(parseAddressv4("255.255.255.255").address),
      parseAddressv6("::ffff:255.255.255.255").address,
    );
  });

  await t.step("result stringifies to mapped hex notation", () => {
    assertEquals(
      stringifyAddressv6(
        mapFromAddressv4(parseAddressv4("192.168.1.1").address),
      ),
      "::ffff:c0a8:101",
    );
    assertEquals(
      stringifyAddressv6(mapFromAddressv4(parseAddressv4("0.0.0.0").address)),
      "::ffff:0:0",
    );
  });

  await t.step("raw numeric value is correct", () => {
    assertEquals(mapFromAddressv4(0), 0xFFFF_0000_0000n);
    assertEquals(mapFromAddressv4(1), 0xFFFF_0000_0001n);
    assertEquals(mapFromAddressv4(0xC0A80101), 0xFFFF_C0A8_0101n);
  });
});

Deno.test("unmapToAddressv4", async (t) => {
  await t.step("extracts IPv4 from mapped address", () => {
    assertEquals(
      stringifyAddressv4(
        unmapToAddressv4(parseAddressv6("::ffff:192.168.1.1").address),
      ),
      "192.168.1.1",
    );
    assertEquals(
      stringifyAddressv4(
        unmapToAddressv4(parseAddressv6("::ffff:127.0.0.1").address),
      ),
      "127.0.0.1",
    );
    assertEquals(
      stringifyAddressv4(
        unmapToAddressv4(parseAddressv6("::ffff:10.0.0.1").address),
      ),
      "10.0.0.1",
    );
  });

  await t.step("accepts hex notation input", () => {
    assertEquals(
      stringifyAddressv4(
        unmapToAddressv4(parseAddressv6("::ffff:c0a8:101").address),
      ),
      "192.168.1.1",
    );
  });

  await t.step("edge cases", () => {
    assertEquals(unmapToAddressv4(parseAddressv6("::ffff:0.0.0.0").address), 0);
    assertEquals(
      unmapToAddressv4(parseAddressv6("::ffff:255.255.255.255").address),
      0xFFFFFFFF,
    );
  });

  await t.step("round-trip with mapFromAddressv4", () => {
    const addrs = [
      "0.0.0.0",
      "127.0.0.1",
      "192.168.1.1",
      "10.0.0.1",
      "255.255.255.255",
    ];
    for (const addr of addrs) {
      const v4 = parseAddressv4(addr).address;
      assertEquals(unmapToAddressv4(mapFromAddressv4(v4)), v4);
    }
  });
});
