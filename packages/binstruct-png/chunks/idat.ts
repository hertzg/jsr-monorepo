import { decode, encode, type Refiner, string } from "@hertzg/binstruct";
import type { PngChunkUnknown } from "../mod.ts";
import {
  zlibUncompressedCoder,
  type ZlibUncompressedData,
} from "../zlib/zlib.ts";

/**
 * Refined IDAT (Image Data) chunk structure.
 *
 * The IDAT chunk contains the compressed image data. Multiple IDAT chunks
 * can appear in a PNG file, and their data should be concatenated before
 * decompression.
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import type { IdatChunk } from "@binstruct/png";
 *
 * const idat: IdatChunk = {
 *   length: 100,
 *   type: "IDAT",
 *   data: {
 *     header: {
 *       compressionMethod: 8,
 *       compressionInfo: 7,
 *       fcheck: 1,
 *       fdict: 0,
 *       flevel: 2,
 *     },
 *     uncompressed: new Uint8Array([4, 5, 6]),
 *     checksum: new Uint8Array([0x12, 0x34, 0x56, 0x78]),
 *   },
 *   crc: 0x87654321,
 * };
 *
 * assertEquals(idat.type, "IDAT");
 * assertEquals(idat.data.header.compressionMethod, 8);
 * ```
 */
export interface IdatChunk extends Omit<PngChunkUnknown, "type" | "data"> {
  /** Chunk type identifier, always "IDAT" */
  type: "IDAT";
  /** Decompressed zlib data structure */
  data: ZlibUncompressedData;
}

/**
 * Creates a refiner for IDAT (Image Data) chunks.
 *
 * This refiner transforms raw IDAT chunk bytes into a structured {@link IdatChunk}
 * object with decompressed image data.
 *
 * @returns A refiner that converts between raw chunks and {@link IdatChunk}.
 *
 * @example
 * ```ts
 * import { assert } from "@std/assert";
 * import { idatChunkRefiner } from "@binstruct/png";
 *
 * const refiner = idatChunkRefiner();
 * assert(typeof refiner.refine === "function");
 * assert(typeof refiner.unrefine === "function");
 * ```
 */
export function idatChunkRefiner(): Refiner<PngChunkUnknown, IdatChunk, []> {
  const typeCoder = string(4);
  const dataCoder = zlibUncompressedCoder();

  return {
    refine: (decoded: PngChunkUnknown, context): IdatChunk => {
      return {
        ...decoded,
        type: decode(typeCoder, decoded.type, context) as "IDAT",
        data: decode(dataCoder, decoded.data, context),
      };
    },
    unrefine: (refined: IdatChunk, context): PngChunkUnknown => {
      return {
        ...refined,
        type: encode(typeCoder, refined.type, context, new Uint8Array(4)),
        data: encode(
          dataCoder,
          refined.data,
          context,
        ),
      };
    },
  };
}
