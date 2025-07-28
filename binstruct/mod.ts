/**
 * Binary structure encoding/decoding utilities for TypeScript.
 *
 * This module provides a type-safe way to encode and decode binary data structures.
 * It supports various data types including numbers, strings, arrays, and complex structs.
 *
 * @example
 * ```ts
 * import { assertEquals } from "jsr:@std/assert";
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
 *   timestamp: 1704067200, // Fixed timestamp for reproducible example
 * };
 *
 * // Encode to binary
 * const buffer = new Uint8Array(1024);
 * const bytesWritten = packetCoder.encode(packet, buffer);
 *
 * // Decode from binary
 * const [decoded, bytesRead] = packetCoder.decode(buffer);
 * assertEquals(decoded, packet); // Same as original packet
 * ```
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
