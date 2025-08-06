import type { Coder } from "./mod.ts";

/**
 * Creates a Coder for structured data from an object of property names to coders.
 *
 * The struct is encoded by encoding each property in order, and decoded by
 * decoding each property in order and constructing an object.
 *
 * @param schema - Object where keys are property names and values are coders
 * @returns A Coder that can encode/decode objects matching the schema
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { struct } from "@hertzg/binstruct/struct";
 * import { u16le, u32le, s32le } from "@hertzg/binstruct/numeric";
 *
 * // Define BMP file header structure (little-endian format)
 * const bmpHeaderCoder = struct({
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
 * // Create sample BMP data
 * const bmpData = {
 *   signature: 0x4D42, // "BM"
 *   fileSize: 54,      // Header size (14 + 40 bytes)
 *   reserved1: 0,
 *   reserved2: 0,
 *   dataOffset: 54,    // Offset to pixel data
 * };
 *
 * const buffer = new Uint8Array(100);
 * const bytesWritten = bmpHeaderCoder.encode(bmpData, buffer);
 * const [decoded, bytesRead] = bmpHeaderCoder.decode(buffer);
 * assertEquals(decoded, bmpData);
 * assertEquals(bytesWritten, bytesRead);
 * ```
 */
// deno-lint-ignore no-explicit-any
export function struct<T extends Record<string, Coder<any>>>(
  schema: T,
): Coder<{ [K in keyof T]: T[K] extends Coder<infer U> ? U : never }> {
  const keys = Object.keys(schema) as (keyof T)[];

  return {
    encode: (decoded, target, context) => {
      let cursor = 0;
      for (const key of keys) {
        const coder = schema[key];
        cursor += coder.encode(decoded[key], target.subarray(cursor), context);
      }
      return cursor;
    },
    decode: (encoded, context) => {
      let cursor = 0;
      const result = {} as {
        [K in keyof T]: T[K] extends Coder<infer U> ? U : never;
      };

      for (const key of keys) {
        const coder = schema[key];
        const [value, bytesRead] = coder.decode(
          encoded.subarray(cursor),
          context,
        );
        cursor += bytesRead;
        result[key] = value;
      }

      return [result, cursor];
    },
  };
}
