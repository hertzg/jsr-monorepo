/**
 * Floating-point data encoding and decoding utilities for binary structures.
 *
 * This module provides comprehensive support for encoding and decoding floating-point values
 * in binary format with configurable endianness. It includes:
 *
 * - **16-bit floating point numbers**: Half-precision (IEEE 754)
 * - **32-bit floating point numbers**: Single-precision (IEEE 754)
 * - **64-bit floating point numbers**: Double-precision (IEEE 754)
 * - **Endianness Support**: Both big-endian (network byte order) and little-endian
 * - **Type Safety**: Full TypeScript support with proper type inference
 * - **Performance**: Optimized using native DataView methods
 *
 * All floating-point coders follow the same interface pattern and can be used interchangeably
 * in struct definitions, arrays, and other binary structures.
 *
 * It's the user's responsibility to provide a buffer big enough to fit the whole data.
 *
 * @example Basic floating-point encoding and decoding:
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { f16le, f32be, f64le } from "@hertzg/binstruct/numeric";
 * import { struct } from "@hertzg/binstruct/struct";
 *
 * // Create a simple floating-point structure
 * const floatStruct = struct({
 *   halfPrecision: f16le(),    // 16-bit float, little-endian
 *   singlePrecision: f32be(),  // 32-bit float, big-endian
 *   doublePrecision: f64le(),  // 64-bit float, little-endian
 * });
 *
 * // Test data
 * const testData = {
 *   halfPrecision: 3.14,       // 16-bit precision
 *   singlePrecision: 3.14159,  // 32-bit precision
 *   doublePrecision: 3.14159265359, // 64-bit precision
 * };
 *
 * // Encode to binary
 * const buffer = new Uint8Array(100);
 * const bytesWritten = floatStruct.encode(testData, buffer);
 *
 * // Decode from binary
 * const [decoded, bytesRead] = floatStruct.decode(buffer);
 *
 * // Verify the results (using approximate comparison for floating-point)
 * assertEquals(Math.abs(decoded.halfPrecision - testData.halfPrecision) < 0.01, true);
 * assertEquals(Math.abs(decoded.singlePrecision - testData.singlePrecision) < 0.0001, true);
 * assertEquals(Math.abs(decoded.doublePrecision - testData.doublePrecision) < 0.0000001, true);
 * assertEquals(bytesWritten, bytesRead);
 * ```
 *
 * @example Scientific data processing with floating-point:
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { f32be, f64le } from "@hertzg/binstruct/numeric";
 * import { struct } from "@hertzg/binstruct/struct";
 *
 * // Scientific measurement structure with floating-point
 * const measurement = struct({
 *   temperature: f32be(),       // Temperature in Celsius (big-endian)
 *   pressure: f32be(),          // Pressure in hPa (big-endian)
 *   humidity: f32be(),          // Humidity percentage (big-endian)
 *   timestamp: f64le(),         // High-precision timestamp (little-endian)
 *   accuracy: f32le(),          // Measurement accuracy (little-endian)
 * });
 *
 * const testMeasurement = {
 *   temperature: 23.456,        // Room temperature
 *   pressure: 1013.25,          // Standard atmospheric pressure
 *   humidity: 45.67,            // Moderate humidity
 *   timestamp: 1234567890.123456, // High-precision timestamp
 *   accuracy: 0.001,            // High accuracy
 * };
 *
 * const buffer = new Uint8Array(100);
 * const bytesWritten = measurement.encode(testMeasurement, buffer);
 * const [decoded, bytesRead] = measurement.decode(buffer);
 *
 * // Verify the results (using approximate comparison for floating-point)
 * assertEquals(Math.abs(decoded.temperature - testMeasurement.temperature) < 0.001, true);
 * assertEquals(Math.abs(decoded.pressure - testMeasurement.pressure) < 0.01, true);
 * assertEquals(Math.abs(decoded.humidity - testMeasurement.humidity) < 0.01, true);
 * assertEquals(Math.abs(decoded.timestamp - testMeasurement.timestamp) < 0.000001, true);
 * assertEquals(Math.abs(decoded.accuracy - testMeasurement.accuracy) < 0.0001, true);
 * assertEquals(bytesWritten, bytesRead);
 * ```
 *
 * @module
 */

import type { Coder } from "../core.ts";
import { dataViewType } from "./dataview.ts";

// Symbol definitions for floating-point types
const kKindF16BE = Symbol("f16be");
const kKindF16LE = Symbol("f16le");
const kKindF32BE = Symbol("f32be");
const kKindF32LE = Symbol("f32le");
const kKindF64BE = Symbol("f64be");
const kKindF64LE = Symbol("f64le");

/**
 * Creates a coder for 16-bit floating-point numbers.
 *
 * This function creates a coder that can encode/decode 16-bit floating-point numbers
 * (half-precision IEEE 754 format). The endianness parameter determines the byte order used.
 *
 * @param endianness - The byte order to use ("be" for big-endian, "le" for little-endian), defaults to "be"
 * @returns A Coder<number> for 16-bit floating-point numbers
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { f16 } from "@hertzg/binstruct/numeric";
 *
 * // Create big-endian and little-endian coders
 * const f16be = f16("be");
 * const f16le = f16("le");
 *
 * // Test data
 * const testValue = 3.14;
 *
 * // Encode and decode with big-endian
 * const bufferBE = new Uint8Array(2);
 * const bytesWrittenBE = f16be.encode(testValue, bufferBE);
 * const [decodedBE, bytesReadBE] = f16be.decode(bufferBE);
 *
 * // Use approximate comparison for floating-point precision
 * assertEquals(Math.abs(decodedBE - testValue) < 0.01, true);
 * assertEquals(bytesWrittenBE, 2);
 * assertEquals(bytesReadBE, 2);
 *
 * // Encode and decode with little-endian
 * const bufferLE = new Uint8Array(2);
 * const bytesWrittenLE = f16le.encode(testValue, bufferLE);
 * const [decodedLE, bytesReadLE] = f16le.decode(bufferLE);
 *
 * // Use approximate comparison for floating-point precision
 * assertEquals(Math.abs(decodedLE - testValue) < 0.01, true);
 * assertEquals(bytesWrittenLE, 2);
 * assertEquals(bytesReadLE, 2);
 * ```
 */
export function f16(endianness: "be" | "le" = "be"): Coder<number> {
  return dataViewType(
    "Float16",
    endianness,
    endianness === "be" ? kKindF16BE : kKindF16LE,
  );
}

/**
 * Creates a coder for 32-bit floating-point numbers.
 *
 * This function creates a coder that can encode/decode 32-bit floating-point numbers
 * (single-precision IEEE 754 format). The endianness parameter determines the byte order used.
 *
 * @param endianness - The byte order to use ("be" for big-endian, "le" for little-endian), defaults to "be"
 * @returns A Coder<number> for 32-bit floating-point numbers
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { f32 } from "@hertzg/binstruct/numeric";
 *
 * // Create big-endian and little-endian coders
 * const f32be = f32("be");
 * const f32le = f32("le");
 *
 * // Test data
 * const testValue = 3.14159;
 *
 * // Encode and decode with big-endian
 * const bufferBE = new Uint8Array(4);
 * const bytesWrittenBE = f32be.encode(testValue, bufferBE);
 * const [decodedBE, bytesReadBE] = f32be.decode(bufferBE);
 *
 * // Use approximate comparison for floating-point precision
 * assertEquals(Math.abs(decodedBE - testValue) < 0.0001, true);
 * assertEquals(bytesWrittenBE, 4);
 * assertEquals(bytesReadBE, 4);
 *
 * // Encode and decode with little-endian
 * const bufferLE = new Uint8Array(4);
 * const bytesWrittenLE = f32le.encode(testValue, bufferLE);
 * const [decodedLE, bytesReadLE] = f32le.decode(bufferLE);
 *
 * // Use approximate comparison for floating-point precision
 * assertEquals(Math.abs(decodedLE - testValue) < 0.0001, true);
 * assertEquals(bytesWrittenLE, 4);
 * assertEquals(bytesReadLE, 4);
 * ```
 */
export function f32(endianness: "be" | "le" = "be"): Coder<number> {
  return dataViewType(
    "Float32",
    endianness,
    endianness === "be" ? kKindF32BE : kKindF32LE,
  );
}

/**
 * Creates a coder for 64-bit floating-point numbers.
 *
 * This function creates a coder that can encode/decode 64-bit floating-point numbers
 * (double-precision IEEE 754 format). The endianness parameter determines the byte order used.
 *
 * @param endianness - The byte order to use ("be" for big-endian, "le" for little-endian), defaults to "be"
 * @returns A Coder<number> for 64-bit floating-point numbers
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { f64 } from "@hertzg/binstruct/numeric";
 *
 * // Create big-endian and little-endian coders
 * const f64be = f64("be");
 * const f64le = f64("le");
 *
 * // Test data
 * const testValue = 3.14159265359;
 *
 * // Encode and decode with big-endian
 * const bufferBE = new Uint8Array(8);
 * const bytesWrittenBE = f64be.encode(testValue, bufferBE);
 * const [decodedBE, bytesReadBE] = f64be.decode(bufferBE);
 *
 * // Use approximate comparison for floating-point precision
 * assertEquals(Math.abs(decodedBE - testValue) < 0.0000001, true);
 * assertEquals(bytesWrittenBE, 8);
 * assertEquals(bytesReadBE, 8);
 *
 * // Encode and decode with little-endian
 * const bufferLE = new Uint8Array(8);
 * const bytesWrittenLE = f64le.encode(testValue, bufferLE);
 * const [decodedLE, bytesReadLE] = f64le.decode(bufferLE);
 *
 * // Use approximate comparison for floating-point precision
 * assertEquals(Math.abs(decodedLE - testValue) < 0.0000001, true);
 * assertEquals(bytesWrittenLE, 8);
 * assertEquals(bytesReadLE, 8);
 * ```
 */
export function f64(endianness: "be" | "le" = "be"): Coder<number> {
  return dataViewType(
    "Float64",
    endianness,
    endianness === "be" ? kKindF64BE : kKindF64LE,
  );
}

// Convenience functions for big-endian (network byte order)
export function f16be(): Coder<number> {
  return f16("be");
}

export function f32be(): Coder<number> {
  return f32("be");
}

export function f64be(): Coder<number> {
  return f64("be");
}

// Convenience functions for little-endian
export function f16le(): Coder<number> {
  return f16("le");
}

export function f32le(): Coder<number> {
  return f32("le");
}

export function f64le(): Coder<number> {
  return f64("le");
}
