/**
 * A module providing type-safe binary structure encoding and decoding utilities for TypeScript.
 *
 * The following data types are supported:
 * - Unsigned integers: 8, 16, 32, 64 bits (big-endian and little-endian)
 * - Signed integers: 8, 16, 32, 64 bits (big-endian and little-endian)
 * - Floating point numbers: 16, 32, 64 bits (big-endian and little-endian)
 * - Strings: length-prefixed, null-terminated, and fixed-length
 * - Arrays: variable-length arrays (length-prefixed), and fixed-length arrays
 * - Structs: complex nested data structures
 * - References: support for referencing values within the context (see {@link ref})
 *
 * To encode data to binary, use the various coder functions and call their `encode` method.
 * To decode data from binary, use the same coder functions and call their `decode` method.
 *
 * The module provides the following main functions:
 * - {@link struct}: Create coders for structured data (objects)
 * - {@link arrayLP}: Create coders for length-prefixed arrays
 * - {@link arrayFL}: Create coders for fixed-length arrays
 * - {@link stringLP}: Create coders for length-prefixed strings
 * - {@link stringNT}: Create coders for null-terminated strings
 * - {@link stringFL}: Create coders for fixed-length strings
 * - {@link ref}: Create reference values for context-aware encoding/decoding
 *
 * - Numeric coders:
 *   - {@link u8}, {@link u8le}, {@link u8be}: Unsigned 8-bit integer
 *   - {@link s8}, {@link s8le}, {@link s8be}: Signed 8-bit integer
 *   - {@link u16}, {@link u16le}, {@link u16be}: Unsigned 16-bit integer
 *   - {@link s16}, {@link s16le}, {@link s16be}: Signed 16-bit integer
 *   - {@link u32}, {@link u32le}, {@link u32be}: Unsigned 32-bit integer
 *   - {@link s32}, {@link s32le}, {@link s32be}: Signed 32-bit integer
 *   - {@link u64}, {@link u64le}, {@link u64be}: Unsigned 64-bit integer (bigint)
 *   - {@link s64}, {@link s64le}, {@link s64be}: Signed 64-bit integer (bigint)
 *   - {@link f16}, {@link f16le}, {@link f16be}: 16-bit floating point number
 *   - {@link f32}, {@link f32le}, {@link f32be}: 32-bit floating point number
 *   - {@link f64}, {@link f64le}, {@link f64be}: 64-bit floating point number
 *
 * @example Reading and writing BMP file headers:
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { struct } from "@hertzg/binstruct/struct";
 * import { u16le, u32le, s32le } from "@hertzg/binstruct/numeric";
 *
 * // Define BMP file header structure (little-endian format)
 * const bmpHeaderCoder = struct({
 *   // BMP file signature
 *   signature: u16le(), // "BM" (0x4D42)
 *   fileSize: u32le(),  // Size of the BMP file in bytes
 *   reserved1: u16le(), // Reserved field (must be 0)
 *   reserved2: u16le(), // Reserved field (must be 0)
 *   dataOffset: u32le(), // Offset to image data
 * });
 *
 * // Define DIB header structure (BITMAPINFOHEADER format)
 * const dibHeaderCoder = struct({
 *   headerSize: u32le(),     // Size of DIB header (40 bytes for BITMAPINFOHEADER)
 *   width: s32le(),          // Image width in pixels
 *   height: s32le(),         // Image height in pixels (positive = bottom-up)
 *   colorPlanes: u16le(),    // Number of color planes (must be 1)
 *   bitsPerPixel: u16le(),   // Bits per pixel (1, 4, 8, 16, 24, 32)
 *   compression: u32le(),     // Compression method (0 = none)
 *   imageSize: u32le(),      // Size of image data in bytes
 *   xPixelsPerMeter: s32le(), // Horizontal resolution (pixels per meter)
 *   yPixelsPerMeter: s32le(), // Vertical resolution (pixels per meter)
 *   colorsInPalette: u32le(), // Number of colors in palette (0 = 2^n)
 *   importantColors: u32le(), // Number of important colors (0 = all)
 * });
 *
 * // Define complete BMP file structure
 * const bmpFileCoder = struct({
 *   header: bmpHeaderCoder,
 *   dibHeader: dibHeaderCoder,
 *   // Note: Pixel data would be added here in a real implementation
 * });
 *
 * // Create a sample BMP file data
 * const bmpData = {
 *   header: {
 *     signature: 0x4D42, // "BM"
 *     fileSize: 54,      // Header size (14 + 40 bytes)
 *     reserved1: 0,
 *     reserved2: 0,
 *     dataOffset: 54,    // Offset to pixel data
 *   },
 *   dibHeader: {
 *     headerSize: 40,           // BITMAPINFOHEADER size
 *     width: 100,               // 100 pixels wide
 *     height: 100,              // 100 pixels tall
 *     colorPlanes: 1,           // Single color plane
 *     bitsPerPixel: 24,         // 24-bit color (RGB)
 *     compression: 0,            // No compression
 *     imageSize: 30000,         // 100 * 100 * 3 bytes
 *     xPixelsPerMeter: 2835,    // 72 DPI equivalent
 *     yPixelsPerMeter: 2835,    // 72 DPI equivalent
 *     colorsInPalette: 0,       // No palette for 24-bit
 *     importantColors: 0,       // All colors important
 *   },
 * };
 *
 * // Encode BMP data to binary
 * const buffer = new Uint8Array(1024);
 * const bytesWritten = bmpFileCoder.encode(bmpData, buffer);
 *
 * // Decode BMP data from binary
 * const [decoded, bytesRead] = bmpFileCoder.decode(buffer);
 * assertEquals(decoded, bmpData, 'BMP data should be identical after roundtrip');
 * assertEquals(bytesWritten, bytesRead, 'bytes written should equal bytes read');
 *
 * // Verify BMP signature
 * assertEquals(decoded.header.signature, 0x4D42, 'BMP signature should be "BM"');
 * assertEquals(decoded.dibHeader.bitsPerPixel, 24, 'Should be 24-bit color');
 * ```
 * @module
 */

export type ValueWithBytes<T> = [T, number];

export type Context = {
  direction: "encode" | "decode";
  refs: WeakMap<object, unknown>;
};

/**
 * Creates a default context for encoding or decoding operations.
 *
 * @param direction - The direction of the operation ("encode" or "decode")
 * @returns A new Context with the specified direction and an empty refs WeakMap
 */
export function createContext(direction: "encode" | "decode"): Context {
  return {
    direction,
    refs: new WeakMap(),
  };
}

export type Encoder<TDecoded> = (
  decoded: TDecoded,
  target: Uint8Array,
  context?: Context,
) => number;
export type Decoder<TDecoded> = (
  encoded: Uint8Array,
  context?: Context,
) => ValueWithBytes<TDecoded>;

export type Coder<TDecoded> = {
  encode: Encoder<TDecoded>;
  decode: Decoder<TDecoded>;
};

/**
 * Type guard to check if a value is a Coder.
 *
 * @param value - The value to check
 * @returns True if the value is a Coder, false otherwise
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { isCoder } from "@hertzg/binstruct";
 * import { u16le, u32le } from "@hertzg/binstruct/numeric";
 * import { struct } from "@hertzg/binstruct/struct";
 *
 * // Example: Dynamic coder selection based on runtime type checking
 * function createFlexibleCoder(value: unknown) {
 *   if (isCoder(value)) {
 *     // TypeScript now knows value is a Coder<unknown>
 *     // We can use it directly or with type assertion for specific types
 *     return value;
 *   } else {
 *     // Fallback to a default coder
 *     return u16le();
 *   }
 * }
 *
 * // Example: Processing different coder types
 * const numericCoder = u16le();
 * const structCoder = struct({ id: u32le(), value: u16le() });
 *
 * // Type-safe coder usage after type guard
 * if (isCoder(numericCoder)) {
 *   const buffer = new Uint8Array(100);
 *   const bytes = numericCoder.encode(42, buffer);
 *   const [decoded, bytesRead] = numericCoder.decode(buffer);
 *   assertEquals(decoded, 42);
 *   assertEquals(bytes, bytesRead);
 * }
 *
 * // The type guard works with any coder type
 * assertEquals(isCoder(numericCoder), true);
 * assertEquals(isCoder(structCoder), true);
 * assertEquals(isCoder("not a coder"), false);
 * assertEquals(isCoder(null), false);
 * assertEquals(isCoder(undefined), false);
 * ```
 */
export function isCoder<TDecoded>(value: unknown): value is Coder<TDecoded> {
  return (
    typeof value === "object" &&
    value !== null &&
    "encode" in value &&
    "decode" in value &&
    typeof value.encode === "function" &&
    typeof value.decode === "function"
  );
}

export * from "./array.ts";
export * from "./numeric.ts";
export * from "./string.ts";
export * from "./struct.ts";
export * from "./length.ts";
export { ref, type RefValue } from "./ref.ts";
