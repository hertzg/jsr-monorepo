/**
 * ICMPv4 (RFC 792) packet encoding and decoding utilities built on
 * `@hertzg/binstruct`.
 *
 * The wire layout of an ICMP message is a 4-byte fixed header (type, code,
 * checksum) followed by 4 bytes whose meaning is determined by the type
 * (the "rest of header" field), then a variable payload. This package ships
 * two coders that cover the overwhelming majority of practical use cases:
 *
 * - {@link icmpHeader} — generic, faithful to the wire. Exposes `type`,
 *   `code`, `checksum`, the raw 4-byte `restOfHeader`, and a `payload`. Use
 *   this for any ICMP type, including ones not given a dedicated coder.
 * - {@link icmpEcho} — typed coder for Echo Request (type 8) and Echo Reply
 *   (type 0), splitting the rest-of-header into `identifier` and `sequence`.
 *
 * Per the binstruct philosophy, encoding does **not** auto-compute the
 * checksum. Use {@link internetChecksum} after encoding (with the checksum
 * field zeroed) to fill it in, mirroring how a kernel network stack does it.
 *
 * Typed coders for Destination Unreachable, Time Exceeded, Redirect, and the
 * timestamp message family are intentionally out of scope for this initial
 * release — the generic coder handles them, and dedicated variants can be
 * added in follow-up releases driven by real-world demand.
 *
 * @example Round-trip an ICMP Echo Request and recompute its checksum
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ICMP_TYPE, icmpEcho, internetChecksum } from "@binstruct/icmp";
 *
 * const coder = icmpEcho();
 * const payload = new TextEncoder().encode("ping");
 * const request = {
 *   type: ICMP_TYPE.ECHO_REQUEST,
 *   code: 0,
 *   checksum: 0,
 *   identifier: 0xbeef,
 *   sequence: 42,
 *   payload,
 * };
 *
 * const buffer = new Uint8Array(8 + payload.length);
 * const written = coder.encode(request, buffer);
 *
 * const view = new DataView(buffer.buffer, buffer.byteOffset, written);
 * view.setUint16(2, 0);
 * view.setUint16(2, internetChecksum(buffer.subarray(0, written)));
 *
 * // The completed packet must checksum to zero.
 * assertEquals(internetChecksum(buffer.subarray(0, written)), 0);
 *
 * const [decoded] = coder.decode(buffer.subarray(0, written));
 * assertEquals(decoded.identifier, 0xbeef);
 * assertEquals(decoded.sequence, 42);
 * assertEquals(decoded.payload, payload);
 * ```
 *
 * @example Decode an arbitrary ICMP message via the generic coder
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { icmpHeader, ICMP_TYPE } from "@binstruct/icmp";
 *
 * // Time Exceeded (type 11), code 0, with the original IP datagram fragment
 * // omitted for brevity.
 * // deno-fmt-ignore
 * const wire = new Uint8Array([
 *   0x0b, 0x00, 0xf4, 0xff, 0x00, 0x00, 0x00, 0x00,
 * ]);
 *
 * const [packet] = icmpHeader().decode(wire);
 * assertEquals(packet.type, ICMP_TYPE.TIME_EXCEEDED);
 * assertEquals(packet.code, 0);
 * assertEquals(packet.payload.length, 0);
 * ```
 *
 * @module
 */

export { internetChecksum } from "./checksum.ts";
export { icmpHeader, type IcmpPacket } from "./header.ts";
export { type IcmpEcho, icmpEcho } from "./echo.ts";
export { ICMP_TYPE, type IcmpType } from "./types.ts";

/**
 * IP protocol number assigned to ICMPv4 (`1`). The value an IPv4 header's
 * `protocol` field carries when its payload is an ICMPv4 packet.
 */
export const IP_PROTOCOL_ICMP = 1;
