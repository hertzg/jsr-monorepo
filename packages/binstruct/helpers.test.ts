import { assertEquals, assertThrows } from "@std/assert";
import {
  array,
  bytes,
  createContext,
  decode,
  encode,
  struct,
  u16le,
  u32le,
  u8le,
} from "./mod.ts";

Deno.test("encode - auto-allocation small data", () => {
  const coder = struct({ id: u16le(), flag: u8le() });
  const data = { id: 42, flag: 7 };

  const encoded = encode(coder, data);
  assertEquals(encoded.length, 3);
});

Deno.test("encode - provided target buffer", () => {
  const coder = struct({ value: u32le() });
  const data = { value: 12345 };
  const buffer = new Uint8Array(100);

  const encoded = encode(coder, data, undefined, buffer);
  assertEquals(encoded.length, 4);
  assertEquals(encoded.buffer, buffer.buffer);
});

Deno.test("encode - large data requiring growth", async (t) => {
  await t.step("array with 10000 elements", () => {
    const coder = struct({
      data: array(u8le(), u16le()),
    });
    const largeArray = new Array(10000).fill(42);
    const data = { data: largeArray };

    const encoded = encode(coder, data);
    assertEquals(encoded.length, 10002); // 2 bytes length + 10000 bytes data
  });

  await t.step("very large array requiring multiple growth cycles", () => {
    const coder = struct({
      data: array(u8le(), u32le()),
    });
    const largeArray = new Array(50000).fill(42);
    const data = { data: largeArray };

    const encoded = encode(coder, data);
    assertEquals(encoded.length, 50004); // 4 bytes length + 50000 bytes data
  });
});

Deno.test("encode - context handling", async (t) => {
  await t.step("provided context", () => {
    const coder = struct({ value: u16le() });
    const data = { value: 42 };
    const context = createContext("encode");

    const encoded = encode(coder, data, context);
    assertEquals(encoded.length, 2);
  });

  await t.step("auto-created context", () => {
    const coder = struct({ value: u16le() });
    const data = { value: 42 };

    const encoded = encode(coder, data);
    assertEquals(encoded.length, 2);
  });
});

Deno.test("encode - error handling", async (t) => {
  await t.step("buffer too small", () => {
    const coder = struct({ value: u32le() });
    const data = { value: 12345 };
    const smallBuffer = new Uint8Array(2); // Too small for u32le

    assertThrows(() => {
      encode(coder, data, undefined, smallBuffer);
    }, RangeError);
  });
});

Deno.test("decode - basic decoding", () => {
  const coder = struct({ id: u16le(), flag: u8le() });
  const buffer = new Uint8Array([42, 0, 7]); // Little-endian: id=42, flag=7

  const decoded = decode(coder, buffer);
  assertEquals(decoded.id, 42);
  assertEquals(decoded.flag, 7);
});

Deno.test("decode - multiple values from buffer", () => {
  const coder = struct({ value: u16le() });

  // Create a buffer with multiple encoded values
  const value1 = encode(coder, { value: 100 });
  const value2 = encode(coder, { value: 200 });
  const combinedBuffer = new Uint8Array(value1.length + value2.length);
  combinedBuffer.set(value1, 0);
  combinedBuffer.set(value2, value1.length);

  // Decode first value
  const decoded1 = decode(coder, combinedBuffer);
  assertEquals(decoded1.value, 100);

  // Decode second value from remaining buffer (need to know size)
  const remaining = combinedBuffer.subarray(2); // Skip first 2 bytes
  const decoded2 = decode(coder, remaining);
  assertEquals(decoded2.value, 200);
});

Deno.test("decode - context handling", async (t) => {
  await t.step("provided context", () => {
    const coder = struct({ value: u32le() });
    const buffer = new Uint8Array([42, 0, 0, 0]); // Little-endian: value=42
    const context = createContext("decode");

    const decoded = decode(coder, buffer, context);
    assertEquals(decoded.value, 42);
  });

  await t.step("auto-created context", () => {
    const coder = struct({ value: u32le() });
    const buffer = new Uint8Array([42, 0, 0, 0]); // Little-endian: value=42

    const decoded = decode(coder, buffer);
    assertEquals(decoded.value, 42);
  });
});

Deno.test("round-trip integrity", async (t) => {
  await t.step("simple struct", () => {
    const coder = struct({
      id: u16le(),
      name: bytes(10),
      active: u8le(),
    });

    const originalData = {
      id: 1001,
      name: new Uint8Array([116, 101, 115, 116, 0, 0, 0, 0, 0, 0]), // "test" + padding
      active: 1,
    };

    // Encode
    const encoded = encode(coder, originalData);
    assertEquals(encoded.length, 13); // 2 + 10 + 1

    // Decode
    const decodedData = decode(coder, encoded);

    assertEquals(decodedData.id, originalData.id);
    assertEquals(decodedData.name, originalData.name);
    assertEquals(decodedData.active, originalData.active);
  });

  await t.step("complex nested structure", () => {
    const innerCoder = struct({
      x: u16le(),
      y: u16le(),
    });

    const outerCoder = struct({
      id: u32le(),
      points: array(innerCoder, u16le()),
      metadata: bytes(5),
    });

    const originalData = {
      id: 12345,
      points: [
        { x: 100, y: 200 },
        { x: 300, y: 400 },
        { x: 500, y: 600 },
      ],
      metadata: new Uint8Array([1, 2, 3, 4, 5]),
    };

    // Encode
    const encoded = encode(outerCoder, originalData);

    // Decode
    const decodedData = decode(outerCoder, encoded);

    assertEquals(decodedData.id, originalData.id);
    assertEquals(decodedData.points.length, originalData.points.length);
    assertEquals(decodedData.points[0].x, originalData.points[0].x);
    assertEquals(decodedData.points[0].y, originalData.points[0].y);
    assertEquals(decodedData.points[1].x, originalData.points[1].x);
    assertEquals(decodedData.points[1].y, originalData.points[1].y);
    assertEquals(decodedData.points[2].x, originalData.points[2].x);
    assertEquals(decodedData.points[2].y, originalData.points[2].y);
    assertEquals(decodedData.metadata, originalData.metadata);
  });
});

Deno.test("edge cases", async (t) => {
  await t.step("empty data", () => {
    const coder = struct({});
    const data = {};

    const encoded = encode(coder, data);
    assertEquals(encoded.length, 0);

    const decoded = decode(coder, encoded);
    assertEquals(decoded, {});
  });

  await t.step("single byte", () => {
    const coder = u8le();
    const data = 42;

    const encoded = encode(coder, data);
    assertEquals(encoded.length, 1);
    assertEquals(encoded[0], 42);

    const decoded = decode(coder, encoded);
    assertEquals(decoded, 42);
  });

  await t.step("zero values", () => {
    const coder = struct({
      a: u16le(),
      b: u32le(),
      c: u8le(),
    });
    const data = { a: 0, b: 0, c: 0 };

    const encoded = encode(coder, data);
    assertEquals(encoded.length, 7);

    const decoded = decode(coder, encoded);
    assertEquals(decoded.a, 0);
    assertEquals(decoded.b, 0);
    assertEquals(decoded.c, 0);
  });
});

Deno.test("buffer growth strategy", async (t) => {
  await t.step("small data uses initial buffer", () => {
    const coder = struct({ value: u8le() });
    const data = { value: 42 };

    const encoded = encode(coder, data);
    assertEquals(encoded.length, 1);
  });

  await t.step("medium data triggers growth", () => {
    const coder = struct({
      data: array(u8le(), u16le()),
    });
    const mediumArray = new Array(2000).fill(42);
    const data = { data: mediumArray };

    const encoded = encode(coder, data);
    assertEquals(encoded.length, 2002); // 2 bytes length + 2000 bytes data
  });

  await t.step("large data uses chunked growth", () => {
    const coder = struct({
      data: array(u8le(), u32le()),
    });
    const largeArray = new Array(100000).fill(42);
    const data = { data: largeArray };

    const encoded = encode(coder, data);
    assertEquals(encoded.length, 100004); // 4 bytes length + 100000 bytes data
  });
});
