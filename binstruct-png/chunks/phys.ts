/**
 * PNG pHYs (Physical Pixel Dimensions) chunk encoder/decoder.
 *
 * The pHYs chunk specifies the intended pixel size or aspect ratio for display
 * or printing. It contains three fields: pixels per unit in the X direction,
 * pixels per unit in the Y direction, and a unit specifier.
 *
 * **Unit Specifier Values:**
 * - **0 (Unknown)**: The X and Y values represent aspect ratio only, not absolute
 *   physical size. Use this when pixel aspect ratio matters but absolute size doesn't.
 * - **1 (Meter)**: The X and Y values represent pixels per meter (PPM). Use this
 *   to specify DPI or physical dimensions.
 *
 * **DPI Conversions:**
 * When unit = 1 (meter), convert between pixels-per-meter and DPI:
 * - `DPI = pixels_per_meter × 0.0254`
 * - `PPM = DPI × 39.3701`
 *
 * **Common DPI Values (as pixels per meter):**
 * - 72 DPI = 2,835 PPM (screen display, web)
 * - 96 DPI = 3,780 PPM (standard monitor, Windows default)
 * - 150 DPI = 5,906 PPM (medium-quality print)
 * - 300 DPI = 11,811 PPM (high-quality print)
 * - 600 DPI = 23,622 PPM (premium print quality)
 *
 * The pHYs chunk must appear before the first IDAT chunk. It has no ordering
 * restrictions relative to other ancillary chunks.
 *
 * @example Basic pHYs chunk decoding
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createContext } from "@hertzg/binstruct";
 * import type { PngChunkUnknown } from "../mod.ts";
 * import { physChunkRefiner } from "./phys.ts";
 *
 * const context = createContext("decode");
 * const refiner = physChunkRefiner();
 *
 * // pHYs chunk with 96 DPI (3780 PPM)
 * const unknownChunk: PngChunkUnknown = {
 *   length: 9,
 *   type: new Uint8Array([112, 72, 89, 115]), // "pHYs"
 *   // deno-fmt-ignore
 *   data: new Uint8Array([
 *     0x00, 0x00, 0x0E, 0xC4,  // pixelsPerUnitX: 3780
 *     0x00, 0x00, 0x0E, 0xC4,  // pixelsPerUnitY: 3780
 *     0x01,                    // unit: meter
 *   ]),
 *   crc: 0x12345678,
 * };
 *
 * const refined = refiner.refine(unknownChunk, context);
 *
 * assertEquals(refined.type, "pHYs");
 * assertEquals(refined.data.pixelsPerUnitX, 3780);
 * assertEquals(refined.data.pixelsPerUnitY, 3780);
 * assertEquals(refined.data.unit, 1);
 * assertEquals(refined.crc, 0x12345678);
 * ```
 *
 * @example Encoding a pHYs chunk with 300 DPI
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createContext } from "@hertzg/binstruct";
 * import { physChunkRefiner, type PhysChunk } from "./phys.ts";
 *
 * const context = createContext("encode");
 * const refiner = physChunkRefiner();
 *
 * const physChunk: PhysChunk = {
 *   length: 9,
 *   type: "pHYs",
 *   data: {
 *     pixelsPerUnitX: 11811,  // 300 DPI
 *     pixelsPerUnitY: 11811,  // 300 DPI
 *     unit: 1,                // meter
 *   },
 *   crc: 0xAABBCCDD,
 * };
 *
 * const unrefined = refiner.unrefine(physChunk, context);
 *
 * assertEquals(unrefined.type, new Uint8Array([112, 72, 89, 115]));
 * assertEquals(unrefined.data.length, 9);
 * assertEquals(unrefined.data[8], 1);
 * ```
 *
 * @example Aspect ratio with unit=0
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createContext } from "@hertzg/binstruct";
 * import { physChunkRefiner, type PhysChunk } from "./phys.ts";
 *
 * const refiner = physChunkRefiner();
 * const encodeCtx = createContext("encode");
 * const decodeCtx = createContext("decode");
 *
 * // 16:9 aspect ratio
 * const chunk: PhysChunk = {
 *   length: 9,
 *   type: "pHYs",
 *   data: {
 *     pixelsPerUnitX: 16,
 *     pixelsPerUnitY: 9,
 *     unit: 0,  // unknown (aspect ratio only)
 *   },
 *   crc: 0x12345678,
 * };
 *
 * const unrefined = refiner.unrefine(chunk, encodeCtx);
 * const refined = refiner.refine(unrefined, decodeCtx);
 *
 * assertEquals(refined.data.pixelsPerUnitX, 16);
 * assertEquals(refined.data.pixelsPerUnitY, 9);
 * assertEquals(refined.data.unit, 0);
 * ```
 *
 * @module
 */

import {
  decode,
  encode,
  type Refiner,
  string,
  struct,
  u32be,
  u8,
} from "@hertzg/binstruct";
import type { PngChunkUnknown } from "../mod.ts";

/**
 * PNG pHYs chunk with physical pixel dimensions.
 *
 * The pixel dimensions are specified as pixels per unit. When unit = 1 (meter),
 * these values represent pixels per meter (PPM), which can be converted to DPI
 * using: `DPI = PPM × 0.0254`.
 *
 * When unit = 0 (unknown), the X and Y values represent pixel aspect ratio only,
 * not absolute physical size.
 */
export interface PhysChunk extends Omit<PngChunkUnknown, "type" | "data"> {
  /** Chunk type identifier */
  type: "pHYs";
  /** Physical pixel dimension data */
  data: {
    /** Pixels per unit, X axis (u32be) */
    pixelsPerUnitX: number;
    /** Pixels per unit, Y axis (u32be) */
    pixelsPerUnitY: number;
    /** Unit specifier: 0 = unknown (aspect ratio), 1 = meter (u8) */
    unit: number;
  };
}

/**
 * Creates a refiner for converting between PngChunkUnknown and PhysChunk.
 *
 * The refiner handles encoding and decoding of the pHYs chunk, converting
 * between raw bytes and the structured physical dimension data.
 *
 * @returns A refiner for pHYs chunks
 *
 * @example Standard pHYs refiner usage
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createContext } from "@hertzg/binstruct";
 * import type { PngChunkUnknown } from "../mod.ts";
 * import { physChunkRefiner } from "./phys.ts";
 *
 * const refiner = physChunkRefiner();
 * const context = createContext("decode");
 *
 * const unknownChunk: PngChunkUnknown = {
 *   length: 9,
 *   type: new Uint8Array([112, 72, 89, 115]),
 *   // deno-fmt-ignore
 *   data: new Uint8Array([
 *     0x00, 0x00, 0x17, 0x0B,  // 5899 pixels/meter X
 *     0x00, 0x00, 0x17, 0x0B,  // 5899 pixels/meter Y
 *     0x01,                    // unit: meter
 *   ]),
 *   crc: 0x11223344,
 * };
 *
 * const refined = refiner.refine(unknownChunk, context);
 *
 * assertEquals(refined.type, "pHYs");
 * assertEquals(refined.data.pixelsPerUnitX, 5899);
 * assertEquals(refined.data.pixelsPerUnitY, 5899);
 * assertEquals(refined.data.unit, 1);
 * ```
 *
 * @example DPI calculations
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createContext } from "@hertzg/binstruct";
 * import { physChunkRefiner, type PhysChunk } from "./phys.ts";
 *
 * const refiner = physChunkRefiner();
 * const encodeCtx = createContext("encode");
 * const decodeCtx = createContext("decode");
 *
 * // Common DPI values
 * const dpiTests = [
 *   { dpi: 72, ppm: 2835 },
 *   { dpi: 96, ppm: 3780 },
 *   { dpi: 150, ppm: 5906 },
 *   { dpi: 300, ppm: 11811 },
 * ];
 *
 * for (const { ppm } of dpiTests) {
 *   const chunk: PhysChunk = {
 *     length: 9,
 *     type: "pHYs",
 *     data: {
 *       pixelsPerUnitX: ppm,
 *       pixelsPerUnitY: ppm,
 *       unit: 1,
 *     },
 *     crc: 0x12345678,
 *   };
 *
 *   const unrefined = refiner.unrefine(chunk, encodeCtx);
 *   const refined = refiner.refine(unrefined, decodeCtx);
 *
 *   assertEquals(refined.data.pixelsPerUnitX, ppm);
 *   assertEquals(refined.data.pixelsPerUnitY, ppm);
 * }
 * ```
 *
 * @example Non-square pixels
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createContext } from "@hertzg/binstruct";
 * import { physChunkRefiner, type PhysChunk } from "./phys.ts";
 *
 * const refiner = physChunkRefiner();
 * const encodeCtx = createContext("encode");
 * const decodeCtx = createContext("decode");
 *
 * // Different X and Y resolutions
 * const chunk: PhysChunk = {
 *   length: 9,
 *   type: "pHYs",
 *   data: {
 *     pixelsPerUnitX: 3780,   // 96 DPI horizontal
 *     pixelsPerUnitY: 2835,   // 72 DPI vertical
 *     unit: 1,
 *   },
 *   crc: 0xAABBCCDD,
 * };
 *
 * const unrefined = refiner.unrefine(chunk, encodeCtx);
 * const refined = refiner.refine(unrefined, decodeCtx);
 *
 * assertEquals(refined.data.pixelsPerUnitX, 3780);
 * assertEquals(refined.data.pixelsPerUnitY, 2835);
 * assertEquals(refined.data.unit, 1);
 * ```
 */
export function physChunkRefiner(): Refiner<PngChunkUnknown, PhysChunk, []> {
  const typeCoder = string(4);
  const dataCoder = struct({
    pixelsPerUnitX: u32be(),
    pixelsPerUnitY: u32be(),
    unit: u8(),
  });

  return {
    refine: (decoded: PngChunkUnknown, context): PhysChunk => {
      return {
        ...decoded,
        type: decode(typeCoder, decoded.type, context) as "pHYs",
        data: decode(dataCoder, decoded.data, context),
      };
    },
    unrefine: (refined: PhysChunk, context): PngChunkUnknown => {
      return {
        ...refined,
        type: encode(typeCoder, refined.type, context, new Uint8Array(4)),
        data: encode(dataCoder, refined.data, context, new Uint8Array(9)),
      };
    },
  };
}
