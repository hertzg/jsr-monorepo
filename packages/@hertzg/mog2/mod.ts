/**
 * MOG2 background subtraction and motion detection.
 *
 * Implements the adaptive Gaussian mixture background model of Zivkovic and
 * van der Heijden, with the same parameters and mask values as OpenCV's
 * `BackgroundSubtractorMOG2`. Feed it frames, get back a per-pixel mask:
 *
 * ```
 * MASK_BACKGROUND = 0     pixel matches the learned background
 * MASK_SHADOW     = 127   darker than the background, same colour
 * MASK_FOREGROUND = 255   something moved
 * ```
 *
 * Frames are flat `Uint8Array`s (gray, RGB or RGBA, row-major, pixel
 * interleaved), so canvas `ImageData.data` works as is. {@link detectMotion}
 * reduces a mask to a yes/no verdict plus a bounding box.
 *
 * @example Detect a bright square moving into a static scene
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createMog2, detectMotion } from "@hertzg/mog2";
 *
 * const width = 4;
 * const height = 4;
 * const model = createMog2({ width, height });
 *
 * const background = new Uint8Array(width * height).fill(100);
 * for (let frame = 0; frame < 10; frame++) model.apply(background);
 *
 * const frame = background.slice();
 * for (const index of [5, 6, 9, 10]) frame[index] = 250;
 *
 * const report = detectMotion(model.apply(frame), { width, height });
 *
 * assertEquals(report.detected, true);
 * assertEquals(report.foregroundPixels, 4);
 * assertEquals(report.bounds, { x: 1, y: 1, width: 2, height: 2 });
 * ```
 *
 * @module @hertzg/mog2
 */

export * from "./mog2.ts";
export * from "./motion.ts";
