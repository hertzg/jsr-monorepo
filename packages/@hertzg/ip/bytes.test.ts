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
