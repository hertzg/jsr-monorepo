/**
 * Coders for the classic libpcap (.pcap) capture file format.
 *
 * This package decodes and encodes the original libpcap layout — a 24-byte
 * global header followed by a stream of 16-byte record headers each carrying a
 * captured packet payload. The newer pcapng format is intentionally **not**
 * supported.
 *
 * The link-layer payload is preserved as raw bytes. Decoding it (Ethernet, raw
 * IP, Linux SLL, …) is left to the caller, so this package has no protocol
 * dependencies and stays focused on the file envelope.
 *
 * ## Endianness
 *
 * Pcap stores numbers in either little- or big-endian, signalled by the magic
 * value at offset zero. Callers pick the byte order explicitly via the
 * `endianness` argument (`"le"` or `"be"`); use {@link detectPcapMagic} to
 * probe an unknown buffer first when needed.
 *
 * ## Timestamp resolution
 *
 * Two magic values exist: one for microsecond timestamps
 * ({@link PCAP_MAGIC_MICROS}) and one for nanosecond timestamps
 * ({@link PCAP_MAGIC_NANOS}). The on-disk layout is identical; only the
 * interpretation of `tsUsec` differs.
 *
 * @example Round-trip a complete little-endian capture file
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import {
 *   pcapFile,
 *   PCAP_MAGIC_MICROS,
 *   LINKTYPE,
 * } from "@binstruct/pcap";
 *
 * const coder = pcapFile("le");
 * const value = {
 *   header: {
 *     magic: PCAP_MAGIC_MICROS,
 *     versionMajor: 2,
 *     versionMinor: 4,
 *     thisZone: 0,
 *     sigFigs: 0,
 *     snapLen: 65535,
 *     network: LINKTYPE.ETHERNET,
 *   },
 *   records: [
 *     {
 *       tsSec: 1_700_000_000,
 *       tsUsec: 250_000,
 *       inclLen: 4,
 *       origLen: 4,
 *       data: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
 *     },
 *     {
 *       tsSec: 1_700_000_001,
 *       tsUsec: 0,
 *       inclLen: 2,
 *       origLen: 1500,
 *       data: new Uint8Array([0x12, 0x34]),
 *     },
 *   ],
 * };
 *
 * const buffer = new Uint8Array(128);
 * const written = coder.encode(value, buffer);
 * const [decoded] = coder.decode(buffer.subarray(0, written));
 *
 * assertEquals(written, 24 + 16 + 4 + 16 + 2);
 * assertEquals(decoded.records.length, 2);
 * assertEquals(decoded.records[0].data, value.records[0].data);
 * assertEquals(decoded.records[1].origLen, 1500);
 * ```
 *
 * @example Detect endianness, then decode
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import {
 *   detectPcapMagic,
 *   pcapFile,
 *   PCAP_MAGIC_MICROS,
 *   LINKTYPE,
 * } from "@binstruct/pcap";
 *
 * const original = pcapFile("be");
 * const buffer = new Uint8Array(64);
 * original.encode({
 *   header: {
 *     magic: PCAP_MAGIC_MICROS,
 *     versionMajor: 2,
 *     versionMinor: 4,
 *     thisZone: 0,
 *     sigFigs: 0,
 *     snapLen: 1500,
 *     network: LINKTYPE.RAW,
 *   },
 *   records: [],
 * }, buffer);
 *
 * const info = detectPcapMagic(buffer);
 * assertEquals(info, { endianness: "be", nanos: false });
 *
 * const reader = pcapFile(info!.endianness);
 * const [decoded] = reader.decode(buffer);
 * assertEquals(decoded.header.network, LINKTYPE.RAW);
 * ```
 *
 * @module @binstruct/pcap
 */

import type { Coder } from "@hertzg/binstruct";
import {
  type PcapEndianness,
  type PcapGlobalHeader,
  pcapGlobalHeader,
} from "./header.ts";
import {
  type PcapFile,
  pcapFileWith,
  type PcapRecord,
  pcapRecord,
} from "./record.ts";

export {
  detectPcapMagic,
  PCAP_MAGIC_MICROS,
  PCAP_MAGIC_NANOS,
  pcapGlobalHeader,
} from "./header.ts";
export type {
  PcapEndianness,
  PcapGlobalHeader,
  PcapMagicInfo,
} from "./header.ts";
export { pcapFileWith, pcapRecord } from "./record.ts";
export type { PcapFile, PcapRecord } from "./record.ts";
export { LINKTYPE } from "./linktypes.ts";
export type { LinkType } from "./linktypes.ts";

/**
 * Creates a coder for a complete pcap capture file in the requested byte order.
 *
 * The returned coder pairs {@link pcapGlobalHeader} with {@link pcapRecord} via
 * {@link pcapFileWith}. Records are read greedily until the buffer no longer
 * holds a full 16-byte record header. For custom record handling — for
 * example, refining the payload into a parsed link-layer frame — use
 * {@link pcapFileWith} directly with your own coders.
 *
 * @param endianness Byte order matching the file's magic.
 * @returns A coder for a {@link PcapFile} of {@link PcapGlobalHeader} and
 *   {@link PcapRecord}.
 *
 * @example Encode an empty capture
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import {
 *   pcapFile,
 *   PCAP_MAGIC_MICROS,
 *   LINKTYPE,
 * } from "@binstruct/pcap";
 *
 * const coder = pcapFile("le");
 * const buffer = new Uint8Array(24);
 * const written = coder.encode({
 *   header: {
 *     magic: PCAP_MAGIC_MICROS,
 *     versionMajor: 2,
 *     versionMinor: 4,
 *     thisZone: 0,
 *     sigFigs: 0,
 *     snapLen: 65535,
 *     network: LINKTYPE.ETHERNET,
 *   },
 *   records: [],
 * }, buffer);
 *
 * assertEquals(written, 24);
 * ```
 */
export function pcapFile(
  endianness: PcapEndianness,
): Coder<PcapFile<PcapGlobalHeader, PcapRecord>> {
  return pcapFileWith(pcapGlobalHeader(endianness), pcapRecord(endianness));
}
