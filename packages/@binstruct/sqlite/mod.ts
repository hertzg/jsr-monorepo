/**
 * SQLite database file header encoding and decoding.
 *
 * Every SQLite database file opens with a fixed 100-byte, big-endian header
 * at offset 0 of page 1:
 *
 * ```text
 *  0      7 8     15 16    23 24    31
 * +--------+--------+--------+--------+
 * |        Magic ("SQLite format 3")  |
 * |             ... + NUL             |
 * +--------+--------+--------+--------+
 * |     Page Size   |WrVer   |RdVer   |
 * +--------+--------+--------+--------+
 * |Reserved|MaxEPF  |MinEPF  |LeafPF  |
 * +--------+--------+--------+--------+
 * |          File Change Counter      |
 * +--------+--------+--------+--------+
 * |         Database Size (pages)     |
 * +--------+--------+--------+--------+
 * |       First Freelist Trunk Page   |
 * +--------+--------+--------+--------+
 * |          Freelist Page Count      |
 * +--------+--------+--------+--------+
 * |             Schema Cookie         |
 * +--------+--------+--------+--------+
 * |          Schema Format Number     |
 * +--------+--------+--------+--------+
 * |        Default Page Cache Size    |
 * +--------+--------+--------+--------+
 * |        Largest Root B-tree Page   |
 * +--------+--------+--------+--------+
 * |            Text Encoding          |
 * +--------+--------+--------+--------+
 * |             User Version          |
 * +--------+--------+--------+--------+
 * |        Incremental Vacuum Mode    |
 * +--------+--------+--------+--------+
 * |            Application ID         |
 * +--------+--------+--------+--------+
 * |     Reserved for Expansion (20)   |
 * |                ...                |
 * +--------+--------+--------+--------+
 * |       Version-Valid-For Number    |
 * +--------+--------+--------+--------+
 * |         SQLite Version Number     |
 * +--------+--------+--------+--------+
 * ```
 *
 * Every field is big-endian. This module covers the 100-byte header only —
 * no page layout, B-tree, or record parsing. Those live at deeper offsets
 * governed by `pageSize` and are out of scope for v0.0.1.
 *
 * See the {@link https://www.sqlite.org/fileformat2.html#the_database_header SQLite file format specification}
 * for the authoritative field-by-field description.
 *
 * @example Round-trip a freshly-created database header
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import {
 *   sqliteHeader,
 *   SQLITE_HEADER_SIZE,
 *   SQLITE_MAGIC,
 *   SQLITE_TEXT_ENCODING,
 * } from "@binstruct/sqlite";
 *
 * const coder = sqliteHeader();
 * const header = {
 *   magic: SQLITE_MAGIC,
 *   pageSize: 4096,
 *   fileFormatWriteVersion: 1,
 *   fileFormatReadVersion: 1,
 *   reservedSpacePerPage: 0,
 *   maxEmbeddedPayloadFraction: 64,
 *   minEmbeddedPayloadFraction: 32,
 *   leafPayloadFraction: 32,
 *   fileChangeCounter: 1,
 *   databaseSizeInPages: 2,
 *   firstFreelistTrunkPage: 0,
 *   freelistPageCount: 0,
 *   schemaCookie: 1,
 *   schemaFormatNumber: 4,
 *   defaultPageCacheSize: 0,
 *   largestRootBtreePage: 0,
 *   textEncoding: SQLITE_TEXT_ENCODING.UTF8,
 *   userVersion: 0,
 *   incrementalVacuumMode: 0,
 *   applicationId: 0,
 *   reservedForExpansion: new Uint8Array(20),
 *   versionValidForNumber: 3045000,
 *   sqliteVersionNumber: 3045000,
 * };
 *
 * const buffer = new Uint8Array(SQLITE_HEADER_SIZE);
 * const written = coder.encode(header, buffer);
 * const [decoded, read] = coder.decode(buffer);
 *
 * assertEquals(written, SQLITE_HEADER_SIZE);
 * assertEquals(read, SQLITE_HEADER_SIZE);
 * assertEquals(decoded, header);
 * ```
 *
 * @module
 */

import {
  bytes,
  type Coder,
  string,
  struct,
  u16be,
  u32be,
  u8be,
} from "@hertzg/binstruct";

/**
 * Size in bytes of the fixed SQLite database header.
 */
export const SQLITE_HEADER_SIZE = 100;

/**
 * The SQLite header magic string — the 16-byte ASCII literal
 * `"SQLite format 3"` followed by a NUL byte.
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { SQLITE_MAGIC } from "@binstruct/sqlite";
 *
 * assertEquals(SQLITE_MAGIC.length, 16);
 * assertEquals(SQLITE_MAGIC.startsWith("SQLite format 3"), true);
 * ```
 */
export const SQLITE_MAGIC = "SQLite format 3\0";

/**
 * Values used by the header's `textEncoding` field.
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { SQLITE_TEXT_ENCODING } from "@binstruct/sqlite";
 *
 * assertEquals(SQLITE_TEXT_ENCODING.UTF8, 1);
 * assertEquals(SQLITE_TEXT_ENCODING.UTF16LE, 2);
 * assertEquals(SQLITE_TEXT_ENCODING.UTF16BE, 3);
 * ```
 */
export const SQLITE_TEXT_ENCODING = {
  /** UTF-8 */
  UTF8: 1,
  /** UTF-16 little-endian */
  UTF16LE: 2,
  /** UTF-16 big-endian */
  UTF16BE: 3,
} as const;

/**
 * Decoded SQLite database file header — the fixed 100-byte structure at the
 * start of every SQLite database file.
 *
 * @property magic                       - Always {@linkcode SQLITE_MAGIC} for a valid file; surfaced verbatim rather than validated.
 * @property pageSize                    - Database page size in bytes. Must be a power of two between 512 and 32768, or 1 meaning 65536.
 * @property fileFormatWriteVersion      - 1 for legacy rollback journalling, 2 for WAL.
 * @property fileFormatReadVersion       - 1 for legacy rollback journalling, 2 for WAL.
 * @property reservedSpacePerPage        - Bytes reserved at the end of each page for extensions.
 * @property maxEmbeddedPayloadFraction  - Must be 64 — the maximum embedded payload fraction.
 * @property minEmbeddedPayloadFraction  - Must be 32 — the minimum embedded payload fraction.
 * @property leafPayloadFraction         - Must be 32 — the leaf payload fraction.
 * @property fileChangeCounter           - Incremented on every change to the database.
 * @property databaseSizeInPages         - Size of the database file in pages.
 * @property firstFreelistTrunkPage      - Page number of the first freelist trunk page, or 0 if none.
 * @property freelistPageCount           - Total number of freelist pages.
 * @property schemaCookie                - Incremented whenever the database schema changes.
 * @property schemaFormatNumber          - Schema format number, 1 through 4.
 * @property defaultPageCacheSize        - Suggested cache size in pages.
 * @property largestRootBtreePage        - Page number of the largest root B-tree page when auto/incremental vacuum is enabled, else 0.
 * @property textEncoding                - Database text encoding. See {@linkcode SQLITE_TEXT_ENCODING}.
 * @property userVersion                 - User-controlled version number, set via `PRAGMA user_version`.
 * @property incrementalVacuumMode       - True (non-zero) if incremental vacuum mode is enabled.
 * @property applicationId               - Application ID, set via `PRAGMA application_id`.
 * @property reservedForExpansion        - 20 reserved bytes, must be zero.
 * @property versionValidForNumber       - `sqliteVersionNumber` value valid for this `fileChangeCounter` value.
 * @property sqliteVersionNumber         - `SQLITE_VERSION_NUMBER` value of the SQLite library that most recently modified the file.
 */
export interface SqliteHeader {
  magic: string;
  pageSize: number;
  fileFormatWriteVersion: number;
  fileFormatReadVersion: number;
  reservedSpacePerPage: number;
  maxEmbeddedPayloadFraction: number;
  minEmbeddedPayloadFraction: number;
  leafPayloadFraction: number;
  fileChangeCounter: number;
  databaseSizeInPages: number;
  firstFreelistTrunkPage: number;
  freelistPageCount: number;
  schemaCookie: number;
  schemaFormatNumber: number;
  defaultPageCacheSize: number;
  largestRootBtreePage: number;
  textEncoding: number;
  userVersion: number;
  incrementalVacuumMode: number;
  applicationId: number;
  reservedForExpansion: Uint8Array;
  versionValidForNumber: number;
  sqliteVersionNumber: number;
}

/**
 * Creates a coder for the 100-byte SQLite database file header.
 *
 * Nothing is validated on encode or decode — `magic` and every reserved or
 * fixed-value field (`maxEmbeddedPayloadFraction`,
 * `minEmbeddedPayloadFraction`, `leafPayloadFraction`,
 * `reservedForExpansion`) are written and read exactly as given.
 *
 * This coder only describes the fixed header. Page 1's B-tree page header
 * follows immediately at byte offset 100 and is out of scope here.
 *
 * @returns A coder for {@linkcode SqliteHeader} values.
 *
 * @example Decode a known header from raw bytes
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import {
 *   sqliteHeader,
 *   SQLITE_HEADER_SIZE,
 *   SQLITE_MAGIC,
 *   SQLITE_TEXT_ENCODING,
 * } from "@binstruct/sqlite";
 *
 * // deno-fmt-ignore
 * const wire = new Uint8Array([
 *   0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66, 0x6f, 0x72, 0x6d, 0x61, 0x74, 0x20, 0x33, 0x00,
 *   0x10, 0x00,
 *   0x01,
 *   0x01,
 *   0x00,
 *   0x40,
 *   0x20,
 *   0x20,
 *   0x00, 0x00, 0x00, 0x01,
 *   0x00, 0x00, 0x00, 0x02,
 *   0x00, 0x00, 0x00, 0x00,
 *   0x00, 0x00, 0x00, 0x00,
 *   0x00, 0x00, 0x00, 0x01,
 *   0x00, 0x00, 0x00, 0x04,
 *   0x00, 0x00, 0x00, 0x00,
 *   0x00, 0x00, 0x00, 0x00,
 *   0x00, 0x00, 0x00, 0x01,
 *   0x00, 0x00, 0x00, 0x00,
 *   0x00, 0x00, 0x00, 0x00,
 *   0x00, 0x00, 0x00, 0x00,
 *   0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
 *   0x00, 0x2e, 0x76, 0x88,
 *   0x00, 0x2e, 0x76, 0x88,
 * ]);
 *
 * const [decoded, read] = sqliteHeader().decode(wire);
 *
 * assertEquals(read, SQLITE_HEADER_SIZE);
 * assertEquals(decoded.magic, SQLITE_MAGIC);
 * assertEquals(decoded.pageSize, 4096);
 * assertEquals(decoded.textEncoding, SQLITE_TEXT_ENCODING.UTF8);
 * assertEquals(decoded.sqliteVersionNumber, 3045000);
 * ```
 */
export function sqliteHeader(): Coder<SqliteHeader> {
  return struct({
    magic: string(16),
    pageSize: u16be(),
    fileFormatWriteVersion: u8be(),
    fileFormatReadVersion: u8be(),
    reservedSpacePerPage: u8be(),
    maxEmbeddedPayloadFraction: u8be(),
    minEmbeddedPayloadFraction: u8be(),
    leafPayloadFraction: u8be(),
    fileChangeCounter: u32be(),
    databaseSizeInPages: u32be(),
    firstFreelistTrunkPage: u32be(),
    freelistPageCount: u32be(),
    schemaCookie: u32be(),
    schemaFormatNumber: u32be(),
    defaultPageCacheSize: u32be(),
    largestRootBtreePage: u32be(),
    textEncoding: u32be(),
    userVersion: u32be(),
    incrementalVacuumMode: u32be(),
    applicationId: u32be(),
    reservedForExpansion: bytes(20),
    versionValidForNumber: u32be(),
    sqliteVersionNumber: u32be(),
  });
}
