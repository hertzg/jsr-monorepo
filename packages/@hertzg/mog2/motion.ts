/**
 * Motion detection on top of a MOG2 foreground mask.
 *
 * {@link detectMotion} turns the mask returned by `Mog2.apply` into a small
 * report: how many pixels moved, what fraction of the frame that is, and the
 * tight bounding box around them.
 *
 * @module
 */

import { MASK_FOREGROUND, MASK_SHADOW } from "./mog2.ts";

const DEFAULT_MIN_FOREGROUND_RATIO = 0.01;

/**
 * Options for {@link detectMotion}.
 *
 * @example Count shadow pixels only when asked to
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import {
 *   detectMotion,
 *   MASK_BACKGROUND,
 *   MASK_FOREGROUND,
 *   MASK_SHADOW,
 * } from "@hertzg/mog2";
 *
 * const B = MASK_BACKGROUND;
 * const F = MASK_FOREGROUND;
 * const S = MASK_SHADOW;
 * // deno-fmt-ignore
 * const mask = new Uint8Array([
 *   F, S,
 *   B, B,
 * ]);
 *
 * assertEquals(detectMotion(mask, { width: 2, height: 2 }).foregroundPixels, 1);
 * assertEquals(
 *   detectMotion(mask, { width: 2, height: 2, includeShadows: true })
 *     .foregroundPixels,
 *   2,
 * );
 * ```
 */
export interface DetectMotionOptions {
  /** Mask width in pixels. */
  width: number;
  /** Mask height in pixels. */
  height: number;
  /**
   * Fraction of pixels (0..1) that must be foreground for `detected` to be
   * true. Defaults to 0.01.
   */
  minForegroundRatio?: number;
  /** Count `MASK_SHADOW` pixels as foreground too. Defaults to false. */
  includeShadows?: boolean;
}

/**
 * Tight bounding box of the counted pixels, in pixels.
 *
 * @example Box around a 2x2 block
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import {
 *   detectMotion,
 *   MASK_BACKGROUND,
 *   MASK_FOREGROUND,
 *   type MotionBounds,
 * } from "@hertzg/mog2";
 *
 * const B = MASK_BACKGROUND;
 * const F = MASK_FOREGROUND;
 * // deno-fmt-ignore
 * const mask = new Uint8Array([
 *   B, B, B, B,
 *   B, F, F, B,
 *   B, F, F, B,
 *   B, B, B, B,
 * ]);
 *
 * const bounds: MotionBounds | undefined =
 *   detectMotion(mask, { width: 4, height: 4 }).bounds;
 *
 * assertEquals(bounds, { x: 1, y: 1, width: 2, height: 2 });
 * ```
 */
export interface MotionBounds {
  /** Left-most column. */
  x: number;
  /** Top-most row. */
  y: number;
  /** Number of columns covered. */
  width: number;
  /** Number of rows covered. */
  height: number;
}

/**
 * Result of {@link detectMotion}.
 *
 * @example Report for a frame with no motion
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import {
 *   detectMotion,
 *   MASK_BACKGROUND,
 *   type MotionReport,
 * } from "@hertzg/mog2";
 *
 * const mask = new Uint8Array(4).fill(MASK_BACKGROUND);
 * const report: MotionReport = detectMotion(mask, { width: 2, height: 2 });
 *
 * assertEquals(report, {
 *   detected: false,
 *   foregroundPixels: 0,
 *   foregroundRatio: 0,
 *   bounds: undefined,
 * });
 * ```
 */
export interface MotionReport {
  /**
   * True when `foregroundRatio >= minForegroundRatio` and at least one pixel
   * was counted.
   */
  detected: boolean;
  /** Number of pixels counted as foreground. */
  foregroundPixels: number;
  /** `foregroundPixels / (width * height)`. */
  foregroundRatio: number;
  /** Bounding box of the counted pixels, or `undefined` when there are none. */
  bounds: MotionBounds | undefined;
}

/**
 * Summarises a MOG2 foreground mask as a motion report.
 *
 * Makes a single pass over the mask and allocates nothing besides the result.
 *
 * @param mask Mask of length `width * height`, one byte per pixel, as returned by `Mog2.apply`.
 * @param options Mask dimensions and detection thresholds.
 * @returns The pixel count, ratio, bounding box and the `detected` verdict.
 *
 * @example Detect a 2x2 blob in a 4x4 mask
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { detectMotion, MASK_BACKGROUND, MASK_FOREGROUND } from "@hertzg/mog2";
 *
 * const B = MASK_BACKGROUND;
 * const F = MASK_FOREGROUND;
 * // deno-fmt-ignore
 * const mask = new Uint8Array([
 *   B, B, B, B,
 *   B, F, F, B,
 *   B, F, F, B,
 *   B, B, B, B,
 * ]);
 *
 * assertEquals(detectMotion(mask, { width: 4, height: 4 }), {
 *   detected: true,
 *   foregroundPixels: 4,
 *   foregroundRatio: 0.25,
 *   bounds: { x: 1, y: 1, width: 2, height: 2 },
 * });
 * ```
 */
export function detectMotion(
  mask: Uint8Array,
  options: DetectMotionOptions,
): MotionReport {
  const {
    width,
    height,
    minForegroundRatio = DEFAULT_MIN_FOREGROUND_RATIO,
    includeShadows = false,
  } = options;

  let foregroundPixels = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    const rowStart = y * width;
    for (let x = 0; x < width; x++) {
      const value = mask[rowStart + x];
      if (
        value !== MASK_FOREGROUND &&
        !(includeShadows && value === MASK_SHADOW)
      ) continue;
      foregroundPixels++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      maxY = y;
    }
  }

  const foregroundRatio = foregroundPixels / (width * height);

  return {
    detected: foregroundPixels > 0 && foregroundRatio >= minForegroundRatio,
    foregroundPixels,
    foregroundRatio,
    bounds: foregroundPixels === 0 ? undefined : {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    },
  };
}
