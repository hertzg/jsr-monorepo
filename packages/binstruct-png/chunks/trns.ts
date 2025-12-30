import {
  array,
  decode,
  encode,
  type Refiner,
  string,
  u8,
} from "@hertzg/binstruct";
import type { PngChunkUnknown } from "../mod.ts";

/**
 * PNG tRNS (transparency) chunk structure.
 *
 * The tRNS chunk specifies transparency information for images without a full alpha channel.
 * The interpretation of the data depends on the image's color type (from IHDR chunk):
 *
 * - **Color type 0 (Grayscale)**: 2 bytes representing a single gray level value (u16be).
 *   Pixels matching this gray level are fully transparent, all others are opaque.
 *
 * - **Color type 2 (RGB)**: 6 bytes representing RGB values (3x u16be).
 *   Pixels matching this RGB color are fully transparent, all others are opaque.
 *
 * - **Color type 3 (Indexed)**: N bytes (1-256) representing alpha values for palette entries.
 *   Each byte is a u8 alpha value: 0 = fully transparent, 255 = fully opaque.
 *   Missing entries default to fully opaque.
 *
 * The tRNS chunk must appear after PLTE (if present) and before the first IDAT chunk.
 * It is prohibited for color types 4 and 6, which already have full alpha channels.
 *
 * @example Decoding indexed color transparency
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createContext } from "@hertzg/binstruct";
 * import type { PngChunkUnknown } from "../mod.ts";
 * import { trnsChunkRefiner } from "./trns.ts";
 *
 * const refiner = trnsChunkRefiner();
 * const context = createContext("decode");
 *
 * const unknownChunk: PngChunkUnknown = {
 *   length: 3,
 *   type: new Uint8Array([116, 82, 78, 83]), // "tRNS"
 *   data: new Uint8Array([0, 128, 255]), // 3 alpha values
 *   crc: 0x12345678,
 * };
 *
 * const refined = refiner.refine(unknownChunk, context);
 *
 * assertEquals(refined.type, "tRNS");
 * assertEquals(refined.data.values, [0, 128, 255]);
 * ```
 */
export interface TrnsChunk extends Omit<PngChunkUnknown, "type" | "data"> {
  /** Chunk type identifier, always "tRNS" */
  type: "tRNS";

  /** Transparency data */
  data: {
    /**
     * Raw transparency values as bytes.
     *
     * Interpretation depends on the image's color type:
     * - Color type 0: 2 bytes (u16be gray level)
     * - Color type 2: 6 bytes (3x u16be RGB values)
     * - Color type 3: 1-256 bytes (u8 alpha values for palette entries)
     */
    values: number[];
  };
}

/**
 * Creates a refiner for tRNS (transparency) chunks.
 *
 * Converts between raw binary tRNS chunks and structured TrnsChunk representations.
 * The refiner handles all three transparency formats (grayscale, RGB, indexed) by
 * storing raw byte values that can be interpreted based on the image's color type.
 *
 * @returns A refiner that converts between PngChunkUnknown and TrnsChunk
 *
 * @example Refining a grayscale transparency chunk
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createContext } from "@hertzg/binstruct";
 * import type { PngChunkUnknown } from "../mod.ts";
 * import { trnsChunkRefiner } from "./trns.ts";
 *
 * const refiner = trnsChunkRefiner();
 * const context = createContext("decode");
 *
 * const unknownChunk: PngChunkUnknown = {
 *   length: 2,
 *   type: new Uint8Array([116, 82, 78, 83]),
 *   data: new Uint8Array([128, 0]), // Gray level 32768 (0x8000) as u16be
 *   crc: 0xAABBCCDD,
 * };
 *
 * const refined = refiner.refine(unknownChunk, context);
 *
 * assertEquals(refined.type, "tRNS");
 * assertEquals(refined.data.values.length, 2);
 * assertEquals(refined.data.values[0], 128);
 * assertEquals(refined.data.values[1], 0);
 * ```
 *
 * @example Round-trip encoding and decoding
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createContext } from "@hertzg/binstruct";
 * import { type TrnsChunk, trnsChunkRefiner } from "./trns.ts";
 *
 * const refiner = trnsChunkRefiner();
 * const encodeContext = createContext("encode");
 * const decodeContext = createContext("decode");
 *
 * const original: TrnsChunk = {
 *   length: 3,
 *   type: "tRNS",
 *   data: {
 *     values: [0, 128, 255], // Alpha values for indexed color
 *   },
 *   crc: 0x12345678,
 * };
 *
 * const unrefined = refiner.unrefine(original, encodeContext);
 * const refined = refiner.refine(unrefined, decodeContext);
 *
 * assertEquals(refined.type, original.type);
 * assertEquals(refined.data.values, original.data.values);
 * ```
 */
export function trnsChunkRefiner(): Refiner<PngChunkUnknown, TrnsChunk, []> {
  const typeCoder = string(4);

  return {
    refine: (decoded: PngChunkUnknown, context): TrnsChunk => {
      const valuesCoder = array(u8(), decoded.length);
      return {
        ...decoded,
        type: decode(typeCoder, decoded.type, context) as "tRNS",
        data: {
          values: decode(valuesCoder, decoded.data, context),
        },
      };
    },
    unrefine: (refined: TrnsChunk, context): PngChunkUnknown => {
      const valuesCoder = array(u8(), refined.data.values.length);
      return {
        ...refined,
        type: encode(typeCoder, refined.type, context, new Uint8Array(4)),
        data: encode(
          valuesCoder,
          refined.data.values,
          context,
          new Uint8Array(refined.data.values.length),
        ),
      };
    },
  };
}
