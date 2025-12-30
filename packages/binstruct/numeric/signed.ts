/**
 * Signed integer data encoding and decoding utilities for binary structures.
 *
 * This module provides comprehensive support for encoding and decoding signed integer values
 * in binary format with configurable endianness. It includes:
 *
 * - **8-bit signed integers**: Range -128 to 127
 * - **16-bit signed integers**: Range -32,768 to 32,767
 * - **32-bit signed integers**: Range -2,147,483,648 to 2,147,483,647
 * - **64-bit signed integers**: Range -9,223,372,036,854,775,808 to 9,223,372,036,854,775,807 (as bigint)
 * - **Endianness Support**: Both big-endian (network byte order) and little-endian
 * - **Type Safety**: Full TypeScript support with proper type inference
 * - **Performance**: Optimized using native DataView methods
 *
 * All signed integer coders follow the same interface pattern and can be used interchangeably
 * in struct definitions, arrays, and other binary structures.
 *
 * It's the user's responsibility to provide a buffer big enough to fit the whole data.
 *
 * @example Basic signed integer encoding and decoding:
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { s16le, s32be, s64le } from "@hertzg/binstruct/numeric";
 * import { struct } from "@hertzg/binstruct/struct";
 *
 * // Create a simple signed integer structure
 * const signedStruct = struct({
 *   smallNumber: s16le(),      // 16-bit signed, little-endian
 *   mediumNumber: s32be(),     // 32-bit signed, big-endian
 *   largeNumber: s64le(),      // 64-bit signed, little-endian
 * });
 *
 * // Test data
 * const testData = {
 *   smallNumber: -12345,       // Fits in 16-bit signed range
 *   mediumNumber: -1000000,    // 32-bit signed range
 *   largeNumber: -1234567890n, // 64-bit signed (bigint)
 * };
 *
 * // Encode to binary
 * const buffer = new Uint8Array(100);
 * const bytesWritten = signedStruct.encode(testData, buffer);
 *
 * // Decode from binary
 * const [decoded, bytesRead] = signedStruct.decode(buffer);
 *
 * // Verify the results
 * assertEquals(decoded.smallNumber, testData.smallNumber);
 * assertEquals(decoded.mediumNumber, testData.mediumNumber);
 * assertEquals(decoded.largeNumber, testData.largeNumber);
 * assertEquals(bytesWritten, bytesRead);
 * ```
 *
 * @example Audio processing with signed integers:
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { s16be, s32le } from "@hertzg/binstruct/numeric";
 * import { struct } from "@hertzg/binstruct/struct";
 *
 * // Audio sample structure with signed integers
 * const audioSample = struct({
 *   leftChannel: s16be(),      // Left audio channel (big-endian)
 *   rightChannel: s16be(),     // Right audio channel (big-endian)
 *   timestamp: s32le(),        // Sample timestamp (little-endian)
 *   volume: s16le(),           // Volume level (little-endian)
 * });
 *
 * const testSample = {
 *   leftChannel: -16384,       // Negative amplitude
 *   rightChannel: 16383,       // Positive amplitude
 *   timestamp: -1000000,       // Negative timestamp
 *   volume: -8192,             // Negative volume
 * };
 *
 * const buffer = new Uint8Array(100);
 * const bytesWritten = audioSample.encode(testSample, buffer);
 * const [decoded, bytesRead] = audioSample.decode(buffer);
 *
 * assertEquals(decoded.leftChannel, testSample.leftChannel);
 * assertEquals(decoded.rightChannel, testSample.rightChannel);
 * assertEquals(decoded.timestamp, testSample.timestamp);
 * assertEquals(decoded.volume, testSample.volume);
 * assertEquals(bytesWritten, bytesRead);
 * ```
 *
 * @module
 */

import type { Coder } from "../core.ts";
import { dataViewType } from "./dataview.ts";

// Symbol definitions for signed integer types
const kKindS8 = Symbol("s8");
const kKindS16BE = Symbol("s16be");
const kKindS16LE = Symbol("s16le");
const kKindS32BE = Symbol("s32be");
const kKindS32LE = Symbol("s32le");
const kKindS64BE = Symbol("s64be");
const kKindS64LE = Symbol("s64le");

/**
 * Creates a coder for 8-bit signed integers.
 *
 * This function creates a coder that can encode/decode 8-bit signed integers
 * (range -128 to 127). The endianness parameter determines the byte order used.
 *
 * @param endianness - The byte order to use ("be" for big-endian, "le" for little-endian), defaults to "be"
 * @returns A Coder<number> for 8-bit signed integers
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { s8 } from "@hertzg/binstruct/numeric";
 *
 * // Create big-endian and little-endian coders
 * const s8be = s8("be");
 * const s8le = s8("le");
 *
 * // Test data
 * const testValue = -128;
 *
 * // Encode and decode with big-endian
 * const bufferBE = new Uint8Array(1);
 * const bytesWrittenBE = s8be.encode(testValue, bufferBE);
 * const [decodedBE, bytesReadBE] = s8be.decode(bufferBE);
 *
 * assertEquals(decodedBE, testValue);
 * assertEquals(bytesWrittenBE, 1);
 * assertEquals(bytesReadBE, 1);
 *
 * // Encode and decode with little-endian
 * const bufferLE = new Uint8Array(1);
 * const bytesWrittenLE = s8le.encode(testValue, bufferLE);
 * const [decodedLE, bytesReadLE] = s8le.decode(bufferLE);
 *
 * assertEquals(decodedLE, testValue);
 * assertEquals(bytesWrittenLE, 1);
 * assertEquals(bytesReadLE, 1);
 * ```
 */
export function s8(endianness: "be" | "le" = "be"): Coder<number> {
  return dataViewType("Int8", endianness, kKindS8);
}

/**
 * Creates a coder for 16-bit signed integers.
 *
 * This function creates a coder that can encode/decode 16-bit signed integers
 * (range -32,768 to 32,767). The endianness parameter determines the byte order used.
 *
 * @param endianness - The byte order to use ("be" for big-endian, "le" for little-endian), defaults to "be"
 * @returns A Coder<number> for 16-bit signed integers
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { s16 } from "@hertzg/binstruct/numeric";
 *
 * // Create big-endian and little-endian coders
 * const s16be = s16("be");
 * const s16le = s16("le");
 *
 * // Test data
 * const testValue = -32768;
 *
 * // Encode and decode with big-endian
 * const bufferBE = new Uint8Array(2);
 * const bytesWrittenBE = s16be.encode(testValue, bufferBE);
 * const [decodedBE, bytesReadBE] = s16be.decode(bufferBE);
 *
 * assertEquals(decodedBE, testValue);
 * assertEquals(bytesWrittenBE, 2);
 * assertEquals(bytesReadBE, 2);
 *
 * // Encode and decode with little-endian
 * const bufferLE = new Uint8Array(2);
 * const bytesWrittenLE = s16le.encode(testValue, bufferLE);
 * const [decodedLE, bytesReadLE] = s16le.decode(bufferLE);
 *
 * assertEquals(decodedLE, testValue);
 * assertEquals(bytesWrittenLE, 2);
 * assertEquals(bytesReadLE, 2);
 * ```
 */
export function s16(endianness: "be" | "le" = "be"): Coder<number> {
  return dataViewType(
    "Int16",
    endianness,
    endianness === "be" ? kKindS16BE : kKindS16LE,
  );
}

/**
 * Creates a coder for 32-bit signed integers.
 *
 * This function creates a coder that can encode/decode 32-bit signed integers
 * (range -2,147,483,648 to 2,147,483,647). The endianness parameter determines the byte order used.
 *
 * @param endianness - The byte order to use ("be" for big-endian, "le" for little-endian), defaults to "be"
 * @returns A Coder<number> for 32-bit signed integers
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { s32 } from "@hertzg/binstruct/numeric";
 *
 * // Create big-endian and little-endian coders
 * const s32be = s32("be");
 * const s32le = s32("le");
 *
 * // Test data
 * const testValue = -2147483648;
 *
 * // Encode and decode with big-endian
 * const bufferBE = new Uint8Array(4);
 * const bytesWrittenBE = s32be.encode(testValue, bufferBE);
 * const [decodedBE, bytesReadBE] = s32be.decode(bufferBE);
 *
 * assertEquals(decodedBE, testValue);
 * assertEquals(bytesWrittenBE, 4);
 * assertEquals(bytesReadBE, 4);
 *
 * // Encode and decode with little-endian
 * const bufferLE = new Uint8Array(4);
 * const bytesWrittenLE = s32le.encode(testValue, bufferLE);
 * const [decodedLE, bytesReadLE] = s32le.decode(bufferLE);
 *
 * assertEquals(decodedLE, testValue);
 * assertEquals(bytesWrittenLE, 4);
 * assertEquals(bytesReadLE, 4);
 * ```
 */
export function s32(endianness: "be" | "le" = "be"): Coder<number> {
  return dataViewType(
    "Int32",
    endianness,
    endianness === "be" ? kKindS32BE : kKindS32LE,
  );
}

/**
 * Creates a coder for 64-bit signed integers.
 *
 * This function creates a coder that can encode/decode 64-bit signed integers
 * (range -9,223,372,036,854,775,808 to 9,223,372,036,854,775,807). The endianness parameter determines the byte order used.
 * Note that 64-bit integers are returned as bigint to handle the full range.
 *
 * @param endianness - The byte order to use ("be" for big-endian, "le" for little-endian), defaults to "be"
 * @returns A Coder<bigint> for 64-bit signed integers
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { s64 } from "@hertzg/binstruct/numeric";
 *
 * // Create big-endian and little-endian coders
 * const s64be = s64("be");
 * const s64le = s64("le");
 *
 * // Test data
 * const testValue = -9223372036854775808n;
 *
 * // Encode and decode with big-endian
 * const bufferBE = new Uint8Array(8);
 * const bytesWrittenBE = s64be.encode(testValue, bufferBE);
 * const [decodedBE, bytesReadBE] = s64be.decode(bufferBE);
 *
 * assertEquals(decodedBE, testValue);
 * assertEquals(bytesWrittenBE, 8);
 * assertEquals(bytesReadBE, 8);
 *
 * // Encode and decode with little-endian
 * const bufferLE = new Uint8Array(8);
 * const bytesWrittenLE = s64le.encode(testValue, bufferLE);
 * const [decodedLE, bytesReadLE] = s64le.decode(bufferLE);
 *
 * assertEquals(decodedLE, testValue);
 * assertEquals(bytesWrittenLE, 8);
 * assertEquals(bytesReadLE, 8);
 * ```
 */
export function s64(endianness: "be" | "le" = "be"): Coder<bigint> {
  return dataViewType(
    "BigInt64",
    endianness,
    endianness === "be" ? kKindS64BE : kKindS64LE,
  );
}

/**
 * Convenience function for 8-bit signed integer with big-endian byte order.
 * @see {@link s8} for implementation details and examples.
 */
export function s8be(): Coder<number> {
  return s8("be");
}

/**
 * Convenience function for 8-bit signed integer with little-endian byte order.
 * @see {@link s8} for implementation details and examples.
 */
export function s8le(): Coder<number> {
  return s8("le");
}

/**
 * Convenience function for 16-bit signed integer with big-endian byte order.
 * @see {@link s16} for implementation details and examples.
 */
export function s16be(): Coder<number> {
  return s16("be");
}

/**
 * Convenience function for 16-bit signed integer with little-endian byte order.
 * @see {@link s16} for implementation details and examples.
 */
export function s16le(): Coder<number> {
  return s16("le");
}

/**
 * Convenience function for 32-bit signed integer with big-endian byte order.
 * @see {@link s32} for implementation details and examples.
 */
export function s32be(): Coder<number> {
  return s32("be");
}

/**
 * Convenience function for 32-bit signed integer with little-endian byte order.
 * @see {@link s32} for implementation details and examples.
 */
export function s32le(): Coder<number> {
  return s32("le");
}

/**
 * Convenience function for 64-bit signed integer with big-endian byte order.
 * @see {@link s64} for implementation details and examples.
 */
export function s64be(): Coder<bigint> {
  return s64("be");
}

/**
 * Convenience function for 64-bit signed integer with little-endian byte order.
 * @see {@link s64} for implementation details and examples.
 */
export function s64le(): Coder<bigint> {
  return s64("le");
}
