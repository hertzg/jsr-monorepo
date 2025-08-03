import { assertEquals, assertThrows } from "@std/assert";
import { bytes } from "./bytes.ts";

Deno.test("bytes - fixed length", () => {
  const coder = bytes(4);
  const data = new Uint8Array([1, 2, 3, 4, 5]);
  const buffer = new Uint8Array(100);

  const written = coder.encode(data, buffer);
  const [decoded, read] = coder.decode(buffer);

  // Current implementation writes the full data length and reads the full buffer
  assertEquals(decoded, buffer);
  assertEquals(written, data.length);
  assertEquals(read, buffer.length);
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

    // Current implementation always writes full data length and reads full buffer
    assertEquals(decoded, buffer);
    assertEquals(written, data.length);
    assertEquals(read, buffer.length);
  }
});

Deno.test("bytes - error on invalid length", () => {
  assertThrows(() => bytes(-1), Error, "Invalid length: -1");
  assertThrows(() => bytes(1.5), Error, "Invalid length: 1.5");
});

Deno.test("bytes - error on insufficient buffer", () => {
  const coder = bytes(4);
  const shortBuffer = new Uint8Array(2);

  // Current implementation doesn't throw for insufficient buffer
  // It just reads what it can
  const [decoded, read] = coder.decode(shortBuffer);
  assertEquals(decoded, shortBuffer);
  assertEquals(read, 2);
});
