/**
 * PNG gAMA (Image Gamma) chunk encoder/decoder.
 *
 * The gAMA chunk specifies the relationship between image samples and the intended
 * display output intensity using the gamma correction formula:
 *
 * ```
 * sample = display_output ^ gamma
 * ```
 *
 * The gamma value is encoded as an unsigned 32-bit integer representing `gamma × 100,000`.
 * For example, a gamma of 1/2.2 (≈0.45455) is stored as 45,455.
 *
 * Common gamma values:
 * - 45,455 (gamma ≈ 0.45455 or 1/2.2) - Standard CRT monitor
 * - 46,875 (gamma ≈ 0.46875 or 1/2.14) - Variant CRT
 * - 100,000 (gamma = 1.0) - Linear (no correction)
 *
 * The gAMA chunk must appear before the PLTE chunk (if present) and before the first
 * IDAT chunk. When an sRGB or iCCP chunk is present and recognized, it overrides the
 * gAMA chunk. However, including gAMA alongside sRGB/iCCP provides backward
 * compatibility for older decoders.
 *
 * Note: Gamma correction does NOT apply to the alpha channel, which is always linear.
 *
 * @example Basic gamma chunk decoding
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createContext } from "@hertzg/binstruct";
 * import type { PngChunkUnknown } from "../mod.ts";
 * import { gamaChunkRefiner } from "./gama.ts";
 *
 * const context = createContext("decode");
 * const refiner = gamaChunkRefiner();
 *
 * // gAMA chunk with gamma 1/2.2 (45455)
 * const unknownChunk: PngChunkUnknown = {
 *   length: 4,
 *   type: new Uint8Array([103, 65, 77, 65]), // "gAMA"
 *   // deno-fmt-ignore
 *   data: new Uint8Array([
 *     0x00, 0x00, 0xB1, 0x8F  // 45455 as u32be
 *   ]),
 *   crc: 0x12345678,
 * };
 *
 * const refined = refiner.refine(unknownChunk, context);
 *
 * assertEquals(refined.type, "gAMA");
 * assertEquals(refined.data.gamma, 45455);
 * assertEquals(refined.crc, 0x12345678);
 * ```
 *
 * @example Encoding a gamma chunk
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createContext } from "@hertzg/binstruct";
 * import { gamaChunkRefiner, type GamaChunk } from "./gama.ts";
 *
 * const context = createContext("encode");
 * const refiner = gamaChunkRefiner();
 *
 * const gamaChunk: GamaChunk = {
 *   length: 4,
 *   type: "gAMA",
 *   data: {
 *     gamma: 100000,  // Linear gamma (1.0)
 *   },
 *   crc: 0xAABBCCDD,
 * };
 *
 * const unrefined = refiner.unrefine(gamaChunk, context);
 *
 * assertEquals(unrefined.type, new Uint8Array([103, 65, 77, 65]));
 * assertEquals(unrefined.data.length, 4);
 * assertEquals(unrefined.data[0], 0x00);
 * assertEquals(unrefined.data[1], 0x01);
 * assertEquals(unrefined.data[2], 0x86);
 * assertEquals(unrefined.data[3], 0xA0);
 * ```
 *
 * @example Round-trip gamma conversion
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createContext } from "@hertzg/binstruct";
 * import { gamaChunkRefiner, type GamaChunk } from "./gama.ts";
 *
 * const encodeContext = createContext("encode");
 * const decodeContext = createContext("decode");
 * const refiner = gamaChunkRefiner();
 *
 * const original: GamaChunk = {
 *   length: 4,
 *   type: "gAMA",
 *   data: {
 *     gamma: 45455,  // 1/2.2
 *   },
 *   crc: 0x99887766,
 * };
 *
 * const unrefined = refiner.unrefine(original, encodeContext);
 * const refined = refiner.refine(unrefined, decodeContext);
 *
 * assertEquals(refined.type, original.type);
 * assertEquals(refined.data.gamma, original.data.gamma);
 * assertEquals(refined.crc, original.crc);
 * ```
 *
 * @module
 */

import {
  decode,
  encode,
  type Refiner,
  string,
  u32be,
} from "@hertzg/binstruct";
import type { PngChunkUnknown } from "../mod.ts";

/**
 * PNG gAMA chunk with gamma correction value.
 *
 * The gamma value is stored as `gamma × 100,000`. To convert to the actual gamma
 * value, divide by 100,000. For example:
 * - 45,455 represents gamma ≈ 0.45455 (1/2.2, standard CRT)
 * - 100,000 represents gamma = 1.0 (linear, no correction)
 */
export interface GamaChunk extends Omit<PngChunkUnknown, "type" | "data"> {
  /** Chunk type identifier */
  type: "gAMA";
  /** Gamma correction data */
  data: {
    /** Gamma value × 100,000 (u32be) */
    gamma: number;
  };
}

/**
 * Creates a refiner for converting between PngChunkUnknown and GamaChunk.
 *
 * The refiner handles encoding and decoding of the gAMA chunk, converting
 * between raw bytes and the structured gamma value.
 *
 * @returns A refiner for gAMA chunks
 *
 * @example Standard gamma refiner usage
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createContext } from "@hertzg/binstruct";
 * import type { PngChunkUnknown } from "../mod.ts";
 * import { gamaChunkRefiner } from "./gama.ts";
 *
 * const refiner = gamaChunkRefiner();
 * const context = createContext("decode");
 *
 * const unknownChunk: PngChunkUnknown = {
 *   length: 4,
 *   type: new Uint8Array([103, 65, 77, 65]),
 *   // deno-fmt-ignore
 *   data: new Uint8Array([0x00, 0x00, 0xB6, 0xD3]),  // 46,803
 *   crc: 0x11223344,
 * };
 *
 * const refined = refiner.refine(unknownChunk, context);
 *
 * assertEquals(refined.type, "gAMA");
 * assertEquals(refined.data.gamma, 46803);
 * ```
 *
 * @example Converting gamma values
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createContext } from "@hertzg/binstruct";
 * import { gamaChunkRefiner, type GamaChunk } from "./gama.ts";
 *
 * const refiner = gamaChunkRefiner();
 * const encodeCtx = createContext("encode");
 * const decodeCtx = createContext("decode");
 *
 * // Create chunk with gamma 2.2
 * const chunk: GamaChunk = {
 *   length: 4,
 *   type: "gAMA",
 *   data: { gamma: 220000 },  // 2.2 × 100,000
 *   crc: 0xAABBCCDD,
 * };
 *
 * const unrefined = refiner.unrefine(chunk, encodeCtx);
 * const refined = refiner.refine(unrefined, decodeCtx);
 *
 * assertEquals(refined.data.gamma, 220000);
 * ```
 *
 * @example Multiple gamma values
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createContext } from "@hertzg/binstruct";
 * import { gamaChunkRefiner, type GamaChunk } from "./gama.ts";
 *
 * const refiner = gamaChunkRefiner();
 * const encodeCtx = createContext("encode");
 * const decodeCtx = createContext("decode");
 *
 * const gammaValues = [45455, 46875, 100000, 220000];
 *
 * for (const gammaValue of gammaValues) {
 *   const chunk: GamaChunk = {
 *     length: 4,
 *     type: "gAMA",
 *     data: { gamma: gammaValue },
 *     crc: 0x12345678,
 *   };
 *
 *   const unrefined = refiner.unrefine(chunk, encodeCtx);
 *   const refined = refiner.refine(unrefined, decodeCtx);
 *
 *   assertEquals(refined.data.gamma, gammaValue);
 * }
 * ```
 */
export function gamaChunkRefiner(): Refiner<PngChunkUnknown, GamaChunk, []> {
  const typeCoder = string(4);
  const gammaCoder = u32be();

  return {
    refine: (decoded: PngChunkUnknown, context): GamaChunk => {
      return {
        ...decoded,
        type: decode(typeCoder, decoded.type, context) as "gAMA",
        data: {
          gamma: decode(gammaCoder, decoded.data, context),
        },
      };
    },
    unrefine: (refined: GamaChunk, context): PngChunkUnknown => {
      return {
        ...refined,
        type: encode(typeCoder, refined.type, context, new Uint8Array(4)),
        data: encode(gammaCoder, refined.data.gamma, context, new Uint8Array(4)),
      };
    },
  };
}
