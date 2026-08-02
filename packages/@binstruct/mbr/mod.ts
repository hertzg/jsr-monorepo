/**
 * Master Boot Record (classic MBR) sector encoding and decoding.
 *
 * A classic MBR is exactly one 512-byte disk sector: 446 bytes of bootstrap
 * code, four fixed-size 16-byte partition table entries, and a 2-byte boot
 * signature:
 *
 * ```text
 *  0                                                       445
 * +-----------------------------------------------------------+
 * |              Bootstrap Code (446 bytes)                   |
 * +-----------------------------------------------------------+
 * |            Partition Entry 1 (16 bytes)                   |
 * +-----------------------------------------------------------+
 * |            Partition Entry 2 (16 bytes)                   |
 * +-----------------------------------------------------------+
 * |            Partition Entry 3 (16 bytes)                   |
 * +-----------------------------------------------------------+
 * |            Partition Entry 4 (16 bytes)                   |
 * +-----------------------------------------------------------+
 * |         Boot Signature (0xaa55, 2 bytes)                  |
 * +-----------------------------------------------------------+
 * ```
 *
 * Each partition entry is laid out as:
 *
 * ```text
 *  0        1        2   3   4        5        6   7
 * +--------+--------+--------+--------+--------+--------+
 * | Status |   CHS First (3) | Type   |   CHS Last (3)   |
 * +--------+--------+--------+--------+--------+--------+
 * |          LBA First Sector         |     Sector Count |
 * +--------+--------+--------+--------+--------+--------+
 * ```
 *
 * All multi-byte numeric fields are little-endian, matching the format's
 * origin on x86 hardware.
 *
 * Scope for `v0.0.1` is deliberately shallow: this coder covers the
 * sector-level header only. The CHS (cylinder-head-sector) fields are kept as
 * raw 3-byte slices rather than decoded into cylinder/head/sector numbers —
 * CHS addressing has been obsolete since LBA became universal, and decoding
 * it correctly requires bit-packing rules (10-bit cylinder split across two
 * bytes) that add complexity with no practical benefit for modern disks.
 * Extended partitions (nested MBRs referenced by a `0x05`/`0x0f` entry) and
 * GPT protective-MBR semantics are also left to the caller — this coder only
 * describes the fixed 512-byte wire layout.
 *
 * @example Round-trip a sector with a single FAT32 partition
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import {
 *   mbrSector,
 *   MBR_BOOT_SIGNATURE,
 *   MBR_PARTITION_TYPE,
 *   MBR_SIZE,
 * } from "@binstruct/mbr";
 *
 * const coder = mbrSector();
 * const sector = {
 *   bootstrapCode: new Uint8Array(446),
 *   partitions: [
 *     {
 *       status: 0x80,
 *       chsFirst: new Uint8Array([0x00, 0x01, 0x00]),
 *       partitionType: MBR_PARTITION_TYPE.FAT32_LBA,
 *       chsLast: new Uint8Array([0xfe, 0xff, 0xff]),
 *       lbaFirstSector: 2048,
 *       sectorCount: 204800,
 *     },
 *     { status: 0, chsFirst: new Uint8Array(3), partitionType: MBR_PARTITION_TYPE.EMPTY, chsLast: new Uint8Array(3), lbaFirstSector: 0, sectorCount: 0 },
 *     { status: 0, chsFirst: new Uint8Array(3), partitionType: MBR_PARTITION_TYPE.EMPTY, chsLast: new Uint8Array(3), lbaFirstSector: 0, sectorCount: 0 },
 *     { status: 0, chsFirst: new Uint8Array(3), partitionType: MBR_PARTITION_TYPE.EMPTY, chsLast: new Uint8Array(3), lbaFirstSector: 0, sectorCount: 0 },
 *   ],
 *   bootSignature: MBR_BOOT_SIGNATURE,
 * };
 *
 * const buffer = new Uint8Array(MBR_SIZE);
 * const written = coder.encode(sector, buffer);
 * const [decoded, read] = coder.decode(buffer);
 *
 * assertEquals(written, MBR_SIZE);
 * assertEquals(read, MBR_SIZE);
 * assertEquals(decoded.partitions[0].partitionType, MBR_PARTITION_TYPE.FAT32_LBA);
 * assertEquals(decoded.partitions[0].sectorCount, 204800);
 * assertEquals(decoded.bootSignature, MBR_BOOT_SIGNATURE);
 * ```
 *
 * @module
 */

import {
  array,
  bytes,
  type Coder,
  struct,
  u16le,
  u32le,
  u8le,
} from "@hertzg/binstruct";

/**
 * Total size in bytes of an MBR sector.
 */
export const MBR_SIZE = 512;

/**
 * The boot signature that must terminate a valid MBR sector, as a
 * little-endian 16-bit value (bytes `0x55 0xaa` on the wire).
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { MBR_BOOT_SIGNATURE } from "@binstruct/mbr";
 *
 * assertEquals(MBR_BOOT_SIGNATURE, 0xaa55);
 * ```
 */
export const MBR_BOOT_SIGNATURE = 0xaa55;

/**
 * Size in bytes of a single partition table entry.
 */
export const PARTITION_ENTRY_SIZE = 16;

/**
 * Number of partition table entries in a classic MBR.
 */
export const MBR_PARTITION_COUNT = 4;

/**
 * Well-known `partitionType` byte values. Not exhaustive — hundreds of values
 * are assigned across operating systems — but these cover the partitions most
 * commonly encountered today.
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { MBR_PARTITION_TYPE } from "@binstruct/mbr";
 *
 * assertEquals(MBR_PARTITION_TYPE.EMPTY, 0x00);
 * assertEquals(MBR_PARTITION_TYPE.EFI_PROTECTIVE, 0xee);
 * ```
 */
export const MBR_PARTITION_TYPE = {
  /** Entry unused. */
  EMPTY: 0x00,
  /** NTFS or exFAT. */
  NTFS_EXFAT: 0x07,
  /** FAT32 with LBA addressing. */
  FAT32_LBA: 0x0c,
  /** Linux swap. */
  LINUX_SWAP: 0x82,
  /** Linux native filesystem (ext2/3/4, etc). */
  LINUX: 0x83,
  /** GPT protective MBR — the whole disk is one entry covering the GPT. */
  EFI_PROTECTIVE: 0xee,
} as const;

/**
 * Decoded MBR partition table entry.
 *
 * @property status         - Partition status byte. `0x80` means active/bootable, `0x00` means inactive; other values are invalid but preserved verbatim.
 * @property chsFirst       - Cylinder-head-sector address of the first sector, raw 3 bytes. Not decoded in `v0.0.1` — see module docs.
 * @property partitionType  - Partition type byte. See {@linkcode MBR_PARTITION_TYPE} for well-known values.
 * @property chsLast        - Cylinder-head-sector address of the last sector, raw 3 bytes. Not decoded in `v0.0.1` — see module docs.
 * @property lbaFirstSector - LBA of the first sector of the partition.
 * @property sectorCount    - Number of sectors in the partition.
 */
export interface MbrPartitionEntry {
  status: number;
  chsFirst: Uint8Array;
  partitionType: number;
  chsLast: Uint8Array;
  lbaFirstSector: number;
  sectorCount: number;
}

/**
 * Decoded MBR sector.
 *
 * @property bootstrapCode - Raw bootstrap code, 446 bytes. Opaque to this coder.
 * @property partitions    - Exactly {@linkcode MBR_PARTITION_COUNT} partition table entries, in on-disk order.
 * @property bootSignature - Should equal {@linkcode MBR_BOOT_SIGNATURE} for a valid MBR; surfaced verbatim rather than validated.
 */
export interface MbrSector {
  bootstrapCode: Uint8Array;
  partitions: MbrPartitionEntry[];
  bootSignature: number;
}

/**
 * Creates a coder for a classic 512-byte MBR sector.
 *
 * Nothing is validated on encode or decode — `bootSignature` is written and
 * read exactly as given. Callers that need to confirm a sector is a valid MBR
 * should compare the decoded `bootSignature` against
 * {@linkcode MBR_BOOT_SIGNATURE} themselves.
 *
 * @returns A coder for {@linkcode MbrSector} values.
 *
 * @example Decode a known-bytes sector with two partitions
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { mbrSector, MBR_BOOT_SIGNATURE, MBR_PARTITION_TYPE, MBR_SIZE } from "@binstruct/mbr";
 *
 * const wire = new Uint8Array(MBR_SIZE);
 *
 * // Partition 1: active Linux partition starting at LBA 2048, 1048576 sectors
 * const entry1 = 446;
 * wire[entry1] = 0x80;
 * wire[entry1 + 4] = MBR_PARTITION_TYPE.LINUX;
 * new DataView(wire.buffer).setUint32(entry1 + 8, 2048, true);
 * new DataView(wire.buffer).setUint32(entry1 + 12, 1048576, true);
 *
 * // Boot signature
 * new DataView(wire.buffer).setUint16(510, MBR_BOOT_SIGNATURE, true);
 *
 * const [decoded, read] = mbrSector().decode(wire);
 *
 * assertEquals(read, MBR_SIZE);
 * assertEquals(decoded.partitions.length, 4);
 * assertEquals(decoded.partitions[0].status, 0x80);
 * assertEquals(decoded.partitions[0].partitionType, MBR_PARTITION_TYPE.LINUX);
 * assertEquals(decoded.partitions[0].lbaFirstSector, 2048);
 * assertEquals(decoded.partitions[0].sectorCount, 1048576);
 * assertEquals(decoded.partitions[1].partitionType, MBR_PARTITION_TYPE.EMPTY);
 * assertEquals(decoded.bootSignature, MBR_BOOT_SIGNATURE);
 * ```
 */
export function mbrSector(): Coder<MbrSector> {
  const partitionEntry = struct({
    status: u8le(),
    chsFirst: bytes(3),
    partitionType: u8le(),
    chsLast: bytes(3),
    lbaFirstSector: u32le(),
    sectorCount: u32le(),
  });

  const bootstrapCodeSize = MBR_SIZE -
    PARTITION_ENTRY_SIZE * MBR_PARTITION_COUNT - 2;

  return struct({
    bootstrapCode: bytes(bootstrapCodeSize),
    partitions: array(partitionEntry, MBR_PARTITION_COUNT),
    bootSignature: u16le(),
  });
}
