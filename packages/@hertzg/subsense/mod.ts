/**
 * Motion detection by background subtraction using the SuBSENSE algorithm
 * (St-Charles, Bilodeau, Bergevin, 2015).
 *
 * Every pixel keeps a model of past samples (intensity plus an LBSP texture
 * descriptor). A new pixel is background when enough samples match it. Feedback
 * loops adapt, per pixel, the distance threshold (R), the learning rate (T) and
 * a variation modulator (v), so noisy regions become tolerant and calm regions
 * stay sensitive.
 *
 * Differences from the reference implementation (litiv):
 *
 * - The core runs on luma only. RGB and RGBA frames are converted on the way in.
 * - Post-processing is a majority filter only. There is no morphological close,
 *   flood fill or erode.
 * - Borders are clamped, not trimmed, so the mask is always full frame size.
 * - `random` is injectable, so output can be made repeatable.
 *
 * With default settings an object that stops on a static scene is not absorbed
 * into the background, as in the reference implementation: absorption relies on
 * neighbour spread from dynamic regions. Callers that need it should raise
 * `colorDistanceThreshold` or restart the model.
 *
 * @example Detecting a bright block on a static background
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createSubsense } from "@hertzg/subsense";
 *
 * let seed = 2463534242;
 * const random = () => {
 *   seed ^= seed << 13;
 *   seed >>>= 0;
 *   seed ^= seed >>> 17;
 *   seed ^= seed << 5;
 *   seed >>>= 0;
 *   return seed / 2 ** 32;
 * };
 *
 * const width = 16;
 * const height = 16;
 * const detector = createSubsense({
 *   width,
 *   height,
 *   medianKernelSize: 3,
 *   random,
 * });
 *
 * const background = new Uint8Array(width * height);
 * for (let i = 0; i < background.length; i++) {
 *   background[i] = 60 + (i % width) * 2;
 * }
 * for (let frame = 0; frame < 5; frame++) detector.segment(background);
 *
 * const withBlock = background.slice();
 * for (let y = 4; y < 10; y++) {
 *   for (let x = 4; x < 10; x++) withBlock[y * width + x] += 120;
 * }
 * const mask = detector.segment(withBlock);
 *
 * assertEquals(mask[6 * width + 6], 255);
 * assertEquals(mask[14 * width + 14], 0);
 * ```
 *
 * @module @hertzg/subsense
 */

export { createSubsense } from "./subsense.ts";
export type { Subsense, SubsenseOptions } from "./subsense.ts";

export {
  computeHammingDistance16,
  computeLbsp,
  createLbspThresholdTable,
  LBSP_BIT_COUNT,
} from "./lbsp.ts";
export type { LbspReference } from "./lbsp.ts";

export { convertToGrayscale } from "./grayscale.ts";
export type { ChannelCount, GrayImage } from "./grayscale.ts";

export {
  applyMajorityFilter,
  BACKGROUND,
  FOREGROUND,
  orMasks,
  xorMasks,
} from "./mask.ts";
export type { Mask } from "./mask.ts";
