/**
 * Helper functions for simplified binary encoding and decoding operations.
 *
 * This module provides convenient wrapper functions that abstract away buffer
 * management complexities, making it easier to encode and decode binary data
 * without manually handling buffer allocation and sizing.
 *
 * The helper functions automatically manage buffer allocation using resizable
 * ArrayBuffers with exponential growth strategies, following best practices
 * for efficient memory usage and performance. Buffers start at 4KB and grow
 * by 2x when needed, up to a maximum of 400MB by default.
 *
 * @example Basic encoding and decoding
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { encode, decode, struct, u16le, u8le } from "@hertzg/binstruct";
 *
 * const coder = struct({ id: u16le(), flag: u8le() });
 * const data = { id: 42, flag: 7 };
 *
 * // Encode without providing a buffer - auto-allocates
 * const encoded = encode(coder, data);
 * assertEquals(encoded.length, 3);
 *
 * // Decode and get the decoded data
 * const decodedData = decode(coder, encoded);
 * assertEquals(decodedData.id, 42);
 * assertEquals(decodedData.flag, 7);
 * ```
 *
 * @example Using provided target buffer
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { encode, decode, struct, u32le } from "@hertzg/binstruct";
 *
 * const coder = struct({ value: u32le() });
 * const data = { value: 12345 };
 * const buffer = new Uint8Array(100);
 *
 * // Encode to provided buffer
 * const encoded = encode(coder, data, undefined, buffer);
 * assertEquals(encoded.length, 4);
 * assertEquals(encoded.buffer, buffer.buffer);
 *
 * // Decode from buffer
 * const decodedData = decode(coder, encoded);
 * assertEquals(decodedData.value, 12345);
 * ```
 *
 * @example Round-trip encoding and decoding
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { encode, decode, struct, u16le, u8le, string } from "@hertzg/binstruct";
 *
 * const coder = struct({
 *   id: u16le(),
 *   name: string(u16le()), // Length-prefixed string
 *   active: u8le(),
 * });
 *
 * const originalData = { id: 1001, name: "test", active: 1 };
 *
 * // Encode
 * const encoded = encode(coder, originalData);
 * assertEquals(encoded.length, 9); // 2 (id) + 2 (name length) + 4 (name bytes) + 1 (active)
 *
 * // Decode
 * const decodedData = decode(coder, encoded);
 *
 * assertEquals(decodedData.id, originalData.id);
 * assertEquals(decodedData.name, originalData.name);
 * assertEquals(decodedData.active, originalData.active);
 * ```
 *
 * @example Using custom context
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { encode, decode, createContext, struct, u16le } from "@hertzg/binstruct";
 *
 * const coder = struct({ value: u16le() });
 * const data = { value: 42 };
 * const context = createContext("encode");
 *
 * const encoded = encode(coder, data, context);
 * assertEquals(encoded.length, 2);
 *
 * const decodeContext = createContext("decode");
 * const decodedData = decode(coder, encoded, decodeContext);
 * assertEquals(decodedData.value, 42);
 * ```
 *
 * @module
 */

import { autoGrowBuffer, type AutogrowOptions } from "./buffer.ts";
import { type Coder, type Context, createContext } from "./core.ts";

/**
 * Encodes data using the provided coder, handling buffer allocation automatically.
 *
 * When no target buffer is provided, this function automatically allocates
 * a resizable buffer using exponential growth strategy. The buffer starts
 * at 4KB and grows by 2x when needed, up to a maximum of 400MB. This approach
 * minimizes memory waste while ensuring efficient encoding.
 *
 * @template T - The type of data to encode
 * @param coder - The coder to use for encoding
 * @param data - The data to encode
 * @param context - Optional context for encoding (defaults to encode context)
 * @param target - Optional target buffer to encode into
 * @param autogrowOptions - Optional configuration for buffer growth behavior
 * @returns A Uint8Array containing the encoded data
 *
 * @example Auto-allocation for small data
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { encode, struct, u16le, u8le } from "@hertzg/binstruct";
 *
 * const coder = struct({ id: u16le(), flag: u8le() });
 * const data = { id: 42, flag: 7 };
 *
 * const encoded = encode(coder, data);
 * assertEquals(encoded.length, 3);
 * ```
 *
 * @example Using provided target buffer
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { encode, struct, u32le } from "@hertzg/binstruct";
 *
 * const coder = struct({ value: u32le() });
 * const data = { value: 12345 };
 * const buffer = new Uint8Array(100);
 *
 * const encoded = encode(coder, data, undefined, buffer);
 * assertEquals(encoded.length, 4);
 * assertEquals(encoded.buffer, buffer.buffer);
 * ```
 *
 * @example Large data requiring buffer growth
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { encode, struct, array, u8le, u16le } from "@hertzg/binstruct";
 *
 * const coder = struct({
 *   data: array(u8le(), u16le())
 * });
 * const largeArray = new Array(10000).fill(42);
 * const data = { data: largeArray };
 *
 * const encoded = encode(coder, data);
 * assertEquals(encoded.length, 10002); // 2 bytes length + 10000 bytes data
 * ```
 *
 * @example Custom buffer growth configuration
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { encode, struct, array, u8le, u16le } from "@hertzg/binstruct";
 *
 * const coder = struct({
 *   data: array(u8le(), u16le())
 * });
 * const largeArray = new Array(50000).fill(42);
 * const data = { data: largeArray };
 *
 * // Use custom buffer growth settings
 * const encoded = encode(coder, data, undefined, undefined, {
 *   initialSize: 8192,    // Start with 8KB
 *   maxByteLength: 1024 * 1024 * 200, // Max 200MB
 *   growthFactor: 1.5,    // Grow by 1.5x each time
 * });
 * assertEquals(encoded.length, 50002); // 2 bytes length + 50000 bytes data
 * ```
 */
export function encode<T>(
  coder: Coder<T>,
  data: T,
  context?: Context,
  target?: Uint8Array,
  autogrowOptions: AutogrowOptions = {},
): Uint8Array {
  const ctx = context ?? createContext("encode");

  if (target) {
    const bytesWritten = coder.encode(data, target, ctx);
    return target.subarray(0, bytesWritten);
  }

  const buffer = autoGrowBuffer((buffer) => {
    const bytesWritten = coder.encode(data, buffer, ctx);
    return buffer.subarray(0, bytesWritten);
  }, autogrowOptions);

  return buffer;
}

/**
 * Decodes data using the provided coder, returning the decoded value.
 *
 * This function decodes data from the provided buffer and returns only the
 * decoded value, making it simple to use when you don't need to know how many
 * bytes were consumed during decoding.
 *
 * @template T - The type of data to decode
 * @param coder - The coder to use for decoding
 * @param buffer - The buffer containing encoded data
 * @param context - Optional context for decoding (defaults to decode context)
 * @returns The decoded value
 *
 * @example Basic decoding
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { decode, struct, u16le, u8le } from "@hertzg/binstruct";
 *
 * const coder = struct({ id: u16le(), flag: u8le() });
 * const buffer = new Uint8Array([42, 0, 7]); // Little-endian: id=42, flag=7
 *
 * const decodedData = decode(coder, buffer);
 * assertEquals(decodedData.id, 42);
 * assertEquals(decodedData.flag, 7);
 * ```
 *
 * @example Processing multiple values from a buffer
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { decode, encode, struct, u16le } from "@hertzg/binstruct";
 *
 * const coder = struct({ value: u16le() });
 *
 * // Create a buffer with multiple encoded values
 * const value1 = encode(coder, { value: 100 });
 * const value2 = encode(coder, { value: 200 });
 * const combinedBuffer = new Uint8Array(value1.length + value2.length);
 * combinedBuffer.set(value1, 0);
 * combinedBuffer.set(value2, value1.length);
 *
 * // Decode first value
 * const decoded1 = decode(coder, combinedBuffer);
 * assertEquals(decoded1.value, 100);
 *
 * // Decode second value from remaining buffer (need to know size)
 * const remaining = combinedBuffer.subarray(2); // Skip first 2 bytes
 * const decoded2 = decode(coder, remaining);
 * assertEquals(decoded2.value, 200);
 * ```
 *
 * @example Using custom context
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { decode, createContext, struct, u32le } from "@hertzg/binstruct";
 *
 * const coder = struct({ value: u32le() });
 * const buffer = new Uint8Array([42, 0, 0, 0]); // Little-endian: value=42
 * const context = createContext("decode");
 *
 * const decodedData = decode(coder, buffer, context);
 * assertEquals(decodedData.value, 42);
 * ```
 */
export function decode<T>(
  coder: Coder<T>,
  buffer: Uint8Array,
  context?: Context,
): T {
  const ctx = context ?? createContext("decode");
  const [value] = coder.decode(buffer, ctx);
  return value;
}
