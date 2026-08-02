/**
 * ICMPv6 (RFC 4443) message encoding and decoding.
 *
 * An ICMPv6 message is a 4-byte fixed header (type, code, checksum)
 * followed by a variable-length message body. RFC 4443 further splits the
 * body into a 4-byte "message body" field specific to the type and the
 * data that follows it, but this coder does not draw that line — the
 * entire remainder of the buffer is exposed as `body`, mirroring how
 * `@binstruct/icmp` handles ICMPv4's "rest of header". Per-type body
 * structs (Echo identifier/sequence, Neighbor Discovery options, etc.) are
 * out of scope for this initial release.
 *
 * ```text
 *  0      7 8     15 16    23 24    31
 * +--------+--------+--------+--------+
 * |  Type  |  Code  |    Checksum     |
 * +--------+--------+--------+--------+
 * |          Body (variable)          |
 * +-----------------------------------+
 * ```
 *
 * Per the binstruct philosophy, encoding does **not** auto-compute the
 * checksum. ICMPv6's checksum additionally covers an IPv6 pseudo-header
 * (RFC 8200 section 8.1), so computing it requires the enclosing IPv6
 * addresses; this package leaves that entirely to the caller.
 *
 * @example Round-trip an Echo Request via the generic coder
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ICMPV6_TYPE, icmpv6Message } from "@binstruct/icmpv6";
 *
 * const coder = icmpv6Message();
 * // The first 4 body bytes are the Echo-specific identifier/sequence,
 * // followed by the echo data.
 * const body = new Uint8Array([0xbe, 0xef, 0x00, 0x2a, 0x70, 0x69, 0x6e, 0x67]);
 * const request = {
 *   type: ICMPV6_TYPE.ECHO_REQUEST,
 *   code: 0,
 *   checksum: 0,
 *   body,
 * };
 *
 * const buffer = new Uint8Array(4 + body.length);
 * const written = coder.encode(request, buffer);
 * const [decoded] = coder.decode(buffer.subarray(0, written));
 *
 * assertEquals(decoded.type, ICMPV6_TYPE.ECHO_REQUEST);
 * assertEquals(decoded.body, body);
 * ```
 *
 * @module
 */
import { bytes, type Coder, struct, u16be, u8 } from "@hertzg/binstruct";

/**
 * IP protocol number assigned to ICMPv6 (`58`). The value an IPv6 header's
 * `nextHeader` field carries when its payload is an ICMPv6 message.
 */
export const IP_PROTOCOL_ICMPV6 = 58;

/**
 * Well-known ICMPv6 type values (RFC 4443 and RFC 4861).
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ICMPV6_TYPE } from "@binstruct/icmpv6";
 *
 * assertEquals(ICMPV6_TYPE.ECHO_REQUEST, 128);
 * assertEquals(ICMPV6_TYPE.ECHO_REPLY, 129);
 * ```
 */
export const ICMPV6_TYPE = {
  /** Destination Unreachable (RFC 4443) */
  DEST_UNREACHABLE: 1,
  /** Packet Too Big (RFC 4443) */
  PACKET_TOO_BIG: 2,
  /** Time Exceeded (RFC 4443) */
  TIME_EXCEEDED: 3,
  /** Parameter Problem (RFC 4443) */
  PARAMETER_PROBLEM: 4,
  /** Echo Request (RFC 4443) */
  ECHO_REQUEST: 128,
  /** Echo Reply (RFC 4443) */
  ECHO_REPLY: 129,
  /** Router Solicitation (RFC 4861) */
  ROUTER_SOLICITATION: 133,
  /** Router Advertisement (RFC 4861) */
  ROUTER_ADVERTISEMENT: 134,
  /** Neighbor Solicitation (RFC 4861) */
  NEIGHBOR_SOLICITATION: 135,
  /** Neighbor Advertisement (RFC 4861) */
  NEIGHBOR_ADVERTISEMENT: 136,
} as const;

/**
 * Generic ICMPv6 message (RFC 4443).
 *
 * The type-specific "message body" bytes that RFC 4443 places immediately
 * after the checksum (e.g. `identifier`/`sequence` for Echo, `mtu` for
 * Packet Too Big) are part of `body` here, along with any data that
 * follows them — this coder does not parse per-type layouts.
 */
export interface Icmpv6Message {
  /** ICMPv6 type field. See {@link ICMPV6_TYPE}. */
  type: number;
  /** ICMPv6 code field, type-specific subtype. */
  code: number;
  /**
   * Big-endian 16-bit checksum (RFC 8200 section 8.1) computed over an
   * IPv6 pseudo-header plus the entire ICMPv6 message with this field set
   * to zero. Not auto-computed on encode — the pseudo-header depends on
   * the enclosing IPv6 addresses, which this package does not model.
   */
  checksum: number;
  /** Remaining bytes of the message. */
  body: Uint8Array<ArrayBufferLike>;
}

/**
 * Creates a coder for a generic ICMPv6 message — 4-byte fixed header
 * (`type`, `code`, `checksum`) and a body that absorbs the rest of the
 * buffer on decode.
 *
 * @returns A coder for {@link Icmpv6Message}.
 *
 * @example Round-trip a Destination Unreachable message
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ICMPV6_TYPE, icmpv6Message } from "@binstruct/icmpv6";
 *
 * const coder = icmpv6Message();
 * // First 4 body bytes are the unused field, followed by as much of the
 * // invoking packet as fits.
 * const body = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
 * const message = {
 *   type: ICMPV6_TYPE.DEST_UNREACHABLE,
 *   code: 4,
 *   checksum: 0x1234,
 *   body,
 * };
 *
 * const buffer = new Uint8Array(4 + body.length);
 * const bytesWritten = coder.encode(message, buffer);
 * const [decoded, bytesRead] = coder.decode(buffer);
 *
 * assertEquals(bytesWritten, buffer.length);
 * assertEquals(bytesRead, buffer.length);
 * assertEquals(decoded.type, ICMPV6_TYPE.DEST_UNREACHABLE);
 * assertEquals(decoded.code, 4);
 * assertEquals(decoded.checksum, 0x1234);
 * assertEquals(decoded.body, body);
 * ```
 */
export function icmpv6Message(): Coder<Icmpv6Message> {
  return struct({
    type: u8(),
    code: u8(),
    checksum: u16be(),
    body: bytes(),
  });
}
