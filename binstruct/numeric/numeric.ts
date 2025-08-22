/**
 * Numeric data encoding and decoding utilities for binary structures.
 *
 * This module provides comprehensive support for encoding and decoding numeric values
 * in binary format with configurable endianness. It includes:
 *
 * - **Integer Types**: 8, 16, 32, and 64-bit signed and unsigned integers
 * - **Floating Point**: 16, 32, and 64-bit floating point numbers
 * - **Endianness Support**: Both big-endian (network byte order) and little-endian
 * - **Type Safety**: Full TypeScript support with proper type inference
 * - **Performance**: Optimized using native DataView methods
 *
 * All numeric coders follow the same interface pattern and can be used interchangeably
 * in struct definitions, arrays, and other binary structures.
 *
 * It's the user's responsibility to provide a buffer big enough to fit the whole data.
 *
 * @example Basic numeric encoding and decoding:
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { u16le, s32be, f64le } from "@hertzg/binstruct/numeric";
 * import { struct } from "@hertzg/binstruct/struct";
 *
 * // Create a simple numeric structure
 * const numericStruct = struct({
 *   smallNumber: u16le(),      // 16-bit unsigned, little-endian
 *   signedNumber: s32be(),     // 32-bit signed, big-endian
 *   floatNumber: f64le(),      // 64-bit float, little-endian
 * });
 *
 * // Test data
 * const testData = {
 *   smallNumber: 12345,        // Fits in 16-bit unsigned (0-65535)
 *   signedNumber: -1000000,    // 32-bit signed range
 *   floatNumber: 3.14159,      // Pi approximation
 * };
 *
 * // Encode to binary
 * const buffer = new Uint8Array(100);
 * const bytesWritten = numericStruct.encode(testData, buffer);
 *
 * // Decode from binary
 * const [decoded, bytesRead] = numericStruct.decode(buffer);
 *
 * // Verify the results
 * assertEquals(decoded.smallNumber, testData.smallNumber);
 * assertEquals(decoded.signedNumber, testData.signedNumber);
 * assertEquals(decoded.floatNumber, testData.floatNumber);
 * assertEquals(bytesWritten, bytesRead);
 * ```
 *
 * @example Network protocol with mixed endianness:
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { u16be, u32le, u64be } from "@hertzg/binstruct/numeric";
 * import { struct } from "@hertzg/binstruct/struct";
 *
 * // Network packet header with mixed endianness
 * const packetHeader = struct({
 *   magic: u32le(),            // Magic number (little-endian)
 *   version: u16be(),          // Protocol version (big-endian, network order)
 *   flags: u16be(),            // Control flags (big-endian)
 *   timestamp: u64be(),        // Timestamp (big-endian)
 *   payloadSize: u32le(),      // Payload size (little-endian)
 * });
 *
 * const testPacket = {
 *   magic: 0x12345678,
 *   version: 1,
 *   flags: 0x8000,
 *   timestamp: 1234567890n,
 *   payloadSize: 1024,
 * };
 *
 * const buffer = new Uint8Array(100);
 * const bytesWritten = packetHeader.encode(testPacket, buffer);
 * const [decoded, bytesRead] = packetHeader.decode(buffer);
 *
 * assertEquals(decoded.magic, testPacket.magic);
 * assertEquals(decoded.version, testPacket.version);
 * assertEquals(decoded.flags, testPacket.flags);
 * assertEquals(decoded.timestamp, testPacket.timestamp);
 * assertEquals(decoded.payloadSize, testPacket.payloadSize);
 * assertEquals(bytesWritten, bytesRead);
 * ```
 *
 * @module
 */

/**
 * Endianness type for numeric data encoding and decoding.
 *
 * This type defines the byte order used when encoding/decoding multi-byte numeric values.
 * - "be": Big-endian (network byte order, most significant byte first)
 * - "le": Little-endian (least significant byte first)
 */
export type Endianness = "be" | "le";

// deno-fmt-ignore
export { u8, u16, u32, u64, u8be, u16be, u32be, u64be, u8le, u16le, u32le, u64le } from "./unsigned.ts";

// deno-fmt-ignore
export { s8, s16, s32, s64, s8be, s16be, s32be, s64be, s8le, s16le, s32le, s64le } from "./signed.ts";

// deno-fmt-ignore
export { f16, f32, f64, f16be, f32be, f64be, f16le, f32le, f64le } from "./floats.ts";
