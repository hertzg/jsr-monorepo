import { assertEquals, assertThrows } from "@std/assert";
import {
  ipFromBytes,
  ipToBytes,
  ipv4FromBytes,
  ipv4ToBytes,
  ipv6FromBytes,
  ipv6ToBytes,
} from "./bytes.ts";
import { ipv4From64Mapped, ipv4To64Mapped } from "./4to6.ts";
import { parseIpv4 } from "./ipv4.ts";
import { parseIpv6 } from "./ipv6.ts";

Deno.test("ipv4FromBytes", async (t) => {
  await t.step("reads four bytes in network order", () => {
    assertEquals(ipv4FromBytes(new Uint8Array([192, 168, 1, 1])), 3232235777);
    assertEquals(ipv4FromBytes(new Uint8Array([10, 0, 0, 1])), 167772161);
    assertEquals(ipv4FromBytes(new Uint8Array([172, 16, 0, 1])), 2886729729);
  });

  await t.step("edge cases", () => {
    assertEquals(ipv4FromBytes(new Uint8Array([0, 0, 0, 0])), 0);
    assertEquals(
      ipv4FromBytes(new Uint8Array([255, 255, 255, 255])),
      4294967295,
    );
  });

  await t.step("a set high bit does not produce a negative number", () => {
    assertEquals(ipv4FromBytes(new Uint8Array([128, 0, 0, 0])), 2147483648);
    assertEquals(ipv4FromBytes(new Uint8Array([224, 0, 0, 1])), 3758096385);
  });

  await t.step("reads at an offset inside a larger buffer", () => {
    // deno-fmt-ignore
    const packet = new Uint8Array([
      0x45, 0x00, 0x00, 0x54, 0x1c, 0x46, 0x40, 0x00,
      0x40, 0x06, 0x00, 0x00,
      10, 0, 0, 1,
      192, 168, 1, 1,
    ]);

    assertEquals(ipv4FromBytes(packet, 12), 167772161);
    assertEquals(ipv4FromBytes(packet, 16), 3232235777);
  });

  await t.step("defaults to offset 0", () => {
    const bytes = new Uint8Array([203, 0, 113, 7]);

    assertEquals(ipv4FromBytes(bytes), ipv4FromBytes(bytes, 0));
  });

  await t.step("reads through a subarray view", () => {
    const packet = new Uint8Array([0xaa, 0xbb, 198, 51, 100, 42, 0xcc]);
    const field = packet.subarray(2, 6);

    assertEquals(ipv4FromBytes(field), 3325256746);
  });

  await t.step("a short buffer throws instead of decoding as 0.0.0.0", () => {
    assertThrows(
      () => ipv4FromBytes(new Uint8Array([1, 2, 3])),
      RangeError,
      "IPv4 needs 4 bytes at offset 0 of a 3-byte buffer",
    );
    assertThrows(() => ipv4FromBytes(new Uint8Array()), RangeError);
  });

  await t.step("a span running off the end throws", () => {
    assertThrows(
      () => ipv4FromBytes(new Uint8Array([1, 2, 3, 4]), 1),
      RangeError,
      "IPv4 needs 4 bytes at offset 1 of a 4-byte buffer",
    );
    assertThrows(() => ipv4FromBytes(new Uint8Array(20), 17), RangeError);
  });

  await t.step("a negative offset throws", () => {
    assertThrows(
      () => ipv4FromBytes(new Uint8Array(20), -4),
      RangeError,
      "IPv4 needs 4 bytes at offset -4 of a 20-byte buffer",
    );
  });
});

Deno.test("ipv4ToBytes", async (t) => {
  await t.step(
    "allocates four bytes in network order when into is omitted",
    () => {
      assertEquals(
        ipv4ToBytes(parseIpv4("192.168.1.1")),
        new Uint8Array([192, 168, 1, 1]),
      );
      assertEquals(ipv4ToBytes(0), new Uint8Array([0, 0, 0, 0]));
      assertEquals(
        ipv4ToBytes(4294967295),
        new Uint8Array([255, 255, 255, 255]),
      );
    },
  );

  await t.step("a fresh buffer is not shared between calls", () => {
    const first = ipv4ToBytes(167772161);
    const second = ipv4ToBytes(167772161);
    first[0] = 99;

    assertEquals(second[0], 10);
  });

  await t.step("writes into an existing buffer at an offset", () => {
    const frame = new Uint8Array(20).fill(0xaa);
    ipv4ToBytes(parseIpv4("192.168.1.1"), frame, 6);

    assertEquals(
      frame.slice(4, 12),
      new Uint8Array([0xaa, 0xaa, 192, 168, 1, 1, 0xaa, 0xaa]),
    );
  });

  await t.step("returns only the written span, not the whole buffer", () => {
    const frame = new Uint8Array(20).fill(0xaa);
    const written = ipv4ToBytes(parseIpv4("203.0.113.7"), frame, 6);

    assertEquals(written.length, 4);
    assertEquals(written, new Uint8Array([203, 0, 113, 7]));
  });

  await t.step("the returned span is a view aliasing the target buffer", () => {
    const frame = new Uint8Array(8);
    const written = ipv4ToBytes(parseIpv4("198.51.100.42"), frame, 4);
    written[3] = 9;

    assertEquals(frame[7], 9);
  });

  await t.step("writes through a subarray view", () => {
    const frame = new Uint8Array(12).fill(0xcc);
    const window = frame.subarray(4, 8);
    ipv4ToBytes(parseIpv4("10.0.0.1"), window);

    assertEquals(frame.slice(3, 9), new Uint8Array([0xcc, 10, 0, 0, 1, 0xcc]));
  });

  await t.step("defaults to offset 0", () => {
    const explicit = new Uint8Array(6).fill(0xaa);
    const implicit = new Uint8Array(6).fill(0xaa);
    ipv4ToBytes(parseIpv4("10.0.0.1"), explicit, 0);
    ipv4ToBytes(parseIpv4("10.0.0.1"), implicit);

    assertEquals(implicit, explicit);
  });

  await t.step("an out-of-range address throws", () => {
    assertThrows(
      () => ipv4ToBytes(-1),
      RangeError,
      "IPv4 value out of range: -1 (must be 0 to 4294967295)",
    );
    assertThrows(() => ipv4ToBytes(4294967296), RangeError);
    assertThrows(() => ipv4ToBytes(1.5), RangeError);
  });

  await t.step("a span running off the end throws", () => {
    assertThrows(
      () => ipv4ToBytes(167772161, new Uint8Array(3)),
      RangeError,
      "IPv4 needs 4 bytes at offset 0 of a 3-byte buffer",
    );
    assertThrows(
      () => ipv4ToBytes(167772161, new Uint8Array(20), 17),
      RangeError,
    );
    assertThrows(
      () => ipv4ToBytes(167772161, new Uint8Array(20), -1),
      RangeError,
    );
  });

  await t.step("leaves the target untouched when it throws", () => {
    const frame = new Uint8Array(6).fill(0xaa);

    assertThrows(() => ipv4ToBytes(167772161, frame, 4), RangeError);
    assertEquals(frame, new Uint8Array(6).fill(0xaa));
  });

  await t.step("round-trips with ipv4FromBytes", () => {
    for (const notation of ["0.0.0.0", "10.0.0.1", "255.255.255.255"]) {
      const address = parseIpv4(notation);
      assertEquals(ipv4FromBytes(ipv4ToBytes(address)), address);
    }
  });
});

Deno.test("ipv6FromBytes", async (t) => {
  await t.step("reads sixteen bytes in network order", () => {
    // deno-fmt-ignore
    const bytes = new Uint8Array([
      0x20, 0x01, 0x0d, 0xb8, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01,
    ]);

    assertEquals(ipv6FromBytes(bytes), parseIpv6("2001:db8::1"));
  });

  await t.step("edge cases", () => {
    assertEquals(ipv6FromBytes(new Uint8Array(16)), 0n);
    assertEquals(
      ipv6FromBytes(new Uint8Array(16).fill(0xff)),
      0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFn,
    );
  });

  await t.step("carries bytes across the 64-bit halves", () => {
    const bytes = new Uint8Array(16);
    bytes[7] = 1;
    bytes[8] = 1;

    assertEquals(ipv6FromBytes(bytes), (1n << 64n) | (1n << 56n));
  });

  await t.step("a set high bit does not sign-extend", () => {
    const bytes = new Uint8Array(16);
    bytes[0] = 0xff;
    bytes[4] = 0xff;
    bytes[8] = 0xff;
    bytes[12] = 0xff;

    assertEquals(
      ipv6FromBytes(bytes),
      parseIpv6("ff00:0:ff00:0:ff00:0:ff00:0"),
    );
  });

  await t.step("reads at an offset inside a larger buffer", () => {
    const packet = new Uint8Array(40);
    packet.set(ipv6ToBytes(parseIpv6("fe80::1")), 8);
    packet.set(ipv6ToBytes(parseIpv6("2001:db8::2")), 24);

    assertEquals(ipv6FromBytes(packet, 8), parseIpv6("fe80::1"));
    assertEquals(ipv6FromBytes(packet, 24), parseIpv6("2001:db8::2"));
  });

  await t.step("IPv4-mapped bytes stay a 128-bit value", () => {
    // deno-fmt-ignore
    const mapped = new Uint8Array([
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0xff, 0xff, 192, 168, 1, 1,
    ]);

    assertEquals(
      ipv6FromBytes(mapped),
      ipv4To64Mapped(parseIpv4("192.168.1.1")),
    );
  });

  await t.step("a short buffer throws", () => {
    assertThrows(
      () => ipv6FromBytes(new Uint8Array(15)),
      RangeError,
      "IPv6 needs 16 bytes at offset 0 of a 15-byte buffer",
    );
  });

  await t.step("a span running off the end throws", () => {
    assertThrows(
      () => ipv6FromBytes(new Uint8Array(16), 1),
      RangeError,
      "IPv6 needs 16 bytes at offset 1 of a 16-byte buffer",
    );
    assertThrows(() => ipv6FromBytes(new Uint8Array(40), -8), RangeError);
  });
});

Deno.test("ipv6ToBytes", async (t) => {
  await t.step(
    "allocates sixteen bytes in network order when into is omitted",
    () => {
      // deno-fmt-ignore
      assertEquals(ipv6ToBytes(parseIpv6("2001:db8::1")), new Uint8Array([
      0x20, 0x01, 0x0d, 0xb8, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01,
    ]));
      assertEquals(ipv6ToBytes(0n), new Uint8Array(16));
      assertEquals(
        ipv6ToBytes(0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFn),
        new Uint8Array(16).fill(0xff),
      );
    },
  );

  await t.step("writes into an existing buffer at an offset", () => {
    const frame = new Uint8Array(40);
    ipv6ToBytes(parseIpv6("::1"), frame, 8);

    assertEquals(frame[23], 1);
    assertEquals(frame.slice(0, 8), new Uint8Array(8));
    assertEquals(frame.slice(24), new Uint8Array(16));
  });

  await t.step("returns only the written span, not the whole buffer", () => {
    const frame = new Uint8Array(40).fill(0xaa);
    const written = ipv6ToBytes(parseIpv6("fe80::1"), frame, 8);

    assertEquals(written.length, 16);
    // deno-fmt-ignore
    assertEquals(written, new Uint8Array([
      0xfe, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01,
    ]));
  });

  await t.step("the returned span is a view aliasing the target buffer", () => {
    const frame = new Uint8Array(32);
    const written = ipv6ToBytes(parseIpv6("2001:db8::2"), frame, 16);
    written[15] = 9;

    assertEquals(frame[31], 9);
  });

  await t.step("an out-of-range address throws", () => {
    assertThrows(
      () => ipv6ToBytes(-1n),
      RangeError,
      "IPv6 value out of range: -1 (must be 0 to 2^128-1)",
    );
    assertThrows(
      () => ipv6ToBytes(1n << 128n),
      RangeError,
      "IPv6 value out of range",
    );
  });

  await t.step("a span running off the end throws", () => {
    assertThrows(
      () => ipv6ToBytes(1n, new Uint8Array(15)),
      RangeError,
      "IPv6 needs 16 bytes at offset 0 of a 15-byte buffer",
    );
    assertThrows(() => ipv6ToBytes(1n, new Uint8Array(20), 8), RangeError);
    assertThrows(() => ipv6ToBytes(1n, new Uint8Array(20), -1), RangeError);
  });

  await t.step("round-trips with ipv6FromBytes", () => {
    for (const notation of ["::", "::1", "2001:db8::1", "fe80::dead:beef"]) {
      const address = parseIpv6(notation);
      assertEquals(ipv6FromBytes(ipv6ToBytes(address)), address);
    }
    const max = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFn;
    assertEquals(ipv6FromBytes(ipv6ToBytes(max)), max);
  });
});

Deno.test("ipFromBytes", async (t) => {
  await t.step("a 4-byte span reads as IPv4 and returns a number", () => {
    const address = ipFromBytes(new Uint8Array([10, 0, 0, 1]));

    assertEquals(typeof address, "number");
    assertEquals(address, 167772161);
  });

  await t.step("a 16-byte span reads as IPv6 and returns a bigint", () => {
    const address = ipFromBytes(new Uint8Array(16));

    assertEquals(typeof address, "bigint");
    assertEquals(address, 0n);
  });

  await t.step("the span, not the buffer length, picks the version", () => {
    const packet = new Uint8Array(20);
    packet.set([203, 0, 113, 7], 16);

    // The same four bytes: a 4-byte span reads them as IPv4, while a 16-byte
    // span reads them as the low end of an IPv6 address.
    assertEquals(ipFromBytes(packet, 16), 3405803783);
    assertEquals(ipFromBytes(packet, 4), 3405803783n);
  });

  await t.step("a span that is neither 4 nor 16 throws", () => {
    assertThrows(
      () => ipFromBytes(new Uint8Array([1, 2, 3])),
      RangeError,
      "IP address needs a span of exactly 4 or 16 bytes, but offset 0 of a 3-byte buffer leaves 3",
    );
    assertThrows(() => ipFromBytes(new Uint8Array(6)), RangeError);
    assertThrows(() => ipFromBytes(new Uint8Array(15)), RangeError);
    assertThrows(() => ipFromBytes(new Uint8Array(17)), RangeError);
    assertThrows(() => ipFromBytes(new Uint8Array()), RangeError);
  });

  await t.step(
    "a whole frame throws rather than reading its first 16 bytes",
    () => {
      assertThrows(
        () => ipFromBytes(new Uint8Array(20)),
        RangeError,
        "leaves 20",
      );
      assertThrows(
        () => ipFromBytes(new Uint8Array(60), 12),
        RangeError,
        "leaves 48",
      );
    },
  );

  await t.step("a negative offset throws", () => {
    assertThrows(() => ipFromBytes(new Uint8Array(4), -0.5), RangeError);
    assertThrows(() => ipFromBytes(new Uint8Array(20), -4), RangeError);
  });

  await t.step("IPv4-mapped bytes are not unwrapped to a number", () => {
    // deno-fmt-ignore
    const mapped = new Uint8Array([
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0xff, 0xff, 192, 168, 1, 1,
    ]);

    const address = ipFromBytes(mapped);
    assertEquals(typeof address, "bigint");
    assertEquals(ipv4From64Mapped(address as bigint), parseIpv4("192.168.1.1"));
  });
});

Deno.test("ipToBytes", async (t) => {
  await t.step("a number writes four bytes", () => {
    assertEquals(
      ipToBytes(parseIpv4("192.168.1.1")),
      new Uint8Array([192, 168, 1, 1]),
    );
  });

  await t.step("a bigint writes sixteen bytes", () => {
    const written = ipToBytes(parseIpv6("::1"));

    assertEquals(written.length, 16);
    assertEquals(written[15], 1);
  });

  await t.step("writes into an existing buffer at an offset", () => {
    const frame = new Uint8Array(40).fill(0xaa);
    const v4 = ipToBytes(parseIpv4("10.0.0.1"), frame, 0);
    const v6 = ipToBytes(parseIpv6("2001:db8::1"), frame, 8);

    assertEquals(v4.length, 4);
    assertEquals(v6.length, 16);
    assertEquals(frame.slice(0, 4), new Uint8Array([10, 0, 0, 1]));
    assertEquals(frame.slice(8, 24), ipToBytes(parseIpv6("2001:db8::1")));
  });

  await t.step("returns only the written span, not the whole buffer", () => {
    const frame = new Uint8Array(40).fill(0xaa);

    assertEquals(
      ipToBytes(parseIpv4("203.0.113.7"), frame, 20),
      new Uint8Array([203, 0, 113, 7]),
    );
    // deno-fmt-ignore
    assertEquals(ipToBytes(parseIpv6("fe80::1"), frame, 20), new Uint8Array([
      0xfe, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01,
    ]));
  });

  await t.step("an out-of-range address throws for either version", () => {
    assertThrows(() => ipToBytes(4294967296), RangeError);
    assertThrows(() => ipToBytes(1n << 128n), RangeError);
  });

  await t.step("a span running off the end throws for either version", () => {
    assertThrows(() => ipToBytes(167772161, new Uint8Array(3)), RangeError);
    assertThrows(() => ipToBytes(1n, new Uint8Array(15)), RangeError);
  });

  await t.step("round-trips with ipFromBytes, preserving the width", () => {
    const v4 = new Uint8Array([198, 51, 100, 42]);
    assertEquals(ipToBytes(ipFromBytes(v4)), v4);

    // deno-fmt-ignore
    const mapped = new Uint8Array([
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0xff, 0xff, 192, 168, 1, 1,
    ]);
    assertEquals(ipToBytes(ipFromBytes(mapped)), mapped);
  });
});
