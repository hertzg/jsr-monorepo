/**
 * Coders for individual pcap record (per-packet) entries.
 *
 * A record consists of a 16-byte header followed by `inclLen` bytes of
 * captured packet data. The packet payload is intentionally left as raw bytes
 * — decoding the link-layer protocol (Ethernet, raw IP, etc.) is the caller's
 * responsibility and is out of scope for this package.
 */

import {
  arrayWhile,
  bytes,
  ref,
  struct,
  u32be,
  u32le,
} from "@hertzg/binstruct";
import type { Coder } from "@hertzg/binstruct";
import type { PcapEndianness } from "./header.ts";

/**
 * Decoded representation of a single pcap record.
 *
 * `inclLen` is the number of bytes actually stored on disk and read into
 * `data`; `origLen` is the original wire length, which can be greater when the
 * capture was truncated by `snapLen`.
 */
export interface PcapRecord {
  /** Timestamp seconds since the Unix epoch. */
  tsSec: number;
  /**
   * Sub-second portion of the timestamp.
   *
   * Microseconds for files using {@link PCAP_MAGIC_MICROS}, nanoseconds for
   * those using {@link PCAP_MAGIC_NANOS}. The pcap layout reuses the same
   * field name for both, so the interpretation is dictated entirely by the
   * global header magic.
   */
  tsUsec: number;
  /** Number of bytes of packet data actually present in `data`. */
  inclLen: number;
  /** Original packet length on the wire (may exceed `inclLen`). */
  origLen: number;
  /** Captured packet payload, exactly `inclLen` bytes long. */
  data: Uint8Array;
}

/**
 * Creates a coder for a single pcap record (16-byte header plus payload).
 *
 * The payload length is taken from the `inclLen` field via a forward
 * reference, so records of any captured size round-trip correctly.
 *
 * @param endianness Byte order matching the surrounding pcap file.
 * @returns A coder that encodes/decodes a {@link PcapRecord}.
 *
 * @example Round-trip a single record
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { pcapRecord } from "@binstruct/pcap";
 *
 * const record = pcapRecord("le");
 * const value = {
 *   tsSec: 1_700_000_000,
 *   tsUsec: 123_456,
 *   inclLen: 4,
 *   origLen: 4,
 *   data: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
 * };
 *
 * const buffer = new Uint8Array(64);
 * const written = record.encode(value, buffer);
 * const [decoded, read] = record.decode(buffer);
 *
 * assertEquals(written, 20);
 * assertEquals(read, 20);
 * assertEquals(decoded.tsSec, value.tsSec);
 * assertEquals(decoded.data, value.data);
 * ```
 *
 * @example Truncated capture where `inclLen` is less than `origLen`
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { pcapRecord } from "@binstruct/pcap";
 *
 * const record = pcapRecord("be");
 * const value = {
 *   tsSec: 1,
 *   tsUsec: 0,
 *   inclLen: 2,
 *   origLen: 1500,
 *   data: new Uint8Array([0x01, 0x02]),
 * };
 *
 * const buffer = new Uint8Array(32);
 * const written = record.encode(value, buffer);
 * const [decoded] = record.decode(buffer);
 *
 * assertEquals(written, 18);
 * assertEquals(decoded.inclLen, 2);
 * assertEquals(decoded.origLen, 1500);
 * assertEquals(decoded.data.length, 2);
 * ```
 */
export function pcapRecord(endianness: PcapEndianness): Coder<PcapRecord> {
  const u32 = endianness === "le" ? u32le : u32be;
  const inclLen = u32();

  return struct({
    tsSec: u32(),
    tsUsec: u32(),
    inclLen,
    origLen: u32(),
    data: bytes(ref(inclLen)),
  });
}

/**
 * Decoded representation of a complete pcap capture file.
 *
 * @template THeader The decoded global-header type. Defaults to the
 *   plain {@link PcapGlobalHeader}; refining the header coder lets callers
 *   substitute a richer shape.
 * @template TRecord The decoded record type. Defaults to {@link PcapRecord}.
 */
export interface PcapFile<THeader, TRecord> {
  /** Global header parsed from the file's first 24 bytes. */
  header: THeader;
  /** All records present in the remainder of the buffer. */
  records: TRecord[];
}

/**
 * Creates a coder for a complete pcap capture file using the supplied header
 * and record coders.
 *
 * Records are decoded greedily until fewer than 16 bytes (the record-header
 * size) remain in the buffer; this matches how typical pcap readers consume a
 * file to its end without needing an explicit count.
 *
 * @template THeader Decoded shape produced by the header coder.
 * @template TRecord Decoded shape produced by the record coder.
 * @param headerCoder Coder for the 24-byte global header.
 * @param recordCoder Coder for each per-packet record.
 * @returns A coder for a {@link PcapFile} carrying the supplied types.
 *
 * @example Compose a custom file coder
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import {
 *   pcapFileWith,
 *   pcapGlobalHeader,
 *   pcapRecord,
 *   PCAP_MAGIC_MICROS,
 *   LINKTYPE,
 * } from "@binstruct/pcap";
 *
 * const file = pcapFileWith(pcapGlobalHeader("le"), pcapRecord("le"));
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
 *       tsSec: 100,
 *       tsUsec: 0,
 *       inclLen: 1,
 *       origLen: 1,
 *       data: new Uint8Array([0xff]),
 *     },
 *   ],
 * };
 *
 * const buffer = new Uint8Array(64);
 * const written = file.encode(value, buffer);
 * const [decoded] = file.decode(buffer.subarray(0, written));
 *
 * assertEquals(decoded.records.length, 1);
 * assertEquals(decoded.records[0].data, new Uint8Array([0xff]));
 * ```
 */
export function pcapFileWith<THeader, TRecord>(
  headerCoder: Coder<THeader>,
  recordCoder: Coder<TRecord>,
): Coder<PcapFile<THeader, TRecord>> {
  return struct({
    header: headerCoder,
    records: arrayWhile(recordCoder, ({ buffer }) => buffer.length >= 16),
  });
}
