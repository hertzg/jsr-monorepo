import { assertEquals, assertThrows } from "@std/assert";
import { addressFromBytes, addressToBytes } from "./bytes.ts";
import { parseAddressv4 } from "./addressv4.ts";
import { parseAddressv6, unmapToAddressv4 } from "./addressv6.ts";

Deno.test("addressFromBytes", async (t) => {
  await t.step("a 4-byte span reads as IPv4 and returns a number", () => {
    const address = addressFromBytes(new Uint8Array([10, 0, 0, 1]));

    assertEquals(typeof address, "number");
    assertEquals(address, 167772161);
  });

  await t.step("a 16-byte span reads as IPv6 and returns a bigint", () => {
    const address = addressFromBytes(new Uint8Array(16));

    assertEquals(typeof address, "bigint");
    assertEquals(address, 0n);
  });

  await t.step("a subarray of the exact width reads through", () => {
    const packet = new Uint8Array(20);
    packet.set([203, 0, 113, 7], 16);

    // The same four bytes: sliced to 4 they read as IPv4, sliced to 16 they
    // read as the low end of an IPv6 address. The slice states which.
    assertEquals(addressFromBytes(packet.subarray(16, 20)), 3405803783);
    assertEquals(addressFromBytes(packet.subarray(4, 20)), 3405803783n);
  });

  await t.step("a length that is neither 4 nor 16 throws", () => {
    assertThrows(
      () => addressFromBytes(new Uint8Array([1, 2, 3])),
      RangeError,
      "IP address must be exactly 4 or 16 bytes, got 3",
    );
    assertThrows(() => addressFromBytes(new Uint8Array(6)), RangeError);
    assertThrows(() => addressFromBytes(new Uint8Array(15)), RangeError);
    assertThrows(() => addressFromBytes(new Uint8Array(17)), RangeError);
    assertThrows(() => addressFromBytes(new Uint8Array()), RangeError);
  });

  await t.step(
    "a whole frame throws rather than reading its first 16 bytes",
    () => {
      assertThrows(
        () => addressFromBytes(new Uint8Array(20)),
        RangeError,
        "got 20",
      );
      assertThrows(
        () => addressFromBytes(new Uint8Array(60)),
        RangeError,
        "got 60",
      );
    },
  );

  await t.step("the amount of trailing data cannot change the version", () => {
    // The same 4-byte field at the same place in frames of different sizes.
    // Slicing pins the width, so every frame reads it identically.
    for (const total of [20, 24, 28, 32]) {
      const packet = new Uint8Array(total);
      packet.set([10, 0, 0, 1], 12);

      assertEquals(addressFromBytes(packet.subarray(12, 16)), 167772161);
    }
  });

  await t.step("IPv4-mapped bytes are not unwrapped to a number", () => {
    // deno-fmt-ignore
    const mapped = new Uint8Array([
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0xff, 0xff, 192, 168, 1, 1,
    ]);

    const address = addressFromBytes(mapped);
    assertEquals(typeof address, "bigint");
    assertEquals(
      unmapToAddressv4(address as bigint),
      parseAddressv4("192.168.1.1").address,
    );
  });
});

Deno.test("addressToBytes", async (t) => {
  await t.step("a number writes four bytes", () => {
    assertEquals(
      addressToBytes(parseAddressv4("192.168.1.1").address),
      new Uint8Array([192, 168, 1, 1]),
    );
  });

  await t.step("a bigint writes sixteen bytes", () => {
    const written = addressToBytes(parseAddressv6("::1").address);

    assertEquals(written.length, 16);
    assertEquals(written[15], 1);
  });

  await t.step("writes into an existing buffer at an offset", () => {
    const frame = new Uint8Array(40).fill(0xaa);
    addressToBytes(parseAddressv4("10.0.0.1").address, frame, 0);
    addressToBytes(parseAddressv6("2001:db8::1").address, frame, 8);

    assertEquals(frame.slice(0, 4), new Uint8Array([10, 0, 0, 1]));
    // deno-fmt-ignore
    assertEquals(frame.slice(8, 24), new Uint8Array([
      0x20, 0x01, 0x0d, 0xb8, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01,
    ]));
  });

  await t.step("returns only the written span, not the whole buffer", () => {
    const frame = new Uint8Array(40).fill(0xaa);

    assertEquals(
      addressToBytes(parseAddressv4("203.0.113.7").address, frame, 20),
      new Uint8Array([203, 0, 113, 7]),
    );
    // deno-fmt-ignore
    assertEquals(addressToBytes(parseAddressv6("fe80::1").address, frame, 20), new Uint8Array([
      0xfe, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01,
    ]));
  });

  await t.step("an out-of-range address throws for either version", () => {
    assertThrows(() => addressToBytes(4294967296), RangeError);
    assertThrows(() => addressToBytes(1n << 128n), RangeError);
  });

  await t.step("a span running off the end throws for either version", () => {
    assertThrows(
      () => addressToBytes(167772161, new Uint8Array(3)),
      RangeError,
    );
    assertThrows(() => addressToBytes(1n, new Uint8Array(15)), RangeError);
  });

  await t.step(
    "round-trips with addressFromBytes, preserving the width",
    () => {
      const v4 = new Uint8Array([198, 51, 100, 42]);
      assertEquals(addressToBytes(addressFromBytes(v4)), v4);

      // deno-fmt-ignore
      const mapped = new Uint8Array([
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0xff, 0xff, 192, 168, 1, 1,
    ]);
      assertEquals(addressToBytes(addressFromBytes(mapped)), mapped);
    },
  );
});
