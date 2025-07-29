/**
 * A module providing type-safe binary structure encoding and decoding utilities for TypeScript.
 *
 * The following data types are supported:
 * - Unsigned integers: 8, 16, 32, 64 bits (big-endian and little-endian)
 * - Signed integers: 8, 16, 32, 64 bits (big-endian and little-endian)
 * - Floating point numbers: 16, 32, 64 bits (big-endian and little-endian)
 * - Strings: length-prefixed and null-terminated
 * - Arrays: variable-length arrays with configurable length encoding
 * - Structs: complex nested data structures
 *
 * To encode data to binary, use the various coder functions and call their `encode` method.
 * To decode data from binary, use the same coder functions and call their `decode` method.
 *
 * The module provides the following main functions:
 * - {@link struct}: Create coders for structured data
 * - {@link stringLP}: Create coders for length-prefixed strings
 * - {@link stringNT}: Create coders for null-terminated strings
 * - {@link arrayOf}: Create coders for arrays
 * - Numeric coders: `u8`, `u16`, `u32`, `u64`, `s8`, `s16`, `s32`, `s64`, `f16`, `f32`, `f64`
 *
 * @example Reading and writing structured data:
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { struct } from "@hertzg/binstruct/struct";
 * import { stringLP, stringNT } from "@hertzg/binstruct/string";
 * import { arrayOf } from "@hertzg/binstruct/array";
 * import { u32be, u16be, u8be } from "@hertzg/binstruct/numeric";
 *
 * // Define a network packet structure
 * const packetCoder = struct({
 *   version: u8be,
 *   packetId: u32be,
 *   sender: stringLP(u16be),
 *   recipients: arrayOf(stringNT(), u8be),
 *   message: stringLP(u32be),
 *   timestamp: u32be,
 * });
 *
 * // Create a packet
 * const packet = {
 *   version: 1,
 *   packetId: 12345,
 *   sender: "alice@example.com",
 *   recipients: ["bob@example.com", "charlie@example.com"],
 *   message: "Hello, სამყარო! 🌍",
 *   timestamp: 1704067200,
 * };
 *
 * // Encode to binary
 * const buffer = new Uint8Array(1024);
 * const bytesWritten = packetCoder.encode(packet, buffer);
 *
 * // Decode from binary
 * const [decoded, bytesRead] = packetCoder.decode(buffer);
 * assertEquals(decoded, packet, 'packet should be identical after roundtrip');
 * assertEquals(bytesWritten, bytesRead, 'bytes written should equal bytes read');
 * ```
 * @module
 */

export type ValueWithBytes<T> = [T, number];

export type Encoder<TDecoded> = (
  decoded: TDecoded,
  target: Uint8Array,
) => number;
export type Decoder<TDecoded> = (
  encoded: Uint8Array,
) => ValueWithBytes<TDecoded>;

export type Coder<TDecoded> = {
  encode: Encoder<TDecoded>;
  decode: Decoder<TDecoded>;
};

export * from "./array.ts";
export * from "./numeric.ts";
export * from "./string.ts";
export * from "./struct.ts";
