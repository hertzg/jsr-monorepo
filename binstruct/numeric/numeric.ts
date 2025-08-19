import { type Coder, kCoderKind } from "../core.ts";
import { refSetValue } from "../ref/ref.ts";

// Symbol definitions for numeric types
const kKindU8 = Symbol("u8");
const kKindS8 = Symbol("s8");
const kKindU16BE = Symbol("u16be");
const kKindU16LE = Symbol("u16le");
const kKindS16BE = Symbol("s16be");
const kKindS16LE = Symbol("s16le");
const kKindU32BE = Symbol("u32be");
const kKindU32LE = Symbol("u32le");
const kKindS32BE = Symbol("s32be");
const kKindS32LE = Symbol("s32le");
const kKindU64BE = Symbol("u64be");
const kKindU64LE = Symbol("u64le");
const kKindS64BE = Symbol("s64be");
const kKindS64LE = Symbol("s64le");
const kKindF16BE = Symbol("f16be");
const kKindF16LE = Symbol("f16le");
const kKindF32BE = Symbol("f32be");
const kKindF32LE = Symbol("f32le");
const kKindF64BE = Symbol("f64be");
const kKindF64LE = Symbol("f64le");

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
 * Endianness types for binary data
 */
export type Endianness = "be" | "le";

type DataViewMethodSuffixes =
  Extract<keyof DataView, `get${string}` | `set${string}`> extends
    `${"get" | "set"}${infer Suffix}` ? Suffix : never;

function dataViewType(
  type:
    | "Int8"
    | "Int16"
    | "Int32"
    | "Uint8"
    | "Uint16"
    | "Uint32"
    | "Float16"
    | "Float32"
    | "Float64",
  endianness: Endianness,
  kind: symbol,
): Coder<number>;
function dataViewType(
  type:
    | "BigInt64"
    | "BigUint64",
  endianness: Endianness,
  kind: symbol,
): Coder<bigint>;
function dataViewType<TDecoded extends number | bigint>(
  type: DataViewMethodSuffixes,
  endianness: Endianness,
  kind: symbol,
): Coder<TDecoded> {
  const bits = Number(type.match(/[0-9]+$/)?.[0]!);

  if (isNaN(bits)) {
    throw new Error(`Unable to infer size from type ${type}`);
  }

  const bytes = Math.trunc(bits / 8);

  const methodSuffix = `${type}` as const;

  let self: Coder<TDecoded>;
  return self = {
    [kCoderKind]: kind,
    encode: (value, target, ctx) => {
      refSetValue(ctx, self, value);

      const dataView = new DataView(
        target.buffer,
        target.byteOffset,
        target.byteLength,
      );
      switch (methodSuffix) {
        case "Uint8":
        case "Int8":
          dataView[`set${methodSuffix}`](0, value as number);
          break;

        case "BigUint64":
        case "BigInt64":
          dataView[`set${methodSuffix}`](
            0,
            value as bigint,
            endianness === "le",
          );
          break;

        default:
          dataView[`set${methodSuffix}`](
            0,
            value as number,
            endianness === "le",
          );
          break;
      }
      return bytes;
    },
    decode: (encoded, ctx) => {
      if (encoded.length < bytes) {
        throw new Error(`Need ${bytes} bytes, got ${encoded.length}`);
      }

      const dataView = new DataView(
        encoded.buffer,
        encoded.byteOffset,
        encoded.byteLength,
      );

      let value: TDecoded;
      switch (methodSuffix) {
        case "Uint8":
        case "Int8":
          value = dataView[`get${methodSuffix}`](0) as TDecoded;
          break;

        default:
          value = dataView[`get${methodSuffix}`](
            0,
            endianness === "le",
          ) as TDecoded;
          break;
      }

      refSetValue(ctx, self, value);

      return [value, bytes];
    },
  };
}

/**
 * Creates a u8 (unsigned 8-bit integer) parser/serializer
 * @param endianness - Endianness, defaults to "be" (big-endian)
 * @returns Coder<number> with encode and decode functions
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { u8le, u8be } from "@hertzg/binstruct/numeric";
 * import { struct } from "@hertzg/binstruct/struct";
 *
 * // Define a color structure using 8-bit unsigned integers
 * const colorCoder = struct({
 *   red: u8le(),   // Red component (0-255)
 *   green: u8le(), // Green component (0-255)
 *   blue: u8le(),  // Blue component (0-255)
 *   alpha: u8le(), // Alpha component (0-255)
 * });
 *
 * // Create sample color data
 * const color = {
 *   red: 255,   // Full red
 *   green: 128, // Half green
 *   blue: 64,   // Quarter blue
 *   alpha: 255, // Fully opaque
 * };
 *
 * const buffer = new Uint8Array(100);
 * const bytesWritten = colorCoder.encode(color, buffer);
 * const [decoded, bytesRead] = colorCoder.decode(buffer);
 * assertEquals(decoded, color);
 * assertEquals(bytesWritten, bytesRead);
 * ```
 */
export function u8(
  endianness: Endianness = "be",
): Coder<number> {
  return dataViewType(
    "Uint8",
    endianness,
    kKindU8,
  );
}

/**
 * Creates an s8 (signed 8-bit integer) parser/serializer.
 *
 * 8-bit signed integers can represent values from -128 to 127. This coder is
 * commonly used for small signed values, status indicators, and byte-level data
 * that can be negative.
 *
 * @param endianness - Endianness, defaults to "be" (big-endian)
 * @returns Coder<number> with encode and decode functions
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { s8le, s8be } from "@hertzg/binstruct/numeric";
 * import { struct } from "@hertzg/binstruct/struct";
 *
 * // Define a temperature sensor structure using 8-bit signed integers
 * const tempSensorCoder = struct({
 *   temperature: s8le(),        // Temperature in Celsius (-128 to 127)
 *   humidity: s8le(),           // Humidity percentage (-128 to 127)
 *   status: s8be(),             // Sensor status (-128 to 127)
 * });
 *
 * // Create sample sensor data
 * const sensorData = {
 *   temperature: 23,            // 23°C (positive value)
 *   humidity: -5,               // -5% (negative value for error)
 *   status: 0,                  // Normal status
 * };
 *
 * const buffer = new Uint8Array(100);
 * const bytesWritten = tempSensorCoder.encode(sensorData, buffer);
 * const [decoded, bytesRead] = tempSensorCoder.decode(buffer);
 * assertEquals(decoded, sensorData);
 * assertEquals(bytesWritten, bytesRead);
 * ```
 */
export function s8(
  endianness: Endianness = "be",
): Coder<number> {
  return dataViewType("Int8", endianness, kKindS8);
}

/**
 * Creates a u16 (unsigned 16-bit integer) parser/serializer
 * @param endianness - Endianness, defaults to "be" (big-endian)
 * @returns Coder<number> with encode and decode functions
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { u16le, u16be } from "@hertzg/binstruct/numeric";
 * import { struct } from "@hertzg/binstruct/struct";
 *
 * // Define a network packet header using 16-bit unsigned integers
 * const packetHeaderCoder = struct({
 *   sourcePort: u16le(),      // Source port number (0-65535)
 *   destPort: u16le(),        // Destination port number (0-65535)
 *   sequenceNumber: u16le(),   // TCP sequence number
 *   windowSize: u16le(),      // TCP window size
 *   checksum: u16le(),        // Packet checksum
 * });
 *
 * // Create sample network packet header
 * const packetHeader = {
 *   sourcePort: 12345,      // Common development port
 *   destPort: 80,           // HTTP port
 *   sequenceNumber: 1000,    // TCP sequence
 *   windowSize: 8192,       // 8KB window
 *   checksum: 0xABCD,       // Sample checksum
 * };
 *
 * const buffer = new Uint8Array(100);
 * const bytesWritten = packetHeaderCoder.encode(packetHeader, buffer);
 * const [decoded, bytesRead] = packetHeaderCoder.decode(buffer);
 * assertEquals(decoded, packetHeader);
 * assertEquals(bytesWritten, bytesRead);
 * ```
 */
export function u16(
  endianness: Endianness = "be",
): Coder<number> {
  return dataViewType(
    "Uint16",
    endianness,
    endianness === "be" ? kKindU16BE : kKindU16LE,
  );
}

/**
 * Creates an s16 (signed 16-bit integer) parser/serializer.
 *
 * 16-bit signed integers can represent values from -32,768 to 32,767. This coder is
 * commonly used for medium-range signed values, audio samples, and data that can be
 * negative but doesn't require the full range of a 32-bit integer.
 *
 * @param endianness - Endianness, defaults to "be" (big-endian)
 * @returns Coder<number> with encode and decode functions
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { s16le, s16be } from "@hertzg/binstruct/numeric";
 * import { struct } from "@hertzg/binstruct/struct";
 *
 * // Define an audio sample structure using 16-bit signed integers
 * const audioSampleCoder = struct({
 *   leftChannel: s16le(),       // Left audio channel (-32768 to 32767)
 *   rightChannel: s16le(),      // Right audio channel (-32768 to 32767)
 *   volume: s16be(),            // Volume control (-32768 to 32767)
 * });
 *
 * // Create sample audio data
 * const audioData = {
 *   leftChannel: 16384,         // Half amplitude positive
 *   rightChannel: -8192,        // Quarter amplitude negative
 *   volume: 32000,              // High volume
 * };
 *
 * const buffer = new Uint8Array(100);
 * const bytesWritten = audioSampleCoder.encode(audioData, buffer);
 * const [decoded, bytesRead] = audioSampleCoder.decode(buffer);
 * assertEquals(decoded, audioData);
 * assertEquals(bytesWritten, bytesRead);
 * ```
 */
export function s16(
  endianness: Endianness = "be",
): Coder<number> {
  return dataViewType(
    "Int16",
    endianness,
    endianness === "be" ? kKindS16BE : kKindS16LE,
  );
}

/**
 * Creates a f16 (16-bit floating point number) parser/serializer.
 *
 * 16-bit floating point numbers provide reduced precision compared to 32-bit floats
 * but use half the memory. This coder is commonly used in graphics applications,
 * machine learning models, and other scenarios where memory efficiency is important
 * and reduced precision is acceptable.
 *
 * @param endianness - Endianness, defaults to "be" (big-endian)
 * @returns Coder<number> with encode and decode functions
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { f16le, f16be } from "@hertzg/binstruct/numeric";
 * import { struct } from "@hertzg/binstruct/struct";
 *
 * // Define a graphics vertex structure using 16-bit floating point numbers
 * const vertexCoder = struct({
 *   x: f16le(),                 // X coordinate (16-bit float)
 *   y: f16le(),                 // Y coordinate (16-bit float)
 *   z: f16le(),                 // Z coordinate (16-bit float)
 *   u: f16be(),                 // U texture coordinate
 *   v: f16be(),                 // V texture coordinate
 * });
 *
 * // Create sample vertex data
 * const vertex = {
 *   x: 1.5,                     // X position
 *   y: -2.25,                   // Y position
 *   z: 0.75,                    // Z position
 *   u: 0.5,                     // U texture coordinate
 *   v: 0.25,                    // V texture coordinate
 * };
 *
 * const buffer = new Uint8Array(100);
 * const bytesWritten = vertexCoder.encode(vertex, buffer);
 * const [decoded, bytesRead] = vertexCoder.decode(buffer);
 * assertEquals(Math.abs(decoded.x - vertex.x) < 0.001, true);  // Allow small precision differences
 * assertEquals(Math.abs(decoded.y - vertex.y) < 0.001, true);
 * assertEquals(Math.abs(decoded.z - vertex.z) < 0.001, true);
 * assertEquals(Math.abs(decoded.u - vertex.u) < 0.001, true);
 * assertEquals(Math.abs(decoded.v - vertex.v) < 0.001, true);
 * assertEquals(bytesWritten, bytesRead);
 * ```
 */
export function f16(
  endianness: Endianness = "be",
): Coder<number> {
  return dataViewType(
    "Float16",
    endianness,
    endianness === "be" ? kKindF16BE : kKindF16LE,
  );
}

/**
 * Creates a u32 (unsigned 32-bit integer) parser/serializer
 * @param endianness - Endianness, defaults to "be" (big-endian)
 * @returns Coder<number> with encode and decode functions
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { u32le, u32be } from "@hertzg/binstruct/numeric";
 * import { struct } from "@hertzg/binstruct/struct";
 *
 * // Define a file header using 32-bit unsigned integers
 * const fileHeaderCoder = struct({
 *   magicNumber: u32le(),     // File magic number (0x12345678)
 *   fileSize: u32le(),        // Total file size in bytes
 *   dataOffset: u32le(),      // Offset to data section
 *   checksum: u32le(),        // File checksum
 *   timestamp: u32le(),       // Unix timestamp
 * });
 *
 * // Create sample file header
 * const fileHeader = {
 *   magicNumber: 0x12345678,  // Magic identifier
 *   fileSize: 1024,           // 1KB file
 *   dataOffset: 64,           // Data starts at byte 64
 *   checksum: 0xDEADBEEF,     // Sample checksum
 *   timestamp: 1640995200,    // Unix timestamp
 * };
 *
 * const buffer = new Uint8Array(100);
 * const bytesWritten = fileHeaderCoder.encode(fileHeader, buffer);
 * const [decoded, bytesRead] = fileHeaderCoder.decode(buffer);
 * assertEquals(decoded, fileHeader);
 * assertEquals(bytesWritten, bytesRead);
 * ```
 */
export function u32(
  endianness: Endianness = "be",
): Coder<number> {
  return dataViewType(
    "Uint32",
    endianness,
    endianness === "be" ? kKindU32BE : kKindU32LE,
  );
}

/**
 * Creates an s32 (signed 32-bit integer) parser/serializer.
 *
 * 32-bit signed integers can represent values from -2,147,483,648 to 2,147,483,647.
 * This coder is commonly used for large signed values, timestamps, file sizes, and
 * other data that requires the full range of a 32-bit integer.
 *
 * @param endianness - Endianness, defaults to "be" (big-endian)
 * @returns Coder<number> with encode and decode functions
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { s32le, s32be } from "@hertzg/binstruct/numeric";
 * import { struct } from "@hertzg/binstruct/struct";
 *
 * // Define a file metadata structure using 32-bit signed integers
 * const fileMetadataCoder = struct({
 *   fileSize: s32le(),          // File size in bytes (can be negative for errors)
 *   creationTime: s32le(),      // Creation timestamp (Unix epoch)
 *   modificationTime: s32le(),  // Last modification timestamp
 *   ownerID: s32be(),           // Owner user ID (can be negative for system users)
 *   groupID: s32be(),           // Group ID (can be negative for system groups)
 * });
 *
 * // Create sample file metadata
 * const metadata = {
 *   fileSize: 1048576,          // 1MB file (positive)
 *   creationTime: 1640995200,   // Unix timestamp
 *   modificationTime: 1640995300, // Unix timestamp
 *   ownerID: -1,                // Root user (negative)
 *   groupID: 1000,              // Regular group (positive)
 * };
 *
 * const buffer = new Uint8Array(100);
 * const bytesWritten = fileMetadataCoder.encode(metadata, buffer);
 * const [decoded, bytesRead] = fileMetadataCoder.decode(buffer);
 * assertEquals(decoded, metadata);
 * assertEquals(bytesWritten, bytesRead);
 * ```
 */
export function s32(
  endianness: Endianness = "be",
): Coder<number> {
  return dataViewType(
    "Int32",
    endianness,
    endianness === "be" ? kKindS32BE : kKindS32LE,
  );
}

/**
 * Creates a f32 (32-bit floating point number) parser/serializer
 * @param endianness - Endianness, defaults to "be" (big-endian)
 * @returns Coder<number> with encode and decode functions
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { f32le, f32be } from "@hertzg/binstruct/numeric";
 * import { struct } from "@hertzg/binstruct/struct";
 *
 * // Define a 3D vector structure using 32-bit floating point numbers
 * const vector3DCoder = struct({
 *   x: f32le(), // X coordinate
 *   y: f32le(), // Y coordinate
 *   z: f32le(), // Z coordinate
 * });
 *
 * // Define a transform matrix using 32-bit floating point numbers
 * const transformCoder = struct({
 *   position: vector3DCoder,    // Translation vector
 *   rotation: vector3DCoder,    // Euler angles (radians)
 *   scale: vector3DCoder,       // Scale factors
 * });
 *
 * // Create sample 3D transform data
 * const transform = {
 *   position: { x: 10.5, y: 20.0, z: -5.25 },
 *   rotation: { x: 0.0, y: 1.5708, z: 0.0 }, // 90 degrees around Y
 *   scale: { x: 1.0, y: 1.0, z: 1.0 },
 * };
 *
 * const buffer = new Uint8Array(100);
 * const bytesWritten = transformCoder.encode(transform, buffer);
 * const [decoded, bytesRead] = transformCoder.decode(buffer);
 * assertEquals(Math.abs(decoded.position.x - transform.position.x) < 0.001, true);
 * assertEquals(Math.abs(decoded.position.y - transform.position.y) < 0.001, true);
 * assertEquals(Math.abs(decoded.position.z - transform.position.z) < 0.001, true);
 * assertEquals(bytesWritten, bytesRead);
 * ```
 */
export function f32(
  endianness: Endianness = "be",
): Coder<number> {
  return dataViewType(
    "Float32",
    endianness,
    endianness === "be" ? kKindF32BE : kKindF32LE,
  );
}

/**
 * Creates a u64 (unsigned 64-bit integer) parser/serializer.
 *
 * 64-bit unsigned integers can represent values from 0 to 18,446,744,073,709,551,615.
 * This coder returns a `bigint` type since JavaScript numbers cannot safely represent
 * the full range of 64-bit integers. Commonly used for file sizes, memory addresses,
 * and other large unsigned values.
 *
 * @param endianness - Endianness, defaults to "be" (big-endian)
 * @returns Coder<bigint> with encode and decode functions
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { u64le, u64be } from "@hertzg/binstruct/numeric";
 * import { struct } from "@hertzg/binstruct/struct";
 *
 * // Define a disk partition structure using 64-bit unsigned integers
 * const partitionCoder = struct({
 *   startLBA: u64le(),          // Starting logical block address
 *   sizeInSectors: u64le(),     // Partition size in sectors
 *   totalBytes: u64be(),        // Total size in bytes (big-endian)
 *   freeSpace: u64le(),         // Available free space
 * });
 *
 * // Create sample partition data
 * const partition = {
 *   startLBA: 2048n,            // Start at sector 2048
 *   sizeInSectors: 2097152n,    // 1GB partition (512-byte sectors)
 *   totalBytes: 1073741824n,    // 1GB in bytes
 *   freeSpace: 536870912n,      // 512MB free
 * };
 *
 * const buffer = new Uint8Array(100);
 * const bytesWritten = partitionCoder.encode(partition, buffer);
 * const [decoded, bytesRead] = partitionCoder.decode(buffer);
 * assertEquals(decoded.startLBA, partition.startLBA);
 * assertEquals(decoded.sizeInSectors, partition.sizeInSectors);
 * assertEquals(decoded.totalBytes, partition.totalBytes);
 * assertEquals(decoded.freeSpace, partition.freeSpace);
 * assertEquals(bytesWritten, bytesRead);
 * ```
 */
export function u64(
  endianness: Endianness = "be",
): Coder<bigint> {
  return dataViewType(
    "BigUint64",
    endianness,
    endianness === "be" ? kKindU64BE : kKindU64LE,
  );
}

/**
 * Creates an s64 (signed 64-bit integer) parser/serializer.
 *
 * 64-bit signed integers can represent values from -9,223,372,036,854,775,808 to
 * 9,223,372,036,854,775,807. This coder returns a `bigint` type since JavaScript
 * numbers cannot safely represent the full range of 64-bit integers. Commonly used
 * for large signed values, timestamps, and offsets.
 *
 * @param endianness - Endianness, defaults to "be" (big-endian)
 * @returns Coder<bigint> with encode and decode functions
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { s64le, s64be } from "@hertzg/binstruct/numeric";
 * import { struct } from "@hertzg/binstruct/struct";
 *
 * // Define a database record structure using 64-bit signed integers
 * const recordCoder = struct({
 *   recordID: s64le(),           // Unique record identifier (can be negative)
 *   timestamp: s64le(),          // Nanosecond precision timestamp
 *   offset: s64be(),             // File offset (can be negative for errors)
 *   size: s64le(),               // Record size in bytes
 * });
 *
 * // Create sample record data
 * const record = {
 *   recordID: -123456789n,       // Negative ID (error condition)
 *   timestamp: 1640995200000000000n, // Nanosecond timestamp
 *   offset: 1024n,               // Positive offset
 *   size: -1n,                   // Negative size (error condition)
 * };
 *
 * const buffer = new Uint8Array(100);
 * const bytesWritten = recordCoder.encode(record, buffer);
 * const [decoded, bytesRead] = recordCoder.decode(buffer);
 * assertEquals(decoded.recordID, record.recordID);
 * assertEquals(decoded.timestamp, record.timestamp);
 * assertEquals(decoded.offset, record.offset);
 * assertEquals(decoded.size, record.size);
 * assertEquals(bytesWritten, bytesRead);
 * ```
 */
export function s64(
  endianness: Endianness = "be",
): Coder<bigint> {
  return dataViewType(
    "BigInt64",
    endianness,
    endianness === "be" ? kKindS64BE : kKindS64LE,
  );
}

/**
 * Creates a f64 (64-bit floating point number) parser/serializer.
 *
 * 64-bit floating point numbers provide the highest precision available in the
 * IEEE 754 standard, with approximately 15-17 decimal digits of precision.
 * This coder is commonly used for scientific calculations, financial data,
 * and other applications requiring maximum numerical precision.
 *
 * @param endianness - Endianness, defaults to "be" (big-endian)
 * @returns Coder<number> with encode and decode functions
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { f64le, f64be } from "@hertzg/binstruct/numeric";
 * import { struct } from "@hertzg/binstruct/struct";
 *
 * // Define a scientific measurement structure using 64-bit floating point numbers
 * const measurementCoder = struct({
 *   latitude: f64le(),           // GPS latitude (high precision)
 *   longitude: f64le(),          // GPS longitude (high precision)
 *   altitude: f64le(),           // Altitude in meters
 *   temperature: f64be(),        // Temperature in Kelvin (big-endian)
 *   pressure: f64le(),           // Atmospheric pressure in Pa
 *   humidity: f64le(),           // Relative humidity (0.0 to 1.0)
 * });
 *
 * // Create sample measurement data
 * const measurement = {
 *   latitude: 37.7749,           // San Francisco latitude
 *   longitude: -122.4194,        // San Francisco longitude
 *   altitude: 16.0,              // Sea level + 16m
 *   temperature: 293.15,         // 20°C in Kelvin
 *   pressure: 101325.0,          // Standard atmospheric pressure
 *   humidity: 0.65,              // 65% humidity
 * };
 *
 * const buffer = new Uint8Array(100);
 * const bytesWritten = measurementCoder.encode(measurement, buffer);
 * const [decoded, bytesRead] = measurementCoder.decode(buffer);
 * assertEquals(Math.abs(decoded.latitude - measurement.latitude) < 0.0000001, true);  // High precision
 * assertEquals(Math.abs(decoded.longitude - measurement.longitude) < 0.0000001, true);
 * assertEquals(Math.abs(decoded.altitude - measurement.altitude) < 0.0000001, true);
 * assertEquals(Math.abs(decoded.temperature - measurement.temperature) < 0.0000001, true);
 * assertEquals(Math.abs(decoded.pressure - measurement.pressure) < 0.0000001, true);
 * assertEquals(Math.abs(decoded.humidity - measurement.humidity) < 0.0000001, true);
 * assertEquals(bytesWritten, bytesRead);
 * ```
 */
export function f64(
  endianness: Endianness = "be",
): Coder<number> {
  return dataViewType(
    "Float64",
    endianness,
    endianness === "be" ? kKindF64BE : kKindF64LE,
  );
}

/**
 * Big-endian aliases for convenience.
 *
 * These functions provide convenient access to big-endian (network byte order) coders
 * without needing to specify the endianness parameter. Big-endian is the standard
 * byte order for network protocols and many file formats.
 *
 * @example Network protocol with big-endian byte order:
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { u16be, u32be, u64be } from "@hertzg/binstruct/numeric";
 * import { struct } from "@hertzg/binstruct/struct";
 *
 * // Define a network packet header using big-endian byte order
 * const networkHeader = struct({
 *   magic: u32be(),              // Magic number (big-endian)
 *   version: u16be(),            // Protocol version
 *   flags: u16be(),              // Control flags
 *   sequence: u64be(),           // Sequence number
 *   timestamp: u64be(),          // Timestamp
 *   payloadSize: u32be(),        // Payload size
 * });
 *
 * const packet = {
 *   magic: 0x12345678,           // Magic identifier
 *   version: 1,                  // Version 1
 *   flags: 0x8000,               // High bit set
 *   sequence: 123456789n,        // Sequence number
 *   timestamp: 1640995200000000n, // Timestamp
 *   payloadSize: 1024,           // 1KB payload
 * };
 *
 * const buffer = new Uint8Array(100);
 * const bytesWritten = networkHeader.encode(packet, buffer);
 * const [decoded, bytesRead] = networkHeader.decode(buffer);
 * assertEquals(decoded, packet);
 * assertEquals(bytesWritten, bytesRead);
 * ```
 */
export function u8be(): Coder<number> {
  return u8("be");
}
/**
 * Creates an s8 (signed 8-bit integer) coder with big-endian byte order
 * @returns Coder<number> with encode and decode functions
 */
export function s8be(): Coder<number> {
  return s8("be");
}
/**
 * Creates a f16 (16-bit floating point number) coder with big-endian byte order
 * @returns Coder<number> with encode and decode functions
 */
export function f16be(): Coder<number> {
  return f16("be");
}
/**
 * Creates a u16 (unsigned 16-bit integer) coder with big-endian byte order
 * @returns Coder<number> with encode and decode functions
 */
export function u16be(): Coder<number> {
  return u16("be");
}
/**
 * Creates an s16 (signed 16-bit integer) coder with big-endian byte order
 * @returns Coder<number> with encode and decode functions
 */
export function s16be(): Coder<number> {
  return s16("be");
}
/**
 * Creates a f32 (32-bit floating point number) coder with big-endian byte order
 * @returns Coder<number> with encode and decode functions
 */
export function f32be(): Coder<number> {
  return f32("be");
}
/**
 * Creates a u32 (unsigned 32-bit integer) coder with big-endian byte order
 * @returns Coder<number> with encode and decode functions
 */
export function u32be(): Coder<number> {
  return u32("be");
}
/**
 * Creates an s32 (signed 32-bit integer) coder with big-endian byte order
 * @returns Coder<number> with encode and decode functions
 */
export function s32be(): Coder<number> {
  return s32("be");
}
/**
 * Creates a f64 (64-bit floating point number) coder with big-endian byte order
 * @returns Coder<number> with encode and decode functions
 */
export function f64be(): Coder<number> {
  return f64("be");
}
/**
 * Creates a u64 (unsigned 64-bit integer) coder with big-endian byte order
 * @returns Coder<bigint> with encode and decode functions
 */
export function u64be(): Coder<bigint> {
  return u64("be");
}
/**
 * Creates an s64 (signed 64-bit integer) coder with big-endian byte order
 * @returns Coder<bigint> with encode and decode functions
 */
export function s64be(): Coder<bigint> {
  return s64("be");
}

/**
 * Little-endian aliases for convenience.
 *
 * These functions provide convenient access to little-endian coders without needing
 * to specify the endianness parameter. Little-endian is the native byte order for
 * x86/x64 processors and is commonly used in Windows and many file formats.
 *
 * @example Windows file format with little-endian byte order:
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { u16le, u32le, u64le } from "@hertzg/binstruct/numeric";
 * import { struct } from "@hertzg/binstruct/struct";
 *
 * // Define a Windows PE file header using little-endian byte order
 * const peHeader = struct({
 *   signature: u32le(),           // PE signature (0x00004550)
 *   machine: u16le(),             // Machine type (0x014C for x86)
 *   numberOfSections: u16le(),    // Number of sections
 *   timeDateStamp: u32le(),       // File creation timestamp
 *   pointerToSymbolTable: u32le(), // Symbol table offset
 *   numberOfSymbols: u32le(),     // Number of symbols
 *   sizeOfOptionalHeader: u16le(), // Optional header size
 *   characteristics: u16le(),      // File characteristics
 * });
 *
 * const header = {
 *   signature: 0x00004550,        // "PE\0\0"
 *   machine: 0x014C,              // x86 machine
 *   numberOfSections: 5,          // 5 sections
 *   timeDateStamp: 1640995200,    // Timestamp
 *   pointerToSymbolTable: 0,      // No symbol table
 *   numberOfSymbols: 0,           // No symbols
 *   sizeOfOptionalHeader: 224,    // Standard PE optional header
 *   characteristics: 0x0102,      // Executable, 32-bit
 * };
 *
 * const buffer = new Uint8Array(100);
 * const bytesWritten = peHeader.encode(header, buffer);
 * const [decoded, bytesRead] = peHeader.decode(buffer);
 * assertEquals(decoded, header);
 * assertEquals(bytesWritten, bytesRead);
 * ```
 */
export function u8le(): Coder<number> {
  return u8("le");
}
/**
 * Creates an s8 (signed 8-bit integer) coder with little-endian byte order
 * @returns Coder<number> with encode and decode functions
 */
export function s8le(): Coder<number> {
  return s8("le");
}
/**
 * Creates a f16 (16-bit floating point number) coder with little-endian byte order
 * @returns Coder<number> with encode and decode functions
 */
export function f16le(): Coder<number> {
  return f16("le");
}
/**
 * Creates a u16 (unsigned 16-bit integer) coder with little-endian byte order
 * @returns Coder<number> with encode and decode functions
 */
export function u16le(): Coder<number> {
  return u16("le");
}
/**
 * Creates an s16 (signed 16-bit integer) coder with little-endian byte order
 * @returns Coder<number> with encode and decode functions
 */
export function s16le(): Coder<number> {
  return s16("le");
}
/**
 * Creates a f32 (32-bit floating point number) coder with little-endian byte order
 * @returns Coder<number> with encode and decode functions
 */
export function f32le(): Coder<number> {
  return f32("le");
}
/**
 * Creates a u32 (unsigned 32-bit integer) coder with little-endian byte order
 * @returns Coder<number> with encode and decode functions
 */
export function u32le(): Coder<number> {
  return u32("le");
}
/**
 * Creates an s32 (signed 32-bit integer) coder with little-endian byte order
 * @returns Coder<number> with encode and decode functions
 */
export function s32le(): Coder<number> {
  return s32("le");
}
/**
 * Creates a f64 (64-bit floating point number) coder with little-endian byte order
 * @returns Coder<number> with encode and decode functions
 */
export function f64le(): Coder<number> {
  return f64("le");
}
/**
 * Creates a u64 (unsigned 64-bit integer) coder with little-endian byte order
 * @returns Coder<bigint> with encode and decode functions
 */
export function u64le(): Coder<bigint> {
  return u64("le");
}
/**
 * Creates an s64 (signed 64-bit integer) coder with little-endian byte order
 * @returns Coder<bigint> with encode and decode functions
 */
export function s64le(): Coder<bigint> {
  return s64("le");
}
