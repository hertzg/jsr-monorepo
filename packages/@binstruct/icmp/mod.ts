/**
 * ICMPv4 (RFC 792) packet encoding and decoding.
 *
 * An ICMP message is a 4-byte fixed header (type, code, checksum) followed
 * by a variable-length payload. The 4 bytes that RFC 792 calls the "rest of
 * header" are part of the payload here — their meaning is type-specific
 * (e.g. `identifier`/`sequence` for Echo, `unused`/`nextHopMtu` for
 * Destination Unreachable), and callers can frame them however they need.
 *
 * ```text
 *  0      7 8     15 16    23 24    31
 * +--------+--------+--------+--------+
 * |  Type  |  Code  |    Checksum     |
 * +--------+--------+--------+--------+
 * |        Payload (variable)         |
 * +-----------------------------------+
 * ```
 *
 * Per the binstruct philosophy, encoding does **not** auto-compute the
 * checksum. Use `internetChecksum` from `@binstruct/inet` after encoding
 * (with the checksum field zeroed) to fill it in.
 *
 * @example Round-trip an Echo Request via the generic coder
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ICMP_TYPE, icmpPacket } from "@binstruct/icmp";
 *
 * const coder = icmpPacket();
 * // The first 4 bytes of payload are the Echo-specific identifier/sequence,
 * // followed by the echo data.
 * const payload = new Uint8Array([0xbe, 0xef, 0x00, 0x2a, ...new TextEncoder().encode("ping")]);
 * const request = {
 *   type: ICMP_TYPE.ECHO_REQUEST,
 *   code: 0,
 *   checksum: 0,
 *   payload,
 * };
 *
 * const buffer = new Uint8Array(4 + payload.length);
 * const written = coder.encode(request, buffer);
 * const [decoded] = coder.decode(buffer.subarray(0, written));
 *
 * assertEquals(decoded.type, ICMP_TYPE.ECHO_REQUEST);
 * assertEquals(decoded.payload, payload);
 * ```
 *
 * @module
 */
import { bytes, type Coder, struct, u16be, u8 } from "@hertzg/binstruct";

/**
 * IP protocol number assigned to ICMPv4 (`1`). The value an IPv4 header's
 * `protocol` field carries when its payload is an ICMPv4 packet.
 */
export const IP_PROTOCOL_ICMP = 1;

/**
 * Common ICMPv4 type values (RFC 792 and successors).
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ICMP_TYPE } from "@binstruct/icmp";
 *
 * assertEquals(ICMP_TYPE.ECHO_REQUEST, 8);
 * assertEquals(ICMP_TYPE.ECHO_REPLY, 0);
 * ```
 */
export const ICMP_TYPE = {
  /** Echo Reply (RFC 792) */
  ECHO_REPLY: 0,
  /** Destination Unreachable (RFC 792) */
  DEST_UNREACH: 3,
  /** Source Quench (deprecated by RFC 6633) */
  SOURCE_QUENCH: 4,
  /** Redirect (RFC 792) */
  REDIRECT: 5,
  /** Echo Request (RFC 792) */
  ECHO_REQUEST: 8,
  /** Router Advertisement (RFC 1256) */
  ROUTER_ADVERTISEMENT: 9,
  /** Router Solicitation (RFC 1256) */
  ROUTER_SOLICITATION: 10,
  /** Time Exceeded (RFC 792) */
  TIME_EXCEEDED: 11,
  /** Parameter Problem (RFC 792) */
  PARAMETER_PROBLEM: 12,
  /** Timestamp Request (RFC 792) */
  TIMESTAMP: 13,
  /** Timestamp Reply (RFC 792) */
  TIMESTAMP_REPLY: 14,
} as const;

/**
 * Generic ICMPv4 packet (RFC 792).
 *
 * The 4 bytes RFC 792 calls "rest of header" are part of `payload` here;
 * their meaning is type-specific (`(identifier, sequence)` for Echo,
 * `(unused, nextHopMtu)` for some Destination Unreachable codes, etc.).
 */
export interface IcmpPacket {
  /** ICMP type field. See {@link ICMP_TYPE}. */
  type: number;
  /** ICMP code field, type-specific subtype. */
  code: number;
  /**
   * Big-endian 16-bit Internet checksum over the entire ICMP message
   * (header + payload) with this field set to zero. Not auto-computed on
   * encode; use `internetChecksum` from `@binstruct/inet`.
   */
  checksum: number;
  /** Remaining bytes of the message. */
  payload: Uint8Array<ArrayBufferLike>;
}

/**
 * Creates a coder for a generic ICMPv4 packet — 4-byte fixed header
 * (`type`, `code`, `checksum`) and a payload that absorbs the rest of the
 * buffer on decode.
 *
 * @returns A coder for {@link IcmpPacket}.
 *
 * @example Round-trip a minimal Echo Request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ICMP_TYPE, icmpPacket } from "@binstruct/icmp";
 *
 * const coder = icmpPacket();
 * // First 4 payload bytes are the type-specific identifier/sequence.
 * const payload = new Uint8Array([0x00, 0x01, 0x00, 0x01]);
 * const packet = {
 *   type: ICMP_TYPE.ECHO_REQUEST,
 *   code: 0,
 *   checksum: 0xf7fd,
 *   payload,
 * };
 *
 * const buffer = new Uint8Array(4 + payload.length);
 * const bytesWritten = coder.encode(packet, buffer);
 * const [decoded, bytesRead] = coder.decode(buffer);
 *
 * assertEquals(bytesWritten, buffer.length);
 * assertEquals(bytesRead, buffer.length);
 * assertEquals(decoded.type, ICMP_TYPE.ECHO_REQUEST);
 * assertEquals(decoded.code, 0);
 * assertEquals(decoded.checksum, 0xf7fd);
 * assertEquals(decoded.payload, payload);
 * ```
 */
export function icmpPacket(): Coder<IcmpPacket> {
  return struct({
    type: u8(),
    code: u8(),
    checksum: u16be(),
    payload: bytes(),
  });
}
