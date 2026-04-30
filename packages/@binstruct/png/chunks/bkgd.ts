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
 * PNG bKGD (background color) chunk structure.
 *
 * The bKGD chunk specifies a default background color for displaying PNG images.
 * The interpretation of the data depends on the image's color type (from IHDR chunk):
 *
 * - **Color type 0, 4 (Grayscale)**: 2 bytes representing a gray level value (u16be).
 *   This value should be used as the background when displaying the image.
 *
 * - **Color type 2, 6 (RGB)**: 6 bytes representing RGB values (3x u16be).
 *   These values specify the background red, green, and blue components.
 *
 * - **Color type 3 (Indexed)**: 1 byte representing a palette index (u8).
 *   This index references an entry in the PLTE chunk to use as background.
 *
 * The bKGD chunk must appear before the first IDAT chunk.
 * For indexed color (type 3), it must also appear after the PLTE chunk.
 *
 * @example Decoding indexed color background
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createContext } from "@hertzg/binstruct";
 * import type { PngChunkUnknown } from "../mod.ts";
 * import { bkgdChunkRefiner } from "./bkgd.ts";
 *
 * const refiner = bkgdChunkRefiner();
 * const context = createContext("decode");
 *
 * const unknownChunk: PngChunkUnknown = {
 *   length: 1,
 *   type: new Uint8Array([98, 75, 71, 68]), // "bKGD"
 *   data: new Uint8Array([5]), // Palette index 5
 *   crc: 0x12345678,
 * };
 *
 * const refined = refiner.refine(unknownChunk, context);
 *
 * assertEquals(refined.type, "bKGD");
 * assertEquals(refined.data.values, [5]);
 * ```
 *
 * @example Decoding RGB background
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createContext } from "@hertzg/binstruct";
 * import type { PngChunkUnknown } from "../mod.ts";
 * import { bkgdChunkRefiner } from "./bkgd.ts";
 *
 * const refiner = bkgdChunkRefiner();
 * const context = createContext("decode");
 *
 * const unknownChunk: PngChunkUnknown = {
 *   length: 6,
 *   type: new Uint8Array([98, 75, 71, 68]), // "bKGD"
 *   data: new Uint8Array([0, 255, 0, 255, 0, 255]), // White RGB
 *   crc: 0xAABBCCDD,
 * };
 *
 * const refined = refiner.refine(unknownChunk, context);
 *
 * assertEquals(refined.type, "bKGD");
 * assertEquals(refined.data.values.length, 6);
 * assertEquals(refined.data.values, [0, 255, 0, 255, 0, 255]);
 * ```
 *
 * @example Decoding grayscale background
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createContext } from "@hertzg/binstruct";
 * import type { PngChunkUnknown } from "../mod.ts";
 * import { bkgdChunkRefiner } from "./bkgd.ts";
 *
 * const refiner = bkgdChunkRefiner();
 * const context = createContext("decode");
 *
 * const unknownChunk: PngChunkUnknown = {
 *   length: 2,
 *   type: new Uint8Array([98, 75, 71, 68]), // "bKGD"
 *   data: new Uint8Array([171, 132]), // Gray level 43908 as u16be
 *   crc: 0x99887766,
 * };
 *
 * const refined = refiner.refine(unknownChunk, context);
 *
 * assertEquals(refined.type, "bKGD");
 * assertEquals(refined.data.values, [171, 132]);
 * ```
 */
export interface BkgdChunk extends Omit<PngChunkUnknown, "type" | "data"> {
  /** Chunk type identifier, always "bKGD" */
  type: "bKGD";

  /** Background color data */
  data: {
    /**
     * Raw background color values as bytes.
     *
     * Interpretation depends on the image's color type:
     * - Color type 0, 4: 2 bytes (u16be gray level)
     * - Color type 2, 6: 6 bytes (3x u16be RGB values)
     * - Color type 3: 1 byte (u8 palette index)
     */
    values: number[];
  };
}

/**
 * Creates a refiner for bKGD (background color) chunks.
 *
 * Converts between raw binary bKGD chunks and structured BkgdChunk representations.
 * The refiner handles all three background color formats (grayscale, RGB, indexed) by
 * storing raw byte values that can be interpreted based on the image's color type.
 *
 * @returns A refiner that converts between PngChunkUnknown and BkgdChunk
 *
 * @example Refining a grayscale background chunk
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createContext } from "@hertzg/binstruct";
 * import type { PngChunkUnknown } from "../mod.ts";
 * import { bkgdChunkRefiner } from "./bkgd.ts";
 *
 * const refiner = bkgdChunkRefiner();
 * const context = createContext("decode");
 *
 * const unknownChunk: PngChunkUnknown = {
 *   length: 2,
 *   type: new Uint8Array([98, 75, 71, 68]),
 *   data: new Uint8Array([128, 0]), // Gray level 32768 (0x8000) as u16be
 *   crc: 0xAABBCCDD,
 * };
 *
 * const refined = refiner.refine(unknownChunk, context);
 *
 * assertEquals(refined.type, "bKGD");
 * assertEquals(refined.data.values.length, 2);
 * assertEquals(refined.data.values[0], 128);
 * assertEquals(refined.data.values[1], 0);
 * ```
 *
 * @example Refining an RGB background chunk
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createContext } from "@hertzg/binstruct";
 * import type { PngChunkUnknown } from "../mod.ts";
 * import { bkgdChunkRefiner } from "./bkgd.ts";
 *
 * const refiner = bkgdChunkRefiner();
 * const context = createContext("decode");
 *
 * const unknownChunk: PngChunkUnknown = {
 *   length: 6,
 *   type: new Uint8Array([98, 75, 71, 68]),
 *   data: new Uint8Array([255, 255, 255, 255, 0, 0]), // Yellow
 *   crc: 0x11223344,
 * };
 *
 * const refined = refiner.refine(unknownChunk, context);
 *
 * assertEquals(refined.type, "bKGD");
 * assertEquals(refined.data.values, [255, 255, 255, 255, 0, 0]);
 * ```
 *
 * @example Round-trip encoding and decoding
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createContext } from "@hertzg/binstruct";
 * import { type BkgdChunk, bkgdChunkRefiner } from "./bkgd.ts";
 *
 * const refiner = bkgdChunkRefiner();
 * const encodeContext = createContext("encode");
 * const decodeContext = createContext("decode");
 *
 * const original: BkgdChunk = {
 *   length: 1,
 *   type: "bKGD",
 *   data: {
 *     values: [42], // Palette index for indexed color
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
export function bkgdChunkRefiner(): Refiner<PngChunkUnknown, BkgdChunk, []> {
  const typeCoder = string(4);

  return {
    refine: (decoded: PngChunkUnknown, context): BkgdChunk => {
      const valuesCoder = array(u8(), decoded.length);
      return {
        ...decoded,
        type: decode(typeCoder, decoded.type, context) as "bKGD",
        data: {
          values: decode(valuesCoder, decoded.data, context),
        },
      };
    },
    unrefine: (refined: BkgdChunk, context): PngChunkUnknown => {
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
