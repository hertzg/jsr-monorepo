/**
 * UDP datagram encoding and decoding utilities (RFC 768).
 *
 * A UDP datagram is an 8-byte header followed by a variable-length payload:
 *
 * ```text
 *  0      7 8     15 16    23 24    31
 * +--------+--------+--------+--------+
 * |     Source      |   Destination   |
 * |      Port       |      Port       |
 * +--------+--------+--------+--------+
 * |                 |                 |
 * |     Length      |    Checksum     |
 * +--------+--------+--------+--------+
 * |                                   |
 * |              Payload              |
 * |                                   |
 * +-----------------------------------+
 * ```
 *
 * The `length` field covers the entire datagram (header + payload) measured in
 * octets, so the payload is always `length - 8` bytes long.
 *
 * The `checksum` field is optional in IPv4 (zero indicates "not computed") and
 * mandatory in IPv6. Computing it requires a layer-specific pseudo-header that
 * is *not* part of the datagram itself, so this package neither validates nor
 * derives it — callers are expected to provide both `length` and `checksum`.
 *
 * @example Encode and decode a UDP datagram
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { udpDatagram } from "@binstruct/udp";
 *
 * const coder = udpDatagram();
 * const datagram = {
 *   srcPort: 53,
 *   dstPort: 49152,
 *   length: 8 + 4,
 *   checksum: 0,
 *   payload: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
 * };
 *
 * const buffer = new Uint8Array(64);
 * const written = coder.encode(datagram, buffer);
 * const [decoded, read] = coder.decode(buffer.subarray(0, written));
 *
 * assertEquals(written, read);
 * assertEquals(decoded.srcPort, datagram.srcPort);
 * assertEquals(decoded.dstPort, datagram.dstPort);
 * assertEquals(decoded.length, datagram.length);
 * assertEquals(decoded.checksum, datagram.checksum);
 * assertEquals(decoded.payload, datagram.payload);
 * ```
 *
 * @module @binstruct/udp
 */

import {
  bytes,
  type Coder,
  computedRef,
  type Context,
  decode,
  encode,
  ref,
  type Refiner,
  struct,
  u16be,
} from "@hertzg/binstruct";
import type { Ipv4Datagram } from "@binstruct/ipv4";

/**
 * Number of octets in a UDP header (source port, destination port, length,
 * checksum). The `length` field of a UDP datagram includes these 8 bytes.
 */
export const UDP_HEADER_SIZE = 8;

/**
 * Decoded representation of a UDP datagram (RFC 768).
 *
 * @property srcPort  - Source port (0–65535). Conventionally 0 means "no reply expected".
 * @property dstPort  - Destination port (0–65535).
 * @property length   - Total datagram length in octets, including the 8-byte header.
 * @property checksum - 16-bit one's-complement checksum, or 0 to indicate "not computed" (IPv4 only).
 * @property payload  - Datagram payload; its length is always `length - 8` after decoding.
 */
export interface UdpDatagram {
  srcPort: number;
  dstPort: number;
  length: number;
  checksum: number;
  payload: Uint8Array;
}


/**
 * Creates a coder for UDP datagrams (RFC 768).
 *
 * The returned coder encodes/decodes the 8-byte UDP header followed by a
 * payload whose length is derived from the header's `length` field
 * (`payload.length === length - 8`).
 *
 * Neither `length` nor `checksum` are computed for you on encode — the value
 * you provide is written verbatim. This keeps the package layer-agnostic:
 * the UDP checksum is defined over an IPv4 or IPv6 pseudo-header that this
 * coder cannot see, and recomputing `length` would hide truncation bugs.
 *
 * @returns A coder for {@link UdpDatagram} values
 *
 * @example Round-trip a small datagram
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { udpDatagram, UDP_HEADER_SIZE } from "@binstruct/udp";
 *
 * const coder = udpDatagram();
 * const payload = new Uint8Array([0x01, 0x02, 0x03]);
 * const datagram = {
 *   srcPort: 1234,
 *   dstPort: 53,
 *   length: UDP_HEADER_SIZE + payload.length,
 *   checksum: 0xabcd,
 *   payload,
 * };
 *
 * const buffer = new Uint8Array(32);
 * const written = coder.encode(datagram, buffer);
 * const [decoded, read] = coder.decode(buffer.subarray(0, written));
 *
 * assertEquals(written, UDP_HEADER_SIZE + payload.length);
 * assertEquals(read, written);
 * assertEquals(decoded.payload, payload);
 * ```
 *
 * @example Empty payload (8-byte datagram)
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { udpDatagram, UDP_HEADER_SIZE } from "@binstruct/udp";
 *
 * const coder = udpDatagram();
 * const buffer = new Uint8Array(UDP_HEADER_SIZE);
 * const written = coder.encode({
 *   srcPort: 0,
 *   dstPort: 0,
 *   length: UDP_HEADER_SIZE,
 *   checksum: 0,
 *   payload: new Uint8Array(0),
 * }, buffer);
 * const [decoded] = coder.decode(buffer);
 *
 * assertEquals(written, UDP_HEADER_SIZE);
 * assertEquals(decoded.payload.length, 0);
 * ```
 */
export function udpDatagram(): Coder<UdpDatagram> {
  const length = u16be();
  return struct({
    srcPort: u16be(),
    dstPort: u16be(),
    length,
    checksum: u16be(),
    payload: bytes(
      computedRef([ref(length)], (len) => len - UDP_HEADER_SIZE),
    ),
  });
}

/**
 * Refiner that swaps a host's `payload: Uint8Array` for a decoded UDP
 * datagram.
 *
 * Use as a `refineSwitch` arm when the parent's protocol-discriminator field
 * (e.g. IPv4's `protocol`) selects UDP. The host type is preserved on its
 * non-payload fields, so the same factory works under any L3 carrier.
 *
 * @returns A `Refiner` suitable for `refineSwitch`.
 *
 * @example Compose with IPv4 via refineSwitch
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { refineSwitch, type Context } from "@hertzg/binstruct";
 * import { ipv4Datagram, type Ipv4Datagram } from "@binstruct/ipv4";
 * import { udpRefiner } from "@binstruct/udp";
 *
 * const coder = refineSwitch(
 *   ipv4Datagram(),
 *   { udp: udpRefiner() },
 *   {
 *     refine: (d: Ipv4Datagram, _ctx: Context) => d.protocol === 17 ? "udp" : null,
 *     unrefine: (_r, _ctx: Context) => "udp",
 *   },
 * );
 *
 * const buf = new Uint8Array(64);
 * coder.encode({
 *   versionIhl: { version: 4, ihl: 5 },
 *   typeOfService: 0,
 *   totalLength: 32,
 *   identification: 0,
 *   flagsFragmentOffset: { reserved: 0, dontFragment: 0, moreFragments: 0, fragmentOffset: 0 },
 *   timeToLive: 64,
 *   protocol: 17,
 *   headerChecksum: 0,
 *   sourceAddress: "10.0.0.1",
 *   destinationAddress: "10.0.0.2",
 *   options: new Uint8Array(0),
 *   payload: {
 *     kind: "udp",
 *     udp: {
 *       srcPort: 53, dstPort: 49152, length: 12, checksum: 0,
 *       payload: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
 *     },
 *   },
 * }, buf);
 *
 * const [decoded] = coder.decode(buf);
 * assert(!(decoded.payload instanceof Uint8Array) && decoded.payload.kind === "udp");
 * assertEquals(decoded.payload.udp.srcPort, 53);
 * ```
 */
/** Refined IPv4 datagram whose payload is a typed UDP datagram. */
export type Ipv4WithUdp = Omit<Ipv4Datagram, "payload"> & {
  payload: { kind: "udp"; udp: UdpDatagram };
};

export function udpRefiner(): Refiner<Ipv4Datagram, Ipv4WithUdp, []> {
  return {
    refine: (host: Ipv4Datagram, ctx: Context): Ipv4WithUdp => ({
      ...host,
      payload: { kind: "udp", udp: decode(udpDatagram(), host.payload, ctx) },
    }),
    unrefine: (refined: Ipv4WithUdp, ctx: Context): Ipv4Datagram => ({
      ...refined,
      payload: encode(udpDatagram(), refined.payload.udp, ctx),
    }),
  };
}
