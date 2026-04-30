/**
 * Coders for the 24-byte pcap global file header.
 *
 * The pcap global header sits at the start of every classic libpcap capture
 * file and describes the byte order, version, and link-layer type of the
 * records that follow. The byte layout is fixed but two stored byte orders are
 * permitted; this module exposes a factory that takes the desired endianness
 * explicitly so callers stay in control of the wire layout.
 */

import { s32, struct, u16, u32 } from "@hertzg/binstruct";
import type { Coder } from "@hertzg/binstruct";

/**
 * Byte order to use for all multi-byte integers in the pcap stream.
 *
 * Pcap stores numbers in either big- or little-endian, signalled by the magic
 * value at offset zero. The same byte order applies to both the global header
 * and every record header that follows it.
 */
export type PcapEndianness = "le" | "be";

/**
 * Logical magic number for microsecond-resolution captures.
 *
 * The same numeric value is stored in the file's `magic` field regardless of
 * byte order — `0xa1b2c3d4`. The on-disk byte sequence differs (`a1 b2 c3 d4`
 * for big-endian, `d4 c3 b2 a1` for little-endian) because the coder serialises
 * the field using the chosen endianness.
 */
export const PCAP_MAGIC_MICROS = 0xa1b2c3d4;

/**
 * Logical magic number for nanosecond-resolution captures.
 *
 * Files using this magic carry `ts_usec` values that are actually nanoseconds.
 * The field name is preserved from the libpcap layout for compatibility. Like
 * {@link PCAP_MAGIC_MICROS}, the same logical value is used for both byte
 * orders — only the on-disk serialisation differs.
 */
export const PCAP_MAGIC_NANOS = 0xa1b23c4d;

/**
 * Decoded representation of the 24-byte pcap global header.
 *
 * Field semantics follow the libpcap reference layout. `magic` distinguishes
 * the byte order and timestamp resolution; the remaining fields describe the
 * capture environment.
 */
export interface PcapGlobalHeader {
  /** Magic number identifying byte order and timestamp resolution. */
  magic: number;
  /** Major version of the file format (currently 2). */
  versionMajor: number;
  /** Minor version of the file format (currently 4). */
  versionMinor: number;
  /** GMT-to-local-time correction in seconds; almost always 0 in modern files. */
  thisZone: number;
  /** Timestamp accuracy; conventionally 0. */
  sigFigs: number;
  /** Maximum captured length per packet, in bytes. */
  snapLen: number;
  /** Link-layer header type identifier (see {@link LINKTYPE}). */
  network: number;
}

/**
 * Creates a coder for the pcap global header in the requested byte order.
 *
 * @param endianness Byte order used for the multi-byte fields. Pass `"le"` or
 *   `"be"` to match the file you are reading or producing.
 * @returns A coder that encodes/decodes a {@link PcapGlobalHeader}.
 *
 * @example Encode and decode a little-endian global header
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import {
 *   pcapGlobalHeader,
 *   PCAP_MAGIC_MICROS,
 *   LINKTYPE,
 * } from "@binstruct/pcap";
 *
 * const header = pcapGlobalHeader("le");
 * const value = {
 *   magic: PCAP_MAGIC_MICROS,
 *   versionMajor: 2,
 *   versionMinor: 4,
 *   thisZone: 0,
 *   sigFigs: 0,
 *   snapLen: 65535,
 *   network: LINKTYPE.ETHERNET,
 * };
 *
 * const buffer = new Uint8Array(24);
 * const written = header.encode(value, buffer);
 * const [decoded, read] = header.decode(buffer);
 *
 * assertEquals(written, 24);
 * assertEquals(read, 24);
 * assertEquals(decoded, value);
 * ```
 *
 * @example Big-endian header round trip
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { pcapGlobalHeader, PCAP_MAGIC_MICROS } from "@binstruct/pcap";
 *
 * const header = pcapGlobalHeader("be");
 * const value = {
 *   magic: PCAP_MAGIC_MICROS,
 *   versionMajor: 2,
 *   versionMinor: 4,
 *   thisZone: 0,
 *   sigFigs: 0,
 *   snapLen: 1500,
 *   network: 1,
 * };
 *
 * const buffer = new Uint8Array(24);
 * const written = header.encode(value, buffer);
 * const [decoded] = header.decode(buffer);
 *
 * assertEquals(written, 24);
 * assertEquals(decoded.magic, PCAP_MAGIC_MICROS);
 * assertEquals(decoded.snapLen, 1500);
 * ```
 */
export function pcapGlobalHeader(
  endianness: PcapEndianness,
): Coder<PcapGlobalHeader> {
  return struct({
    magic: u32(endianness),
    versionMajor: u16(endianness),
    versionMinor: u16(endianness),
    thisZone: s32(endianness),
    sigFigs: u32(endianness),
    snapLen: u32(endianness),
    network: u32(endianness),
  });
}

/**
 * Result of probing a buffer's first four bytes for a pcap magic number.
 */
export interface PcapMagicInfo {
  /** Byte order implied by the magic. */
  endianness: PcapEndianness;
  /** Whether the file uses nanosecond-resolution timestamps. */
  nanos: boolean;
}

/**
 * Inspects the first four bytes of a buffer to identify the pcap magic.
 *
 * Returns the decoded {@link PcapMagicInfo}, or `null` if the bytes do not
 * match any of the four known pcap magic values. Useful when the caller
 * receives an arbitrary buffer and needs to pick the correct
 * {@link pcapGlobalHeader} factory before decoding.
 *
 * @param buffer Buffer whose first four bytes hold the magic number.
 * @returns Endianness and timestamp resolution implied by the magic, or
 *   `null` if no recognised magic is present.
 *
 * @example Detect a little-endian microsecond capture
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { detectPcapMagic } from "@binstruct/pcap";
 *
 * const buffer = new Uint8Array([0xd4, 0xc3, 0xb2, 0xa1]);
 * assertEquals(detectPcapMagic(buffer), { endianness: "le", nanos: false });
 * ```
 *
 * @example Detect a big-endian nanosecond capture
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { detectPcapMagic } from "@binstruct/pcap";
 *
 * const buffer = new Uint8Array([0xa1, 0xb2, 0x3c, 0x4d]);
 * assertEquals(detectPcapMagic(buffer), { endianness: "be", nanos: true });
 * ```
 *
 * @example Unknown bytes return null
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { detectPcapMagic } from "@binstruct/pcap";
 *
 * assertEquals(detectPcapMagic(new Uint8Array([0, 0, 0, 0])), null);
 * ```
 */
export function detectPcapMagic(buffer: Uint8Array): PcapMagicInfo | null {
  const view = new DataView(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength,
  );
  const asBe = view.getUint32(0, false);
  if (asBe === PCAP_MAGIC_MICROS) return { endianness: "be", nanos: false };
  if (asBe === PCAP_MAGIC_NANOS) return { endianness: "be", nanos: true };

  const asLe = view.getUint32(0, true);
  if (asLe === PCAP_MAGIC_MICROS) return { endianness: "le", nanos: false };
  if (asLe === PCAP_MAGIC_NANOS) return { endianness: "le", nanos: true };

  return null;
}
