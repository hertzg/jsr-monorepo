/**
 * BMP/DIB image file format encoding and decoding utilities using binary structures.
 *
 * This module provides coders for the classic Windows BMP container:
 *
 * - {@link bitmapFileHeader} — the 14-byte BITMAPFILEHEADER (signature + sizes + pixel offset)
 * - {@link bitmapInfoHeader} — the 40-byte BITMAPINFOHEADER (the most common DIB header)
 * - {@link bmp} — a full file coder for uncompressed (BI_RGB) BITMAPINFOHEADER images
 *   without a colour palette, i.e. 16/24/32 bpp.
 *
 * ## Design notes
 *
 * - **DIB variants:** only BITMAPINFOHEADER (size = 40) is shipped. V4/V5 and the
 *   OS/2 BITMAPCOREHEADER are intentionally out of scope — read the `size` field
 *   from {@link bitmapFileHeader} and dispatch externally if you need them.
 * - **Pixel-data sizing:** the file-level coder derives the pixel buffer length
 *   from the DIB's `width`/`height`/`bpp` via `rowStride * |height|`, ignoring
 *   the (frequently-zero) `imageSize` field. Use {@link rowStride} /
 *   {@link pixelDataSize} for stride math when composing your own coders.
 * - **Top-down images:** a negative `height` is preserved verbatim. We never
 *   flip rows for you — pixel orientation is the caller's responsibility.
 * - **Palette:** ≤ 8bpp images require a colour table between the DIB header
 *   and the pixel data; that path is not yet covered by {@link bmp}. Use the
 *   sub-coders to compose it yourself.
 * - **Endianness:** every BMP integer is little-endian.
 *
 * @example Round-trip a tiny 2×2 24bpp BMP
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { bmp } from "@binstruct/bmp";
 *
 * const coder = bmp();
 * const image = {
 *   file: {
 *     signature: "BM",
 *     fileSize: 70,
 *     reserved1: 0,
 *     reserved2: 0,
 *     pixelOffset: 54,
 *   },
 *   dib: {
 *     size: 40,
 *     width: 2,
 *     height: 2,
 *     planes: 1,
 *     bpp: 24,
 *     compression: 0,
 *     imageSize: 16,
 *     xPixelsPerMeter: 2835,
 *     yPixelsPerMeter: 2835,
 *     colorsUsed: 0,
 *     importantColors: 0,
 *   },
 *   // 2 rows × stride 8 = 16 bytes of BGR pixels with 2 bytes padding per row.
 *   // deno-fmt-ignore
 *   pixelData: new Uint8Array([
 *     0x00, 0x00, 0xff,  0xff, 0x00, 0x00,  0x00, 0x00,
 *     0x00, 0xff, 0x00,  0xff, 0xff, 0xff,  0x00, 0x00,
 *   ]),
 * };
 *
 * const buffer = new Uint8Array(image.file.fileSize);
 * const bytesWritten = coder.encode(image, buffer);
 * const [decoded, bytesRead] = coder.decode(buffer);
 *
 * assertEquals(bytesWritten, 70);
 * assertEquals(bytesRead, 70);
 * assertEquals(decoded.file.signature, "BM");
 * assertEquals(decoded.dib.bpp, 24);
 * assertEquals(decoded.pixelData, image.pixelData);
 * ```
 *
 * @module @binstruct/bmp
 */

import {
  bytes,
  type Coder,
  computedRef,
  ref,
  struct,
} from "@hertzg/binstruct";
import {
  type BitmapFileHeader,
  bitmapFileHeader,
} from "./file_header.ts";
import {
  type BitmapInfoHeader,
  type BitmapInfoHeaderCoder,
  bitmapInfoHeader,
  pixelDataSize,
} from "./dib_header.ts";

export type { BitmapFileHeader, BitmapInfoHeader, BitmapInfoHeaderCoder };
export { bitmapFileHeader, bitmapInfoHeader };
export { pixelDataSize, rowStride } from "./dib_header.ts";

/**
 * Complete BMP file consisting of a {@link BitmapFileHeader},
 * a {@link BitmapInfoHeader}, and raw pixel data.
 *
 * No palette is modelled here; this shape targets the uncompressed
 * 16/24/32-bpp common case.
 *
 * @property file       The 14-byte BITMAPFILEHEADER.
 * @property dib        The 40-byte BITMAPINFOHEADER.
 * @property pixelData  Raw pixel rows including padding (4-byte aligned per row).
 */
export interface BmpFile {
  file: BitmapFileHeader;
  dib: BitmapInfoHeader;
  pixelData: Uint8Array;
}

/**
 * Creates a coder for a complete BMP file with a BITMAPINFOHEADER and no palette.
 *
 * The pixel-data length is derived from the DIB header's `width`, `height`,
 * and `bpp` (see {@link rowStride}); the `imageSize` field is ignored, since
 * BI_RGB encoders commonly leave it at zero.
 *
 * Use this for typical 16/24/32-bpp uncompressed images. For palette-indexed
 * images or non-zero `compression` values, compose {@link bitmapFileHeader},
 * {@link bitmapInfoHeader}, and your own pixel/palette coders.
 *
 * @returns A coder for {@link BmpFile}.
 *
 * @example Round-trip a 2×2 32bpp top-down image
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { bmp } from "@binstruct/bmp";
 *
 * const coder = bmp();
 * const image = {
 *   file: {
 *     signature: "BM",
 *     fileSize: 70,
 *     reserved1: 0,
 *     reserved2: 0,
 *     pixelOffset: 54,
 *   },
 *   dib: {
 *     size: 40,
 *     width: 2,
 *     height: -2, // top-down
 *     planes: 1,
 *     bpp: 32,
 *     compression: 0,
 *     imageSize: 16,
 *     xPixelsPerMeter: 0,
 *     yPixelsPerMeter: 0,
 *     colorsUsed: 0,
 *     importantColors: 0,
 *   },
 *   // deno-fmt-ignore
 *   pixelData: new Uint8Array([
 *     0x00, 0x00, 0xff, 0xff,  0xff, 0x00, 0x00, 0xff,
 *     0x00, 0xff, 0x00, 0xff,  0xff, 0xff, 0xff, 0xff,
 *   ]),
 * };
 *
 * const buffer = new Uint8Array(image.file.fileSize);
 * const bytesWritten = coder.encode(image, buffer);
 * const [decoded, bytesRead] = coder.decode(buffer);
 *
 * assertEquals(bytesWritten, 70);
 * assertEquals(bytesRead, 70);
 * assertEquals(decoded.dib.height, -2);
 * assertEquals(decoded.pixelData, image.pixelData);
 * ```
 */
export function bmp(): Coder<BmpFile> {
  const dibCoder = bitmapInfoHeader();

  return struct({
    file: bitmapFileHeader(),
    dib: dibCoder,
    pixelData: bytes(
      computedRef(
        [
          ref(dibCoder.widthCoder),
          ref(dibCoder.heightCoder),
          ref(dibCoder.bppCoder),
        ],
        (width, height, bpp) => pixelDataSize(width, height, bpp),
      ),
    ),
  });
}
