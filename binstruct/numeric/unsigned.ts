/**
 * Unsigned integer data encoding and decoding utilities for binary structures.
 *
 * This module provides comprehensive support for encoding and decoding unsigned integer values
 * in binary format with configurable endianness. It includes:
 *
 * - **8-bit unsigned integers**: Range 0-255
 * - **16-bit unsigned integers**: Range 0-65,535
 * - **32-bit unsigned integers**: Range 0-4,294,967,295
 * - **64-bit unsigned integers**: Range 0-18,446,744,073,709,551,615 (as bigint)
 * - **Endianness Support**: Both big-endian (network byte order) and little-endian
 * - **Type Safety**: Full TypeScript support with proper type inference
 * - **Performance**: Optimized using native DataView methods
 *
 * All unsigned integer coders follow the same interface pattern and can be used interchangeably
 * in struct definitions, arrays, and other binary structures.
 *
 * It's the user's responsibility to provide a buffer big enough to fit the whole data.
 *
 * @example Basic unsigned integer encoding and decoding:
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { u16le, u32be, u64le } from "@hertzg/binstruct/numeric";
 * import { struct } from "@hertzg/binstruct/struct";
 *
 * // Create a simple unsigned integer structure
 * const unsignedStruct = struct({
 *   smallNumber: u16le(),      // 16-bit unsigned, little-endian
 *   mediumNumber: u32be(),     // 32-bit unsigned, big-endian
 *   largeNumber: u64le(),      // 64-bit unsigned, little-endian
 * });
 *
 * // Test data
 * const testData = {
 *   smallNumber: 12345,        // Fits in 16-bit unsigned (0-65535)
 *   mediumNumber: 1000000,     // 32-bit unsigned range
 *   largeNumber: 1234567890n,  // 64-bit unsigned (bigint)
 * };
 *
 * // Encode to binary
 * const buffer = new Uint8Array(100);
 * const bytesWritten = unsignedStruct.encode(testData, buffer);
 *
 * // Decode from binary
 * const [decoded, bytesRead] = unsignedStruct.decode(buffer);
 *
 * // Verify the results
 * assertEquals(decoded.smallNumber, testData.smallNumber);
 * assertEquals(decoded.mediumNumber, testData.mediumNumber);
 * assertEquals(decoded.largeNumber, testData.largeNumber);
 * assertEquals(bytesWritten, bytesRead);
 * ```
 *
 * @example Network protocol with unsigned integers:
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { u16be, u32le, u64be } from "@hertzg/binstruct/numeric";
 * import { struct } from "@hertzg/binstruct/struct";
 *
 * // Network packet header with unsigned integers
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

import type { Coder } from "../core.ts";
import { dataViewType } from "./dataview.ts";

// Symbol definitions for unsigned integer types
const kKindU8 = Symbol("u8");
const kKindU16BE = Symbol("u16be");
const kKindU16LE = Symbol("u16le");
const kKindU32BE = Symbol("u32be");
const kKindU32LE = Symbol("u32le");
const kKindU64BE = Symbol("u64be");
const kKindU64LE = Symbol("u64le");

/**
 * Creates a coder for 8-bit unsigned integers.
 *
 * This function creates a coder that can encode/decode 8-bit unsigned integers
 * (range 0-255). The endianness parameter determines the byte order used.
 *
 * @param endianness - The byte order to use ("be" for big-endian, "le" for little-endian), defaults to "be"
 * @returns A Coder<number> for 8-bit unsigned integers
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { u8 } from "@hertzg/binstruct/numeric";
 *
 * // Create big-endian and little-endian coders
 * const u8be = u8("be");
 * const u8le = u8("le");
 *
 * // Test data
 * const testValue = 255;
 *
 * // Encode and decode with big-endian
 * const bufferBE = new Uint8Array(1);
 * const bytesWrittenBE = u8be.encode(testValue, bufferBE);
 * const [decodedBE, bytesReadBE] = u8be.decode(bufferBE);
 *
 * assertEquals(decodedBE, testValue);
 * assertEquals(bytesWrittenBE, 1);
 * assertEquals(bytesReadBE, 1);
 *
 * // Encode and decode with little-endian
 * const bufferLE = new Uint8Array(1);
 * const bytesWrittenLE = u8le.encode(testValue, bufferLE);
 * const [decodedLE, bytesReadLE] = u8le.decode(bufferLE);
 *
 * assertEquals(decodedLE, testValue);
 * assertEquals(bytesWrittenLE, 1);
 * assertEquals(bytesReadLE, 1);
 * ```
 */
export function u8(endianness: "be" | "le" = "be"): Coder<number> {
  return dataViewType("Uint8", endianness, kKindU8);
}

/**
 * Creates a coder for 16-bit unsigned integers.
 *
 * This function creates a coder that can encode/decode 16-bit unsigned integers
 * (range 0-65,535). The endianness parameter determines the byte order used.
 *
 * @param endianness - The byte order to use ("be" for big-endian, "le" for little-endian), defaults to "be"
 * @returns A Coder<number> for 16-bit unsigned integers
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { u16 } from "@hertzg/binstruct/numeric";
 *
 * // Create big-endian and little-endian coders
 * const u16be = u16("be");
 * const u16le = u16("le");
 *
 * // Test data
 * const testValue = 65535;
 *
 * // Encode and decode with big-endian
 * const bufferBE = new Uint8Array(2);
 * const bytesWrittenBE = u16be.encode(testValue, bufferBE);
 * const [decodedBE, bytesReadBE] = u16be.decode(bufferBE);
 *
 * assertEquals(decodedBE, testValue);
 * assertEquals(bytesWrittenBE, 2);
 * assertEquals(bytesReadBE, 2);
 *
 * // Encode and decode with little-endian
 * const bufferLE = new Uint8Array(2);
 * const bytesWrittenLE = u16le.encode(testValue, bufferLE);
 * const [decodedLE, bytesReadLE] = u16le.decode(bufferLE);
 *
 * assertEquals(decodedLE, testValue);
 * assertEquals(bytesWrittenLE, 2);
 * assertEquals(bytesReadLE, 2);
 * ```
 */
export function u16(endianness: "be" | "le" = "be"): Coder<number> {
  return dataViewType(
    "Uint16",
    endianness,
    endianness === "be" ? kKindU16BE : kKindU16LE,
  );
}

/**
 * Creates a coder for 32-bit unsigned integers.
 *
 * This function creates a coder that can encode/decode 32-bit unsigned integers
 * (range 0-4,294,967,295). The endianness parameter determines the byte order used.
 *
 * @param endianness - The byte order to use ("be" for big-endian, "le" for little-endian), defaults to "be"
 * @returns A Coder<number> for 32-bit unsigned integers
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { u32 } from "@hertzg/binstruct/numeric";
 *
 * // Create big-endian and little-endian coders
 * const u32be = u32("be");
 * const u32le = u32("le");
 *
 * // Test data
 * const testValue = 4294967295;
 *
 * // Encode and decode with big-endian
 * const bufferBE = new Uint8Array(4);
 * const bytesWrittenBE = u32be.encode(testValue, bufferBE);
 * const [decodedBE, bytesReadBE] = u32be.decode(bufferBE);
 *
 * assertEquals(decodedBE, testValue);
 * assertEquals(bytesWrittenBE, 4);
 * assertEquals(bytesReadBE, 4);
 *
 * // Encode and decode with little-endian
 * const bufferLE = new Uint8Array(4);
 * const bytesWrittenLE = u32le.encode(testValue, bufferLE);
 * const [decodedLE, bytesReadLE] = u32le.decode(bufferLE);
 *
 * assertEquals(decodedLE, testValue);
 * assertEquals(bytesWrittenLE, 4);
 * assertEquals(bytesReadLE, 4);
 * ```
 */
export function u32(endianness: "be" | "le" = "be"): Coder<number> {
  return dataViewType(
    "Uint32",
    endianness,
    endianness === "be" ? kKindU32BE : kKindU32LE,
  );
}

/**
 * Creates a coder for 64-bit unsigned integers.
 *
 * This function creates a coder that can encode/decode 64-bit unsigned integers
 * (range 0-18,446,744,073,709,551,615). The endianness parameter determines the byte order used.
 * Note that 64-bit integers are returned as bigint to handle the full range.
 *
 * @param endianness - The byte order to use ("be" for big-endian, "le" for little-endian), defaults to "be"
 * @returns A Coder<bigint> for 64-bit unsigned integers
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { u64 } from "@hertzg/binstruct/numeric";
 *
 * // Create big-endian and little-endian coders
 * const u64be = u64("be");
 * const u64le = u64("le");
 *
 * // Test data
 * const testValue = 18446744073709551615n;
 *
 * // Encode and decode with big-endian
 * const bufferBE = new Uint8Array(8);
 * const bytesWrittenBE = u64be.encode(testValue, bufferBE);
 * const [decodedBE, bytesReadBE] = u64be.decode(bufferBE);
 *
 * assertEquals(decodedBE, testValue);
 * assertEquals(bytesWrittenBE, 8);
 * assertEquals(bytesReadBE, 8);
 *
 * // Encode and decode with little-endian
 * const bufferLE = new Uint8Array(8);
 * const bytesWrittenLE = u64le.encode(testValue, bufferLE);
 * const [decodedLE, bytesReadLE] = u64le.decode(bufferLE);
 *
 * assertEquals(decodedLE, testValue);
 * assertEquals(bytesWrittenLE, 8);
 * assertEquals(bytesReadLE, 8);
 * ```
 */
export function u64(endianness: "be" | "le" = "be"): Coder<bigint> {
  return dataViewType(
    "BigUint64",
    endianness,
    endianness === "be" ? kKindU64BE : kKindU64LE,
  );
}

// Convenience functions for big-endian (network byte order)
export function u8be(): Coder<number> {
  return u8("be");
}

export function u16be(): Coder<number> {
  return u16("be");
}

export function u32be(): Coder<number> {
  return u32("be");
}

export function u64be(): Coder<bigint> {
  return u64("be");
}

// Convenience functions for little-endian
export function u8le(): Coder<number> {
  return u8("le");
}

export function u16le(): Coder<number> {
  return u16("le");
}

export function u32le(): Coder<number> {
  return u32("le");
}

export function u64le(): Coder<bigint> {
  return u64("le");
}
