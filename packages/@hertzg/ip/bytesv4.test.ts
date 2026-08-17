import { assertEquals, assertThrows } from "@std/assert";
import { addressv4FromBytes, addressv4ToBytes } from "./bytesv4.ts";
import { parseAddressv4 } from "./addressv4.ts";

Deno.test("addressv4FromBytes", async (t) => {
  await t.step("reads four bytes in network order", () => {
    assertEquals(
      addressv4FromBytes(new Uint8Array([192, 168, 1, 1])),
      3232235777,
    );
    assertEquals(addressv4FromBytes(new Uint8Array([10, 0, 0, 1])), 167772161);
    assertEquals(
      addressv4FromBytes(new Uint8Array([172, 16, 0, 1])),
      2886729729,
    );
  });

  await t.step("edge cases", () => {
    assertEquals(addressv4FromBytes(new Uint8Array([0, 0, 0, 0])), 0);
    assertEquals(
      addressv4FromBytes(new Uint8Array([255, 255, 255, 255])),
      4294967295,
    );
  });

  await t.step("a set high bit does not produce a negative number", () => {
    assertEquals(
      addressv4FromBytes(new Uint8Array([128, 0, 0, 0])),
      2147483648,
    );
    assertEquals(
      addressv4FromBytes(new Uint8Array([224, 0, 0, 1])),
      3758096385,
    );
  });

  await t.step("reads at an offset inside a larger buffer", () => {
    // deno-fmt-ignore
    const packet = new Uint8Array([
      0x45, 0x00, 0x00, 0x54, 0x1c, 0x46, 0x40, 0x00,
      0x40, 0x06, 0x00, 0x00,
      10, 0, 0, 1,
      192, 168, 1, 1,
    ]);

    assertEquals(addressv4FromBytes(packet, 12), 167772161);
    assertEquals(addressv4FromBytes(packet, 16), 3232235777);
  });

  await t.step("defaults to offset 0", () => {
    const bytes = new Uint8Array([203, 0, 113, 7]);

    assertEquals(addressv4FromBytes(bytes), addressv4FromBytes(bytes, 0));
  });

  await t.step("reads through a subarray view", () => {
    const packet = new Uint8Array([0xaa, 0xbb, 198, 51, 100, 42, 0xcc]);
    const field = packet.subarray(2, 6);

    assertEquals(addressv4FromBytes(field), 3325256746);
  });

  await t.step("a short buffer throws instead of decoding as 0.0.0.0", () => {
    assertThrows(
      () => addressv4FromBytes(new Uint8Array([1, 2, 3])),
      RangeError,
      "IPv4 needs 4 bytes at offset 0 of a 3-byte buffer",
    );
    assertThrows(() => addressv4FromBytes(new Uint8Array()), RangeError);
  });

  await t.step("a span running off the end throws", () => {
    assertThrows(
      () => addressv4FromBytes(new Uint8Array([1, 2, 3, 4]), 1),
      RangeError,
      "IPv4 needs 4 bytes at offset 1 of a 4-byte buffer",
    );
    assertThrows(() => addressv4FromBytes(new Uint8Array(20), 17), RangeError);
  });

  await t.step("a negative offset throws", () => {
    assertThrows(
      () => addressv4FromBytes(new Uint8Array(20), -4),
      RangeError,
      "IPv4 needs 4 bytes at offset -4 of a 20-byte buffer",
    );
  });
});

Deno.test("addressv4ToBytes", async (t) => {
  await t.step(
    "allocates four bytes in network order when into is omitted",
    () => {
      assertEquals(
        addressv4ToBytes(parseAddressv4("192.168.1.1").address),
        new Uint8Array([192, 168, 1, 1]),
      );
      assertEquals(addressv4ToBytes(0), new Uint8Array([0, 0, 0, 0]));
      assertEquals(
        addressv4ToBytes(4294967295),
        new Uint8Array([255, 255, 255, 255]),
      );
    },
  );

  await t.step("a fresh buffer is not shared between calls", () => {
    const first = addressv4ToBytes(167772161);
    const second = addressv4ToBytes(167772161);
    first[0] = 99;

    assertEquals(second[0], 10);
  });

  await t.step("writes into an existing buffer at an offset", () => {
    const frame = new Uint8Array(20).fill(0xaa);
    addressv4ToBytes(parseAddressv4("192.168.1.1").address, frame, 6);

    assertEquals(
      frame.slice(4, 12),
      new Uint8Array([0xaa, 0xaa, 192, 168, 1, 1, 0xaa, 0xaa]),
    );
  });

  await t.step("returns only the written span, not the whole buffer", () => {
    const frame = new Uint8Array(20).fill(0xaa);
    const written = addressv4ToBytes(
      parseAddressv4("203.0.113.7").address,
      frame,
      6,
    );

    assertEquals(written, new Uint8Array([203, 0, 113, 7]));
  });

  await t.step("the returned span is a view aliasing the target buffer", () => {
    const frame = new Uint8Array(8);
    const written = addressv4ToBytes(
      parseAddressv4("198.51.100.42").address,
      frame,
      4,
    );
    written[3] = 9;

    assertEquals(frame[7], 9);
  });

  await t.step("writes through a subarray view", () => {
    const frame = new Uint8Array(12).fill(0xcc);
    const window = frame.subarray(4, 8);
    addressv4ToBytes(parseAddressv4("10.0.0.1").address, window);

    assertEquals(frame.slice(3, 9), new Uint8Array([0xcc, 10, 0, 0, 1, 0xcc]));
  });

  await t.step("defaults to offset 0", () => {
    const explicit = new Uint8Array(6).fill(0xaa);
    const implicit = new Uint8Array(6).fill(0xaa);
    addressv4ToBytes(parseAddressv4("10.0.0.1").address, explicit, 0);
    addressv4ToBytes(parseAddressv4("10.0.0.1").address, implicit);

    assertEquals(implicit, explicit);
  });

  await t.step("an out-of-range address throws", () => {
    assertThrows(
      () => addressv4ToBytes(-1),
      RangeError,
      "IPv4 value out of range: -1 (must be 0 to 4294967295)",
    );
    assertThrows(() => addressv4ToBytes(4294967296), RangeError);
    assertThrows(() => addressv4ToBytes(1.5), RangeError);
  });

  await t.step("a span running off the end throws", () => {
    assertThrows(
      () => addressv4ToBytes(167772161, new Uint8Array(3)),
      RangeError,
      "IPv4 needs 4 bytes at offset 0 of a 3-byte buffer",
    );
    assertThrows(
      () => addressv4ToBytes(167772161, new Uint8Array(20), 17),
      RangeError,
    );
    assertThrows(
      () => addressv4ToBytes(167772161, new Uint8Array(20), -1),
      RangeError,
    );
  });

  await t.step("leaves the target untouched when it throws", () => {
    const frame = new Uint8Array(6).fill(0xaa);

    assertThrows(() => addressv4ToBytes(167772161, frame, 4), RangeError);
    assertEquals(frame, new Uint8Array(6).fill(0xaa));
  });

  await t.step("round-trips with addressv4FromBytes", () => {
    for (const notation of ["0.0.0.0", "10.0.0.1", "255.255.255.255"]) {
      const address = parseAddressv4(notation).address;
      assertEquals(addressv4FromBytes(addressv4ToBytes(address)), address);
    }
  });
});
