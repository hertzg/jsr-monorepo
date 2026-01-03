import type { PngChunkUnknown } from "@binstruct/png";
import {
  decode,
  encode,
  type Refiner,
  string,
  struct,
  u32be,
  u8,
} from "@hertzg/binstruct";

/**
 * Refined IHDR (Image Header) chunk structure.
 *
 * The IHDR chunk is the first chunk in a PNG file and contains critical
 * image metadata including dimensions, bit depth, color type, and compression
 * settings.
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import type { IhdrChunk } from "@binstruct/png";
 *
 * const ihdr: IhdrChunk = {
 *   length: 13,
 *   type: "IHDR",
 *   data: {
 *     width: 100,
 *     height: 100,
 *     bitDepth: 8,
 *     colorType: 2,       // RGB
 *     compressionMethod: 0,
 *     filterMethod: 0,
 *     interlaceMethod: 0, // No interlacing
 *   },
 *   crc: 0x12345678,
 * };
 *
 * assertEquals(ihdr.data.width, 100);
 * assertEquals(ihdr.data.colorType, 2);
 * ```
 */
export interface IhdrChunk extends Omit<PngChunkUnknown, "type" | "data"> {
  /** Chunk type identifier, always "IHDR" */
  type: "IHDR";
  /** Parsed image header data */
  data: {
    /** Image width in pixels (1 to 2^31-1) */
    width: number;
    /** Image height in pixels (1 to 2^31-1) */
    height: number;
    /** Bit depth: 1, 2, 4, 8, or 16 depending on color type */
    bitDepth: number;
    /** Color type: 0=grayscale, 2=RGB, 3=indexed, 4=grayscale+alpha, 6=RGBA */
    colorType: number;
    /** Compression method, always 0 (deflate) */
    compressionMethod: number;
    /** Filter method, always 0 (adaptive filtering) */
    filterMethod: number;
    /** Interlace method: 0=none, 1=Adam7 */
    interlaceMethod: number;
  };
}

/**
 * Creates a refiner for IHDR (Image Header) chunks.
 *
 * This refiner transforms raw IHDR chunk bytes into a structured {@link IhdrChunk}
 * object with parsed image metadata fields.
 *
 * @returns A refiner that converts between raw chunks and {@link IhdrChunk}.
 *
 * @example
 * ```ts
 * import { assert } from "@std/assert";
 * import { ihdrChunkRefiner } from "@binstruct/png";
 *
 * const refiner = ihdrChunkRefiner();
 * assert(typeof refiner.refine === "function");
 * assert(typeof refiner.unrefine === "function");
 * ```
 */
export function ihdrChunkRefiner(): Refiner<PngChunkUnknown, IhdrChunk, []> {
  const typeCoder = string(4);
  const dataCoder = struct({
    width: u32be(), // 4
    height: u32be(), // 4
    bitDepth: u8(), // 1
    colorType: u8(), // 1
    compressionMethod: u8(), // 1
    filterMethod: u8(), // 1
    interlaceMethod: u8(), // 1
  }); // total 13

  return {
    refine: (decoded: PngChunkUnknown, context): IhdrChunk => {
      return {
        ...decoded,
        type: decode(typeCoder, decoded.type, context) as "IHDR",
        data: decode(dataCoder, decoded.data, context),
      };
    },
    unrefine: (refined: IhdrChunk, context) => {
      return {
        ...refined,
        type: encode(typeCoder, refined.type, context, new Uint8Array(4)),
        data: encode(dataCoder, refined.data, context, new Uint8Array(13)),
      };
    },
  };
}
