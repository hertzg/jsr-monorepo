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

Deno.test("encode - grows the target buffer to fit the payload", async (t) => {
  // How many times the grow-and-retry loop runs is driven by `initialSize`,
  // not by payload size — a one-byte initial buffer walks more of the loop
  // than a huge payload does against the 4KB default, at a fraction of the
  // cost. The large-payload step below is here to prove real-scale encoding,
  // not to reach the growth path.
  await t.step("fits within the initial buffer without growing", () => {
    const coder = struct({ data: array(u8le(), u16le()) });

    const encoded = encode(coder, { data: new Array(100).fill(42) });
    assertEquals(encoded.length, 102); // 2 bytes length + 100 bytes data
  });

  await t.step("grows repeatedly from a one-byte initial buffer", () => {
    const coder = struct({ data: array(u8le(), u16le()) });

    const encoded = encode(
      coder,
      { data: new Array(100).fill(42) },
      undefined,
      undefined,
      { initialSize: 1 },
    );
    assertEquals(encoded.length, 102); // 2 bytes length + 100 bytes data
  });

  await t.step("grows past a 4-byte length prefix", () => {
    const coder = struct({ data: array(u8le(), u32le()) });

    const encoded = encode(
      coder,
      { data: new Array(100).fill(42) },
      undefined,
      undefined,
      { initialSize: 1 },
    );
    assertEquals(encoded.length, 104); // 4 bytes length + 100 bytes data
  });

  await t.step("encodes a payload larger than the default initial size", () => {
    const coder = struct({ data: array(u8le(), u16le()) });

    const encoded = encode(coder, { data: new Array(10000).fill(42) });
    assertEquals(encoded.length, 10002); // 2 bytes length + 10000 bytes data
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

    assertEquals(decodedData, originalData);
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

    assertEquals(decodedData, originalData);
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
    assertEquals(decoded, data);
  });
});
