import { assertEquals, assertThrows } from "@std/assert";
import { ipv6FromBytes, ipv6ToBytes } from "./bytesv6.ts";
import { ipv4To64Mapped } from "./4to6.ts";
import { parseIpv4 } from "./ipv4.ts";
import { parseIpv6 } from "./ipv6.ts";

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
    // deno-fmt-ignore
    const packet = new Uint8Array([
      ...new Uint8Array(8),
      0xfe, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01,
      0x20, 0x01, 0x0d, 0xb8, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02,
    ]);

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
