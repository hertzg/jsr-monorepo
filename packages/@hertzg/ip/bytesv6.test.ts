import { assertEquals, assertThrows } from "@std/assert";
import { addressv6FromBytes, addressv6ToBytes } from "./bytesv6.ts";
import { parseAddressv4 } from "./addressv4.ts";
import { mapFromAddressv4, parseAddressv6 } from "./addressv6.ts";

Deno.test("addressv6FromBytes", async (t) => {
  await t.step("reads sixteen bytes in network order", () => {
    // deno-fmt-ignore
    const bytes = new Uint8Array([
      0x20, 0x01, 0x0d, 0xb8, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01,
    ]);

    assertEquals(addressv6FromBytes(bytes), parseAddressv6("2001:db8::1"));
  });

  await t.step("edge cases", () => {
    assertEquals(addressv6FromBytes(new Uint8Array(16)), 0n);
    assertEquals(
      addressv6FromBytes(new Uint8Array(16).fill(0xff)),
      0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFn,
    );
  });

  await t.step("carries bytes across the 64-bit halves", () => {
    const bytes = new Uint8Array(16);
    bytes[7] = 1;
    bytes[8] = 1;

    assertEquals(addressv6FromBytes(bytes), (1n << 64n) | (1n << 56n));
  });

  await t.step("a set high bit does not sign-extend", () => {
    const bytes = new Uint8Array(16);
    bytes[0] = 0xff;
    bytes[4] = 0xff;
    bytes[8] = 0xff;
    bytes[12] = 0xff;

    assertEquals(
      addressv6FromBytes(bytes),
      parseAddressv6("ff00:0:ff00:0:ff00:0:ff00:0"),
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

    assertEquals(addressv6FromBytes(packet, 8), parseAddressv6("fe80::1"));
    assertEquals(addressv6FromBytes(packet, 24), parseAddressv6("2001:db8::2"));
  });

  await t.step("IPv4-mapped bytes stay a 128-bit value", () => {
    // deno-fmt-ignore
    const mapped = new Uint8Array([
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0xff, 0xff, 192, 168, 1, 1,
    ]);

    assertEquals(
      addressv6FromBytes(mapped),
      mapFromAddressv4(parseAddressv4("192.168.1.1")),
    );
  });

  await t.step("a short buffer throws", () => {
    assertThrows(
      () => addressv6FromBytes(new Uint8Array(15)),
      RangeError,
      "IPv6 needs 16 bytes at offset 0 of a 15-byte buffer",
    );
  });

  await t.step("a span running off the end throws", () => {
    assertThrows(
      () => addressv6FromBytes(new Uint8Array(16), 1),
      RangeError,
      "IPv6 needs 16 bytes at offset 1 of a 16-byte buffer",
    );
    assertThrows(() => addressv6FromBytes(new Uint8Array(40), -8), RangeError);
  });
});

Deno.test("addressv6ToBytes", async (t) => {
  await t.step(
    "allocates sixteen bytes in network order when into is omitted",
    () => {
      // deno-fmt-ignore
      assertEquals(addressv6ToBytes(parseAddressv6("2001:db8::1")), new Uint8Array([
      0x20, 0x01, 0x0d, 0xb8, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01,
    ]));
      assertEquals(addressv6ToBytes(0n), new Uint8Array(16));
      assertEquals(
        addressv6ToBytes(0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFn),
        new Uint8Array(16).fill(0xff),
      );
    },
  );

  await t.step("writes into an existing buffer at an offset", () => {
    const frame = new Uint8Array(40);
    addressv6ToBytes(parseAddressv6("::1"), frame, 8);

    assertEquals(frame[23], 1);
    assertEquals(frame.slice(0, 8), new Uint8Array(8));
    assertEquals(frame.slice(24), new Uint8Array(16));
  });

  await t.step("returns only the written span, not the whole buffer", () => {
    const frame = new Uint8Array(40).fill(0xaa);
    const written = addressv6ToBytes(parseAddressv6("fe80::1"), frame, 8);

    // deno-fmt-ignore
    assertEquals(written, new Uint8Array([
      0xfe, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01,
    ]));
  });

  await t.step("the returned span is a view aliasing the target buffer", () => {
    const frame = new Uint8Array(32);
    const written = addressv6ToBytes(parseAddressv6("2001:db8::2"), frame, 16);
    written[15] = 9;

    assertEquals(frame[31], 9);
  });

  await t.step("an out-of-range address throws", () => {
    assertThrows(
      () => addressv6ToBytes(-1n),
      RangeError,
      "IPv6 value out of range: -1 (must be 0 to 2^128-1)",
    );
    assertThrows(
      () => addressv6ToBytes(1n << 128n),
      RangeError,
      "IPv6 value out of range",
    );
  });

  await t.step("a span running off the end throws", () => {
    assertThrows(
      () => addressv6ToBytes(1n, new Uint8Array(15)),
      RangeError,
      "IPv6 needs 16 bytes at offset 0 of a 15-byte buffer",
    );
    assertThrows(() => addressv6ToBytes(1n, new Uint8Array(20), 8), RangeError);
    assertThrows(
      () => addressv6ToBytes(1n, new Uint8Array(20), -1),
      RangeError,
    );
  });

  await t.step("round-trips with addressv6FromBytes", () => {
    for (const notation of ["::", "::1", "2001:db8::1", "fe80::dead:beef"]) {
      const address = parseAddressv6(notation);
      assertEquals(addressv6FromBytes(addressv6ToBytes(address)), address);
    }
    const max = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFn;
    assertEquals(addressv6FromBytes(addressv6ToBytes(max)), max);
  });
});
