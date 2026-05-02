/**
 * TCP segment encoding and decoding utilities (RFC 9293).
 *
 * A TCP segment is a 20-byte fixed header, an optional 0–40 byte options
 * trailer (sized by the `dataOffset` field), and a variable-length payload:
 *
 * ```text
 *  0      7 8     15 16    23 24    31
 * +--------+--------+--------+--------+
 * |     Source      |   Destination   |
 * |      Port       |      Port       |
 * +--------+--------+--------+--------+
 * |          Sequence Number          |
 * +--------+--------+--------+--------+
 * |       Acknowledgment Number       |
 * +--------+--------+--------+--------+
 * | DOff |Rsrvd|C E U A P R S F| Window|
 * | 4b   | 4b  |W C R C S S Y I| 16 bit|
 * |      |     |R E G K H T N N|       |
 * +--------+--------+--------+--------+
 * |    Checksum     | Urgent Pointer  |
 * +--------+--------+--------+--------+
 * |        Options (0-40 bytes)       |
 * +-----------------------------------+
 * |        Payload (variable)         |
 * +-----------------------------------+
 * ```
 *
 * Unlike UDP, TCP carries no segment-length field — the payload size must come
 * from the carrier (typically `IPv4.totalLength - IPv4.ihl * 4`). The coder
 * therefore absorbs the rest of the buffer it is given as the payload, so it
 * is round-trip-safe only when handed a buffer slice already trimmed to the
 * segment length. `@binstruct/inet`'s `inetFrame()` does this trimming; stand-
 * alone callers should slice before decoding.
 *
 * The `checksum` field is computed over a TCP pseudo-header followed by the
 * segment; assembling the pseudo-header is the caller's job. Use
 * `internetChecksum` from `@binstruct/inet` once the bytes are concatenated.
 *
 * @example Round-trip a SYN segment with no options or payload
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { TCP_HEADER_MIN_SIZE, tcpPacket } from "@binstruct/tcp";
 *
 * const coder = tcpPacket();
 * const segment = {
 *   sourcePort: 49152,
 *   destinationPort: 80,
 *   sequenceNumber: 0xdeadbeef,
 *   acknowledgmentNumber: 0,
 *   dataOffsetReserved: { dataOffset: 5, reserved: 0 },
 *   flags: { cwr: 0, ece: 0, urg: 0, ack: 0, psh: 0, rst: 0, syn: 1, fin: 0 },
 *   window: 65535,
 *   checksum: 0,
 *   urgentPointer: 0,
 *   options: new Uint8Array(0),
 *   payload: new Uint8Array(0),
 * };
 *
 * const buffer = new Uint8Array(TCP_HEADER_MIN_SIZE);
 * const written = coder.encode(segment, buffer);
 * const [decoded, read] = coder.decode(buffer);
 *
 * assertEquals(written, TCP_HEADER_MIN_SIZE);
 * assertEquals(read, TCP_HEADER_MIN_SIZE);
 * assertEquals(decoded.flags.syn, 1);
 * assertEquals(decoded.sequenceNumber, 0xdeadbeef);
 * ```
 *
 * @module @binstruct/tcp
 */

import {
  bitStruct,
  bytes,
  type Coder,
  computedRef,
  ref,
  struct,
  u16be,
  u32be,
} from "@hertzg/binstruct";

/**
 * Number of octets in the fixed TCP header (ports, sequence/acknowledgment
 * numbers, data-offset/flags, window, checksum, urgent pointer). The
 * `dataOffset` field counts header length in 32-bit words, so its minimum
 * value of `5` corresponds to this 20-byte header with no options.
 */
export const TCP_HEADER_MIN_SIZE = 20;

/**
 * IP protocol number assigned to TCP (`6`). The value an IPv4 header's
 * `protocol` field carries when its payload is a TCP segment.
 */
export const IP_PROTOCOL_TCP = 6;

/**
 * Decoded TCP segment (RFC 9293) — fixed header, options trailer, and the
 * application-layer payload.
 *
 * The 13th and 14th header bytes are split into two byte-aligned bit-packed
 * fields: `dataOffsetReserved` (header length in 32-bit words plus 4 reserved
 * bits) and `flags` (the 8 control bits). NS (RFC 3540) was deprecated by
 * RFC 8311 and folded back into `reserved`.
 *
 * @property sourcePort - Source port (0–65535).
 * @property destinationPort - Destination port (0–65535).
 * @property sequenceNumber - 32-bit sequence number of the first data byte.
 * @property acknowledgmentNumber - 32-bit acknowledgment number; meaningful
 *   only when the `flags.ack` bit is set.
 * @property dataOffsetReserved - Header length (`dataOffset`) in 32-bit words
 *   plus 4 `reserved` bits, packed into one byte.
 * @property flags - The 8 TCP control bits (CWR, ECE, URG, ACK, PSH, RST,
 *   SYN, FIN).
 * @property window - 16-bit receive window advertised by the sender.
 * @property checksum - 16-bit one's-complement checksum over the TCP
 *   pseudo-header and segment. Not auto-computed on encode.
 * @property urgentPointer - 16-bit urgent pointer; meaningful only when the
 *   `flags.urg` bit is set.
 * @property options - Raw options bytes; length is
 *   `(dataOffsetReserved.dataOffset - 5) * 4`.
 * @property payload - Application-layer bytes; length is bounded by the
 *   carrier (e.g. IPv4 `totalLength - ihl * 4 - dataOffset * 4`).
 */
export interface TcpPacket {
  sourcePort: number;
  destinationPort: number;
  sequenceNumber: number;
  acknowledgmentNumber: number;
  dataOffsetReserved: {
    dataOffset: number;
    reserved: number;
  };
  flags: {
    cwr: number;
    ece: number;
    urg: number;
    ack: number;
    psh: number;
    rst: number;
    syn: number;
    fin: number;
  };
  window: number;
  checksum: number;
  urgentPointer: number;
  options: Uint8Array;
  payload: Uint8Array;
}

/**
 * Creates a coder for TCP segments (RFC 9293).
 *
 * The returned coder reads the 20-byte fixed header, then
 * `(dataOffsetReserved.dataOffset - 5) * 4` bytes of options, then absorbs
 * the rest of the buffer as the payload. On encode, `dataOffset` is written
 * verbatim — callers must keep it consistent with `options.length` (i.e.
 * `dataOffset = 5 + options.length / 4`).
 *
 * Pair this with `refineSwitch` on an IPv4 host's `protocol` field (see
 * `@binstruct/inet`) to dispatch the L4 payload into a typed segment.
 *
 * @returns A coder for {@link TcpPacket} values.
 *
 * @example Round-trip a small ACK segment with payload
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { TCP_HEADER_MIN_SIZE, tcpPacket } from "@binstruct/tcp";
 *
 * const coder = tcpPacket();
 * const payload = new Uint8Array([0x68, 0x65, 0x6c, 0x6c, 0x6f]);
 * const segment = {
 *   sourcePort: 49152,
 *   destinationPort: 443,
 *   sequenceNumber: 1000,
 *   acknowledgmentNumber: 2000,
 *   dataOffsetReserved: { dataOffset: 5, reserved: 0 },
 *   flags: { cwr: 0, ece: 0, urg: 0, ack: 1, psh: 1, rst: 0, syn: 0, fin: 0 },
 *   window: 8192,
 *   checksum: 0,
 *   urgentPointer: 0,
 *   options: new Uint8Array(0),
 *   payload,
 * };
 *
 * const buffer = new Uint8Array(TCP_HEADER_MIN_SIZE + payload.length);
 * const written = coder.encode(segment, buffer);
 * const [decoded, read] = coder.decode(buffer.subarray(0, written));
 *
 * assertEquals(written, TCP_HEADER_MIN_SIZE + payload.length);
 * assertEquals(read, written);
 * assertEquals(decoded.payload, payload);
 * assertEquals(decoded.flags.ack, 1);
 * assertEquals(decoded.flags.psh, 1);
 * ```
 */
export function tcpPacket(): Coder<TcpPacket> {
  const dataOffsetReserved = bitStruct({
    dataOffset: 4,
    reserved: 4,
  });

  return struct({
    sourcePort: u16be(),
    destinationPort: u16be(),
    sequenceNumber: u32be(),
    acknowledgmentNumber: u32be(),
    dataOffsetReserved,
    flags: bitStruct({
      cwr: 1,
      ece: 1,
      urg: 1,
      ack: 1,
      psh: 1,
      rst: 1,
      syn: 1,
      fin: 1,
    }),
    window: u16be(),
    checksum: u16be(),
    urgentPointer: u16be(),
    options: bytes(
      computedRef([ref(dataOffsetReserved)], (d) => (d.dataOffset - 5) * 4),
    ),
    payload: bytes(),
  });
}
