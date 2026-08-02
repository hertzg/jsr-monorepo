/**
 * POSIX ustar tar archive header encoding and decoding.
 *
 * A tar archive is a sequence of fixed-size 512-byte blocks. Each member
 * (file, directory, link, ...) starts with one 512-byte ustar header block,
 * optionally followed by the member's data rounded up to a multiple of 512
 * bytes:
 *
 * ```text
 * offset  size  field
 * ------  ----  -----------------------------------------
 *      0   100  name
 *    100     8  mode      (octal ASCII)
 *    108     8  uid       (octal ASCII)
 *    116     8  gid       (octal ASCII)
 *    124    12  size      (octal ASCII)
 *    136    12  mtime     (octal ASCII)
 *    148     8  checksum  (octal ASCII)
 *    156     1  typeflag
 *    157   100  linkname
 *    257     6  magic     ("ustar" + NUL)
 *    263     2  version
 *    265    32  uname
 *    297    32  gname
 *    329     8  devmajor
 *    337     8  devminor
 *    345   155  prefix
 *    500    12  padding
 * ------  ----  -----------------------------------------
 *            512  total
 * ```
 *
 * All multi-character fields are ASCII, left-justified and NUL-padded to
 * their field width. `mode`, `uid`, `gid`, `size`, `mtime` and `checksum` are
 * additionally numeric: an octal number rendered as ASCII digits, zero-padded
 * and NUL-terminated within the field. This coder refines those six fields to
 * and from `number`, and trims the NUL padding from every other string field
 * transparently.
 *
 * `devmajor` and `devminor` only carry meaning for the character-special and
 * block-special typeflags; they are decoded as trimmed strings rather than
 * numbers since ustar leaves their content undefined for every other
 * typeflag, including the {@linkcode TAR_TYPEFLAG} values this coder targets.
 *
 * This package covers a single 512-byte header block only. It does not walk
 * a multi-member archive, does not size or read the data blocks that follow
 * a header, and does not compute or verify the `checksum` field — all of
 * that is left to the caller for now.
 *
 * @example Round-trip a regular-file header
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import {
 *   TAR_BLOCK_SIZE,
 *   TAR_TYPEFLAG,
 *   USTAR_MAGIC,
 *   USTAR_VERSION,
 *   ustarHeader,
 * } from "@binstruct/tar";
 *
 * const coder = ustarHeader();
 * const header = {
 *   name: "hello.txt",
 *   mode: 0o644,
 *   uid: 1000,
 *   gid: 1000,
 *   size: 5,
 *   mtime: 1_700_000_000,
 *   checksum: 0,
 *   typeflag: TAR_TYPEFLAG.regularFile,
 *   linkname: "",
 *   magic: USTAR_MAGIC,
 *   version: USTAR_VERSION,
 *   uname: "user",
 *   gname: "user",
 *   devmajor: "",
 *   devminor: "",
 *   prefix: "",
 *   padding: new Uint8Array(12),
 * };
 *
 * const buffer = new Uint8Array(TAR_BLOCK_SIZE);
 * const written = coder.encode(header, buffer);
 * const [decoded, read] = coder.decode(buffer);
 *
 * assertEquals(written, TAR_BLOCK_SIZE);
 * assertEquals(read, TAR_BLOCK_SIZE);
 * assertEquals(decoded, header);
 * ```
 *
 * @module
 */

import { bytes, type Coder, refine, struct } from "@hertzg/binstruct";

/**
 * Size in bytes of a single tar block, and therefore of the ustar header
 * itself. Every header and every member's data are padded to a multiple of
 * this size.
 */
export const TAR_BLOCK_SIZE = 512;

/**
 * The ustar `magic` field: the literal string `"ustar"` stored NUL-terminated
 * in a 6-byte field. Distinguishes a ustar header from the older, incompatible
 * V7 tar format.
 */
export const USTAR_MAGIC = "ustar";

/**
 * The ustar `version` field for the format this coder targets: the two ASCII
 * digits `"00"` (not NUL-terminated — it fills the whole 2-byte field).
 */
export const USTAR_VERSION = "00";

/**
 * Well-known values of the ustar `typeflag` field. Only the subset relevant
 * to a header-only, non-archival v0.0.1 is included.
 */
export const TAR_TYPEFLAG = {
  /** A regular file. */
  regularFile: "0",
  /** A hard link to another member already in the archive. */
  hardLink: "1",
  /** A symbolic link; `linkname` holds the link target. */
  symlink: "2",
  /** A directory. */
  directory: "5",
} as const;

/**
 * Decoded ustar header — one 512-byte block describing a single archive
 * member.
 *
 * @property name      - Member path, up to 100 bytes. Combined with `prefix` for paths longer than 100 bytes: the full path is `prefix + "/" + name` when `prefix` is non-empty.
 * @property mode       - Unix permission bits (e.g. `0o644`).
 * @property uid        - Numeric owner user ID.
 * @property gid        - Numeric owner group ID.
 * @property size       - Data size in bytes of the member that follows this header, before rounding up to {@linkcode TAR_BLOCK_SIZE}. Meaningless for typeflags that carry no data, such as {@linkcode TAR_TYPEFLAG.directory}.
 * @property mtime      - Modification time as a Unix timestamp (seconds since epoch).
 * @property checksum   - Header checksum. Not computed or verified by this coder — see the module docs.
 * @property typeflag   - Member type, one character. See {@linkcode TAR_TYPEFLAG}.
 * @property linkname   - Link target, up to 100 bytes. Meaningful for {@linkcode TAR_TYPEFLAG.hardLink} and {@linkcode TAR_TYPEFLAG.symlink}.
 * @property magic       - Format marker. {@linkcode USTAR_MAGIC} for a valid ustar header; surfaced verbatim rather than validated.
 * @property version     - Format version. {@linkcode USTAR_VERSION} for the format this coder targets; surfaced verbatim rather than validated.
 * @property uname       - Owner user name, up to 32 bytes.
 * @property gname       - Owner group name, up to 32 bytes.
 * @property devmajor    - Device major number as a trimmed string, up to 8 bytes. Only meaningful for character- and block-special members, which this coder does not otherwise model; kept as text rather than parsed to a number.
 * @property devminor    - Device minor number as a trimmed string, up to 8 bytes. See `devmajor`.
 * @property prefix      - Path prefix, up to 155 bytes. See `name`.
 * @property padding     - The trailing 12 reserved bytes of the header block, verbatim.
 */
export interface UstarHeader {
  name: string;
  mode: number;
  uid: number;
  gid: number;
  size: number;
  mtime: number;
  checksum: number;
  typeflag: string;
  linkname: string;
  magic: string;
  version: string;
  uname: string;
  gname: string;
  devmajor: string;
  devminor: string;
  prefix: string;
  padding: Uint8Array;
}

/**
 * Trims a NUL-padded field down to its meaningful text: everything before the
 * first NUL byte, decoded as UTF-8.
 */
function decodeNulPaddedString(encoded: Uint8Array): string {
  const nul = encoded.indexOf(0);
  const bytesUsed = nul === -1 ? encoded : encoded.subarray(0, nul);
  return new TextDecoder().decode(bytesUsed);
}

/**
 * Encodes text into a fixed-width, NUL-padded field. `length` bytes are
 * always produced, zero-filled past whatever `decoded` contributes, so the
 * padding is explicit rather than relying on the caller's buffer already
 * being zeroed.
 */
function encodeNulPaddedString(decoded: string, length: number): Uint8Array {
  const field = new Uint8Array(length);
  new TextEncoder().encodeInto(decoded, field);
  return field;
}

/**
 * Creates a coder for a fixed-width, left-justified, NUL-padded ASCII text
 * field of `length` bytes.
 */
function nulPaddedString(length: number): Coder<string> {
  return refine(bytes(length), {
    refine: decodeNulPaddedString,
    unrefine: (decoded: string) => encodeNulPaddedString(decoded, length),
  })();
}

/**
 * Parses a ustar numeric field: octal ASCII digits, NUL- and/or space-padded.
 */
function decodeOctalField(encoded: Uint8Array): number {
  const text = decodeNulPaddedString(encoded).replace(/[\0 ]+$/, "").trim();
  return text.length === 0 ? 0 : parseInt(text, 8);
}

/**
 * Renders a number as a ustar numeric field: octal ASCII digits, zero-padded
 * to fill `length - 1` bytes, followed by a single NUL terminator.
 */
function encodeOctalField(decoded: number, length: number): Uint8Array {
  const digits = Math.trunc(decoded).toString(8).padStart(length - 1, "0");
  return new TextEncoder().encode(`${digits}\0`);
}

/**
 * Creates a coder for a fixed-width ustar numeric field of `length` bytes:
 * an octal ASCII number, NUL-terminated within the field.
 */
function octalField(length: number): Coder<number> {
  return refine(bytes(length), {
    refine: decodeOctalField,
    unrefine: (decoded: number) => encodeOctalField(decoded, length),
  })();
}

/**
 * Creates a coder for a single 512-byte POSIX ustar header block.
 *
 * Covers header layout only, matching {@linkcode UstarHeader}: the six
 * numeric fields (`mode`, `uid`, `gid`, `size`, `mtime`, `checksum`) round-trip
 * through `number`, the remaining text fields round-trip through trimmed
 * `string`, and `padding` is exposed as the raw trailing 12 bytes. Nothing is
 * validated or computed on encode — `checksum` in particular is written
 * exactly as given.
 *
 * @returns A coder for {@linkcode UstarHeader} values.
 *
 * @example Decode a known header and re-encode it byte-for-byte
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { TAR_BLOCK_SIZE, TAR_TYPEFLAG, ustarHeader } from "@binstruct/tar";
 *
 * const coder = ustarHeader();
 *
 * const buffer = new Uint8Array(TAR_BLOCK_SIZE);
 * const written = coder.encode({
 *   name: "dir/file.txt",
 *   mode: 0o100644,
 *   uid: 0,
 *   gid: 0,
 *   size: 11,
 *   mtime: 1_700_000_000,
 *   checksum: 0,
 *   typeflag: TAR_TYPEFLAG.regularFile,
 *   linkname: "",
 *   magic: "ustar",
 *   version: "00",
 *   uname: "root",
 *   gname: "root",
 *   devmajor: "",
 *   devminor: "",
 *   prefix: "",
 *   padding: new Uint8Array(12),
 * }, buffer);
 *
 * const [decoded, read] = coder.decode(buffer);
 *
 * assertEquals(written, TAR_BLOCK_SIZE);
 * assertEquals(read, TAR_BLOCK_SIZE);
 * assertEquals(decoded.name, "dir/file.txt");
 * assertEquals(decoded.mode, 0o100644);
 * assertEquals(decoded.size, 11);
 * assertEquals(decoded.typeflag, TAR_TYPEFLAG.regularFile);
 * ```
 */
export function ustarHeader(): Coder<UstarHeader> {
  return struct({
    name: nulPaddedString(100),
    mode: octalField(8),
    uid: octalField(8),
    gid: octalField(8),
    size: octalField(12),
    mtime: octalField(12),
    checksum: octalField(8),
    typeflag: nulPaddedString(1),
    linkname: nulPaddedString(100),
    magic: nulPaddedString(6),
    version: nulPaddedString(2),
    uname: nulPaddedString(32),
    gname: nulPaddedString(32),
    devmajor: nulPaddedString(8),
    devminor: nulPaddedString(8),
    prefix: nulPaddedString(155),
    padding: bytes(12),
  });
}
