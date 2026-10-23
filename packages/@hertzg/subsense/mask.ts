/**
 * Binary mask helpers for the SuBSENSE pipeline: a majority (median) filter to
 * clean up speckle, and xor / or to combine masks between frames.
 *
 * Masks are row-major bytes, `BACKGROUND` (0) or `FOREGROUND` (255).
 *
 * @module @hertzg/subsense/mask
 */

/** Binary mask: 0 = background, 255 = foreground, row-major width*height. */
export interface Mask {
  /** Mask bytes, `length === width * height`. */
  readonly data: Uint8Array;
  /** Pixels per row. */
  readonly width: number;
  /** Rows. */
  readonly height: number;
}

/** Byte value of a foreground pixel. */
export const FOREGROUND = 255;

/** Byte value of a background pixel. */
export const BACKGROUND = 0;

/**
 * Majority filter, which is a median blur on a binary mask. An output pixel is
 * FOREGROUND when more than half of the in-bounds pixels in its
 * `kernelSize` x `kernelSize` window are foreground. Pixels outside the image
 * are not counted, so the filter never pulls in false background at the border.
 *
 * `kernelSize` must be odd. `kernelSize: 1` copies the mask. `into` must not be
 * `mask.data`, and must be `width * height` bytes. Nothing is checked.
 *
 * @param mask Source mask. Left unchanged.
 * @param options.kernelSize Odd window side length in pixels.
 * @param options.into Output buffer, written in place.
 * @returns `into`, filled with the filtered mask.
 *
 * @example Removes a lone foreground pixel and keeps a solid block
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { applyMajorityFilter, BACKGROUND, FOREGROUND } from "@hertzg/subsense/mask";
 *
 * const mask = {
 *   data: Uint8Array.from([
 *     255, 0, 0, 0, 0,
 *     0, 0, 0, 0, 0,
 *     0, 0, 255, 255, 255,
 *     0, 0, 255, 255, 255,
 *     0, 0, 255, 255, 255,
 *   ]),
 *   width: 5,
 *   height: 5,
 * };
 * const into = new Uint8Array(25);
 *
 * applyMajorityFilter(mask, { kernelSize: 3, into });
 *
 * assertEquals(into[0], BACKGROUND);
 * assertEquals(into[13], FOREGROUND);
 * ```
 */
export function applyMajorityFilter(
  mask: Mask,
  options: { kernelSize: number; into: Uint8Array },
): Uint8Array {
  const { kernelSize, into } = options;
  if (kernelSize === 1) {
    into.set(mask.data);
    return into;
  }
  const radius = (kernelSize - 1) / 2;
  for (let y = 0; y < mask.height; y++) {
    for (let x = 0; x < mask.width; x++) {
      const pixel = y * mask.width + x;
      into[pixel] = isMajorityForeground(mask, pixel, radius)
        ? FOREGROUND
        : BACKGROUND;
    }
  }
  return into;
}

/**
 * Tells whether more than half of the in-bounds pixels around a point are
 * foreground. Counts the window clipped to the image and allocates nothing.
 *
 * @param mask Source mask.
 * @param pixelIndex Index (`y * width + x`) of the window centre.
 * @param radiusPixels Window half-size in pixels. The window is `2 * radiusPixels + 1` wide.
 * @returns `true` when foreground pixels are a strict majority of the window.
 */
function isMajorityForeground(
  mask: Mask,
  pixelIndex: number,
  radiusPixels: number,
): boolean {
  const { data, width, height } = mask;
  const centerX = pixelIndex % width;
  const centerY = (pixelIndex - centerX) / width;
  const left = Math.max(0, centerX - radiusPixels);
  const right = Math.min(width - 1, centerX + radiusPixels);
  const top = Math.max(0, centerY - radiusPixels);
  const bottom = Math.min(height - 1, centerY + radiusPixels);
  let foregroundCount = 0;
  let totalCount = 0;
  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      totalCount++;
      if (data[y * width + x] === FOREGROUND) {
        foregroundCount++;
      }
    }
  }
  return foregroundCount * 2 > totalCount;
}

/**
 * Bitwise xor of two masks: a pixel is set where exactly one input is set.
 *
 * @param a First mask bytes.
 * @param b Second mask bytes, same length as `a`.
 * @param into Output buffer, same length as `a`. Written in place.
 * @returns `into`.
 *
 * @example Finds the pixels that changed between two frames
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { xorMasks } from "@hertzg/subsense/mask";
 *
 * const previous = Uint8Array.from([0, 255, 0, 255]);
 * const current = Uint8Array.from([0, 0, 255, 255]);
 *
 * assertEquals(
 *   xorMasks(previous, current, new Uint8Array(4)),
 *   Uint8Array.from([0, 255, 255, 0]),
 * );
 * ```
 */
export function xorMasks(
  a: Uint8Array,
  b: Uint8Array,
  into: Uint8Array,
): Uint8Array {
  for (let i = 0; i < into.length; i++) {
    into[i] = a[i] ^ b[i];
  }
  return into;
}

/**
 * Bitwise or of two masks: a pixel is set where either input is set.
 *
 * @param a First mask bytes.
 * @param b Second mask bytes, same length as `a`.
 * @param into Output buffer, same length as `a`. Written in place.
 * @returns `into`.
 *
 * @example Merges two foreground masks
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { orMasks } from "@hertzg/subsense/mask";
 *
 * const first = Uint8Array.from([255, 0, 0, 0]);
 * const second = Uint8Array.from([0, 255, 0, 0]);
 *
 * assertEquals(
 *   orMasks(first, second, new Uint8Array(4)),
 *   Uint8Array.from([255, 255, 0, 0]),
 * );
 * ```
 */
export function orMasks(
  a: Uint8Array,
  b: Uint8Array,
  into: Uint8Array,
): Uint8Array {
  for (let i = 0; i < into.length; i++) {
    into[i] = a[i] | b[i];
  }
  return into;
}
