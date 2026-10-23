/**
 * LBSP (local binary similarity pattern) descriptors for the SuBSENSE
 * background subtractor.
 *
 * A descriptor is a 16-bit number. Each bit compares one neighbour in the 5x5
 * patch around a pixel against a reference intensity. Bit 1 means the
 * neighbour differs from the reference by more than the reference threshold.
 * Descriptors are compared with {@link computeHammingDistance16}, which counts the
 * bits that differ. The threshold for each intensity comes from
 * {@link createLbspThresholdTable}.
 *
 * Buffer requirements: the image `data` must hold `width * height` bytes.
 * Out-of-range pixel indices are not checked.
 *
 * @module @hertzg/subsense/lbsp
 */

import type { GrayImage } from "./grayscale.ts";

/** Descriptor length in bits (one per sampled neighbour in the 5x5 patch). */
export const LBSP_BIT_COUNT = 16;

/** Number of possible 8-bit intensities, so the threshold table has this many entries. */
const INTENSITY_LEVEL_COUNT = 256;

/** Largest threshold a table entry can hold, in intensity units (8-bit cap). */
const THRESHOLD_MAX = 255;

/** Divisor in the litiv threshold formula. Scales the raw value down to threshold units. */
const THRESHOLD_DIVISOR = 3;

/** Pixel reference the descriptor is compared against. */
export interface LbspReference {
  /** 0..255 intensity the neighbours are compared to. */
  intensity: number;
  /** Absolute difference above which a neighbour bit is set, 0..255. */
  threshold: number;
}

/**
 * Computes the 16-bit LBSP descriptor of the pixel at `pixelIndex`.
 *
 * Bit n is 1 when `|neighbour - reference.intensity| > reference.threshold`.
 * Neighbour coordinates are clamped to the image edge (replicate border), so
 * a pixel on the border reads its nearest in-bounds neighbour instead.
 *
 * The three positional parameters are deliberate. This runs once per pixel per
 * sample in the hot loop. The caller keeps one mutable `reference` object and
 * updates its fields between calls, so no object is allocated per call.
 *
 * Bit layout (bit 15 is the most significant), with (dx, dy) offsets:
 *
 * ```
 * bit15 (-1, 1)   bit14 ( 1,-1)   bit13 ( 1, 1)   bit12 (-1,-1)
 * bit11 ( 1, 0)   bit10 ( 0,-1)   bit9  (-1, 0)   bit8  ( 0, 1)
 * bit7  (-2,-2)   bit6  ( 2, 2)   bit5  ( 2,-2)   bit4  (-2, 2)
 * bit3  ( 0, 2)   bit2  ( 0,-2)   bit1  ( 2, 0)   bit0  (-2, 0)
 * ```
 *
 * @param image Grayscale image the pixel belongs to.
 * @param pixelIndex Index of the centre pixel, `y * width + x`.
 * @param reference Intensity and threshold to compare the neighbours against.
 * @returns The descriptor, from 0 to 0xffff.
 *
 * @example Uniform patch and a single bright neighbour
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { computeLbsp } from "@hertzg/subsense/lbsp";
 *
 * const flat = { data: new Uint8Array(25).fill(100), width: 5, height: 5 };
 * assertEquals(computeLbsp(flat, 12, { intensity: 100, threshold: 0 }), 0);
 *
 * const bright = new Uint8Array(25).fill(100);
 * bright[13] = 200;
 * assertEquals(
 *   computeLbsp({ data: bright, width: 5, height: 5 }, 12, { intensity: 100, threshold: 10 }),
 *   1 << 11,
 * );
 * ```
 */
export function computeLbsp(
  image: GrayImage,
  pixelIndex: number,
  reference: LbspReference,
): number {
  const { data, width, height } = image;
  const x = pixelIndex % width;
  const y = Math.floor(pixelIndex / width);
  const lastX = width - 1;
  const lastY = height - 1;
  const intensity = reference.intensity;
  const threshold = reference.threshold;

  const rowM2 = clampCoord(y - 2, lastY) * width;
  const rowM1 = clampCoord(y - 1, lastY) * width;
  const row0 = y * width;
  const rowP1 = clampCoord(y + 1, lastY) * width;
  const rowP2 = clampCoord(y + 2, lastY) * width;
  const colM2 = clampCoord(x - 2, lastX);
  const colM1 = clampCoord(x - 1, lastX);
  const colP1 = clampCoord(x + 1, lastX);
  const colP2 = clampCoord(x + 2, lastX);
  const col0 = x;

  return (
    (Math.abs(data[rowP1 + colM1] - intensity) > threshold ? 1 << 15 : 0) |
    (Math.abs(data[rowM1 + colP1] - intensity) > threshold ? 1 << 14 : 0) |
    (Math.abs(data[rowP1 + colP1] - intensity) > threshold ? 1 << 13 : 0) |
    (Math.abs(data[rowM1 + colM1] - intensity) > threshold ? 1 << 12 : 0) |
    (Math.abs(data[row0 + colP1] - intensity) > threshold ? 1 << 11 : 0) |
    (Math.abs(data[rowM1 + col0] - intensity) > threshold ? 1 << 10 : 0) |
    (Math.abs(data[row0 + colM1] - intensity) > threshold ? 1 << 9 : 0) |
    (Math.abs(data[rowP1 + col0] - intensity) > threshold ? 1 << 8 : 0) |
    (Math.abs(data[rowM2 + colM2] - intensity) > threshold ? 1 << 7 : 0) |
    (Math.abs(data[rowP2 + colP2] - intensity) > threshold ? 1 << 6 : 0) |
    (Math.abs(data[rowM2 + colP2] - intensity) > threshold ? 1 << 5 : 0) |
    (Math.abs(data[rowP2 + colM2] - intensity) > threshold ? 1 << 4 : 0) |
    (Math.abs(data[rowP2 + col0] - intensity) > threshold ? 1 << 3 : 0) |
    (Math.abs(data[rowM2 + col0] - intensity) > threshold ? 1 << 2 : 0) |
    (Math.abs(data[row0 + colP2] - intensity) > threshold ? 1 << 1 : 0) |
    (Math.abs(data[row0 + colM2] - intensity) > threshold ? 1 : 0)
  );
}

/**
 * Clamps a coordinate into `[0, last]`, which gives the replicate border.
 *
 * @param value Coordinate that may lie outside the image.
 * @param last Largest valid coordinate (`size - 1`).
 * @returns The coordinate moved to the nearest valid value.
 */
function clampCoord(value: number, last: number): number {
  return Math.min(Math.max(value, 0), last);
}

/**
 * Counts the bits that differ between two 16-bit LBSP descriptors.
 *
 * Uses the SWAR popcount: each step adds neighbouring bit counts in wider
 * fields until the total sits in one field.
 *
 * @param a First descriptor, 0..0xffff.
 * @param b Second descriptor, 0..0xffff.
 * @returns Number of differing bits, from 0 to {@link LBSP_BIT_COUNT}.
 *
 * @example Distance between complementary and identical descriptors
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { computeHammingDistance16 } from "@hertzg/subsense/lbsp";
 *
 * assertEquals(computeHammingDistance16(0xffff, 0), 16);
 * assertEquals(computeHammingDistance16(0b1010, 0b0110), 2);
 * assertEquals(computeHammingDistance16(0x1234, 0x1234), 0);
 * ```
 */
export function computeHammingDistance16(a: number, b: number): number {
  let bits = (a ^ b) & 0xffff;
  bits = bits - ((bits >>> 1) & 0x5555);
  bits = (bits & 0x3333) + ((bits >>> 2) & 0x3333);
  bits = (bits + (bits >>> 4)) & 0x0f0f;
  return (bits + (bits >>> 8)) & 0x1f;
}

/**
 * Builds the 256-entry lookup table that maps an intensity to its LBSP threshold.
 *
 * Uses the litiv formula `lut[i] = min(255, floor((offset + i * relativeThreshold) / 3))`.
 *
 * @param options.relativeThreshold Relative threshold `T_r` that scales the intensity.
 * @param options.offset Constant added before scaling. Default 0.
 * @returns A `Uint8Array` of length 256, indexed by intensity.
 *
 * @example Thresholds for a few intensities
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createLbspThresholdTable } from "@hertzg/subsense/lbsp";
 *
 * const lut = createLbspThresholdTable({ relativeThreshold: 0.333 });
 * assertEquals(lut[0], 0);
 * assertEquals(lut[100], 11);
 * assertEquals(lut[255], 28);
 * ```
 */
export function createLbspThresholdTable(
  options: { relativeThreshold: number; offset?: number },
): Uint8Array {
  const { relativeThreshold, offset = 0 } = options;
  const table = new Uint8Array(INTENSITY_LEVEL_COUNT);
  for (let intensity = 0; intensity < INTENSITY_LEVEL_COUNT; intensity++) {
    const scaled = Math.floor(
      (offset + intensity * relativeThreshold) / THRESHOLD_DIVISOR,
    );
    table[intensity] = Math.min(THRESHOLD_MAX, scaled);
  }
  return table;
}
