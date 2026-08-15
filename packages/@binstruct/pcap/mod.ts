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
 * value at offset zero. Callers may pick the byte order explicitly via the
 * `endianness` argument (`"le"` or `"be"`).
 *
 * Omitting it is the easy path: {@link pcapFile} then reads that magic and
 * decodes the whole capture in whichever order the file itself declares, so a
 * single `pcapFile()` handles little- and big-endian captures alike. Encoding
 * has no file to inspect and writes {@link PCAP_DEFAULT_ENDIANNESS}. The
 * building blocks {@link pcapGlobalHeader} and {@link pcapRecord} are fixed to
 * one byte order and default to that same constant — {@link detectPcapMagic}
 * probes a buffer when you drive them yourself.
 *
 * To pin the encoded byte order without passing an argument, call
 * {@link pcapFileLe} or {@link pcapFileBe}. They exist for callers that can only
 * invoke a factory with no arguments, and writing a big-endian capture is the
 * case `pcapFile()` alone cannot cover.
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
 * import { ipv4Packet } from "@binstruct/ipv4";
 * import { udpPacket } from "@binstruct/udp";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 *
 * const ip = ipv4Packet();
 * const udp = udpPacket();
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
 *   sourceAddress: parseIpv4("192.0.2.1"),
 *   destinationAddress: parseIpv4("192.0.2.2"),
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
 * assertEquals(parsedIp.sourceAddress, parseIpv4("192.0.2.1"));
 * assertEquals(parsedUdp.srcPort, 53);
 * assertEquals(parsedUdp.payload, new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
 * ```
 *
 * @example Walk the full inet stack (LINKTYPE.ETHERNET via `@binstruct/inet`)
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { LINKTYPE, PCAP_MAGIC_MICROS, pcapFile } from "@binstruct/pcap";
 * import { inetFrame } from "@binstruct/inet";
 * import { ETHERTYPE_IPV4 } from "@binstruct/ipv4";
 * import { IP_PROTOCOL_UDP } from "@binstruct/udp";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 *
 * const inet = inetFrame();
 *
 * // Build an Ethernet → IPv4 → UDP frame in one pass.
 * const frame = new Uint8Array(14 + 32);
 * inet.encode({
 *   dstMac: new Uint8Array([0x00, 0x11, 0x22, 0x33, 0x44, 0x55]),
 *   srcMac: new Uint8Array([0x66, 0x77, 0x88, 0x99, 0xaa, 0xbb]),
 *   etherType: ETHERTYPE_IPV4,
 *   payload: {
 *     versionIhl: { version: 4, ihl: 5 },
 *     typeOfService: 0,
 *     totalLength: 32,
 *     identification: 0,
 *     flagsFragmentOffset: { reserved: 0, dontFragment: 0, moreFragments: 0, fragmentOffset: 0 },
 *     timeToLive: 64,
 *     protocol: IP_PROTOCOL_UDP,
 *     headerChecksum: 0,
 *     sourceAddress: parseIpv4("192.0.2.1"),
 *     destinationAddress: parseIpv4("192.0.2.2"),
 *     options: new Uint8Array(0),
 *     payload: {
 *       srcPort: 53,
 *       dstPort: 49152,
 *       length: 12,
 *       checksum: 0,
 *       payload: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
 *     },
 *   },
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
 * // Read back and walk the stack in one shot.
 * const [{ records }] = cap.decode(buf.subarray(0, written));
 * const [decoded] = inet.decode(records[0].data);
 *
 * assert(!(decoded.payload instanceof Uint8Array));
 * assert("protocol" in decoded.payload);
 * assertEquals(decoded.payload.sourceAddress, parseIpv4("192.0.2.1"));
 * assert(!(decoded.payload.payload instanceof Uint8Array));
 * assert("srcPort" in decoded.payload.payload);
 * assertEquals(decoded.payload.payload.srcPort, 53);
 * assertEquals(decoded.payload.payload.payload, new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
 * ```
 *
 * @module @binstruct/pcap
 */

import {
  type Coder,
  createContext,
  kCoderKind,
  refSetValue,
} from "@hertzg/binstruct";
import {
  detectPcapMagic,
  PCAP_DEFAULT_ENDIANNESS,
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
  PCAP_DEFAULT_ENDIANNESS,
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

/** Decoded shape produced by the standard {@link pcapFile} coder. */
type PcapFileValue = PcapFile<PcapGlobalHeader, PcapRecord>;

/** Distinguishes the endianness-sniffing file coder from a plain struct coder. */
const kKindPcapFileAuto = Symbol("pcapFileAuto");

/**
 * Creates a coder for a complete pcap capture file.
 *
 * The returned coder pairs {@link pcapGlobalHeader} with {@link pcapRecord} via
 * {@link pcapFileWith}. Records are read greedily until the buffer no longer
 * holds a full 16-byte record header. For custom record handling — for
 * example, refining the payload into a parsed link-layer frame — use
 * {@link pcapFileWith} directly with your own coders.
 *
 * ## Byte order
 *
 * Called **with** an endianness, the coder is fixed to that byte order for both
 * directions — identical to every earlier release.
 *
 * Called **without** one, the coder resolves the byte order per operation:
 *
 * - On **decode** it reads the file's own magic number via
 *   {@link detectPcapMagic} and decodes the header *and* every record in the
 *   byte order that magic implies. Little- and big-endian captures therefore
 *   both round-trip through the same coder, with no configuration. A buffer
 *   whose first four bytes are not a recognised pcap magic is decoded as
 *   {@link PCAP_DEFAULT_ENDIANNESS}.
 * - On **encode** there is no file to inspect, so the coder writes
 *   {@link PCAP_DEFAULT_ENDIANNESS}. Note that the `magic` field is a logical
 *   value: writing {@link PCAP_MAGIC_MICROS} produces the correct on-disk byte
 *   sequence for whichever order is in effect.
 *
 * @param endianness Byte order matching the file's magic. Omit it to sniff the
 *   magic on decode and use {@link PCAP_DEFAULT_ENDIANNESS} on encode.
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
 *
 * @example One zero-argument coder reads captures of either byte order
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import {
 *   LINKTYPE,
 *   PCAP_MAGIC_MICROS,
 *   pcapFile,
 * } from "@binstruct/pcap";
 *
 * const capture = {
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
 *     tsSec: 1_700_000_000,
 *     tsUsec: 250_000,
 *     inclLen: 4,
 *     origLen: 1500,
 *     data: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
 *   }],
 * };
 *
 * const little = new Uint8Array(64);
 * const big = new Uint8Array(64);
 * const leWritten = pcapFile("le").encode(capture, little);
 * const beWritten = pcapFile("be").encode(capture, big);
 *
 * const auto = pcapFile();
 * const [fromLe] = auto.decode(little.subarray(0, leWritten));
 * const [fromBe] = auto.decode(big.subarray(0, beWritten));
 *
 * assertEquals(fromLe, capture);
 * assertEquals(fromBe, capture);
 * ```
 *
 * @example Zero-argument round trip writes the default byte order
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import {
 *   detectPcapMagic,
 *   LINKTYPE,
 *   PCAP_DEFAULT_ENDIANNESS,
 *   PCAP_MAGIC_NANOS,
 *   pcapFile,
 * } from "@binstruct/pcap";
 *
 * const coder = pcapFile();
 * const capture = {
 *   header: {
 *     magic: PCAP_MAGIC_NANOS,
 *     versionMajor: 2,
 *     versionMinor: 4,
 *     thisZone: 0,
 *     sigFigs: 0,
 *     snapLen: 1500,
 *     network: LINKTYPE.RAW,
 *   },
 *   records: [],
 * };
 *
 * const buffer = new Uint8Array(24);
 * const written = coder.encode(capture, buffer);
 * const [decoded, read] = coder.decode(buffer.subarray(0, written));
 *
 * assertEquals(written, 24);
 * assertEquals(read, 24);
 * assertEquals(decoded, capture);
 * assertEquals(detectPcapMagic(buffer), {
 *   endianness: PCAP_DEFAULT_ENDIANNESS,
 *   nanos: true,
 * });
 * ```
 */
export function pcapFile(
  // `undefined` is a third mode here, not an absent value: it selects magic
  // sniffing. The explicit `= undefined` keeps that meaning while making
  // `pcapFile.length` 0, which is what zero-argument tooling gates on.
  endianness: PcapEndianness | undefined = undefined,
): Coder<PcapFile<PcapGlobalHeader, PcapRecord>> {
  const fixed = (order: PcapEndianness) =>
    pcapFileWith(pcapGlobalHeader(order), pcapRecord(order));

  if (endianness !== undefined) {
    return fixed(endianness);
  }

  const byOrder: Record<PcapEndianness, Coder<PcapFileValue>> = {
    le: fixed("le"),
    be: fixed("be"),
  };

  let self: Coder<PcapFileValue>;
  return self = {
    [kCoderKind]: kKindPcapFileAuto,
    encode: (decoded, target, context) => {
      const ctx = context ?? createContext("encode");
      const bytesWritten = byOrder[PCAP_DEFAULT_ENDIANNESS].encode(
        decoded,
        target,
        ctx,
      );
      refSetValue(ctx, self, decoded);
      return bytesWritten;
    },
    decode: (encoded, context) => {
      const ctx = context ?? createContext("decode");
      const order = detectPcapMagic(encoded)?.endianness ??
        PCAP_DEFAULT_ENDIANNESS;
      const [decoded, bytesRead] = byOrder[order].decode(encoded, ctx);
      refSetValue(ctx, self, decoded);
      return [decoded, bytesRead];
    },
  };
}

/**
 * Creates a coder for a complete pcap capture file fixed to little-endian byte
 * order. Exactly `pcapFile("le")`, spelled so it can be called with no
 * arguments.
 *
 * Unlike `pcapFile()`, this coder never sniffs: it reads and writes the
 * little-endian layout whatever the buffer holds. Prefer `pcapFile()` for
 * reading, since it follows the file's own magic. Reach for this one when the
 * byte order must be pinned and the call site cannot pass an argument.
 *
 * The building blocks {@link pcapGlobalHeader} and {@link pcapRecord} have no
 * such variants on purpose — you compose those in TypeScript, where passing
 * `"le"` costs nothing.
 *
 * @returns A coder for a {@link PcapFile} of {@link PcapGlobalHeader} and
 *   {@link PcapRecord}, fixed to little-endian.
 *
 * @example Encode a capture in little-endian byte order
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import {
 *   detectPcapMagic,
 *   LINKTYPE,
 *   PCAP_MAGIC_MICROS,
 *   pcapFileLe,
 * } from "@binstruct/pcap";
 *
 * const coder = pcapFileLe();
 * const capture = {
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
 *     tsSec: 1_700_000_000,
 *     tsUsec: 250_000,
 *     inclLen: 4,
 *     origLen: 1500,
 *     data: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
 *   }],
 * };
 *
 * const buffer = new Uint8Array(64);
 * const written = coder.encode(capture, buffer);
 * const [decoded, read] = coder.decode(buffer.subarray(0, written));
 *
 * assertEquals(written, 24 + 16 + 4);
 * assertEquals(read, written);
 * assertEquals(decoded, capture);
 * assertEquals(
 *   buffer.subarray(0, 4),
 *   new Uint8Array([0xd4, 0xc3, 0xb2, 0xa1]),
 * );
 * assertEquals(detectPcapMagic(buffer), { endianness: "le", nanos: false });
 * ```
 */
export function pcapFileLe(): Coder<PcapFile<PcapGlobalHeader, PcapRecord>> {
  return pcapFile("le");
}

/**
 * Creates a coder for a complete pcap capture file fixed to big-endian byte
 * order. Exactly `pcapFile("be")`, spelled so it can be called with no
 * arguments.
 *
 * This is the one thing `pcapFile()` cannot do. Sniffing already covers reading
 * a big-endian capture, but encoding has no file to inspect and always writes
 * {@link PCAP_DEFAULT_ENDIANNESS}, so producing a big-endian capture needs a
 * coder that says so up front.
 *
 * The building blocks {@link pcapGlobalHeader} and {@link pcapRecord} have no
 * such variants on purpose — you compose those in TypeScript, where passing
 * `"be"` costs nothing.
 *
 * @returns A coder for a {@link PcapFile} of {@link PcapGlobalHeader} and
 *   {@link PcapRecord}, fixed to big-endian.
 *
 * @example Encode a capture in big-endian byte order
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import {
 *   detectPcapMagic,
 *   LINKTYPE,
 *   PCAP_MAGIC_MICROS,
 *   pcapFileBe,
 * } from "@binstruct/pcap";
 *
 * const coder = pcapFileBe();
 * const capture = {
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
 *     tsSec: 1_700_000_000,
 *     tsUsec: 250_000,
 *     inclLen: 4,
 *     origLen: 1500,
 *     data: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
 *   }],
 * };
 *
 * const buffer = new Uint8Array(64);
 * const written = coder.encode(capture, buffer);
 * const [decoded, read] = coder.decode(buffer.subarray(0, written));
 *
 * assertEquals(written, 24 + 16 + 4);
 * assertEquals(read, written);
 * assertEquals(decoded, capture);
 * assertEquals(
 *   buffer.subarray(0, 4),
 *   new Uint8Array([0xa1, 0xb2, 0xc3, 0xd4]),
 * );
 * assertEquals(detectPcapMagic(buffer), { endianness: "be", nanos: false });
 * ```
 *
 * @example A big-endian capture reads back through the sniffing coder
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import {
 *   LINKTYPE,
 *   PCAP_MAGIC_NANOS,
 *   pcapFile,
 *   pcapFileBe,
 * } from "@binstruct/pcap";
 *
 * const capture = {
 *   header: {
 *     magic: PCAP_MAGIC_NANOS,
 *     versionMajor: 2,
 *     versionMinor: 4,
 *     thisZone: 0,
 *     sigFigs: 0,
 *     snapLen: 1500,
 *     network: LINKTYPE.RAW,
 *   },
 *   records: [],
 * };
 *
 * const buffer = new Uint8Array(24);
 * const written = pcapFileBe().encode(capture, buffer);
 * const [decoded] = pcapFile().decode(buffer.subarray(0, written));
 *
 * assertEquals(decoded, capture);
 * ```
 */
export function pcapFileBe(): Coder<PcapFile<PcapGlobalHeader, PcapRecord>> {
  return pcapFile("be");
}
