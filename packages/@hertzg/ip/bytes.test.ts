import { assertEquals, assertThrows } from "@std/assert";
import { ipFromBytes, ipToBytes } from "./bytes.ts";
import { ipv4From64Mapped } from "./4to6.ts";
import { parseIpv4 } from "./ipv4.ts";
import { parseIpv6 } from "./ipv6.ts";

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

  await t.step("a subarray of the exact width reads through", () => {
    const packet = new Uint8Array(20);
    packet.set([203, 0, 113, 7], 16);

    // The same four bytes: sliced to 4 they read as IPv4, sliced to 16 they
    // read as the low end of an IPv6 address. The slice states which.
    assertEquals(ipFromBytes(packet.subarray(16, 20)), 3405803783);
    assertEquals(ipFromBytes(packet.subarray(4, 20)), 3405803783n);
  });

  await t.step("a length that is neither 4 nor 16 throws", () => {
    assertThrows(
      () => ipFromBytes(new Uint8Array([1, 2, 3])),
      RangeError,
      "IP address must be exactly 4 or 16 bytes, got 3",
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
        "got 20",
      );
      assertThrows(
        () => ipFromBytes(new Uint8Array(60)),
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

      assertEquals(ipFromBytes(packet.subarray(12, 16)), 167772161);
    }
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
    ipToBytes(parseIpv4("10.0.0.1"), frame, 0);
    ipToBytes(parseIpv6("2001:db8::1"), frame, 8);

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
