import {
  array,
  type Coder,
  decode,
  encode,
  type Refiner,
  string,
  struct,
  u8,
} from "@hertzg/binstruct";
import type { PngChunkUnknown } from "../mod.ts";

/**
 * Refined PLTE (Palette) chunk structure.
 *
 * The PLTE chunk contains the color palette for indexed-color PNG images
 * (color type 3). Each palette entry is an RGB triplet.
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import type { PlteChunk } from "@binstruct/png";
 *
 * const plte: PlteChunk = {
 *   length: 9,
 *   type: "PLTE",
 *   data: {
 *     colors: [
 *       [255, 0, 0],   // Red
 *       [0, 255, 0],   // Green
 *       [0, 0, 255],   // Blue
 *     ],
 *   },
 *   crc: 0x12345678,
 * };
 *
 * assertEquals(plte.data.colors.length, 3);
 * assertEquals(plte.data.colors[0], [255, 0, 0]);
 * ```
 */
export interface PlteChunk extends Omit<PngChunkUnknown, "type" | "data"> {
  /** Chunk type identifier, always "PLTE" */
  type: "PLTE";
  /** Parsed palette data */
  data: {
    /** Array of RGB color triplets (0-255 for each component) */
    colors: [number, number, number][];
  };
}

/**
 * Creates a refiner for PLTE (Palette) chunks.
 *
 * This refiner transforms raw PLTE chunk bytes into a structured {@link PlteChunk}
 * object with parsed RGB color triplets.
 *
 * @returns A refiner that converts between raw chunks and {@link PlteChunk}.
 *
 * @example
 * ```ts
 * import { assert } from "@std/assert";
 * import { plteChunkRefiner } from "@binstruct/png";
 *
 * const refiner = plteChunkRefiner();
 * assert(typeof refiner.refine === "function");
 * assert(typeof refiner.unrefine === "function");
 * ```
 */
export function plteChunkRefiner(): Refiner<PngChunkUnknown, PlteChunk, []> {
  const typeCoder = string(4);
  const rgpTupleCoder = array(u8(), 3) as unknown as Coder<
    [number, number, number]
  >; // total 3

  return {
    refine: (decoded: PngChunkUnknown, context): PlteChunk => {
      return {
        ...decoded,
        type: decode(typeCoder, decoded.type, context) as "PLTE",
        data: decode(
          struct({
            colors: array(rgpTupleCoder, Math.trunc(decoded.length / 3)),
          }),
          decoded.data,
          context,
        ),
      };
    },
    unrefine: (refined: PlteChunk, context): PngChunkUnknown => {
      return {
        ...refined,
        type: encode(typeCoder, refined.type, context, new Uint8Array(4)),
        data: encode(
          struct({
            colors: array(rgpTupleCoder, refined.data.colors.length),
          }),
          refined.data,
          context,
          new Uint8Array(refined.data.colors.length * 3),
        ),
      };
    },
  };
}
