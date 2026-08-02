/**
 * Coders for individual pcap record (per-packet) entries.
 *
 * A record consists of a 16-byte header followed by `inclLen` bytes of
 * captured packet data. The packet payload is intentionally left as raw bytes
 * — decoding the link-layer protocol (Ethernet, raw IP, etc.) is the caller's
 * responsibility and is out of scope for this package.
 */

import { arrayWhile, bytes, ref, struct, u32 } from "@hertzg/binstruct";
import type { Coder } from "@hertzg/binstruct";
import { PCAP_DEFAULT_ENDIANNESS, type PcapEndianness } from "./header.ts";

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
 * A record carries no magic of its own, so its byte order cannot be recovered
 * from the record bytes — it is dictated entirely by the global header that
 * precedes it. When the argument is omitted the coder assumes
 * {@link PCAP_DEFAULT_ENDIANNESS}; pass the endianness explicitly whenever the
 * surrounding file might be big-endian.
 *
 * @param endianness Byte order matching the surrounding pcap file. Defaults to
 *   {@link PCAP_DEFAULT_ENDIANNESS}.
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
 *
 * @example Omitting the argument round-trips using the default byte order
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { PCAP_DEFAULT_ENDIANNESS, pcapRecord } from "@binstruct/pcap";
 *
 * const value = {
 *   tsSec: 1_700_000_000,
 *   tsUsec: 123_456,
 *   inclLen: 3,
 *   origLen: 3,
 *   data: new Uint8Array([0x01, 0x02, 0x03]),
 * };
 *
 * const implicit = new Uint8Array(32);
 * const explicit = new Uint8Array(32);
 * const written = pcapRecord().encode(value, implicit);
 * pcapRecord(PCAP_DEFAULT_ENDIANNESS).encode(value, explicit);
 *
 * const [decoded, read] = pcapRecord().decode(implicit);
 *
 * assertEquals(implicit, explicit);
 * assertEquals(written, 19);
 * assertEquals(read, 19);
 * assertEquals(decoded, value);
 * ```
 */
export function pcapRecord(
  endianness?: PcapEndianness,
): Coder<PcapRecord> {
  const order = endianness ?? PCAP_DEFAULT_ENDIANNESS;

  // inclLen is bound to a const so the bytes() coder can ref() the same
  // identity we register in the struct — sibling fields call u32(order)
  // inline because their values aren't referenced elsewhere.
  const inclLen = u32(order);

  return struct({
    tsSec: u32(order),
    tsUsec: u32(order),
    inclLen,
    origLen: u32(order),
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
 * This is the builder tier of the package's coder API: it deliberately keeps
 * both coders required, because there is no single obvious pair to default to
 * once the caller has opted into custom header or record handling. Callers who
 * just want to read or write an ordinary capture use {@link pcapFile}, the
 * zero-argument sibling that supplies the standard pair and picks the byte
 * order for you.
 *
 * @template THeader Decoded shape produced by the header coder.
 * @template TRecord Decoded shape produced by the record coder.
 * @param headerCoder Coder for the 24-byte global header.
 * @param recordCoder Coder for each per-packet record.
 * @returns A coder for a {@link PcapFile} carrying the supplied types.
 * @throws Propagates whatever the supplied coders throw on malformed input.
 *   In particular, a buffer that ends mid-record (16 or more trailing bytes
 *   that don't form a complete record) will fail in the record coder, not
 *   silently truncate.
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
