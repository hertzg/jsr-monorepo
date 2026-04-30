import { type Coder, s32le, struct, u16le, u32le } from "@hertzg/binstruct";

/**
 * BITMAPINFOHEADER — the 40-byte DIB header used by virtually all modern BMP files.
 *
 * The `size` field is what tells decoders which DIB header variant follows;
 * for BITMAPINFOHEADER it is always 40. Larger variants (V4/V5) are not
 * handled by this coder — read `size` first and dispatch externally if you
 * need to support them.
 *
 * `width` is signed but in practice non-negative. `height` is signed: a
 * negative value means the image is stored top-down (rows in natural reading
 * order) instead of the BMP-default bottom-up. We deliberately preserve the
 * sign rather than auto-flipping rows; row orientation is the caller's
 * concern.
 *
 * @property size               Size of this header in bytes (40 for BITMAPINFOHEADER).
 * @property width              Image width in pixels.
 * @property height             Image height in pixels. Negative ⇒ top-down DIB.
 * @property planes             Number of color planes; must be 1.
 * @property bpp                Bits per pixel: 1, 4, 8, 16, 24, or 32.
 * @property compression        Compression method: 0=BI_RGB, 1=BI_RLE8, 2=BI_RLE4, 3=BI_BITFIELDS, …
 * @property imageSize          Size of the raw pixel data in bytes (may be 0 for BI_RGB).
 * @property xPixelsPerMeter    Horizontal resolution in pixels per metre.
 * @property yPixelsPerMeter    Vertical resolution in pixels per metre.
 * @property colorsUsed         Number of palette entries used (0 ⇒ 2^bpp).
 * @property importantColors    Number of "important" palette entries (0 ⇒ all).
 *
 * @example Shape of a BITMAPINFOHEADER for a 2×2 24bpp top-down image
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import type { BitmapInfoHeader } from "@binstruct/bmp";
 *
 * const dib: BitmapInfoHeader = {
 *   size: 40,
 *   width: 2,
 *   height: -2,
 *   planes: 1,
 *   bpp: 24,
 *   compression: 0,
 *   imageSize: 16,
 *   xPixelsPerMeter: 2835,
 *   yPixelsPerMeter: 2835,
 *   colorsUsed: 0,
 *   importantColors: 0,
 * };
 *
 * assertEquals(dib.size, 40);
 * assertEquals(dib.height < 0, true);
 * ```
 */
export interface BitmapInfoHeader {
  size: number;
  width: number;
  height: number;
  planes: number;
  bpp: number;
  compression: number;
  imageSize: number;
  xPixelsPerMeter: number;
  yPixelsPerMeter: number;
  colorsUsed: number;
  importantColors: number;
}

/**
 * Creates a coder for the 40-byte BITMAPINFOHEADER (the most common DIB header).
 *
 * All fields are little-endian. `width` and `height` are signed 32-bit; `height`
 * being negative signals a top-down pixel layout.
 *
 * @returns A coder for {@link BitmapInfoHeader}.
 *
 * @example Round-trip a BITMAPINFOHEADER
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { bitmapInfoHeader } from "@binstruct/bmp";
 *
 * const coder = bitmapInfoHeader();
 * const dib = {
 *   size: 40,
 *   width: 2,
 *   height: 2,
 *   planes: 1,
 *   bpp: 24,
 *   compression: 0,
 *   imageSize: 16,
 *   xPixelsPerMeter: 2835,
 *   yPixelsPerMeter: 2835,
 *   colorsUsed: 0,
 *   importantColors: 0,
 * };
 *
 * const buffer = new Uint8Array(40);
 * const bytesWritten = coder.encode(dib, buffer);
 * const [decoded, bytesRead] = coder.decode(buffer);
 *
 * assertEquals(bytesWritten, 40);
 * assertEquals(bytesRead, 40);
 * assertEquals(decoded, dib);
 * ```
 */
export function bitmapInfoHeader(): Coder<BitmapInfoHeader> {
  return struct({
    size: u32le(),
    width: s32le(),
    height: s32le(),
    planes: u16le(),
    bpp: u16le(),
    compression: u32le(),
    imageSize: u32le(),
    xPixelsPerMeter: s32le(),
    yPixelsPerMeter: s32le(),
    colorsUsed: u32le(),
    importantColors: u32le(),
  });
}

/**
 * Computes the BMP row stride in bytes for a given pixel width and bit depth.
 *
 * BMP rows are padded so each row's byte length is a multiple of 4. The
 * formula is the canonical `floor((bpp * width + 31) / 32) * 4`.
 *
 * @param width Image width in pixels (must be non-negative).
 * @param bpp   Bits per pixel.
 * @returns Bytes per row including padding.
 *
 * @example Row stride matches the spec for common bit depths
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { rowStride } from "@binstruct/bmp";
 *
 * assertEquals(rowStride(2, 24), 8);   // 6 bytes of pixels + 2 bytes pad
 * assertEquals(rowStride(2, 32), 8);   // 8 bytes, already aligned
 * assertEquals(rowStride(3, 24), 12);  // 9 bytes of pixels + 3 bytes pad
 * assertEquals(rowStride(7, 1), 4);    // 1 byte of pixels + 3 bytes pad
 * ```
 */
export function rowStride(width: number, bpp: number): number {
  return Math.floor((bpp * width + 31) / 32) * 4;
}

/**
 * Computes the total pixel-data size for a BITMAPINFOHEADER, in bytes.
 *
 * The result is `rowStride(width, bpp) * |height|` — the absolute value of
 * `height` is used so top-down (`height < 0`) and bottom-up images yield the
 * same buffer size.
 *
 * @param width  Image width in pixels.
 * @param height Image height in pixels (sign ignored).
 * @param bpp    Bits per pixel.
 * @returns Total bytes of pixel data including row padding.
 *
 * @example Pixel-data size for 2×2 24bpp and a top-down 2×2 32bpp image
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { pixelDataSize } from "@binstruct/bmp";
 *
 * assertEquals(pixelDataSize(2, 2, 24), 16);   // stride 8 × 2 rows
 * assertEquals(pixelDataSize(2, -2, 32), 16);  // top-down, sign ignored
 * ```
 */
export function pixelDataSize(
  width: number,
  height: number,
  bpp: number,
): number {
  return rowStride(width, bpp) * Math.abs(height);
}
