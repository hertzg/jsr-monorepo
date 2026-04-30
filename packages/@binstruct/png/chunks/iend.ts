import { decode, encode, type Refiner, string } from "@hertzg/binstruct";
import type { PngChunkUnknown } from "../mod.ts";

/**
 * Refined IEND (Image End) chunk structure.
 *
 * The IEND chunk marks the end of the PNG datastream. It has no data field
 * and must be the last chunk in the file.
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import type { IendChunk } from "@binstruct/png";
 *
 * const iend: IendChunk = {
 *   length: 0,
 *   type: "IEND",
 *   crc: 0xAE426082, // Standard IEND CRC
 * };
 *
 * assertEquals(iend.type, "IEND");
 * assertEquals(iend.length, 0);
 * ```
 */
export interface IendChunk extends Omit<PngChunkUnknown, "type" | "data"> {
  /** Chunk type identifier, always "IEND" */
  type: "IEND";
  /** CRC checksum (always the same for IEND since data is empty) */
  crc: number;
}

/**
 * Creates a refiner for IEND (Image End) chunks.
 *
 * This refiner transforms raw IEND chunk bytes into a structured {@link IendChunk}
 * object. Since IEND has no data, this simply converts the type field.
 *
 * @returns A refiner that converts between raw chunks and {@link IendChunk}.
 *
 * @example
 * ```ts
 * import { assert } from "@std/assert";
 * import { iendChunkRefiner } from "@binstruct/png";
 *
 * const refiner = iendChunkRefiner();
 * assert(typeof refiner.refine === "function");
 * assert(typeof refiner.unrefine === "function");
 * ```
 */
export function iendChunkRefiner(): Refiner<PngChunkUnknown, IendChunk, []> {
  const typeCoder = string(4);

  return {
    refine: (decoded: PngChunkUnknown, context): IendChunk => {
      return {
        length: decoded.length,
        type: decode(typeCoder, decoded.type, context) as "IEND",
        crc: decoded.crc,
      };
    },
    unrefine: (refined: IendChunk, context): PngChunkUnknown => {
      return {
        length: refined.length,
        type: encode(typeCoder, refined.type, context, new Uint8Array(4)),
        data: new Uint8Array(0),
        crc: refined.crc,
      };
    },
  };
}
