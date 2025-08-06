import { assertEquals, assertThrows } from "@std/assert";
import { bytes } from "./bytes.ts";

Deno.test("bytes - fixed length", () => {
  const coder = bytes(4);
  const data = new Uint8Array([1, 2, 3, 4, 5]);
  const buffer = new Uint8Array(100);

  const written = coder.encode(data, buffer);
  const [decoded, read] = coder.decode(buffer);

  // Should truncate to the specified length
  assertEquals(Array.from(decoded), [1, 2, 3, 4]);
  assertEquals(written, 4);
  assertEquals(read, 4);
});

Deno.test("bytes - variable length", () => {
  const coder = bytes();
  const data = new Uint8Array([1, 2, 3, 4, 5]);
  const buffer = new Uint8Array(100);

  const written = coder.encode(data, buffer);
  const [decoded, read] = coder.decode(buffer);

  // For variable length, should read/write the entire buffer
  assertEquals(decoded, buffer);
  assertEquals(written, data.length);
  assertEquals(read, buffer.length);
});

Deno.test("bytes - different lengths", () => {
  const lengths = [0, 1, 8, 16, 32];

  for (const length of lengths) {
    const coder = bytes(length);
    const data = new Uint8Array(Math.max(length, 4));
    for (let i = 0; i < data.length; i++) {
      data[i] = i % 256;
    }

    const buffer = new Uint8Array(100);
    const written = coder.encode(data, buffer);
    const [decoded, read] = coder.decode(buffer);

    // Should decode only the specified length, and match the first `length` bytes of data
    assertEquals(Array.from(decoded), Array.from(data.subarray(0, length)));
    assertEquals(written, length);
    assertEquals(read, length);
  }
});

Deno.test("bytes - error on invalid length", () => {
  assertThrows(() => bytes(-1), Error, "Invalid length: -1");
  assertThrows(() => bytes(1.5), Error, "Invalid length: 1.5");
});

Deno.test("bytes - error on insufficient buffer", () => {
  const coder = bytes(4);
  const shortBuffer = new Uint8Array([1, 2]); // Only 2 bytes

  // Should throw for insufficient buffer
  assertThrows(() => coder.decode(shortBuffer), Error, "Need 4 bytes, got 2");
});
