/**
 * Generic ICMPv4 packet coder (RFC 792).
 *
 * The fixed 4-byte header (type, code, checksum) is followed by a 4-byte
 * "rest of header" field whose meaning is type-specific, and then a variable
 * payload. This module exposes the wire layout faithfully and leaves
 * type-specific interpretation to higher-level coders such as
 * {@link icmpEcho}.
 *
 * @module
 */

import {
  bytes,
  type Coder,
  type LengthOrRef,
  struct,
  u16be,
  u8,
} from "@hertzg/binstruct";

/**
 * Generic ICMPv4 packet structure.
 *
 * `restOfHeader` carries the 4 bytes whose meaning depends on `type`/`code`.
 * For Echo Request/Reply this is `(identifier, sequence)`; for Destination
 * Unreachable it is generally unused or `(unused, nextHopMtu)`; for Time
 * Exceeded it is unused. See {@link icmpEcho} for a typed Echo coder.
 */
export interface IcmpPacket {
  /** ICMP type field. See {@link ICMP_TYPE}. */
  type: number;
  /** ICMP code field, type-specific subtype. */
  code: number;
  /**
   * Big-endian 16-bit Internet checksum over the entire ICMP message
   * (header + rest + payload) with this field set to zero. Not auto-computed
   * on encode; use {@link internetChecksum}.
   */
  checksum: number;
  /** Type-specific 4-byte field immediately following the checksum. */
  restOfHeader: Uint8Array;
  /** Remaining bytes of the message. */
  payload: Uint8Array;
}

/**
 * Creates a coder for a generic ICMPv4 packet.
 *
 * The coder reads/writes the 4-byte fixed header, the 4-byte type-specific
 * `restOfHeader`, and a payload of the given length. When `payloadLength` is
 * omitted the payload absorbs the rest of the buffer on decode (suitable for
 * tightly-sliced buffers); pass an explicit length or {@link ref} when the
 * boundary is known from an outer header (e.g. IP `totalLength`).
 *
 * @param payloadLength Length of the payload in bytes, or a ref to one.
 *   Defaults to "rest of buffer".
 * @returns A coder for {@link IcmpPacket}.
 *
 * @example Round-trip an Echo Request via the generic coder
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { icmpHeader } from "@binstruct/icmp";
 *
 * const coder = icmpHeader();
 * const packet = {
 *   type: 8,
 *   code: 0,
 *   checksum: 0xf7fd,
 *   restOfHeader: new Uint8Array([0x00, 0x01, 0x00, 0x01]),
 *   payload: new Uint8Array(),
 * };
 *
 * const buffer = new Uint8Array(8);
 * const bytesWritten = coder.encode(packet, buffer);
 * const [decoded, bytesRead] = coder.decode(buffer);
 *
 * assertEquals(bytesWritten, 8);
 * assertEquals(bytesRead, 8);
 * assertEquals(decoded.type, 8);
 * assertEquals(decoded.code, 0);
 * assertEquals(decoded.checksum, 0xf7fd);
 * assertEquals(decoded.restOfHeader, packet.restOfHeader);
 * ```
 */
export function icmpHeader(
  payloadLength?: LengthOrRef | null,
): Coder<IcmpPacket> {
  return struct({
    type: u8(),
    code: u8(),
    checksum: u16be(),
    restOfHeader: bytes(4),
    payload: bytes(payloadLength),
  });
}
