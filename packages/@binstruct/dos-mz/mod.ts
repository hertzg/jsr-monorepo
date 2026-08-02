/**
 * DOS MZ executable header encoding and decoding.
 *
 * Every DOS, Windows PE, and OS/2 LE/LX executable opens with a 64-byte
 * little-endian MZ header (named after Mark Zbikowski, its author at
 * Microsoft):
 *
 * ```text
 * Offset  Size  Field
 * 0x00    2     signature              ("MZ", 0x5a4d)
 * 0x02    2     lastPageBytes
 * 0x04    2     pageCount
 * 0x06    2     relocationCount
 * 0x08    2     headerParagraphs
 * 0x0a    2     minExtraParagraphs
 * 0x0c    2     maxExtraParagraphs
 * 0x0e    2     initialSS
 * 0x10    2     initialSP
 * 0x12    2     checksum
 * 0x14    2     initialIP
 * 0x16    2     initialCS
 * 0x18    2     relocationTableOffset
 * 0x1a    2     overlayNumber
 * 0x1c    8     reserved1
 * 0x24    2     oemIdentifier
 * 0x26    2     oemInfo
 * 0x28    20    reserved2
 * 0x3c    4     newHeaderOffset        (e_lfanew)
 * ```
 *
 * Every field is little-endian — DOS executables originate on x86, which is
 * natively little-endian.
 *
 * `newHeaderOffset` (commonly called `e_lfanew`) points past the DOS stub —
 * the tiny 16-bit program that prints "This program cannot be run in DOS
 * mode." — to a richer header such as PE's `PE\0\0` signature. This coder
 * only covers the 64-byte MZ header itself: it does not read the DOS stub
 * or follow `newHeaderOffset` into a PE/LE/LX header. Parsing what lives at
 * that offset is out of scope for v0.0.1.
 *
 * @example Round-trip a minimal header
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { dosMzHeader, MZ_HEADER_SIZE, MZ_SIGNATURE } from "@binstruct/dos-mz";
 *
 * const coder = dosMzHeader();
 * const header = {
 *   signature: MZ_SIGNATURE,
 *   lastPageBytes: 0x90,
 *   pageCount: 3,
 *   relocationCount: 0,
 *   headerParagraphs: 4,
 *   minExtraParagraphs: 0,
 *   maxExtraParagraphs: 0xffff,
 *   initialSS: 0,
 *   initialSP: 0xb8,
 *   checksum: 0,
 *   initialIP: 0,
 *   initialCS: 0,
 *   relocationTableOffset: 0x40,
 *   overlayNumber: 0,
 *   reserved1: new Uint8Array(8),
 *   oemIdentifier: 0,
 *   oemInfo: 0,
 *   reserved2: new Uint8Array(20),
 *   newHeaderOffset: 0x80,
 * };
 *
 * const buffer = new Uint8Array(MZ_HEADER_SIZE);
 * const written = coder.encode(header, buffer);
 * const [decoded, read] = coder.decode(buffer);
 *
 * assertEquals(written, MZ_HEADER_SIZE);
 * assertEquals(read, MZ_HEADER_SIZE);
 * assertEquals(decoded, header);
 * ```
 *
 * @module
 */

import { bytes, type Coder, struct, u16le, u32le } from "@hertzg/binstruct";

/**
 * Size in bytes of the DOS MZ header.
 */
export const MZ_HEADER_SIZE = 64;

/**
 * The MZ magic number — the ASCII bytes `"MZ"` read as a little-endian
 * 16-bit integer (`0x5a4d`).
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { MZ_SIGNATURE } from "@binstruct/dos-mz";
 *
 * assertEquals(MZ_SIGNATURE, 0x5a4d);
 * assertEquals(String.fromCharCode(0x4d, 0x5a), "MZ");
 * ```
 */
export const MZ_SIGNATURE = 0x5a4d;

/**
 * Value of `overlayNumber` for the main program, as opposed to a numbered
 * overlay loaded on demand by overlay-based DOS executables.
 */
export const MZ_OVERLAY_MAIN_PROGRAM = 0;

/**
 * Decoded DOS MZ executable header.
 *
 * @property signature             - Always {@linkcode MZ_SIGNATURE} for a valid file; surfaced verbatim rather than validated.
 * @property lastPageBytes         - Number of bytes used on the last page of the file image (a "page" here is 512 bytes). `0` means the last page is fully used.
 * @property pageCount             - Number of 512-byte pages in the file image, including the last (possibly partial) one.
 * @property relocationCount       - Number of entries in the relocation table.
 * @property headerParagraphs      - Size of the header in 16-byte paragraphs, including the relocation table. The program image starts at `headerParagraphs * 16`.
 * @property minExtraParagraphs    - Minimum number of extra paragraphs to allocate beyond the program image (the BSS/stack area).
 * @property maxExtraParagraphs    - Maximum number of extra paragraphs to allocate. `0xffff` conventionally requests all available memory.
 * @property initialSS             - Initial value of the SS register, relative to the start of the program image (in paragraphs).
 * @property initialSP             - Initial value of the SP register.
 * @property checksum              - Header checksum. Rarely validated by loaders; often left as `0`.
 * @property initialIP             - Initial value of the IP register.
 * @property initialCS             - Initial value of the CS register, relative to the start of the program image (in paragraphs).
 * @property relocationTableOffset - Byte offset from the start of the file to the relocation table.
 * @property overlayNumber         - Overlay number. {@linkcode MZ_OVERLAY_MAIN_PROGRAM} (`0`) for the main program.
 * @property reserved1             - 8 reserved bytes, conventionally zero.
 * @property oemIdentifier         - OEM identifier, meaning defined by `oemInfo`.
 * @property oemInfo               - OEM-specific information, meaning defined by `oemIdentifier`.
 * @property reserved2             - 20 reserved bytes, conventionally zero.
 * @property newHeaderOffset       - Byte offset from the start of the file to a richer header (e.g. PE's `PE\0\0` signature), commonly called `e_lfanew`. Not followed by this coder.
 */
export interface DosMzHeader {
  signature: number;
  lastPageBytes: number;
  pageCount: number;
  relocationCount: number;
  headerParagraphs: number;
  minExtraParagraphs: number;
  maxExtraParagraphs: number;
  initialSS: number;
  initialSP: number;
  checksum: number;
  initialIP: number;
  initialCS: number;
  relocationTableOffset: number;
  overlayNumber: number;
  reserved1: Uint8Array;
  oemIdentifier: number;
  oemInfo: number;
  reserved2: Uint8Array;
  newHeaderOffset: number;
}

/**
 * Creates a coder for a DOS MZ executable header.
 *
 * Covers only the fixed 64-byte header — it does not read the DOS stub
 * program or anything at `newHeaderOffset`. Nothing is validated on encode
 * or decode: `signature` is surfaced and written exactly as given.
 *
 * @returns A coder for {@linkcode DosMzHeader} values.
 *
 * @example Decode a known header (a minimal "hello world" .exe)
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { dosMzHeader, MZ_HEADER_SIZE, MZ_SIGNATURE } from "@binstruct/dos-mz";
 *
 * // deno-fmt-ignore
 * const wire = new Uint8Array([
 *   0x4d, 0x5a, // signature = "MZ"
 *   0x90, 0x00, // lastPageBytes = 0x90
 *   0x03, 0x00, // pageCount = 3
 *   0x00, 0x00, // relocationCount = 0
 *   0x04, 0x00, // headerParagraphs = 4
 *   0x00, 0x00, // minExtraParagraphs = 0
 *   0xff, 0xff, // maxExtraParagraphs = 0xffff
 *   0x00, 0x00, // initialSS = 0
 *   0xb8, 0x00, // initialSP = 0xb8
 *   0x00, 0x00, // checksum = 0
 *   0x00, 0x00, // initialIP = 0
 *   0x00, 0x00, // initialCS = 0
 *   0x40, 0x00, // relocationTableOffset = 0x40
 *   0x00, 0x00, // overlayNumber = 0
 *   0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // reserved1
 *   0x00, 0x00, // oemIdentifier = 0
 *   0x00, 0x00, // oemInfo = 0
 *   0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
 *   0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
 *   0x00, 0x00, 0x00, 0x00, // reserved2
 *   0x80, 0x00, 0x00, 0x00, // newHeaderOffset = 0x80
 * ]);
 *
 * const [decoded, read] = dosMzHeader().decode(wire);
 *
 * assertEquals(read, MZ_HEADER_SIZE);
 * assertEquals(decoded.signature, MZ_SIGNATURE);
 * assertEquals(decoded.pageCount, 3);
 * assertEquals(decoded.relocationTableOffset, 0x40);
 * assertEquals(decoded.newHeaderOffset, 0x80);
 * ```
 */
export function dosMzHeader(): Coder<DosMzHeader> {
  return struct({
    signature: u16le(),
    lastPageBytes: u16le(),
    pageCount: u16le(),
    relocationCount: u16le(),
    headerParagraphs: u16le(),
    minExtraParagraphs: u16le(),
    maxExtraParagraphs: u16le(),
    initialSS: u16le(),
    initialSP: u16le(),
    checksum: u16le(),
    initialIP: u16le(),
    initialCS: u16le(),
    relocationTableOffset: u16le(),
    overlayNumber: u16le(),
    reserved1: bytes(8),
    oemIdentifier: u16le(),
    oemInfo: u16le(),
    reserved2: bytes(20),
    newHeaderOffset: u32le(),
  });
}
