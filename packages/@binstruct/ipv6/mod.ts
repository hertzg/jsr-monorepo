/**
 * IPv6 fixed header encoding and decoding (RFC 8200).
 *
 * Every IPv6 packet opens with a 40-byte fixed header, followed by zero or
 * more extension headers and then the upper-layer payload:
 *
 * ```text
 *  0      7 8     15 16    23 24    31
 * +--------+--------+--------+--------+
 * |Version | Traffic Class| Flow Label|
 * +--------+--------+--------+--------+
 * |  Payload Length | Next Hd|Hop Lim.|
 * +--------+--------+--------+--------+
 * |                                   |
 * +                                   +
 * |                                   |
 * +          Source Address          +
 * |         (16 bytes / 128 bits)     |
 * +                                   +
 * |                                   |
 * +--------+--------+--------+--------+
 * |                                   |
 * +                                   +
 * |                                   |
 * +        Destination Address       +
 * |         (16 bytes / 128 bits)     |
 * +                                   +
 * |                                   |
 * +--------+--------+--------+--------+
 * |        Payload (variable)         |
 * +-----------------------------------+
 * ```
 *
 * `version`, `trafficClass`, and `flowLabel` share the first 32-bit
 * big-endian word of the header (4 + 8 + 20 bits), so they are decoded as a
 * single nested `versionClassFlow` object via `bitStruct` rather than three
 * independent fields.
 *
 * `payloadLength` counts only the bytes *after* the 40-byte fixed header —
 * unlike IPv4's `totalLength`, it excludes the header itself. `payload` is
 * therefore exactly `payloadLength` bytes.
 *
 * This is a v0.0.1, header-only coder: extension headers (Hop-by-Hop
 * Options, Routing, Fragment, Destination Options, ESP, AH, …) are **not**
 * parsed. `nextHeader` is surfaced as a raw protocol number and everything
 * after the fixed header — extension headers included, if any are present —
 * is handed back as opaque `payload` bytes. Callers who need to walk the
 * extension header chain must do so themselves, or await a future version
 * of this package that adds it.
 *
 * `sourceAddress` / `destinationAddress` are raw 16-byte slices, not
 * `bigint`. Pair this with `@hertzg/ip`'s `stringifyIpv6` /
 * `parseIpv6` for human-readable conversion — those work over `bigint`, so
 * bytes need `Array.from(...).reduce()`-style conversion, left to the
 * caller to keep this package free of that dependency.
 *
 * @example Round-trip a minimal IPv6 packet (no payload)
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ipv6Packet, IPV6_HEADER_SIZE } from "@binstruct/ipv6";
 *
 * const coder = ipv6Packet();
 * const packet = {
 *   versionClassFlow: { version: 6, trafficClass: 0, flowLabel: 0 },
 *   payloadLength: 0,
 *   nextHeader: 59,
 *   hopLimit: 64,
 *   sourceAddress: new Uint8Array(16),
 *   destinationAddress: new Uint8Array(16),
 *   payload: new Uint8Array(0),
 * };
 *
 * const buffer = new Uint8Array(IPV6_HEADER_SIZE);
 * const written = coder.encode(packet, buffer);
 * const [decoded, read] = coder.decode(buffer);
 *
 * assertEquals(written, IPV6_HEADER_SIZE);
 * assertEquals(read, IPV6_HEADER_SIZE);
 * assertEquals(decoded.versionClassFlow.version, 6);
 * assertEquals(decoded.hopLimit, 64);
 * ```
 *
 * @module
 */

import {
  bitStruct,
  bytes,
  type Coder,
  ref,
  struct,
  u16be,
  u8be,
} from "@hertzg/binstruct";

/**
 * Size in bytes of the fixed IPv6 header, before any extension headers or
 * upper-layer payload (RFC 8200 §3).
 */
export const IPV6_HEADER_SIZE = 40;

/**
 * EtherType assigned to IPv6 (`0x86dd`). The value an Ethernet II frame's
 * `etherType` field carries when its payload is an IPv6 packet.
 */
export const ETHERTYPE_IPV6 = 0x86dd;

/**
 * Common `nextHeader` values (RFC 8200 §4, IANA "Protocol Numbers"
 * registry). `nextHeader` shares its value space with IPv4's `protocol`
 * field, so upper-layer values like `UDP` and `TCP` match
 * `@binstruct/udp`'s `IP_PROTOCOL_UDP` / `@binstruct/icmp`'s
 * `IP_PROTOCOL_ICMP`. This package does not parse any of the extension
 * headers listed here — they are provided so callers can recognize them in
 * `nextHeader` before deciding how to walk `payload` themselves.
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { IPV6_NEXT_HEADER } from "@binstruct/ipv6";
 *
 * assertEquals(IPV6_NEXT_HEADER.TCP, 6);
 * assertEquals(IPV6_NEXT_HEADER.UDP, 17);
 * assertEquals(IPV6_NEXT_HEADER.ICMPV6, 58);
 * assertEquals(IPV6_NEXT_HEADER.NO_NEXT_HEADER, 59);
 * ```
 */
export const IPV6_NEXT_HEADER = {
  /** Hop-by-Hop Options extension header */
  HOP_BY_HOP: 0,
  /** TCP (RFC 9293) */
  TCP: 6,
  /** UDP (RFC 768) */
  UDP: 17,
  /** Routing extension header */
  ROUTING: 43,
  /** Fragment extension header */
  FRAGMENT: 44,
  /** Encapsulating Security Payload */
  ESP: 50,
  /** Authentication Header */
  AUTHENTICATION: 51,
  /** ICMPv6 (RFC 4443) */
  ICMPV6: 58,
  /** No next header — nothing follows the fixed header or preceding extension header */
  NO_NEXT_HEADER: 59,
  /** Destination Options extension header */
  DESTINATION_OPTIONS: 60,
} as const;

/**
 * Decoded IPv6 packet (RFC 8200) — fixed header fields and the raw
 * remainder of the packet.
 *
 * `sourceAddress` / `destinationAddress` are 16-byte slices. `payload`'s
 * length is always `payloadLength` bytes after decoding, and — because this
 * package does not parse extension headers — includes any extension
 * headers present, followed by the upper-layer data.
 *
 * @property versionClassFlow           - The header's first 32-bit word, packed as `version` (4 bits, always 6), `trafficClass` (8 bits), and `flowLabel` (20 bits).
 * @property versionClassFlow.version      - IP version. Always `6` for a valid packet; surfaced verbatim rather than validated.
 * @property versionClassFlow.trafficClass - DSCP + ECN, treated as one opaque 8-bit value (RFC 8200 does not split it further).
 * @property versionClassFlow.flowLabel    - 20-bit flow label used for QoS flow identification. `0` means "unset".
 * @property payloadLength               - Length of everything after the fixed header, in bytes. Excludes the 40-byte header itself.
 * @property nextHeader                  - Protocol number of the first header following the fixed header. See {@linkcode IPV6_NEXT_HEADER}.
 * @property hopLimit                    - Decremented by one at each forwarding node; the packet is discarded when it reaches 0 (IPv6's analogue of IPv4's TTL).
 * @property sourceAddress               - Source IPv6 address, 16 raw bytes.
 * @property destinationAddress          - Destination IPv6 address, 16 raw bytes.
 * @property payload                     - Everything after the fixed header; always `payloadLength` bytes after decoding.
 */
export interface Ipv6Packet {
  versionClassFlow: {
    version: number;
    trafficClass: number;
    flowLabel: number;
  };
  payloadLength: number;
  nextHeader: number;
  hopLimit: number;
  sourceAddress: Uint8Array;
  destinationAddress: Uint8Array;
  payload: Uint8Array;
}

/**
 * Creates a coder for an IPv6 packet's fixed header (RFC 8200) plus
 * whatever follows it.
 *
 * The `payload` length is derived from `payloadLength`
 * (`payload.length === payloadLength`), so encoding always writes
 * `IPV6_HEADER_SIZE + payload.length` bytes. `payloadLength` is not computed
 * for you on encode — set it to `payload.length` yourself.
 *
 * No extension-header parsing happens here (see the module docs): a packet
 * whose `nextHeader` names an extension header still has that header's
 * bytes sitting in `payload`, undecoded.
 *
 * @returns A coder for {@linkcode Ipv6Packet} values.
 *
 * @example Round-trip a packet carrying a UDP payload
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ipv6Packet, IPV6_HEADER_SIZE, IPV6_NEXT_HEADER } from "@binstruct/ipv6";
 *
 * const coder = ipv6Packet();
 * const payload = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
 * const packet = {
 *   versionClassFlow: { version: 6, trafficClass: 0, flowLabel: 0x12345 },
 *   payloadLength: payload.length,
 *   nextHeader: IPV6_NEXT_HEADER.UDP,
 *   hopLimit: 64,
 *   sourceAddress: new Uint8Array(16).fill(0x11),
 *   destinationAddress: new Uint8Array(16).fill(0x22),
 *   payload,
 * };
 *
 * const buffer = new Uint8Array(IPV6_HEADER_SIZE + payload.length);
 * const written = coder.encode(packet, buffer);
 * const [decoded, read] = coder.decode(buffer.subarray(0, written));
 *
 * assertEquals(written, IPV6_HEADER_SIZE + payload.length);
 * assertEquals(read, written);
 * assertEquals(decoded.versionClassFlow.flowLabel, 0x12345);
 * assertEquals(decoded.nextHeader, IPV6_NEXT_HEADER.UDP);
 * assertEquals(decoded.payload, payload);
 * ```
 *
 * @example Decode a known-wire loopback packet with no payload
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ipv6Packet, IPV6_NEXT_HEADER } from "@binstruct/ipv6";
 *
 * // deno-fmt-ignore
 * const wire = new Uint8Array([
 *   0x60, 0x00, 0x00, 0x00, // version=6, trafficClass=0, flowLabel=0
 *   0x00, 0x00,             // payloadLength = 0
 *   0x3b,                   // nextHeader = 59 (No Next Header)
 *   0x40,                   // hopLimit = 64
 *   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, // ::1
 *   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, // ::1
 * ]);
 *
 * const [decoded, read] = ipv6Packet().decode(wire);
 *
 * assertEquals(read, wire.length);
 * assertEquals(decoded.versionClassFlow.version, 6);
 * assertEquals(decoded.payloadLength, 0);
 * assertEquals(decoded.nextHeader, IPV6_NEXT_HEADER.NO_NEXT_HEADER);
 * assertEquals(decoded.sourceAddress[15], 1);
 * assertEquals(decoded.payload.length, 0);
 * ```
 */
export function ipv6Packet(): Coder<Ipv6Packet> {
  const payloadLength = u16be();

  return struct({
    versionClassFlow: bitStruct({
      version: 4,
      trafficClass: 8,
      flowLabel: 20,
    }),
    payloadLength,
    nextHeader: u8be(),
    hopLimit: u8be(),
    sourceAddress: bytes(16),
    destinationAddress: bytes(16),
    payload: bytes(ref(payloadLength)),
  });
}
