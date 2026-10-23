/**
 * Frame to luma conversion for the SuBSENSE pipeline. Motion detection runs on
 * one 8-bit channel, so every colour frame goes through here first.
 *
 * @module @hertzg/subsense/grayscale
 */

/** One 8-bit single-channel image, row-major, no padding. */
export interface GrayImage {
  /** Luma bytes, `length === width * height`. */
  readonly data: Uint8Array;
  /** Pixels per row. */
  readonly width: number;
  /** Rows. */
  readonly height: number;
}

/** Channels per input pixel. 1 = gray, 3 = RGB, 4 = RGBA (alpha ignored). */
export type ChannelCount = 1 | 3 | 4;

/** ITU-R BT.601 integer weight for red, out of 256. */
const LUMA_RED_WEIGHT = 77;

/** ITU-R BT.601 integer weight for green, out of 256. */
const LUMA_GREEN_WEIGHT = 150;

/** ITU-R BT.601 integer weight for blue, out of 256. */
const LUMA_BLUE_WEIGHT = 29;

/** Half of 256. Added before the shift so the result rounds instead of truncating. */
const LUMA_ROUNDING_OFFSET = 128;

/** Right shift that divides by 256, the weight total. */
const LUMA_SHIFT_BITS = 8;

/**
 * Converts a frame to luma using the ITU-R BT.601 integer weights:
 * `y = (77*r + 150*g + 29*b + 128) >> 8`. Alpha is ignored. With
 * `channels: 1` the bytes are copied unchanged.
 *
 * Callers must size the buffers: `into.length` is `width * height` and
 * `frame.length` is `into.length * channels`. Nothing is checked.
 *
 * @param frame Interleaved pixels, `channels` bytes per pixel, row-major.
 * @param options.channels Bytes per input pixel: 1, 3 or 4.
 * @param options.into Output buffer, written in place.
 * @returns `into`, filled with one luma byte per pixel.
 *
 * @example Converts two RGB pixels, red and green
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { convertToGrayscale } from "@hertzg/subsense/grayscale";
 *
 * const frame = Uint8Array.from([255, 0, 0, 0, 255, 0]);
 * const into = new Uint8Array(2);
 *
 * assertEquals(
 *   convertToGrayscale(frame, { channels: 3, into }),
 *   Uint8Array.from([77, 149]),
 * );
 * ```
 */
export function convertToGrayscale(
  frame: Uint8Array | Uint8ClampedArray,
  options: { channels: ChannelCount; into: Uint8Array },
): Uint8Array {
  const { channels, into } = options;
  if (channels === 1) {
    into.set(frame);
    return into;
  }
  for (
    let pixel = 0, offset = 0;
    pixel < into.length;
    pixel++, offset += channels
  ) {
    const red = frame[offset];
    const green = frame[offset + 1];
    const blue = frame[offset + 2];
    into[pixel] = (LUMA_RED_WEIGHT * red + LUMA_GREEN_WEIGHT * green +
      LUMA_BLUE_WEIGHT * blue + LUMA_ROUNDING_OFFSET) >>
      LUMA_SHIFT_BITS;
  }
  return into;
}
