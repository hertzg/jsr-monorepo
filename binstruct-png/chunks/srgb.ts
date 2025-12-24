/**
 * PNG sRGB (Standard RGB Color Space) chunk encoder/decoder.
 *
 * The sRGB chunk indicates that the image samples conform to the IEC 61966-2-1
 * sRGB color space standard and specifies the rendering intent for color
 * matching. This chunk provides explicit color management without requiring
 * complex ICC profiles.
 *
 * When present and recognized, the sRGB chunk overrides the gAMA and cHRM chunks.
 * However, PNG encoders should include matching gAMA and cHRM chunks alongside
 * sRGB for backward compatibility with applications that don't recognize sRGB.
 *
 * The chunk contains a single byte with one of four rendering intent values
 * defined by the International Color Consortium:
 *
 * - **0 (Perceptual)**: For images requiring pleasing color appearance,
 *   optimized for photographs
 * - **1 (Relative Colorimetric)**: Preserves color appearance relative to
 *   white point, best for logos and graphics with specific colors
 * - **2 (Saturation)**: Preserves saturation at the expense of hue and
 *   lightness, ideal for business graphics, charts, and graphs
 * - **3 (Absolute Colorimetric)**: Preserves absolute colorimetry exactly,
 *   used for proofs and previews for other output devices
 *
 * The sRGB chunk must appear before the PLTE chunk (if present) and before
 * the first IDAT chunk. It should not be present in conjunction with an
 * iCCP chunk, as they provide mutually exclusive color space specifications.
 *
 * Note: sRGB only applies to color images (PNG color types 2, 3, and 6),
 * not grayscale images (color types 0 and 4).
 *
 * @example Basic sRGB chunk decoding
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createContext } from "@hertzg/binstruct";
 * import type { PngChunkUnknown } from "../mod.ts";
 * import { srgbChunkRefiner } from "./srgb.ts";
 *
 * const context = createContext("decode");
 * const refiner = srgbChunkRefiner();
 *
 * // sRGB chunk with perceptual rendering intent
 * const unknownChunk: PngChunkUnknown = {
 *   length: 1,
 *   type: new Uint8Array([115, 82, 71, 66]), // "sRGB"
 *   data: new Uint8Array([0]),  // Perceptual
 *   crc: 0x12345678,
 * };
 *
 * const refined = refiner.refine(unknownChunk, context);
 *
 * assertEquals(refined.type, "sRGB");
 * assertEquals(refined.data.renderingIntent, 0);
 * assertEquals(refined.crc, 0x12345678);
 * ```
 *
 * @example Encoding an sRGB chunk
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createContext } from "@hertzg/binstruct";
 * import { srgbChunkRefiner, type SrgbChunk } from "./srgb.ts";
 *
 * const context = createContext("encode");
 * const refiner = srgbChunkRefiner();
 *
 * const srgbChunk: SrgbChunk = {
 *   length: 1,
 *   type: "sRGB",
 *   data: {
 *     renderingIntent: 1,  // Relative colorimetric
 *   },
 *   crc: 0xAABBCCDD,
 * };
 *
 * const unrefined = refiner.unrefine(srgbChunk, context);
 *
 * assertEquals(unrefined.type, new Uint8Array([115, 82, 71, 66]));
 * assertEquals(unrefined.data.length, 1);
 * assertEquals(unrefined.data[0], 1);
 * ```
 *
 * @example All rendering intents
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createContext } from "@hertzg/binstruct";
 * import { srgbChunkRefiner, type SrgbChunk } from "./srgb.ts";
 *
 * const refiner = srgbChunkRefiner();
 * const encodeCtx = createContext("encode");
 * const decodeCtx = createContext("decode");
 *
 * const intents = [
 *   { value: 0, name: "Perceptual" },
 *   { value: 1, name: "Relative" },
 *   { value: 2, name: "Saturation" },
 *   { value: 3, name: "Absolute" },
 * ];
 *
 * for (const intent of intents) {
 *   const chunk: SrgbChunk = {
 *     length: 1,
 *     type: "sRGB",
 *     data: { renderingIntent: intent.value },
 *     crc: 0x12345678,
 *   };
 *
 *   const unrefined = refiner.unrefine(chunk, encodeCtx);
 *   const refined = refiner.refine(unrefined, decodeCtx);
 *
 *   assertEquals(refined.data.renderingIntent, intent.value);
 * }
 * ```
 *
 * @module
 */

import {
  decode,
  encode,
  type Refiner,
  string,
  u8,
} from "@hertzg/binstruct";
import type { PngChunkUnknown } from "../mod.ts";

/**
 * PNG sRGB chunk with rendering intent.
 *
 * The rendering intent specifies how colors should be converted when the
 * source and destination color spaces differ:
 * - 0: Perceptual (photographs)
 * - 1: Relative colorimetric (logos, graphics)
 * - 2: Saturation (business graphics, charts)
 * - 3: Absolute colorimetric (proofs, previews)
 */
export interface SrgbChunk extends Omit<PngChunkUnknown, "type" | "data"> {
  /** Chunk type identifier */
  type: "sRGB";
  /** sRGB rendering intent data */
  data: {
    /** Rendering intent (0-3) */
    renderingIntent: number;
  };
}

/**
 * Creates a refiner for converting between PngChunkUnknown and SrgbChunk.
 *
 * The refiner handles encoding and decoding of the sRGB chunk, converting
 * between raw bytes and the structured rendering intent value.
 *
 * @returns A refiner for sRGB chunks
 *
 * @example Standard sRGB refiner usage
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createContext } from "@hertzg/binstruct";
 * import type { PngChunkUnknown } from "../mod.ts";
 * import { srgbChunkRefiner } from "./srgb.ts";
 *
 * const refiner = srgbChunkRefiner();
 * const context = createContext("decode");
 *
 * const unknownChunk: PngChunkUnknown = {
 *   length: 1,
 *   type: new Uint8Array([115, 82, 71, 66]),
 *   data: new Uint8Array([2]),  // Saturation
 *   crc: 0x11223344,
 * };
 *
 * const refined = refiner.refine(unknownChunk, context);
 *
 * assertEquals(refined.type, "sRGB");
 * assertEquals(refined.data.renderingIntent, 2);
 * ```
 *
 * @example Round-trip conversion
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createContext } from "@hertzg/binstruct";
 * import { srgbChunkRefiner, type SrgbChunk } from "./srgb.ts";
 *
 * const refiner = srgbChunkRefiner();
 * const encodeCtx = createContext("encode");
 * const decodeCtx = createContext("decode");
 *
 * const chunk: SrgbChunk = {
 *   length: 1,
 *   type: "sRGB",
 *   data: { renderingIntent: 3 },  // Absolute
 *   crc: 0xAABBCCDD,
 * };
 *
 * const unrefined = refiner.unrefine(chunk, encodeCtx);
 * const refined = refiner.refine(unrefined, decodeCtx);
 *
 * assertEquals(refined.data.renderingIntent, 3);
 * assertEquals(refined.crc, 0xAABBCCDD);
 * ```
 *
 * @example Testing all intent values
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createContext } from "@hertzg/binstruct";
 * import { srgbChunkRefiner, type SrgbChunk } from "./srgb.ts";
 *
 * const refiner = srgbChunkRefiner();
 * const encodeCtx = createContext("encode");
 * const decodeCtx = createContext("decode");
 *
 * for (let intent = 0; intent <= 3; intent++) {
 *   const chunk: SrgbChunk = {
 *     length: 1,
 *     type: "sRGB",
 *     data: { renderingIntent: intent },
 *     crc: 0x12345678,
 *   };
 *
 *   const unrefined = refiner.unrefine(chunk, encodeCtx);
 *   const refined = refiner.refine(unrefined, decodeCtx);
 *
 *   assertEquals(refined.data.renderingIntent, intent);
 *   assertEquals(unrefined.data[0], intent);
 * }
 * ```
 */
export function srgbChunkRefiner(): Refiner<PngChunkUnknown, SrgbChunk, []> {
  const typeCoder = string(4);
  const renderingIntentCoder = u8();

  return {
    refine: (decoded: PngChunkUnknown, context): SrgbChunk => {
      return {
        ...decoded,
        type: decode(typeCoder, decoded.type, context) as "sRGB",
        data: {
          renderingIntent: decode(renderingIntentCoder, decoded.data, context),
        },
      };
    },
    unrefine: (refined: SrgbChunk, context): PngChunkUnknown => {
      return {
        ...refined,
        type: encode(typeCoder, refined.type, context, new Uint8Array(4)),
        data: encode(renderingIntentCoder, refined.data.renderingIntent, context, new Uint8Array(1)),
      };
    },
  };
}
