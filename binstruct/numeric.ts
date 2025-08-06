import type { Coder } from "./mod.ts";

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
): Coder<number>;
function dataViewType(
  type:
    | "BigInt64"
    | "BigUint64",
  endianness: Endianness,
): Coder<bigint>;
function dataViewType<TValue extends number | bigint>(
  type: DataViewMethodSuffixes,
  endianness: Endianness,
): Coder<TValue> {
  const bits = Number(type.match(/[0-9]+$/)?.[0]!);

  if (isNaN(bits)) {
    throw new Error(`Unable to infer size from type ${type}`);
  }

  const bytes = Math.trunc(bits / 8);

  const methodSuffix = `${type}` as const;

  return {
    encode: (value, target, _context) => {
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
    decode: (encoded, _context) => {
      if (encoded.length < bytes) {
        throw new Error(`Need ${bytes} bytes, got ${encoded.length}`);
      }

      const dataView = new DataView(
        encoded.buffer,
        encoded.byteOffset,
        encoded.byteLength,
      );

      let value: TValue;
      switch (methodSuffix) {
        case "Uint8":
        case "Int8":
          value = dataView[`get${methodSuffix}`](0) as TValue;
          break;

        default:
          value = dataView[`get${methodSuffix}`](
            0,
            endianness === "le",
          ) as TValue;
          break;
      }

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
  return dataViewType("Uint8", endianness);
}

/**
 * Creates an s8 (signed 8-bit integer) parser/serializer
 * @param endianness - Endianness, defaults to "be" (big-endian)
 * @returns Coder<number> with encode and decode functions
 */
export function s8(
  endianness: Endianness = "be",
): Coder<number> {
  return dataViewType("Int8", endianness);
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
  return dataViewType("Uint16", endianness);
}

/**
 * Creates an s16 (signed 16-bit integer) parser/serializer
 * @param endianness - Endianness, defaults to "be" (big-endian)
 * @returns Coder<number> with encode and decode functions
 */
export function s16(
  endianness: Endianness = "be",
): Coder<number> {
  return dataViewType("Int16", endianness);
}

/**
 * Creates a f16 (16-bit floating point number) parser/serializer
 * @param endianness - Endianness, defaults to "be" (big-endian)
 * @returns Coder<number> with encode and decode functions
 */
export function f16(
  endianness: Endianness = "be",
): Coder<number> {
  return dataViewType("Float16", endianness);
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
  return dataViewType("Uint32", endianness);
}

/**
 * Creates an s32 (signed 32-bit integer) parser/serializer
 * @param endianness - Endianness, defaults to "be" (big-endian)
 * @returns Coder<number> with encode and decode functions
 */
export function s32(
  endianness: Endianness = "be",
): Coder<number> {
  return dataViewType("Int32", endianness);
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
  return dataViewType("Float32", endianness);
}

/**
 * Creates a u64 (unsigned 64-bit integer) parser/serializer
 * @param endianness - Endianness, defaults to "be" (big-endian)
 * @returns Coder<bigint> with encode and decode functions
 */
export function u64(
  endianness: Endianness = "be",
): Coder<bigint> {
  return dataViewType("BigUint64", endianness);
}

/**
 * Creates an s64 (signed 64-bit integer) parser/serializer
 * @param endianness - Endianness, defaults to "be" (big-endian)
 * @returns Coder<bigint> with encode and decode functions
 */
export function s64(
  endianness: Endianness = "be",
): Coder<bigint> {
  return dataViewType("BigInt64", endianness);
}

/**
 * Creates a f64 (64-bit floating point number) parser/serializer
 * @param endianness - Endianness, defaults to "be" (big-endian)
 * @returns Coder<number> with encode and decode functions
 */
export function f64(
  endianness: Endianness = "be",
): Coder<number> {
  return dataViewType("Float64", endianness);
}

/**
 * Big-endian aliases for convenience
 */
/**
 * Creates a u8 (unsigned 8-bit integer) coder with big-endian byte order
 * @returns Coder<number> with encode and decode functions
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
 * Little-endian aliases for convenience
 */
/**
 * Creates a u8 (unsigned 8-bit integer) coder with little-endian byte order
 * @returns Coder<number> with encode and decode functions
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
