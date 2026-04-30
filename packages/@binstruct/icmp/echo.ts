/**
 * Typed coder for ICMPv4 Echo Request (type 8) and Echo Reply (type 0).
 *
 * The "rest of header" field for echo messages is split into two big-endian
 * 16-bit values: identifier and sequence number (RFC 792).
 *
 * @module
 */

import { bytes, type Coder, struct, u16be, u8 } from "@hertzg/binstruct";

/**
 * Echo Request / Echo Reply packet (RFC 792).
 *
 * `type` is `8` for Echo Request and `0` for Echo Reply; `code` is always `0`
 * but kept on the type for round-trip fidelity.
 */
export interface IcmpEcho {
  /** `8` (Echo Request) or `0` (Echo Reply). */
  type: number;
  /** Always `0`. */
  code: number;
  /** Internet checksum; not auto-computed on encode. */
  checksum: number;
  /** Identifier — typically the sender's PID on Unix `ping`. */
  identifier: number;
  /** Sequence number, incremented per probe. */
  sequence: number;
  /** Echo data; reflected verbatim by the responder. */
  payload: Uint8Array;
}

/**
 * Creates a coder for ICMPv4 Echo Request / Echo Reply messages.
 *
 * Payload absorbs the rest of the buffer on decode.
 *
 * @returns A coder for {@link IcmpEcho}.
 *
 * @example Round-trip an Echo Request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ICMP_TYPE, icmpEcho, internetChecksum } from "@binstruct/icmp";
 *
 * const coder = icmpEcho();
 * const payload = new TextEncoder().encode("hello");
 * const packet = {
 *   type: ICMP_TYPE.ECHO_REQUEST,
 *   code: 0,
 *   checksum: 0,
 *   identifier: 0x1234,
 *   sequence: 1,
 *   payload,
 * };
 *
 * const buffer = new Uint8Array(8 + payload.length);
 * const bytesWritten = coder.encode(packet, buffer);
 *
 * // Fix up the checksum after encoding.
 * const dv = new DataView(buffer.buffer, buffer.byteOffset, bytesWritten);
 * dv.setUint16(2, 0);
 * dv.setUint16(2, internetChecksum(buffer.subarray(0, bytesWritten)));
 *
 * const [decoded] = coder.decode(buffer.subarray(0, bytesWritten));
 * assertEquals(decoded.type, ICMP_TYPE.ECHO_REQUEST);
 * assertEquals(decoded.identifier, 0x1234);
 * assertEquals(decoded.sequence, 1);
 * assertEquals(decoded.payload, payload);
 * ```
 */
export function icmpEcho(): Coder<IcmpEcho> {
  return struct({
    type: u8(),
    code: u8(),
    checksum: u16be(),
    identifier: u16be(),
    sequence: u16be(),
    payload: bytes(),
  });
}
