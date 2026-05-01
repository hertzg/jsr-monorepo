import { assertEquals, assertThrows } from "@std/assert";
import { decodeLength, encodeLength } from "./length.ts";

Deno.test("encodeLength - 1 byte (0-127)", () => {
  assertEquals(encodeLength(0), new Uint8Array([0x00]));
  assertEquals(encodeLength(1), new Uint8Array([0x01]));
  assertEquals(encodeLength(127), new Uint8Array([0x7F]));
});

Deno.test("encodeLength - 2 bytes (128-16383)", () => {
  assertEquals(encodeLength(128), new Uint8Array([0x80, 0x80]));
  assertEquals(encodeLength(255), new Uint8Array([0x80, 0xFF]));
  assertEquals(encodeLength(256), new Uint8Array([0x81, 0x00]));
  assertEquals(encodeLength(16383), new Uint8Array([0xBF, 0xFF]));
});

Deno.test("encodeLength - 3 bytes (16384-2097151)", () => {
  assertEquals(encodeLength(16384), new Uint8Array([0xC0, 0x40, 0x00]));
  assertEquals(encodeLength(65535), new Uint8Array([0xC0, 0xFF, 0xFF]));
  assertEquals(encodeLength(2097151), new Uint8Array([0xDF, 0xFF, 0xFF]));
});

Deno.test("encodeLength - 4 bytes (2097152-268435455)", () => {
  assertEquals(encodeLength(2097152), new Uint8Array([0xE0, 0x20, 0x00, 0x00]));
  assertEquals(
    encodeLength(16777215),
    new Uint8Array([0xE0, 0xFF, 0xFF, 0xFF]),
  );
  assertEquals(
    encodeLength(268435455),
    new Uint8Array([0xEF, 0xFF, 0xFF, 0xFF]),
  );
});

Deno.test("encodeLength - 5 bytes (268435456+)", () => {
  assertEquals(
    encodeLength(268435456),
    new Uint8Array([0xF0, 0x10, 0x00, 0x00, 0x00]),
  );
  assertEquals(
    encodeLength(0x7FFFFFFFF),
    new Uint8Array([0xF7, 0xFF, 0xFF, 0xFF, 0xFF]),
  );
});

Deno.test("encodeLength - negative throws", () => {
  assertThrows(() => encodeLength(-1), RangeError, "must be non-negative");
});

Deno.test("encodeLength - exceeds max throws", () => {
  assertThrows(
    () => encodeLength(0x800000000),
    RangeError,
    "exceeds maximum",
  );
});

Deno.test("decodeLength - 1 byte (0-127)", () => {
  assertEquals(decodeLength(new Uint8Array([0x00])), {
    length: 0,
    bytesRead: 1,
  });
  assertEquals(decodeLength(new Uint8Array([0x01])), {
    length: 1,
    bytesRead: 1,
  });
  assertEquals(decodeLength(new Uint8Array([0x7F])), {
    length: 127,
    bytesRead: 1,
  });
});

Deno.test("decodeLength - 2 bytes (128-16383)", () => {
  assertEquals(decodeLength(new Uint8Array([0x80, 0x80])), {
    length: 128,
    bytesRead: 2,
  });
  assertEquals(decodeLength(new Uint8Array([0x80, 0xFF])), {
    length: 255,
    bytesRead: 2,
  });
  assertEquals(decodeLength(new Uint8Array([0x81, 0x00])), {
    length: 256,
    bytesRead: 2,
  });
  assertEquals(decodeLength(new Uint8Array([0xBF, 0xFF])), {
    length: 16383,
    bytesRead: 2,
  });
});

Deno.test("decodeLength - 3 bytes (16384-2097151)", () => {
  assertEquals(decodeLength(new Uint8Array([0xC0, 0x40, 0x00])), {
    length: 16384,
    bytesRead: 3,
  });
  assertEquals(decodeLength(new Uint8Array([0xC0, 0xFF, 0xFF])), {
    length: 65535,
    bytesRead: 3,
  });
  assertEquals(decodeLength(new Uint8Array([0xDF, 0xFF, 0xFF])), {
    length: 2097151,
    bytesRead: 3,
  });
});

Deno.test("decodeLength - 4 bytes (2097152-268435455)", () => {
  assertEquals(decodeLength(new Uint8Array([0xE0, 0x20, 0x00, 0x00])), {
    length: 2097152,
    bytesRead: 4,
  });
  assertEquals(decodeLength(new Uint8Array([0xE0, 0xFF, 0xFF, 0xFF])), {
    length: 16777215,
    bytesRead: 4,
  });
  assertEquals(decodeLength(new Uint8Array([0xEF, 0xFF, 0xFF, 0xFF])), {
    length: 268435455,
    bytesRead: 4,
  });
});

Deno.test("decodeLength - 5 bytes (268435456+)", () => {
  assertEquals(
    decodeLength(new Uint8Array([0xF0, 0x10, 0x00, 0x00, 0x00])),
    { length: 268435456, bytesRead: 5 },
  );
  assertEquals(
    decodeLength(new Uint8Array([0xF7, 0xFF, 0xFF, 0xFF, 0xFF])),
    { length: 0x7FFFFFFFF, bytesRead: 5 },
  );
});

Deno.test("decodeLength - with offset", () => {
  const bytes = new Uint8Array([0xFF, 0xFF, 0x7F, 0x00, 0x00]);
  assertEquals(decodeLength(bytes, { offset: 2 }), {
    length: 127,
    bytesRead: 1,
  });
});

Deno.test("decodeLength - incomplete encoding throws", () => {
  assertThrows(
    () => decodeLength(new Uint8Array([0x80])),
    RangeError,
    "Incomplete 2-byte",
  );
  assertThrows(
    () => decodeLength(new Uint8Array([0xC0, 0x00])),
    RangeError,
    "Incomplete 3-byte",
  );
  assertThrows(
    () => decodeLength(new Uint8Array([0xE0, 0x00, 0x00])),
    RangeError,
    "Incomplete 4-byte",
  );
  assertThrows(
    () => decodeLength(new Uint8Array([0xF0, 0x00, 0x00, 0x00])),
    RangeError,
    "Incomplete 5-byte",
  );
});

Deno.test("decodeLength - offset out of bounds throws", () => {
  assertThrows(
    () => decodeLength(new Uint8Array([0x01]), { offset: 5 }),
    RangeError,
    "out of bounds",
  );
});

Deno.test("encodeLength/decodeLength - roundtrip", () => {
  const testValues = [
    0,
    1,
    127,
    128,
    255,
    256,
    16383,
    16384,
    65535,
    2097151,
    2097152,
    16777215,
    268435455,
    268435456,
    0x7FFFFFFFF,
  ];

  for (const value of testValues) {
    const encoded = encodeLength(value);
    const decoded = decodeLength(encoded);
    assertEquals(decoded.length, value, `Failed for value ${value}`);
    assertEquals(decoded.bytesRead, encoded.length);
  }
});
