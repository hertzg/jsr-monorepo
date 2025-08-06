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
 * - {@link arrayLP}: Create coders for arrays
 * - Numeric coders: `u8`, `u16`, `u32`, `u64`, `s8`, `s16`, `s32`, `s64`, `f16`, `f32`, `f64`
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
  refs: WeakMap<Coder<unknown>, unknown>;
};

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

export * from "./array.ts";
export * from "./numeric.ts";
export * from "./string.ts";
export * from "./struct.ts";
export * from "./ref.ts";
