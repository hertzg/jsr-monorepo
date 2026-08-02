/**
 * ICO/CUR icon directory encoding and decoding.
 *
 * An `.ico` (or `.cur`) file opens with a 6-byte `ICONDIR` header followed by
 * `imageCount` fixed-size 16-byte `ICONDIRENTRY` records, one per embedded
 * image:
 *
 * ```text
 * ICONDIR (6 bytes)
 *  0                7 8               15
 * +------------------+------------------+
 * |            Reserved (0)             |
 * +------------------+------------------+
 * |             Image Type              |
 * +------------------+------------------+
 * |             Image Count             |
 * +------------------+------------------+
 *
 * ICONDIRENTRY (16 bytes, repeated Image Count times)
 *  0        7 8       15 16      23 24      31
 * +----------+----------+----------+----------+
 * |  Width   |  Height  |ColorCount| Reserved |
 * +----------+----------+----------+----------+
 * |       Planes        |      Bit Count      |
 * +----------+----------+----------+----------+
 * |               Data Size                   |
 * +----------+----------+----------+----------+
 * |              Data Offset                   |
 * +----------+----------+----------+----------+
 * ```
 *
 * All multi-byte fields are little-endian, matching the format's Windows
 * origin.
 *
 * This coder covers the directory only — `dataOffset` and `dataSize` locate
 * each embedded image (a BMP or PNG payload) within the file, but decoding
 * that payload is left to the caller and, for BMP entries, to
 * {@linkcode https://jsr.io/@binstruct/bmp @binstruct/bmp}. v0.0.1 is
 * deliberately shallow: no image payload parsing, no compression, no
 * validation of `width`/`height`/`colorCount` beyond surfacing them verbatim.
 *
 * @example Round-trip a directory with one entry
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { icoDir, ICO_IMAGE_TYPE } from "@binstruct/ico";
 *
 * const coder = icoDir();
 * const dir = {
 *   reserved: 0,
 *   imageType: ICO_IMAGE_TYPE.ICON,
 *   imageCount: 1,
 *   entries: [
 *     {
 *       width: 32,
 *       height: 32,
 *       colorCount: 0,
 *       reserved: 0,
 *       planes: 1,
 *       bitCount: 32,
 *       dataSize: 744,
 *       dataOffset: 22,
 *     },
 *   ],
 * };
 *
 * const buffer = new Uint8Array(64);
 * const written = coder.encode(dir, buffer);
 * const [decoded, read] = coder.decode(buffer.subarray(0, written));
 *
 * assertEquals(written, read);
 * assertEquals(decoded, dir);
 * ```
 *
 * @module
 */

import {
  array,
  type Coder,
  ref,
  struct,
  u16le,
  u32le,
  u8,
} from "@hertzg/binstruct";

/**
 * Size in bytes of the `ICONDIR` header (`reserved` + `imageType` +
 * `imageCount`), before the entry array.
 */
export const ICONDIR_SIZE = 6;

/**
 * Size in bytes of a single `ICONDIRENTRY` record.
 */
export const ICONDIRENTRY_SIZE = 16;

/**
 * Values used by the `ICONDIR.imageType` field.
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ICO_IMAGE_TYPE } from "@binstruct/ico";
 *
 * assertEquals(ICO_IMAGE_TYPE.ICON, 1);
 * assertEquals(ICO_IMAGE_TYPE.CURSOR, 2);
 * ```
 */
export const ICO_IMAGE_TYPE = {
  /** File contains icon images. */
  ICON: 1,
  /** File contains cursor images. */
  CURSOR: 2,
} as const;

/**
 * Decoded `ICONDIRENTRY` record describing one embedded image.
 *
 * @property width      - Image width in pixels. `0` conventionally means 256.
 * @property height     - Image height in pixels. `0` conventionally means 256.
 * @property colorCount  - Number of colors in the palette, or `0` if `bitCount` is 8 or greater.
 * @property reserved    - Reserved; should be `0`. Surfaced verbatim rather than validated.
 * @property planes      - Color planes for icons; cursor hotspot X coordinate for cursors.
 * @property bitCount    - Bits per pixel for icons; cursor hotspot Y coordinate for cursors.
 * @property dataSize    - Size in bytes of the embedded image payload (BMP or PNG).
 * @property dataOffset  - Byte offset from the start of the file to the embedded image payload.
 */
export interface IcoDirEntry {
  width: number;
  height: number;
  colorCount: number;
  reserved: number;
  planes: number;
  bitCount: number;
  dataSize: number;
  dataOffset: number;
}

/**
 * Decoded `ICONDIR` icon directory.
 *
 * @property reserved    - Reserved; must be `0` for a valid file. Surfaced verbatim rather than validated.
 * @property imageType    - `1` for icon, `2` for cursor. See {@linkcode ICO_IMAGE_TYPE}.
 * @property imageCount   - Number of entries in `entries`.
 * @property entries      - One {@linkcode IcoDirEntry} per embedded image, `imageCount` long.
 */
export interface IcoDir {
  reserved: number;
  imageType: number;
  imageCount: number;
  entries: IcoDirEntry[];
}

/**
 * Creates a coder for an ICO/CUR icon directory.
 *
 * Decodes/encodes the `ICONDIR` header and its `ICONDIRENTRY` array only.
 * Embedded image payloads are not touched — use each entry's `dataOffset`
 * and `dataSize` to locate them in the surrounding file.
 *
 * `imageCount` is not computed for you on encode: set it to `entries.length`
 * yourself.
 *
 * @returns A coder for {@linkcode IcoDir} values.
 *
 * @example Decode a known two-entry ICONDIR
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { icoDir, ICO_IMAGE_TYPE, ICONDIR_SIZE, ICONDIRENTRY_SIZE } from "@binstruct/ico";
 *
 * // deno-fmt-ignore
 * const wire = new Uint8Array([
 *   0x00, 0x00, // reserved = 0
 *   0x01, 0x00, // imageType = ICON
 *   0x02, 0x00, // imageCount = 2
 *   0x10, 0x10, 0x00, 0x00, 0x01, 0x00, 0x20, 0x00, 0x68, 0x04, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
 *   0x20, 0x20, 0x00, 0x00, 0x01, 0x00, 0x20, 0x00, 0x28, 0x09, 0x00, 0x00, 0x7e, 0x04, 0x00, 0x00,
 * ]);
 *
 * const [decoded, read] = icoDir().decode(wire);
 *
 * assertEquals(read, ICONDIR_SIZE + 2 * ICONDIRENTRY_SIZE);
 * assertEquals(decoded.imageType, ICO_IMAGE_TYPE.ICON);
 * assertEquals(decoded.imageCount, 2);
 * assertEquals(decoded.entries.length, 2);
 * assertEquals(decoded.entries[0].width, 16);
 * assertEquals(decoded.entries[0].height, 16);
 * assertEquals(decoded.entries[0].bitCount, 32);
 * assertEquals(decoded.entries[0].dataSize, 0x468);
 * assertEquals(decoded.entries[0].dataOffset, 0x16);
 * assertEquals(decoded.entries[1].width, 32);
 * assertEquals(decoded.entries[1].dataOffset, 0x47e);
 * ```
 */
export function icoDir(): Coder<IcoDir> {
  const imageCount = u16le();

  return struct({
    reserved: u16le(),
    imageType: u16le(),
    imageCount,
    entries: array(
      struct({
        width: u8(),
        height: u8(),
        colorCount: u8(),
        reserved: u8(),
        planes: u16le(),
        bitCount: u16le(),
        dataSize: u32le(),
        dataOffset: u32le(),
      }),
      ref(imageCount),
    ),
  });
}
