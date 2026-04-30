import { type Coder, string, struct, u16le, u32le } from "@hertzg/binstruct";

/**
 * BITMAPFILEHEADER — the fixed 14-byte preamble of a BMP/DIB file.
 *
 * Always little-endian; the two-byte signature is "BM" for standard Windows
 * bitmaps (other variants like "BA", "CI", "CP", "IC", "PT" are out of scope).
 *
 * @property signature      Two ASCII characters identifying the file. Always "BM" for Windows BMP.
 * @property fileSize       Total size of the BMP file in bytes.
 * @property reserved1      Reserved; typically zero. Some encoders embed metadata here.
 * @property reserved2      Reserved; typically zero.
 * @property pixelOffset    Byte offset from the start of the file to the pixel data.
 *
 * @example Shape of a BITMAPFILEHEADER
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import type { BitmapFileHeader } from "@binstruct/bmp";
 *
 * const header: BitmapFileHeader = {
 *   signature: "BM",
 *   fileSize: 70,
 *   reserved1: 0,
 *   reserved2: 0,
 *   pixelOffset: 54,
 * };
 *
 * assertEquals(header.signature, "BM");
 * assertEquals(header.pixelOffset, 54);
 * ```
 */
export interface BitmapFileHeader {
  signature: string;
  fileSize: number;
  reserved1: number;
  reserved2: number;
  pixelOffset: number;
}

/**
 * Creates a coder for the 14-byte BITMAPFILEHEADER.
 *
 * Field layout (little-endian throughout):
 * - `signature`   2 bytes — ASCII, "BM"
 * - `fileSize`    4 bytes — u32
 * - `reserved1`   2 bytes — u16
 * - `reserved2`   2 bytes — u16
 * - `pixelOffset` 4 bytes — u32
 *
 * @returns A coder for {@link BitmapFileHeader}.
 *
 * @example Round-trip a BITMAPFILEHEADER
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { bitmapFileHeader } from "@binstruct/bmp";
 *
 * const coder = bitmapFileHeader();
 * const header = {
 *   signature: "BM",
 *   fileSize: 70,
 *   reserved1: 0,
 *   reserved2: 0,
 *   pixelOffset: 54,
 * };
 *
 * const buffer = new Uint8Array(14);
 * const bytesWritten = coder.encode(header, buffer);
 * const [decoded, bytesRead] = coder.decode(buffer);
 *
 * assertEquals(bytesWritten, 14);
 * assertEquals(bytesRead, 14);
 * assertEquals(decoded, header);
 * ```
 */
export function bitmapFileHeader(): Coder<BitmapFileHeader> {
  return struct({
    signature: string(2),
    fileSize: u32le(),
    reserved1: u16le(),
    reserved2: u16le(),
    pixelOffset: u32le(),
  });
}
