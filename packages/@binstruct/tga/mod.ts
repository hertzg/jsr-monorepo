/**
 * Truevision TGA (`.tga`) image header encoding and decoding.
 *
 * A TGA file opens with an 18-byte header, immediately followed by a
 * variable-length image ID field:
 *
 * ```text
 * Offset  Size  Field
 * ------  ----  ------------------------------------------
 *      0     1  ID Length
 *      1     1  Color Map Type
 *      2     1  Image Type
 *      3     2  Color Map First Entry Index (LE)
 *      5     2  Color Map Length (LE)
 *      7     1  Color Map Entry Size
 *      8     2  X-Origin (LE)
 *     10     2  Y-Origin (LE)
 *     12     2  Width (LE)
 *     14     2  Height (LE)
 *     16     1  Pixel Depth
 *     17     1  Image Descriptor
 *     18     N  Image ID (N = ID Length)
 * ```
 *
 * Every multi-byte field is little-endian. `idLength` gives the size in bytes
 * of the `imageId` field that immediately follows the fixed header — a value
 * of `0` means no image ID is present.
 *
 * This module covers the header (and the image ID field it sizes) only. The
 * optional color map, the pixel data, and the optional TGA 2.0 footer /
 * extension area are all out of scope for v0.0.1 — shallow, header-level
 * parsing is the goal, not a full TGA codec.
 *
 * @example Round-trip a header with no image ID
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { tgaHeader, TGA_IMAGE_TYPE } from "@binstruct/tga";
 *
 * const coder = tgaHeader();
 * const header = {
 *   idLength: 0,
 *   colorMapType: 0,
 *   imageType: TGA_IMAGE_TYPE.trueColor,
 *   colorMapFirstEntryIndex: 0,
 *   colorMapLength: 0,
 *   colorMapEntrySize: 0,
 *   xOrigin: 0,
 *   yOrigin: 0,
 *   width: 64,
 *   height: 32,
 *   pixelDepth: 24,
 *   imageDescriptor: 0,
 *   imageId: new Uint8Array(0),
 * };
 *
 * const buffer = new Uint8Array(18);
 * const written = coder.encode(header, buffer);
 * const [decoded, read] = coder.decode(buffer);
 *
 * assertEquals(written, 18);
 * assertEquals(read, 18);
 * assertEquals(decoded.width, 64);
 * assertEquals(decoded.height, 32);
 * assertEquals(decoded.imageType, TGA_IMAGE_TYPE.trueColor);
 * ```
 *
 * @module
 */

import { bytes, type Coder, ref, struct, u16le, u8be } from "@hertzg/binstruct";

/**
 * Size in bytes of the fixed portion of a TGA header, before the variable-
 * length `imageId` field.
 */
export const TGA_HEADER_SIZE = 18;

/**
 * Well-known values used by the TGA header's `imageType` field.
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { TGA_IMAGE_TYPE } from "@binstruct/tga";
 *
 * assertEquals(TGA_IMAGE_TYPE.trueColor, 2);
 * assertEquals(TGA_IMAGE_TYPE.rleTrueColor, 10);
 * ```
 */
export const TGA_IMAGE_TYPE = {
  /** No image data is present. */
  noImage: 0,
  /** Uncompressed, color-mapped image. */
  colorMapped: 1,
  /** Uncompressed, true-color image. */
  trueColor: 2,
  /** Uncompressed, black-and-white (grayscale) image. */
  grayscale: 3,
  /** Run-length encoded, color-mapped image. */
  rleColorMapped: 9,
  /** Run-length encoded, true-color image. */
  rleTrueColor: 10,
  /** Run-length encoded, black-and-white (grayscale) image. */
  rleGrayscale: 11,
} as const;

/**
 * Decoded Truevision TGA image header.
 *
 * @property idLength                 - Length in bytes of {@linkcode TgaHeader.imageId}. `0` means no image ID.
 * @property colorMapType              - `0` if no color map is present, `1` if one is present.
 * @property imageType                 - How the image data is stored. See {@linkcode TGA_IMAGE_TYPE}.
 * @property colorMapFirstEntryIndex   - Index of the first color map entry that is included in the file.
 * @property colorMapLength            - Number of entries in the color map.
 * @property colorMapEntrySize         - Number of bits per color map entry (typically 15, 16, 24, or 32).
 * @property xOrigin                   - X coordinate of the lower-left corner of the image.
 * @property yOrigin                   - Y coordinate of the lower-left corner of the image.
 * @property width                     - Image width in pixels.
 * @property height                    - Image height in pixels.
 * @property pixelDepth                - Bits per pixel (typically 8, 16, 24, or 32).
 * @property imageDescriptor           - Alpha channel depth (bits 0-3) and image origin/interleaving flags (bits 4-7).
 * @property imageId                   - Optional identification field, `idLength` bytes long.
 */
export interface TgaHeader {
  idLength: number;
  colorMapType: number;
  imageType: number;
  colorMapFirstEntryIndex: number;
  colorMapLength: number;
  colorMapEntrySize: number;
  xOrigin: number;
  yOrigin: number;
  width: number;
  height: number;
  pixelDepth: number;
  imageDescriptor: number;
  imageId: Uint8Array;
}

/**
 * Creates a coder for a Truevision TGA image header.
 *
 * The `imageId` field's length is derived from `idLength`, so a header with
 * no image ID needs `idLength = 0` and an empty `imageId`.
 *
 * Nothing beyond the header and image ID is parsed — the color map, pixel
 * data, and TGA 2.0 footer/extension area are all left to the caller.
 * Nothing is validated on encode either: `idLength` is written exactly as
 * given, so it must match `imageId.length`.
 *
 * @returns A coder for {@linkcode TgaHeader} values.
 *
 * @example Header carrying an image ID
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { tgaHeader, TGA_HEADER_SIZE, TGA_IMAGE_TYPE } from "@binstruct/tga";
 *
 * const imageId = new TextEncoder().encode("frame01");
 * const coder = tgaHeader();
 * const header = {
 *   idLength: imageId.length,
 *   colorMapType: 0,
 *   imageType: TGA_IMAGE_TYPE.grayscale,
 *   colorMapFirstEntryIndex: 0,
 *   colorMapLength: 0,
 *   colorMapEntrySize: 0,
 *   xOrigin: 0,
 *   yOrigin: 0,
 *   width: 16,
 *   height: 16,
 *   pixelDepth: 8,
 *   imageDescriptor: 0,
 *   imageId,
 * };
 *
 * const buffer = new Uint8Array(64);
 * const written = coder.encode(header, buffer);
 * const [decoded, read] = coder.decode(buffer.subarray(0, written));
 *
 * assertEquals(written, TGA_HEADER_SIZE + imageId.length);
 * assertEquals(read, written);
 * assertEquals(decoded.imageId, imageId);
 * assertEquals(decoded.idLength, imageId.length);
 * ```
 *
 * @example Known wire bytes for a color-mapped image
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { tgaHeader, TGA_IMAGE_TYPE } from "@binstruct/tga";
 *
 * // deno-fmt-ignore
 * const wire = new Uint8Array([
 *   0x00,             // idLength = 0
 *   0x01,             // colorMapType = 1 (present)
 *   0x01,             // imageType = colorMapped
 *   0x00, 0x00,       // colorMapFirstEntryIndex = 0
 *   0x00, 0x01,       // colorMapLength = 256
 *   0x18,             // colorMapEntrySize = 24
 *   0x00, 0x00,       // xOrigin = 0
 *   0x00, 0x00,       // yOrigin = 0
 *   0x0a, 0x00,       // width = 10
 *   0x0a, 0x00,       // height = 10
 *   0x08,             // pixelDepth = 8
 *   0x00,             // imageDescriptor = 0
 * ]);
 *
 * const [decoded, read] = tgaHeader().decode(wire);
 *
 * assertEquals(read, wire.length);
 * assertEquals(decoded.imageType, TGA_IMAGE_TYPE.colorMapped);
 * assertEquals(decoded.colorMapLength, 256);
 * assertEquals(decoded.width, 10);
 * assertEquals(decoded.height, 10);
 * assertEquals(decoded.imageId.length, 0);
 * ```
 */
export function tgaHeader(): Coder<TgaHeader> {
  const idLength = u8be();

  return struct({
    idLength,
    colorMapType: u8be(),
    imageType: u8be(),
    colorMapFirstEntryIndex: u16le(),
    colorMapLength: u16le(),
    colorMapEntrySize: u8be(),
    xOrigin: u16le(),
    yOrigin: u16le(),
    width: u16le(),
    height: u16le(),
    pixelDepth: u8be(),
    imageDescriptor: u8be(),
    imageId: bytes(ref(idLength)),
  });
}
