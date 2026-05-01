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
 * ## Composition with the rest of `@binstruct/*`
 *
 * Pcap stores raw link-layer payloads. The natural use is to read a capture,
 * then hand each `record.data` to a sibling coder for the link type advertised
 * in the global header.
 *
 * @example Walk an inet stack: pcap → IPv4 → UDP (LINKTYPE.RAW)
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { LINKTYPE, PCAP_MAGIC_MICROS, pcapFile } from "@binstruct/pcap";
 * import { ipv4 } from "@binstruct/ipv4";
 * import { udpDatagram } from "@binstruct/udp";
 *
 * const ip = ipv4();
 * const udp = udpDatagram();
 *
 * // Synth a UDP-over-IPv4 packet to put in the capture.
 * const udpBytes = new Uint8Array(12);
 * udp.encode({
 *   srcPort: 53,
 *   dstPort: 49152,
 *   length: 12,
 *   checksum: 0,
 *   payload: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
 * }, udpBytes);
 *
 * const packet = new Uint8Array(32);
 * ip.encode({
 *   versionIhl: { version: 4, ihl: 5 },
 *   typeOfService: 0,
 *   totalLength: 32,
 *   identification: 0,
 *   flagsFragmentOffset: {
 *     reserved: 0,
 *     dontFragment: 0,
 *     moreFragments: 0,
 *     fragmentOffset: 0,
 *   },
 *   timeToLive: 64,
 *   protocol: 17,
 *   headerChecksum: 0,
 *   sourceAddress: "192.0.2.1",
 *   destinationAddress: "192.0.2.2",
 *   options: new Uint8Array(0),
 *   payload: udpBytes,
 * }, packet);
 *
 * const cap = pcapFile("le");
 * const buf = new Uint8Array(24 + 16 + packet.length);
 * const written = cap.encode({
 *   header: {
 *     magic: PCAP_MAGIC_MICROS,
 *     versionMajor: 2,
 *     versionMinor: 4,
 *     thisZone: 0,
 *     sigFigs: 0,
 *     snapLen: 65535,
 *     network: LINKTYPE.RAW,
 *   },
 *   records: [{
 *     tsSec: 0,
 *     tsUsec: 0,
 *     inclLen: packet.length,
 *     origLen: packet.length,
 *     data: packet,
 *   }],
 * }, buf);
 *
 * // Walk the stack on read.
 * const [{ records }] = cap.decode(buf.subarray(0, written));
 * const [parsedIp] = ip.decode(records[0].data);
 * const [parsedUdp] = udp.decode(parsedIp.payload);
 *
 * assertEquals(parsedIp.sourceAddress, "192.0.2.1");
 * assertEquals(parsedUdp.srcPort, 53);
 * assertEquals(parsedUdp.payload, new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
 * ```
 *
 * @example Direct Ethernet frames (LINKTYPE.ETHERNET)
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { LINKTYPE, PCAP_MAGIC_MICROS, pcapFile } from "@binstruct/pcap";
 * import { ethernet2Frame } from "@binstruct/ethernet";
 *
 * const eth = ethernet2Frame();
 *
 * const frame = new Uint8Array(14 + 4);
 * eth.encode({
 *   dstMac: new Uint8Array([0x00, 0x11, 0x22, 0x33, 0x44, 0x55]),
 *   srcMac: new Uint8Array([0x66, 0x77, 0x88, 0x99, 0xaa, 0xbb]),
 *   etherType: 0x0800,
 *   payload: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
 * }, frame);
 *
 * const cap = pcapFile("le");
 * const buf = new Uint8Array(24 + 16 + frame.length);
 * const written = cap.encode({
 *   header: {
 *     magic: PCAP_MAGIC_MICROS,
 *     versionMajor: 2,
 *     versionMinor: 4,
 *     thisZone: 0,
 *     sigFigs: 0,
 *     snapLen: 65535,
 *     network: LINKTYPE.ETHERNET,
 *   },
 *   records: [{
 *     tsSec: 0,
 *     tsUsec: 0,
 *     inclLen: frame.length,
 *     origLen: frame.length,
 *     data: frame,
 *   }],
 * }, buf);
 *
 * const [{ records }] = cap.decode(buf.subarray(0, written));
 * const [decoded] = eth.decode(records[0].data);
 *
 * assertEquals(decoded.etherType, 0x0800);
 * assertEquals(decoded.payload, new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
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
